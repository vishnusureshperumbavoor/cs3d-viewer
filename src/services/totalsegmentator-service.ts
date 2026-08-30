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
     * Downloads the DICOM SEG (.dcm) file for a series from backend / Orthanc.
     */
    downloadSegmentation: async (seriesUid: string, defaultFilename?: string): Promise<void> => {
        try {
            // First try FastAPI backend download endpoint
            const res = await fetch(`http://localhost:8000/api/segment/download/${seriesUid}`);
            if (res.ok) {
                const blob = await res.blob();
                let filename = defaultFilename
                    ? `${defaultFilename.replace(/[^a-zA-Z0-9_-]/g, "_")}.dcm`
                    : `segmentation_${seriesUid.slice(-6)}.dcm`;

                const disposition = res.headers.get("content-disposition");
                if (disposition && disposition.includes("filename=")) {
                    const match = disposition.match(/filename="?([^";]+)"?/);
                    if (match && match[1]) {
                        filename = match[1];
                    }
                }

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                return;
            }
        } catch (e) {
            console.warn("Backend download endpoint failed, trying Orthanc fallback:", e);
        }

        // Fallback: Fetch directly from Orthanc via lookup
        const authHeaders = {
            Authorization: "Basic " + btoa("orthanc:orthanc"),
        };
        const lookupResp = await fetch("/tools/lookup", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
                ...authHeaders,
            },
            body: seriesUid,
        });
        if (!lookupResp.ok) throw new Error("Could not find series in Orthanc.");
        const results = await lookupResp.json();
        const seriesItem = Array.isArray(results) ? results.find((r: any) => r.Type === "Series") : null;
        if (!seriesItem?.ID) throw new Error("Series ID not found.");

        const seriesDetailResp = await fetch(`/series/${seriesItem.ID}`, { headers: authHeaders });
        const seriesDetail = await seriesDetailResp.json();
        const instanceId = seriesDetail.Instances?.[0];
        if (!instanceId) throw new Error("No instances in series.");

        const fileResp = await fetch(`/instances/${instanceId}/file`, { headers: authHeaders });
        if (!fileResp.ok) throw new Error("Failed to download file from Orthanc.");
        const blob = await fileResp.blob();

        const filename = defaultFilename
            ? `${defaultFilename.replace(/[^a-zA-Z0-9_-]/g, "_")}.dcm`
            : `segmentation_${seriesUid.slice(-6)}.dcm`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
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
