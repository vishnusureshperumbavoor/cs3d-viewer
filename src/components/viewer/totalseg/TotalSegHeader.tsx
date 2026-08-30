import React from "react";

export interface TotalSegHeaderProps {
  modality: string;
  bodyPart: string;
  contrast: string;
  filterCompletedOnly: boolean;
  onToggleFilterCompleted: () => void;
  filterNoLicenseOnly: boolean;
  onToggleFilterNoLicense: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  activeMode: "recommended" | "explore";
  onModeChange: (mode: "recommended" | "explore") => void;
  recommendedCount?: number;
  exploreCount?: number;
  children?: React.ReactNode;
}

export const TotalSegHeader: React.FC<TotalSegHeaderProps> = ({
  modality,
  bodyPart,
  contrast,
  filterCompletedOnly,
  onToggleFilterCompleted,
  filterNoLicenseOnly,
  onToggleFilterNoLicense,
  searchQuery,
  onSearchChange,
  activeMode,
  onModeChange,
  recommendedCount = 0,
  exploreCount = 0,
  children,
}) => {
  return (
    <div className="totalseg-sticky-header">
      {/* Active Scan Context Info & Top Icon Filters */}
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
              onClick={onToggleFilterCompleted}
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
              onClick={onToggleFilterNoLicense}
              title="show models that dont require academic license"
              aria-label="show models that dont require academic license"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="totalseg-search-bar-wrap">
        <div className="totalseg-search-box">
          <svg
            className="totalseg-search-icon"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="totalseg-search-input"
            placeholder="Search by model or structure (e.g. liver, aorta, spine)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search models and structures"
          />
          {searchQuery && (
            <button
              type="button"
              className="totalseg-search-clear-btn"
              onClick={() => onSearchChange("")}
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs (Single Row - Only Icons & Tooltip) */}
      <div className="totalseg-tabs-bar">
        <div className="totalseg-mode-tabs">
          <button
            type="button"
            className={`totalseg-mode-tab ${activeMode === "recommended" ? "active recommended" : ""}`}
            onClick={() => onModeChange("recommended")}
            title="Recommended"
            aria-label="Recommended"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
            </svg>
          </button>

          <button
            type="button"
            className={`totalseg-mode-tab ${activeMode === "explore" ? "active explore" : ""}`}
            onClick={() => onModeChange("explore")}
            title="Explore"
            aria-label="Explore"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon
                points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
                fill="currentColor"
                fillOpacity="0.25"
              />
            </svg>
          </button>
        </div>

        <div className="totalseg-tabs-bar-meta">
          <span className="totalseg-tabs-count">
            {activeMode === "recommended"
              ? `${recommendedCount} recommended`
              : `${exploreCount} models`}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
};
