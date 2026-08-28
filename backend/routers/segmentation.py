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

