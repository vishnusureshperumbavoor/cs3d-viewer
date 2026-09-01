from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import segmentation_router, dataset_router, monai_router, telegram_router

app = FastAPI(
    title="Medical Image Viewer & AI Backend",
    version="1.0.0",
)

# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount modular routers under /api
app.include_router(segmentation_router, prefix="/api")
app.include_router(dataset_router, prefix="/api")
app.include_router(monai_router, prefix="/api")
app.include_router(telegram_router, prefix="/api")

@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
