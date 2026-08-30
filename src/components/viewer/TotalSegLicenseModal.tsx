import React, { useState } from "react";
import { totalsegmentatorService } from "../../services/totalsegmentator-service";

interface TotalSegLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasLicense: boolean;
  licenseMasked?: string | null;
  targetTaskName?: string | null;
  onLicenseUpdated: () => void;
}

export const TotalSegLicenseModal: React.FC<TotalSegLicenseModalProps> = ({
  isOpen,
  onClose,
  hasLicense,
  licenseMasked,
  targetTaskName,
  onLicenseUpdated,
}) => {
  const [licenseInput, setLicenseInput] = useState("");
  const [skipValidation, setSkipValidation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) {
      setError("Please enter a license key.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await totalsegmentatorService.setLicense(licenseInput.trim(), skipValidation);
      setSuccessMsg(res.message || "Academic license activated successfully!");
      setLicenseInput("");
      onLicenseUpdated();
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to activate license.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Are you sure you want to remove the current TotalSegmentator license?")) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await totalsegmentatorService.removeLicense();
      setSuccessMsg("License removed.");
      onLicenseUpdated();
      setTimeout(() => {
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to remove license.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="totalseg-overlay-backdrop" onClick={onClose}>
      <div
        className="totalseg-overlay-modal totalseg-center-license-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Pinned Top-Right Close Button */}
        <button
          type="button"
          className="totalseg-center-modal-close-btn"
          onClick={onClose}
          aria-label="Cancel and close"
          title="Cancel and close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Animated Icon Scanner Header */}
        <div className="totalseg-scanner-container">
          <div className="totalseg-pulse-ring ring-1" style={{ borderColor: hasLicense ? "rgba(52, 211, 153, 0.4)" : "rgba(167, 139, 250, 0.4)" }} />
          <div className="totalseg-pulse-ring ring-2" style={{ borderColor: hasLicense ? "rgba(52, 211, 153, 0.2)" : "rgba(167, 139, 250, 0.2)" }} />
          <div
            className="totalseg-scanner-icon"
            style={{
              borderColor: hasLicense ? "rgba(52, 211, 153, 0.6)" : "rgba(167, 139, 250, 0.6)",
              background: hasLicense
                ? "radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)"
                : "radial-gradient(circle, rgba(167, 139, 250, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)",
            }}
          >
            <span style={{ fontSize: "2rem" }} role="img" aria-label="Key">
              {hasLicense ? "🎓" : "🔑"}
            </span>
          </div>
        </div>

        {/* Modal Title & Selected Task Info */}
        <div className="totalseg-overlay-header" style={{ width: "100%", textAlign: "center" }}>
          <div className="totalseg-overlay-title-row" style={{ justifyContent: "center" }}>
            <h3 className="totalseg-overlay-title">
              {hasLicense ? "Academic License Active" : "TotalSegmentator Academic Key"}
            </h3>
          </div>

          {targetTaskName && !hasLicense ? (
            <div
              className="totalseg-overlay-task-chip"
              style={{
                marginTop: "8px",
                background: "rgba(167, 139, 250, 0.15)",
                borderColor: "rgba(167, 139, 250, 0.35)",
              }}
            >
              <span>Selected Task: <strong>{targetTaskName}</strong></span>
            </div>
          ) : (
            <p style={{ margin: "4px 0 0 0", fontSize: "0.76rem", color: "#94a3b8" }}>
              Unlocks specialized cardiac, vascular, musculoskeletal & body composition models
            </p>
          )}
        </div>

        {/* Modal Content */}
        <div className="totalseg-center-modal-content">
          {targetTaskName && !hasLicense && (
            <div className="totalseg-center-task-alert">
              <span className="totalseg-center-alert-text">
                This model is free for academic and non-commercial research. Enter your key to run inference, or cancel to pick an open model (e.g. Whole Body, Liver, Spine).
              </span>
            </div>
          )}

          {hasLicense && (
            <div className="totalseg-license-status-card active">
              <div className="totalseg-license-status-header">
                <span className="totalseg-license-status-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  License Active
                </span>
                <button
                  type="button"
                  className="totalseg-license-remove-btn"
                  onClick={handleRemove}
                  disabled={loading}
                >
                  Remove Key
                </button>
              </div>
              <p className="totalseg-license-key-masked">
                Key: <code>{licenseMasked || "••••••••••••••••"}</code>
              </p>
              <p className="totalseg-license-note">
                All 12 specialized research models are unlocked and ready for execution.
              </p>
            </div>
          )}

          <form onSubmit={handleActivate} className="totalseg-license-form">
            <label className="totalseg-form-label" htmlFor="licenseKeyCenterInput">
              {hasLicense ? "Update Academic Key" : "Enter Academic License Key"}
            </label>
            <div className="totalseg-input-group">
              <input
                id="licenseKeyCenterInput"
                type="text"
                className="totalseg-license-input"
                placeholder="aca_xxxxxxxxxxxxxx (18 chars)"
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
                disabled={loading}
                autoFocus={!hasLicense}
              />
              <button
                type="submit"
                className="totalseg-license-submit-btn"
                disabled={loading || !licenseInput.trim()}
              >
                {loading ? "Verifying..." : hasLicense ? "Update" : targetTaskName ? "Activate & Run" : "Activate"}
              </button>
            </div>

            <label className="totalseg-checkbox-label">
              <input
                type="checkbox"
                checked={skipValidation}
                onChange={(e) => setSkipValidation(e.target.checked)}
                disabled={loading}
              />
              <span>Skip online server validation (offline / intranet environment)</span>
            </label>

            {error && (
              <div className="totalseg-modal-alert error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="totalseg-modal-alert success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}
          </form>

          <div className="totalseg-license-info-box">
            <div className="totalseg-license-info-title">Need a free academic license?</div>
            <p>
              Get an instant free academic key for research directly from the developer:
            </p>
            <a
              href="https://backend.totalsegmentator.com/license-academic/"
              target="_blank"
              rel="noopener noreferrer"
              className="totalseg-license-link"
            >
              Request Free Academic License Key ↗
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="totalseg-center-modal-footer">
          <button
            type="button"
            className="totalseg-modal-secondary-btn"
            onClick={onClose}
          >
            {hasLicense ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};
