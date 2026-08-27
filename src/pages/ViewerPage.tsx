import { useEffect, useMemo, useState } from "react";
import {
  CornerstoneViewport,
  SeriesThumbnail,
  Logo,
  PatientHeaderInfo,
  AIToolbar,
  SegmentationPanel,
} from "../components";
import { WLPresetToolbar } from "../components/viewport/WLPresetToolbar";
import { MPRViewer, resetMPRCameras } from "../components/viewport/MPRViewer";
import { useStudyImages } from "../hooks";
import { totalsegmentatorService } from "../services/totalsegmentator-service";
import { dicomSegService, DicomSegData } from "../services/dicom-seg-service";

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
    return Array.from(seriesMap.entries())
      .map(([seriesUid, seriesInstances]) => {
        const sortedInstances = [...seriesInstances].sort(
          (a, b) => a.instanceNumber - b.instanceNumber
        );
        const middleIndex = Math.floor(sortedInstances.length / 2);
        const thumbnailInstance = sortedInstances[middleIndex] || sortedInstances[0];

        return {
          seriesUid,
          instances: sortedInstances,
          thumbnailImageId: thumbnailInstance.imageId,
          seriesDescription:
            thumbnailInstance.seriesDescription ||
            (thumbnailInstance.modality === "SEG"
              ? "Segmentation"
              : `Series ${thumbnailInstance.seriesNumber || ""}`),
          modality: thumbnailInstance.modality || "OT",
          instanceCount: sortedInstances.length,
        };
      })
      .sort((a, b) => {
        if (a.modality === "SEG" && b.modality !== "SEG") return 1;
        if (a.modality !== "SEG" && b.modality === "SEG") return -1;
        return 0;
      });
  }, [seriesMap]);

  const [selectedSeriesUid, setSelectedSeriesUid] = useState<string | null>(null);
  const [isAIActive, setIsAIActive] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);

  // Auto-detected DICOM SEG state
  const segInstance = useMemo(() => dicomSegService.findSegInstance(instances), [instances]);
  const [segData, setSegData] = useState<DicomSegData | null>(null);
  const [isLoadingSeg, setIsLoadingSeg] = useState(false);
  const [isSegPanelOpen, setIsSegPanelOpen] = useState(true);
  const [segmentOpacity, setSegmentOpacity] = useState(0.5);
  const [segVisibility, setSegVisibility] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!segInstance) return;

    let isCancelled = false;
    setIsLoadingSeg(true);

    dicomSegService
      .loadStudySegmentation(segInstance)
      .then((data) => {
        if (!isCancelled) {
          setSegData(data);
          const initialVis: Record<number, boolean> = {};
          data.segments.forEach((s) => {
            initialVis[s.segmentNumber] = true;
          });
          setSegVisibility(initialVis);
          setIsSegPanelOpen(true);
        }
      })
      .catch((err) => {
        console.warn("Failed to load study segmentation:", err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingSeg(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [segInstance]);

  // States for TotalSegmentator and 3D View
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [active3DPreset, setActive3DPreset] = useState<string>("CT-AAA");
  const [activeRightSidebarTab, setActiveRightSidebarTab] = useState<"segmentation" | "presets">("segmentation");

  useEffect(() => {
    if (viewMode === "3d") {
      setActiveRightSidebarTab("presets");
    } else {
      setActiveRightSidebarTab("segmentation");
    }
  }, [viewMode]);

  const [isSegmentingTotal, setIsSegmentingTotal] = useState(false);
  const [totalSegError, setTotalSegError] = useState<string | null>(null);
  const [_segLabelmaps, setSegLabelmaps] = useState<any[] | null>(null);
  const [_segStructures, setSegStructures] = useState<any[] | null>(null);

  // Set default selected series once seriesList is loaded (pick first non-SEG image series)
  useEffect(() => {
    if (seriesList.length > 0 && !selectedSeriesUid) {
      const defaultSeries = seriesList.find((s) => s.modality !== "SEG") || seriesList[0];
      setSelectedSeriesUid(defaultSeries.seriesUid);
    }
  }, [seriesList, selectedSeriesUid]);

  const activeImageIds = useMemo(() => {
    if (!selectedSeriesUid) return [];
    // Ensure viewport displays CT stack even when clicking SEG series card
    const activeSeries =
      seriesList.find((s) => s.seriesUid === selectedSeriesUid && s.modality !== "SEG") ||
      seriesList.find((s) => s.modality !== "SEG");
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
      setSegVisibility(result.segmentVisibility);
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
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              height: "42px",
              boxSizing: "border-box",
              background: "rgba(20, 20, 20, 0.7)",
              padding: "4px",
              borderRadius: "8px",
              border: "1px solid var(--border)"
            }}>
              <button
                onClick={() => setViewMode("2d")}
                className={`tab-btn-2d ${viewMode === "2d" ? "active" : ""}`}
                title="2D Slice View"
                aria-label="2D View"
                style={{
                  height: "32px",
                  padding: "0 10px",
                  borderRadius: "6px",
                  background: viewMode === "2d" ? "rgba(255, 255, 255, 0.16)" : "transparent",
                  color: viewMode === "2d" ? "#ffffff" : "#94a3b8",
                  border: viewMode === "2d" ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                  <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
                  <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("3d")}
                className={`tab-btn-3d ${viewMode === "3d" ? "active" : ""}`}
                title="3D Volume View"
                aria-label="3D View"
                style={{
                  height: "32px",
                  padding: "0 10px",
                  borderRadius: "6px",
                  background: viewMode === "3d" ? "rgba(255, 255, 255, 0.16)" : "transparent",
                  color: viewMode === "3d" ? "#ffffff" : "#94a3b8",
                  border: viewMode === "3d" ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.12 6.4-6-3.46a4 4 0 0 0-3.94 0L4.88 6.4A4 4 0 0 0 3 9.87v6.26a4 4 0 0 0 1.88 3.47l6.3 3.63a4 4 0 0 0 3.94 0l6-3.46a4 4 0 0 0 2-3.47V9.87a4 4 0 0 0-2.06-3.47Z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </button>
            </div>

            <AIToolbar
              isAIActive={isAIActive}
              onToggleAI={(active) => {
                if (active && viewMode !== "2d") {
                  setViewMode("2d");
                }
                setIsAIActive(active);
              }}
            />

            <button
              onClick={handleRunTotalSegmentator}
              disabled={isSegmentingTotal || !selectedSeriesUid}
              style={{
                height: "42px",
                boxSizing: "border-box",
                padding: "0 16px",
                borderRadius: "8px",
                background: isSegmentingTotal
                  ? "rgba(30, 30, 30, 0.5)"
                  : "rgba(20, 20, 20, 0.7)",
                color: isSegmentingTotal ? "#64748b" : "#f1f5f9",
                border: isSegmentingTotal
                  ? "1px solid rgba(255, 255, 255, 0.08)"
                  : "1px solid var(--border)",
                fontWeight: 600,
                fontSize: "0.83rem",
                cursor: isSegmentingTotal ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (!isSegmentingTotal && selectedSeriesUid) {
                  e.currentTarget.style.background = "rgba(40, 40, 40, 0.95)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.35)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSegmentingTotal && selectedSeriesUid) {
                  e.currentTarget.style.background = "rgba(20, 20, 20, 0.7)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }
              }}
            >
              <span>🧠 TotalSegmentator</span>
              {isSegmentingTotal && <span className="loading-spinner small" />}
            </button>
          </div>
        </div>
      </nav>

      <main
        className={`viewer-layout ${isLeftSidebarOpen ? "left-open" : "left-collapsed"} ${
          segData || viewMode === "3d"
            ? isSegPanelOpen
              ? "with-seg-panel"
              : "with-seg-collapsed"
            : ""
        }`}
      >
        {seriesList.length > 0 &&
          (isLeftSidebarOpen ? (
            <aside className="viewer-sidebar expanded">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "8px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                  Series ({seriesList.length})
                </h2>
                <button
                  className="seg-toggle-arrow-btn"
                  onClick={() => setIsLeftSidebarOpen(false)}
                  title="Collapse series sidebar"
                  aria-label="Collapse series sidebar"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              </div>

              <div className="series-list">
                {seriesList.map((series) => {
                  const isSegSeries = series.modality === "SEG";
                  const isSelected = selectedSeriesUid === series.seriesUid;

                  return (
                    <button
                      key={series.seriesUid}
                      className={`series-card ${isSegSeries ? "seg-series-card" : ""} ${
                        isSelected ? "active" : ""
                      }`}
                      onClick={() => {
                        setSelectedSeriesUid(series.seriesUid);
                      }}
                      title={series.seriesDescription}
                    >
                      {isSegSeries ? (
                        <div className="series-thumbnail-container seg-thumb-container">
                          <span style={{ fontSize: "1.85rem" }} role="img" aria-label="Segmentation">
                            🧬
                          </span>
                        </div>
                      ) : (
                        <SeriesThumbnail imageId={series.thumbnailImageId} />
                      )}

                      <div className="series-info">
                        <span className={`series-modality ${isSegSeries ? "seg-modality-badge" : ""}`}>
                          {series.modality}
                        </span>
                        <span className="series-desc" title={series.seriesDescription}>
                          {isSegSeries ? "Segmentation" : series.seriesDescription}
                        </span>
                        <span className="series-count">
                          {isSegSeries
                            ? `${segData?.segments.length || 2} Segments`
                            : `${series.instanceCount} images`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          ) : (
            <aside className="viewer-sidebar collapsed">
              <button
                className="seg-toggle-arrow-btn"
                onClick={() => setIsLeftSidebarOpen(true)}
                title="Expand series sidebar"
                aria-label="Expand series sidebar"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <button
                className="sidebar-collapsed-icon-btn"
                onClick={() => setIsLeftSidebarOpen(true)}
                title={`Series (${seriesList.length})`}
                aria-label="Expand series sidebar"
                style={{ color: "#94a3b8" }}
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
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                </svg>
              </button>
            </aside>
          ))}

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
                  segData={segData}
                  segmentVisibility={segVisibility}
                  segmentOpacity={segmentOpacity}
                />
              )
            ) : (
              <MPRViewer
                imageIds={activeImageIds}
                seriesUid={selectedSeriesUid}
                active3DPreset={active3DPreset}
              />
            )}
          </div>
        </section>

        {(segData || viewMode === "3d") && (
          <SegmentationPanel
            isOpen={isSegPanelOpen}
            onToggle={() => setIsSegPanelOpen((prev) => !prev)}
            segData={segData}
            isLoading={isLoadingSeg}
            segmentVisibility={segVisibility}
            onToggleSegmentVisibility={(segNum) =>
              setSegVisibility((prev) => ({
                ...prev,
                [segNum]: !(prev[segNum] ?? true),
              }))
            }
            opacity={segmentOpacity}
            onChangeOpacity={setSegmentOpacity}
            activeTab={activeRightSidebarTab}
            onChangeTab={setActiveRightSidebarTab}
            active3DPreset={active3DPreset}
            onSelect3DPreset={setActive3DPreset}
            onResetCameras={resetMPRCameras}
          />
        )}
      </main>
    </div>
  );
}


