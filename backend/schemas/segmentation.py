from typing import Optional
from pydantic import BaseModel

class SegmentationRequest(BaseModel):
    studyInstanceUid: str
    seriesInstanceUid: str
    task: Optional[str] = "total"
    fast: Optional[bool] = True

class SegmentationResponse(BaseModel):
    status: str
    instanceId: str
    seriesInstanceUid: str

