import dicomParser from "dicom-parser";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import { metaData } from "@cornerstonejs/core";
import { DicomWebInstance } from "../types/dicomweb";

/**
 * Parsed DICOM instance held in memory.
 */
interface LocalInstance {
  /** Blob URL pointing to the raw DICOM bytes */
  blobUrl: string;
  /** Cornerstone imageId (wadouri:<blobUrl>) */
  imageId: string;
  /** Raw ArrayBuffer of the DICOM file */
  arrayBuffer: ArrayBuffer;
  /** Extracted DICOM tags */
  studyInstanceUid: string;
  seriesInstanceUid: string;
  sopInstanceUid: string;
  sopClassUid: string;
  instanceNumber: number;
  numberOfFrames: number;
  seriesDescription: string;
  modality: string;
  seriesNumber: string;
  patientName: string;
  patientId: string;
  patientBirthDate: string;
  patientSex: string;
  bodyPartExamined: string;
  contrastBolusAgent: string;
  studyDescription: string;
  studyDate: string;
  accessionNumber: string;
}

/**
 * Study-level summary for the local worklist.
 */
export interface LocalStudySummary {
  studyInstanceUid: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  studyDescription: string;
  accessionNumber: string;
  modalities: string;
  seriesCount: number;
  instanceCount: number;
}

// ──────────────────────────────────────────────────────────────
// Tag helpers
// ──────────────────────────────────────────────────────────────

function getString(ds: dicomParser.DataSet, tag: string): string {
  try {
    return ds.string(tag) || "";
  } catch {
    return "";
  }
}

function getInt(ds: dicomParser.DataSet, tag: string, fallback: number): number {
  try {
    const val = ds.intString(tag);
    return val !== undefined ? val : fallback;
  } catch {
    return fallback;
  }
}

// ──────────────────────────────────────────────────────────────
// Custom metadata provider for local (wadouri) images
// ──────────────────────────────────────────────────────────────

const localMetadataMap = new Map<string, LocalInstance>();

function localMetadataProvider(type: string, imageId: string) {
  const instance = localMetadataMap.get(imageId);
  if (!instance) return undefined;

  // We don't provide pixel-level metadata here — the wadouri loader handles that
  // from the DICOM file directly. We only supplement series/study-level metadata.
  if (type === "generalSeriesModule") {
    return {
      modality: instance.modality || "CT",
      seriesInstanceUID: instance.seriesInstanceUid,
      seriesNumber: instance.seriesNumber || "1",
    };
  }

  return undefined;
}

// Register once
metaData.addProvider(localMetadataProvider, 9000);

// ──────────────────────────────────────────────────────────────
// LocalDicomStore — singleton
// ──────────────────────────────────────────────────────────────

class LocalDicomStore {
  private instances: LocalInstance[] = [];
  private blobUrls: string[] = [];

  /** Returns true if there are any loaded instances */
  get hasData(): boolean {
    return this.instances.length > 0;
  }

  /**
   * Parse an array of File objects, extracting DICOM metadata and creating
   * wadouri imageIds that Cornerstone can render.
   *
   * Returns the number of successfully parsed DICOM files.
   */
  async addFiles(
    files: File[],
    onProgress?: (parsed: number, total: number) => void
  ): Promise<number> {
    let parsed = 0;
    const total = files.length;

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const byteArray = new Uint8Array(arrayBuffer);
        const ds = dicomParser.parseDicom(byteArray);

        const sopClassUid = getString(ds, "x00080016");
        const sopInstanceUid = getString(ds, "x00080018");
        const seriesInstanceUid = getString(ds, "x0020000e");
        const studyInstanceUid = getString(ds, "x0020000d");

        if (!sopInstanceUid || !seriesInstanceUid || !studyInstanceUid) {
          continue; // Skip non-DICOM or incomplete files
        }

        // Skip if already loaded (dedup by SOP Instance UID)
        if (this.instances.some((i) => i.sopInstanceUid === sopInstanceUid)) {
          parsed++;
          onProgress?.(parsed, total);
          continue;
        }

        // Create a blob URL for the raw DICOM bytes
        const blob = new Blob([arrayBuffer], { type: "application/dicom" });
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrls.push(blobUrl);

        const imageId = `wadouri:${blobUrl}`;

        // Register with cornerstone wadouri loader
        cornerstoneDICOMImageLoader.wadouri.fileManager.add(blob);

        const inst: LocalInstance = {
          blobUrl,
          imageId,
          arrayBuffer,
          studyInstanceUid,
          seriesInstanceUid,
          sopInstanceUid,
          sopClassUid,
          instanceNumber: getInt(ds, "x00200013", Number.MAX_SAFE_INTEGER),
          numberOfFrames: getInt(ds, "x00280008", 1),
          seriesDescription: getString(ds, "x0008103e"),
          modality: getString(ds, "x00080060"),
          seriesNumber: getString(ds, "x00200011"),
          patientName: getString(ds, "x00100010"),
          patientId: getString(ds, "x00100020"),
          patientBirthDate: getString(ds, "x00100030"),
          patientSex: getString(ds, "x00100040"),
          bodyPartExamined: getString(ds, "x00180015"),
          contrastBolusAgent: getString(ds, "x00180010"),
          studyDescription: getString(ds, "x00081030"),
          studyDate: getString(ds, "x00080020"),
          accessionNumber: getString(ds, "x00080050"),
        };

        // Register metadata for this imageId
        localMetadataMap.set(imageId, inst);

        this.instances.push(inst);
        parsed++;
      } catch {
        // Skip files that can't be parsed as DICOM
      }
      onProgress?.(parsed, total);
    }

    return parsed;
  }

  /**
   * Returns study-level summaries for the local worklist.
   */
  getStudies(): LocalStudySummary[] {
    const studyMap = new Map<string, LocalInstance[]>();
    for (const inst of this.instances) {
      if (!studyMap.has(inst.studyInstanceUid)) {
        studyMap.set(inst.studyInstanceUid, []);
      }
      studyMap.get(inst.studyInstanceUid)!.push(inst);
    }

    return Array.from(studyMap.entries()).map(([uid, insts]) => {
      const first = insts[0];
      const seriesUids = new Set(insts.map((i) => i.seriesInstanceUid));
      const modalities = Array.from(new Set(insts.map((i) => i.modality).filter(Boolean)));

      return {
        studyInstanceUid: uid,
        patientName: first.patientName,
        patientId: first.patientId,
        studyDate: first.studyDate,
        studyDescription: first.studyDescription,
        accessionNumber: first.accessionNumber,
        modalities: modalities.join(", ") || "OT",
        seriesCount: seriesUids.size,
        instanceCount: insts.length,
      };
    });
  }

  /**
   * Returns DicomWebInstance[]-shaped data for a specific study,
   * compatible with the existing viewer pipeline.
   */
  getStudyInstances(studyInstanceUid: string): DicomWebInstance[] {
    return this.instances
      .filter((i) => i.studyInstanceUid === studyInstanceUid)
      .map((i) => ({
        studyInstanceUid: i.studyInstanceUid,
        seriesInstanceUid: i.seriesInstanceUid,
        sopInstanceUid: i.sopInstanceUid,
        sopClassUid: i.sopClassUid,
        instanceNumber: i.instanceNumber,
        numberOfFrames: i.numberOfFrames,
        imageId: i.imageId,
        seriesDescription: i.seriesDescription || undefined,
        modality: i.modality || undefined,
        seriesNumber: i.seriesNumber || undefined,
        patientName: i.patientName || undefined,
        patientId: i.patientId || undefined,
        patientBirthDate: i.patientBirthDate || undefined,
        patientSex: i.patientSex || undefined,
        bodyPartExamined: i.bodyPartExamined || undefined,
        contrastBolusAgent: i.contrastBolusAgent || undefined,
        studyDescription: i.studyDescription || undefined,
      }))
      .sort((a, b) => a.instanceNumber - b.instanceNumber);
  }

  /**
   * Get all raw ArrayBuffers for a given study (for uploading to Orthanc).
   */
  getStudyFiles(studyInstanceUid: string): ArrayBuffer[] {
    return this.instances
      .filter((i) => i.studyInstanceUid === studyInstanceUid)
      .map((i) => i.arrayBuffer);
  }

  /**
   * Upload all instances for a study to Orthanc in the background.
   * Returns the number of successfully uploaded instances.
   */
  async uploadToOrthanc(
    studyInstanceUid: string,
    onProgress?: (uploaded: number, total: number) => void
  ): Promise<number> {
    const files = this.instances.filter((i) => i.studyInstanceUid === studyInstanceUid);
    let uploaded = 0;

    for (const inst of files) {
      try {
        const resp = await fetch("/instances", {
          method: "POST",
          headers: {
            "Content-Type": "application/dicom",
            Authorization: "Basic " + btoa("orthanc:orthanc"),
          },
          body: inst.arrayBuffer,
        });
        if (resp.ok) {
          uploaded++;
        }
      } catch {
        // Silently skip failed uploads — Orthanc may not be running
      }
      onProgress?.(uploaded, files.length);
    }

    return uploaded;
  }

  /**
   * Clear all in-memory data and revoke blob URLs.
   */
  clear(): void {
    for (const url of this.blobUrls) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls = [];
    this.instances = [];
    localMetadataMap.clear();
  }
}

/** Singleton instance */
export const localDicomStore = new LocalDicomStore();
