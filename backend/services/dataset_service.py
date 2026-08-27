import os
import time
import json
import shutil
import tempfile
import zipfile
import requests
from typing import Generator, Dict, Any
from huggingface_hub import snapshot_download
from core.config import HF_REPO_ID, HF_STUDY_FOLDER
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
        """Downloads the study folder from Hugging Face and uploads all DICOM series into Orthanc with SSE progress."""
        try:
            yield f"data: {json.dumps({'stage': 'starting', 'progress': 10, 'message': 'Connecting to Hugging Face repository...'})}\n\n"

            # 1. Download study folder from Hugging Face Hub
            yield f"data: {json.dumps({'stage': 'downloading', 'progress': 30, 'message': f'Downloading folder {HF_STUDY_FOLDER} from Hugging Face...'})}\n\n"
            
            hf_token = os.getenv("HF_TOKEN")
            token_arg = hf_token if hf_token and "your_huggingface" not in hf_token else None

            downloaded_dir = snapshot_download(
                repo_id=HF_REPO_ID,
                repo_type="dataset",
                allow_patterns=f"{HF_STUDY_FOLDER}/**",
                token=token_arg
            )

            target_folder = os.path.join(downloaded_dir, HF_STUDY_FOLDER)
            if not os.path.exists(target_folder):
                target_folder = downloaded_dir

            # 2. Collect all DICOM files in the downloaded directory tree
            slice_files = []
            for root, _, files in os.walk(target_folder):
                for f in sorted(files):
                    if not f.startswith(".") and (f.endswith(".dcm") or ".dcm" in f or not os.path.splitext(f)[1]):
                        slice_files.append(os.path.join(root, f))

            total_slices = len(slice_files)
            if total_slices == 0:
                raise Exception(f"No DICOM files found in downloaded study folder {HF_STUDY_FOLDER}.")

            yield f"data: {json.dumps({'stage': 'ingesting', 'progress': 55, 'message': f'Ingesting {total_slices} DICOM files into Orthanc...'})}\n\n"

            # 3. Upload each slice / segmentation to Orthanc
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

                ingest_pct = 55 + int(((idx + 1) / total_slices) * 44)
                if idx % 10 == 0 or idx == total_slices - 1:
                    payload = {
                        "stage": "ingesting",
                        "progress": ingest_pct,
                        "message": f"Uploaded {idx + 1}/{total_slices} files to Orthanc...",
                    }
                    yield f"data: {json.dumps(payload)}\n\n"

            yield f"data: {json.dumps({'stage': 'completed', 'progress': 100, 'studyInstanceUid': study_instance_uid, 'message': 'Study ready to view!'})}\n\n"

        except Exception as e:
            print(f"[DatasetService] Error importing sample: {e}")
            yield f"data: {json.dumps({'stage': 'error', 'error': str(e), 'message': f'Import failed: {str(e)}'})}\n\n"

dataset_service = DatasetService()
