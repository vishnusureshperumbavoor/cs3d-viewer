import React from "react";
import { DicomSegData, SegmentStructure } from "../../services/dicom-seg-service";

type SegmentationPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  segData: DicomSegData | null;
  isLoading: boolean;
  segmentVisibility: Record<number, boolean>;
  onToggleSegmentVisibility: (segNum: number) => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
};

export const SegmentationPanel: React.FC<SegmentationPanelProps> = ({
  isOpen,
  onClose,
  segData,
  isLoading,
  segmentVisibility,
  onToggleSegmentVisibility,
  opacity,
  onChangeOpacity,
}) => {
  if (!isOpen) return null;

  const segments = segData?.segments || [];

  const handleToggleAll = (visible: boolean) => {
    segments.forEach((seg) => {
      if ((segmentVisibility[seg.segmentNumber] ?? true) !== visible) {
        onToggleSegmentVisibility(seg.segmentNumber);
      }
    });
  };

  return (
    <aside className="seg-panel">
      <div className="seg-panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.1rem" }}>🧬</span>
          <h3 style={{ margin: 0, fontSize: "1rem", color: "#ffffff" }}>Segmentation</h3>
          {segments.length > 0 && (
            <span className="seg-count-badge">{segments.length}</span>
          )}
        </div>
        <button
          className="seg-close-btn"
          onClick={onClose}
          title="Close panel"
          aria-label="Close segmentation panel"
        >
          ✕
        </button>
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

            {/* Quick Actions */}
            <div className="seg-quick-actions">
              <button
                className="seg-action-link"
                onClick={() => handleToggleAll(true)}
              >
                Show All
              </button>
              <span>•</span>
              <button
                className="seg-action-link"
                onClick={() => handleToggleAll(false)}
              >
                Hide All
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
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => onToggleSegmentVisibility(seg.segmentNumber)}
                        onClick={(e) => e.stopPropagation()}
                        className="seg-checkbox"
                      />
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
                    >
                      {isVisible ? "👁️" : "👁️‍🗨️"}
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
