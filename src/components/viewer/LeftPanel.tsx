import React, { useState } from "react";
import SeriesThumbnail from "../SeriesThumbnail";
import { DicomSegData } from "../../services/dicom-seg-service";
import { totalsegmentatorService } from "../../services/totalsegmentator-service";

export type SeriesListItem = {
  seriesUid: string;
  instances: any[];
  thumbnailImageId: string;
  seriesDescription: string;
  modality: string;
  instanceCount: number;
};

type LeftPanelProps = {
  isOpen: boolean;
  onToggleOpen: () => void;
  seriesList: SeriesListItem[];
  selectedSeriesUid: string | null;
  activeSegSeriesUid: string | null;
  segDataMap: Record<string, DicomSegData>;
  onSelectSeries: (seriesUid: string) => void;
  onSelectSegSeries: (imageSeriesUid: string, segSeriesUid: string) => void;
  onDeleteSegSeries?: (segSeriesUid: string) => void;
};

export const LeftPanel: React.FC<LeftPanelProps> = ({
  isOpen,
  onToggleOpen,
  seriesList,
  selectedSeriesUid,
  activeSegSeriesUid,
  segDataMap,
  onSelectSeries,
  onSelectSegSeries,
  onDeleteSegSeries,
}) => {
  const [pushingUid, setPushingUid] = useState<string | null>(null);
  const [pushedUids, setPushedUids] = useState<Record<string, string>>({});

  const handlePushToHF = async (segSeriesUid: string) => {
    if (pushingUid) return;
    setPushingUid(segSeriesUid);
    try {
      const res = await totalsegmentatorService.pushSegToHuggingFace(segSeriesUid);
      setPushedUids((prev) => ({ ...prev, [segSeriesUid]: res.url }));
    } catch (err: any) {
      console.error("Push to HF failed:", err);
      alert(err.message || "Failed to push segmentation to Hugging Face.");
    } finally {
      setPushingUid(null);
    }
  };
  if (!isOpen) {
    return (
      <aside className="viewer-sidebar collapsed">
        <button
          className="seg-toggle-arrow-btn"
          onClick={onToggleOpen}
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
          onClick={onToggleOpen}
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
    );
  }

  const imageSeriesList = seriesList.filter((s) => s.modality !== "SEG");
  const loadedSegs = seriesList.filter(
    (s) => s.modality === "SEG" && Boolean(segDataMap[s.seriesUid])
  );

  return (
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
          onClick={onToggleOpen}
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
        {imageSeriesList.map((imageSeries) => {
          const isSelected = selectedSeriesUid === imageSeries.seriesUid;

          return (
            <div key={imageSeries.seriesUid} className="series-group-card">
              {/* Base Image Series Card */}
              <button
                className={`series-card ${isSelected ? "active" : ""}`}
                onClick={() => onSelectSeries(imageSeries.seriesUid)}
                title={`${imageSeries.seriesDescription} (${imageSeries.modality})`}
              >
                <SeriesThumbnail
                  imageId={imageSeries.thumbnailImageId}
                  modality={imageSeries.modality}
                />
                <div className="series-info">
                  <span className="series-desc" title={imageSeries.seriesDescription}>
                    {imageSeries.seriesDescription}
                  </span>
                  <span className="series-count">
                    {imageSeries.instanceCount} images
                  </span>
                </div>
              </button>

              {/* Associated Segmentation Cards */}
              {loadedSegs.map((segSeries) => {
                const isSegSelected = activeSegSeriesUid === segSeries.seriesUid;
                const parsedSeg = segDataMap[segSeries.seriesUid];
                const segTitle =
                  segSeries.seriesDescription ||
                  parsedSeg?.seriesDescription ||
                  "Segmentation";

                const isTotalSeg = Boolean(
                  segSeries.seriesDescription?.toLowerCase().includes("totalsegmentator") ||
                  parsedSeg?.seriesDescription?.toLowerCase().includes("totalsegmentator") ||
                  parsedSeg?.contentLabel?.toUpperCase().startsWith("TS_") ||
                  parsedSeg?.contentDescription?.toLowerCase().includes("totalsegmentator")
                );

                return (
                  <div
                    key={segSeries.seriesUid}
                    className={`series-card seg-series-card ${isSegSelected ? "active" : ""}`}
                    onClick={() => onSelectSegSeries(imageSeries.seriesUid, segSeries.seriesUid)}
                    title={segTitle}
                  >
                    <div className="series-thumbnail-container seg-thumb-container">
                      <span style={{ fontSize: "1.5rem" }} role="img" aria-label="Segmentation">
                        🧬
                      </span>
                      <div className="thumbnail-modality-badge">
                        {segSeries.modality || "SEG"}
                      </div>
                    </div>
                    <div className="series-info">
                      <span className="series-desc" title={segTitle}>
                        {segTitle}
                      </span>
                      <div className="seg-card-sub-row">
                        <span className="series-count">
                          {parsedSeg?.segments.length || 0} Segments
                        </span>
                        <div className="seg-card-action-btns">
                          {isTotalSeg && (
                            <button
                              className={`seg-series-hf-btn ${pushedUids[segSeries.seriesUid] ? "pushed" : ""}`}
                              disabled={pushingUid === segSeries.seriesUid}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (pushedUids[segSeries.seriesUid]) {
                                  window.open(pushedUids[segSeries.seriesUid], "_blank");
                                } else {
                                  handlePushToHF(segSeries.seriesUid);
                                }
                              }}
                              title={
                                pushedUids[segSeries.seriesUid]
                                  ? "Pushed to Hugging Face! Click to open dataset repository"
                                  : `Push ${segTitle} to Hugging Face dataset`
                              }
                              aria-label={`Push ${segTitle} to Hugging Face`}
                            >
                              {pushingUid === segSeries.seriesUid ? (
                                <span className="loading-spinner small" style={{ width: "10px", height: "10px" }} />
                              ) : pushedUids[segSeries.seriesUid] ? (
                                <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>✓</span>
                              ) : (
                                <span style={{ fontSize: "0.85rem" }}>🤗</span>
                              )}
                            </button>
                          )}
                          {onDeleteSegSeries && isTotalSeg && (
                            <button
                              className="seg-series-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete ${segTitle}?`)) {
                                  onDeleteSegSeries(segSeries.seriesUid);
                                }
                              }}
                              title={`Delete ${segTitle}`}
                              aria-label={`Delete ${segTitle}`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
