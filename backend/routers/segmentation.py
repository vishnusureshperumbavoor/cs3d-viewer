import os
from fastapi import APIRouter, HTTPException
from schemas.segmentation import SegmentationRequest
from services.segmentator import run_segmentation_pipeline

router = APIRouter(prefix="/segment", tags=["Segmentation"])

@router.get("/installed-models")
async def get_installed_models():
    """Returns a list of TotalSegmentator task names whose model weights are cached locally on disk."""
    try:
        from totalsegmentator.python_api import TASK_CONFIGS
        user_dir = os.path.expanduser("~/.totalsegmentator_user/nnunet/results")
        default_dir = os.path.expanduser("~/.totalsegmentator/nnunet/results")

        dirs = []
        if os.path.exists(user_dir):
            dirs.extend(os.listdir(user_dir))
        if os.path.exists(default_dir):
            dirs.extend(os.listdir(default_dir))

        installed = []
        for task, conf in TASK_CONFIGS.items():
            task_ids = conf.get("task_id")
            if not task_ids and "sub_modes" in conf:
                task_ids = conf["sub_modes"].get("fast", {}).get("task_id") or conf["sub_modes"].get("default", {}).get("task_id")
            if task_ids:
                if isinstance(task_ids, int):
                    task_ids = [task_ids]
                if any(any(d.startswith(f"Dataset{tid:03d}") for d in dirs) for tid in task_ids):
                    installed.append(task)

        return {"installedTasks": sorted(list(set(installed)))}
    except Exception as e:
        print(f"[Segmentation] Error detecting installed models: {e}")
        return {"installedTasks": []}

@router.post("/total")
async def run_totalsegmentator(request: SegmentationRequest):
    """Triggers TotalSegmentator inference on the requested DICOM series."""
    series_uid = request.seriesInstanceUid
    task = request.task or "total"
    fast = request.fast if request.fast is not None else True
    print(f"[Router:Segmentation] Received request for SeriesInstanceUID: {series_uid}, Task: {task}, Fast: {fast}")
    try:
        result = run_segmentation_pipeline(series_uid, task=task, fast=fast)
        return result
    except Exception as ex:
        print(f"[Router:Segmentation] Error: {ex}")
        if isinstance(ex, HTTPException):
            raise ex
        raise HTTPException(status_code=500, detail=str(ex))

@router.post("/push-hf")
async def push_segmentation_to_huggingface(payload: dict):
    """Pushes a generated DICOM segmentation series from Orthanc to Hugging Face dataset repo."""
    from services.dataset_service import dataset_service
    series_uid = payload.get("seriesInstanceUid")
    study_folder = payload.get("studyFolder")
    if not series_uid:
        raise HTTPException(status_code=400, detail="Missing required 'seriesInstanceUid' parameter.")

    print(f"[Router:Segmentation] Received Hugging Face push request for series: {series_uid}")
    try:
        res = dataset_service.push_seg_to_huggingface(series_uid, study_folder=study_folder)
        return res
    except Exception as ex:
        print(f"[Router:Segmentation] Error pushing to Hugging Face: {ex}")
        if isinstance(ex, HTTPException):
            raise ex
        raise HTTPException(status_code=500, detail=str(ex))

@router.delete("/series/{series_uid}")
async def delete_segmentation_series(series_uid: str):
    """Deletes a DICOM segmentation series from Orthanc."""
    from services.orthanc_client import orthanc_client
    print(f"[Router:Segmentation] Deleting series {series_uid} from Orthanc...")
    success = orthanc_client.delete_series(series_uid)
    if not success:
        raise HTTPException(status_code=404, detail=f"Series with UID {series_uid} could not be deleted from Orthanc.")
    return {"status": "success", "deletedSeriesUid": series_uid}

@router.get("/hf-files")
async def get_hf_segmentations(study_folder: str = None):
    """Lists all TotalSegmentator segmentation files already uploaded to Hugging Face dataset."""
    from services.dataset_service import dataset_service
    files = dataset_service.list_hf_segmentations(study_folder=study_folder)
    return {"files": files}

@router.get("/license")
async def get_license_status():
    """Returns the current TotalSegmentator license status."""
    import json
    user_config_path = os.path.expanduser("~/.totalsegmentator_user/config.json")
    default_config_path = os.path.expanduser("~/.totalsegmentator/config.json")

    license_key = ""
    for path in [user_config_path, default_config_path]:
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    cfg = json.load(f)
                    if cfg.get("license_number"):
                        license_key = str(cfg["license_number"]).strip()
                        break
            except Exception:
                pass

    if license_key:
        masked = license_key[:4] + "••••••••" + license_key[-4:] if len(license_key) >= 10 else "••••••••"
        return {
            "hasLicense": True,
            "licenseMasked": masked,
            "status": "active",
        }
    return {
        "hasLicense": False,
        "licenseMasked": None,
        "status": "unregistered",
    }

@router.post("/license")
async def set_license(payload: dict):
    """Sets and validates the TotalSegmentator academic license key."""
    import json, subprocess
    license_number = str(payload.get("licenseNumber", "")).strip()
    skip_validation = bool(payload.get("skipValidation", False))

    if not license_number:
        raise HTTPException(status_code=400, detail="License number cannot be empty.")

    if not license_number.startswith("aca_"):
        raise HTTPException(status_code=400, detail="Academic license key must start with 'aca_'")

    if len(license_number) != 18:
        raise HTTPException(status_code=400, detail=f"Academic license key must have exactly 18 characters (received {len(license_number)}).")

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    venv_bin = os.path.join(backend_dir, "venv", "bin", "totalseg_set_license")
    cmd = [
        venv_bin if os.path.exists(venv_bin) else "totalseg_set_license",
        "-l", license_number,
    ]
    if skip_validation:
        cmd.append("-sv")

    user_totalseg_dir = os.path.expanduser("~/.totalsegmentator_user")
    os.makedirs(user_totalseg_dir, exist_ok=True)
    env = os.environ.copy()
    env["TOTALSEG_HOME_DIR"] = user_totalseg_dir

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=15)
        if proc.returncode != 0 and not skip_validation:
            err_msg = (proc.stderr or proc.stdout or "").strip()
            raise HTTPException(status_code=400, detail=f"License validation failed: {err_msg or 'Invalid license number'}")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="License validation timed out contacting the TotalSegmentator licensing server.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute license setup: {str(e)}")

    user_config_path = os.path.join(user_totalseg_dir, "config.json")
    try:
        cfg = {}
        if os.path.exists(user_config_path):
            with open(user_config_path, "r") as f:
                cfg = json.load(f)
        cfg["license_number"] = license_number
        with open(user_config_path, "w") as f:
            json.dump(cfg, f, indent=4)
    except Exception as e:
        print(f"[Segmentation] Warning updating user config file: {e}")

    return {"success": True, "message": "TotalSegmentator academic license activated successfully!"}

@router.delete("/license")
async def remove_license():
    """Removes the TotalSegmentator license key."""
    import json
    for path in [
        os.path.expanduser("~/.totalsegmentator_user/config.json"),
        os.path.expanduser("~/.totalsegmentator/config.json"),
    ]:
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    cfg = json.load(f)
                if "license_number" in cfg:
                    del cfg["license_number"]
                    with open(path, "w") as f:
                        json.dump(cfg, f, indent=4)
            except Exception as e:
                print(f"[Segmentation] Warning clearing license from {path}: {e}")

    return {"success": True, "message": "TotalSegmentator license removed."}

