import { QidoStudy, WorklistQuery } from "../types/worklist";

export const DEFAULT_QIDO_BASE = "/dicom-web";

const formatPersonName = (value: unknown): string => {
  if (!value) {
    return "-";
  }

  if (typeof value === "string") {
    return value || "-";
  }

  if (typeof value === "object") {
    const pn = value as {
      Alphabetic?: string;
      Ideographic?: string;
      Phonetic?: string;
    };
    return pn.Alphabetic || pn.Ideographic || pn.Phonetic || "-";
  }

  return String(value);
};

export const getDicomValue = (study: QidoStudy, tag: string): string => {
  const element = study[tag];
  const values = element?.Value;

  if (!Array.isArray(values) || values.length === 0) {
    return "-";
  }

  const firstValue = values[0];

  if (element?.vr === "PN") {
    return formatPersonName(firstValue);
  }

  if (Array.isArray(firstValue)) {
    return firstValue.join(", ") || "-";
  }

  if (typeof firstValue === "object" && firstValue !== null) {
    return JSON.stringify(firstValue);
  }

  return String(firstValue);
};

export const fetchStudies = async (
  qidoBaseUrl: string,
  query: WorklistQuery,
): Promise<QidoStudy[]> => {
  const baseUrl = qidoBaseUrl.trim().replace(/\/+$/, "");
  const params = new URLSearchParams();

  if (query.patientName.trim()) {
    params.set("PatientName", query.patientName.trim());
  }

  if (query.patientId.trim()) {
    params.set("PatientID", query.patientId.trim());
  }

  if (query.limit.trim()) {
    params.set("limit", query.limit.trim());
  }

  const queryString = params.toString();
  const qidoUrl = `${baseUrl}/studies${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(qidoUrl, {
    headers: {
      Accept: "application/dicom+json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `QIDO request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data: QidoStudy[] = await response.json();
  return Array.isArray(data) ? data : [];
};
