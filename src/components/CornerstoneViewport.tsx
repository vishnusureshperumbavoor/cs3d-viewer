import { useCornerstoneViewport } from "../hooks/useCornerstoneViewport";
import { ViewportOverlayCanvas } from "./viewport/ViewportOverlayCanvas";
import { ViewportHUDOverlay } from "./viewport/ViewportHUDOverlay";

import { DicomSegData } from "../services/dicom-seg-service";

type CornerstoneViewportProps = {
  imageIds: string[];
  isAIActive?: boolean;
  segData?: DicomSegData | null;
  segmentVisibility?: Record<number, boolean>;
  segmentOpacity?: number;
};

export default function CornerstoneViewport({
  imageIds,
  isAIActive,
  segData,
  segmentVisibility,
  segmentOpacity,
}: CornerstoneViewportProps) {
  const {
    viewportRef,
    overlayCanvasRef,
    voiInfo,
    sliceInfo,
    isSegmenting,
    lastPoint,
  } = useCornerstoneViewport({
    imageIds,
    isAIActive,
    segData,
    segmentVisibility,
    segmentOpacity,
  });

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
