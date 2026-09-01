import { QidoStudy, WorklistQuery } from "../types/worklist";

export const DEFAULT_QIDO_BASE = "/dicom-web";

const formatPersonName = (value: unknown): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const pn = value as {
      Alphabetic?: string;
      Ideographic?: string;
      Phonetic?: string;
    };
    return pn.Alphabetic || pn.Ideographic || pn.Phonetic || "";
  }

  return String(value);
};

const formatSingleValue = (val: unknown, vr?: string): string => {
  if (val === null || val === undefined) {
    return "";
  }

  if (
    vr === "PN" ||
    (typeof val === "object" &&
      val !== null &&
      ("Alphabetic" in val || "Ideographic" in val || "Phonetic" in val))
  ) {
    return formatPersonName(val);
  }

  if (Array.isArray(val)) {
    return val
      .map((v) => formatSingleValue(v, vr))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof val === "object") {
    return JSON.stringify(val);
  }

  const str = String(val).trim();
  // Handle DICOM backslash-separated multi-value strings
  if (str.includes("\\")) {
    return str
      .split("\\")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
  }

  return str;
};

export const getDicomValue = (study: QidoStudy, tag: string): string => {
  const element = study[tag];
  const values = element?.Value;

  if (!Array.isArray(values) || values.length === 0) {
    return "-";
  }

  const formattedValues = values
    .map((v) => formatSingleValue(v, element?.vr))
    .filter((s) => s.length > 0);

  if (formattedValues.length === 0) {
    return "-";
  }

  // Deduplicate entries (e.g. if multiple CT series exist) while preserving order
  const uniqueValues = Array.from(new Set(formattedValues));
  return uniqueValues.join(", ");
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
