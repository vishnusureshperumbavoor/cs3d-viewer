import os

ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USER = os.getenv("ORTHANC_USER", "orthanc")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD", "orthanc")

SAMPLE_DATASET_URL = (
    "https://huggingface.co/datasets/vishnusureshperumbavoor/dicom_public_dataset/"
    "resolve/main/04-01-2000-abdomenw-15076.zip?download=true"
)
SAMPLE_DATASET_NAME = "04-01-2000-abdomenw-15076"

def get_orthanc_auth():
    """Returns basic auth tuple for Orthanc if credentials are provided."""
    if ORTHANC_USER and ORTHANC_PASSWORD:
        return (ORTHANC_USER, ORTHANC_PASSWORD)
    return None
