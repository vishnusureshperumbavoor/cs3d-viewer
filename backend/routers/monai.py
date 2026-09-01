import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from services.monai_service import run_monai_pipeline, cancel_monai_pipeline

router = APIRouter(
    prefix="/monai",
    tags=["MONAI AI Inference"]
)

class MonaiRunRequest(BaseModel):
    studyInstanceUid: Optional[str] = None
    seriesInstanceUid: str
    task: str = "lung_nodule_ct_detection"
    scoreThreshold: Optional[float] = 0.20

class MonaiCancelRequest(BaseModel):
    seriesInstanceUid: str

@router.post("/run")
def run_monai_endpoint(payload: MonaiRunRequest):
    """Triggers MONAI model inference for a series."""
    if not payload.seriesInstanceUid:
        raise HTTPException(status_code=400, detail="seriesInstanceUid is required.")
    
    return run_monai_pipeline(
        series_uid=payload.seriesInstanceUid,
        task=payload.task,
        score_threshold=payload.scoreThreshold or 0.20
    )

@router.post("/cancel")
def cancel_monai_endpoint(payload: MonaiCancelRequest):
    """Cancels an active MONAI inference process."""
    if not payload.seriesInstanceUid:
        raise HTTPException(status_code=400, detail="seriesInstanceUid is required.")
    
    cancelled = cancel_monai_pipeline(payload.seriesInstanceUid)
    return {"cancelled": cancelled, "seriesInstanceUid": payload.seriesInstanceUid}

@router.get("/installed-models")
def get_installed_monai_models():
    """Returns the list of MONAI model tasks whose weights are cached locally on disk."""
    cache_dirs = [
        os.path.expanduser("~/.monai_models"),
        os.path.expanduser("~/.monai/models"),
        os.path.expanduser("~/.cache/torch/hub/checkpoints"),
        os.path.expanduser("~/.cache/monai"),
    ]
    installed = ["intracranial_hemorrhage_detection"]
    for cd in cache_dirs:
        if os.path.exists(cd):
            files = os.listdir(cd)
            for f in files:
                f_lower = f.lower()
                if "nodule" in f_lower:
                    installed.append("lung_nodule_ct_detection")
                if "airway" in f_lower:
                    installed.append("lung_airways")
                if "spleen" in f_lower:
                    installed.append("spleen_ct_segmentation")
                if "pancreas" in f_lower:
                    installed.append("pancreas_ct_segmentation")
                if "liver" in f_lower:
                    installed.append("liver_multiorgan_ct")
                if "hemorrhage" in f_lower or "ich" in f_lower:
                    installed.append("intracranial_hemorrhage_detection")

    return {"installedTasks": list(set(installed))}
