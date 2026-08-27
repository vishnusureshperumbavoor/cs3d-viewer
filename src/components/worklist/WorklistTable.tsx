import { getDicomValue } from "../../services/qido-service";
import { QidoStudy, SampleDownloadProgress } from "../../types/worklist";

type WorklistTableProps = {
  studies: QidoStudy[];
  loading: boolean;
  onStudyClick: (studyInstanceUid: string) => void;
  sampleStatus: {
    isImported: boolean;
    studyInstanceUid?: string | null;
    progress: SampleDownloadProgress;
  };
  onDownloadSample: () => void;
};

export default function WorklistTable({
  studies,
  loading,
  onStudyClick,
  sampleStatus,
  onDownloadSample,
}: WorklistTableProps) {
  const { isImported, studyInstanceUid: sampleUid, progress } = sampleStatus;
  const isDownloading =
    progress.stage === "starting" ||
    progress.stage === "downloading" ||
    progress.stage === "extracting" ||
    progress.stage === "ingesting";

  return (
    <div className="table-shell">
      <table className="segment-table">
        <thead>
          <tr>
            <th>Patient ID</th>
            <th>Patient Name</th>
            <th>Study Date</th>
            <th>Study UID</th>
            <th>Modalities</th>
            <th style={{ textAlign: "right", paddingRight: "16px" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {/* Featured Hugging Face Public Dataset Row */}
          <tr
            className={`worklist-row sample-row ${isImported ? "imported" : ""}`}
            onClick={() => {
              if (isImported && sampleUid) {
                onStudyClick(sampleUid);
              }
            }}
          >
            <td>04-01-2000-abdomenw-15076</td>
            <td>
              <span style={{ fontWeight: 600, color: "#fff" }}>CT Abdomen (Hugging Face)</span>
            </td>
            <td>2000-04-01</td>
            <td style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
              {sampleUid || "Hugging Face (113 MB)"}
            </td>
            <td>
              <span className="modality-pill">CT</span>
            </td>
            <td style={{ textAlign: "right", paddingRight: "16px" }}>
              {isImported && sampleUid ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span className="ready-badge">✓ Imported</span>
                  <button
                    className="action-btn open-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStudyClick(sampleUid);
                    }}
                  >
                    Open Viewer →
                  </button>
                </div>
              ) : isDownloading ? (
                <div className="download-progress-container" onClick={(e) => e.stopPropagation()}>
                  <div className="download-progress-header">
                    <span className="progress-msg">{progress.message || "Downloading..."}</span>
                    <span className="progress-pct">{progress.progress}%</span>
                  </div>
                  <div className="download-progress-bar">
                    <div
                      className="download-progress-fill"
                      style={{ width: `${Math.max(4, progress.progress)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <button
                    className="icon-download-btn"
                    title="Download dataset (113 MB)"
                    aria-label="Download dataset (113 MB)"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadSample();
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  {progress.stage === "error" && (
                    <span className="progress-error-msg">{progress.error || "Download failed"}</span>
                  )}
                </div>
              )}
            </td>
          </tr>

          {/* Regular Orthanc Studies */}
          {studies.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "28px", color: "var(--muted)" }}>
                {loading ? "Loading studies from Orthanc..." : "No additional studies in Orthanc."}
              </td>
            </tr>
          ) : (
            studies.map((study, index) => {
              const studyInstanceUid = getDicomValue(study, "0020000D");
              // Skip duplicate if it matches the sample study UID
              if (sampleUid && studyInstanceUid === sampleUid) {
                return null;
              }

              return (
                <tr
                  key={`${studyInstanceUid}-${index}`}
                  className="worklist-row"
                  onClick={() => {
                    if (studyInstanceUid !== "-") {
                      onStudyClick(studyInstanceUid);
                    }
                  }}
                >
                  <td>{getDicomValue(study, "00100020")}</td>
                  <td>{getDicomValue(study, "00100010")}</td>
                  <td>{getDicomValue(study, "00080020")}</td>
                  <td style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {studyInstanceUid}
                  </td>
                  <td>
                    <span className="modality-pill">{getDicomValue(study, "00080061")}</span>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: "16px" }}>
                    <button
                      className="action-btn open-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (studyInstanceUid !== "-") {
                          onStudyClick(studyInstanceUid);
                        }
                      }}
                    >
                      Open Viewer →
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
