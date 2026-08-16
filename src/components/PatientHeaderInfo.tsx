import React from "react";

type PatientHeaderInfoProps = {
  patientName?: string;
  patientId?: string;
  patientBirthDate?: string;
  patientSex?: string;
};

export default function PatientHeaderInfo({
  patientName,
  patientId,
  patientBirthDate,
  patientSex,
}: PatientHeaderInfoProps) {
  if (!patientName && !patientId) return null;

  const formattedName = patientName
    ? patientName.replace(/\^/g, " ").trim()
    : "Unknown Patient";

  const formatBirthDate = (dob?: string) => {
    if (!dob || dob.length !== 8) return dob || "N/A";
    const year = dob.substring(0, 4);
    const month = dob.substring(4, 6);
    const day = dob.substring(6, 8);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${months[mIdx]} ${parseInt(day, 10)}, ${year}`;
    }
    return `${year}-${month}-${day}`;
  };

  const formatSex = (sex?: string) => {
    if (sex === "M") return "Male";
    if (sex === "F") return "Female";
    if (sex === "O") return "Other";
    return sex || "N/A";
  };

  return (
    <div className="patient-header-info">
      <div className="patient-detail-group">
        <span className="patient-detail-label">PATIENT</span>
        <span className="patient-detail-value name" title={formattedName}>
          {formattedName}
        </span>
      </div>
      <div className="patient-detail-divider" aria-hidden="true" />
      <div className="patient-detail-group">
        <span className="patient-detail-label">ID</span>
        <span className="patient-detail-value" title={patientId}>
          {patientId || "N/A"}
        </span>
      </div>
      <div className="patient-detail-divider" aria-hidden="true" />
      <div className="patient-detail-group">
        <span className="patient-detail-label">DOB</span>
        <span className="patient-detail-value">
          {formatBirthDate(patientBirthDate)}
        </span>
      </div>
      <div className="patient-detail-divider" aria-hidden="true" />
      <div className="patient-detail-group">
        <span className="patient-detail-label">SEX</span>
        <span className="patient-detail-value">
          {formatSex(patientSex)}
        </span>
      </div>
    </div>
  );
}
