import { useEffect, useRef, useState } from "react";
import { imageLoader } from "@cornerstonejs/core";
import { initCornerstone } from "../services/cornerstone-service";

type SeriesThumbnailProps = {
  imageId: string;
};

export default function SeriesThumbnail({ imageId }: SeriesThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !imageId) return;

    const renderThumbnail = async () => {
      try {
        setLoading(true);
        setError(false);

        await initCornerstone();
        if (isCancelled) return;

        const image = (await imageLoader.loadAndCacheImage(imageId)) as any;
        if (isCancelled) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rows = image.rows || image.height;
        const columns = image.columns || image.width;
        const pixelData = typeof image.getPixelData === "function" ? image.getPixelData() : image.pixelData;

        if (!pixelData || !rows || !columns) {
          setError(true);
          setLoading(false);
          return;
        }

        canvas.width = columns;
        canvas.height = rows;

        const windowWidth = Array.isArray(image.windowWidth) ? image.windowWidth[0] : (image.windowWidth || 400);
        const windowCenter = Array.isArray(image.windowCenter) ? image.windowCenter[0] : (image.windowCenter || 40);
        const slope = image.slope ?? 1;
        const intercept = image.intercept ?? 0;

        const minVal = windowCenter - 0.5 - (windowWidth - 1) / 2;
        const maxVal = windowCenter - 0.5 + (windowWidth - 1) / 2;
        const range = maxVal - minVal || 1;

        const imgData = ctx.createImageData(columns, rows);
        const data = imgData.data;

        for (let i = 0; i < pixelData.length; i++) {
          const rawVal = pixelData[i] * slope + intercept;
          let intensity = ((rawVal - minVal) / range) * 255;
          if (intensity < 0) intensity = 0;
          if (intensity > 255) intensity = 255;

          const idx = i * 4;
          data[idx] = intensity;
          data[idx + 1] = intensity;
          data[idx + 2] = intensity;
          data[idx + 3] = 255;
        }

        ctx.putImageData(imgData, 0, 0);
        setLoading(false);
      } catch (err) {
        if (!isCancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    void renderThumbnail();

    return () => {
      isCancelled = true;
    };
  }, [imageId]);

  return (
    <div className="series-thumbnail-container">
      <canvas
        ref={canvasRef}
        className="series-thumbnail-viewport"
        style={{
          width: "100%",
          height: "100%",
          minWidth: "60px",
          minHeight: "60px",
          objectFit: "cover",
          display: error ? "none" : "block",
        }}
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
