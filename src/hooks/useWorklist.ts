import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_QIDO_BASE, fetchStudies } from "../services/qido-service";
import { QidoStudy } from "../types/worklist";

export const useWorklist = () => {
  const [qidoBaseUrl, setQidoBaseUrl] = useState(DEFAULT_QIDO_BASE);
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [limit, setLimit] = useState("25");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studies, setStudies] = useState<QidoStudy[]>([]);
  const hasAutoSearched = useRef(false);

  const performSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchStudies(qidoBaseUrl, {
        patientName,
        patientId,
        limit,
      });
      console.log("Worklist data", data)
      setStudies(data);
    } catch (searchError) {
      setStudies([]);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Failed to load worklist."
      );
    } finally {
      setLoading(false);
    }
  }, [limit, patientId, patientName, qidoBaseUrl]);

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await performSearch();
  };

  useEffect(() => {
    if (hasAutoSearched.current) {
      return;
    }
    hasAutoSearched.current = true;
    void performSearch();
  }, [performSearch]);

  return {
    qidoBaseUrl,
    setQidoBaseUrl,
    patientName,
    setPatientName,
    patientId,
    setPatientId,
    limit,
    setLimit,
    loading,
    error,
    studies,
    handleSearchSubmit,
    refetch: performSearch,
  };
};
