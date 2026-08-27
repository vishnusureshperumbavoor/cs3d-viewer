import { useState } from "react";
import { getRenderingEngine } from "@cornerstonejs/core";

export type WLPreset = {
  id: string;
  name: string;
  ww?: number;
  wc?: number;
};

export const STANDARD_WL_PRESETS: WLPreset[] = [
  { id: "default", name: "DICOM Default" },
  { id: "soft_tissue", name: "Soft Tissue (WW: 400, WL: 40)", ww: 400, wc: 40 },
  { id: "bone", name: "Bone (WW: 2000, WL: 500)", ww: 2000, wc: 500 },
  { id: "lung", name: "Lung (WW: 1500, WL: -600)", ww: 1500, wc: -600 },
  { id: "brain", name: "Brain (WW: 80, WL: 40)", ww: 80, wc: 40 },
  { id: "arterial", name: "Angio / Arterial (WW: 600, WL: 300)", ww: 600, wc: 300 },
  { id: "custom_650_1150", name: "Custom (WW: 650, WL: 1150)", ww: 650, wc: 1150 },
];

export function WLPresetToolbar() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("custom_650_1150");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPresetId(presetId);

    const renderingEngine = getRenderingEngine("mainViewerRenderingEngine");
    if (!renderingEngine) return;

    const viewport = renderingEngine.getViewport("CT_AXIAL_STACK") as any;
    if (!viewport) return;

    const preset = STANDARD_WL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (preset.id === "default") {
      viewport.resetProperties();
      viewport.render();
    } else if (preset.ww !== undefined && preset.wc !== undefined) {
      const lower = preset.wc - preset.ww / 2;
      const upper = preset.wc + preset.ww / 2;

      viewport.setProperties({
        voiRange: { lower, upper },
      });
      viewport.render();
    }
  };

  return (
    <div
      className="wl-preset-dropdown-container"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(15, 23, 42, 0.8)",
        padding: "4px 10px",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      }}
    >
      <span
        title="Window Width / Window Level (WW/WL)"
        style={{
          display: "flex",
          alignItems: "center",
          color: "#38bdf8",
          cursor: "pointer",
        }}
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

      <select
        id="wl-preset-select"
        value={selectedPresetId}
        onChange={handleChange}
        style={{
          background: "#1e293b",
          color: "#38bdf8",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          borderRadius: "6px",
          padding: "5px 10px",
          fontSize: "0.82rem",
          fontWeight: 600,
          outline: "none",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
        }}
      >
        {STANDARD_WL_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id} style={{ background: "#0f172a", color: "#e2e8f0" }}>
            {preset.name}
          </option>
        ))}
      </select>
    </div>
  );
}
