import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_WADO_BASE,
  fetchStudyInstances,
} from "../services/dicomweb-service";
import { mapInstancesToImageIds } from "../mappers/study-mapper";
import { DicomWebInstance } from "../types/dicomweb";

const getStudyInstanceUidFromUrl = () => {
  const query = new URLSearchParams(window.location.search);
  const value = query.get("StudyInstanceUIDs") || "";
  return value.split(",")[0].trim();
};

export const useStudyImages = () => {
  const studyInstanceUid = useMemo(() => getStudyInstanceUidFromUrl(), []);

  const [imageIds, setImageIds] = useState<string[]>([]);
  const [instances, setInstances] = useState<DicomWebInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studyInstanceUid) {
      setError("StudyInstanceUIDs is missing in URL.");
      return;
    }

    let isCancelled = false;

    const loadStudy = async () => {
      setLoading(true);
      setError(null);

      try {
        const instances = await fetchStudyInstances(DEFAULT_WADO_BASE, studyInstanceUid);
        if (isCancelled) {
          return;
        }

        const ids = mapInstancesToImageIds(instances);
        setImageIds(ids);
        setInstances(instances);

        if (ids.length === 0) {
          setError("No displayable instances found for the selected study.");
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load study images."
          );
          setImageIds([]);
          setInstances([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadStudy();

    return () => {
      isCancelled = true;
    };
  }, [studyInstanceUid]);

  return {
    imageIds,
    instances,
    loading,
    error,
  };
};
