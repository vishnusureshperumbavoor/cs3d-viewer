import React from "react";
import { TotalSegTask } from "../../../constants/totalsegmentator-tasks";
import { renderTotalSegIcon } from "../TotalSegIcons";
import { getRenderedStructures, LoadedSegItem } from "./totalseg-matcher";

export interface TotalSegTaskCardProps {
  task: TotalSegTask;
  isRecommended?: boolean;
  completedSeg?: LoadedSegItem;
  isDownloaded?: boolean;
  isSegActive?: boolean;
  isThisTaskRunning?: boolean;
  isSegmenting?: boolean;
  hasLicense?: boolean;
  cleanSearchQuery?: string;
  isExpandedStructures?: boolean;
  onToggleExpandStructures?: (taskId: string, e: React.MouseEvent) => void;
  onSelectCard?: () => void;
  onRunTask: (task: TotalSegTask) => void;
  onDeleteSegSeries?: (segSeriesUid: string) => void;
  onOpenLicenseModal?: (task?: TotalSegTask) => void;
}

export const TotalSegTaskCard: React.FC<TotalSegTaskCardProps> = ({
  task,
  isRecommended = false,
  completedSeg,
  isDownloaded = false,
  isSegActive = false,
  isThisTaskRunning = false,
  isSegmenting = false,
  hasLicense = false,
  cleanSearchQuery = "",
  isExpandedStructures = false,
  onToggleExpandStructures,
  onSelectCard,
  onRunTask,
  onDeleteSegSeries,
  onOpenLicenseModal,
}) => {
  const renderedStructures = getRenderedStructures(
    task,
    cleanSearchQuery,
    isExpandedStructures
  );
  const remainingCount = task.structures.length - renderedStructures.length;

  return (
    <div
      className={`totalseg-task-card ${isRecommended ? "recommended" : ""} ${completedSeg ? "is-completed is-clickable" : ""} ${isSegActive ? "is-active" : ""}`}
      onClick={completedSeg ? onSelectCard : undefined}
      style={{ cursor: completedSeg ? "pointer" : "default" }}
      title={
        completedSeg
          ? isSegActive
            ? `Currently displaying ${task.name}`
            : `Click to display ${task.name}`
          : undefined
      }
    >
      {/* Header Section */}
      <div className="totalseg-task-header-section">
        <div className="totalseg-task-icon-container">
          {renderTotalSegIcon(task.id)}
        </div>
        <div className="totalseg-task-header-content">
          {/* Row 1: Title */}
          <span className="totalseg-task-name">{task.name}</span>

          {/* Row 2: Badges + Structure Tags */}
          <div className="totalseg-badges-and-tags-row">
            {completedSeg && (
              <span className="totalseg-completed-badge">✓ Completed</span>
            )}
            {isRecommended && !completedSeg && (
              <span className="totalseg-match-badge">Matched</span>
            )}
            {isDownloaded && (
              <span
                className="totalseg-downloaded-badge"
                title="Model weights cached locally (~320MB). Instant execution without download."
              >
                ⚡ Downloaded
              </span>
            )}

            {task.requiresLicense && (
              hasLicense ? (
                <span
                  className="totalseg-license-badge totalseg-license-clickable"
                  title="Academic model (Active license verified)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLicenseModal?.();
                  }}
                >
                  🎓 Academic (Unlocked)
                </span>
              ) : (
                <span
                  className="totalseg-license-badge totalseg-license-clickable"
                  title="Requires free academic license from totalsegmentator.com (Click to enter key)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLicenseModal?.(task);
                  }}
                >
                  🔑 Academic Key
                </span>
              )
            )}

            {!completedSeg && !isRecommended && !task.requiresLicense && !isDownloaded && (
              <span className="totalseg-task-tag">--task {task.id}</span>
            )}

            {renderedStructures.map((s) => {
              const isMatched = Boolean(
                cleanSearchQuery && s.toLowerCase().includes(cleanSearchQuery)
              );
              return (
                <span
                  key={s}
                  className={`totalseg-structure-tag ${isMatched ? "matched" : ""}`}
                >
                  {s}
                </span>
              );
            })}

            {(remainingCount > 0 || isExpandedStructures) && (
              <button
                type="button"
                className={`totalseg-structure-tag more ${isExpandedStructures ? "active" : ""}`}
                onClick={(e) => onToggleExpandStructures?.(task.id, e)}
                title={
                  isExpandedStructures
                    ? "Click to show fewer structures"
                    : `Click to view all ${task.structures.length} structures: ${task.structures.join(", ")}`
                }
                aria-label={
                  isExpandedStructures
                    ? "Show fewer structures"
                    : `Show ${remainingCount} more structures`
                }
              >
                {isExpandedStructures ? "show less" : `+${remainingCount} more`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Description */}
      <span className="totalseg-task-desc">{task.description}</span>

      {/* Row 4: Footer Actions */}
      <div className="totalseg-task-footer">
        {completedSeg ? (
          <div className="totalseg-completed-action-group">
            {/* Re-run button */}
            <button
              className="totalseg-rerun-btn"
              disabled={isSegmenting}
              onClick={(e) => {
                e.stopPropagation();
                onRunTask(task);
              }}
              title={`Re-run ${task.name}`}
            >
              {isThisTaskRunning ? (
                <span className="loading-spinner small" />
              ) : (
                <span>🔄</span>
              )}
            </button>

            {/* Delete button */}
            {onDeleteSegSeries && (
              <button
                className="totalseg-delete-btn"
                disabled={isSegmenting}
                onClick={(e) => {
                  e.stopPropagation();
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
          /* Run button */
          <button
            className="totalseg-run-btn"
            disabled={isSegmenting}
            onClick={() => onRunTask(task)}
            title={`Run ${task.name} AI segmentation`}
            aria-label={`Run ${task.name} AI segmentation`}
          >
            {isThisTaskRunning ? (
              <span className="loading-spinner small" />
            ) : (
              <span role="img" aria-label="AI">✨</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
