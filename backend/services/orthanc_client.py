import requests
from typing import Optional, Dict, Any, List
from core.config import ORTHANC_URL, get_orthanc_auth

class OrthancClient:
    def __init__(self, base_url: str = ORTHANC_URL):
        self.base_url = base_url.rstrip("/")

    @property
    def auth(self):
        return get_orthanc_auth()

    def lookup_series_id(self, series_uid: str) -> Optional[str]:
        """Look up Orthanc's internal UUID for a given SeriesInstanceUID."""
        url = f"{self.base_url}/tools/lookup"
        try:
            response = requests.post(url, data=series_uid, auth=self.auth, timeout=10)
            response.raise_for_status()
            results = response.json()
            for item in results:
                if item.get("Type") == "Series":
                    return item.get("ID")
        except Exception as e:
            print(f"[OrthancClient] Error looking up series UID {series_uid}: {e}")
        return None

    def get_series_instance_uid(self, series_id: str) -> Optional[str]:
        """Retrieve the DICOM SeriesInstanceUID for an Orthanc internal ID."""
        url = f"{self.base_url}/series/{series_id}"
        try:
            response = requests.get(url, auth=self.auth, timeout=10)
            response.raise_for_status()
            return response.json().get("MainDicomTags", {}).get("SeriesInstanceUID")
        except Exception as e:
            print(f"[OrthancClient] Error fetching series details {series_id}: {e}")
        return None

    def download_series_archive(self, series_id: str, dest_path: str):
        """Streams series archive ZIP from Orthanc and saves to file."""
        url = f"{self.base_url}/series/{series_id}/archive"
        response = requests.get(url, auth=self.auth, stream=True, timeout=60)
        response.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

    def upload_instance(self, file_content: bytes) -> Dict[str, Any]:
        """Uploads a single DICOM instance to Orthanc."""
        url = f"{self.base_url}/instances"
        response = requests.post(url, data=file_content, auth=self.auth, timeout=15)
        response.raise_for_status()
        return response.json()

    def get_instance_info(self, instance_id: str) -> Dict[str, Any]:
        """Retrieves details of an uploaded instance."""
        url = f"{self.base_url}/instances/{instance_id}"
        response = requests.get(url, auth=self.auth, timeout=10)
        response.raise_for_status()
        return response.json()

    def get_study_info(self, study_id: str) -> Dict[str, Any]:
        """Retrieves details of a study."""
        url = f"{self.base_url}/studies/{study_id}"
        response = requests.get(url, auth=self.auth, timeout=10)
        response.raise_for_status()
        return response.json()

    def list_all_studies(self) -> List[str]:
        """Lists all study UUIDs stored in Orthanc."""
        url = f"{self.base_url}/studies"
        response = requests.get(url, auth=self.auth, timeout=10)
        if response.status_code == 200:
            return response.json()
    def delete_series(self, series_uid: str) -> bool:
        """Deletes a DICOM series from Orthanc by SeriesInstanceUID."""
        series_id = self.lookup_series_id(series_uid)
        if not series_id:
            return False
        url = f"{self.base_url}/series/{series_id}"
        try:
            response = requests.delete(url, auth=self.auth, timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"[OrthancClient] Error deleting series {series_uid} ({series_id}): {e}")
            return False

orthanc_client = OrthancClient()
