import { useCornerstoneViewport } from "../hooks/useCornerstoneViewport";
import { ViewportOverlayCanvas } from "./viewport/ViewportOverlayCanvas";
import { ViewportHUDOverlay } from "./viewport/ViewportHUDOverlay";

type CornerstoneViewportProps = {
  imageIds: string[];
  isAIActive?: boolean;
};

export default function CornerstoneViewport({ imageIds, isAIActive }: CornerstoneViewportProps) {
  const {
    viewportRef,
    overlayCanvasRef,
    voiInfo,
    sliceInfo,
    isSegmenting,
    lastPoint,
  } = useCornerstoneViewport({ imageIds, isAIActive });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        className="cornerstone-viewport"
        ref={viewportRef}
        style={{ width: "100%", height: "100%" }}
      />
      
      <ViewportOverlayCanvas ref={overlayCanvasRef} />

      <ViewportHUDOverlay
        voiInfo={voiInfo}
        sliceInfo={sliceInfo}
        isSegmenting={isSegmenting}
        lastPoint={lastPoint}
        isAIActive={isAIActive}
      />
    </div>
  );
}
