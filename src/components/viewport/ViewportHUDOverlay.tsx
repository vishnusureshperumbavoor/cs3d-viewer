type ViewportHUDOverlayProps = {
  voiInfo: { ww: number; wc: number } | null;
  sliceInfo: { current: number; total: number } | null;
  isSegmenting: boolean;
  lastPoint: { x: number; y: number } | null;
  isAIActive?: boolean;
};

export function ViewportHUDOverlay({
  voiInfo,
  sliceInfo,
  isSegmenting,
  lastPoint,
  isAIActive,
}: ViewportHUDOverlayProps) {
  return (
    <>
      {isSegmenting && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "rgba(15, 23, 42, 0.85)",
            color: "#00ffcc",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "0.85rem",
            fontWeight: 600,
            border: "1px solid #00ffcc",
            zIndex: 10,
          }}
        >
          ⚡ SAM 2 Segmenting Target...
        </div>
      )}

      {lastPoint && isAIActive && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            background: "rgba(15, 23, 42, 0.75)",
            color: "#e2e8f0",
            padding: "4px 10px",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "0.8rem",
            zIndex: 10,
          }}
        >
          Prompt: ({lastPoint.x}, {lastPoint.y})
        </div>
      )}

      {(sliceInfo || voiInfo) && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(6px)",
            color: "#38bdf8",
            padding: "5px 12px",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            fontWeight: 600,
            pointerEvents: "none",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
            zIndex: 10,
          }}
        >
          {sliceInfo && (
            <span style={{ color: "#34d399", marginRight: "8px" }}>
              Slice: {sliceInfo.current}/{sliceInfo.total}
            </span>
          )}
          {voiInfo && (
            <span>
              WW: {voiInfo.ww} | WL: {voiInfo.wc}
            </span>
          )}
        </div>
      )}
    </>
  );
}
