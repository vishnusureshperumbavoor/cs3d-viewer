import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from segmentator import run_segmentation_pipeline

app = FastAPI(title="TotalSegmentator AI Backend")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SegmentationRequest(BaseModel):
    studyInstanceUid: str
    seriesInstanceUid: str

@app.post("/api/segment/total")
async def run_totalsegmentator(request: SegmentationRequest):
    series_uid = request.seriesInstanceUid
    print(f"Received segmentation request for series UID: {series_uid}")
    try:
        result = run_segmentation_pipeline(series_uid)
        return result
    except Exception as ex:
        print(f"Error running segmentation: {ex}")
        if isinstance(ex, HTTPException):
            raise ex
        raise HTTPException(status_code=500, detail=str(ex))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

