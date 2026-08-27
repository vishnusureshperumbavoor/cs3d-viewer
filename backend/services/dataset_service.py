import os
import time
import json
import shutil
import tempfile
import zipfile
import requests
from typing import Generator, Dict, Any
from core.config import SAMPLE_DATASET_URL
from services.orthanc_client import orthanc_client

class DatasetService:
    def check_sample_status(self) -> Dict[str, Any]:
        """Checks if the demo CT abdomen study is already stored in Orthanc."""
        try:
            study_ids = orthanc_client.list_all_studies()
            for s_id in study_ids:
                data = orthanc_client.get_study_info(s_id)
                main_tags = data.get("MainDicomTags", {})
                patient_tags = data.get("PatientMainDicomTags", {})
                desc = main_tags.get("StudyDescription", "")
                patient_name = patient_tags.get("PatientName", "")
                patient_id = patient_tags.get("PatientID", "")
                study_uid = main_tags.get("StudyInstanceUID")

                combined = f"{desc} {patient_name} {patient_id} {study_uid}".lower()
                if "abdomen" in combined or "15076" in combined:
                    return {
                        "exists": True,
                        "studyInstanceUid": study_uid,
                        "orthancStudyId": s_id,
                        "patientName": patient_name or "Abdomen Sample",
                        "studyDescription": desc or "CT Abdomen",
                    }
        except Exception as e:
            print(f"[DatasetService] Error checking sample status: {e}")

        return {"exists": False, "studyInstanceUid": None}

    def generate_sample_import_stream(self) -> Generator[str, None, None]:
        """Streams download from Hugging Face, extracts DICOM slices, and uploads to Orthanc with SSE progress."""
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, "dataset.zip")
        extract_dir = os.path.join(temp_dir, "slices")
        os.makedirs(extract_dir, exist_ok=True)

        try:
            yield f"data: {json.dumps({'stage': 'starting', 'progress': 0, 'message': 'Connecting to Hugging Face...'})}\n\n"

            # 1. Stream download from Hugging Face
            response = requests.get(SAMPLE_DATASET_URL, stream=True, timeout=60)
            response.raise_for_status()

            total_bytes = int(response.headers.get("content-length", 0))
            if total_bytes <= 0:
                total_bytes = 113 * 1024 * 1024  # fallback estimate ~113MB

            downloaded_bytes = 0
            chunk_size = 128 * 1024
            last_yield_time = time.time()

            with open(zip_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    if chunk:
                        f.write(chunk)
                        downloaded_bytes += len(chunk)
                        now = time.time()
                        if now - last_yield_time > 0.15 or downloaded_bytes >= total_bytes:
                            last_yield_time = now
                            pct = min(88, int((downloaded_bytes / total_bytes) * 88))
                            downloaded_mb = round(downloaded_bytes / (1024 * 1024), 1)
                            total_mb = round(total_bytes / (1024 * 1024), 1)
                            payload = {
                                "stage": "downloading",
                                "progress": pct,
                                "downloadedMb": downloaded_mb,
                                "totalMb": total_mb,
                                "message": f"Downloading {downloaded_mb}MB / {total_mb}MB ({pct}%)",
                            }
                            yield f"data: {json.dumps(payload)}\n\n"

            # 2. Extract ZIP
            yield f"data: {json.dumps({'stage': 'extracting', 'progress': 90, 'message': 'Extracting DICOM slices...'})}\n\n"
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                for member in zip_ref.infolist():
                    fname = os.path.basename(member.filename)
                    if fname and not fname.startswith(".") and not fname.startswith("__MACOSX"):
                        target_file = os.path.join(extract_dir, fname)
                        with zip_ref.open(member) as source, open(target_file, "wb") as target:
                            shutil.copyfileobj(source, target)

            slice_files = [
                os.path.join(extract_dir, f)
                for f in os.listdir(extract_dir)
                if os.path.isfile(os.path.join(extract_dir, f)) and not f.startswith(".")
            ]

            total_slices = len(slice_files)
            if total_slices == 0:
                raise Exception("No DICOM slice files found in downloaded zip.")

            yield f"data: {json.dumps({'stage': 'ingesting', 'progress': 92, 'message': f'Ingesting {total_slices} slices into Orthanc...'})}\n\n"

            # 3. Upload each slice to Orthanc
            study_instance_uid = None
            for idx, slice_path in enumerate(slice_files):
                with open(slice_path, "rb") as sf:
                    up_resp = orthanc_client.upload_instance(sf.read())
                    if not study_instance_uid:
                        inst_id = up_resp.get("ID")
                        if inst_id:
                            inst_info = orthanc_client.get_instance_info(inst_id)
                            parent_study_id = inst_info.get("ParentStudy")
                            if parent_study_id:
                                study_info = orthanc_client.get_study_info(parent_study_id)
                                study_instance_uid = study_info.get("MainDicomTags", {}).get("StudyInstanceUID")

                ingest_pct = 92 + int(((idx + 1) / total_slices) * 8)
                if idx % 10 == 0 or idx == total_slices - 1:
                    payload = {
                        "stage": "ingesting",
                        "progress": ingest_pct,
                        "message": f"Uploaded {idx + 1}/{total_slices} slices to Orthanc...",
                    }
                    yield f"data: {json.dumps(payload)}\n\n"

            yield f"data: {json.dumps({'stage': 'completed', 'progress': 100, 'studyInstanceUid': study_instance_uid, 'message': 'Dataset ready to view!'})}\n\n"

        except Exception as e:
            print(f"[DatasetService] Error importing sample: {e}")
            yield f"data: {json.dumps({'stage': 'error', 'error': str(e), 'message': f'Import failed: {str(e)}'})}\n\n"
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

dataset_service = DatasetService()
