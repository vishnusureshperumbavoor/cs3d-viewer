import { useEffect, useRef, useState } from "react";
import { getRenderingEngine, RenderingEngine, Enums as CoreEnums } from "@cornerstonejs/core";
import { initCornerstone } from "../services/cornerstone-service";

type SeriesThumbnailProps = {
  imageId: string;
};

const THUMBNAIL_ENGINE_ID = "THUMBNAIL_RENDERING_ENGINE";

export default function SeriesThumbnail({ imageId }: SeriesThumbnailProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let isCancelled = false;
    const safeId = imageId.replace(/[^a-zA-Z0-9]/g, "_");
    const viewportId = `thumb_vp_${safeId}`;

    const loadAndRender = async () => {
      try {
        setLoading(true);
        setError(false);

        await initCornerstone();
        if (isCancelled) return;

        // Ensure element has non-zero layout dimensions before WebGL initialization
        if (element.clientWidth === 0 || element.clientHeight === 0) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          if (isCancelled || !element.clientWidth || !element.clientHeight) return;
        }

        let renderingEngine = getRenderingEngine(THUMBNAIL_ENGINE_ID);
        if (!renderingEngine) {
          renderingEngine = new RenderingEngine(THUMBNAIL_ENGINE_ID);
        }

        renderingEngine.enableElement({
          viewportId,
          type: CoreEnums.ViewportType.STACK,
          element,
          defaultOptions: {
            background: [0, 0, 0] as [number, number, number],
          },
        });

        const viewport = renderingEngine.getViewport(viewportId) as any;
        if (viewport) {
          try {
            await viewport.setStack([imageId]);
            if (isCancelled) {
              renderingEngine.disableElement(viewportId);
              return;
            }
            renderingEngine.resize();
            viewport.render();
            setLoading(false);
          } catch (renderErr) {
            console.warn("Thumbnail viewport render warning:", renderErr);
            if (!isCancelled) {
              setLoading(false);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load series thumbnail image:", err);
        if (!isCancelled) {
          setError(false);
          setLoading(false);
        }
      }
    };

    void loadAndRender();

    return () => {
      isCancelled = true;
      const renderingEngine = getRenderingEngine(THUMBNAIL_ENGINE_ID);
      if (renderingEngine) {
        try {
          renderingEngine.disableElement(viewportId);
        } catch (e) {
          // Ignore if already disabled
        }
      }
    };
  }, [imageId]);

  return (
    <div className="series-thumbnail-container">
      <div 
        ref={elementRef} 
        className="series-thumbnail-viewport"
        style={{ width: "100%", height: "100%", minWidth: "60px", minHeight: "60px" }}
      />
      {loading && (
        <div className="thumbnail-overlay">
          <span className="loading-spinner small" />
        </div>
      )}
      {error && (
        <div className="thumbnail-overlay error">
          <span>Failed</span>
        </div>
      )}
    </div>
  );
}
