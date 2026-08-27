import dcmjs from "dcmjs";
import { DicomWebInstance } from "../types/dicomweb";

const { DicomMessage, DicomMetaDictionary } = dcmjs.data;

export interface SegmentStructure {
  segmentNumber: number;
  label: string;
  description: string;
  color: string;
  rgba: [number, number, number];
  voxelCount: number;
  volumeCm3: number;
}

export interface DicomSegData {
  sopInstanceUid: string;
  seriesInstanceUid: string;
  segments: SegmentStructure[];
  sliceMaskMap: Map<string, Record<number, Uint8Array>>;
  rows: number;
  columns: number;
  pixelSpacing: [number, number];
  sliceThickness: number;
}

const DEFAULT_SEGMENT_COLORS: Record<number, { hex: string; rgba: [number, number, number] }> = {
  1: { hex: "#10b981", rgba: [16, 185, 129] }, // Kidney - Emerald Green
  2: { hex: "#ef4444", rgba: [239, 68, 68] },  // Renal Tumor - Red
  3: { hex: "#3b82f6", rgba: [59, 130, 246] },  // Blue
  4: { hex: "#f59e0b", rgba: [245, 158, 11] }, // Amber
  5: { hex: "#8b5cf6", rgba: [139, 92, 246] }, // Purple
};

export const dicomSegService = {
  /**
   * Finds the first DICOM SEG instance within a list of study instances.
   */
  findSegInstance: (instances: DicomWebInstance[]): DicomWebInstance | undefined => {
    return instances.find(
      (inst) =>
        inst.modality === "SEG" ||
        inst.sopClassUid === "1.2.840.10008.5.1.4.1.1.66.4"
    );
  },

  /**
   * Finds all DICOM SEG instances within a list of study instances.
   */
  findSegInstances: (instances: DicomWebInstance[]): DicomWebInstance[] => {
    return instances.filter(
      (inst) =>
        inst.modality === "SEG" ||
        inst.sopClassUid === "1.2.840.10008.5.1.4.1.1.66.4"
    );
  },

  /**
   * Fetches the raw DICOM SEG file from Orthanc and parses it into 2D slice masks.
   */
  loadStudySegmentation: async (segInstance: DicomWebInstance): Promise<DicomSegData> => {
    let fileBuffer: ArrayBuffer | null = null;
    const authHeaders = {
      Authorization: "Basic " + btoa("orthanc:orthanc"),
    };

    // 1. Resolve Orthanc internal instance UUID using lookup
    try {
      const lookupResp = await fetch("/tools/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          ...authHeaders,
        },
        body: segInstance.sopInstanceUid,
      });

      if (lookupResp.ok) {
        const results = await lookupResp.json();
        const instanceItem = Array.isArray(results)
          ? results.find((r: any) => r.Type === "Instance")
          : null;

        if (instanceItem?.ID) {
          const fileResp = await fetch(`/instances/${instanceItem.ID}/file`, {
            headers: authHeaders,
          });
          if (fileResp.ok) {
            fileBuffer = await fileResp.arrayBuffer();
          }
        }
      }
    } catch (err) {
      console.warn("Lookup failed, falling back to direct instance route:", err);
    }

    if (!fileBuffer) {
      // Fallback: try fetching by imageId or direct WADO URL
      const directUrl = `/instances/${segInstance.sopInstanceUid}/file`;
      const fallbackResp = await fetch(directUrl, {
        headers: authHeaders,
      });
      if (fallbackResp.ok) {
        fileBuffer = await fallbackResp.arrayBuffer();
      }
    }

    if (!fileBuffer) {
      throw new Error("Unable to fetch DICOM SEG file from Orthanc.");
    }

    // 2. Parse DICOM SEG with dcmjs
    const dcmDict = DicomMessage.readFile(fileBuffer);
    const dataset = DicomMetaDictionary.naturalizeDataset(dcmDict.dict);

    const rows = dataset.Rows || 512;
    const columns = dataset.Columns || 512;
    const numberOfFrames = dataset.NumberOfFrames || 1;

    let pixelSpacing: [number, number] = [1, 1];
    let sliceThickness = 1;

    if (dataset.SharedFunctionalGroupsSequence?.[0]?.PixelMeasuresSequence?.[0]) {
      const measures = dataset.SharedFunctionalGroupsSequence[0].PixelMeasuresSequence[0];
      pixelSpacing = measures.PixelSpacing || [1, 1];
      sliceThickness = measures.SliceThickness || 1;
    }

    // 3. Extract Segment info
    const rawSegments = Array.isArray(dataset.SegmentSequence)
      ? dataset.SegmentSequence
      : dataset.SegmentSequence
        ? [dataset.SegmentSequence]
        : [];

    const segments: SegmentStructure[] = rawSegments.map((s: any, idx: number) => {
      const segNum = s.SegmentNumber !== undefined ? Number(s.SegmentNumber) : idx + 1;
      const label = s.SegmentLabel || `Segment ${segNum}`;
      const description = s.SegmentDescription || label;
      const colorDef = DEFAULT_SEGMENT_COLORS[segNum] || {
        hex: "#06b6d4",
        rgba: [6, 182, 212] as [number, number, number],
      };

      return {
        segmentNumber: segNum,
        label,
        description,
        color: colorDef.hex,
        rgba: colorDef.rgba,
        voxelCount: 0,
        volumeCm3: 0,
      };
    });

    const segmentsByNum = new Map<number, SegmentStructure>();
    segments.forEach((seg) => segmentsByNum.set(seg.segmentNumber, seg));

    // 4. Unpack Frames and Map to CT Slices
    const pixelDataRaw = dataset.PixelData;
    const pixelData: Uint8Array =
      pixelDataRaw instanceof Uint8Array
        ? pixelDataRaw
        : Array.isArray(pixelDataRaw)
          ? new Uint8Array(pixelDataRaw[0])
          : new Uint8Array(pixelDataRaw);

    const framePixelCount = rows * columns;
    const frameByteLength = Math.ceil(framePixelCount / 8);

    const sliceMaskMap = new Map<string, Record<number, Uint8Array>>();
    const pffgList = dataset.PerFrameFunctionalGroupsSequence || [];

    for (let i = 0; i < numberOfFrames && i < pffgList.length; i++) {
      const fg = pffgList[i];
      const sop = fg.DerivationImageSequence?.[0]?.SourceImageSequence?.[0]?.ReferencedSOPInstanceUID;
      const segNum = Number(fg.SegmentIdentificationSequence?.[0]?.ReferencedSegmentNumber || 1);

      if (!sop) continue;

      const frameOffset = i * frameByteLength;

      // Fast check: verify if the frame has any non-zero bytes
      let hasPixels = false;
      for (let b = 0; b < frameByteLength; b++) {
        if (pixelData[frameOffset + b] !== 0) {
          hasPixels = true;
          break;
        }
      }

      if (!hasPixels) continue;

      // Unpack 1-bit little-endian mask into 1-byte per pixel
      const unpacked = new Uint8Array(framePixelCount);
      let activeCount = 0;

      for (let b = 0; b < frameByteLength; b++) {
        const byte = pixelData[frameOffset + b];
        if (byte === 0) continue;

        for (let bit = 0; bit < 8; bit++) {
          if ((byte & (1 << bit)) !== 0) {
            const pxIdx = b * 8 + bit;
            if (pxIdx < framePixelCount) {
              unpacked[pxIdx] = 1;
              activeCount++;
            }
          }
        }
      }

      if (activeCount > 0) {
        if (!sliceMaskMap.has(sop)) {
          sliceMaskMap.set(sop, {});
        }
        sliceMaskMap.get(sop)![segNum] = unpacked;

        const segStruct = segmentsByNum.get(segNum);
        if (segStruct) {
          segStruct.voxelCount += activeCount;
        }
      }
    }

    // 5. Calculate physical volume in cm3 (cm^3 = mm^3 / 1000)
    const voxelVolMm3 = (pixelSpacing[0] || 1) * (pixelSpacing[1] || 1) * (sliceThickness || 1);
    segments.forEach((seg) => {
      seg.volumeCm3 = Number(((seg.voxelCount * voxelVolMm3) / 1000).toFixed(1));
    });

    return {
      sopInstanceUid: segInstance.sopInstanceUid,
      seriesInstanceUid: segInstance.seriesInstanceUid,
      segments,
      sliceMaskMap,
      rows,
      columns,
      pixelSpacing,
      sliceThickness,
    };
  },
};
