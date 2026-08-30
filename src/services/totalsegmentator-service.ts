import { parseSeg, extractSegmentationInfo } from "../utils/parse-dicom";

export interface SegmentationResult {
    parsedLabelmaps: any[];
    segStructures: any[];
    segmentVisibility: Record<number, boolean>;
}

export const totalsegmentatorService = {
    /**
     * Triggers TotalSegmentator on FastAPI backend.
     * The backend runs TotalSegmentator, generates the DICOM SEG file,
     * uploads it to Orthanc, and returns the instanceId and seriesInstanceUid.
     */
    run: async (
        studyInstanceUid: string,
        seriesInstanceUid: string,
        task: string = "total",
        fast: boolean = true,
        signal?: AbortSignal
    ): Promise<{ instanceId: string; seriesInstanceUid: string }> => {
        const response = await fetch("http://localhost:8000/api/segment/total", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                studyInstanceUid,
                seriesInstanceUid,
                task,
                fast,
            }),
            signal,
        });

        if (!response.ok) {
            let errText = "Server error running segmentation.";
            try {
                const errData = await response.json();
                errText = errData.detail || errText;
            } catch (e) { }
            throw new Error(errText);
        }

        const data = await response.json();
        return {
            instanceId: data.instanceId,
            seriesInstanceUid: data.seriesInstanceUid,
        };
    },

    /**
     * Cancels an active TotalSegmentator process for a series.
     */
    cancel: async (seriesInstanceUid: string): Promise<boolean> => {
        try {
            const response = await fetch("http://localhost:8000/api/segment/cancel", {
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
            console.warn("Failed to cancel TotalSegmentator process:", e);
            return false;
        }
    },

    /**
     * Fetches the list of TotalSegmentator model tasks that are already downloaded & cached locally.
     */
    getInstalledTasks: async (): Promise<string[]> => {
        try {
            const response = await fetch("http://localhost:8000/api/segment/installed-models");
            if (!response.ok) return [];
            const data = await response.json();
            return data.installedTasks || [];
        } catch (e) {
            console.warn("Failed to fetch installed TotalSegmentator models:", e);
            return [];
        }
    },

    /**
     * Gets current TotalSegmentator license status.
     */
    getLicenseStatus: async (): Promise<{ hasLicense: boolean; licenseMasked?: string; status: string }> => {
        try {
            const response = await fetch("http://localhost:8000/api/segment/license");
            if (!response.ok) return { hasLicense: false, status: "unregistered" };
            return await response.json();
        } catch (e) {
            console.warn("Failed to fetch license status:", e);
            return { hasLicense: false, status: "unregistered" };
        }
    },

    /**
     * Sets / activates TotalSegmentator academic license key.
     */
    setLicense: async (licenseNumber: string, skipValidation: boolean = false): Promise<{ success: boolean; message: string }> => {
        const response = await fetch("http://localhost:8000/api/segment/license", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ licenseNumber, skipValidation }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "Failed to set license.");
        }
        return data;
    },

    /**
     * Removes the active TotalSegmentator license key.
     */
    removeLicense: async (): Promise<boolean> => {
        try {
            const response = await fetch("http://localhost:8000/api/segment/license", {
                method: "DELETE",
            });
            return response.ok;
        } catch (e) {
            console.error("Failed to remove license:", e);
            return false;
        }
    },

    /**
     * Deletes a generated segmentation series from Orthanc backend.
     */
    deleteSegSeries: async (seriesUid: string): Promise<boolean> => {
        try {
            const response = await fetch(`http://localhost:8000/api/segment/series/${encodeURIComponent(seriesUid)}`, {
                method: "DELETE",
            });
            return response.ok;
        } catch (e) {
            console.error("Failed to delete segmentation series:", e);
            return false;
        }
    },

    /**
     * Pushes a generated segmentation series to Hugging Face dataset repo.
     */
    pushSegToHuggingFace: async (seriesUid: string, studyFolder?: string): Promise<{ status: string; url: string; filename: string }> => {
        const response = await fetch("http://localhost:8000/api/segment/push-hf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                seriesInstanceUid: seriesUid,
                studyFolder: studyFolder,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || "Failed to push segmentation to Hugging Face.");
        }

        return await response.json();
    },

    /**
     * Retrieves the list of segmentation files currently uploaded to Hugging Face.
     */
    getHFSegmentations: async (studyFolder?: string): Promise<Array<{ filename: string; path: string; url: string }>> => {
        try {
            const url = studyFolder
                ? `http://localhost:8000/api/segment/hf-files?study_folder=${encodeURIComponent(studyFolder)}`
                : "http://localhost:8000/api/segment/hf-files";
            const response = await fetch(url);
            if (!response.ok) return [];
            const data = await response.json();
            return data.files || [];
        } catch (e) {
            console.warn("Failed to fetch Hugging Face segmentations:", e);
            return [];
        }
    },

    /**
     * Reads, base64 encodes, and parses a local DICOM SEG file uploaded by the user.
     */
    parseFile: async (file: File): Promise<SegmentationResult> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const dataUrl = e.target?.result as string;
                    const parsedLabelmaps = await parseSeg(dataUrl);
                    const dataset = (window as any).lastParsedSegDataset;
                    const info = extractSegmentationInfo(dataset, parsedLabelmaps);

                    const segmentVisibility: Record<number, boolean> = {};
                    info.forEach((s: any) => {
                        segmentVisibility[s.segment_number] = true;
                    });

                    resolve({
                        parsedLabelmaps,
                        segStructures: info,
                        segmentVisibility,
                    });
                } catch (err: any) {
                    reject(new Error(err.message || "Failed to parse manual DICOM SEG."));
                }
            };
            reader.onerror = () => reject(new Error("File reading error."));
            reader.readAsDataURL(file);
        });
    }
};
