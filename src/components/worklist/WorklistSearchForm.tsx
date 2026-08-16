import { FormEvent } from "react";

type WorklistSearchFormProps = {
  qidoBaseUrl: string;
  patientName: string;
  patientId: string;
  limit: string;
  loading: boolean;
  onQidoBaseUrlChange: (value: string) => void;
  onPatientNameChange: (value: string) => void;
  onPatientIdChange: (value: string) => void;
  onLimitChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function WorklistSearchForm({
  qidoBaseUrl,
  patientName,
  patientId,
  limit,
  loading,
  onQidoBaseUrlChange,
  onPatientNameChange,
  onPatientIdChange,
  onLimitChange,
  onSubmit,
}: WorklistSearchFormProps) {
  return (
    <form className="worklist-form" onSubmit={onSubmit}>
      <label>
        QIDO Base URL
        <input
          value={qidoBaseUrl}
          onChange={(event) => onQidoBaseUrlChange(event.target.value)}
          placeholder="https://your-server/dicomWeb"
          required
        />
      </label>
      <label>
        Patient Name (optional)
        <input
          value={patientName}
          onChange={(event) => onPatientNameChange(event.target.value)}
          placeholder="DOE^JOHN"
        />
      </label>
      <label>
        Patient ID (optional)
        <input
          value={patientId}
          onChange={(event) => onPatientIdChange(event.target.value)}
          placeholder="PATIENT123"
        />
      </label>
      <label>
        Limit
        <input
          type="number"
          min="1"
          max="200"
          value={limit}
          onChange={(event) => onLimitChange(event.target.value)}
        />
      </label>
      <button className="text-btn worklist-btn" type="submit" disabled={loading}>
        {loading ? "Searching..." : "Search"}
      </button>
    </form>
  );
}
