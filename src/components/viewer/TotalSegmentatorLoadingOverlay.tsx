import React, { useState, useEffect } from "react";

type TotalSegmentatorLoadingOverlayProps = {
  taskName?: string | null;
};

const STAGES = [
  {
    id: 1,
    label: "Ingesting 3D volumetric DICOM slices & geometry",
    minTime: 0,
    maxTime: 7,
  },
  {
    id: 2,
    label: "Loading nnU-Net weights & initializing neural network",
    minTime: 7,
    maxTime: 25,
  },
  {
    id: 3,
    label: "Running 3D deep neural network inference on volumetric CT",
    minTime: 25,
    maxTime: 65,
  },
  {
    id: 4,
    label: "Synthesizing multi-structure label maps & encoding DICOM SEG",
    minTime: 65,
    maxTime: 999,
  },
];

export const TotalSegmentatorLoadingOverlay: React.FC<TotalSegmentatorLoadingOverlayProps> = ({
  taskName = "total",
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const cleanTaskName = taskName
    ? taskName === "total"
      ? "Whole Body (117 Organs)"
      : taskName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Whole Body (117 Organs)";

  // Estimate progress percentage (smooth asymptotic curve up to ~95%)
  const estimatedProgress = Math.min(
    95,
    Math.round(
      elapsedSeconds < 20
        ? (elapsedSeconds / 20) * 35
        : elapsedSeconds < 60
        ? 35 + ((elapsedSeconds - 20) / 40) * 45
        : 80 + Math.min(15, ((elapsedSeconds - 60) / 60) * 15)
    )
  );

  return (
    <div className="totalseg-overlay-backdrop">
      <div className="totalseg-overlay-modal">
        {/* Animated Pulse Scanner Ring */}
        <div className="totalseg-scanner-container">
          <div className="totalseg-pulse-ring ring-1" />
          <div className="totalseg-pulse-ring ring-2" />
          <div className="totalseg-scanner-icon">
            <span style={{ fontSize: "2rem" }} role="img" aria-label="AI Brain">
              🧠
            </span>
          </div>
        </div>

        {/* Header & Task Info */}
        <div className="totalseg-overlay-header">
          <div className="totalseg-overlay-title-row">
            <h3 className="totalseg-overlay-title">TotalSegmentator AI</h3>
            <span className="totalseg-live-badge">
              <span className="totalseg-live-dot" />
              PROCESSING
            </span>
          </div>
          <div className="totalseg-overlay-task-chip">
            <span>Task: {cleanTaskName}</span>
          </div>
        </div>

        {/* Progress Bar & Time */}
        <div className="totalseg-progress-section">
          <div className="totalseg-progress-info">
            <span className="totalseg-progress-status">Neural inference active</span>
            <span className="totalseg-timer">⏱️ {formatTime(elapsedSeconds)}</span>
          </div>
          <div className="totalseg-progress-bar-track">
            <div
              className="totalseg-progress-bar-fill"
              style={{ width: `${estimatedProgress}%` }}
            />
          </div>
        </div>

        {/* Multi-Stage Progression Timeline */}
        <div className="totalseg-stages-timeline">
          {STAGES.map((stage, idx) => {
            const isCompleted = elapsedSeconds >= stage.maxTime;
            const isCurrent =
              elapsedSeconds >= stage.minTime && elapsedSeconds < stage.maxTime;

            return (
              <div
                key={stage.id}
                className={`totalseg-stage-item ${
                  isCompleted ? "completed" : isCurrent ? "active" : "pending"
                }`}
              >
                <div className="totalseg-stage-icon-wrap">
                  {isCompleted ? (
                    <span className="totalseg-stage-check">✓</span>
                  ) : isCurrent ? (
                    <span className="totalseg-stage-spinner" />
                  ) : (
                    <span className="totalseg-stage-dot" />
                  )}
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`totalseg-stage-line ${
                        isCompleted ? "completed" : ""
                      }`}
                    />
                  )}
                </div>
                <span className="totalseg-stage-label">{stage.label}</span>
              </div>
            );
          })}
        </div>

        {/* Footer Hardware Info */}
        <div className="totalseg-overlay-footer">
          <div className="totalseg-hardware-badge">
            <span>⚡ Multi-Threaded Engine</span>
          </div>
          <span className="totalseg-footer-hint">Please stand by while DICOM SEG generates</span>
        </div>
      </div>
    </div>
  );
};
