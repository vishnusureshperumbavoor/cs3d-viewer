import { useEffect, useRef } from "react";
import {
  getRenderingEngine,
  volumeLoader,
  addVolumesToViewports,
} from "@cornerstonejs/core";
import {
  segmentation as csSegmentation,
  Enums as ToolEnums,
} from "@cornerstonejs/tools";
import type { DicomSegData } from "../services/dicom-seg-service";
import { polysegServices } from "../services/polyseg-services";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkPoints from "@kitware/vtk.js/Common/Core/Points";
import vtkCellArray from "@kitware/vtk.js/Common/Core/CellArray";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction.js";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction.js";
import type { LabelmapData } from "../types/common";
import {
  RENDERING_ENGINE_ID,
  MPR_VIEWPORT_IDS,
} from "../utils/mpr-utils";

function applyMPRTransferFunctions(
  engine: any,
  segId: string,
  segData: DicomSegData,
  segmentVisibility?: Record<number, boolean>,
  targetAlpha: number = 0.85,
  unitDist?: number
) {
  MPR_VIEWPORT_IDS.forEach((id) => {
    const vp = engine.getViewport(id) as any;
    if (!vp) return;
    const actors = vp.getActors?.() || [];

    const segActorEntry = actors.find((a: any) => a.referencedId === segId || a.uid?.includes(segId));
    if (segActorEntry?.actor && typeof segActorEntry.actor.getProperty === "function") {
      const actor = segActorEntry.actor;
      const prop = actor.getProperty();
      const cfun = vtkColorTransferFunction.newInstance();
      const ofun = vtkPiecewiseFunction.newInstance();

      // Background voxel (label 0) is 100% transparent
      cfun.addRGBPoint(0, 0, 0, 0);
      ofun.addPoint(0, 0.0);
      ofun.addPoint(0.49, 0.0);

      for (const seg of segData.segments) {
        const segNum = seg.segmentNumber;
        const [r, g, b] = seg.rgba;
        const isVis = segmentVisibility ? (segmentVisibility[segNum] ?? true) : true;
        const alpha = isVis ? targetAlpha : 0.0;

        // Step transfer function for sharp segment isolation
        cfun.addRGBPoint(segNum - 0.49, r / 255, g / 255, b / 255);
        cfun.addRGBPoint(segNum, r / 255, g / 255, b / 255);
        cfun.addRGBPoint(segNum + 0.49, r / 255, g / 255, b / 255);

        ofun.addPoint(segNum - 0.49, alpha);
        ofun.addPoint(segNum, alpha);
        ofun.addPoint(segNum + 0.49, alpha);
      }

      prop.setRGBTransferFunction(0, cfun);
      prop.setScalarOpacity(0, ofun);
      prop.setInterpolationTypeToNearest();
      if (unitDist && typeof prop.setScalarOpacityUnitDistance === "function") {
        prop.setScalarOpacityUnitDistance(0, unitDist);
      }
      prop.modified();
      actor.modified();
      try { vp.render(); } catch (_) { }
    }
  });
}

/**
 * Applies a DICOM SEG labelmap:
 * - 3 MPR orthographic views: Volume Labelmap with uniform 0.85 opacity.
 * - 3D Volume Viewport: Smooth Marching Cubes Surface Meshes (VTK PolyData) for perfect 3D anatomy.
 */
export function useMPRSegmentation(
  segData: DicomSegData | null | undefined,
  segmentVisibility: Record<number, boolean> | undefined,
  seriesUid: string | null,
  volumeId: string,
  volumeReady: boolean,
  segmentOpacity: number = 0.5
) {
  const surfaceActorsRef = useRef<Record<number, any>>({});
  const segRepUIDsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!segData || segData.sliceMaskMap.size === 0 || !seriesUid || !volumeReady) return;

    const safeSeries = seriesUid.replace(/[^a-zA-Z0-9]/g, "_");
    const segId = `seg_${safeSeries}`;

    const applySegmentation = async () => {
      try {
        // Cleanup prior labelmap registration
        try { csSegmentation.removeSegmentation(segId); } catch (_) { }
        try {
          const { cache } = await import("@cornerstonejs/core");
          cache.removeVolumeLoadObject(segId);
        } catch (_) { }

        // Cleanup prior 3D surface mesh actors
        const engine = getRenderingEngine(RENDERING_ENGINE_ID);
        const vp3D = engine?.getViewport("mpr-3d") as any;
        const renderer3D = vp3D?.getRenderer?.();
        if (renderer3D) {
          Object.values(surfaceActorsRef.current).forEach((entry: any) => {
            try {
              const actorToRem = entry?.actor || entry;
              renderer3D.removeActor(actorToRem);
            } catch (_) { }
          });
        }
        surfaceActorsRef.current = {};

        const { cache } = await import("@cornerstonejs/core");
        const ctVol = cache.getVolume(volumeId) as any;
        if (!ctVol) {
          console.error("[Seg] CT volume not in cache — volumeReady race?", volumeId);
          return;
        }
        const dims = ctVol.dimensions as [number, number, number];
        const slicePixels = dims[0] * dims[1];
        const totalVoxels = slicePixels * dims[2];
        const ctVolImageIds = ctVol.imageIds as string[];
        const scalarData = new Uint8Array(totalVoxels);
        let maskedSlices = 0;

        ctVolImageIds.forEach((imgId, sliceIdx) => {
          const sopMatch = imgId.match(/instances\/([^/?]+)/i);
          if (!sopMatch) return;
          const sop = sopMatch[1];

          const masks = segData.sliceMaskMap.get(sop);
          if (!masks) return;
          maskedSlices++;

          const sliceOffset = sliceIdx * slicePixels;
          for (const [segNumStr, mask] of Object.entries(masks)) {
            const segNum = Number(segNumStr);
            for (let px = 0; px < mask.length && px < slicePixels; px++) {
              if (mask[px] > 0) {
                scalarData[sliceOffset + px] = segNum;
              }
            }
          }
        });

        if (maskedSlices === 0) {
          console.warn("[Seg] No slices matched — SOP UID mismatch?");
        }

        // ── 1. Create derived labelmap volume for 2D MPR planes ─────────
        const labelmapVol = volumeLoader.createAndCacheDerivedLabelmapVolume(
          volumeId,
          { volumeId: segId }
        ) as any;

        if (labelmapVol?.voxelManager?.setCompleteScalarDataArray) {
          labelmapVol.voxelManager.setCompleteScalarDataArray(scalarData);
        } else {
          console.error("[Seg] voxelManager.setCompleteScalarDataArray not available!");
        }

        if (typeof labelmapVol?.modified === "function") {
          labelmapVol.modified();
        }
        if (typeof labelmapVol?.imageData?.modified === "function") {
          labelmapVol.imageData.modified();
        }
        if (typeof labelmapVol?.vtkOpenGLTexture?.modified === "function") {
          labelmapVol.vtkOpenGLTexture.modified();
        }

        csSegmentation.addSegmentations([
          {
            segmentationId: segId,
            representation: {
              type: ToolEnums.SegmentationRepresentations.Labelmap,
              data: { volumeId: segId },
            },
          },
        ]);

        // ── 2. Add labelmap representation to the 3 MPR viewports ────────
        await new Promise((resolve) => requestAnimationFrame(resolve));

        for (const vpId of MPR_VIEWPORT_IDS) {
          try {
            const addedRepUIDs: any = await csSegmentation.addLabelmapRepresentationToViewport(vpId, [
              { segmentationId: segId },
            ]);
            if (Array.isArray(addedRepUIDs) && addedRepUIDs.length > 0) {
              segRepUIDsRef.current[vpId] = addedRepUIDs[0];
            }
            csSegmentation.activeSegmentation.setActiveSegmentation(vpId, segId);
          } catch (_) { }
        }

        if (engine) {
          const repUID = `${segId}-${ToolEnums.SegmentationRepresentations.Labelmap}-${segId}`;
          const missingViewports = MPR_VIEWPORT_IDS.filter((id) => {
            const vp = engine.getViewport(id) as any;
            const actors = vp?.getActors?.() || [];
            return !actors.some((a: any) => a.referencedId === segId);
          });

          if (missingViewports.length > 0) {
            await addVolumesToViewports(
              engine,
              [{ volumeId: segId, visibility: true, representationUID: repUID } as any],
              missingViewports,
              false,
              true
            );
          }

          // ── 3. Configure direct VTK transfer functions for 3 MPR viewports
          const unitDist = ctVol?.spacing ? Math.min(...ctVol.spacing) : 0.5;
          applyMPRTransferFunctions(engine, segId, segData, segmentVisibility, segmentOpacity, unitDist);

          // Configure Cornerstone style & sync color registry for MPR
          for (const vpId of MPR_VIEWPORT_IDS) {
            try {
              csSegmentation.config.style.setStyle(
                { viewportId: vpId, type: ToolEnums.SegmentationRepresentations.Labelmap, segmentationId: segId },
                {
                  fillAlpha: 0.85,
                  fillAlphaInactive: 0.85,
                  outlineWidth: 2,
                  renderOutline: true,
                  renderFill: true,
                }
              );
            } catch (_) { }

            for (const seg of segData.segments) {
              const [r, g, b] = seg.rgba;
              try {
                csSegmentation.config.color.setSegmentIndexColor(
                  vpId, segId, seg.segmentNumber, [r, g, b, 255]
                );
              } catch (_) { }
            }
          }

          try {
            csSegmentation.triggerSegmentationEvents.triggerSegmentationDataModified(segId);
            csSegmentation.triggerSegmentationEvents.triggerSegmentationModified(segId);
          } catch (_) { }

          engine.renderViewports([...MPR_VIEWPORT_IDS]);
        }

        // ── 4. Generate smooth 3D Surface Meshes for 3D Viewport ─────────
        if (vp3D) {
          for (const seg of segData.segments) {
            const segNum = seg.segmentNumber;
            const binaryData = new Uint8Array(scalarData.length);
            let segVoxels = 0;
            for (let i = 0; i < scalarData.length; i++) {
              if (scalarData[i] === segNum) {
                binaryData[i] = 1;
                segVoxels++;
              }
            }

            if (segVoxels === 0) continue;

            const labelmapData: LabelmapData = {
              data: binaryData,
              dimensions: Array.from(ctVol.dimensions) as [number, number, number],
              spacing: Array.from(ctVol.spacing) as [number, number, number],
              direction: Array.from(ctVol.direction) as [number, number, number, number, number, number, number, number, number],
              origin: Array.from(ctVol.origin) as [number, number, number],
              isovalues: [0.5],
            };

            try {
              const surface = await polysegServices.convertLabelmapToSurface(labelmapData);

              const polyData = vtkPolyData.newInstance();
              const points = vtkPoints.newInstance();
              points.setData(surface.points);
              polyData.setPoints(points);

              const polys = vtkCellArray.newInstance();
              polys.setData(surface.polys);
              polyData.setPolys(polys);

              const mapper = vtkMapper.newInstance();
              mapper.setInputData(polyData);

              const actor = vtkActor.newInstance();
              actor.setMapper(mapper);

              const [r, g, b] = seg.rgba;
              const prop = actor.getProperty();
              prop.setColor(r / 255, g / 255, b / 255);
              prop.setOpacity(segmentOpacity);
              prop.setAmbient(0.35);
              prop.setDiffuse(0.65);
              prop.setSpecular(0.3);
              prop.setSpecularPower(20.0);

              const isVis = segmentVisibility ? (segmentVisibility[segNum] ?? true) : true;
              actor.setVisibility(isVis);

              const actorUid = `surf_seg_${segNum}_${safeSeries}`;
              try {
                if (typeof vp3D.addActors === "function") {
                  vp3D.addActors([{ uid: actorUid, actor }]);
                } else if (typeof vp3D.getRenderer === "function") {
                  vp3D.getRenderer().addActor(actor);
                }
              } catch (_) {
                vp3D.getRenderer?.()?.addActor(actor);
              }

              surfaceActorsRef.current[segNum] = { actor, uid: actorUid };
            } catch (err) {
              console.error(`Failed to generate smooth 3D surface for segment ${segNum}:`, err);
            }
          }
          vp3D.render();
        }
      } catch (err) {
        console.error("MPR segmentation overlay failed:", err);
      }
    };

    void applySegmentation();

    return () => {
      const eng = getRenderingEngine(RENDERING_ENGINE_ID);
      const vp = eng?.getViewport("mpr-3d") as any;
      if (vp) {
        Object.values(surfaceActorsRef.current).forEach(({ actor, uid }: any) => {
          try {
            if (typeof vp.removeActors === "function" && uid) {
              vp.removeActors([uid]);
            } else if (typeof vp.getRenderer === "function") {
              vp.getRenderer().removeActor(actor);
            }
          } catch (_) { }
        });
      }
      surfaceActorsRef.current = {};
    };
  }, [segData, seriesUid, volumeId, volumeReady]);

  // ── Sync visibility & opacity toggle from sidebar ────────────────────────
  useEffect(() => {
    if (!seriesUid) return;
    const safeSeries = seriesUid.replace(/[^a-zA-Z0-9]/g, "_");
    const segId = `seg_${safeSeries}`;
    const targetAlpha = segmentOpacity ?? 0.5;

    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (engine) {
      // 1. Update MPR orthographic viewports with direct VTK Transfer Functions
      if (segData) {
        applyMPRTransferFunctions(engine, segId, segData, segmentVisibility, targetAlpha);
      }

      // 2. Update Cornerstone Segmentation config
      for (const vpId of MPR_VIEWPORT_IDS) {
        try {
          csSegmentation.config.style.setStyle(
            { viewportId: vpId, type: ToolEnums.SegmentationRepresentations.Labelmap, segmentationId: segId },
            {
              fillAlpha: targetAlpha,
              fillAlphaInactive: targetAlpha,
            }
          );
        } catch (_) { }

        const repUID = segRepUIDsRef.current[vpId];
        if (segmentVisibility) {
          for (const [segNumStr, visible] of Object.entries(segmentVisibility)) {
            const segNum = Number(segNumStr);
            if (repUID) {
              try {
                (csSegmentation.config.visibility as any).setSegmentIndexVisibility?.(
                  vpId,
                  repUID,
                  segNum,
                  visible
                );
              } catch (_) { }
              try {
                (csSegmentation.config.visibility as any).setSegmentVisibility?.(
                  vpId,
                  repUID,
                  segNum,
                  visible
                );
              } catch (_) { }
            }
            try {
              csSegmentation.config.visibility.setSegmentIndexVisibility(
                vpId,
                { segmentationId: segId } as any,
                segNum,
                visible
              );
            } catch (_) { }
            try {
              (csSegmentation.config.visibility as any).setSegmentIndexVisibility?.(
                vpId,
                segId,
                segNum,
                visible
              );
            } catch (_) { }
          }
        }
      }

      engine.renderViewports([...MPR_VIEWPORT_IDS]);

      // 3. Update 3D smooth surface mesh actors (visibility + opacity)
      for (const [segNumStr, entry] of Object.entries(surfaceActorsRef.current)) {
        const segNum = Number(segNumStr);
        const targetActor = entry?.actor || entry;
        if (targetActor) {
          const isVisible = segmentVisibility ? (segmentVisibility[segNum] ?? true) : true;
          if (typeof targetActor.setVisibility === "function") {
            targetActor.setVisibility(isVisible);
          }
          if (typeof targetActor.getProperty === "function") {
            const prop = targetActor.getProperty();
            if (prop && typeof prop.setOpacity === "function") {
              prop.setOpacity(targetAlpha);
              prop.modified?.();
            }
          }
        }
      }

      const vp3D = engine.getViewport("mpr-3d") as any;
      vp3D?.render?.();
    }
  }, [segData, segmentVisibility, segmentOpacity, seriesUid]);
}
