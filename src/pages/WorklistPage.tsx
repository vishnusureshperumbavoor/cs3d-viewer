import { useEffect, useState } from "react";
import { WorklistTable } from "../components/worklist";
import { useWorklist } from "../hooks";
import { Logo } from "../components";
import { datasetService } from "../services/dataset-service";
import { getDicomValue } from "../services/qido-service";
import { SampleDownloadProgress } from "../types/worklist";

export default function WorklistPage() {
  const {
    loading,
    error,
    studies,
    refetch,
  } = useWorklist();

  const [sampleProgress, setSampleProgress] = useState<SampleDownloadProgress>({
    stage: "idle",
    progress: 0,
  });
  const [sampleImported, setSampleImported] = useState<boolean>(false);
  const [sampleStudyUid, setSampleStudyUid] = useState<string | null>(null);

  // Check on initial load if the dataset is already present in Orthanc
  useEffect(() => {
    datasetService.checkSampleStatus().then((res) => {
      if (res.exists) {
        setSampleImported(true);
        if (res.studyInstanceUid) {
          setSampleStudyUid(res.studyInstanceUid);
        }
      }
    });
  }, []);

  // Also verify against studies returned by QIDO
  useEffect(() => {
    studies.forEach((study) => {
      const desc = (getDicomValue(study, "00081030") || "").toLowerCase();
      const pName = (getDicomValue(study, "00100010") || "").toLowerCase();
      const pId = (getDicomValue(study, "00100020") || "").toLowerCase();
      const uid = getDicomValue(study, "0020000D");

      if (
        desc.includes("abdomen") ||
        pName.includes("abdomen") ||
        pId.includes("abdomen") ||
        pId.includes("15076")
      ) {
        setSampleImported(true);
        if (uid && uid !== "-") {
          setSampleStudyUid(uid);
        }
      }
    });
  }, [studies]);

  const handleStudyClick = (studyInstanceUid: string) => {
    const query = new URLSearchParams({
      StudyInstanceUIDs: studyInstanceUid,
    });
    window.location.href = `/?${query.toString()}`;
  };

  const handleDownloadSample = async () => {
    setSampleProgress({
      stage: "starting",
      progress: 0,
      message: "Connecting to Hugging Face...",
    });

    try {
      const uid = await datasetService.importSampleStream((p) => {
        setSampleProgress(p);
      });

      if (uid) {
        setSampleImported(true);
        setSampleStudyUid(uid);
      }

      // Refresh Orthanc studies list
      if (typeof refetch === "function") {
        refetch();
      }
    } catch (err: any) {
      setSampleProgress({
        stage: "error",
        progress: 0,
        error: err.message || "Failed to download dataset.",
      });
    }
  };

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="top-nav-inner">
          <a href="/" className="top-nav-brand">
            <div className="brand-icon" aria-hidden="true">
              <Logo />
            </div>
            <h1>VSP Worklist</h1>
          </a>
          <div className={`status-pill ${loading ? "loading" : "ready"}`}>
            <span className="status-dot" />
            {loading ? "Loading Studies" : "Ready"}
          </div>
        </div>
      </nav>

      <main className="worklist-layout">
        <section className="panel-card worklist-results">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ margin: 0 }}>Studies ({studies.length + (sampleImported ? 0 : 1)})</h2>
          </div>
          {error ? <p className="worklist-error">{error}</p> : null}
          <WorklistTable
            studies={studies}
            loading={loading}
            onStudyClick={handleStudyClick}
            sampleStatus={{
              isImported: sampleImported,
              studyInstanceUid: sampleStudyUid,
              progress: sampleProgress,
            }}
            onDownloadSample={handleDownloadSample}
          />
        </section>
      </main>
    </div>
  );
}
