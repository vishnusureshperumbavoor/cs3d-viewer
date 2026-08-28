import os

ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USER = os.getenv("ORTHANC_USER", "orthanc")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD", "orthanc")

HF_REPO_ID = os.getenv("HF_REPO_ID", "vishnusureshperumbavoor/dicom_public_dataset")
HF_STUDY_FOLDER = os.getenv("HF_STUDY_FOLDER", "04-01-2000-abdomenw-15076")
SAMPLE_DATASET_NAME = "04-01-2000-abdomenw-15076"

def get_orthanc_auth():
    """Returns basic auth tuple for Orthanc if credentials are provided."""
    if ORTHANC_USER and ORTHANC_PASSWORD:
        return (ORTHANC_USER, ORTHANC_PASSWORD)
    return None
