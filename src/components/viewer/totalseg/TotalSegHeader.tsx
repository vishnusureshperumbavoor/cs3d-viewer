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
    </div>
  );
};
