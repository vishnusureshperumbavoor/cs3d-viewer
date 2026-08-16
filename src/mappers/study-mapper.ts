import { DicomWebInstance } from "../types/dicomweb";

export const mapInstancesToImageIds = (instances: DicomWebInstance[]): string[] =>
  instances.map((instance) => instance.imageId);
