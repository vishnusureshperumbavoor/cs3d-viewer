import { useState, useMemo, useEffect } from "react";
import {
  TOTALSEGMENTATOR_TASKS,
  getRecommendedTasks,
  TotalSegTask,
} from "../../../../constants/totalsegmentator-tasks";
import { getCompletedSeg, matchesTotalSegSearch, LoadedSegItem } from "../totalseg-matcher";

export interface UseTotalSegFiltersProps {
  selectedSeriesMetadata?: {
    modality?: string;
    bodyPartExamined?: string;
    seriesDescription?: string;
    contrastBolusAgent?: string;
    instanceCount?: number;
  };
  loadedSegs?: LoadedSegItem[];
  segDataMap?: Record<string, any>;
}

export function useTotalSegFilters({
  selectedSeriesMetadata,
  loadedSegs = [],
  segDataMap = {},
}: UseTotalSegFiltersProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterCompletedOnly, setFilterCompletedOnly] = useState<boolean>(false);
  const [filterNoLicenseOnly, setFilterNoLicenseOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSpecializedOpen, setIsSpecializedOpen] = useState<boolean>(false);
  const [expandedStructuresTaskIds, setExpandedStructuresTaskIds] = useState<Set<string>>(new Set());

  const cleanSearchQuery = searchQuery.trim().toLowerCase();

  const toggleExpandedStructures = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedStructuresTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleFilterCompleted = () => {
    const next = !filterCompletedOnly;
    setFilterCompletedOnly(next);
    if (next) setIsSpecializedOpen(true);
  };

  const toggleFilterNoLicense = () => {
    const next = !filterNoLicenseOnly;
    setFilterNoLicenseOnly(next);
    if (next) {
      setIsSpecializedOpen(true);
      if (selectedCategory === "academic") setSelectedCategory("all");
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setFilterCompletedOnly(false);
    setFilterNoLicenseOnly(false);
  };

  // Base recommended tasks matched for this study modality & body part + any already completed tasks
  const recommendedTasks: TotalSegTask[] = useMemo(() => {
    const baseList = getRecommendedTasks(selectedSeriesMetadata);
    const completedTasks = TOTALSEGMENTATOR_TASKS.filter((t) =>
      Boolean(getCompletedSeg(loadedSegs, segDataMap, t.id))
    );

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

  // Auto-expand specialized section if user searches
  useEffect(() => {
    if (cleanSearchQuery) {
      setIsSpecializedOpen(true);
    }
  }, [cleanSearchQuery]);

  const filteredRecommendedTasks: TotalSegTask[] = useMemo(() => {
    let list = recommendedTasks;
    if (cleanSearchQuery) {
      list = list.filter((t) => matchesTotalSegSearch(t, cleanSearchQuery));
    }
    if (filterNoLicenseOnly) {
      list = list.filter((t) => !t.requiresLicense);
    }
    if (filterCompletedOnly) {
      list = list.filter((t) => Boolean(getCompletedSeg(loadedSegs, segDataMap, t.id)));
    }
    return list;
  }, [recommendedTasks, cleanSearchQuery, filterNoLicenseOnly, filterCompletedOnly, loadedSegs, segDataMap]);

  const filteredTasks: TotalSegTask[] = useMemo(() => {
    let list = TOTALSEGMENTATOR_TASKS.filter((t) => !recommendedIds.has(t.id));

    if (cleanSearchQuery) {
      list = list.filter((t) => matchesTotalSegSearch(t, cleanSearchQuery));
    } else {
      if (selectedCategory === "academic") {
        list = list.filter((t) => t.requiresLicense);
      } else if (selectedCategory !== "all") {
        list = list.filter((t) => t.category === selectedCategory);
      }
    }

    if (filterNoLicenseOnly) {
      list = list.filter((t) => !t.requiresLicense);
    }

    if (filterCompletedOnly) {
      list = list.filter((t) => Boolean(getCompletedSeg(loadedSegs, segDataMap, t.id)));
    }

    return list;
  }, [recommendedIds, cleanSearchQuery, selectedCategory, filterNoLicenseOnly, filterCompletedOnly, loadedSegs, segDataMap]);

  return {
    selectedCategory,
    setSelectedCategory,
    filterCompletedOnly,
    toggleFilterCompleted,
    filterNoLicenseOnly,
    toggleFilterNoLicense,
    searchQuery,
    setSearchQuery,
    cleanSearchQuery,
    isSpecializedOpen,
    setIsSpecializedOpen,
    expandedStructuresTaskIds,
    toggleExpandedStructures,
    resetFilters,
    recommendedTasks,
    recommendedIds,
    filteredRecommendedTasks,
    filteredTasks,
  };
}
