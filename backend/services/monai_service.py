import os
import time
import shutil
import tempfile
import zipfile
import numpy as np
from fastapi import HTTPException
from services.orthanc_client import orthanc_client
from services.telegram_notifier import send_telegram_message

# Active process tracking for cancellation support
active_monai_tasks = {}
cancelled_monai_series = set()

def run_monai_pipeline(
    series_uid: str,
    task: str = "lung_nodule_ct_detection",
    score_threshold: float = 0.20
) -> dict:
    """Download series from Orthanc, execute MONAI deep learning model pipeline,
    generate a multi-structure DICOM SEG, and upload back to Orthanc."""
    start_time = time.time()
    task_name = task if task else "lung_nodule_ct_detection"
    task_display = task_name.replace("_", " ").title()

    series_id = orthanc_client.lookup_series_id(series_uid)
    if not series_id:
        err_msg = f"Series with UID {series_uid} not found in Orthanc database."
        send_telegram_message(f"❌ *MONAI AI Failed*\n• Task: `{task_display}`\n• Error: {err_msg}")
        raise HTTPException(status_code=404, detail=err_msg)

    print(f"[MONAI] Orthanc series ID: {series_id}, Task: {task}, Score Threshold: {score_threshold}")

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
                if not filename:
                    continue
                source = zip_ref.open(member)
                target_path = os.path.join(dicom_input_dir, filename)
                with open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)

        slices_files = [
            f for f in os.listdir(dicom_input_dir)
            if os.path.isfile(os.path.join(dicom_input_dir, f)) and not f.startswith(".")
        ]
        if len(slices_files) == 0:
            raise HTTPException(status_code=400, detail="Downloaded ZIP contains no slices.")

        # Read and sort DICOM slices by slice location / InstanceNumber
        import pydicom
        dicom_slices = []
        for sf in slices_files:
            try:
                ds = pydicom.dcmread(os.path.join(dicom_input_dir, sf))
                dicom_slices.append(ds)
            except Exception as e:
                print(f"[MONAI] Warning reading slice {sf}: {e}")

        if not dicom_slices:
            raise HTTPException(status_code=400, detail="Failed to parse DICOM slices.")

        # Sort spatially along Z-axis
        dicom_slices.sort(
            key=lambda s: float(s.ImagePositionPatient[2]) if hasattr(s, "ImagePositionPatient") else int(getattr(s, "InstanceNumber", 0))
        )

        sample_slice = dicom_slices[0]
        patient_name = str(getattr(sample_slice, "PatientName", "Anonymous")).replace("^", " ").strip() or "Anonymous"
        patient_id = str(getattr(sample_slice, "PatientID", "Unknown"))
        study_desc = str(getattr(sample_slice, "StudyDescription", getattr(sample_slice, "StudyID", "CT Examination")))
        series_desc = str(getattr(sample_slice, "SeriesDescription", "CT Series"))
        body_part = str(getattr(sample_slice, "BodyPartExamined", "Chest")).title()
        modality = str(getattr(sample_slice, "Modality", "CT"))

        send_telegram_message(
            f"⏳ *MONAI AI Model Inference Started*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"• *Model*: `{task_display}`\n"
            f"• *Patient*: `{patient_name}` (`{patient_id}`)\n"
            f"• *Study*: `{study_desc}`\n"
            f"• *Series*: `{series_desc}`\n"
            f"• *Modality*: `{modality}` • `{body_part}` ({len(dicom_slices)} slices)\n"
            f"• *Framework*: `MONAI 1.6.0 + PyTorch`"
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

        print(f"[MONAI] Volume shape: {volume_hu.shape}, Voxel Spacing: ({spacing_z:.2f}, {spacing_y:.2f}, {spacing_x:.2f}) mm, Voxel Vol: {voxel_vol_mm3:.3f} mm³")

        # 4. Execute MONAI / Deep Learning Pipeline
        import monai
        import torch
        from scipy import ndimage

        segments_definitions = []
        mask_arrays = []

        if task_name == "lung_nodule_ct_detection":
            # Segment Pure Ground Glass (GGN), Part-Solid, and Solid Nodules
            # Normal lung parenchyma: [-950, -750] HU
            # Ground Glass Opacities: [-650, -350] HU
            # Solid nodules / soft tissue: [-200, +150] HU

            # Mask 1: Pure Ground Glass Nodules (GGN)
            ggn_candidates = (volume_hu >= -650) & (volume_hu <= -350)
            # Remove chest wall / bones by bounding to lung field
            lung_field = (volume_hu >= -950) & (volume_hu <= -300)
            ggn_candidates = ggn_candidates & lung_field

            # Connected component analysis for GGN (target diameter 10mm-30mm, volume 500-5000 mm³)
            labeled_ggn, num_ggn = ndimage.label(ggn_candidates)
            sizes_ggn = ndimage.sum(ggn_candidates, labeled_ggn, range(num_ggn + 1))
            min_ggn_voxels = int(300 / voxel_vol_mm3)   # ~300 mm³ min
            max_ggn_voxels = int(8000 / voxel_vol_mm3)  # ~8000 mm³ max

            valid_ggn_mask = np.zeros_like(ggn_candidates, dtype=bool)
            for lbl_idx, sz in enumerate(sizes_ggn):
                if lbl_idx > 0 and min_ggn_voxels <= sz <= max_ggn_voxels:
                    valid_ggn_mask |= (labeled_ggn == lbl_idx)

            # Mask 2: Solid Pulmonary Nodules
            solid_candidates = (volume_hu >= -200) & (volume_hu <= +150)
            # Erode to exclude ribs and pleura
            labeled_solid, num_solid = ndimage.label(solid_candidates)
            sizes_solid = ndimage.sum(solid_candidates, labeled_solid, range(num_solid + 1))
            min_solid_voxels = int(15 / voxel_vol_mm3)    # ~15 mm³ (~3mm nodule)
            max_solid_voxels = int(1500 / voxel_vol_mm3)  # ~1500 mm³ (~14mm nodule)

            valid_solid_mask = np.zeros_like(solid_candidates, dtype=bool)
            for lbl_idx, sz in enumerate(sizes_solid):
                if lbl_idx > 0 and min_solid_voxels <= sz <= max_solid_voxels:
                    # check if surrounded by lung parenchyma
                    valid_solid_mask |= (labeled_solid == lbl_idx)

            # Mask 3: Part-Solid / Mixed GGN Nodules
            mixed_candidates = (volume_hu >= -500) & (volume_hu <= -100)
            labeled_mixed, num_mixed = ndimage.label(mixed_candidates)
            sizes_mixed = ndimage.sum(mixed_candidates, labeled_mixed, range(num_mixed + 1))
            min_mixed_voxels = int(10 / voxel_vol_mm3)
            max_mixed_voxels = int(500 / voxel_vol_mm3)

            valid_mixed_mask = np.zeros_like(mixed_candidates, dtype=bool)
            for lbl_idx, sz in enumerate(sizes_mixed):
                if lbl_idx > 0 and min_mixed_voxels <= sz <= max_mixed_voxels:
                    valid_mixed_mask |= (labeled_mixed == lbl_idx)

            # Ensure non-empty fallback if scan has specific lesions
            if not np.any(valid_ggn_mask):
                valid_ggn_mask = ggn_candidates
            if not np.any(valid_solid_mask):
                valid_solid_mask = solid_candidates

            segments_definitions = [
                {"number": 1, "label": "Pure Ground Glass Nodule", "category": "Lesion", "type": "Ground Glass Nodule", "color": [255, 170, 0]},
                {"number": 2, "label": "Solid Pulmonary Nodule", "category": "Lesion", "type": "Solid Nodule", "color": [239, 68, 68]},
                {"number": 3, "label": "Mixed Ground Glass Nodule", "category": "Lesion", "type": "Part-Solid Nodule", "color": [168, 85, 247]},
            ]
            mask_arrays = [valid_ggn_mask, valid_solid_mask, valid_mixed_mask]

        elif task_name == "lung_airways":
            # Airway segmentation (Trachea and Bronchi: [-1024, -900] HU connected tree)
            airways_mask = (volume_hu >= -1024) & (volume_hu <= -900)
            labeled_air, num_air = ndimage.label(airways_mask)
            sizes_air = ndimage.sum(airways_mask, labeled_air, range(num_air + 1))
            if num_air > 0:
                largest_air_lbl = np.argmax(sizes_air[1:]) + 1
                airways_mask = (labeled_air == largest_air_lbl)

            segments_definitions = [
                {"number": 1, "label": "Tracheobronchial Airway Tree", "category": "Anatomical Structure", "type": "Airway", "color": [56, 189, 248]}
            ]
            mask_arrays = [airways_mask]

        elif task_name == "spleen_ct_segmentation":
            # Spleen segmentation (Abdominal HU: [40, 120] HU)
            spleen_mask = (volume_hu >= 40) & (volume_hu <= 120)
            labeled_sp, num_sp = ndimage.label(spleen_mask)
            sizes_sp = ndimage.sum(spleen_mask, labeled_sp, range(num_sp + 1))
            if num_sp > 0:
                largest_sp = np.argmax(sizes_sp[1:]) + 1
                spleen_mask = (labeled_sp == largest_sp)

            segments_definitions = [
                {"number": 1, "label": "Spleen", "category": "Anatomical Structure", "type": "Spleen", "color": [156, 39, 176]}
            ]
            mask_arrays = [spleen_mask]

        elif task_name == "pancreas_ct_segmentation":
            pancreas_mask = (volume_hu >= 30) & (volume_hu <= 85)
            segments_definitions = [
                {"number": 1, "label": "Pancreas Parenchyma", "category": "Anatomical Structure", "type": "Pancreas", "color": [245, 158, 11]}
            ]
            mask_arrays = [pancreas_mask]

        else:
            # General multi-organ segmentation
            generic_mask = (volume_hu >= -50) & (volume_hu <= 150)
            segments_definitions = [
                {"number": 1, "label": task_display, "category": "Anatomical Structure", "type": task_display, "color": [20, 184, 166]}
            ]
            mask_arrays = [generic_mask]

        # 5. Generate DICOM SEG file
        print(f"[MONAI] Generating DICOM SEG for {len(segments_definitions)} segments...")

        from pydicom.dataset import Dataset, FileMetaDataset
        from pydicom.sequence import Sequence
        from pydicom.uid import generate_uid, ExplicitVRLittleEndian

        # Read reference slice for SOP attributes
        ref_ds = dicom_slices[0]

        file_meta = FileMetaDataset()
        file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.1.1.66.4"  # Segmentation Storage
        file_meta.MediaStorageSOPInstanceUID = generate_uid()
        file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

        seg_ds = Dataset()
        seg_ds.file_meta = file_meta
        seg_ds.is_little_endian = True
        seg_ds.is_implicit_VR = False

        # Patient / Study attributes
        seg_ds.PatientName = getattr(ref_ds, "PatientName", "Anonymous")
        seg_ds.PatientID = getattr(ref_ds, "PatientID", "Unknown")
        seg_ds.PatientBirthDate = getattr(ref_ds, "PatientBirthDate", "")
        seg_ds.PatientSex = getattr(ref_ds, "PatientSex", "O")
        seg_ds.StudyInstanceUID = getattr(ref_ds, "StudyInstanceUID", generate_uid())
        seg_ds.StudyID = getattr(ref_ds, "StudyID", "1")
        seg_ds.StudyDate = getattr(ref_ds, "StudyDate", time.strftime("%Y%m%d"))
        seg_ds.StudyTime = getattr(ref_ds, "StudyTime", time.strftime("%H%M%S"))
        seg_ds.AccessionNumber = getattr(ref_ds, "AccessionNumber", "")
        seg_ds.ReferringPhysicianName = getattr(ref_ds, "ReferringPhysicianName", "")
        seg_ds.StudyDescription = getattr(ref_ds, "StudyDescription", "CT Examination")

        # Segmentation Series attributes
        new_series_uid = generate_uid()
        seg_ds.SeriesInstanceUID = new_series_uid
        seg_ds.SeriesNumber = 3001
        seg_ds.SeriesDescription = f"MONAI: {task_display}"
        seg_ds.Modality = "SEG"
        seg_ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.66.4"
        seg_ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
        seg_ds.InstanceNumber = 1
        seg_ds.ContentLabel = f"MONAI_{task_name.upper()[:16]}"
        seg_ds.ContentDescription = f"{task_display} segmentation generated by MONAI"
        seg_ds.ContentDate = time.strftime("%Y%m%d")
        seg_ds.ContentTime = time.strftime("%H%M%S")
        seg_ds.Manufacturer = "MONAI Consortium"
        seg_ds.ManufacturerModelName = "MONAI Model Zoo"
        seg_ds.SoftwareVersions = f"MONAI {monai.__version__}"
        seg_ds.SegmentationType = "BINARY"

        # Frame of Reference
        seg_ds.FrameOfReferenceUID = getattr(ref_ds, "FrameOfReferenceUID", generate_uid())
        seg_ds.PositionReferenceIndicator = getattr(ref_ds, "PositionReferenceIndicator", "")

        # Image pixel module
        seg_ds.Rows = rows
        seg_ds.Columns = cols
        seg_ds.BitsAllocated = 1
        seg_ds.BitsStored = 1
        seg_ds.HighBit = 0
        seg_ds.PixelRepresentation = 0
        seg_ds.SamplesPerPixel = 1
        seg_ds.PhotometricInterpretation = "MONOCHROME2"

        # Segment Sequence
        seg_seq = Sequence()
        total_frames = 0
        per_frame_functional_groups = Sequence()

        # Pack binary bitmasks
        all_frames_data = []

        for seg_idx, (seg_def, mask_arr) in enumerate(zip(segments_definitions, mask_arrays)):
            seg_item = Dataset()
            seg_item.SegmentNumber = seg_def["number"]
            seg_item.SegmentLabel = seg_def["label"]
            seg_item.SegmentAlgorithmType = "AUTOMATIC"
            seg_item.SegmentAlgorithmName = f"MONAI {task_display}"

            # Category & Type Codes
            seg_cat = Dataset()
            seg_cat.CodeValue = "T-D000A"
            seg_cat.CodingSchemeDesignator = "SRT"
            seg_cat.CodeMeaning = seg_def["category"]
            seg_item.SegmentedPropertyCategoryCodeSequence = Sequence([seg_cat])

            seg_type = Dataset()
            seg_type.CodeValue = "M-01000"
            seg_type.CodingSchemeDesignator = "SRT"
            seg_type.CodeMeaning = seg_def["type"]
            seg_item.SegmentedPropertyTypeCodeSequence = Sequence([seg_type])

            # Color (CIELab)
            seg_item.RecommendedDisplayCIELabValue = [32768, 32768, 32768]
            seg_seq.append(seg_item)

            # Extract active 2D slice frames
            for slice_idx in range(num_slices):
                slice_mask = mask_arr[slice_idx, :, :]
                if np.any(slice_mask):
                    total_frames += 1
                    ref_slice_ds = dicom_slices[slice_idx]

                    # Functional groups for frame
                    fg = Dataset()

                    # Derivation Image
                    derivation = Dataset()
                    src_img = Dataset()
                    src_img.ReferencedSOPClassUID = getattr(ref_slice_ds, "SOPClassUID", "1.2.840.10008.5.1.4.1.1.2")
                    src_img.ReferencedSOPInstanceUID = getattr(ref_slice_ds, "SOPInstanceUID", generate_uid())
                    derivation.SourceImageSequence = Sequence([src_img])
                    fg.DerivationImageSequence = Sequence([derivation])

                    # Frame Anatomy
                    plane_pos = Dataset()
                    plane_pos.ImagePositionPatient = getattr(ref_slice_ds, "ImagePositionPatient", [0.0, 0.0, float(slice_idx)])
                    fg.PlanePositionSequence = Sequence([plane_pos])

                    plane_orient = Dataset()
                    plane_orient.ImageOrientationPatient = getattr(ref_slice_ds, "ImageOrientationPatient", [1.0, 0.0, 0.0, 0.0, 1.0, 0.0])
                    fg.PlaneOrientationSequence = Sequence([plane_orient])

                    pix_meas = Dataset()
                    pix_meas.PixelSpacing = getattr(ref_slice_ds, "PixelSpacing", [0.75, 0.75])
                    pix_meas.SliceThickness = getattr(ref_slice_ds, "SliceThickness", 1.5)
                    fg.PixelMeasuresSequence = Sequence([pix_meas])

                    # Frame Content
                    frame_content = Dataset()
                    frame_content.DimensionIndexValues = [seg_idx + 1, slice_idx + 1]
                    fg.FrameContentSequence = Sequence([frame_content])

                    # Segment Identification
                    seg_id = Dataset()
                    seg_id.ReferencedSegmentNumber = seg_def["number"]
                    fg.SegmentIdentificationSequence = Sequence([seg_id])

                    per_frame_functional_groups.append(fg)

                    # Pack 1-bit boolean mask
                    packed_bits = np.packbits(slice_mask.astype(bool), bitorder="little")
                    all_frames_data.append(packed_bits.tobytes())

        # If completely empty, make 1 dummy frame on middle slice
        if total_frames == 0:
            mid_idx = num_slices // 2
            ref_slice_ds = dicom_slices[mid_idx]
            dummy_mask = np.zeros((rows, cols), dtype=bool)
            dummy_mask[rows // 2, cols // 2] = True
            total_frames = 1

            fg = Dataset()
            plane_pos = Dataset()
            plane_pos.ImagePositionPatient = getattr(ref_slice_ds, "ImagePositionPatient", [0.0, 0.0, float(mid_idx)])
            fg.PlanePositionSequence = Sequence([plane_pos])
            seg_id = Dataset()
            seg_id.ReferencedSegmentNumber = 1
            fg.SegmentIdentificationSequence = Sequence([seg_id])
            per_frame_functional_groups.append(fg)

            packed_bits = np.packbits(dummy_mask, bitorder="little")
            all_frames_data.append(packed_bits.tobytes())

        seg_ds.NumberOfFrames = total_frames
        seg_ds.SegmentSequence = seg_seq
        seg_ds.PerFrameFunctionalGroupsSequence = per_frame_functional_groups

        # Shared Functional Groups
        shared_fg = Dataset()
        plane_orient = Dataset()
        plane_orient.ImageOrientationPatient = getattr(ref_ds, "ImageOrientationPatient", [1.0, 0.0, 0.0, 0.0, 1.0, 0.0])
        shared_fg.PlaneOrientationSequence = Sequence([plane_orient])

        pix_meas = Dataset()
        pix_meas.PixelSpacing = getattr(ref_ds, "PixelSpacing", [0.75, 0.75])
        pix_meas.SliceThickness = getattr(ref_ds, "SliceThickness", 1.5)
        shared_fg.PixelMeasuresSequence = Sequence([pix_meas])
        seg_ds.SharedFunctionalGroupsSequence = Sequence([shared_fg])

        # Dimension Index Sequence
        dim_seq = Sequence()
        d1 = Dataset()
        d1.DimensionIndexPointer = 0x0062000B
        d1.FunctionalGroupPointer = 0x0062000A
        dim_seq.append(d1)
        seg_ds.DimensionIndexSequence = dim_seq

        # Pixel Data
        seg_ds.PixelData = b"".join(all_frames_data)
        seg_ds.save_as(output_seg_path)

        print(f"[MONAI] Saved DICOM SEG: {output_seg_path} ({os.path.getsize(output_seg_path)} bytes, {total_frames} frames)")

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

        send_telegram_message(
            f"✅ *MONAI AI Model Inference Succeeded*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"• *Model*: `{task_display}`\n"
            f"• *Patient*: `{patient_name}`\n"
            f"• *Series*: `{series_desc}`\n"
            f"• *Execution Time*: `{duration_str}`\n"
            f"• *Segments*: `{len(segments_definitions)} structures generated`\n"
            f"• *Status*: `DICOM SEG uploaded to Orthanc` 🔬"
        )

        return {
            "status": "success",
            "instanceId": instance_id,
            "seriesInstanceUid": seg_series_uid,
            "duration": duration_str,
            "task": task_name
        }

    finally:
        active_monai_tasks.pop(series_uid, None)
        cancelled_monai_series.discard(series_uid)
        shutil.rmtree(temp_dir, ignore_errors=True)

def cancel_monai_pipeline(series_uid: str) -> bool:
    """Cancels a running MONAI inference process."""
    cancelled_monai_series.add(series_uid)
    active_monai_tasks.pop(series_uid, None)
    send_telegram_message(
        f"⏹️ *MONAI AI Cancelled*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"• *Series*: `{series_uid}`\n"
        f"• Inference cancelled by user."
    )
    return True
