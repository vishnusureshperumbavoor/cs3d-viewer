import { useState } from "react";
import { medsamONNXService } from "../services/medsam-onnx-service";

type AIToolbarProps = {
  isAIActive: boolean;
  onToggleAI: (active: boolean) => void;
};

export default function AIToolbar({ isAIActive, onToggleAI }: AIToolbarProps) {
  const [modelStatus, setModelStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const handleToggle = async () => {
    if (!isAIActive) {
      if (modelStatus === "idle") {
        setModelStatus("loading");
        const ok = await medsamONNXService.init();
        if (ok) {
          setModelStatus("ready");
          onToggleAI(true);
        } else {
          setModelStatus("error");
        }
      } else {
        onToggleAI(true);
      }
    } else {
      onToggleAI(false);
    }
  };

  return (
    <div className="ai-toolbar" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <button
        onClick={handleToggle}
        className={`ai-segment-btn ${isAIActive ? "active" : ""}`}
        style={{
          height: "42px",
          boxSizing: "border-box",
          padding: "0 14px",
          borderRadius: "8px",
          background: isAIActive ? "rgba(255, 255, 255, 0.16)" : "rgba(20, 20, 20, 0.7)",
          color: "#ffffff",
          border: isAIActive ? "1px solid rgba(255, 255, 255, 0.35)" : "1px solid var(--border)",
          fontWeight: 600,
          fontSize: "0.83rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s ease",
        }}
      >
        <span>⚡ MedSAM AI</span>
        {modelStatus === "loading" && <span className="loading-spinner small" />}
      </button>
      {isAIActive && (
        <span style={{ fontSize: "0.8rem", color: "#f1f5f9", background: "rgba(255, 255, 255, 0.1)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.2)" }}>
          Click target on slice
        </span>
      )}
    </div>
  );
}
