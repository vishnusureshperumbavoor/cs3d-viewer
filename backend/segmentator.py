import os
import shutil
import tempfile
import zipfile
import subprocess
import requests
from fastapi import HTTPException

ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USER = os.getenv("ORTHANC_USER", "orthanc")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD", "orthanc")

def get_orthanc_auth():
    if ORTHANC_USER and ORTHANC_PASSWORD:
        return (ORTHANC_USER, ORTHANC_PASSWORD)
    return None

def lookup_series_id(series_uid: str) -> str:
    """Look up Orthanc's internal UUID for a given SeriesInstanceUID."""
    url = f"{ORTHANC_URL}/tools/lookup"
    try:
        response = requests.post(url, data=series_uid, auth=get_orthanc_auth())
        response.raise_for_status()
        results = response.json()
        for item in results:
            if item.get("Type") == "Series":
                return item.get("ID")
    except Exception as e:
        print(f"Error looking up series UID: {e}")
    return None

def get_series_instance_uid(series_id: str) -> str:
    """Retrieve the DICOM SeriesInstanceUID for an Orthanc internal ID."""
    url = f"{ORTHANC_URL}/series/{series_id}"
    try:
        response = requests.get(url, auth=get_orthanc_auth())
        response.raise_for_status()
        return response.json().get("MainDicomTags", {}).get("SeriesInstanceUID")
    except Exception as e:
        print(f"Error fetching series details: {e}")
    return None

def run_segmentation_pipeline(series_uid: str) -> dict:
    """Download series, run TotalSegmentator, upload results to Orthanc, and return metadata."""
    series_id = lookup_series_id(series_uid)
    if not series_id:
        raise HTTPException(
            status_code=404, 
            detail=f"Series with UID {series_uid} not found in Orthanc database."
        )
    
    print(f"Orthanc series ID: {series_id}")
    
    # Create temporary directories for processing
    temp_dir = tempfile.mkdtemp()
    dicom_input_dir = os.path.join(temp_dir, "input_slices")
    os.makedirs(dicom_input_dir, exist_ok=True)
    
    zip_path = os.path.join(temp_dir, "series.zip")
    output_seg_path = os.path.join(temp_dir, "segmentation.dcm")
    
    try:
        # 1. Download zip from Orthanc
        archive_url = f"{ORTHANC_URL}/series/{series_id}/archive"
        print(f"Downloading DICOM archive from {archive_url}...")
        
        response = requests.get(archive_url, auth=get_orthanc_auth(), stream=True)
        response.raise_for_status()
        
        with open(zip_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        # 2. Unzip files flattening any nested Orthanc directory structure
        print("Extracting ZIP archive...")
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            for member in zip_ref.infolist():
                filename = os.path.basename(member.filename)
                if not filename:
                    continue
                source = zip_ref.open(member)
                target_path = os.path.join(dicom_input_dir, filename)
                with open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)
            
        # Verify slices were extracted
        slices = [f for f in os.listdir(dicom_input_dir) if os.path.isfile(os.path.join(dicom_input_dir, f))]
        print(f"Extracted {len(slices)} slices.")
        if len(slices) == 0:
            raise HTTPException(status_code=400, detail="Downloaded ZIP contains no file slices.")

        # 3. Execute TotalSegmentator in fast mode
        print("Running TotalSegmentator...")
        venv_bin = os.path.join(os.path.dirname(os.path.abspath(__file__)), "venv", "bin", "TotalSegmentator")
        cmd = [
            venv_bin if os.path.exists(venv_bin) else "TotalSegmentator",
            "-i", dicom_input_dir,
            "-o", output_seg_path,
            "--output_type", "dicom_seg",
            "--fast"
        ]
        
        # Specify environment variables: CPU usage
        env = os.environ.copy()
        env["OMP_NUM_THREADS"] = "4"
        
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        print(result.stdout)
        
        if result.returncode != 0:
            print("TotalSegmentator failed:")
            print(result.stderr)
            raise HTTPException(status_code=500, detail=f"TotalSegmentator failed: {result.stderr}")
            
        if not os.path.exists(output_seg_path):
            raise HTTPException(status_code=500, detail="TotalSegmentator completed but output binary file was not created.")
            
        print(f"Successfully generated DICOM SEG: {output_seg_path} ({os.path.getsize(output_seg_path)} bytes)")
        
        # 4. Upload back to Orthanc
        print("Uploading DICOM SEG back to Orthanc...")
        upload_url = f"{ORTHANC_URL}/instances"
        with open(output_seg_path, "rb") as f:
            upload_response = requests.post(upload_url, data=f.read(), auth=get_orthanc_auth())
            upload_response.raise_for_status()
            
        upload_result = upload_response.json()
        parent_series_id = upload_result.get("ParentSeries")
        instance_id = upload_result.get("ID")
        
        seg_series_uid = get_series_instance_uid(parent_series_id)
        print(f"Uploaded successfully. Orthanc instance ID: {instance_id}, SeriesInstanceUID: {seg_series_uid}")
        
        return {
            "status": "success",
            "instanceId": instance_id,
            "seriesInstanceUid": seg_series_uid
        }
        
    finally:
        # Cleanup temporary files
        shutil.rmtree(temp_dir, ignore_errors=True)
