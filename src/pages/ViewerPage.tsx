import { useEffect, useMemo, useState, useRef } from "react";
import {
  CornerstoneViewport,
  SeriesThumbnail,
  Logo,
  PatientHeaderInfo,
  AIToolbar,
  ControlPanel,
  VtkViewer,
} from "../components";
import { WLPresetToolbar } from "../components/viewport/WLPresetToolbar";
import { useStudyImages } from "../hooks";
import { totalsegmentatorService } from "../services/totalsegmentator-service";

export default function ViewerPage() {
  const { instances, error } = useStudyImages();

  const seriesMap = useMemo(() => {
    const map = new Map<string, typeof instances>();
    instances.forEach((instance) => {
      const seriesUid = instance.seriesInstanceUid;
      if (!map.has(seriesUid)) {
        map.set(seriesUid, []);
      }
      map.get(seriesUid)!.push(instance);
    });
    return map;
  }, [instances]);

  const seriesList = useMemo(() => {
    return Array.from(seriesMap.entries()).map(([seriesUid, seriesInstances]) => {
      const sortedInstances = [...seriesInstances].sort(
        (a, b) => a.instanceNumber - b.instanceNumber
      );
      const middleIndex = Math.floor(sortedInstances.length / 2);
      const thumbnailInstance = sortedInstances[middleIndex];

      return {
        seriesUid,
        instances: sortedInstances,
        thumbnailImageId: thumbnailInstance.imageId,
        seriesDescription:
          thumbnailInstance.seriesDescription ||
          `Series ${thumbnailInstance.seriesNumber || ""}`,
        modality: thumbnailInstance.modality || "OT",
        instanceCount: sortedInstances.length,
      };
    });
  }, [seriesMap]);

  const [selectedSeriesUid, setSelectedSeriesUid] = useState<string | null>(null);
  const [isAIActive, setIsAIActive] = useState(false);

  // States for TotalSegmentator and 3D View
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [isSegmentingTotal, setIsSegmentingTotal] = useState(false);
  const [totalSegError, setTotalSegError] = useState<string | null>(null);
  const [segLabelmaps, setSegLabelmaps] = useState<any[] | null>(null);
  const [segStructures, setSegStructures] = useState<any[] | null>(null);
  const [segmentVisibility, setSegmentVisibility] = useState<Record<number, boolean>>({});
  const vtkViewerRef = useRef<any>(null);

  // Set default selected series once seriesList is loaded
  useEffect(() => {
    if (seriesList.length > 0 && !selectedSeriesUid) {
      setSelectedSeriesUid(seriesList[0].seriesUid);
    }
  }, [seriesList, selectedSeriesUid]);

  const activeImageIds = useMemo(() => {
    if (!selectedSeriesUid) return [];
    const activeSeries = seriesList.find((s) => s.seriesUid === selectedSeriesUid);
    return activeSeries ? activeSeries.instances.map((i) => i.imageId) : [];
  }, [selectedSeriesUid, seriesList]);

  const patientDetails = useMemo(() => {
    if (instances.length === 0) return undefined;
    const first = instances[0];
    return {
      patientName: first.patientName,
      patientId: first.patientId,
      patientBirthDate: first.patientBirthDate,
      patientSex: first.patientSex,
      studyInstanceUid: first.studyInstanceUid,
    };
  }, [instances]);

  const handleToggleSegmentVisibility = (segNum: number) => {
    setSegmentVisibility((prev) => ({
      ...prev,
      [segNum]: prev[segNum] === false ? true : false,
    }));
  };

  const handleExportSTL = (segNum: number) => {
    if (vtkViewerRef.current && typeof vtkViewerRef.current.exportSTL === "function") {
      vtkViewerRef.current.exportSTL(segNum);
    }
  };

  const handleSegUpload = async (file: File | null) => {
    if (!file) return;
    setIsSegmentingTotal(true);
    setTotalSegError(null);
    try {
      const result = await totalsegmentatorService.parseFile(file);
      setSegLabelmaps(result.parsedLabelmaps);
      setSegStructures(result.segStructures);
      setSegmentVisibility(result.segmentVisibility);
      setViewMode("3d");
    } catch (err: any) {
      setTotalSegError(err.message || "Failed to parse manual DICOM SEG.");
    } finally {
      setIsSegmentingTotal(false);
    }
  };

  const handleRunTotalSegmentator = async () => {
    if (!selectedSeriesUid) return;
    setIsSegmentingTotal(true);
    setTotalSegError(null);
    try {
      const result = await totalsegmentatorService.run(
        patientDetails?.studyInstanceUid || "",
        selectedSeriesUid
      );
      setSegLabelmaps(result.parsedLabelmaps);
      setSegStructures(result.segStructures);
      setSegmentVisibility(result.segmentVisibility);
      setViewMode("3d");
    } catch (err: any) {
      console.error(err);
      setTotalSegError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSegmentingTotal(false);
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
          </a>

          {patientDetails && (
            <PatientHeaderInfo
              patientName={patientDetails.patientName}
              patientId={patientDetails.patientId}
              patientBirthDate={patientDetails.patientBirthDate}
              patientSex={patientDetails.patientSex}
            />
          )}

          <WLPresetToolbar />

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", gap: "4px", background: "#0f172a", padding: "3px", borderRadius: "8px", border: "1px solid #1e293b" }}>
              <button
                onClick={() => setViewMode("2d")}
                className={`tab-btn-2d ${viewMode === "2d" ? "active" : ""}`}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: viewMode === "2d" ? "var(--accent)" : "transparent",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                2D Stack
              </button>
              <button
                onClick={() => setViewMode("3d")}
                className={`tab-btn-3d ${viewMode === "3d" ? "active" : ""}`}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: viewMode === "3d" ? "var(--accent)" : "transparent",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                3D Seg
              </button>
            </div>

            {viewMode === "2d" && (
              <AIToolbar isAIActive={isAIActive} onToggleAI={setIsAIActive} />
            )}

            <button
              onClick={handleRunTotalSegmentator}
              disabled={isSegmentingTotal || !selectedSeriesUid}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                background: isSegmentingTotal ? "#334155" : "linear-gradient(135deg, #1e3a8a, #3b82f6)",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: isSegmentingTotal ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
            >
              <span>🧠 TotalSegmentator</span>
              {isSegmentingTotal && <span className="loading-spinner small" />}
            </button>
          </div>
        </div>
      </nav>

      <main className="viewer-layout">
        {viewMode === "2d" ? (
          seriesList.length > 0 && (
            <aside className="viewer-sidebar">
              <h2>Series ({seriesList.length})</h2>
              <div className="series-list">
                {seriesList.map((series) => (
                  <button
                    key={series.seriesUid}
                    className={`series-card ${selectedSeriesUid === series.seriesUid ? "active" : ""
                      }`}
                    onClick={() => setSelectedSeriesUid(series.seriesUid)}
                  >
                    <SeriesThumbnail imageId={series.thumbnailImageId} />
                    <div className="series-info">
                      <span className="series-modality">{series.modality}</span>
                      <span className="series-desc" title={series.seriesDescription}>
                        {series.seriesDescription}
                      </span>
                      <span className="series-count">{series.instanceCount} images</span>
                    </div>
                  </button>
                ))}
              </div>
            </aside>
          )
        ) : (
          <ControlPanel
            onSegUpload={handleSegUpload}
            isLoading={isSegmentingTotal}
            segStructures={segStructures}
            segmentVisibility={segmentVisibility}
            onToggleSegmentVisibility={handleToggleSegmentVisibility}
            onExportSTL={handleExportSTL}
          />
        )}

        <section className="viewer-panel" style={{ position: "relative" }}>
          {isSegmentingTotal && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              zIndex: 99
            }}>
              <div className="loading-spinner" style={{ width: "40px", height: "40px", borderWidth: "3px" }} />
              <div style={{ textAlign: "center" }}>
                <h3 style={{ color: "#ffffff", margin: "0 0 8px 0" }}>Running TotalSegmentator...</h3>
                <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
                  Performing whole-body automated segmentation on CPU.<br />
                  This process usually takes 1 to 2 minutes. Please stand by.
                </p>
              </div>
            </div>
          )}

          {totalSegError && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.85)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              zIndex: 99,
              padding: "20px",
              textAlign: "center"
            }}>
              <div style={{ color: "#ef4444", fontSize: "2rem" }}>⚠️</div>
              <h3 style={{ color: "#ef4444", margin: 0 }}>Segmentation Failed</h3>
              <p style={{ color: "#f87171", maxWidth: "500px", margin: 0 }}>{totalSegError}</p>
              <button
                onClick={() => setTotalSegError(null)}
                style={{
                  padding: "8px 16px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="viewer-card">
            {error ? (
              <div className="viewer-empty-state">
                <div>
                  <h3>Unable to Load Study</h3>
                  <p>{error}</p>
                </div>
              </div>
            ) : viewMode === "2d" ? (
              activeImageIds.length === 0 ? (
                <div className="viewer-empty-state">
                  <div>
                    <h3>Preparing Viewer</h3>
                    <p>Loading study metadata and image stack.</p>
                  </div>
                </div>
              ) : (
                <CornerstoneViewport
                  imageIds={activeImageIds}
                  isAIActive={isAIActive}
                />
              )
            ) : (
              <VtkViewer
                ref={vtkViewerRef}
                segLabelmaps={segLabelmaps}
                segmentVisibility={segmentVisibility}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


