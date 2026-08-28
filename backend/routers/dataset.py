from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from schemas.dataset import SampleDatasetStatusResponse
from services.dataset_service import dataset_service

router = APIRouter(prefix="/dataset", tags=["Datasets"])

@router.get("/sample-status", response_model=SampleDatasetStatusResponse)
def get_sample_status():
    """Checks if the Hugging Face CT abdomen dataset is already imported in Orthanc."""
    return dataset_service.check_sample_status()

@router.get("/import-sample-stream")
def import_sample_stream():
    """Streams live download and ingestion progress as Server-Sent Events (SSE)."""
    return StreamingResponse(
        dataset_service.generate_sample_import_stream(),
        media_type="text/event-stream"
    )
