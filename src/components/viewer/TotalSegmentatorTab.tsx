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
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isFastMode, setIsFastMode] = useState<boolean>(true);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  const isSegmenting = Boolean(segmentingSeriesUid);

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
    onRunTotalSegmentator?.(selectedSeriesUid, task.id, isFastMode);
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

            return (
              <div key={task.id} className="totalseg-task-card recommended">
                <div className="totalseg-task-body">
                  <div className="totalseg-task-icon-container">
                    {renderTotalSegIcon(task.id)}
                  </div>
                  <div className="totalseg-task-info">
                    <div className="totalseg-task-header">
                      <span className="totalseg-task-name">{task.name}</span>
                      <span className="totalseg-task-tag">--task {task.id}</span>
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

            return (
              <div key={task.id} className="totalseg-task-card">
                <div className="totalseg-task-body">
                  <div className="totalseg-task-icon-container">
                    {renderTotalSegIcon(task.id)}
                  </div>
                  <div className="totalseg-task-info">
                    <div className="totalseg-task-header">
                      <span className="totalseg-task-name">{task.name}</span>
                      {isRecommended && (
                        <span className="totalseg-match-badge">Matched</span>
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
