"""Backwards compatibility shim for legacy imports."""
from services.segmentator import run_segmentation_pipeline
from core.config import ORTHANC_URL, get_orthanc_auth

__all__ = ["run_segmentation_pipeline", "ORTHANC_URL", "get_orthanc_auth"]
