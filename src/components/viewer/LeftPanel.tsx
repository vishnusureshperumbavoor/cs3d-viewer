import React from "react";
import SeriesThumbnail from "../SeriesThumbnail";
import { DicomSegData } from "../../services/dicom-seg-service";

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
  segmentingSeriesUid: string | null;
  onSelectSeries: (seriesUid: string) => void;
  onSelectSegSeries: (imageSeriesUid: string, segSeriesUid: string) => void;
  onRunTotalSegmentator: (seriesUid: string) => void;
};

export const LeftPanel: React.FC<LeftPanelProps> = ({
  isOpen,
  onToggleOpen,
  seriesList,
  selectedSeriesUid,
  activeSegSeriesUid,
  segDataMap,
  segmentingSeriesUid,
  onSelectSeries,
  onSelectSegSeries,
  onRunTotalSegmentator,
}) => {
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
                title={imageSeries.seriesDescription}
              >
                <SeriesThumbnail imageId={imageSeries.thumbnailImageId} />
                <div className="series-info">
                  <span className="series-modality">
                    {imageSeries.modality}
                  </span>
                  <span className="series-desc" title={imageSeries.seriesDescription}>
                    {imageSeries.seriesDescription}
                  </span>
                  <span className="series-count">
                    {imageSeries.instanceCount} images
                  </span>
                </div>
              </button>

              {/* Series-Level AI Actions Row */}
              <div className="series-ai-actions-row">
                <button
                  className="series-ai-btn"
                  disabled={segmentingSeriesUid === imageSeries.seriesUid}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunTotalSegmentator(imageSeries.seriesUid);
                  }}
                  title="Run 3D TotalSegmentator AI on this series"
                >
                  <span>🧠 TotalSegmentator</span>
                  {segmentingSeriesUid === imageSeries.seriesUid && (
                    <span className="loading-spinner small" />
                  )}
                </button>
              </div>

              {/* Associated Segmentation Cards */}
              {loadedSegs.map((segSeries) => {
                const isSegSelected = activeSegSeriesUid === segSeries.seriesUid;
                const parsedSeg = segDataMap[segSeries.seriesUid];

                return (
                  <button
                    key={segSeries.seriesUid}
                    className={`series-card seg-series-card ${isSegSelected ? "active" : ""}`}
                    onClick={() => onSelectSegSeries(imageSeries.seriesUid, segSeries.seriesUid)}
                    title={segSeries.seriesDescription}
                  >
                    <div className="series-thumbnail-container seg-thumb-container">
                      <span style={{ fontSize: "1.85rem" }} role="img" aria-label="Segmentation">
                        🧬
                      </span>
                    </div>
                    <div className="series-info">
                      <span className="series-modality seg-modality-badge">
                        {segSeries.modality}
                      </span>
                      <span className="series-desc" title={segSeries.seriesDescription}>
                        {segSeries.seriesDescription || "Segmentation"}
                      </span>
                      <span className="series-count">
                        {parsedSeg?.segments.length} Segments
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
