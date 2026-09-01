import { API_ENDPOINTS } from "../config/api";

export interface MonaiRunResponse {
  status: string;
  instanceId: string;
  seriesInstanceUid: string;
  duration?: string;
  task?: string;
}

export const monaiService = {
  /**
   * Triggers MONAI model inference on FastAPI backend.
   * Generates high-standard DICOM SEG, uploads to Orthanc, and returns seriesInstanceUid.
   */
  run: async (
    studyInstanceUid: string,
    seriesInstanceUid: string,
    task: string = "lung_nodule_ct_detection",
    scoreThreshold: number = 0.20,
    signal?: AbortSignal
  ): Promise<{ instanceId: string; seriesInstanceUid: string }> => {
    const response = await fetch(API_ENDPOINTS.MONAI.RUN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studyInstanceUid,
        seriesInstanceUid,
        task,
        scoreThreshold,
      }),
      signal,
    });

    if (!response.ok) {
      let errText = "Server error running MONAI segmentation.";
      try {
        const errData = await response.json();
        errText = errData.detail || errText;
      } catch (e) {}
      throw new Error(errText);
    }

    const data: MonaiRunResponse = await response.json();
    return {
      instanceId: data.instanceId,
      seriesInstanceUid: data.seriesInstanceUid,
    };
  },

  /**
   * Cancels an active MONAI process for a series.
   */
  cancel: async (seriesInstanceUid: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.MONAI.CANCEL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ seriesInstanceUid }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      return Boolean(data.cancelled);
    } catch (e) {
      console.warn("Failed to cancel MONAI process:", e);
      return false;
    }
  },

  /**
   * Fetches installed/cached MONAI model bundles.
   */
  getInstalledTasks: async (): Promise<string[]> => {
    try {
      const response = await fetch(API_ENDPOINTS.MONAI.INSTALLED_MODELS);
      if (!response.ok) return [];
      const data = await response.json();
      return data.installedTasks || [];
    } catch (e) {
      console.warn("Failed to fetch installed MONAI models:", e);
      return [];
    }
  },
};
