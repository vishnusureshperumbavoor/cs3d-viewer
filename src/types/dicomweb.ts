export type DicomWebInstance = {
  studyInstanceUid: string;
  seriesInstanceUid: string;
  sopInstanceUid: string;
  sopClassUid: string;
  instanceNumber: number;
  numberOfFrames: number;
  imageId: string;
  seriesDescription?: string;
  modality?: string;
  seriesNumber?: string;
  patientName?: string;
  patientId?: string;
  patientBirthDate?: string;
  patientSex?: string;
  bodyPartExamined?: string;
  contrastBolusAgent?: string;
  studyDescription?: string;
};

