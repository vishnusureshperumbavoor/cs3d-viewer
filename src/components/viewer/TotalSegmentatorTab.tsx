import React, { useState, useMemo, useEffect } from "react";
import {
  TOTALSEGMENTATOR_TASKS,
  getRecommendedTasks,
  TotalSegTask,
} from "../../constants/totalsegmentator-tasks";
import { renderTotalSegIcon } from "./TotalSegIcons";
import { totalsegmentatorService } from "../../services/totalsegmentator-service";

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
  onDeleteSegSeries?: (segSeriesUid: string) => void;
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
  onDeleteSegSeries,
  onSwitchTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [installedTasks, setInstalledTasks] = useState<string[]>([]);

  const isSegmenting = Boolean(segmentingSeriesUid);

  useEffect(() => {
    totalsegmentatorService.getInstalledTasks().then(setInstalledTasks);
  }, [segmentingSeriesUid]);

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
    const fast = task.id === "total";
    onRunTotalSegmentator?.(selectedSeriesUid, task.id, fast);
  };

  const modality = selectedSeriesMetadata?.modality || "CT";
  const bodyPart = selectedSeriesMetadata?.bodyPartExamined || "Abdomen";
  const contrast = selectedSeriesMetadata?.contrastBolusAgent
    ? "Contrast-Enhanced"
    : selectedSeriesMetadata?.seriesDescription?.toLowerCase().includes("arterial")
    ? "Arterial Contrast"
    : "Non-Contrast";

  return (
    <div className="totalseg-tab-view">
      {/* ── Active Scan Context Info ── */}
      <div className="totalseg-scan-context-card">
        <div className="totalseg-scan-context-header">
          <span className="totalseg-scan-badge">{modality}</span>
          <span className="totalseg-scan-bodypart">{bodyPart}</span>
          <span className="totalseg-scan-contrast">{contrast}</span>
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
            const isDownloaded = installedTasks.includes(task.id);

            return (
              <div key={task.id} className={`totalseg-task-card recommended ${completedSeg ? "is-completed" : ""}`}>
                {/* Header: Icon on left, Title on Top, Badges & Tags below Title */}
                <div className="totalseg-task-header-section">
                  <div className="totalseg-task-icon-container">
                    {renderTotalSegIcon(task.id)}
                  </div>
                  <div className="totalseg-task-header-content">
                    {/* Row 1: Full-width Title (Never truncated) */}
                    <span className="totalseg-task-name">{task.name}</span>

                    {/* Row 2: Badges (Completed, Matched, Downloaded, Academic Key) + Structure Tags */}
                    <div className="totalseg-badges-and-tags-row">
                      {completedSeg && (
                        <span className="totalseg-completed-badge">✓ Completed</span>
                      )}
                      {!completedSeg && (
                        <span className="totalseg-match-badge">Matched</span>
                      )}
                      {isDownloaded && (
                        <span className="totalseg-downloaded-badge" title="Model weights cached locally (~320MB). Instant execution without download.">
                          ⚡ Downloaded
                        </span>
                      )}
                      {task.requiresLicense && (
                        <span className="totalseg-license-badge" title="Requires free academic license from totalsegmentator.com">🔑 Academic Key</span>
                      )}

                      {task.structures.slice(0, 3).map((s) => (
                        <span key={s} className="totalseg-structure-tag">
                          {s}
                        </span>
                      ))}
                      {task.structures.length > 3 && (
                        <span className="totalseg-structure-tag more">
                          +{task.structures.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 3: Full-width description */}
                <span className="totalseg-task-desc">{task.description}</span>

                {/* Footer Actions */}
                <div className="totalseg-task-footer">
                  {completedSeg ? (
                    <div className="totalseg-completed-action-group">
                      <button
                        className="totalseg-view-btn icon-only"
                        onClick={() => {
                          if (selectedSeriesUid && completedSeg) {
                            onSelectSegSeries?.(selectedSeriesUid, completedSeg.seriesUid);
                            onSwitchTab?.("segmentation");
                          }
                        }}
                        title={`View ${task.name} segmentation`}
                        aria-label={`View ${task.name} segmentation`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
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
                      {onDeleteSegSeries && (
                        <button
                          className="totalseg-delete-btn"
                          disabled={isSegmenting}
                          onClick={() => {
                            if (window.confirm(`Delete ${task.name} segmentation?`)) {
                              onDeleteSegSeries(completedSeg.seriesUid);
                            }
                          }}
                          title={`Delete ${task.name} segmentation`}
                          aria-label={`Delete ${task.name} segmentation`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      className="totalseg-run-btn"
                      disabled={isSegmenting || !selectedSeriesUid}
                      onClick={() => handleRunTask(task)}
                    >
                      {isThisTaskRunning ? (
                        <>
                          <span className="loading-spinner small" />
                          <span>Segmenting...</span>
                        </>
                      ) : (
                        <>
                          <span role="img" aria-label="AI">✨</span>
                          <span>Run AI</span>
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
            const isDownloaded = installedTasks.includes(task.id);

            return (
              <div key={task.id} className={`totalseg-task-card ${completedSeg ? "is-completed" : ""}`}>
                {/* Header: Icon on left, Title on Top, Badges & Tags below Title */}
                <div className="totalseg-task-header-section">
                  <div className="totalseg-task-icon-container">
                    {renderTotalSegIcon(task.id)}
                  </div>
                  <div className="totalseg-task-header-content">
                    {/* Row 1: Full-width Title (Never truncated) */}
                    <span className="totalseg-task-name">{task.name}</span>

                    {/* Row 2: Badges (Completed, Matched, Downloaded, Academic Key, --task tag) + Structure Tags */}
                    <div className="totalseg-badges-and-tags-row">
                      {completedSeg && (
                        <span className="totalseg-completed-badge">✓ Completed</span>
                      )}
                      {isRecommended && !completedSeg && (
                        <span className="totalseg-match-badge">Matched</span>
                      )}
                      {isDownloaded && (
                        <span className="totalseg-downloaded-badge" title="Model weights cached locally (~320MB). Instant execution without download.">
                          ⚡ Downloaded
                        </span>
                      )}
                      {task.requiresLicense && (
                        <span className="totalseg-license-badge" title="Requires free academic license from totalsegmentator.com">🔑 Academic Key</span>
                      )}
                      {!completedSeg && !isRecommended && !task.requiresLicense && !isDownloaded && (
                        <span className="totalseg-task-tag">--task {task.id}</span>
                      )}

                      {task.structures.slice(0, 3).map((s) => (
                        <span key={s} className="totalseg-structure-tag">
                          {s}
                        </span>
                      ))}
                      {task.structures.length > 3 && (
                        <span className="totalseg-structure-tag more">
                          +{task.structures.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 3: Full-width description */}
                <span className="totalseg-task-desc">{task.description}</span>

                {/* Footer Actions */}
                <div className="totalseg-task-footer">
                  {completedSeg ? (
                    <div className="totalseg-completed-action-group">
                      <button
                        className="totalseg-view-btn icon-only"
                        onClick={() => {
                          if (selectedSeriesUid && completedSeg) {
                            onSelectSegSeries?.(selectedSeriesUid, completedSeg.seriesUid);
                            onSwitchTab?.("segmentation");
                          }
                        }}
                        title={`View ${task.name} segmentation`}
                        aria-label={`View ${task.name} segmentation`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
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
                      {onDeleteSegSeries && (
                        <button
                          className="totalseg-delete-btn"
                          disabled={isSegmenting}
                          onClick={() => {
                            if (window.confirm(`Delete ${task.name} segmentation?`)) {
                              onDeleteSegSeries(completedSeg.seriesUid);
                            }
                          }}
                          title={`Delete ${task.name} segmentation`}
                          aria-label={`Delete ${task.name} segmentation`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      className="totalseg-run-btn"
                      disabled={isSegmenting || !selectedSeriesUid}
                      onClick={() => handleRunTask(task)}
                    >
                      {isThisTaskRunning ? (
                        <>
                          <span className="loading-spinner small" />
                          <span>Segmenting...</span>
                        </>
                      ) : (
                        <>
                          <span role="img" aria-label="AI">✨</span>
                          <span>Run AI</span>
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
