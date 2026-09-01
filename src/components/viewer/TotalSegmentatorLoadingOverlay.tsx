import React, { useState, useEffect, useRef } from "react";

type TotalSegmentatorLoadingOverlayProps = {
  taskName?: string | null;
  status?: "running" | "completed";
  onDismiss?: () => void;
  onCancel?: () => void;
};

export const TotalSegmentatorLoadingOverlay: React.FC<TotalSegmentatorLoadingOverlayProps> = ({
  taskName = "total",
  status = "running",
  onDismiss,
  onCancel,
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

  // 2. Prevent Screen Sleep / Turn-Off during AI Inference (Auto-Reacquiring on Tab Switch)
  useEffect(() => {
    if (status !== "running") {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      return;
    }

    const acquireWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && document.visibilityState === "visible") {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch (err) {
        console.warn("[ScreenWakeLock] Failed to acquire lock:", err);
      }
    };

    void acquireWakeLock();

    // Re-acquire lock whenever the user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && status === "running") {
        void acquireWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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

        {/* Time Readout Section */}
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

        {/* Realistic Status & Progress Section (Honest indeterminate loading) */}
        <div className={`totalseg-status-card ${isCompleted ? "completed" : ""}`}>
          <div className="totalseg-status-indicator">
            {isCompleted ? (
              <span className="totalseg-status-completed-check">✓</span>
            ) : (
              <span className="totalseg-status-spinner" />
            )}
            <div className="totalseg-status-text-wrap">
              <span className="totalseg-status-headline">
                {isCompleted
                  ? "DICOM Segmentation Generated"
                  : "Neural Network Inference in Progress"}
              </span>
              <span className="totalseg-status-description">
                {isCompleted
                  ? "Multi-structure DICOM SEG volume is ready and loaded in the viewer."
                  : "Running TotalSegmentator AI segmentation on server. Please wait while processing..."}
              </span>
            </div>
          </div>
          {!isCompleted && (
            <div className="totalseg-indeterminate-bar">
              <div className="totalseg-indeterminate-fill" />
            </div>
          )}
        </div>

        {/* Close Button on Modal (Close if completed, Cancel if running) */}
        <button
          className="totalseg-modal-close-btn"
          onClick={isCompleted ? onDismiss : onCancel}
          aria-label={isCompleted ? "Close" : "Cancel segmentation"}
          title={isCompleted ? "Close" : "Cancel segmentation"}
        >
          ✕
        </button>

        {/* Footer Actions */}
        {isCompleted ? (
          <div className="totalseg-completed-footer">
            <button className="totalseg-done-btn" onClick={onDismiss}>
              <span>Close</span>
            </button>
          </div>
        ) : (
          <div className="totalseg-overlay-footer">
            <div className="totalseg-hardware-badge">
              <span>⚡ Multi-Threaded Engine</span>
            </div>
            {onCancel && (
              <button
                type="button"
                className="totalseg-overlay-cancel-btn"
                onClick={onCancel}
                title="Cancel segmentation"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Cancel Segmentation</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
