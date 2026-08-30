import { TotalSegTask } from "../../../constants/totalsegmentator-tasks";
import { expandSearchTerms } from "../../../constants/searchSynonyms";

export interface LoadedSegItem {
  seriesUid: string;
  seriesDescription?: string;
  modality?: string;
}

/**
 * Matches a completed DICOM segmentation series by SeriesDescription or ContentLabel
 */
export function getCompletedSeg(
  loadedSegs: LoadedSegItem[] = [],
  segDataMap: Record<string, any> = {},
  taskId: string
): LoadedSegItem | undefined {
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
}

/**
 * Checks whether a single term matches any field of a TotalSegTask
 */
function matchesSingleTerm(task: TotalSegTask, term: string): boolean {
  if (!term) return true;
  if (task.name.toLowerCase().includes(term)) return true;
  if (task.id.toLowerCase().includes(term)) return true;
  if (task.structures.some((s) => s.toLowerCase().includes(term))) return true;
  if (task.description.toLowerCase().includes(term)) return true;
  if (task.categoryLabel?.toLowerCase().includes(term)) return true;
  return false;
}

/**
 * Checks whether a TotalSegTask matches a search query across name, ID, structures, and description.
 * Automatically expands the query with medical synonyms (e.g. "kidney" also matches "renal").
 */
export function matchesTotalSegSearch(task: TotalSegTask, cleanQuery: string): boolean {
  if (!cleanQuery) return true;
  const terms = expandSearchTerms(cleanQuery);
  return terms.some((term) => matchesSingleTerm(task, term));
}

/**
 * Returns prioritized structure names for display, putting search matches first.
 * Considers synonym-expanded terms when prioritizing.
 */
export function getRenderedStructures(
  task: TotalSegTask,
  cleanQuery: string,
  isExpanded: boolean
): string[] {
  if (isExpanded) {
    return task.structures;
  }
  if (!cleanQuery) {
    return task.structures.slice(0, 3);
  }

  const terms = expandSearchTerms(cleanQuery);
  const matching = task.structures.filter((s) =>
    terms.some((term) => s.toLowerCase().includes(term))
  );
  const nonMatching = task.structures.filter(
    (s) => !terms.some((term) => s.toLowerCase().includes(term))
  );

  return [...matching, ...nonMatching].slice(0, Math.max(3, matching.length));
}

