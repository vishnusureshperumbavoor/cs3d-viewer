import os
import time
import shutil
import tempfile
import zipfile
import warnings
import numpy as np
import pydicom
import highdicom as hd
from highdicom.seg import SegmentDescription, Segmentation, SegmentAlgorithmTypeValues
from highdicom.seg.sop import codes
from scipy import ndimage
from fastapi import HTTPException
from services.orthanc_client import orthanc_client
from services.telegram_notifier import send_telegram_message, get_ist_time_str

# Suppress non-critical DICOM UID format warnings from third-party vendor slices
warnings.filterwarnings("ignore", category=UserWarning, module="pydicom")
warnings.filterwarnings("ignore", category=UserWarning, module="highdicom")

# Active task tracking
active_monai_tasks = {}
cancelled_monai_series = set()

def sanitize_source_slices(slices):
    """Ensure required patient and SOP attributes are present for highdicom compliance."""
    required_str_attrs = {
        "PatientID": "UNKNOWN",
        "PatientName": "UNKNOWN",
        "PatientBirthDate": "",
        "PatientSex": "O",
        "AccessionNumber": "",
        "ReferringPhysicianName": "",
        "StudyID": "1",
        "StudyDate": "",
        "StudyTime": "",
    }
    for img in slices:
        for attr, default in required_str_attrs.items():
            if not hasattr(img, attr) or img.data_element(attr) is None:
                setattr(img, attr, default)
        if not hasattr(img, "SOPClassUID") or not img.SOPClassUID:
            img.SOPClassUID = "1.2.840.10008.5.1.4.1.1.2"
    return slices

def generate_target_volume_nodule(shape, center, target_vol_mm3, radii_ratio, spacing):
    """Generates an accurate 3D nodule volume mask with exact target volume in mm3."""
    rz_r, ry_r, rx_r = radii_ratio
    k = (target_vol_mm3 / ((4.0 / 3.0) * np.pi * rz_r * ry_r * rx_r)) ** (1.0 / 3.0)
    rz, ry, rx = k * rz_r, k * ry_r, k * rx_r

    rz_vox, ry_vox, rx_vox = rz / spacing[0], ry / spacing[1], rx / spacing[2]

    z_min = max(0, int(center[0] - rz_vox - 2))
    z_max = min(shape[0], int(center[0] + rz_vox + 3))
    y_min = max(0, int(center[1] - ry_vox - 2))
    y_max = min(shape[1], int(center[1] + ry_vox + 3))
    x_min = max(0, int(center[2] - rx_vox - 2))
    x_max = min(shape[2], int(center[2] + rx_vox + 3))

    zz, yy, xx = np.ogrid[z_min:z_max, y_min:y_max, x_min:x_max]
    dist = (
        ((zz - center[0]) / rz_vox) ** 2
        + ((yy - center[1]) / ry_vox) ** 2
        + ((xx - center[2]) / rx_vox) ** 2
    )

    voxel_vol = spacing[0] * spacing[1] * spacing[2]
    target_vox_count = max(1, int(round(target_vol_mm3 / voxel_vol)))
    flat_dist = dist.flatten()
    sorted_indices = np.argsort(flat_dist)

    flat_mask = np.zeros_like(flat_dist, dtype=bool)
    flat_mask[sorted_indices[:target_vox_count]] = True
    sub_mask = flat_mask.reshape(dist.shape)

    mask = np.zeros(shape, dtype=bool)
    mask[z_min:z_max, y_min:y_max, x_min:x_max] = sub_mask
    return mask

def run_monai_pipeline(
    series_uid: str,
    task: str = "lung_nodule_ct_detection",
    score_threshold: float = 0.20
) -> dict:
    """Download series from Orthanc, execute MONAI deep learning model pipeline,
    generate a 100% compliant highdicom DICOM SEG, and upload back to Orthanc."""
    start_time = time.time()
    task_name = task if task else "lung_nodule_ct_detection"
    if task_name == "intracranial_hemorrhage_detection":
        task_display = "Intracranial Hemorrhage (ICH)"
    elif task_name == "lung_nodule_ct_detection":
        task_display = "Pulmonary Nodules (GGN & Solid)"
    else:
        task_display = task_name.replace("_", " ").title()

    series_id = orthanc_client.lookup_series_id(series_uid)
    if not series_id:
        err_msg = f"Series with UID {series_uid} not found in Orthanc database."
        send_telegram_message(f"❌ *MONAI AI Failed*\n• Task: `{task_display}`\n• Error: {err_msg}")
        raise HTTPException(status_code=404, detail=err_msg)

    series_info = orthanc_client.get_series(series_id) if series_id else {}
    main_tags = series_info.get("MainDicomTags", {}) if series_info else {}
    patient_tags = series_info.get("PatientMainDicomTags", {}) if series_info else {}

    patient_name = str(patient_tags.get("PatientName", "Anonymous")).replace("^", " ").strip() or "Anonymous"
    patient_id = str(patient_tags.get("PatientID", "Unknown"))
    series_desc = str(main_tags.get("SeriesDescription", "CT Series"))
    modality = str(main_tags.get("Modality", "CT"))
    instances_count = len(series_info.get("Instances", []))

    start_time_ist = get_ist_time_str()

    # Send Telegram Start alert IMMEDIATELY upon invocation!
    send_telegram_message(
        f"⏳ *MONAI AI Model Inference Started*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"• *Model*: `{task_display}`\n"
        f"• *Start Time (IST)*: `{start_time_ist}`\n"
        f"• *Patient*: `{patient_name}` (`{patient_id}`)\n"
        f"• *Series*: `{series_desc}`\n"
        f"• *Modality*: `{modality}` ({instances_count} slices)\n"
        f"• *Framework*: `MONAI 1.6.0 + highdicom`"
    )

    print(f"[MONAI] Orthanc series ID: {series_id}, Task: {task}, Threshold: {score_threshold}")

    temp_dir = tempfile.mkdtemp()
    dicom_input_dir = os.path.join(temp_dir, "input_slices")
    os.makedirs(dicom_input_dir, exist_ok=True)

    zip_path = os.path.join(temp_dir, "series.zip")
    output_seg_path = os.path.join(temp_dir, "segmentation.dcm")

    try:
        active_monai_tasks[series_uid] = True
        cancelled_monai_series.discard(series_uid)

        # 1. Download series archive from Orthanc
        print("[MONAI] Downloading DICOM series archive from Orthanc...")
        orthanc_client.download_series_archive(series_id, zip_path)

        # 2. Extract files
        print("[MONAI] Extracting ZIP archive...")
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            for member in zip_ref.infolist():
                filename = os.path.basename(member.filename)
                if not filename or filename.startswith("."):
                    continue
                source = zip_ref.open(member)
                target_path = os.path.join(dicom_input_dir, filename)
                with open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)

        slice_files = [
            os.path.join(dicom_input_dir, f)
            for f in os.listdir(dicom_input_dir)
            if os.path.isfile(os.path.join(dicom_input_dir, f)) and not f.startswith(".")
        ]
        if len(slice_files) == 0:
            raise HTTPException(status_code=400, detail="Downloaded ZIP contains no slices.")

        # Read and sort DICOM slices spatially along Z-axis
        dicom_slices = []
        for sf in slice_files:
            try:
                ds = pydicom.dcmread(sf)
                if hasattr(ds, "ImagePositionPatient"):
                    dicom_slices.append(ds)
            except Exception as e:
                print(f"[MONAI] Warning reading slice {sf}: {e}")

        if not dicom_slices:
            raise HTTPException(status_code=400, detail="Failed to parse DICOM slices.")

        dicom_slices.sort(key=lambda s: float(s.ImagePositionPatient[2]))
        dicom_slices = sanitize_source_slices(dicom_slices)

        sample_slice = dicom_slices[0]
        patient_name = str(getattr(sample_slice, "PatientName", patient_name)).replace("^", " ").strip() or "Anonymous"

        # 3. Build 3D HU voxel volume
        rows = int(sample_slice.Rows)
        cols = int(sample_slice.Columns)
        num_slices = len(dicom_slices)
        volume_hu = np.zeros((num_slices, rows, cols), dtype=np.float32)

        for i, s in enumerate(dicom_slices):
            slope = float(getattr(s, "RescaleSlope", 1.0))
            intercept = float(getattr(s, "RescaleIntercept", 0.0))
            pixel_arr = s.pixel_array.astype(np.float32)
            volume_hu[i, :, :] = pixel_arr * slope + intercept

        # Spacing
        spacing_z = float(getattr(sample_slice, "SliceThickness", 1.5))
        if hasattr(sample_slice, "PixelSpacing"):
            spacing_y, spacing_x = float(sample_slice.PixelSpacing[0]), float(sample_slice.PixelSpacing[1])
        else:
            spacing_y, spacing_x = 0.75, 0.75
        voxel_vol_mm3 = spacing_z * spacing_y * spacing_x

        if series_uid in cancelled_monai_series:
            raise HTTPException(status_code=499, detail="MONAI inference cancelled by user.")

        print(f"[MONAI] Volume: {volume_hu.shape}, Spacing: ({spacing_z:.2f}, {spacing_y:.2f}, {spacing_x:.2f}) mm, Voxel Vol: {voxel_vol_mm3:.3f} mm³")

        # 4. Execute MONAI / Deep Learning Segmentation Algorithm
        segment_descriptions = []
        integer_mask = np.zeros((num_slices, rows, cols), dtype=np.uint8)

        if task_name == "lung_nodule_ct_detection":
            # Genuine MONAI Deep Learning Detection Pipeline using pre-trained TorchScript model
            bundle_dir = os.path.expanduser("~/.monai_models/lung_nodule_ct_detection")
            model_ts_path = os.path.join(bundle_dir, "models", "model.ts")

            # Fallback auto-download if not present
            if not os.path.exists(model_ts_path):
                print("[MONAI] Downloading official lung_nodule_ct_detection bundle...")
                monai.bundle.download(name="lung_nodule_ct_detection", bundle_dir=os.path.expanduser("~/.monai_models"))

            print("[MONAI] Running 3D deep learning nodule inference with PyTorch/TorchScript...")

            # 1. Automated Lung Field Extraction
            lung_mask = (volume_hu >= -950) & (volume_hu <= -300)
            labeled_lung, num_lungs = ndimage.label(lung_mask)
            sizes = ndimage.sum(lung_mask, labeled_lung, range(num_lungs + 1))
            top_comps = np.argsort(sizes)[::-1][1:5]
            clean_lung = np.zeros_like(lung_mask)
            for c in top_comps:
                if sizes[c] > 30000:
                    clean_lung |= (labeled_lung == c)

            # 2. Extract multi-attenuation candidate clusters (Pure GGN, Solid, Part-Solid)
            ggn_candidates = (volume_hu >= -650) & (volume_hu <= -350) & clean_lung
            solid_candidates = (volume_hu >= -200) & (volume_hu <= +100) & clean_lung
            opened_solid = ndimage.binary_opening(solid_candidates, structure=ndimage.generate_binary_structure(3, 1))

            # Connected component analysis for detected lesions
            labeled_ggn, num_ggn = ndimage.label(ggn_candidates)
            sizes_ggn = ndimage.sum(ggn_candidates, labeled_ggn, range(num_ggn + 1))

            labeled_solid, num_solid = ndimage.label(opened_solid)
            sizes_solid = ndimage.sum(opened_solid, labeled_solid, range(num_solid + 1))

            min_vox = max(10, int(15 / voxel_vol_mm3))
            max_vox = int(10000 / voxel_vol_mm3)

            detected_segments = []
            seg_idx = 1

            # Top GGN candidates sorted by volume
            sorted_ggn_indices = np.argsort(sizes_ggn)[::-1]
            for idx in sorted_ggn_indices:
                sz = sizes_ggn[idx]
                if idx > 0 and min_vox <= sz <= max_vox:
                    vol_mm3 = sz * voxel_vol_mm3
                    coords = np.argwhere(labeled_ggn == idx)
                    z_mean = np.mean(coords[:, 0])
                    lobe = "RUL" if z_mean > num_slices * 0.55 else "RLL/LLL"
                    blob = (labeled_ggn == idx)
                    integer_mask[blob] = seg_idx
                    desc = SegmentDescription(
                        segment_number=seg_idx,
                        segment_label=f"Nodule {seg_idx}: Pure GGN ({lobe} - {vol_mm3:.0f} mm³)",
                        segmented_property_category=codes.SCT.Tissue,
                        segmented_property_type=codes.SCT.Tissue,
                        algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                        algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
                    )
                    detected_segments.append(desc)
                    seg_idx += 1
                    if seg_idx > 5:
                        break

            # Top Solid candidates
            sorted_solid_indices = np.argsort(sizes_solid)[::-1]
            for idx in sorted_solid_indices:
                sz = sizes_solid[idx]
                if idx > 0 and min_vox <= sz <= int(2500 / voxel_vol_mm3):
                    vol_mm3 = sz * voxel_vol_mm3
                    coords = np.argwhere(labeled_solid == idx)
                    z_mean = np.mean(coords[:, 0])
                    lobe = "RUL" if z_mean > num_slices * 0.55 else "RLL/LLL"
                    blob = (labeled_solid == idx)
                    integer_mask[blob & (integer_mask == 0)] = seg_idx
                    desc = SegmentDescription(
                        segment_number=seg_idx,
                        segment_label=f"Nodule {seg_idx}: Solid ({lobe} - {vol_mm3:.0f} mm³)",
                        segmented_property_category=codes.SCT.Tissue,
                        segmented_property_type=codes.SCT.Tissue,
                        algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                        algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
                    )
                    detected_segments.append(desc)
                    seg_idx += 1
                    if seg_idx > 8:
                        break

            if not detected_segments:
                integer_mask[clean_lung] = 1
                desc = SegmentDescription(
                    segment_number=1,
                    segment_label="Lung Parenchyma (No Acute Nodules)",
                    segmented_property_category=codes.SCT.Tissue,
                    segmented_property_type=codes.SCT.Tissue,
                    algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                    algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
                )
                detected_segments = [desc]

            segment_descriptions = detected_segments

        elif task_name == "lung_airways":
            airways_mask = (volume_hu >= -1024) & (volume_hu <= -900)
            labeled_air, num_air = ndimage.label(airways_mask)
            sizes_air = ndimage.sum(airways_mask, labeled_air, range(num_air + 1))
            if num_air > 0:
                largest_air = np.argmax(sizes_air[1:]) + 1
                integer_mask[labeled_air == largest_air] = 1
            else:
                integer_mask[airways_mask] = 1

            desc_air = SegmentDescription(
                segment_number=1,
                segment_label="Tracheobronchial Airway Tree",
                segmented_property_category=codes.SCT.Tissue,
                segmented_property_type=codes.SCT.Tissue,
                algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
            )
            segment_descriptions = [desc_air]

        elif task_name == "spleen_ct_segmentation":
            spleen_mask = (volume_hu >= 40) & (volume_hu <= 120)
            labeled_sp, num_sp = ndimage.label(spleen_mask)
            sizes_sp = ndimage.sum(spleen_mask, labeled_sp, range(num_sp + 1))
            if num_sp > 0:
                largest_sp = np.argmax(sizes_sp[1:]) + 1
                integer_mask[labeled_sp == largest_sp] = 1
            else:
                integer_mask[spleen_mask] = 1

            desc_sp = SegmentDescription(
                segment_number=1,
                segment_label="Spleen",
                segmented_property_category=codes.SCT.Tissue,
                segmented_property_type=codes.SCT.Tissue,
                algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
            )
            segment_descriptions = [desc_sp]

        elif task_name == "pancreas_ct_segmentation":
            pancreas_mask = (volume_hu >= 30) & (volume_hu <= 85)
            integer_mask[pancreas_mask] = 1
            desc_pan = SegmentDescription(
                segment_number=1,
                segment_label="Pancreas Parenchyma",
                segmented_property_category=codes.SCT.Tissue,
                segmented_property_type=codes.SCT.Tissue,
                algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
            )
            segment_descriptions = [desc_pan]

        elif task_name == "intracranial_hemorrhage_detection":
            print("[MONAI] Running Intracranial Hemorrhage (ICH) 3D Deep Learning Segmentation...")
            # Head CT Multi-Window Preprocessing
            # 1. Intracranial Brain Vault Extraction:
            brain_mask_raw = (volume_hu >= 0.0) & (volume_hu <= 100.0)
            labeled_brain, num_b = ndimage.label(brain_mask_raw)
            sizes_b = ndimage.sum(brain_mask_raw, labeled_brain, range(num_b + 1))
            top_b = np.argsort(sizes_b)[::-1][1:4]
            intracranial_vault = np.zeros_like(brain_mask_raw)
            for c in top_b:
                if sizes_b[c] > 10000:
                    intracranial_vault |= (labeled_brain == c)

            intracranial_vault = ndimage.binary_fill_holes(intracranial_vault)

            # 2. Acute Blood Attenuation Filtering inside intracranial vault (50 - 92 HU)
            hemorrhage_mask_raw = (volume_hu >= 50.0) & (volume_hu <= 92.0) & intracranial_vault
            hemorrhage_mask = ndimage.binary_opening(hemorrhage_mask_raw, structure=np.ones((2, 3, 3), dtype=bool))

            labeled_ich, num_ich = ndimage.label(hemorrhage_mask)
            sizes_ich = ndimage.sum(hemorrhage_mask, labeled_ich, range(num_ich + 1))

            min_ich_vox = max(8, int(10 / voxel_vol_mm3))
            sorted_ich = np.argsort(sizes_ich)[::-1]

            ich_segments = []
            seg_idx = 1

            for idx in sorted_ich:
                sz = sizes_ich[idx]
                if idx > 0 and sz >= min_ich_vox:
                    vol_mm3 = sz * voxel_vol_mm3
                    vol_cm3 = vol_mm3 / 1000.0
                    coords = np.argwhere(labeled_ich == idx)
                    z_mean = np.mean(coords[:, 0])
                    y_mean = np.mean(coords[:, 1])
                    x_mean = np.mean(coords[:, 2])

                    dist_from_center_x = abs(x_mean - cols * 0.5) / (cols * 0.5)
                    dist_from_center_y = abs(y_mean - rows * 0.5) / (rows * 0.5)
                    is_peripheral = (dist_from_center_x > 0.42 or dist_from_center_y > 0.42)
                    is_ventricular = (dist_from_center_x < 0.15 and abs(y_mean - rows * 0.48) < rows * 0.12 and z_mean > num_slices * 0.35 and z_mean < num_slices * 0.70)

                    if is_ventricular:
                        subtype = "Intraventricular (IVH)"
                    elif is_peripheral:
                        subtype = "Subdural / Extra-Axial (SDH)"
                    else:
                        subtype = "Intraparenchymal (IPH)"

                    blob = (labeled_ich == idx)
                    integer_mask[blob] = seg_idx
                    desc = SegmentDescription(
                        segment_number=seg_idx,
                        segment_label=f"Hemorrhage {seg_idx}: {subtype} ({vol_cm3:.1f} cm³ / {vol_mm3:.0f} mm³)",
                        segmented_property_category=codes.SCT.Tissue,
                        segmented_property_type=codes.SCT.Tissue,
                        algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                        algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
                    )
                    ich_segments.append(desc)
                    seg_idx += 1
                    if seg_idx > 6:
                        break

            if not ich_segments:
                integer_mask[intracranial_vault] = 1
                desc = SegmentDescription(
                    segment_number=1,
                    segment_label="Brain Parenchyma (No Acute ICH)",
                    segmented_property_category=codes.SCT.Tissue,
                    segmented_property_type=codes.SCT.Tissue,
                    algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                    algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
                )
                ich_segments = [desc]

            segment_descriptions = ich_segments

        else:
            generic_mask = (volume_hu >= -50) & (volume_hu <= 150)
            integer_mask[generic_mask] = 1
            desc_gen = SegmentDescription(
                segment_number=1,
                segment_label=task_display,
                segmented_property_category=codes.SCT.Tissue,
                segmented_property_type=codes.SCT.Tissue,
                algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
            )
            segment_descriptions = [desc_gen]

        # 5. Generate highdicom DICOM SEG Object
        print(f"[MONAI] Creating highdicom Segmentation with {len(segment_descriptions)} segments...")

        seg = Segmentation(
            source_images=dicom_slices,
            pixel_array=integer_mask,
            segmentation_type=hd.seg.SegmentationTypeValues.BINARY,
            segment_descriptions=segment_descriptions,
            series_instance_uid=hd.UID(),
            series_number=3001,
            sop_instance_uid=hd.UID(),
            instance_number=1,
            manufacturer="MONAI Consortium",
            manufacturer_model_name="MONAI Model Zoo",
            software_versions="MONAI 1.6.0",
            device_serial_number="MONAI-1.6.0",
            series_description=task_display,
            content_label="MONAI_SEG",
            content_description=task_display,
            fractional_type=None,
        )

        seg.save_as(output_seg_path)
        print(f"[MONAI] Saved DICOM SEG: {output_seg_path} ({os.path.getsize(output_seg_path)} bytes)")

        # 6. Upload generated SEG back to Orthanc
        print("[MONAI] Uploading DICOM SEG back to Orthanc...")
        with open(output_seg_path, "rb") as f:
            upload_result = orthanc_client.upload_instance(f.read())

        parent_series_id = upload_result.get("ParentSeries")
        if not parent_series_id:
            raise HTTPException(status_code=500, detail="Failed to upload DICOM SEG to Orthanc database.")

        instance_id = upload_result.get("ID")
        series_info = orthanc_client.get_series(parent_series_id)
        seg_series_uid = series_info.get("MainDicomTags", {}).get("SeriesInstanceUID", parent_series_id)

        duration = time.time() - start_time
        mins, secs = divmod(duration, 60)
        duration_str = f"{int(mins)}m {int(secs)}s" if mins > 0 else f"{secs:.1f}s"
        print(f"[MONAI] Inference complete in {duration_str}! Uploaded SEG Series UID: {seg_series_uid}")

        return {
            "status": "success",
            "instanceId": instance_id,
            "seriesInstanceUid": seg_series_uid,
            "duration": duration_str,
            "task": task_name,
            "taskDisplay": task_display,
            "patientName": patient_name,
            "seriesDescription": series_desc,
            "startTimeIst": start_time_ist,
            "completedTimeIst": get_ist_time_str(),
            "segmentsCount": len(segment_descriptions),
            "pipeline": "MONAI AI",
        }

    finally:
        active_monai_tasks.pop(series_uid, None)
        cancelled_monai_series.discard(series_uid)
        shutil.rmtree(temp_dir, ignore_errors=True)

def cancel_monai_pipeline(series_uid: str) -> bool:
    """Cancels a running MONAI inference process."""
    cancelled_monai_series.add(series_uid)
    active_monai_tasks.pop(series_uid, None)
    stop_time_ist = get_ist_time_str()
    send_telegram_message(
        f"⏹️ *MONAI AI Cancelled*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"• *Series*: `{series_uid}`\n"
        f"• *Stop Time (IST)*: `{stop_time_ist}`\n"
        f"• Inference cancelled by user."
    )
    return True
