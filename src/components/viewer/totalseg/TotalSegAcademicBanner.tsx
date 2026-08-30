import React from "react";

export interface TotalSegAcademicBannerProps {
  hasLicense: boolean;
  licenseMasked?: string | null;
  onOpenLicenseModal?: () => void;
}

export const TotalSegAcademicBanner: React.FC<TotalSegAcademicBannerProps> = ({
  hasLicense,
  licenseMasked,
  onOpenLicenseModal,
}) => {
  return (
    <div className={`totalseg-academic-context-card ${hasLicense ? "active" : "unregistered"}`}>
      <div className="totalseg-academic-context-left">
        <span className={`totalseg-license-pill ${hasLicense ? "active" : "unregistered"}`}>
          {hasLicense ? "License Active" : "Key Required"}
        </span>
        <div className="totalseg-academic-context-text">
          <span className="totalseg-academic-context-title">
            {hasLicense
              ? "All specialized academic models unlocked"
              : "One free key unlocks all specialized models below"}
          </span>
          <span className="totalseg-academic-context-subtitle">
            {hasLicense
              ? `Registered key: ${licenseMasked || "••••••••"}`
              : "Body composition, coronary arteries, cardiac chambers, limb bones & more."}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="totalseg-license-action-btn"
        onClick={onOpenLicenseModal}
      >
        {hasLicense ? "Manage" : "Activate Key"}
      </button>
    </div>
  );
};
