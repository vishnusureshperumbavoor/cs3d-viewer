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
          padding: "6px 14px",
          borderRadius: "6px",
          background: isAIActive ? "linear-gradient(135deg, #6366f1, #a855f7)" : "#1e293b",
          color: "#ffffff",
          border: isAIActive ? "1px solid #c084fc" : "1px solid #334155",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s ease",
          boxShadow: isAIActive ? "0 0 12px rgba(168, 85, 247, 0.4)" : "none",
        }}
      >
        <span>⚡ MedSAM AI</span>
        {modelStatus === "loading" && <span className="loading-spinner small" />}
      </button>
      {isAIActive && (
        <span style={{ fontSize: "0.8rem", color: "#a7f3d0", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
          Click target on slice
        </span>
      )}
    </div>
  );
}
