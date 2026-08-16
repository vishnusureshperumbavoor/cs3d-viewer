import { forwardRef } from "react";

export const ViewportOverlayCanvas = forwardRef<HTMLCanvasElement>((_, ref) => {
  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
        zIndex: 5,
      }}
    />
  );
});

ViewportOverlayCanvas.displayName = "ViewportOverlayCanvas";
