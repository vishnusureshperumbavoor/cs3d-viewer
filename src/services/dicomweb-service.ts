import cornerstoneWADOImageLoader from "@cornerstonejs/dicom-image-loader";
import { metaData } from "@cornerstonejs/core";
import { DicomWebInstance } from "../types/dicomweb";

export const DEFAULT_WADO_BASE = "/dicom-web";

const SOP_CLASS_UID_TAG = "00080016";
const SOP_INSTANCE_UID_TAG = "00080018";
const SERIES_INSTANCE_UID_TAG = "0020000E";
const INSTANCE_NUMBER_TAG = "00200013";
const NUMBER_OF_FRAMES_TAG = "00280008";

const instanceMetadataMap = new Map<string, Record<string, any>>();

const normalizeImageIdKey = (imageId: string): string => {
  const match = imageId.match(/\/studies\/.*/);
  return match ? match[0] : imageId;
};

function customMetadataProvider(type: string, imageId: string) {
  const key = normalizeImageIdKey(imageId);
  const instance = instanceMetadataMap.get(key);
  if (!instance) return undefined;

  if (type === "imagePixelModule") {
    return {
      samplesPerPixel: instance["00280002"]?.Value?.[0] ?? 1,
      photometricInterpretation: instance["00280004"]?.Value?.[0] ?? "MONOCHROME2",
      rows: instance["00280010"]?.Value?.[0],
      columns: instance["00280011"]?.Value?.[0],
      bitsAllocated: instance["00280100"]?.Value?.[0] ?? 16,
      bitsStored: instance["00280101"]?.Value?.[0] ?? 16,
      highBit: instance["00280102"]?.Value?.[0] ?? 15,
      pixelRepresentation: instance["00280103"]?.Value?.[0] ?? 0,
    };
  }

  if (type === "generalSeriesModule") {
    return {
      modality: instance["00080060"]?.Value?.[0] ?? "CT",
      seriesInstanceUID: instance["0020000E"]?.Value?.[0],
      seriesNumber: instance["00200011"]?.Value?.[0] ?? 1,
    };
  }

  if (type === "imagePlaneModule") {
    const rawPos = instance["00200032"]?.Value ?? [0, 0, 0];
    const rawOrient = instance["00200037"]?.Value ?? [1, 0, 0, 0, 1, 0];
    const rawSpacing = instance["00280030"]?.Value ?? [1, 1];

    const imagePositionPatient = [
      Number(rawPos[0]) || 0,
      Number(rawPos[1]) || 0,
      Number(rawPos[2]) || 0,
    ];
    const imageOrientationPatient = [
      Number(rawOrient[0]) || 1,
      Number(rawOrient[1]) || 0,
      Number(rawOrient[2]) || 0,
      Number(rawOrient[3]) || 0,
      Number(rawOrient[4]) || 1,
      Number(rawOrient[5]) || 0,
    ];
    const rowPixelSpacing = Number(rawSpacing[0]) || 1;
    const columnPixelSpacing = Number(rawSpacing[1]) || 1;
    const pixelSpacing = [rowPixelSpacing, columnPixelSpacing];
    const rows = Number(instance["00280010"]?.Value?.[0] ?? 512);
    const columns = Number(instance["00280011"]?.Value?.[0] ?? 512);

    return {
      imagePositionPatient,
      imageOrientationPatient,
      pixelSpacing,
      rowPixelSpacing,
      columnPixelSpacing,
      rows,
      columns,
      rowCosines: [imageOrientationPatient[0], imageOrientationPatient[1], imageOrientationPatient[2]],
      columnCosines: [imageOrientationPatient[3], imageOrientationPatient[4], imageOrientationPatient[5]],
    };
  }

  return undefined;
}

metaData.addProvider(customMetadataProvider, 10000);

const registerWadorsMetadata = (imageId: string, metadata: Record<string, any>) => {
  const key = normalizeImageIdKey(imageId);
  instanceMetadataMap.set(key, metadata);
  try {
    cornerstoneWADOImageLoader.wadors.metaDataManager.add(imageId, metadata);
    cornerstoneWADOImageLoader.wadors.metaDataManager.add(key, metadata);
  } catch (e) {
    // Ignore if internal wadors manager throws
  }
};

const getTagValue = (dataset: Record<string, any>, tag: string): string => {
  const element = dataset[tag];
  const value = element?.Value?.[0];
  if (!value) return "";

  if (element?.vr === "PN" || typeof value === "object") {
    const pn = value as {
      Alphabetic?: string;
      Ideographic?: string;
      Phonetic?: string;
    };
    return pn.Alphabetic || pn.Ideographic || pn.Phonetic || "";
  }

  return String(value);
};

const hasImagePixelModule = (dataset: Record<string, any>): boolean => {
  const samplesPerPixel = dataset["00280002"]?.Value?.[0];
  const rows = dataset["00280010"]?.Value?.[0];
  const columns = dataset["00280011"]?.Value?.[0];
  const bitsAllocated = dataset["00280100"]?.Value?.[0];

  return (
    samplesPerPixel !== undefined &&
    rows !== undefined &&
    columns !== undefined &&
    bitsAllocated !== undefined
  );
};

const isImageStorageSopClass = (sopClassUid: string): boolean => {
  return sopClassUid.startsWith("1.2.840.10008.5.1.4.1.1.");
};

const getInstanceNumber = (dataset: Record<string, any>): number => {
  const rawValue = dataset[INSTANCE_NUMBER_TAG]?.Value?.[0];
  if (rawValue === undefined || rawValue === null) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : Number.MAX_SAFE_INTEGER;
};

const getNumberOfFrames = (dataset: Record<string, any>): number => {
  const rawValue = dataset[NUMBER_OF_FRAMES_TAG]?.Value?.[0];
  if (rawValue === undefined || rawValue === null) {
    return 1;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
};

const buildImageId = (
  baseUrl: string,
  studyInstanceUid: string,
  seriesInstanceUid: string,
  sopInstanceUid: string
): string => {
  const instancePath = `${baseUrl}/studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances/${sopInstanceUid}`;
  return `wadors:${instancePath}/frames/1`;
};

export const fetchStudyInstances = async (
  wadoBaseUrl: string,
  studyInstanceUid: string
): Promise<DicomWebInstance[]> => {
  const baseUrl = wadoBaseUrl.trim().replace(/\/+$/, "");
  const url = `${baseUrl}/studies/${studyInstanceUid}/metadata`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/dicom+json",
      Authorization: "Basic " + btoa("orthanc:orthanc"),
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load study metadata: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as Record<string, any>[];

  return data
    .map((instance) => {
      const seriesInstanceUid = getTagValue(instance, SERIES_INSTANCE_UID_TAG);
      const sopInstanceUid = getTagValue(instance, SOP_INSTANCE_UID_TAG);
      const sopClassUid = getTagValue(instance, SOP_CLASS_UID_TAG);
      const numberOfFrames = getNumberOfFrames(instance);

      if (
        !seriesInstanceUid ||
        !sopInstanceUid ||
        !sopClassUid ||
        !isImageStorageSopClass(sopClassUid) ||
        !hasImagePixelModule(instance)
      ) {
        return null;
      }

      const imageId = buildImageId(
        baseUrl,
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid
      );

      registerWadorsMetadata(imageId, instance);

      const seriesDescription = getTagValue(instance, "0008103E");
      const modality = getTagValue(instance, "00080060");
      const seriesNumber = getTagValue(instance, "00200011");
      const patientName = getTagValue(instance, "00100010");
      const patientId = getTagValue(instance, "00100020");
      const patientBirthDate = getTagValue(instance, "00100030");
      const patientSex = getTagValue(instance, "00100040");

      return {
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        sopClassUid,
        numberOfFrames,
        instanceNumber: getInstanceNumber(instance),
        imageId,
        seriesDescription,
        modality,
        seriesNumber,
        patientName,
        patientId,
        patientBirthDate,
        patientSex,
      } as DicomWebInstance;
    })
    .filter((instance): instance is DicomWebInstance => instance !== null)
    .sort((a, b) => a.instanceNumber - b.instanceNumber);
};
