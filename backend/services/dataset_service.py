import os
import time
import json
import shutil
import tempfile
import zipfile
import requests
from typing import Generator, Dict, Any, Optional
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

    def push_seg_to_huggingface(self, series_uid: str, study_folder: Optional[str] = None) -> Dict[str, Any]:
        """Pushes a DICOM segmentation series from Orthanc to Hugging Face dataset repository."""
        hf_token = os.getenv("HF_TOKEN")
        if not hf_token or "your_huggingface" in hf_token:
            raise ValueError("HF_TOKEN is not properly configured in backend/.env")

        series_id = orthanc_client.lookup_series_id(series_uid)
        if not series_id:
            raise ValueError(f"Series with UID {series_uid} not found in Orthanc.")

        instances = orthanc_client.get_series_instances(series_id)
        if not instances:
            raise ValueError(f"No instance instances found for series {series_uid}.")

        file_bytes = orthanc_client.get_instance_file(instances[0])
        if not file_bytes:
            raise ValueError("Failed to retrieve instance binary data from Orthanc.")

        # Determine clean filename from DICOM header tags
        import pydicom
        import io
        dcm = pydicom.dcmread(io.BytesIO(file_bytes), stop_before_pixels=True)
        series_desc = str(getattr(dcm, "SeriesDescription", "TotalSegmentator")).strip()
        task_label = str(getattr(dcm, "ContentLabel", "")).replace("TS_", "").lower()

        # Sanitize filename
        clean_desc = "".join(c for c in series_desc if c.isalnum() or c in ("-", "_", " ")).strip().replace(" ", "_")
        if not clean_desc.endswith(".dcm"):
            filename = f"{clean_desc}.dcm"
        else:
            filename = clean_desc

        target_folder = study_folder or HF_STUDY_FOLDER
        path_in_repo = f"{target_folder}/seg_totalsegmentator/{filename}"

        from huggingface_hub import HfApi
        api = HfApi(token=hf_token)

        print(f"[DatasetService] Uploading {filename} to HF Repo: {HF_REPO_ID} ({path_in_repo})...")
        api.upload_file(
            path_or_fileobj=file_bytes,
            path_in_repo=path_in_repo,
            repo_id=HF_REPO_ID,
            repo_type="dataset",
            commit_message=f"Upload {series_desc} segmentation"
        )

        hf_url = f"https://huggingface.co/datasets/{HF_REPO_ID}/tree/main/{target_folder}/seg_totalsegmentator"

        # Send Telegram notification if enabled
        try:
            from services.telegram_notifier import send_telegram_message
            send_telegram_message(
                f"🚀 *Pushed Segmentation to Hugging Face*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"• *File*: `{filename}`\n"
                f"• *Dataset*: `{HF_REPO_ID}`\n"
                f"• *Folder*: `{target_folder}/seg_totalsegmentator`\n"
                f"• *Link*: [View on Hugging Face]({hf_url})"
            )
        except Exception as tel_err:
            print(f"[DatasetService] Telegram alert warning: {tel_err}")

        return {
            "status": "success",
            "filename": filename,
            "pathInRepo": path_in_repo,
            "repoId": HF_REPO_ID,
            "url": hf_url,
        }

dataset_service = DatasetService()
