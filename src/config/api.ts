/**
 * Application API and Backend Service Configuration.
 * 
 * Configurable via:
 * 1. `process.env.REACT_APP_BACKEND_URL` (for custom domain, reverse proxy, or production environments)
 * 2. Automatic LAN hostname resolution when accessed from remote devices/tablets
 * 3. Default fallback to http://localhost:8000
 */
export const API_BASE_URL: string = (() => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
})();

export const API_ENDPOINTS = {
  SEGMENT: {
    TOTAL: `${API_BASE_URL}/api/segment/total`,
    CANCEL: `${API_BASE_URL}/api/segment/cancel`,
    INSTALLED_MODELS: `${API_BASE_URL}/api/segment/installed-models`,
    LICENSE: `${API_BASE_URL}/api/segment/license`,
    SERIES: (seriesUid: string) => `${API_BASE_URL}/api/segment/series/${encodeURIComponent(seriesUid)}`,
    PUSH_HF: `${API_BASE_URL}/api/segment/push-hf`,
    HF_FILES: (studyFolder?: string) =>
      studyFolder
        ? `${API_BASE_URL}/api/segment/hf-files?study_folder=${encodeURIComponent(studyFolder)}`
        : `${API_BASE_URL}/api/segment/hf-files`,
    DOWNLOAD: (seriesUid: string) => `${API_BASE_URL}/api/segment/download/${encodeURIComponent(seriesUid)}`,
  },
  DATASET: {
    SAMPLE_STATUS: `${API_BASE_URL}/api/dataset/sample-status`,
    IMPORT_SAMPLE_STREAM: `${API_BASE_URL}/api/dataset/import-sample-stream`,
  },
  MONAI: {
    RUN: `${API_BASE_URL}/api/monai/run`,
    CANCEL: `${API_BASE_URL}/api/monai/cancel`,
    INSTALLED_MODELS: `${API_BASE_URL}/api/monai/installed-models`,
    DOWNLOAD: (seriesUid: string) => `${API_BASE_URL}/api/monai/download/${encodeURIComponent(seriesUid)}`,
  },
} as const;
