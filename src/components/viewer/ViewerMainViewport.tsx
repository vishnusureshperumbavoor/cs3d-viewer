import React from "react";
import CornerstoneViewport from "../CornerstoneViewport";
import { MPRViewer } from "../viewport/MPRViewer";
import { DicomSegData } from "../../services/dicom-seg-service";
import { TotalSegmentatorLoadingOverlay } from "./TotalSegmentatorLoadingOverlay";
import { TotalSegLicenseModal } from "./TotalSegLicenseModal";

type ViewerMainViewportProps = {
  error: string | null;
  activeImageIds: string[];
  viewMode: "2d" | "3d";
  selectedSeriesUid: string | null;
  active3DPreset: string;
  segData: DicomSegData | null;
  segVisibility: Record<number, boolean>;
  segmentOpacity: number;
  segmentingSeriesUid: string | null;
  segmentingTaskName?: string | null;
  segmentingStatus?: "running" | "completed";
  onDismissSegmentingOverlay?: () => void;
  totalSegError: string | null;
  onDismissTotalSegError: () => void;
  isLicenseModalOpen?: boolean;
  onCloseLicenseModal?: () => void;
  hasLicense?: boolean;
  licenseMasked?: string | null;
  pendingLicenseTaskName?: string | null;
  onLicenseUpdated?: () => void;
};

export const ViewerMainViewport: React.FC<ViewerMainViewportProps> = ({
  error,
  activeImageIds,
  viewMode,
  selectedSeriesUid,
  active3DPreset,
  segData,
  segVisibility,
  segmentOpacity,
  segmentingSeriesUid,
  segmentingTaskName,
  segmentingStatus = "running",
  onDismissSegmentingOverlay,
  totalSegError,
  onDismissTotalSegError,
  isLicenseModalOpen = false,
  onCloseLicenseModal,
  hasLicense = false,
  licenseMasked,
  pendingLicenseTaskName,
  onLicenseUpdated,
}) => {
  return (
    <section className="viewer-panel" style={{ position: "relative" }}>
      {/* ── TotalSegmentator Academic License Modal (Centered in Main Viewport) ── */}
      {isLicenseModalOpen && (
        <TotalSegLicenseModal
          isOpen={isLicenseModalOpen}
          onClose={onCloseLicenseModal || (() => {})}
          hasLicense={Boolean(hasLicense)}
          licenseMasked={licenseMasked}
          targetTaskName={pendingLicenseTaskName}
          onLicenseUpdated={onLicenseUpdated || (() => {})}
        />
      )}

      {segmentingSeriesUid && (
        <TotalSegmentatorLoadingOverlay
          taskName={segmentingTaskName}
          status={segmentingStatus}
          onDismiss={onDismissSegmentingOverlay}
        />
      )}

      {totalSegError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            zIndex: 99,
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#ef4444", fontSize: "2rem" }}>⚠️</div>
          <h3 style={{ color: "#ef4444", margin: 0 }}>Segmentation Failed</h3>
          <p style={{ color: "#f87171", maxWidth: "500px", margin: 0 }}>{totalSegError}</p>
          <button
            onClick={onDismissTotalSegError}
            style={{
              padding: "8px 16px",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="viewer-card">
        {error ? (
          <div className="viewer-empty-state">
            <div>
              <h3>Unable to Load Study</h3>
              <p>{error}</p>
            </div>
          </div>
        ) : activeImageIds.length === 0 ? (
          <div className="viewer-empty-state">
            <div>
              <h3>Preparing Viewer</h3>
              <p>Loading study metadata and image stack.</p>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: viewMode === "2d" ? "block" : "none",
                width: "100%",
                height: "100%",
              }}
            >
              <CornerstoneViewport
                imageIds={activeImageIds}
                segData={segData}
                segmentVisibility={segVisibility}
                segmentOpacity={segmentOpacity}
              />
            </div>
            <div
              style={{
                display: viewMode === "3d" ? "block" : "none",
                width: "100%",
                height: "100%",
              }}
            >
              <MPRViewer
                imageIds={activeImageIds}
                seriesUid={selectedSeriesUid}
                active3DPreset={active3DPreset}
                segData={segData}
                segmentVisibility={segVisibility}
                segmentOpacity={segmentOpacity}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
};
