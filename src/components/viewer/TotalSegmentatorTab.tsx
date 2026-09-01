import React, { useState, useEffect } from "react";
import { TotalSegTask } from "../../constants/totalsegmentator-tasks";
import { totalsegmentatorService } from "../../services/totalsegmentator-service";
import { TotalSegHeader } from "./totalseg/TotalSegHeader";
import { TotalSegTaskCard } from "./totalseg/TotalSegTaskCard";
import { TotalSegAcademicBanner } from "./totalseg/TotalSegAcademicBanner";
import { useTotalSegFilters } from "./totalseg/hooks/useTotalSegFilters";
import { getCompletedSeg, LoadedSegItem } from "./totalseg/totalseg-matcher";

export interface TotalSegmentatorTabProps {
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
  loadedSegs?: LoadedSegItem[];
  segDataMap?: Record<string, any>;
  onSelectSegSeries?: (imageSeriesUid: string, segSeriesUid: string) => void;
  onDeleteSegSeries?: (segSeriesUid: string) => void;
  onSwitchTab?: (tab: "segmentation" | "presets" | "totalsegmentator") => void;
  licenseInfo?: { hasLicense: boolean; licenseMasked?: string | null };
  onOpenLicenseModal?: (task?: TotalSegTask) => void;
  activeSegSeriesUid?: string | null;
}

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
  const [selectedCardTaskId, setSelectedCardTaskId] = useState<string | null>(null);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [installedTasks, setInstalledTasks] = useState<string[]>([]);

  const [localLicenseInfo, setLocalLicenseInfo] = useState<{
    hasLicense: boolean;
    licenseMasked?: string | null;
  }>({
    hasLicense: false,
    licenseMasked: null,
  });

  const licenseInfo = propsLicenseInfo || localLicenseInfo;
  const isSegmenting = Boolean(segmentingSeriesUid);

  const {
    selectedCategory,
    setSelectedCategory,
    filterCompletedOnly,
    toggleFilterCompleted,
    filterNoLicenseOnly,
    toggleFilterNoLicense,
    searchQuery,
    setSearchQuery,
    cleanSearchQuery,
    activeMode,
    setActiveMode,
    expandedStructuresTaskIds,
    toggleExpandedStructures,
    resetFilters,
    filteredRecommendedTasks,
    filteredTasks,
  } = useTotalSegFilters({
    selectedSeriesMetadata,
    loadedSegs,
    segDataMap,
  });

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
    refreshLicenseStatus();
  }, [segmentingSeriesUid, loadedSegs.length]);

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
      {/* Sticky Header: Scan Context, Search Input & Mode Tabs */}
      <TotalSegHeader
        modality={modality}
        bodyPart={bodyPart}
        contrast={contrast}
        filterCompletedOnly={filterCompletedOnly}
        onToggleFilterCompleted={toggleFilterCompleted}
        filterNoLicenseOnly={filterNoLicenseOnly}
        onToggleFilterNoLicense={toggleFilterNoLicense}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        recommendedCount={filteredRecommendedTasks.length}
        exploreCount={filteredTasks.length}
      >
        {/* Sticky Body Parts / Category Pills in Explore Mode */}
        {activeMode === "explore" && (
          <div className="totalseg-category-pills-wrap">
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
          </div>
        )}
      </TotalSegHeader>

      {/* ── Recommended Tab View ── */}
      {activeMode === "recommended" && (
        <div className="totalseg-task-list">
          {filteredRecommendedTasks.length === 0 ? (
            <div className="totalseg-empty-filter-state" style={{ padding: "14px 10px" }}>
              <span style={{ fontSize: "1.1rem" }}>🔍</span>
              <span className="totalseg-empty-filter-title" style={{ fontSize: "0.75rem" }}>
                {cleanSearchQuery
                  ? `No recommended models match "${searchQuery}"`
                  : "No matching recommended models"}
              </span>
              <span className="totalseg-empty-filter-desc" style={{ fontSize: "0.68rem" }}>
                {cleanSearchQuery
                  ? "Switch to the Explore tab to search all available models."
                  : filterCompletedOnly
                    ? "No completed recommended segmentations in this study."
                    : "No models match the active filter."}
              </span>
              {cleanSearchQuery && (
                <button
                  type="button"
                  className="totalseg-clear-filters-btn"
                  onClick={() => setActiveMode("explore")}
                >
                  Switch to Explore Tab
                </button>
              )}
            </div>
          ) : (
            filteredRecommendedTasks.map((task: TotalSegTask) => {
              const completedSeg = getCompletedSeg(loadedSegs, segDataMap, task.id);
              const isSegActive = Boolean(
                completedSeg &&
                  (selectedCardTaskId === task.id ||
                    (activeSegSeriesUid && completedSeg.seriesUid === activeSegSeriesUid))
              );

              return (
                <TotalSegTaskCard
                  key={task.id}
                  task={task}
                  isRecommended
                  completedSeg={completedSeg}
                  isDownloaded={installedTasks.includes(task.id)}
                  isSegActive={isSegActive}
                  isThisTaskRunning={isSegmenting && runningTaskId === task.id}
                  isSegmenting={isSegmenting}
                  hasLicense={licenseInfo.hasLicense}
                  cleanSearchQuery={cleanSearchQuery}
                  isExpandedStructures={expandedStructuresTaskIds.has(task.id)}
                  onToggleExpandStructures={toggleExpandedStructures}
                  onSelectCard={() => {
                    if (completedSeg && selectedSeriesUid) {
                      setSelectedCardTaskId(task.id);
                      onSelectSegSeries?.(selectedSeriesUid, completedSeg.seriesUid);
                    }
                  }}
                  onRunTask={handleRunTask}
                  onDeleteSegSeries={onDeleteSegSeries}
                  onOpenLicenseModal={onOpenLicenseModal}
                />
              );
            })
          )}
        </div>
      )}

      {/* ── Explore Tab View (All Models Available for Selection) ── */}
      {activeMode === "explore" && (
        <div className="totalseg-explore-container">
          {/* Contextual Academic License Card */}
          {selectedCategory === "academic" && (
            <TotalSegAcademicBanner
              hasLicense={licenseInfo.hasLicense}
              licenseMasked={licenseInfo.licenseMasked}
              onOpenLicenseModal={() => onOpenLicenseModal?.()}
            />
          )}

          {/* Task Cards */}
          <div className="totalseg-task-list">
            {filteredTasks.length === 0 ? (
              <div className="totalseg-empty-filter-state">
                <span style={{ fontSize: "1.4rem" }}>🔍</span>
                <span className="totalseg-empty-filter-title">
                  {cleanSearchQuery
                    ? `No models found matching "${searchQuery}"`
                    : "No matching models found"}
                </span>
                <span className="totalseg-empty-filter-desc">
                  {cleanSearchQuery
                    ? "Try a different anatomical keyword or check your spelling."
                    : filterCompletedOnly && filterNoLicenseOnly
                      ? "No completed models found without license requirement in this study."
                      : filterCompletedOnly
                        ? "No segmentations have been completed yet for this selection."
                        : "No models match the selected category and filters."}
                </span>
                <button
                  type="button"
                  className="totalseg-clear-filters-btn"
                  onClick={resetFilters}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              filteredTasks.map((task: TotalSegTask) => {
                const completedSeg = getCompletedSeg(loadedSegs, segDataMap, task.id);
                const isSegActive = Boolean(
                  completedSeg &&
                    (selectedCardTaskId === task.id ||
                      (activeSegSeriesUid && completedSeg.seriesUid === activeSegSeriesUid))
                );

                return (
                  <TotalSegTaskCard
                    key={task.id}
                    task={task}
                    completedSeg={completedSeg}
                    isDownloaded={installedTasks.includes(task.id)}
                    isSegActive={isSegActive}
                    isThisTaskRunning={isSegmenting && runningTaskId === task.id}
                    isSegmenting={isSegmenting}
                    hasLicense={licenseInfo.hasLicense}
                    cleanSearchQuery={cleanSearchQuery}
                    isExpandedStructures={expandedStructuresTaskIds.has(task.id)}
                    onToggleExpandStructures={toggleExpandedStructures}
                    onSelectCard={() => {
                      if (completedSeg && selectedSeriesUid) {
                        setSelectedCardTaskId(task.id);
                        onSelectSegSeries?.(selectedSeriesUid, completedSeg.seriesUid);
                      }
                    }}
                    onRunTask={handleRunTask}
                    onDeleteSegSeries={onDeleteSegSeries}
                    onOpenLicenseModal={onOpenLicenseModal}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
