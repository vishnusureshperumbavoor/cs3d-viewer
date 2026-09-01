import os
import time
import shutil
import tempfile
import zipfile
import subprocess
import signal
from fastapi import HTTPException
from services.orthanc_client import orthanc_client
from services.telegram_notifier import send_telegram_message, get_ist_time_str

# Active process tracking for cancellation support
active_segmentation_processes = {}
active_temp_dirs = {}
cancelled_series = set()

def run_segmentation_pipeline(series_uid: str, task: str = "total", fast: bool = True) -> dict:
    """Download series, run TotalSegmentator with requested task, upload results to Orthanc, and return metadata."""
    start_time = time.time()
    task_name = task if task else "total"
    task_display = task_name.replace("_", " ").title() if task_name != "total" else "Whole Body (117 Organs)"

    series_id = orthanc_client.lookup_series_id(series_uid)
    if not series_id:
        err_msg = f"Series with UID {series_uid} not found in Orthanc database."
        send_telegram_message(f"❌ *TotalSegmentator Failed*\n• Task: `{task_display}`\n• Error: {err_msg}")
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

    send_telegram_message(
        f"⏳ *TotalSegmentator AI Started*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"• *Task*: `{task_display}`\n"
        f"• *Start Time (IST)*: `{start_time_ist}`\n"
        f"• *Patient*: `{patient_name}` (`{patient_id}`)\n"
        f"• *Series*: `{series_desc}`\n"
        f"• *Modality*: `{modality}` ({instances_count} slices)\n"
        f"• *Mode*: `{'Fast (3mm)' if fast and task == 'total' else 'High-Res'}`"
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
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        venv_bin = os.path.join(backend_dir, "venv", "bin", "TotalSegmentator")

        cmd = [
            venv_bin if os.path.exists(venv_bin) else "TotalSegmentator",
            "-i", dicom_input_dir,
            "-o", output_seg_path,
            "--output_type", "dicom_seg",
        ]

        if task and task != "total":
            cmd.extend(["--task", task])

        if fast and (not task or task == "total"):
            cmd.append("--fast")

        user_totalseg_dir = os.path.expanduser("~/.totalsegmentator_user")
        os.makedirs(os.path.join(user_totalseg_dir, "nnunet", "results"), exist_ok=True)

        env = os.environ.copy()
        env["TOTALSEG_HOME_DIR"] = user_totalseg_dir
        env["TOTALSEG_WEIGHTS_PATH"] = os.path.join(user_totalseg_dir, "nnunet", "results")
        env["OMP_NUM_THREADS"] = "4"
        
        active_temp_dirs[series_uid] = temp_dir
        cancelled_series.discard(series_uid)

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            preexec_fn=os.setsid,
        )
        active_segmentation_processes[series_uid] = process

        stdout, stderr = process.communicate()
        returncode = process.returncode

        if series_uid in cancelled_series or returncode in (-15, -9, 143, 137):
            print(f"[TotalSegmentator] Inference was cancelled for series {series_uid}")
            cancelled_series.discard(series_uid)
            raise HTTPException(status_code=499, detail="TotalSegmentator inference cancelled by user.")

        if returncode != 0:
            err_output = (stderr or "").strip() or (stdout or "").strip() or "Unknown error"
            print(f"[TotalSegmentator] Failed ({returncode}): {err_output}")
            send_telegram_message(
                f"❌ *TotalSegmentator Failed*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"• *Task*: `{task_display}`\n"
                f"• *Patient*: `{patient_name}`\n"
                f"• *Series*: `{series_desc}`\n"
                f"• *Error*: `{err_output[:250]}`"
            )
            raise HTTPException(status_code=500, detail=f"TotalSegmentator inference failed: {err_output}")

        if not os.path.exists(output_seg_path):
            raise HTTPException(status_code=500, detail="TotalSegmentator completed but output SEG was not created.")

        print(f"[TotalSegmentator] Generated DICOM SEG: {output_seg_path} ({os.path.getsize(output_seg_path)} bytes)")

        num_structures = 0
        try:
            import pydicom
            ds = pydicom.dcmread(output_seg_path)
            ds.SeriesDescription = task_display
            ds.ContentLabel = f"TS_{task_name.upper()}"
            ds.ContentDescription = f"{task_display} segmentation generated by TotalSegmentator"
            ds.Manufacturer = "TotalSegmentator"
            if hasattr(ds, "SegmentSequence"):
                num_structures = len(ds.SegmentSequence)
            ds.save_as(output_seg_path)
            print(f"[TotalSegmentator] Updated DICOM header: SeriesDescription='{ds.SeriesDescription}' (Segments: {num_structures})")
        except Exception as pydicom_err:
            print(f"[TotalSegmentator] Warning: Failed to inject DICOM task metadata: {pydicom_err}")

        # 4. Upload generated SEG back to Orthanc
        print("[TotalSegmentator] Uploading DICOM SEG back to Orthanc...")
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
        print(f"[TotalSegmentator] Pipeline complete in {duration_str}! Uploaded SEG Series UID: {seg_series_uid}")

        return {
            "status": "success",
            "instanceId": instance_id,
            "seriesInstanceUid": seg_series_uid,
            "duration": duration_str,
            "task": task,
            "taskDisplay": task_display,
            "patientName": patient_name,
            "seriesDescription": series_desc,
            "startTimeIst": start_time_ist,
            "completedTimeIst": get_ist_time_str(),
            "segmentsCount": num_structures if num_structures > 0 else 1,
            "pipeline": "TotalSegmentator AI",
        }

    finally:
        active_segmentation_processes.pop(series_uid, None)
        active_temp_dirs.pop(series_uid, None)
        cancelled_series.discard(series_uid)
        shutil.rmtree(temp_dir, ignore_errors=True)


def cancel_segmentation_pipeline(series_uid: str) -> bool:
    """Cancels a running TotalSegmentator inference process and kills its worker tree."""
    cancelled_series.add(series_uid)
    process = active_segmentation_processes.get(series_uid)
    temp_dir = active_temp_dirs.get(series_uid)

    if not process:
        print(f"[TotalSegmentator] No running process found to cancel for series {series_uid}")
        return False

    print(f"[TotalSegmentator] Cancelling inference process PID {process.pid} for series {series_uid}...")
    try:
        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        try:
            process.wait(timeout=2)
        except Exception:
            os.killpg(os.getpgid(process.pid), signal.SIGKILL)
    except Exception as e:
        print(f"[TotalSegmentator] Warning killing process {process.pid}: {e}")

    if temp_dir and os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)

    active_segmentation_processes.pop(series_uid, None)
    active_temp_dirs.pop(series_uid, None)

    stop_time_ist = get_ist_time_str()
    send_telegram_message(
        f"⏹️ *TotalSegmentator Cancelled*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"• *Series*: `{series_uid}`\n"
        f"• *Stop Time (IST)*: `{stop_time_ist}`\n"
        f"• Inference cancelled by user."
    )
    return True
