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
  licenseInfo?: { hasLicense: boolean; licenseMasked?: string | null };
  onOpenLicenseModal?: (task?: TotalSegTask) => void;
  activeSegSeriesUid?: string | null;
};

const CATEGORIES = [
  { id: "all", label: "All Tasks" },
  { id: "whole_body", label: "Whole Body" },
  { id: "abdomen", label: "Abdomen" },
  { id: "cardiac_vascular", label: "Cardiac & Vascular" },
  { id: "chest", label: "Chest & Lungs" },
  { id: "musculoskeletal", label: "Spine & Bones" },
  { id: "head_neck", label: "Head & Dental" },
  { id: "pathology", label: "Pathology" },
  { id: "academic", label: "Academic 🔑" },
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
  licenseInfo: propsLicenseInfo,
  onOpenLicenseModal,
  activeSegSeriesUid,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterCompletedOnly, setFilterCompletedOnly] = useState<boolean>(false);
  const [filterNoLicenseOnly, setFilterNoLicenseOnly] = useState<boolean>(false);
  const [selectedCardTaskId, setSelectedCardTaskId] = useState<string | null>(null);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [installedTasks, setInstalledTasks] = useState<string[]>([]);
  const [pushingTaskId, setPushingTaskId] = useState<string | null>(null);
  const [pushedTasks, setPushedTasks] = useState<Record<string, string>>({});
  const [hfFiles, setHfFiles] = useState<Array<{ filename: string; url: string }>>([]);
  const [isSpecializedOpen, setIsSpecializedOpen] = useState<boolean>(false);
  const [localLicenseInfo, setLocalLicenseInfo] = useState<{ hasLicense: boolean; licenseMasked?: string | null }>({
    hasLicense: false,
    licenseMasked: null,
  });

  const licenseInfo = propsLicenseInfo || localLicenseInfo;

  const isSegmenting = Boolean(segmentingSeriesUid);

  const refreshLicenseStatus = () => {
    totalsegmentatorService.getLicenseStatus().then((status) => {
      setLocalLicenseInfo({
        hasLicense: status.hasLicense,
        licenseMasked: status.licenseMasked,
      });
    });
  };

  useEffect(() => {
    totalsegmentatorService.getInstalledTasks().then(setInstalledTasks);
    totalsegmentatorService.getHFSegmentations().then(setHfFiles);
    refreshLicenseStatus();
  }, [segmentingSeriesUid, loadedSegs.length]);

  const handlePushToHF = async (task: TotalSegTask, completedSeg: { seriesUid: string }) => {
    if (pushingTaskId) return;
    setPushingTaskId(task.id);
    try {
      const res = await totalsegmentatorService.pushSegToHuggingFace(completedSeg.seriesUid);
      setPushedTasks((prev) => ({ ...prev, [task.id]: res.url }));
      const updated = await totalsegmentatorService.getHFSegmentations();
      setHfFiles(updated);
    } catch (err: any) {
      console.error("Push to HF failed:", err);
      alert(err.message || "Failed to push segmentation to Hugging Face.");
    } finally {
      setPushingTaskId(null);
    }
  };

  // Match completed segmentation by DICOM SeriesDescription or ContentLabel
  const getCompletedSeg = (taskId: string) => {
    if (!loadedSegs || loadedSegs.length === 0) return undefined;

    const taskDisplay = taskId.replace(/_/g, " ").toLowerCase();
    const expectedDesc = `${taskDisplay} (totalsegmentator)`;
    const expectedContentLabel = `TS_${taskId.toUpperCase()}`;

    return loadedSegs.find((seg) => {
      const desc = (seg.seriesDescription || "").trim().toLowerCase();
      const segData = segDataMap?.[seg.seriesUid];
      const contentLabel = (segData?.contentLabel || "").trim().toUpperCase();

      // 1. Exact DICOM ContentLabel match (e.g. TS_BODY vs TS_VERTEBRAE_BODY)
      if (contentLabel && contentLabel === expectedContentLabel) return true;

      // 2. Whole body / Total task matching
      if (taskId === "total") {
        if (
          desc.startsWith("whole body") ||
          desc.startsWith("total (totalsegmentator)") ||
          desc === "total"
        ) {
          return true;
        }
      }

      // 3. Exact description match (starts with expectedDesc so "body" never matches "vertebrae body")
      if (desc === expectedDesc || desc.startsWith(expectedDesc)) return true;

      // 4. Standalone exact task name match (e.g. "liver vessels" without suffix)
      if (desc === taskDisplay) return true;

      return false;
    });
  };

  const recommendedTasks = useMemo(() => {
    const baseList = getRecommendedTasks(selectedSeriesMetadata);
    // Any task that has a completed segmentation on this study is automatically recommended!
    const completedTasks = TOTALSEGMENTATOR_TASKS.filter((t) => Boolean(getCompletedSeg(t.id)));

    const merged = [...completedTasks];
    baseList.forEach((t) => {
      if (!merged.some((m) => m.id === t.id)) {
        merged.push(t);
      }
    });
    return merged;
  }, [selectedSeriesMetadata, loadedSegs, segDataMap]);

  const recommendedIds = useMemo(() => {
    return new Set(recommendedTasks.map((t) => t.id));
  }, [recommendedTasks]);

  const filteredRecommendedTasks = useMemo(() => {
    let list = recommendedTasks;
    if (filterNoLicenseOnly) {
      list = list.filter((t) => !t.requiresLicense);
    }
    if (filterCompletedOnly) {
      list = list.filter((t) => Boolean(getCompletedSeg(t.id)));
    }
    return list;
  }, [recommendedTasks, filterNoLicenseOnly, filterCompletedOnly, loadedSegs]);

  const filteredTasks = useMemo(() => {
    let list = TOTALSEGMENTATOR_TASKS.filter((t) => !recommendedIds.has(t.id));

    if (selectedCategory === "academic") {
      list = list.filter((t) => t.requiresLicense);
    } else if (selectedCategory !== "all") {
      list = list.filter((t) => t.category === selectedCategory);
    }

    if (filterNoLicenseOnly) {
      list = list.filter((t) => !t.requiresLicense);
    }

    if (filterCompletedOnly) {
      list = list.filter((t) => Boolean(getCompletedSeg(t.id)));
    }

    return list;
  }, [recommendedIds, selectedCategory, filterNoLicenseOnly, filterCompletedOnly, loadedSegs]);

  const handleRunTask = (task: TotalSegTask) => {
    if (!selectedSeriesUid || isSegmenting) return;

    if (task.requiresLicense && !licenseInfo.hasLicense) {
      onOpenLicenseModal?.(task);
      return;
    }

    setRunningTaskId(task.id);
    const fast = task.id === "total";
    onRunTotalSegmentator?.(selectedSeriesUid, task.id, fast);
  };

  const modality = selectedSeriesMetadata?.modality || "CT";
  const bodyPart = selectedSeriesMetadata?.bodyPartExamined || "Abdomen";
  const contrast = selectedSeriesMetadata?.contrastBolusAgent
    ? "Contrast"
    : selectedSeriesMetadata?.seriesDescription?.toLowerCase().includes("arterial")
      ? "Arterial"
      : "Non-Contrast";

  return (
    <div className="totalseg-tab-view">
      {/* ── Active Scan Context Info & Top Icon Filters ── */}
      <div className="totalseg-scan-context-card">
        <div className="totalseg-scan-context-header">
          <div className="totalseg-scan-context-left">
            <span className="totalseg-scan-badge">{modality}</span>
            <span className="totalseg-scan-bodypart">{bodyPart}</span>
            <span className="totalseg-scan-contrast">{contrast}</span>
          </div>

          <div className="totalseg-top-filters">
            {/* Double tick icon for completed */}
            <button
              type="button"
              className={`totalseg-icon-filter-btn completed ${filterCompletedOnly ? "active" : ""}`}
              onClick={() => {
                const next = !filterCompletedOnly;
                setFilterCompletedOnly(next);
                if (next) setIsSpecializedOpen(true);
              }}
              title="show models which completed segmentation"
              aria-label="show models which completed segmentation"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L7 17l-5-5" />
                <path d="M22 10l-7.5 7.5-1.5-1.5" />
              </svg>
            </button>

            {/* Lock open icon for non academic */}
            <button
              type="button"
              className={`totalseg-icon-filter-btn ${filterNoLicenseOnly ? "active" : ""}`}
              onClick={() => {
                const next = !filterNoLicenseOnly;
                setFilterNoLicenseOnly(next);
                if (next) {
                  setIsSpecializedOpen(true);
                  if (selectedCategory === "academic") setSelectedCategory("all");
                }
              }}
              title="show models that doesnt require academic license"
              aria-label="show models that doesnt require academic license"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
         {/* ── Recommended Tasks Section ── */}
      {recommendedTasks.length > 0 && (
        <div className="totalseg-section">
          <div className="totalseg-section-header">
            <div className="totalseg-section-title-group">
              <span className="totalseg-section-badge">💡 Recommended</span>
              <span className="totalseg-count-badge">
                {filteredRecommendedTasks.length}
              </span>
              <span className="totalseg-section-subtitle">
                Matched for {modality} {bodyPart}
              </span>
            </div>
          </div>

          <div className="totalseg-task-list">
            {filteredRecommendedTasks.length === 0 ? (
              <div className="totalseg-empty-filter-state" style={{ padding: "14px 10px" }}>
                <span style={{ fontSize: "1.1rem" }}>🔍</span>
                <span className="totalseg-empty-filter-title" style={{ fontSize: "0.75rem" }}>
                  No matching recommended models
                </span>
                <span className="totalseg-empty-filter-desc" style={{ fontSize: "0.68rem" }}>
                  {filterCompletedOnly
                    ? "No completed recommended segmentations in this study."
                    : "No models match the active filter."}
                </span>
              </div>
            ) : (
              filteredRecommendedTasks.map((task) => {
                const isThisTaskRunning = isSegmenting && runningTaskId === task.id;
                const completedSeg = getCompletedSeg(task.id);
                const isDownloaded = installedTasks.includes(task.id);
                const isSegActive = Boolean(
                  completedSeg && (
                    selectedCardTaskId === task.id ||
                    (activeSegSeriesUid && completedSeg.seriesUid === activeSegSeriesUid)
                  )
                );

                return (
                  <div
                    key={task.id}
                    className={`totalseg-task-card recommended ${completedSeg ? "is-completed is-clickable" : ""} ${isSegActive ? "is-active" : ""}`}
                    onClick={() => {
                      if (completedSeg && selectedSeriesUid) {
                        setSelectedCardTaskId(task.id);
                        onSelectSegSeries?.(selectedSeriesUid, completedSeg.seriesUid);
                      }
                    }}
                    style={{ cursor: completedSeg ? "pointer" : "default" }}
                  >
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
                            licenseInfo.hasLicense ? (
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
                            className="totalseg-rerun-btn"
                            disabled={isSegmenting}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunTask(task);
                            }}
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
                          {(() => {
                            const isTaskUploadedToHF = Boolean(
                              pushedTasks[task.id] ||
                              hfFiles.some((f) => {
                                const taskClean = task.id.replace(/_/g, "").toLowerCase();
                                const fnClean = f.filename.replace(/_/g, "").toLowerCase();
                                return fnClean.includes(taskClean) || taskClean.includes(fnClean.replace(".dcm", ""));
                              })
                            );

                            if (isTaskUploadedToHF) return null;

                            return (
                              <button
                                className="totalseg-hf-push-btn"
                                disabled={Boolean(pushingTaskId) || isSegmenting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (completedSeg) {
                                    handlePushToHF(task, completedSeg);
                                  }
                                }}
                                title={`Upload ${task.name} segmentation to Hugging Face dataset`}
                                aria-label={`Upload ${task.name} segmentation to Hugging Face`}
                              >
                                {pushingTaskId === task.id ? (
                                  <span className="loading-spinner small" />
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                  </svg>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      ) : (
                        <button
                          className="totalseg-run-btn"
                          disabled={isSegmenting || !selectedSeriesUid}
                          onClick={() => handleRunTask(task)}
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
              })
            )}
          </div>
        </div>
      )}

      {/* ── Other Models Catalog ── */}
      <div className={`totalseg-section ${isSpecializedOpen ? "expanded" : "collapsed"}`}>
        <button
          type="button"
          className="totalseg-collapsible-header"
          onClick={() => setIsSpecializedOpen((prev) => !prev)}
          aria-expanded={isSpecializedOpen}
        >
          <div className="totalseg-section-title-group">
            <span className="totalseg-section-badge other-models">
              🔬 Other Models
            </span>
            <span className="totalseg-count-badge">
              {filteredTasks.length}
            </span>
          </div>
          <svg
            className={`totalseg-collapse-chevron ${isSpecializedOpen ? "open" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isSpecializedOpen && (
          <>
            {/* Category Pills */}
            <div className="totalseg-category-pills" style={{ marginTop: "4px" }}>
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

            {/* Contextual Academic License Card (Shown when browsing Academic Models) */}
            {selectedCategory === "academic" && (
              <div className={`totalseg-academic-context-card ${licenseInfo.hasLicense ? "active" : "unregistered"}`}>
                <div className="totalseg-academic-context-left">
                  <span className={`totalseg-license-pill ${licenseInfo.hasLicense ? "active" : "unregistered"}`}>
                    {licenseInfo.hasLicense ? "License Active" : "Key Required"}
                  </span>
                  <div className="totalseg-academic-context-text">
                    <span className="totalseg-academic-context-title">
                      {licenseInfo.hasLicense
                        ? "All specialized academic models unlocked"
                        : "One free key unlocks all specialized models below"}
                    </span>
                    <span className="totalseg-academic-context-subtitle">
                      {licenseInfo.hasLicense
                        ? `Registered key: ${licenseInfo.licenseMasked || "••••••••"}`
                        : "Body composition, coronary arteries, cardiac chambers, limb bones & more."}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="totalseg-license-action-btn"
                  onClick={() => onOpenLicenseModal?.()}
                >
                  {licenseInfo.hasLicense ? "Manage" : "Activate Key"}
                </button>
              </div>
            )}

            {/* Task Cards */}
            <div className="totalseg-task-list">
              {filteredTasks.length === 0 ? (
                <div className="totalseg-empty-filter-state">
                  <span style={{ fontSize: "1.4rem" }}>🔍</span>
                  <span className="totalseg-empty-filter-title">No matching models found</span>
                  <span className="totalseg-empty-filter-desc">
                    {filterCompletedOnly && filterNoLicenseOnly
                      ? "No completed models found without license requirement in this study."
                      : filterCompletedOnly
                        ? "No segmentations have been completed yet for this selection."
                        : "No models match the selected category and filters."}
                  </span>
                  <button
                    type="button"
                    className="totalseg-clear-filters-btn"
                    onClick={() => {
                      setSelectedCategory("all");
                      setFilterCompletedOnly(false);
                      setFilterNoLicenseOnly(false);
                    }}
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const isThisTaskRunning = isSegmenting && runningTaskId === task.id;
                  const isRecommended = recommendedIds.has(task.id);
                  const completedSeg = getCompletedSeg(task.id);
                  const isDownloaded = installedTasks.includes(task.id);
                  const isSegActive = Boolean(
                    completedSeg && (
                      selectedCardTaskId === task.id ||
                      (activeSegSeriesUid && completedSeg.seriesUid === activeSegSeriesUid)
                    )
                  );

                  return (
                    <div
                      key={task.id}
                      className={`totalseg-task-card ${completedSeg ? "is-completed is-clickable" : ""} ${isSegActive ? "is-active" : ""}`}
                      onClick={() => {
                        if (completedSeg && selectedSeriesUid) {
                          setSelectedCardTaskId(task.id);
                          onSelectSegSeries?.(selectedSeriesUid, completedSeg.seriesUid);
                        }
                      }}
                      title={completedSeg ? (isSegActive ? `Currently displaying ${task.name}` : `Click to display ${task.name}`) : undefined}
                    >
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
                              licenseInfo.hasLicense ? (
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
                              className="totalseg-rerun-btn"
                              disabled={isSegmenting || !selectedSeriesUid}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRunTask(task);
                              }}
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
                            {(() => {
                              const isTaskUploadedToHF = Boolean(
                                pushedTasks[task.id] ||
                                hfFiles.some((f) => {
                                  const taskClean = task.id.replace(/_/g, "").toLowerCase();
                                  const fnClean = f.filename.replace(/_/g, "").toLowerCase();
                                  return fnClean.includes(taskClean) || taskClean.includes(fnClean.replace(".dcm", ""));
                                })
                              );

                              if (isTaskUploadedToHF) return null;

                              return (
                                <button
                                  className="totalseg-hf-push-btn"
                                  disabled={Boolean(pushingTaskId) || isSegmenting}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (completedSeg) {
                                      handlePushToHF(task, completedSeg);
                                    }
                                  }}
                                  title={`Upload ${task.name} segmentation to Hugging Face dataset`}
                                  aria-label={`Upload ${task.name} segmentation to Hugging Face`}
                                >
                                  {pushingTaskId === task.id ? (
                                    <span className="loading-spinner small" />
                                  ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="17 8 12 3 7 8" />
                                      <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        ) : (
                          <button
                            className="totalseg-run-btn"
                            disabled={isSegmenting || !selectedSeriesUid}
                            onClick={() => handleRunTask(task)}
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
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
