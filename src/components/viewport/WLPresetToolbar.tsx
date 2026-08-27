import { useState, useRef, useEffect } from "react";
import { getRenderingEngine } from "@cornerstonejs/core";

export type WLPreset = {
  id: string;
  name: string;
  ww?: number;
  wc?: number;
};

export const STANDARD_WL_PRESETS: WLPreset[] = [
  { id: "custom_650_1150", name: "Custom (WW: 650, WL: 1150)", ww: 650, wc: 1150 },
  { id: "soft_tissue", name: "Soft Tissue (WW: 400, WL: 40)", ww: 400, wc: 40 },
  { id: "bone", name: "Bone (WW: 2000, WL: 500)", ww: 2000, wc: 500 },
  { id: "lung", name: "Lung (WW: 1500, WL: -600)", ww: 1500, wc: -600 },
  { id: "brain", name: "Brain (WW: 80, WL: 40)", ww: 80, wc: 40 },
  { id: "arterial", name: "Angio / Arterial (WW: 600, WL: 300)", ww: 600, wc: 300 },
  { id: "default", name: "DICOM Default" },
];

export function WLPresetToolbar() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("custom_650_1150");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isDropdownOpen]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setIsDropdownOpen(false);

    const preset = STANDARD_WL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    // Apply to 2D Viewport if active
    const renderingEngine2D = getRenderingEngine("mainViewerRenderingEngine");
    if (renderingEngine2D) {
      const viewport = renderingEngine2D.getViewport("CT_AXIAL_STACK") as any;
      if (viewport) {
        if (preset.id === "default") {
          viewport.resetProperties();
          viewport.render();
        } else if (preset.ww !== undefined && preset.wc !== undefined) {
          const lower = preset.wc - preset.ww / 2;
          const upper = preset.wc + preset.ww / 2;
          viewport.setProperties({ voiRange: { lower, upper } });
          viewport.render();
        }
      }
    }

    // Also apply to MPR Viewports if active
    const renderingEngineMPR = getRenderingEngine("MPR_RENDERING_ENGINE");
    if (renderingEngineMPR) {
      ["mpr-axial", "mpr-sagittal", "mpr-coronal"].forEach((id) => {
        const vp = renderingEngineMPR.getViewport(id) as any;
        if (vp && typeof vp.setProperties === "function") {
          if (preset.id === "default") {
            vp.resetProperties();
            vp.render();
          } else if (preset.ww !== undefined && preset.wc !== undefined) {
            const lower = preset.wc - preset.ww / 2;
            const upper = preset.wc + preset.ww / 2;
            vp.setProperties({ voiRange: { lower, upper } });
            vp.render();
          }
        }
      });
    }
  };

  const selectedPreset = STANDARD_WL_PRESETS.find((p) => p.id === selectedPresetId);

  return (
    <div
      ref={containerRef}
      className="wl-preset-toolbar-container"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: "42px",
        boxSizing: "border-box",
        background: "rgba(20, 20, 20, 0.7)",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        padding: "0 12px",
        gap: "6px",
        userSelect: "none",
      }}
    >
      {/* Window Level Icon */}
      <span
        title={`Window Level: ${selectedPreset?.name || "Custom"}`}
        style={{
          display: "flex",
          alignItems: "center",
          color: "#e2e8f0",
          cursor: "pointer",
        }}
        onClick={() => setIsDropdownOpen((prev) => !prev)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
        </svg>
      </span>

      {/* Dropdown icon on the right side of window level icon */}
      <button
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        title="Window Level presets"
        aria-label="Window Level presets"
        style={{
          background: "transparent",
          border: "none",
          color: isDropdownOpen ? "#ffffff" : "#94a3b8",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2px",
          transition: "transform 0.2s ease, color 0.15s ease",
          transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="wl-presets-menu">
          {STANDARD_WL_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`wl-preset-item ${isSelected ? "active" : ""}`}
              >
                <span>{preset.name}</span>
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginLeft: "8px" }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
