import React, { useState, useEffect, useRef } from "react";

type TotalSegmentatorLoadingOverlayProps = {
  taskName?: string | null;
  status?: "running" | "completed";
  onDismiss?: () => void;
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
  status = "running",
  onDismiss,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const wakeLockRef = useRef<any>(null);

  // 1. Live Stopwatch Timer (stops once status changes to 'completed')
  useEffect(() => {
    if (status !== "running") return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // 2. Prevent Screen Sleep / Turn-Off during AI Inference (Screen Wake Lock API)
  useEffect(() => {
    const acquireWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && status === "running") {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch (err) {
        console.warn("Screen wake lock request failed or not supported:", err);
      }
    };

    void acquireWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [status]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimeDetailed = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const cleanTaskName = taskName
    ? taskName === "total"
      ? "Whole Body (117 Organs)"
      : taskName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Whole Body (117 Organs)";

  const isCompleted = status === "completed";

  return (
    <div className="totalseg-overlay-backdrop">
      <div className={`totalseg-overlay-modal ${isCompleted ? "modal-completed" : ""}`}>
        {/* Animated Pulse Scanner Ring / Success Icon */}
        <div className="totalseg-scanner-container">
          {!isCompleted && (
            <>
              <div className="totalseg-pulse-ring ring-1" />
              <div className="totalseg-pulse-ring ring-2" />
            </>
          )}
          <div className={`totalseg-scanner-icon ${isCompleted ? "icon-completed" : ""}`}>
            <span style={{ fontSize: isCompleted ? "2.2rem" : "2rem" }} role="img" aria-label="AI Brain">
              {isCompleted ? "✅" : "🧠"}
            </span>
          </div>
        </div>

        {/* Header & Task Info */}
        <div className="totalseg-overlay-header">
          <div className="totalseg-overlay-title-row">
            <h3 className="totalseg-overlay-title">
              {isCompleted ? "Segmentation Complete" : "TotalSegmentator AI"}
            </h3>
            <span className={`totalseg-live-badge ${isCompleted ? "badge-completed" : ""}`}>
              {!isCompleted && <span className="totalseg-live-dot" />}
              {isCompleted ? "COMPLETED" : "PROCESSING"}
            </span>
          </div>
          <div className="totalseg-overlay-task-chip">
            <span>Task: {cleanTaskName}</span>
          </div>
        </div>

        {/* Time Readout Section (No Progress Bar) */}
        <div className="totalseg-time-readout-card">
          <span className="totalseg-time-label">
            {isCompleted ? "Total Execution Time" : "Elapsed Processing Time"}
          </span>
          <div className="totalseg-large-timer">
            <span className="totalseg-timer-clock-icon">⏱️</span>
            <span className="totalseg-timer-digits">
              {isCompleted ? formatTimeDetailed(elapsedSeconds) : formatTime(elapsedSeconds)}
            </span>
          </div>
          {!isCompleted && (
            <span className="totalseg-time-subtext">Display kept active during inference</span>
          )}
        </div>

        {/* Multi-Stage Progression Timeline */}
        <div className="totalseg-stages-timeline">
          {STAGES.map((stage, idx) => {
            const stageCompleted = isCompleted || elapsedSeconds >= stage.maxTime;
            const stageCurrent =
              !isCompleted &&
              elapsedSeconds >= stage.minTime &&
              elapsedSeconds < stage.maxTime;

            return (
              <div
                key={stage.id}
                className={`totalseg-stage-item ${
                  stageCompleted ? "completed" : stageCurrent ? "active" : "pending"
                }`}
              >
                <div className="totalseg-stage-icon-wrap">
                  {stageCompleted ? (
                    <span className="totalseg-stage-check">✓</span>
                  ) : stageCurrent ? (
                    <span className="totalseg-stage-spinner" />
                  ) : (
                    <span className="totalseg-stage-dot" />
                  )}
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`totalseg-stage-line ${
                        stageCompleted ? "completed" : ""
                      }`}
                    />
                  )}
                </div>
                <span className="totalseg-stage-label">{stage.label}</span>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        {isCompleted ? (
          <div className="totalseg-completed-footer">
            <button className="totalseg-done-btn" onClick={onDismiss}>
              <span>👁️ View Segmentation</span>
            </button>
          </div>
        ) : (
          <div className="totalseg-overlay-footer">
            <div className="totalseg-hardware-badge">
              <span>⚡ Multi-Threaded Engine</span>
            </div>
            <span className="totalseg-footer-hint">Please stand by while DICOM SEG generates</span>
          </div>
        )}
      </div>
    </div>
  );
};
