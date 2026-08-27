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

// 40 distinct high-contrast medical palette colors for organ & bone segmentations
const DISTINCT_PALETTE: Array<{ hex: string; rgba: [number, number, number] }> = [
  { hex: "#10b981", rgba: [16, 185, 129] },  // Emerald Green (Kidney / Liver)
  { hex: "#ef4444", rgba: [239, 68, 68] },   // Red / Crimson (Tumor / Heart)
  { hex: "#3b82f6", rgba: [59, 130, 246] },  // Blue (Vessels / Spleen)
  { hex: "#f59e0b", rgba: [245, 158, 11] },  // Amber (Pancreas)
  { hex: "#8b5cf6", rgba: [139, 92, 246] },  // Purple (Gallbladder)
  { hex: "#06b6d4", rgba: [6, 182, 212] },   // Cyan (Lungs)
  { hex: "#ec4899", rgba: [236, 72, 153] },  // Pink (Stomach)
  { hex: "#eab308", rgba: [234, 179, 8] },   // Yellow (Duodenum)
  { hex: "#14b8a6", rgba: [20, 184, 166] },  // Teal (Small Bowel)
  { hex: "#f97316", rgba: [249, 115, 22] },  // Orange (Colon)
  { hex: "#6366f1", rgba: [99, 102, 241] },  // Indigo (Bladder)
  { hex: "#84cc16", rgba: [132, 204, 22] },  // Lime (Prostate / Uterus)
  { hex: "#a855f7", rgba: [168, 85, 247] },  // Bright Purple (Thyroid)
  { hex: "#d946ef", rgba: [217, 70, 239] },  // Magenta (Trachea)
  { hex: "#0ea5e9", rgba: [14, 165, 233] },  // Sky Blue (Aorta)
  { hex: "#22c55e", rgba: [34, 197, 94] },   // Light Green (IVC)
  { hex: "#fb7185", rgba: [251, 113, 133] }, // Coral (Portal Vein)
  { hex: "#38bdf8", rgba: [56, 189, 248] },  // Light Cyan (Pulmonary Artery)
  { hex: "#f43f5e", rgba: [244, 63, 94] },   // Rose (Vertebrae)
  { hex: "#fbbf24", rgba: [251, 191, 36] },  // Gold (Ribs)
  { hex: "#4ade80", rgba: [74, 222, 128] },  // Mint (Pelvis)
  { hex: "#c084fc", rgba: [192, 132, 252] }, // Lavender (Femurs)
  { hex: "#f472b6", rgba: [244, 114, 182] }, // Blossom (Muscles)
  { hex: "#2dd4bf", rgba: [45, 212, 191] },  // Aquamarine (Psoas)
  { hex: "#a3e635", rgba: [163, 230, 53] },  // Chartreuse
  { hex: "#e879f9", rgba: [232, 121, 249] }, // Fuchsia
  { hex: "#facc15", rgba: [250, 204, 21] },  // Sunflower
  { hex: "#34d399", rgba: [52, 211, 153] },  // Sea Green
  { hex: "#818cf8", rgba: [129, 140, 248] }, // Periwinkle
  { hex: "#fb923c", rgba: [251, 146, 60] },  // Tangerine
  { hex: "#38ef7d", rgba: [56, 239, 125] },  // Spring
  { hex: "#11998e", rgba: [17, 153, 142] },  // Emerald Dark
  { hex: "#ff6b6b", rgba: [255, 107, 107] }, // Salmon Red
  { hex: "#4ecdc4", rgba: [78, 205, 196] },  // Robin Egg
  { hex: "#45b649", rgba: [69, 182, 73] },   // Leaf Green
  { hex: "#d4fc79", rgba: [212, 252, 121] }, // Electric Lime
  { hex: "#96e6a1", rgba: [150, 230, 161] }, // Soft Jade
  { hex: "#845ec2", rgba: [132, 94, 194] },  // Deep Purple
  { hex: "#ff9671", rgba: [255, 150, 113] }, // Peach
  { hex: "#ffc75f", rgba: [255, 199, 95] },  // Golden Sand
];

function hslToRgb(h: number, s: number, l: number): { hex: string; rgba: [number, number, number] } {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  return { hex, rgba: [r, g, b] };
}

export function getSegmentColor(segNum: number): { hex: string; rgba: [number, number, number] } {
  const index = (segNum - 1) % DISTINCT_PALETTE.length;
  const cycle = Math.floor((segNum - 1) / DISTINCT_PALETTE.length);
  if (cycle === 0 && DISTINCT_PALETTE[index]) {
    return DISTINCT_PALETTE[index];
  }
  // Golden ratio HSL generation for seamless distinct color looping
  const goldenHue = (segNum * 137.508) % 360;
  return hslToRgb(goldenHue, 75, 55);
}

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
      const colorDef = getSegmentColor(segNum);

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
