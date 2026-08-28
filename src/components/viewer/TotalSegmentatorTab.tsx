import React, { useState, useMemo } from "react";
import {
  TOTALSEGMENTATOR_TASKS,
  getRecommendedTasks,
  TotalSegTask,
} from "../../constants/totalsegmentator-tasks";
import { renderTotalSegIcon } from "./TotalSegIcons";

type TotalSegmentatorTabProps = {
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
  loadedSegs?: Array<{ seriesUid: string; seriesDescription: string; modality: string }>;
  segDataMap?: Record<string, any>;
  onSelectSegSeries?: (imageSeriesUid: string, segSeriesUid: string) => void;
  onSwitchTab?: (tab: "segmentation" | "presets" | "totalsegmentator") => void;
};

const CATEGORIES = [
  { id: "all", label: "All Tasks" },
  { id: "abdomen", label: "Abdomen" },
  { id: "cardiac_vascular", label: "Cardiac & Vascular" },
  { id: "chest", label: "Chest & Lungs" },
  { id: "musculoskeletal", label: "Spine & Bones" },
  { id: "head_neck", label: "Head & Brain" },
  { id: "mri", label: "MRI" },
];

export const TotalSegmentatorTab: React.FC<TotalSegmentatorTabProps> = ({
  selectedSeriesUid,
  selectedSeriesMetadata,
  segmentingSeriesUid,
  onRunTotalSegmentator,
  loadedSegs = [],
  segDataMap = {},
  onSelectSegSeries,
  onSwitchTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isFastMode, setIsFastMode] = useState<boolean>(true);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  const isSegmenting = Boolean(segmentingSeriesUid);

  // Match completed segmentation by DICOM SeriesDescription or ContentLabel
  const getCompletedSeg = (taskId: string) => {
    if (!loadedSegs || loadedSegs.length === 0) return undefined;

    const taskDisplay = taskId.replace(/_/g, " ").toLowerCase();
    const expectedDesc = `${taskDisplay} (totalsegmentator)`;
    const expectedContentLabel = `TS_${taskId.toUpperCase()}`;

    return loadedSegs.find((seg) => {
      const desc = (seg.seriesDescription || "").toLowerCase();
      const segData = segDataMap?.[seg.seriesUid];
      const contentLabel = (segData?.contentLabel || "").toUpperCase();

      if (contentLabel && contentLabel === expectedContentLabel) return true;
      if (taskId === "total" && (desc.includes("whole body (totalsegmentator)") || desc.includes("total (totalsegmentator)"))) return true;
      if (desc.includes(expectedDesc)) return true;
      return false;
    });
  };

  const recommendedTasks = useMemo(() => {
    return getRecommendedTasks(selectedSeriesMetadata);
  }, [selectedSeriesMetadata]);

  const recommendedIds = useMemo(() => {
    return new Set(recommendedTasks.map((t) => t.id));
  }, [recommendedTasks]);

  const filteredTasks = useMemo(() => {
    if (selectedCategory === "all") {
      return TOTALSEGMENTATOR_TASKS;
    }
    return TOTALSEGMENTATOR_TASKS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const handleRunTask = (task: TotalSegTask) => {
    if (!selectedSeriesUid || isSegmenting) return;
    setRunningTaskId(task.id);
    const fast = task.id === "total" ? isFastMode : false;
    onRunTotalSegmentator?.(selectedSeriesUid, task.id, fast);
  };

  const modality = selectedSeriesMetadata?.modality || "CT";
  const bodyPart = selectedSeriesMetadata?.bodyPartExamined || "Abdomen";
  const contrast = selectedSeriesMetadata?.contrastBolusAgent
    ? "Contrast-Enhanced"
    : selectedSeriesMetadata?.seriesDescription?.toLowerCase().includes("arterial")
    ? "Arterial Contrast"
    : "Non-Contrast";
  const sliceCount = selectedSeriesMetadata?.instanceCount || 0;

  return (
    <div className="totalseg-tab-view">
      {/* ── Active Scan Context Info ── */}
      <div className="totalseg-scan-context-card">
        <div className="totalseg-scan-context-header">
          <span className="totalseg-scan-badge">{modality}</span>
          <span className="totalseg-scan-bodypart">{bodyPart}</span>
          <span className="totalseg-scan-contrast">{contrast}</span>
          {sliceCount > 0 && (
            <span className="totalseg-scan-slices">{sliceCount} slices</span>
          )}
        </div>
      </div>

      {/* ── Recommended Tasks Section ── */}
      <div className="totalseg-section">
        <div className="totalseg-section-header">
          <div className="totalseg-section-title-group">
            <span className="totalseg-section-badge">💡 Recommended</span>
            <span className="totalseg-section-subtitle">
              Matched for {modality} {bodyPart}
            </span>
          </div>
        </div>

        <div className="totalseg-task-list">
          {recommendedTasks.map((task) => {
            const isThisTaskRunning = isSegmenting && runningTaskId === task.id;
            const completedSeg = getCompletedSeg(task.id);

            return (
              <div key={task.id} className={`totalseg-task-card recommended ${completedSeg ? "is-completed" : ""}`}>
                <div className="totalseg-task-body">
                  <div className="totalseg-task-icon-container">
                    {renderTotalSegIcon(task.id)}
                  </div>
                  <div className="totalseg-task-info">
                    <div className="totalseg-task-header">
                      <span className="totalseg-task-name">{task.name}</span>
                      {completedSeg ? (
                        <span className="totalseg-completed-badge">✓ Completed</span>
                      ) : (
                        <span className="totalseg-task-tag">--task {task.id}</span>
                      )}
                    </div>
                    <span className="totalseg-task-desc">{task.description}</span>
                    <div className="totalseg-structure-tags">
                      {task.structures.slice(0, 4).map((s) => (
                        <span key={s} className="totalseg-structure-tag">
                          {s}
                        </span>
                      ))}
                      {task.structures.length > 4 && (
                        <span className="totalseg-structure-tag more">
                          +{task.structures.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="totalseg-task-footer">
                  {completedSeg ? (
                    <div className="totalseg-completed-action-group">
                      <button
                        className="totalseg-view-btn"
                        onClick={() => {
                          if (selectedSeriesUid && completedSeg) {
                            onSelectSegSeries?.(selectedSeriesUid, completedSeg.seriesUid);
                            onSwitchTab?.("segmentation");
                          }
                        }}
                        title={`View ${task.name} segmentation`}
                      >
                        <span>👁️ View Segments</span>
                      </button>
                      <button
                        className="totalseg-rerun-btn"
                        disabled={isSegmenting || !selectedSeriesUid}
                        onClick={() => handleRunTask(task)}
                        title={`Re-run ${task.name}`}
                      >
                        {isThisTaskRunning ? (
                          <span className="loading-spinner small" />
                        ) : (
                          <span>🔄</span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="totalseg-run-btn"
                      disabled={isSegmenting || !selectedSeriesUid}
                      onClick={() => handleRunTask(task)}
                      title={`Run ${task.name} inference`}
                    >
                      {isThisTaskRunning ? (
                        <>
                          <span className="loading-spinner small" />
                          <span>Running AI...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡ Run AI</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Specialized Models Catalog ── */}
      <div className="totalseg-section" style={{ marginTop: "8px" }}>
        <div className="totalseg-section-header">
          <div className="totalseg-section-title-group">
            <span className="seg-section-title" style={{ padding: 0 }}>
              Specialized AI Models
            </span>
          </div>

          <label className="totalseg-fast-mode-toggle" title="Fast mode (~3mm) completes in 1-2 minutes">
            <input
              type="checkbox"
              checked={isFastMode}
              onChange={(e) => setIsFastMode(e.target.checked)}
            />
            <span>Fast Mode</span>
          </label>
        </div>

        {/* Category Pills */}
        <div className="totalseg-category-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`totalseg-category-pill ${selectedCategory === cat.id ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Task Cards */}
        <div className="totalseg-task-list">
          {filteredTasks.map((task) => {
            const isThisTaskRunning = isSegmenting && runningTaskId === task.id;
            const isRecommended = recommendedIds.has(task.id);
            const completedSeg = getCompletedSeg(task.id);

            return (
              <div key={task.id} className={`totalseg-task-card ${completedSeg ? "is-completed" : ""}`}>
                <div className="totalseg-task-body">
                  <div className="totalseg-task-icon-container">
                    {renderTotalSegIcon(task.id)}
                  </div>
                  <div className="totalseg-task-info">
                    <div className="totalseg-task-header">
                      <span className="totalseg-task-name">{task.name}</span>
                      {completedSeg ? (
                        <span className="totalseg-completed-badge">✓ Completed</span>
                      ) : isRecommended ? (
                        <span className="totalseg-match-badge">Matched</span>
                      ) : (
                        <span className="totalseg-task-tag">--task {task.id}</span>
                      )}
                    </div>
                    <span className="totalseg-task-desc">{task.description}</span>
                    <div className="totalseg-structure-tags">
                      {task.structures.slice(0, 3).map((s) => (
                        <span key={s} className="totalseg-structure-tag">
                          {s}
                        </span>
                      ))}
                      {task.structures.length > 3 && (
                        <span className="totalseg-structure-tag more">
                          +{task.structures.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="totalseg-task-footer">
                  {completedSeg ? (
                    <div className="totalseg-completed-action-group">
                      <button
                        className="totalseg-view-btn"
                        onClick={() => {
                          if (selectedSeriesUid && completedSeg) {
                            onSelectSegSeries?.(selectedSeriesUid, completedSeg.seriesUid);
                            onSwitchTab?.("segmentation");
                          }
                        }}
                        title={`View ${task.name} segmentation`}
                      >
                        <span>👁️ View Segments</span>
                      </button>
                      <button
                        className="totalseg-rerun-btn"
                        disabled={isSegmenting || !selectedSeriesUid}
                        onClick={() => handleRunTask(task)}
                        title={`Re-run ${task.name}`}
                      >
                        {isThisTaskRunning ? (
                          <span className="loading-spinner small" />
                        ) : (
                          <span>🔄</span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="totalseg-run-btn"
                      disabled={isSegmenting || !selectedSeriesUid}
                      onClick={() => handleRunTask(task)}
                      title={`Run ${task.name} on this series`}
                    >
                      {isThisTaskRunning ? (
                        <>
                          <span className="loading-spinner small" />
                          <span>Running AI...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡ Run AI</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
