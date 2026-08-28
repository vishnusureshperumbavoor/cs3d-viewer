from typing import Optional
from pydantic import BaseModel

class SampleDatasetStatusResponse(BaseModel):
    exists: bool
    studyInstanceUid: Optional[str] = None
    orthancStudyId: Optional[str] = None
    patientName: Optional[str] = None
    studyDescription: Optional[str] = None
