import React from "react";
import { DicomSegData, SegmentStructure } from "../../services/dicom-seg-service";
import { renderPresetIcon } from "./PresetIcons";
import { TotalSegmentatorTab } from "./TotalSegmentatorTab";

export const VOLUME_PRESETS = [
  {
    id: "CT-Segmentation-Only",
    label: "3D Seg Only",
    desc: "Isolated 3D organ & tumor surface meshes (pure 3D model)",
  },
  {
    id: "CT-Ghost-Body",
    label: "Transparent Body",
    desc: "Semi-transparent body envelope with 3D organ meshes inside",
  },
  {
    id: "CT-Bone",
    label: "Bone",
    desc: "Skeletal system, vertebrae, ribs, and high-density calcium",
  },
  {
    id: "CT-AAA",
    label: "Angio",
    desc: "Aortic & renal angiography with contrast vessel isolation",
  },
  {
    id: "CT-Chest-Vessels",
    label: "Vessels",
    desc: "Thoracic and abdominal vasculature with organ silhouettes",
  },
  {
    id: "CT-Soft-Tissue",
    label: "Soft Tissue",
    desc: "Abdominal parenchyma, organs, muscle, and tissue mass",
  },
  {
    id: "CT-MIP",
    label: "MIP",
    desc: "Maximum Intensity Projection for high-density vascular tracing",
  },
];

type RightPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  segData: DicomSegData | null;
  isLoading: boolean;
  segmentVisibility: Record<number, boolean>;
  onToggleSegmentVisibility: (segNum: number) => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
  activeTab?: "segmentation" | "presets" | "totalsegmentator";
  onChangeTab?: (tab: "segmentation" | "presets" | "totalsegmentator") => void;
  active3DPreset?: string;
  onSelect3DPreset?: (presetId: string) => void;
  onResetCameras?: () => void;
  selectedSeriesUid?: string | null;
  selectedSeriesMetadata?: {
    modality?: string;
    bodyPartExamined?: string;
    seriesDescription?: string;
    contrastBolusAgent?: string;
    instanceCount?: number;
  };
  segmentingSeriesUid?: string | null;
  onRunTotalSegmentator?: (seriesUid: string, task?: string, fast?: boolean) => void;
};

export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onToggle,
  segData,
  isLoading,
  segmentVisibility,
  onToggleSegmentVisibility,
  opacity,
  onChangeOpacity,
  activeTab = "segmentation",
  onChangeTab,
  active3DPreset = "CT-AAA",
  onSelect3DPreset,
  onResetCameras,
  selectedSeriesUid,
  selectedSeriesMetadata,
  segmentingSeriesUid,
  onRunTotalSegmentator,
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

  const handleTabClick = (tab: "segmentation" | "presets" | "totalsegmentator") => {
    onChangeTab?.(tab);
    if (!isOpen) {
      onToggle();
    }
  };

  // If closed: show arrow pointing left and icons vertically
  if (!isOpen) {
    return (
      <aside className="seg-panel collapsed">
        {/* Left top end arrow pointing towards left */}
        <button
          className="seg-toggle-arrow-btn"
          onClick={onToggle}
          title="Expand right sidebar"
          aria-label="Expand right sidebar"
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

        <div className="seg-collapsed-vertical-items">
          {/* 1. Segments Icon */}
          <button
            className={`seg-collapsed-icon-btn ${activeTab === "segmentation" ? "active" : ""}`}
            onClick={() => handleTabClick("segmentation")}
            title="Segments"
            aria-label="Segments"
          >
            <span style={{ fontSize: "1.15rem" }}>🧬</span>
          </button>

          {/* 2. 3D presets Icon */}
          <button
            className={`seg-collapsed-icon-btn ${activeTab === "presets" ? "active" : ""}`}
            onClick={() => handleTabClick("presets")}
            title="3D presets"
            aria-label="3D presets"
          >
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
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </button>

          {/* 3. totalSegmentor Icon (Last) */}
          <button
            className={`seg-collapsed-icon-btn ${activeTab === "totalsegmentator" ? "active" : ""}`}
            onClick={() => handleTabClick("totalsegmentator")}
            title="totalSegmentor"
            aria-label="totalSegmentor"
          >
            <span style={{ fontSize: "1.15rem" }}>🧠</span>
          </button>
        </div>
      </aside>
    );
  }

  // If open: render expanded sidebar with arrow pointing right and tab icons side-by-side
  return (
    <aside className="seg-panel expanded">
      <div className="seg-panel-header">
        <div className="seg-header-horizontal-items">
          {/* Arrow icon on left top end pointing towards right to collapse */}
          <button
            className="seg-toggle-arrow-btn"
            onClick={onToggle}
            title="Collapse right sidebar"
            aria-label="Collapse right sidebar"
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

          {/* Tab Navigation: Segments, 3D presets, totalSegmentor (Icon-only) */}
          <div className="seg-tab-buttons">
            {/* 1. Segments */}
            <button
              className={`seg-tab-btn ${activeTab === "segmentation" ? "active" : ""}`}
              onClick={() => handleTabClick("segmentation")}
              title="Segments"
              aria-label="Segments"
            >
              <span style={{ fontSize: "1.15rem" }}>🧬</span>
            </button>

            {/* 2. 3D presets */}
            <button
              className={`seg-tab-btn ${activeTab === "presets" ? "active" : ""}`}
              onClick={() => handleTabClick("presets")}
              title="3D presets"
              aria-label="3D presets"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </button>

            {/* 3. totalSegmentor (Last) */}
            <button
              className={`seg-tab-btn ${activeTab === "totalsegmentator" ? "active" : ""}`}
              onClick={() => handleTabClick("totalsegmentator")}
              title="totalSegmentor"
              aria-label="totalSegmentor"
            >
              <span style={{ fontSize: "1.15rem" }}>🧠</span>
            </button>
          </div>
        </div>
      </div>

      <div className="seg-panel-body">
        {activeTab === "totalsegmentator" ? (
          <TotalSegmentatorTab
            selectedSeriesUid={selectedSeriesUid}
            selectedSeriesMetadata={selectedSeriesMetadata}
            segmentingSeriesUid={segmentingSeriesUid}
            onRunTotalSegmentator={onRunTotalSegmentator}
          />
        ) : activeTab === "segmentation" ? (
          <>
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
                    <span className="seg-opacity-val">
                      {Math.round(opacity * 100)}%
                    </span>
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
                    title={
                      areAllVisible ? "Hide all segments" : "Show all segments"
                    }
                    aria-label={
                      areAllVisible ? "Hide all segments" : "Show all segments"
                    }
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: areAllVisible ? "#ffffff" : "#64748b",
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
                    const isVisible =
                      segmentVisibility[seg.segmentNumber] ?? true;

                    return (
                      <div
                        key={seg.segmentNumber}
                        className={`seg-item-card ${isVisible ? "active" : "hidden"}`}
                        onClick={() =>
                          onToggleSegmentVisibility(seg.segmentNumber)
                        }
                      >
                        <div className="seg-item-left">
                          <span
                            className="seg-color-swatch"
                            style={{ backgroundColor: seg.color }}
                          />
                          <div className="seg-item-details">
                            <span className="seg-item-name">
                              {seg.description || seg.label}
                            </span>
                            <span className="seg-item-meta">
                              {seg.volumeCm3 > 0
                                ? `${seg.volumeCm3.toFixed(1)} cm³`
                                : `${seg.voxelCount} voxels`}
                            </span>
                          </div>
                        </div>

                        <button
                          className="seg-visibility-toggle-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSegmentVisibility(seg.segmentNumber);
                          }}
                          title={
                            isVisible ? "Hide segment" : "Show segment"
                          }
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: isVisible ? "#ffffff" : "#64748b",
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
          </>
        ) : (
          /* 3D Volume Presets Tab View */
          <div className="seg-presets-view">
            <div className="seg-section-title">3D Volume Presets</div>

            <div className="seg-presets-list">
              {VOLUME_PRESETS.map((p) => {
                const isSelected = active3DPreset === p.id;
                return (
                  <button
                    key={p.id}
                    className={`seg-preset-card ${isSelected ? "active" : ""}`}
                    onClick={() => onSelect3DPreset?.(p.id)}
                  >
                    <div className="seg-preset-card-body">
                      <div className="seg-preset-icon-container">
                        {renderPresetIcon(p.id)}
                      </div>
                      <div className="seg-preset-card-info">
                        <div className="seg-preset-card-header">
                          <span className="seg-preset-name">{p.label}</span>
                          {isSelected && (
                            <span className="seg-preset-active-badge">Active</span>
                          )}
                        </div>
                        <span className="seg-preset-desc">{p.desc}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {onResetCameras && (
              <div style={{ marginTop: "16px" }}>
                <button
                  className="seg-reset-camera-btn"
                  onClick={onResetCameras}
                  title="Reset 3D and MPR Cameras"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <span>Reset All Cameras</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
