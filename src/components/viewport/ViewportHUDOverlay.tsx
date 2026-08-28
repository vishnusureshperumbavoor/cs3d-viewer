type ViewportHUDOverlayProps = {
  voiInfo: { ww: number; wc: number } | null;
  sliceInfo: { current: number; total: number } | null;
};

export function ViewportHUDOverlay({
  voiInfo,
  sliceInfo,
}: ViewportHUDOverlayProps) {
  return (
    <>
      {(sliceInfo || voiInfo) && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#ffffff",
            textShadow: "1px 1px 2px #000, -1px -1px 2px #000, 1px -1px 2px #000, -1px 1px 2px #000",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 10,
          }}
        >
          {sliceInfo && (
            <div>
              Slice: {sliceInfo.current}/{sliceInfo.total}
            </div>
          )}
          {voiInfo && (
            <div>
              WW: {voiInfo.ww} WL: {voiInfo.wc}
            </div>
          )}
        </div>
      )}
    </>
  );
}

