import { useEffect, useRef, useState } from "react";
import { getRenderingEngine, RenderingEngine, Enums as CoreEnums, metaData } from "@cornerstonejs/core";
import {
  ToolGroupManager,
  Enums as ToolsEnums,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  StackScrollTool,
} from "@cornerstonejs/tools";
import { initCornerstone } from "../services/cornerstone-service";
import { DicomSegData } from "../services/dicom-seg-service";

type UseCornerstoneViewportParams = {
  imageIds: string[];
  segData?: DicomSegData | null;
  segmentVisibility?: Record<number, boolean>;
  segmentOpacity?: number;
};

export function useCornerstoneViewport({
  imageIds,
  segData,
  segmentVisibility,
  segmentOpacity = 0.5,
}: UseCornerstoneViewportParams) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const segDataRef = useRef<DicomSegData | null>(segData || null);
  const segVisibilityRef = useRef<Record<number, boolean> | undefined>(segmentVisibility);
  const segOpacityRef = useRef<number>(segmentOpacity);

  const [voiInfo, setVoiInfo] = useState<{ ww: number; wc: number } | null>(null);
  const [sliceInfo, setSliceInfo] = useState<{ current: number; total: number } | null>(null);


  const renderingEngineId = "mainViewerRenderingEngine";
  const viewportId = "CT_AXIAL_STACK";
  const toolGroupId = "mainViewerToolGroup";

  // Renders 2D segmentation mask overlay aligned with the current CT slice
  const renderSegOverlay = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const engine = getRenderingEngine(renderingEngineId);
    if (!engine) return;
    const viewport = engine.getViewport(viewportId) as any;
    if (!viewport || !viewport.canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height))) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentSegData = segDataRef.current;
    if (!currentSegData || !currentSegData.sliceMaskMap) return;

    const currentIndex = viewport.getCurrentImageIdIndex ? viewport.getCurrentImageIdIndex() : 0;
    const currentImageId = imageIds[currentIndex];
    if (!currentImageId) return;

    const match = currentImageId.match(/instances\/([^/]+)/);
    const sopInstanceUid = match ? match[1] : "";
    if (!sopInstanceUid) return;

    const sliceMasks = currentSegData.sliceMaskMap.get(sopInstanceUid);
    if (!sliceMasks) return;

    const imagePlane = metaData.get("imagePlaneModule", currentImageId);
    if (!imagePlane) return;

    const { imagePositionPatient, rowCosines, columnCosines, pixelSpacing, rows, columns } = imagePlane;
    const [rowSpacing, colSpacing] = pixelSpacing || [1, 1];

    // Compute 3 points in patient coordinates: (0,0), (cols,0), and (0,numRows)
    const p00 = [
      Number(imagePositionPatient[0]) || 0,
      Number(imagePositionPatient[1]) || 0,
      Number(imagePositionPatient[2]) || 0,
    ];
    const rCos = [
      Number(rowCosines[0]) || 1,
      Number(rowCosines[1]) || 0,
      Number(rowCosines[2]) || 0,
    ];
    const cCos = [
      Number(columnCosines[0]) || 0,
      Number(columnCosines[1]) || 1,
      Number(columnCosines[2]) || 0,
    ];
    const rSp = Number(rowSpacing) || 1;
    const cSp = Number(colSpacing) || 1;
    const cols = Number(columns) || 512;
    const numRows = Number(rows) || 512;

    const p10 = [
      p00[0] + cols * cSp * rCos[0],
      p00[1] + cols * cSp * rCos[1],
      p00[2] + cols * cSp * rCos[2],
    ];
    const p01 = [
      p00[0] + numRows * rSp * cCos[0],
      p00[1] + numRows * rSp * cCos[1],
      p00[2] + numRows * rSp * cCos[2],
    ];

    const c00 = viewport.worldToCanvas(p00);
    const c10 = viewport.worldToCanvas(p10);
    const c01 = viewport.worldToCanvas(p01);

    if (!c00 || !c10 || !c01) return;
    if (!Number.isFinite(c00[0]) || !Number.isFinite(c10[0]) || !Number.isFinite(c01[0])) return;

    const a = (c10[0] - c00[0]) / cols;
    const b = (c10[1] - c00[1]) / cols;
    const c = (c01[0] - c00[0]) / numRows;
    const d = (c01[1] - c00[1]) / numRows;
    const e = c00[0];
    const f = c00[1];

    // Reuse offscreen canvas for blitting mask
    let offscreen = offscreenCanvasRef.current;
    if (!offscreen) {
      offscreen = document.createElement("canvas");
      offscreenCanvasRef.current = offscreen;
    }
    if (offscreen.width !== cols || offscreen.height !== numRows) {
      offscreen.width = cols;
      offscreen.height = numRows;
    }

    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    const imgData = offCtx.createImageData(cols, numRows);
    const data = imgData.data;
    const numPixels = cols * numRows;
    let hasAnyPixel = false;
    const currentOpacity = segOpacityRef.current ?? 0.5;
    const alphaByte = Math.round(currentOpacity * 255);
    const currentVis = segVisibilityRef.current;

    currentSegData.segments.forEach((seg) => {
      const isVisible = currentVis ? currentVis[seg.segmentNumber] ?? true : true;
      if (!isVisible) return;

      const mask = sliceMasks[seg.segmentNumber];
      if (!mask) return;

      const [r, g, b] = seg.rgba;
      for (let p = 0; p < numPixels; p++) {
        if (mask[p] > 0) {
          const idx = p * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = alphaByte;
          hasAnyPixel = true;
        }
      }
    });

    if (hasAnyPixel) {
      offCtx.putImageData(imgData, 0, 0);
      ctx.save();
      ctx.setTransform(a, b, c, d, e, f);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();
    }
  };

  // Keep refs updated and re-render segmentation overlay
  useEffect(() => {
    segDataRef.current = segData || null;
    segVisibilityRef.current = segmentVisibility;
    segOpacityRef.current = segmentOpacity;
    renderSegOverlay();
  }, [segData, segmentVisibility, segmentOpacity]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element || imageIds.length === 0) return;

    let isCancelled = false;
    let renderingEngine: RenderingEngine | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const updateVoiDisplay = () => {
      renderSegOverlay();
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

    const setup = async () => {
      await initCornerstone();
      if (isCancelled) return;

      let existingEngine = getRenderingEngine(renderingEngineId);
      if (existingEngine) {
        try {
          existingEngine.destroy();
        } catch (e) { }
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
      element.addEventListener(CoreEnums.Events.CAMERA_MODIFIED as any, updateVoiDisplay);

      resizeObserver = new ResizeObserver(() => {
        const engine = getRenderingEngine(renderingEngineId);
        if (engine) {
          engine.resize(true, true);
          const vp = engine.getViewport(viewportId) as any;
          if (vp) {
            vp.render();
          }
        }
        updateVoiDisplay();
      });
      resizeObserver.observe(element);

      const viewport = renderingEngine.getViewport(viewportId) as any;
      if (viewport) {
        await viewport.setStack(imageIds);
        if (isCancelled) return;

        const defaultWW = 650;
        const defaultWC = 1150;
        viewport.setProperties({
          voiRange: {
            lower: defaultWC - defaultWW / 2,
            upper: defaultWC + defaultWW / 2,
          },
        });

        viewport.render();
        updateVoiDisplay();
      }
    };


    void setup();

    return () => {
      isCancelled = true;

      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (element) {
        element.removeEventListener(CoreEnums.Events.VOI_MODIFIED as any, updateVoiDisplay);
        element.removeEventListener(CoreEnums.Events.IMAGE_RENDERED as any, updateVoiDisplay);
        element.removeEventListener(CoreEnums.Events.STACK_NEW_IMAGE as any, updateVoiDisplay);
        element.removeEventListener(CoreEnums.Events.CAMERA_MODIFIED as any, updateVoiDisplay);
      }

      const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
      if (toolGroup) {
        try {
          ToolGroupManager.destroyToolGroup(toolGroupId);
        } catch (e) { }
      }

      const engine = getRenderingEngine(renderingEngineId) || renderingEngine;
      if (engine) {
        try {
          engine.destroy();
        } catch (e) { }
      }
    };
  }, [imageIds]);

  return {
    viewportRef,
    overlayCanvasRef,
    voiInfo,
    sliceInfo,
  };
}

