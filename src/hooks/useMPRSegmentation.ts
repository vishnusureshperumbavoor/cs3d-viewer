import { useEffect } from "react";
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
import {
  RENDERING_ENGINE_ID,
  MPR_VIEWPORT_IDS,
} from "../utils/mpr-utils";

/**
 * Applies a DICOM SEG labelmap onto the 3 MPR viewports (Axial / Sagittal / Coronal).
 *
 * Key implementation detail (confirmed from Cornerstone source):
 *   `createAndCacheDerivedVolume` IGNORES the `scalarData` option — it only uses
 *   `targetBuffer` and `voxelRepresentation`. The correct flow is:
 *     1. Build the flat Uint8Array from sliceMaskMap FIRST.
 *     2. Create the derived volume (gets empty zeroed buffers).
 *     3. Write data in via `voxelManager.setCompleteScalarDataArray()`.
 *     4. Call `modified()` to invalidate the GPU texture.
 *     5. Register with the segmentation system and add representations.
 */
export function useMPRSegmentation(
  segData: DicomSegData | null | undefined,
  segmentVisibility: Record<number, boolean> | undefined,
  seriesUid: string | null,
  volumeId: string,
  volumeReady: boolean
) {
  useEffect(() => {
    if (!segData || segData.sliceMaskMap.size === 0 || !seriesUid || !volumeReady) return;

    const safeSeries = seriesUid.replace(/[^a-zA-Z0-9]/g, "_");
    const segId = `seg_${safeSeries}`;

    const applySegmentation = async () => {
      try {
        try { csSegmentation.removeSegmentation(segId); } catch (_) { }
        try {
          const { cache } = await import("@cornerstonejs/core");
          cache.removeVolumeLoadObject(segId);
        } catch (_) { }

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

        await new Promise((resolve) => requestAnimationFrame(resolve));

        for (const vpId of MPR_VIEWPORT_IDS) {
          try {
            await csSegmentation.addLabelmapRepresentationToViewport(vpId, [
              { segmentationId: segId },
            ]);
            csSegmentation.activeSegmentation.setActiveSegmentation(vpId, segId);
          } catch (_) { }
        }

        const engine = getRenderingEngine(RENDERING_ENGINE_ID);
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

          const vtkColorTransferFunction = (await import("@kitware/vtk.js/Rendering/Core/ColorTransferFunction.js")).default;
          const vtkPiecewiseFunction = (await import("@kitware/vtk.js/Common/DataModel/PiecewiseFunction.js")).default;
          const unitDist = ctVol?.spacing ? Math.min(...ctVol.spacing) : 0.5;

          MPR_VIEWPORT_IDS.forEach((id) => {
            const vp = engine.getViewport(id) as any;
            if (!vp) return;
            const actors = vp.getActors?.() || [];
            const segActorEntry = actors.find((a: any) => a.referencedId === segId);
            if (segActorEntry?.actor) {
              const actor = segActorEntry.actor;
              const cfun = vtkColorTransferFunction.newInstance();
              const ofun = vtkPiecewiseFunction.newInstance();

              cfun.addRGBPoint(0, 0, 0, 0);
              ofun.addPoint(0, 0.0);
              ofun.addPoint(0.4, 0.0);
              const UNIFORM_ALPHA = 0.85;

              for (const seg of segData.segments) {
                const segNum = seg.segmentNumber;
                const [r, g, b] = seg.rgba;
                const isVis = segmentVisibility ? (segmentVisibility[segNum] ?? true) : true;
                const alpha = isVis ? UNIFORM_ALPHA : 0.0;

                cfun.addRGBPoint(segNum - 0.4, 0, 0, 0);
                cfun.addRGBPoint(segNum, r / 255, g / 255, b / 255);
                cfun.addRGBPoint(segNum + 0.4, r / 255, g / 255, b / 255);

                ofun.addPoint(segNum - 0.4, 0.0);
                ofun.addPoint(segNum, alpha);
                ofun.addPoint(segNum + 0.4, alpha);
              }

              if (typeof actor.getProperty === "function") {
                const prop = actor.getProperty();
                prop.setRGBTransferFunction(0, cfun);
                prop.setScalarOpacity(0, ofun);
                prop.setInterpolationTypeToNearest();
                if (typeof prop.setScalarOpacityUnitDistance === "function") {
                  prop.setScalarOpacityUnitDistance(0, unitDist);
                }
                actor.modified();
                prop.modified();
              }
            }
          });

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
        } else {
          console.warn("[Seg] Rendering engine not found!");
        }
      } catch (err) {
        console.error("MPR segmentation overlay failed:", err);
      }
    };

    void applySegmentation();
  }, [segData, seriesUid, volumeId, volumeReady]);

  useEffect(() => {
    if (!segmentVisibility || !seriesUid) return;
    const safeSeries = seriesUid.replace(/[^a-zA-Z0-9]/g, "_");
    const segId = `seg_${safeSeries}`;

    for (const vpId of MPR_VIEWPORT_IDS) {
      for (const [segNumStr, visible] of Object.entries(segmentVisibility)) {
        const segNum = Number(segNumStr);
        try {
          csSegmentation.config.visibility.setSegmentIndexVisibility(
            vpId,
            { segmentationId: segId },
            segNum,
            visible
          );
        } catch (_) { }
      }
    }

    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (engine) {
      MPR_VIEWPORT_IDS.forEach((id) => {
        const vp = engine.getViewport(id) as any;
        if (!vp) return;
        const actors = vp.getActors?.() || [];
        const segActorEntry = actors.find((a: any) => a.referencedId === segId);
        if (segActorEntry?.actor && typeof segActorEntry.actor.getProperty === "function") {
          const prop = segActorEntry.actor.getProperty();
          const ofun = prop.getScalarOpacity(0);
          const UNIFORM_ALPHA = 0.85;
          if (ofun) {
            for (const [segNumStr, visible] of Object.entries(segmentVisibility)) {
              const segNum = Number(segNumStr);
              const alpha = visible ? UNIFORM_ALPHA : 0.0;
              ofun.addPoint(segNum - 0.4, 0.0);
              ofun.addPoint(segNum, alpha);
              ofun.addPoint(segNum + 0.4, alpha);
            }
            prop.modified();
            segActorEntry.actor.modified();
          }
        }
      });

      engine.renderViewports([...MPR_VIEWPORT_IDS]);
    }
  }, [segmentVisibility, seriesUid]);
}
