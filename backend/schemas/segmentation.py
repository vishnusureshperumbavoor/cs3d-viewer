from pydantic import BaseModel

class SegmentationRequest(BaseModel):
    studyInstanceUid: str
    seriesInstanceUid: str

class SegmentationResponse(BaseModel):
    status: str
    instanceId: str
    seriesInstanceUid: str
