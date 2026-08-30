import { SampleDownloadProgress } from "../types/worklist";
import { API_ENDPOINTS } from "../config/api";

export const datasetService = {
  /**
   * Checks if the sample dataset has already been imported into Orthanc
   */
  checkSampleStatus: async (): Promise<{ exists: boolean; studyInstanceUid: string | null }> => {
    try {
      const response = await fetch(API_ENDPOINTS.DATASET.SAMPLE_STATUS);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn("Could not check sample status against backend:", e);
    }
    return { exists: false, studyInstanceUid: null };
  },

  /**
   * Initiates the SSE streaming import and reports progress
   */
  importSampleStream: (
    onProgress: (progress: SampleDownloadProgress) => void
  ): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(API_ENDPOINTS.DATASET.IMPORT_SAMPLE_STREAM);

      eventSource.onmessage = (event) => {
        try {
          const data: SampleDownloadProgress = JSON.parse(event.data);
          onProgress(data);

          if (data.stage === "completed") {
            eventSource.close();
            resolve(data.studyInstanceUid || null);
          } else if (data.stage === "error") {
            eventSource.close();
            reject(new Error(data.error || "Dataset import failed."));
          }
        } catch (err) {
          console.error("Error parsing progress event:", err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        onProgress({
          stage: "error",
          progress: 0,
          error: "Connection lost while downloading dataset.",
          message: "Connection to backend interrupted.",
        });
        reject(new Error("Connection to backend interrupted."));
      };
    });
  },
};
