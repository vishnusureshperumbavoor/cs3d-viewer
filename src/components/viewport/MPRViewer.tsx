import { useEffect, useRef, useState } from "react";
import {
  RenderingEngine,
  getRenderingEngine,
  Enums as CoreEnums,
  volumeLoader,
  setVolumesForViewports,
  cache,
} from "@cornerstonejs/core";
import {
  ToolGroupManager,
  Enums as ToolEnums,
  ZoomTool,
  PanTool,
  WindowLevelTool,
  StackScrollTool,
  TrackballRotateTool,
} from "@cornerstonejs/tools";
import { initCornerstone } from "../../services/cornerstone-service";
import type { DicomSegData } from "../../services/dicom-seg-service";
import { useMPRSegmentation } from "../../hooks/useMPRSegmentation";
import {
  RENDERING_ENGINE_ID,
  MPR_TOOLGROUP_ID,
  VOLUME_3D_TOOLGROUP_ID,
  DEFAULT_WW,
  DEFAULT_WL,
  DEFAULT_VOI_RANGE,
  MPR_VIEWPORT_IDS,
  apply3DVolumePreset,
} from "../../utils/mpr-utils";

export { resetMPRCameras } from "../../utils/mpr-utils";

interface MPRViewerProps {
  imageIds: string[];
  seriesUid: string | null;
  active3DPreset?: string;
  segData?: DicomSegData | null;
  segmentVisibility?: Record<number, boolean>;
  segmentOpacity?: number;
}

interface ViewportHUDState {
  sliceIndex: number;
  numSlices: number;
  ww: number;
  wl: number;
}

export function MPRViewer({
  imageIds,
  seriesUid,
  active3DPreset = "CT-AAA",
  segData,
  segmentVisibility,
  segmentOpacity = 0.5,
}: MPRViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const volume3dRef = useRef<HTMLDivElement>(null);

  const safeSeries = seriesUid ? seriesUid.replace(/[^a-zA-Z0-9]/g, "_") : "unknown";
  const volumeId = `cornerstoneStreamingImageVolume:CT_VOL_${safeSeries}`;

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [volumeReady, setVolumeReady] = useState(false);

  const defaultHUD = (numSlices?: number): ViewportHUDState => ({
    sliceIndex: 1,
    numSlices: numSlices ?? 512,
    ww: DEFAULT_WW,
    wl: DEFAULT_WL,
  });

  const [axialHUD, setAxialHUD] = useState<ViewportHUDState>(defaultHUD(imageIds.length));
  const [sagittalHUD, setSagittalHUD] = useState<ViewportHUDState>(defaultHUD());
  const [coronalHUD, setCoronalHUD] = useState<ViewportHUDState>(defaultHUD());
  const [maximizedViewport, setMaximizedViewport] = useState<string | null>(null);

  const handleDoubleClick = (viewportId: string) => {
    setMaximizedViewport((prev) => (prev === viewportId ? null : viewportId));
  };

  useMPRSegmentation(segData, segmentVisibility, seriesUid, volumeId, volumeReady, segmentOpacity);

  // ── Handle resizing and render when maximized viewport toggles ───────────
  useEffect(() => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (engine) {
      requestAnimationFrame(() => {
        try {
          engine.resize(true, true);
          if (maximizedViewport) {
            engine.renderViewport(maximizedViewport);
          } else {
            engine.renderViewports([...MPR_VIEWPORT_IDS, "mpr-3d"]);
          }
        } catch (_) { }
      });
    }
  }, [maximizedViewport]);

  useEffect(() => {
    if (!active3DPreset) return;
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    const vp3D = engine?.getViewport("mpr-3d");
    if (vp3D) {
      apply3DVolumePreset(vp3D, active3DPreset, volumeId);
    }
  }, [active3DPreset, volumeId]);

  useEffect(() => {
    if (!imageIds || imageIds.length === 0 || !seriesUid) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setVolumeReady(false);

    const updateHUD = (
      viewportId: string,
      setHUD: React.Dispatch<React.SetStateAction<ViewportHUDState>>
    ) => {
      const eng = getRenderingEngine(RENDERING_ENGINE_ID);
      if (!eng) return;
      const vp = eng.getViewport(viewportId) as any;
      if (!vp) return;

      let currentSlice = 1;
      let totalSlices = viewportId === "mpr-axial" ? imageIds.length : 512;
      try {
        if (typeof vp.getSliceIndex === "function") currentSlice = vp.getSliceIndex() + 1;
        if (typeof vp.getNumberOfSlices === "function") {
          const n = vp.getNumberOfSlices();
          if (n && n > 0) totalSlices = n;
        }
      } catch (_) { }

      let ww = DEFAULT_WW;
      let wl = DEFAULT_WL;
      try {
        const props = typeof vp.getProperties === "function" ? vp.getProperties() : null;
        if (props?.voiRange) {
          ww = Math.round(props.voiRange.upper - props.voiRange.lower);
          wl = Math.round((props.voiRange.upper + props.voiRange.lower) / 2);
        }
      } catch (_) { }

      setHUD({
        sliceIndex: currentSlice > 0 ? currentSlice : 1,
        numSlices: totalSlices > 0 ? totalSlices : 1,
        ww,
        wl,
      });
    };

    const setup = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingProgress(10);

        await initCornerstone();
        if (isCancelled) return;

        const refs = [axialRef, sagittalRef, coronalRef, volume3dRef];
        for (const r of refs) {
          if (!r.current || r.current.clientWidth === 0 || r.current.clientHeight === 0) {
            await new Promise((res) => requestAnimationFrame(res));
            if (isCancelled) return;
          }
        }

        setLoadingProgress(30);

        let renderingEngine = getRenderingEngine(RENDERING_ENGINE_ID);
        if (!renderingEngine) {
          renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
        }

        renderingEngine.setViewports([
          {
            viewportId: "mpr-axial",
            type: CoreEnums.ViewportType.ORTHOGRAPHIC,
            element: axialRef.current!,
            defaultOptions: {
              orientation: CoreEnums.OrientationAxis.AXIAL,
              background: [0, 0, 0] as [number, number, number],
            },
          },
          {
            viewportId: "mpr-sagittal",
            type: CoreEnums.ViewportType.ORTHOGRAPHIC,
            element: sagittalRef.current!,
            defaultOptions: {
              orientation: CoreEnums.OrientationAxis.SAGITTAL,
              background: [0, 0, 0] as [number, number, number],
            },
          },
          {
            viewportId: "mpr-coronal",
            type: CoreEnums.ViewportType.ORTHOGRAPHIC,
            element: coronalRef.current!,
            defaultOptions: {
              orientation: CoreEnums.OrientationAxis.CORONAL,
              background: [0, 0, 0] as [number, number, number],
            },
          },
          {
            viewportId: "mpr-3d",
            type: CoreEnums.ViewportType.VOLUME_3D,
            element: volume3dRef.current!,
            defaultOptions: {
              orientation: CoreEnums.OrientationAxis.CORONAL,
              background: [0.02, 0.02, 0.03] as [number, number, number],
            },
          },
        ]);

        if (isCancelled) return;
        setLoadingProgress(50);

        // ── Tool Groups ───────────────────────────────────────────────────
        let toolGroup = ToolGroupManager.getToolGroup(MPR_TOOLGROUP_ID);
        if (!toolGroup) {
          toolGroup = ToolGroupManager.createToolGroup(MPR_TOOLGROUP_ID);
          if (toolGroup) {
            toolGroup.addTool(WindowLevelTool.toolName);
            toolGroup.addTool(PanTool.toolName);
            toolGroup.addTool(ZoomTool.toolName);
            toolGroup.addTool(StackScrollTool.toolName);
            toolGroup.setToolActive(WindowLevelTool.toolName, {
              bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
            });
            toolGroup.setToolActive(PanTool.toolName, {
              bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
            });
            toolGroup.setToolActive(ZoomTool.toolName, {
              bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
            });
            toolGroup.setToolActive(StackScrollTool.toolName, {
              bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }],
            });
          }
        }
        MPR_VIEWPORT_IDS.forEach((id) =>
          toolGroup?.addViewport(id, RENDERING_ENGINE_ID)
        );

        let toolGroup3D = ToolGroupManager.getToolGroup(VOLUME_3D_TOOLGROUP_ID);
        if (!toolGroup3D) {
          toolGroup3D = ToolGroupManager.createToolGroup(VOLUME_3D_TOOLGROUP_ID);
          if (toolGroup3D) {
            toolGroup3D.addTool(TrackballRotateTool.toolName);
            toolGroup3D.addTool(PanTool.toolName);
            toolGroup3D.addTool(ZoomTool.toolName);
            toolGroup3D.setToolActive(TrackballRotateTool.toolName, {
              bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
            });
            toolGroup3D.setToolActive(PanTool.toolName, {
              bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
            });
            toolGroup3D.setToolActive(ZoomTool.toolName, {
              bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
            });
          }
        }
        toolGroup3D?.addViewport("mpr-3d", RENDERING_ENGINE_ID);

        setLoadingProgress(70);

        // ── CT Volume ─────────────────────────────────────────────────────
        let volume = cache.getVolume(volumeId);
        if (!volume) {
          volume = await volumeLoader.createAndCacheVolume(volumeId, { imageIds });
        }

        if (isCancelled) return;
        setLoadingProgress(85);

        volume.load(() => { });
        if (isCancelled) return;

        await setVolumesForViewports(renderingEngine, [{ volumeId }], [
          ...MPR_VIEWPORT_IDS,
          "mpr-3d",
        ]);

        if (isCancelled) return;

        // Signal the segmentation hook that the volume is ready
        setVolumeReady(true);

        const engine = getRenderingEngine(RENDERING_ENGINE_ID);
        if (!engine) return;

        // Apply default window / level to the 3 orthographic viewports
        MPR_VIEWPORT_IDS.forEach((id) => {
          const vp = engine.getViewport(id) as any;
          if (vp && typeof vp.setProperties === "function") {
            vp.setProperties({ voiRange: DEFAULT_VOI_RANGE }, volumeId);
          }
        });

        // Set 3D viewport to Coronal (Anterior) and the active preset
        const vp3D = engine.getViewport("mpr-3d") as any;
        if (vp3D) {
          if (typeof vp3D.applyViewOrientation === "function") {
            vp3D.applyViewOrientation(CoreEnums.OrientationAxis.CORONAL);
          }
          if (typeof vp3D.setPreset === "function") {
            vp3D.setPreset(active3DPreset);
          }
        }

        engine.renderViewports([...MPR_VIEWPORT_IDS, "mpr-3d"]);

        updateHUD("mpr-axial", setAxialHUD);
        updateHUD("mpr-sagittal", setSagittalHUD);
        updateHUD("mpr-coronal", setCoronalHUD);

        setIsLoading(false);
      } catch (err: any) {
        console.error("Failed to initialize MPR + 3D viewports:", err);
        if (!isCancelled) {
          setError(err.message || "Failed to load MPR volume.");
          setIsLoading(false);
        }
      }
    };

    void setup();

    // ── HUD event listeners ───────────────────────────────────────────────
    const onAxialChange = () => updateHUD("mpr-axial", setAxialHUD);
    const onSagittalChange = () => updateHUD("mpr-sagittal", setSagittalHUD);
    const onCoronalChange = () => updateHUD("mpr-coronal", setCoronalHUD);

    const elAxial = axialRef.current;
    const elSag = sagittalRef.current;
    const elCor = coronalRef.current;

    elAxial?.addEventListener(CoreEnums.Events.CAMERA_MODIFIED, onAxialChange);
    elAxial?.addEventListener(CoreEnums.Events.VOI_MODIFIED, onAxialChange);
    elSag?.addEventListener(CoreEnums.Events.CAMERA_MODIFIED, onSagittalChange);
    elSag?.addEventListener(CoreEnums.Events.VOI_MODIFIED, onSagittalChange);
    elCor?.addEventListener(CoreEnums.Events.CAMERA_MODIFIED, onCoronalChange);
    elCor?.addEventListener(CoreEnums.Events.VOI_MODIFIED, onCoronalChange);

    // ── Resize observer ───────────────────────────────────────────────────
    const container = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        const engine = getRenderingEngine(RENDERING_ENGINE_ID);
        if (engine) {
          try { engine.resize(true, true); } catch (_) { }
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      isCancelled = true;
      resizeObserver?.disconnect();

      elAxial?.removeEventListener(CoreEnums.Events.CAMERA_MODIFIED, onAxialChange);
      elAxial?.removeEventListener(CoreEnums.Events.VOI_MODIFIED, onAxialChange);
      elSag?.removeEventListener(CoreEnums.Events.CAMERA_MODIFIED, onSagittalChange);
      elSag?.removeEventListener(CoreEnums.Events.VOI_MODIFIED, onSagittalChange);
      elCor?.removeEventListener(CoreEnums.Events.CAMERA_MODIFIED, onCoronalChange);
      elCor?.removeEventListener(CoreEnums.Events.VOI_MODIFIED, onCoronalChange);

      const engine = getRenderingEngine(RENDERING_ENGINE_ID);
      if (engine) {
        try {
          engine.disableElement("mpr-axial");
          engine.disableElement("mpr-sagittal");
          engine.disableElement("mpr-coronal");
          engine.disableElement("mpr-3d");
        } catch (_) { }
      }
    };
  }, [imageIds, seriesUid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="mpr-main-container" ref={containerRef}>
      {isLoading && (
        <div className="mpr-loading-overlay">
          <div className="mpr-loading-card">
            <span className="loading-spinner large" />
            <div className="mpr-loading-text">
              <strong>Reconstructing 3D Volume...</strong>
              <span>Streaming {imageIds.length} CT slices for MPR</span>
            </div>
            <div className="mpr-progress-track">
              <div className="mpr-progress-fill" style={{ width: `${loadingProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mpr-error-overlay">
          <div className="mpr-error-card">
            <span style={{ fontSize: "1.5rem" }}>⚠️</span>
            <div>
              <strong>Reconstruction Error</strong>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2×2 Viewport Grid (or Fullscreen on Double Click) */}
      <div className={`mpr-grid ${maximizedViewport ? "maximized" : ""}`}>
        {/* Quadrant 1: AXIAL */}
        <div
          className={`mpr-cell ${maximizedViewport === "mpr-axial" ? "is-maximized" : maximizedViewport ? "is-hidden" : ""}`}
          onDoubleClick={() => handleDoubleClick("mpr-axial")}
        >
          <div className="mpr-hud-overlay">
            <div className="mpr-hud-title">AXIAL</div>
            <div className="mpr-hud-row">Slice: {axialHUD.sliceIndex}/{axialHUD.numSlices}</div>
            <div className="mpr-hud-row">WW: {axialHUD.ww} WL: {axialHUD.wl}</div>
          </div>
          <div ref={axialRef} className="mpr-viewport-canvas" />
        </div>

        {/* Quadrant 2: SAGITTAL */}
        <div
          className={`mpr-cell ${maximizedViewport === "mpr-sagittal" ? "is-maximized" : maximizedViewport ? "is-hidden" : ""}`}
          onDoubleClick={() => handleDoubleClick("mpr-sagittal")}
        >
          <div className="mpr-hud-overlay">
            <div className="mpr-hud-title">SAGITTAL</div>
            <div className="mpr-hud-row">Slice: {sagittalHUD.sliceIndex}/{sagittalHUD.numSlices}</div>
            <div className="mpr-hud-row">WW: {sagittalHUD.ww} WL: {sagittalHUD.wl}</div>
          </div>
          <div ref={sagittalRef} className="mpr-viewport-canvas" />
        </div>

        {/* Quadrant 3: CORONAL */}
        <div
          className={`mpr-cell ${maximizedViewport === "mpr-coronal" ? "is-maximized" : maximizedViewport ? "is-hidden" : ""}`}
          onDoubleClick={() => handleDoubleClick("mpr-coronal")}
        >
          <div className="mpr-hud-overlay">
            <div className="mpr-hud-title">CORONAL</div>
            <div className="mpr-hud-row">Slice: {coronalHUD.sliceIndex}/{coronalHUD.numSlices}</div>
            <div className="mpr-hud-row">WW: {coronalHUD.ww} WL: {coronalHUD.wl}</div>
          </div>
          <div ref={coronalRef} className="mpr-viewport-canvas" />
        </div>

        {/* Quadrant 4: 3D VOLUME */}
        <div
          className={`mpr-cell ${maximizedViewport === "mpr-3d" ? "is-maximized" : maximizedViewport ? "is-hidden" : ""}`}
          onDoubleClick={() => handleDoubleClick("mpr-3d")}
        >
          <div className="mpr-hud-overlay">
            <div className="mpr-hud-title">3D VOLUME</div>
          </div>
          <div ref={volume3dRef} className="mpr-viewport-canvas" />
        </div>
      </div>
    </div>
  );
}
