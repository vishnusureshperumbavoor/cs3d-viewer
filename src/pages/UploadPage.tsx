import { useState, useRef, useCallback, DragEvent } from "react";
import { Logo } from "../components";
import { localDicomStore, LocalStudySummary } from "../services/local-dicom-store";
import "../styles/local-upload.css";

type OrthancUploadStatus = "idle" | "uploading" | "uploaded" | "failed";

interface StudyUploadState {
  status: OrthancUploadStatus;
  progress: number;
}

export default function UploadPage() {
  const [studies, setStudies] = useState<LocalStudySummary[]>(() => localDicomStore.getStudies());
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState({ parsed: 0, total: 0 });
  const [dragging, setDragging] = useState(false);
  const [orthancStatus, setOrthancStatus] = useState<Record<string, StudyUploadState>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setParsing(true);
    setParseProgress({ parsed: 0, total: files.length });

    await localDicomStore.addFiles(files, (parsed, total) => {
      setParseProgress({ parsed, total });
    });

    const discoveredStudies = localDicomStore.getStudies();
    setStudies(discoveredStudies);
    setParsing(false);

    // Silently upload each new study to Orthanc in the background
    for (const study of discoveredStudies) {
      if (orthancStatus[study.studyInstanceUid]?.status === "uploaded") continue;

      setOrthancStatus((prev) => ({
        ...prev,
        [study.studyInstanceUid]: { status: "uploading", progress: 0 },
      }));

      try {
        await localDicomStore.uploadToOrthanc(study.studyInstanceUid, (uploaded, total) => {
          setOrthancStatus((prev) => ({
            ...prev,
            [study.studyInstanceUid]: {
              status: "uploading",
              progress: total > 0 ? Math.round((uploaded / total) * 100) : 0,
            },
          }));
        });

        setOrthancStatus((prev) => ({
          ...prev,
          [study.studyInstanceUid]: { status: "uploaded", progress: 100 },
        }));
      } catch {
        setOrthancStatus((prev) => ({
          ...prev,
          [study.studyInstanceUid]: { status: "failed", progress: 0 },
        }));
      }
    }
  }, [orthancStatus]);

  const handleStudyClick = (studyInstanceUid: string) => {
    const query = new URLSearchParams({
      StudyInstanceUIDs: studyInstanceUid,
      source: "local",
    });
    window.location.href = `/?${query.toString()}`;
  };

  // ── Drag & Drop handlers ──
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const items = e.dataTransfer.items;
    const files: File[] = [];

    // Recursively collect files from directories
    const readEntry = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => {
          (entry as FileSystemFileEntry).file(resolve);
        });
        files.push(file);
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve) => {
          reader.readEntries(resolve);
        });
        for (const child of entries) {
          await readEntry(child);
        }
      }
    };

    if (items) {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
      for (const entry of entries) {
        await readEntry(entry);
      }
    }

    if (files.length > 0) {
      await handleFiles(files);
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return dateStr || "—";
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  };

  const renderOrthancBadge = (studyUid: string) => {
    const state = orthancStatus[studyUid];
    if (!state || state.status === "idle") return null;

    if (state.status === "uploading") {
      return <span className="orthanc-status uploading">⟳ Syncing {state.progress}%</span>;
    }
    if (state.status === "uploaded") {
      return <span className="orthanc-status uploaded">✓ Synced</span>;
    }
    if (state.status === "failed") {
      return <span className="orthanc-status failed">✗ Offline</span>;
    }
    return null;
  };

  return (
    <div className="app-shell local-upload-page">
      <nav className="top-nav">
        <div className="top-nav-inner">
          <a href="/" className="top-nav-brand">
            <div className="brand-icon" aria-hidden="true">
              <Logo />
            </div>
            <h1>Upload DICOM</h1>
          </a>
          <div className="top-nav-actions">
            <a href="/" className="top-nav-worklist-btn" title="Back to Worklist">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Worklist</span>
            </a>
            <div className="status-pill ready">
              <span className="status-dot" />
              Upload Mode
            </div>
          </div>
        </div>
      </nav>

      <div className="local-upload-content">
        <div className="local-upload-header-row">
          <a href="/" className="local-upload-back">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Worklist
          </a>
        </div>

        <div
          className={`local-upload-card ${dragging ? "dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="local-upload-card-header">
            <h2>Upload DICOM Studies</h2>
            <p className="subtitle">
              Load DICOM files or folders directly from your local system. Files are parsed instantly in the browser and synced with Orthanc for AI segmentation.
            </p>
          </div>

          <div
            className={`local-upload-dropzone ${dragging ? "dragging" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drag and drop DICOM files or folders here, or click to browse"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="dropzone-icon-wrap">
              <svg
                className="drop-icon"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="dropzone-primary-text">
              <strong>Drag & drop</strong> DICOM files or folders here
            </p>
            <p className="dropzone-secondary-text">
              or use the browse buttons below
            </p>
          </div>

          <div className="local-upload-buttons">
            <label className="local-upload-btn">
              <svg
                className="btn-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span>Upload Files</span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".dcm,.dicom,application/dicom"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </label>

            <label className="local-upload-btn">
              <svg
                className="btn-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
              <span>Upload Folder</span>
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore — webkitdirectory is not in the TS types
                webkitdirectory=""
                directory=""
                multiple
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </label>
          </div>

          {parsing && (
            <div className="local-upload-progress">
              <div className="progress-header">
                <span className="progress-label">
                  Parsing {parseProgress.parsed} of {parseProgress.total} files…
                </span>
                <span className="progress-percent">
                  {parseProgress.total > 0
                    ? Math.round((parseProgress.parsed / parseProgress.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${
                      parseProgress.total > 0
                        ? (parseProgress.parsed / parseProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {studies.length > 0 && (
          <section className="panel-card local-worklist">
            <div className="local-worklist-header">
              <h2>
                Loaded Studies
                <span className="count-badge">{studies.length}</span>
              </h2>
              <span className="local-worklist-hint">Click a row to open in 2D / 3D Viewer</span>
            </div>

            <div className="table-shell">
              <table className="segment-table local-worklist-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Patient ID</th>
                    <th>Study Date</th>
                    <th>Description</th>
                    <th>Modality</th>
                    <th>Series</th>
                    <th>Images</th>
                    <th>Orthanc Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {studies.map((study) => (
                    <tr
                      key={study.studyInstanceUid}
                      className="worklist-row"
                      onClick={() => handleStudyClick(study.studyInstanceUid)}
                    >
                      <td>{study.patientName || "—"}</td>
                      <td>{study.patientId || "—"}</td>
                      <td>{formatDate(study.studyDate)}</td>
                      <td>{study.studyDescription || "—"}</td>
                      <td>
                        <span className="modality-pill">{study.modalities}</span>
                      </td>
                      <td>{study.seriesCount}</td>
                      <td>{study.instanceCount}</td>
                      <td>{renderOrthancBadge(study.studyInstanceUid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
