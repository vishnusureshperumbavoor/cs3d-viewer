import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_WADO_BASE,
  fetchStudyInstances,
} from "../services/dicomweb-service";
import { mapInstancesToImageIds } from "../mappers/study-mapper";
import { DicomWebInstance } from "../types/dicomweb";
import { localDicomStore } from "../services/local-dicom-store";

const getStudyInstanceUidFromUrl = () => {
  const query = new URLSearchParams(window.location.search);
  const value = query.get("StudyInstanceUIDs") || "";
  return value.split(",")[0].trim();
};

const isLocalSource = () => {
  const query = new URLSearchParams(window.location.search);
  return query.get("source") === "local";
};

export const useStudyImages = () => {
  const studyInstanceUid = useMemo(() => getStudyInstanceUidFromUrl(), []);
  const isLocal = useMemo(() => isLocalSource(), []);

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
        let loadedInstances: DicomWebInstance[];

        if (isLocal) {
          // Read from in-memory local store
          loadedInstances = localDicomStore.getStudyInstances(studyInstanceUid);
          if (loadedInstances.length === 0) {
            throw new Error(
              "No local DICOM data found. The data may have been lost after a page refresh. " +
              "Please go back to /upload and re-upload your files."
            );
          }
        } else {
          // Fetch from Orthanc via DICOMweb
          loadedInstances = await fetchStudyInstances(DEFAULT_WADO_BASE, studyInstanceUid);
        }

        if (isCancelled) return;

        const ids = mapInstancesToImageIds(loadedInstances);
        setImageIds(ids);
        setInstances(loadedInstances);

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
  }, [studyInstanceUid, isLocal]);

  const refetch = async () => {
    if (!studyInstanceUid) return;
    try {
      let updatedInstances: DicomWebInstance[];
      if (isLocal) {
        updatedInstances = localDicomStore.getStudyInstances(studyInstanceUid);
      } else {
        updatedInstances = await fetchStudyInstances(DEFAULT_WADO_BASE, studyInstanceUid);
      }
      const ids = mapInstancesToImageIds(updatedInstances);
      setImageIds(ids);
      setInstances(updatedInstances);
    } catch (_) { }
  };

  return {
    imageIds,
    instances,
    loading,
    error,
    refetch,
  };
};

