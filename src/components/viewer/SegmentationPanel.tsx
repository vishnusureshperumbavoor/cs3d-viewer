import React from "react";
import { DicomSegData, SegmentStructure } from "../../services/dicom-seg-service";

type SegmentationPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  segData: DicomSegData | null;
  isLoading: boolean;
  segmentVisibility: Record<number, boolean>;
  onToggleSegmentVisibility: (segNum: number) => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
};

export const SegmentationPanel: React.FC<SegmentationPanelProps> = ({
  isOpen,
  onToggle,
  segData,
  isLoading,
  segmentVisibility,
  onToggleSegmentVisibility,
  opacity,
  onChangeOpacity,
}) => {
  const segments = segData?.segments || [];

  const areAllVisible =
    segments.length > 0 &&
    segments.every((seg) => segmentVisibility[seg.segmentNumber] ?? true);

  const handleToggleAll = (visible: boolean) => {
    segments.forEach((seg) => {
      if ((segmentVisibility[seg.segmentNumber] ?? true) !== visible) {
        onToggleSegmentVisibility(seg.segmentNumber);
      }
    });
  };

  // If closed: show ONLY the arrow icon pointing towards left and the segmentation icon
  if (!isOpen) {
    return (
      <aside className="seg-panel collapsed">
        {/* Left top end arrow pointing towards left */}
        <button
          className="seg-toggle-arrow-btn"
          onClick={onToggle}
          title="Expand segmentation sidebar"
          aria-label="Expand segmentation sidebar"
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

        {/* Segmentation Icon ONLY */}
        <button
          className="seg-collapsed-icon-btn"
          onClick={onToggle}
          title="Segmentation"
          aria-label="Expand segmentation sidebar"
        >
          <span style={{ fontSize: "1.25rem" }}>🧬</span>
        </button>
      </aside>
    );
  }

  // If open: render expanded sidebar with arrow on left top end pointing towards right
  return (
    <aside className="seg-panel expanded">
      <div className="seg-panel-header">
        <div className="seg-header-horizontal-items">
          {/* Arrow icon on left top end pointing towards right */}
          <button
            className="seg-toggle-arrow-btn"
            onClick={onToggle}
            title="Collapse segmentation sidebar"
            aria-label="Collapse segmentation sidebar"
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

          {/* Segmentation Icon ONLY (no text, no number badge) */}
          <span className="seg-header-icon" title="Segmentation">
            🧬
          </span>
        </div>
      </div>

      <div className="seg-panel-body">
        {isLoading ? (
          <div className="seg-loading">
            <div className="loading-spinner small" />
            <span>Loading segmentation data...</span>
          </div>
        ) : !segData || segments.length === 0 ? (
          <div className="seg-empty">
            <p>No segmentation found for this study.</p>
          </div>
        ) : (
          <>
            {/* Opacity Control */}
            <div className="seg-control-card">
              <div className="seg-control-label">
                <span>Overlay Opacity</span>
                <span className="seg-opacity-val">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                className="seg-opacity-slider"
              />
            </div>

            {/* Heading: Segments, with Eye Icon on right for show/hide all */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 2px 0 2px",
              }}
            >
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#cbd5e1",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Segments
              </span>

              <button
                className="seg-action-icon-btn"
                onClick={() => handleToggleAll(!areAllVisible)}
                title={areAllVisible ? "Hide all segments" : "Show all segments"}
                aria-label={areAllVisible ? "Hide all segments" : "Show all segments"}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: areAllVisible ? "#38bdf8" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 6px",
                  borderRadius: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                {areAllVisible ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                )}
              </button>
            </div>

            {/* Segments List */}
            <div className="seg-list">
              {segments.map((seg: SegmentStructure) => {
                const isVisible = segmentVisibility[seg.segmentNumber] ?? true;

                return (
                  <div
                    key={seg.segmentNumber}
                    className={`seg-item-card ${isVisible ? "active" : "hidden"}`}
                    onClick={() => onToggleSegmentVisibility(seg.segmentNumber)}
                  >
                    <div className="seg-item-left">
                      <span
                        className="seg-color-swatch"
                        style={{ backgroundColor: seg.color }}
                      />
                      <div className="seg-item-details">
                        <span className="seg-item-name">{seg.description}</span>
                        <span className="seg-item-meta">
                          {seg.volumeCm3 > 0 ? `${seg.volumeCm3} cm³` : `${seg.voxelCount} voxels`}
                        </span>
                      </div>
                    </div>

                    <button
                      className="seg-visibility-toggle-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSegmentVisibility(seg.segmentNumber);
                      }}
                      title={isVisible ? "Hide segment" : "Show segment"}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: isVisible ? "#38bdf8" : "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4px",
                      }}
                    >
                      {isVisible ? (
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
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
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
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
