import os
import shutil
import tempfile
import zipfile
import subprocess
from fastapi import HTTPException
from services.orthanc_client import orthanc_client

def run_segmentation_pipeline(series_uid: str, task: str = "total", fast: bool = True) -> dict:
    """Download series, run TotalSegmentator with requested task, upload results to Orthanc, and return metadata."""
    series_id = orthanc_client.lookup_series_id(series_uid)
    if not series_id:
        raise HTTPException(
            status_code=404,
            detail=f"Series with UID {series_uid} not found in Orthanc database."
        )

    print(f"[TotalSegmentator] Orthanc series ID: {series_id}, Task: {task}, Fast: {fast}")

    temp_dir = tempfile.mkdtemp()
    dicom_input_dir = os.path.join(temp_dir, "input_slices")
    os.makedirs(dicom_input_dir, exist_ok=True)

    zip_path = os.path.join(temp_dir, "series.zip")
    output_seg_path = os.path.join(temp_dir, "segmentation.dcm")

    try:
        # 1. Download series archive from Orthanc
        print("[TotalSegmentator] Downloading DICOM series archive...")
        orthanc_client.download_series_archive(series_id, zip_path)

        # 2. Extract files
        print("[TotalSegmentator] Extracting ZIP archive...")
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            for member in zip_ref.infolist():
                filename = os.path.basename(member.filename)
                if not filename:
                    continue
                source = zip_ref.open(member)
                target_path = os.path.join(dicom_input_dir, filename)
                with open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)

        slices = [f for f in os.listdir(dicom_input_dir) if os.path.isfile(os.path.join(dicom_input_dir, f))]
        print(f"[TotalSegmentator] Extracted {len(slices)} slices.")
        if len(slices) == 0:
            raise HTTPException(status_code=400, detail="Downloaded ZIP contains no slices.")

        # 3. Execute TotalSegmentator
        print(f"[TotalSegmentator] Executing inference for task '{task}'...")
        # Check venv in project root or relative path
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        venv_bin = os.path.join(backend_dir, "venv", "bin", "TotalSegmentator")

        cmd = [
            venv_bin if os.path.exists(venv_bin) else "TotalSegmentator",
            "-i", dicom_input_dir,
            "-o", output_seg_path,
            "--output_type", "dicom_seg",
        ]

        # Add specialized task flag if specified
        if task and task != "total":
            cmd.extend(["--task", task])

        if fast:
            cmd.append("--fast")

        env = os.environ.copy()
        env["OMP_NUM_THREADS"] = "4"

        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        if result.returncode != 0:
            print(f"[TotalSegmentator] Failed: {result.stderr}")
            raise HTTPException(status_code=500, detail=f"TotalSegmentator inference failed: {result.stderr}")

        if not os.path.exists(output_seg_path):
            raise HTTPException(status_code=500, detail="TotalSegmentator completed but output SEG was not created.")

        print(f"[TotalSegmentator] Generated DICOM SEG: {output_seg_path} ({os.path.getsize(output_seg_path)} bytes)")

        # 4. Upload generated SEG back to Orthanc
        print("[TotalSegmentator] Uploading DICOM SEG back to Orthanc...")
        with open(output_seg_path, "rb") as f:
            upload_result = orthanc_client.upload_instance(f.read())

        parent_series_id = upload_result.get("ParentSeries")
        instance_id = upload_result.get("ID")
        seg_series_uid = orthanc_client.get_series_instance_uid(parent_series_id)

        print(f"[TotalSegmentator] Success! Instance ID: {instance_id}, SeriesInstanceUID: {seg_series_uid}")
        return {
            "status": "success",
            "instanceId": instance_id,
            "seriesInstanceUid": seg_series_uid
        }

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
