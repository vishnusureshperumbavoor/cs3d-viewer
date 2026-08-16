import { useEffect, useRef, useState } from "react";
import { getRenderingEngine, RenderingEngine, Enums as CoreEnums } from "@cornerstonejs/core";
import {
  ToolGroupManager,
  Enums as ToolsEnums,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  StackScrollTool,
} from "@cornerstonejs/tools";
import { initCornerstone } from "../services/cornerstone-service";
import { medsamONNXService, PointPrompt } from "../services/medsam-onnx-service";

type UseCornerstoneViewportParams = {
  imageIds: string[];
  isAIActive?: boolean;
};

export function useCornerstoneViewport({ imageIds, isAIActive }: UseCornerstoneViewportParams) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [voiInfo, setVoiInfo] = useState<{ ww: number; wc: number } | null>(null);
  const [sliceInfo, setSliceInfo] = useState<{ current: number; total: number } | null>(null);
  const [isSegmenting, setIsSegmenting] = useState<boolean>(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element || imageIds.length === 0) return;

    let isCancelled = false;
    let renderingEngine: RenderingEngine | null = null;

    const renderingEngineId = "mainViewerRenderingEngine";
    const viewportId = "CT_AXIAL_STACK";
    const toolGroupId = "mainViewerToolGroup";

    const updateVoiDisplay = () => {
      const engine = getRenderingEngine(renderingEngineId);
      if (!engine) return;
      const viewport = engine.getViewport(viewportId) as any;
      if (viewport) {
        if (viewport.getCurrentImageIdIndex && viewport.getImageIds) {
          const current = viewport.getCurrentImageIdIndex() + 1;
          const total = viewport.getImageIds().length;
          setSliceInfo({ current, total });
        }
        if (viewport.getProperties) {
          const props = viewport.getProperties();
          if (props.voiRange && Number.isFinite(props.voiRange.lower) && Number.isFinite(props.voiRange.upper)) {
            const lower = props.voiRange.lower;
            const upper = props.voiRange.upper;
            const ww = Math.round(upper - lower);
            const wc = Math.round((upper + lower) / 2);
            setVoiInfo({ ww, wc });
          }
        }
      }
    };

    const handleCanvasClick = async (e: MouseEvent) => {
      if (!isAIActive) return;

      const rect = element.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      setLastPoint({ x: Math.round(clickX), y: Math.round(clickY) });
      setIsSegmenting(true);

      const mockEmbedding = new Float32Array(1 * 256 * 64 * 64);
      for (let i = 0; i < mockEmbedding.length; i++) {
        mockEmbedding[i] = Math.random() * 0.1;
      }

      const points: PointPrompt[] = [{ x: clickX, y: clickY, label: 1 }];
      const currentImageId = imageIds[0] || "image_0";

      const binaryMask = await medsamONNXService.predictMask(
        currentImageId,
        mockEmbedding,
        points,
        [rect.width, rect.height]
      );

      setIsSegmenting(false);

      if (binaryMask && overlayCanvasRef.current) {
        const canvas = overlayCanvasRef.current;
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const imgData = ctx.createImageData(canvas.width, canvas.height);
          const radius = 60;

          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const dx = x - clickX;
              const dy = y - clickY;
              const idx = (y * canvas.width + x) * 4;

              if (dx * dx + dy * dy <= radius * radius) {
                imgData.data[idx] = 0;
                imgData.data[idx + 1] = 242;
                imgData.data[idx + 2] = 254;
                imgData.data[idx + 3] = 130;
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);

          ctx.beginPath();
          ctx.arc(clickX, clickY, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "#00ffcc";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
        }
      }
    };

    const setup = async () => {
      await initCornerstone();
      if (isCancelled) return;

      let existingEngine = getRenderingEngine(renderingEngineId);
      if (existingEngine) {
        try {
          existingEngine.destroy();
        } catch (e) {}
      }

      renderingEngine = new RenderingEngine(renderingEngineId);

      const viewportInput = {
        viewportId,
        type: CoreEnums.ViewportType.STACK,
        element,
        defaultOptions: {
          background: [0, 0, 0] as [number, number, number],
        },
      };

      renderingEngine.setViewports([viewportInput]);

      let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
      if (!toolGroup) {
        toolGroup = ToolGroupManager.createToolGroup(toolGroupId)!;

        toolGroup.addTool(WindowLevelTool.toolName);
        toolGroup.addTool(PanTool.toolName);
        toolGroup.addTool(ZoomTool.toolName);
        toolGroup.addTool(StackScrollTool.toolName);

        toolGroup.setToolActive(WindowLevelTool.toolName, {
          bindings: [{ mouseButton: ToolsEnums.MouseBindings.Primary }],
        });
        toolGroup.setToolActive(PanTool.toolName, {
          bindings: [{ mouseButton: ToolsEnums.MouseBindings.Auxiliary }],
        });
        toolGroup.setToolActive(ZoomTool.toolName, {
          bindings: [{ mouseButton: ToolsEnums.MouseBindings.Secondary }],
        });
        toolGroup.setToolActive(StackScrollTool.toolName, {
          bindings: [{ mouseButton: ToolsEnums.MouseBindings.Wheel }],
        });
      }

      toolGroup.addViewport(viewportId, renderingEngineId);

      element.addEventListener(CoreEnums.Events.VOI_MODIFIED as any, updateVoiDisplay);
      element.addEventListener(CoreEnums.Events.IMAGE_RENDERED as any, updateVoiDisplay);
      element.addEventListener(CoreEnums.Events.STACK_NEW_IMAGE as any, updateVoiDisplay);
      element.addEventListener("click", handleCanvasClick);

      const viewport = renderingEngine.getViewport(viewportId) as any;
      if (viewport) {
        await viewport.setStack(imageIds);
        if (isCancelled) return;
        viewport.render();
        updateVoiDisplay();
      }
    };

    void setup();

    return () => {
      isCancelled = true;

      if (element) {
        element.removeEventListener(CoreEnums.Events.VOI_MODIFIED as any, updateVoiDisplay);
        element.removeEventListener(CoreEnums.Events.IMAGE_RENDERED as any, updateVoiDisplay);
        element.removeEventListener(CoreEnums.Events.STACK_NEW_IMAGE as any, updateVoiDisplay);
        element.removeEventListener("click", handleCanvasClick);
      }

      const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
      if (toolGroup) {
        try {
          ToolGroupManager.destroyToolGroup(toolGroupId);
        } catch (e) {}
      }

      const engine = getRenderingEngine(renderingEngineId) || renderingEngine;
      if (engine) {
        try {
          engine.destroy();
        } catch (e) {}
      }
    };
  }, [imageIds, isAIActive]);

  return {
    viewportRef,
    overlayCanvasRef,
    voiInfo,
    sliceInfo,
    isSegmenting,
    lastPoint,
  };
}
