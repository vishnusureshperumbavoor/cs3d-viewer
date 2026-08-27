import React, { useEffect, useRef, useState, useCallback } from "react";
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

interface MPRViewerProps {
  imageIds: string[];
  seriesUid: string | null;
}

const RENDERING_ENGINE_ID = "MPR_RENDERING_ENGINE";
const MPR_TOOLGROUP_ID = "MPR_TOOLGROUP";
const VOLUME_3D_TOOLGROUP_ID = "VOLUME_3D_TOOLGROUP";

const PRESETS_3D = [
  { id: "CT-Bone", label: "Bone" },
  { id: "CT-Chest-Vessels-Soft-Tissue", label: "Vessels" },
  { id: "CT-Soft-Tissue", label: "Soft Tissue" },
  { id: "CT-AAA", label: "Angio" },
];

export function MPRViewer({ imageIds, seriesUid }: MPRViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const volume3dRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [active3DPreset, setActive3DPreset] = useState("CT-Bone");
  const [error, setError] = useState<string | null>(null);

  const handleSelect3DPreset = useCallback((presetId: string) => {
    setActive3DPreset(presetId);
    try {
      const engine = getRenderingEngine(RENDERING_ENGINE_ID);
      if (engine) {
        const vp3D = engine.getViewport("mpr-3d") as any;
        if (vp3D && typeof vp3D.setPreset === "function") {
          vp3D.setPreset(presetId);
          vp3D.render();
        }
      }
    } catch (e) {
      console.warn("Failed to set 3D volume preset:", e);
    }
  }, []);

  const handleResetCameras = useCallback(() => {
    try {
      const engine = getRenderingEngine(RENDERING_ENGINE_ID);
      if (engine) {
        ["mpr-axial", "mpr-sagittal", "mpr-coronal", "mpr-3d"].forEach((id) => {
          const vp = engine.getViewport(id);
          if (vp) {
            vp.resetCamera();
            vp.render();
          }
        });
      }
    } catch (e) {
      console.warn("Failed to reset cameras:", e);
    }
  }, []);

  useEffect(() => {
    if (!imageIds || imageIds.length === 0 || !seriesUid) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    const safeSeries = seriesUid.replace(/[^a-zA-Z0-9]/g, "_");
    const volumeId = `cornerstoneStreamingImageVolume:CT_VOL_${safeSeries}`;

    const setupMPR = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingProgress(10);

        await initCornerstone();
        if (isCancelled) return;

        // Ensure all 4 viewport container elements have rendered dimensions
        const refs = [axialRef, sagittalRef, coronalRef, volume3dRef];
        for (const r of refs) {
          if (!r.current || r.current.clientWidth === 0 || r.current.clientHeight === 0) {
            await new Promise((res) => requestAnimationFrame(res));
            if (isCancelled) return;
          }
        }

        setLoadingProgress(30);

        // Initialize Rendering Engine
        let renderingEngine = getRenderingEngine(RENDERING_ENGINE_ID);
        if (!renderingEngine) {
          renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
        }

        // Configure 4 viewports (2x2)
        const viewportInputs = [
          {
            viewportId: "mpr-axial",
            type: CoreEnums.ViewportType.ORTHOGRAPHIC,
            element: axialRef.current!,
            defaultOptions: {
              orientation: CoreEnums.OrientationAxis.AXIAL,
              background: [0.02, 0.02, 0.03] as [number, number, number],
            },
          },
          {
            viewportId: "mpr-sagittal",
            type: CoreEnums.ViewportType.ORTHOGRAPHIC,
            element: sagittalRef.current!,
            defaultOptions: {
              orientation: CoreEnums.OrientationAxis.SAGITTAL,
              background: [0.02, 0.02, 0.03] as [number, number, number],
            },
          },
          {
            viewportId: "mpr-coronal",
            type: CoreEnums.ViewportType.ORTHOGRAPHIC,
            element: coronalRef.current!,
            defaultOptions: {
              orientation: CoreEnums.OrientationAxis.CORONAL,
              background: [0.02, 0.02, 0.03] as [number, number, number],
            },
          },
          {
            viewportId: "mpr-3d",
            type: CoreEnums.ViewportType.VOLUME_3D,
            element: volume3dRef.current!,
            defaultOptions: {
              background: [0.03, 0.03, 0.05] as [number, number, number],
            },
          },
        ];

        renderingEngine.setViewports(viewportInputs);
        if (isCancelled) return;

        setLoadingProgress(50);

        // ToolGroup for 2D Orthographic MPR Viewports
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

        if (toolGroup) {
          toolGroup.addViewport("mpr-axial", RENDERING_ENGINE_ID);
          toolGroup.addViewport("mpr-sagittal", RENDERING_ENGINE_ID);
          toolGroup.addViewport("mpr-coronal", RENDERING_ENGINE_ID);
        }

        // ToolGroup for 3D Volume Viewport
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

        if (toolGroup3D) {
          toolGroup3D.addViewport("mpr-3d", RENDERING_ENGINE_ID);
        }

        setLoadingProgress(70);

        // Create or get Image Volume
        let volume = cache.getVolume(volumeId);
        if (!volume) {
          volume = await volumeLoader.createAndCacheVolume(volumeId, {
            imageIds,
          });
        }

        if (isCancelled) return;
        setLoadingProgress(85);

        // Load voxel buffer
        volume.load(() => {});
        if (isCancelled) return;

        // Attach Volume to all 4 viewports
        await setVolumesForViewports(
          renderingEngine,
          [{ volumeId }],
          ["mpr-axial", "mpr-sagittal", "mpr-coronal", "mpr-3d"]
        );

        if (isCancelled) return;

        // Apply default preset to 3D Viewport
        const vp3D = renderingEngine.getViewport("mpr-3d") as any;
        if (vp3D && typeof vp3D.setPreset === "function") {
          vp3D.setPreset(active3DPreset);
        }

        renderingEngine.renderViewports([
          "mpr-axial",
          "mpr-sagittal",
          "mpr-coronal",
          "mpr-3d",
        ]);

        setIsLoading(false);
      } catch (err: any) {
        console.error("Failed to initialize MPR + 3D viewports:", err);
        if (!isCancelled) {
          setError(err.message || "Failed to load MPR volume.");
          setIsLoading(false);
        }
      }
    };

    void setupMPR();

    // ResizeObserver on the container to resize Cornerstone when panels collapse/expand
    const container = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        const engine = getRenderingEngine(RENDERING_ENGINE_ID);
        if (engine) {
          engine.resize(true, true);
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      isCancelled = true;
      if (resizeObserver) resizeObserver.disconnect();

      const engine = getRenderingEngine(RENDERING_ENGINE_ID);
      if (engine) {
        try {
          engine.disableElement("mpr-axial");
          engine.disableElement("mpr-sagittal");
          engine.disableElement("mpr-coronal");
          engine.disableElement("mpr-3d");
        } catch (e) {
          // Ignore unmount cleanup warnings
        }
      }
    };
  }, [imageIds, seriesUid]);

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
              <div
                className="mpr-progress-fill"
                style={{ width: `${loadingProgress}%` }}
              />
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

      {/* 2x2 Viewport Grid */}
      <div className="mpr-grid">
        {/* Quadrant 1: AXIAL */}
        <div className="mpr-cell">
          <div className="mpr-badge axial">AXIAL</div>
          <div ref={axialRef} className="mpr-viewport-canvas" />
        </div>

        {/* Quadrant 2: SAGITTAL */}
        <div className="mpr-cell">
          <div className="mpr-badge sagittal">SAGITTAL</div>
          <div ref={sagittalRef} className="mpr-viewport-canvas" />
        </div>

        {/* Quadrant 3: CORONAL */}
        <div className="mpr-cell">
          <div className="mpr-badge coronal">CORONAL</div>
          <div ref={coronalRef} className="mpr-viewport-canvas" />
        </div>

        {/* Quadrant 4: 3D VOLUME RENDERING */}
        <div className="mpr-cell">
          <div className="mpr-badge volume-3d">
            <span>3D VOLUME</span>
            <div className="mpr-preset-pills">
              {PRESETS_3D.map((p) => (
                <button
                  key={p.id}
                  className={`mpr-preset-pill ${active3DPreset === p.id ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect3DPreset(p.id);
                  }}
                  title={`Apply ${p.label} volume preset`}
                >
                  {p.label}
                </button>
              ))}
              <button
                className="mpr-preset-pill reset"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetCameras();
                }}
                title="Reset all cameras"
              >
                Reset
              </button>
            </div>
          </div>
          <div ref={volume3dRef} className="mpr-viewport-canvas" />
        </div>
      </div>
    </div>
  );
}
