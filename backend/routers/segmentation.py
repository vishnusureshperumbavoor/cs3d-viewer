from fastapi import APIRouter, HTTPException
from schemas.segmentation import SegmentationRequest
from services.segmentator import run_segmentation_pipeline

router = APIRouter(prefix="/segment", tags=["Segmentation"])

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
