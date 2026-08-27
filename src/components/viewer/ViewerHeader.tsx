import React from "react";
import Logo from "../Logo";
import PatientHeaderInfo from "../PatientHeaderInfo";
import { WLPresetToolbar } from "../viewport/WLPresetToolbar";

export type PatientDetails = {
  patientName?: string;
  patientId?: string;
  patientBirthDate?: string;
  patientSex?: string;
  studyInstanceUid?: string;
};

type ViewerHeaderProps = {
  patientDetails?: PatientDetails;
  viewMode: "2d" | "3d";
  onSetViewMode: (mode: "2d" | "3d") => void;
};

export const ViewerHeader: React.FC<ViewerHeaderProps> = ({
  patientDetails,
  viewMode,
  onSetViewMode,
}) => {
  return (
    <nav className="top-nav">
      <div className="top-nav-inner">
        <a href="/" className="top-nav-brand">
          <div className="brand-icon" aria-hidden="true">
            <Logo />
          </div>
        </a>

        {patientDetails && (
          <PatientHeaderInfo
            patientName={patientDetails.patientName}
            patientId={patientDetails.patientId}
            patientBirthDate={patientDetails.patientBirthDate}
            patientSex={patientDetails.patientSex}
          />
        )}

        <WLPresetToolbar />

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              height: "42px",
              boxSizing: "border-box",
              background: "rgba(20, 20, 20, 0.7)",
              padding: "4px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => onSetViewMode("2d")}
              className={`tab-btn-2d ${viewMode === "2d" ? "active" : ""}`}
              title="2D Slice View"
              aria-label="2D View"
              style={{
                height: "32px",
                padding: "0 10px",
                borderRadius: "6px",
                background: viewMode === "2d" ? "rgba(255, 255, 255, 0.16)" : "transparent",
                color: viewMode === "2d" ? "#ffffff" : "#94a3b8",
                border: viewMode === "2d" ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
                <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
              </svg>
            </button>
            <button
              onClick={() => onSetViewMode("3d")}
              className={`tab-btn-3d ${viewMode === "3d" ? "active" : ""}`}
              title="3D Volume View"
              aria-label="3D View"
              style={{
                height: "32px",
                padding: "0 10px",
                borderRadius: "6px",
                background: viewMode === "3d" ? "rgba(255, 255, 255, 0.16)" : "transparent",
                color: viewMode === "3d" ? "#ffffff" : "#94a3b8",
                border: viewMode === "3d" ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.12 6.4-6-3.46a4 4 0 0 0-3.94 0L4.88 6.4A4 4 0 0 0 3 9.87v6.26a4 4 0 0 0 1.88 3.47l6.3 3.63a4 4 0 0 0 3.94 0l6-3.46a4 4 0 0 0 2-3.47V9.87a4 4 0 0 0-2.06-3.47Z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
