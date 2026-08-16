import { parseSeg, extractSegmentationInfo } from "../utils/parse-dicom";

export interface SegmentationResult {
    parsedLabelmaps: any[];
    segStructures: any[];
    segmentVisibility: Record<number, boolean>;
}

export const totalsegmentatorService = {
    /**
     * Triggers TotalSegmentator run on FastAPI, downloads the resulting SEG file from Orthanc,
     * parses it, and maps it to coordinates and structures.
     */
    run: async (studyInstanceUid: string, seriesInstanceUid: string): Promise<SegmentationResult> => {
        const response = await fetch("http://localhost:8000/api/segment/total", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                studyInstanceUid,
                seriesInstanceUid,
            }),
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
        const { instanceId } = data;

        // Download generated SEG
        const fileResponse = await fetch(`/instances/${instanceId}/file`);
        if (!fileResponse.ok) {
            throw new Error("Failed to download generated DICOM SEG from Orthanc.");
        }

        const buffer = await fileResponse.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);
        const dataUrl = `data:application/octet-stream;base64,${base64}`;

        // Parse SEG
        const parsedLabelmaps = await parseSeg(dataUrl);
        const dataset = (window as any).lastParsedSegDataset;
        const info = extractSegmentationInfo(dataset, parsedLabelmaps);

        const segmentVisibility: Record<number, boolean> = {};
        info.forEach((s: any) => {
            segmentVisibility[s.segment_number] = true;
        });

        return {
            parsedLabelmaps,
            segStructures: info,
            segmentVisibility,
        };
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
