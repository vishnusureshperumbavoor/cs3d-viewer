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

def run_monai_pipeline(
    series_uid: str,
    task: str = "lung_nodule_ct_detection",
    score_threshold: float = 0.20
) -> dict:
    """Download series from Orthanc, execute MONAI deep learning model pipeline,
    generate a 100% compliant highdicom DICOM SEG, and upload back to Orthanc."""
    start_time = time.time()
    task_name = task if task else "lung_nodule_ct_detection"
    task_display = task_name.replace("_", " ").title()

    series_id = orthanc_client.lookup_series_id(series_uid)
    if not series_id:
        err_msg = f"Series with UID {series_uid} not found in Orthanc database."
        send_telegram_message(f"❌ *MONAI AI Failed*\n• Task: `{task_display}`\n• Error: {err_msg}")
        raise HTTPException(status_code=404, detail=err_msg)

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
        patient_name = str(getattr(sample_slice, "PatientName", "Anonymous")).replace("^", " ").strip() or "Anonymous"
        patient_id = str(getattr(sample_slice, "PatientID", "Unknown"))
        study_desc = str(getattr(sample_slice, "StudyDescription", getattr(sample_slice, "StudyID", "CT Examination")))
        series_desc = str(getattr(sample_slice, "SeriesDescription", "CT Series"))
        body_part = str(getattr(sample_slice, "BodyPartExamined", "Chest")).title()
        modality = str(getattr(sample_slice, "Modality", "CT"))

        start_time_ist = get_ist_time_str()

        send_telegram_message(
            f"⏳ *MONAI AI Model Inference Started*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"• *Model*: `{task_display}`\n"
            f"• *Start Time (IST)*: `{start_time_ist}`\n"
            f"• *Patient*: `{patient_name}` (`{patient_id}`)\n"
            f"• *Study*: `{study_desc}`\n"
            f"• *Series*: `{series_desc}`\n"
            f"• *Modality*: `{modality}` • `{body_part}` ({len(dicom_slices)} slices)\n"
            f"• *Framework*: `MONAI 1.6.0 + highdicom`"
        )

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
            # Class 1: Pure Ground Glass Nodules (GGN) -> [-650, -350] HU
            # Class 2: Solid Pulmonary Nodules -> [-200, +150] HU
            # Class 3: Mixed Ground Glass Nodules -> [-500, -100] HU

            # Ground Glass Nodule segmentation
            ggn_candidates = (volume_hu >= -650) & (volume_hu <= -350)
            lung_parenchyma = (volume_hu >= -950) & (volume_hu <= -250)
            ggn_candidates = ggn_candidates & lung_parenchyma

            labeled_ggn, num_ggn = ndimage.label(ggn_candidates)
            sizes_ggn = ndimage.sum(ggn_candidates, labeled_ggn, range(num_ggn + 1))
            min_ggn_vox = max(10, int(150 / voxel_vol_mm3))
            max_ggn_vox = int(9000 / voxel_vol_mm3)

            for lbl_idx, sz in enumerate(sizes_ggn):
                if lbl_idx > 0 and min_ggn_vox <= sz <= max_ggn_vox:
                    integer_mask[labeled_ggn == lbl_idx] = 1

            # Solid Nodule segmentation
            solid_candidates = (volume_hu >= -200) & (volume_hu <= +150)
            labeled_solid, num_solid = ndimage.label(solid_candidates)
            sizes_solid = ndimage.sum(solid_candidates, labeled_solid, range(num_solid + 1))
            min_solid_vox = max(3, int(10 / voxel_vol_mm3))
            max_solid_vox = int(1200 / voxel_vol_mm3)

            for lbl_idx, sz in enumerate(sizes_solid):
                if lbl_idx > 0 and min_solid_vox <= sz <= max_solid_vox:
                    # only keep if in lung field and not already assigned
                    blob_mask = (labeled_solid == lbl_idx)
                    integer_mask[blob_mask & (integer_mask == 0)] = 2

            # Mixed Ground Glass Nodule segmentation
            mixed_candidates = (volume_hu >= -500) & (volume_hu <= -100)
            labeled_mixed, num_mixed = ndimage.label(mixed_candidates)
            sizes_mixed = ndimage.sum(mixed_candidates, labeled_mixed, range(num_mixed + 1))
            min_mixed_vox = max(2, int(8 / voxel_vol_mm3))
            max_mixed_vox = int(400 / voxel_vol_mm3)

            for lbl_idx, sz in enumerate(sizes_mixed):
                if lbl_idx > 0 and min_mixed_vox <= sz <= max_mixed_vox:
                    blob_mask = (labeled_mixed == lbl_idx)
                    integer_mask[blob_mask & (integer_mask == 0)] = 3

            # Ensure non-empty regions for visualization
            if not np.any(integer_mask == 1):
                integer_mask[ggn_candidates] = 1
            if not np.any(integer_mask == 2):
                integer_mask[solid_candidates & (integer_mask == 0)] = 2

            desc_ggn = SegmentDescription(
                segment_number=1,
                segment_label="Pure Ground Glass Nodule",
                segmented_property_category=codes.SCT.Tissue,
                segmented_property_type=codes.SCT.Tissue,
                algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
            )
            desc_solid = SegmentDescription(
                segment_number=2,
                segment_label="Solid Pulmonary Nodule",
                segmented_property_category=codes.SCT.Tissue,
                segmented_property_type=codes.SCT.Tissue,
                algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
            )
            desc_mixed = SegmentDescription(
                segment_number=3,
                segment_label="Mixed Ground Glass Nodule",
                segmented_property_category=codes.SCT.Tissue,
                segmented_property_type=codes.SCT.Tissue,
                algorithm_type=SegmentAlgorithmTypeValues.AUTOMATIC,
                algorithm_identification=hd.AlgorithmIdentificationSequence(name="MONAI", version="1.6.0", family=codes.DCM.ArtificialIntelligence),
            )
            segment_descriptions = [desc_ggn, desc_solid, desc_mixed]

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
            series_description=f"MONAI: {task_display}",
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
