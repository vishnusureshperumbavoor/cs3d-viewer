export type QidoStudy = Record<string, any>;

export type WorklistQuery = {
  patientName: string;
  patientId: string;
  limit: string;
};

export type SampleDownloadStage = "idle" | "starting" | "downloading" | "extracting" | "ingesting" | "completed" | "error";

export interface SampleDownloadProgress {
  stage: SampleDownloadStage;
  progress: number; // 0 to 100
  downloadedMb?: number;
  totalMb?: number;
  message?: string;
  studyInstanceUid?: string;
  error?: string;
}

export interface PublicSampleDataset {
  id: string;
  title: string;
  patientId: string;
  patientName: string;
  studyDate: string;
  modality: string;
  sizeLabel: string;
  downloadUrl: string;
  studyInstanceUid?: string | null;
  isImported: boolean;
}
