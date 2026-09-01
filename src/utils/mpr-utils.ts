import { getRenderingEngine, Enums as CoreEnums, metaData } from "@cornerstonejs/core";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction.js";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction.js";

export const RENDERING_ENGINE_ID = "MPR_RENDERING_ENGINE";
export const MPR_TOOLGROUP_ID = "MPR_TOOLGROUP";
export const VOLUME_3D_TOOLGROUP_ID = "VOLUME_3D_TOOLGROUP";

export const DEFAULT_WW = 650;
export const DEFAULT_WL = 1150;
export const DEFAULT_VOI_RANGE = {
  lower: DEFAULT_WL - DEFAULT_WW / 2,
  upper: DEFAULT_WL + DEFAULT_WW / 2,
};

export const MPR_VIEWPORT_IDS = ["mpr-axial", "mpr-sagittal", "mpr-coronal"] as const;

/**
 * Resets all MPR cameras to their default orientation and WW/WL.
 * The 3D viewport is reset to Coronal (Anterior) orientation.
 * Exported so the right-sidebar "Reset All Cameras" button can call it.
 */
export function resetMPRCameras() {
  try {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;

    [...MPR_VIEWPORT_IDS, "mpr-3d"].forEach((id) => {
      const vp = engine.getViewport(id) as any;
      if (!vp) return;

      if (id === "mpr-3d" && typeof vp.applyViewOrientation === "function") {
        vp.applyViewOrientation(CoreEnums.OrientationAxis.CORONAL);
      } else {
        vp.resetCamera();
      }

      if (id !== "mpr-3d" && typeof vp.setProperties === "function") {
        vp.setProperties({ voiRange: DEFAULT_VOI_RANGE });
      }
      vp.render();
    });
  } catch (e) {
    console.warn("Failed to reset cameras:", e);
  }
}

/**
 * Applies a 3D volume rendering preset or custom transfer function to the 3D viewport.
 */
export function apply3DVolumePreset(vp3D: any, presetId: string, volumeId?: string) {
  if (!vp3D) return;

  try {
    const actors = vp3D.getActors?.() || [];
    const ctActorEntry = actors.find(
      (a: any) => (volumeId && (a.referencedId === volumeId || a.uid === volumeId)) || a.actor?.getClassName?.() === "vtkVolume"
    );

    if (presetId === "CT-Segmentation-Only" || presetId === "Segmentation Only") {
      // Hide base CT volume, revealing only the pure 3D organ meshes
      if (ctActorEntry?.actor) {
        ctActorEntry.actor.setVisibility(false);
      }
    } else if (presetId === "CT-Ghost-Body" || presetId === "Transparent Body") {
      // Custom glass-body transfer function
      if (ctActorEntry?.actor) {
        ctActorEntry.actor.setVisibility(true);
        if (typeof ctActorEntry.actor.getProperty === "function") {
          const prop = ctActorEntry.actor.getProperty();
          const ofun = vtkPiecewiseFunction.newInstance();
          const cfun = vtkColorTransferFunction.newInstance();

          // Air, lungs, deep fat, and low density: 0 opacity
          ofun.addPoint(-1024, 0.0);
          ofun.addPoint(0, 0.0);
          // Ultra-sheer glass skin & soft tissue boundary
          ofun.addPoint(50, 0.0015);
          ofun.addPoint(150, 0.0015);
          // Very light skeletal landmarks (ribs & spine)
          ofun.addPoint(250, 0.015);
          ofun.addPoint(500, 0.08);
          ofun.addPoint(1200, 0.20);

          cfun.addRGBPoint(-1024, 0.0, 0.0, 0.0);
          cfun.addRGBPoint(0, 0.0, 0.0, 0.0);
          cfun.addRGBPoint(50, 0.7, 0.8, 0.9);    // Crystal-glass silhouette
          cfun.addRGBPoint(150, 0.65, 0.75, 0.85);
          cfun.addRGBPoint(250, 0.85, 0.85, 0.8); // Faint bone context
          cfun.addRGBPoint(1200, 1.0, 1.0, 1.0);

          prop.setRGBTransferFunction(0, cfun);
          prop.setScalarOpacity(0, ofun);
          if (typeof prop.setScalarOpacityUnitDistance === "function") {
            prop.setScalarOpacityUnitDistance(0, 50.0);
          }
          prop.setShade(true);
          prop.setAmbient(0.3);
          prop.setDiffuse(0.7);
          prop.setSpecular(0.15);
          prop.modified();
          ctActorEntry.actor.modified();
        }
      }
    } else {
      // Standard Cornerstone presets (CT-Bone, CT-AAA, CT-Chest-Vessels, etc.)
      if (ctActorEntry?.actor) {
        ctActorEntry.actor.setVisibility(true);
      }
      if (typeof vp3D.setPreset === "function") {
        vp3D.setPreset(presetId);
      }
    }
    vp3D.render();
  } catch (e) {
    console.warn("Failed to apply 3D volume preset:", e);
  }
}

/**
 * Navigates the 2D Axial Stack Viewport (CT_AXIAL_STACK) to a specific slice
 * either by referenced SOP Instance UID or by world Z coordinate.
 */
export function jumpTo2DSegmentSlice(targetSopUid?: string, targetZ?: number, imageIds?: string[]) {
  try {
    const engine = getRenderingEngine("mainViewerRenderingEngine");
    if (!engine) return;
    const viewport = engine.getViewport("CT_AXIAL_STACK") as any;
    if (!viewport || typeof viewport.setImageIdIndex !== "function") return;

    const stackImageIds: string[] = imageIds || (typeof viewport.getImageIds === "function" ? viewport.getImageIds() : []);
    if (!stackImageIds || stackImageIds.length === 0) return;

    let targetIndex = -1;

    // 1. Exact match by referenced SOP Instance UID
    if (targetSopUid) {
      targetIndex = stackImageIds.findIndex((id: string) => id.includes(targetSopUid));
    }

    // 2. Spatial proximity match by Z coordinate
    if (targetIndex === -1 && targetZ !== undefined && Number.isFinite(targetZ)) {
      let minDiff = Infinity;
      stackImageIds.forEach((id: string, idx: number) => {
        const imagePlane = metaData.get("imagePlaneModule", id);
        if (imagePlane?.imagePositionPatient) {
          const z = Number(imagePlane.imagePositionPatient[2]);
          const diff = Math.abs(z - targetZ);
          if (diff < minDiff) {
            minDiff = diff;
            targetIndex = idx;
          }
        }
      });
    }

    if (targetIndex >= 0 && targetIndex < stackImageIds.length) {
      viewport.setImageIdIndex(targetIndex);
      viewport.render();
    }
  } catch (e) {
    console.warn("Failed to jump 2D stack viewport to slice:", e);
  }
}

/**
 * Navigates all 3 orthographic MPR viewports (Axial, Sagittal, Coronal) and 2D Stack Viewport to center on a 3D world coordinate.
 */
export function jumpToWorldCoordinate(worldCoord: [number, number, number], targetSopUid?: string, imageIds?: string[]) {
  // 1. Jump 2D Viewport if available
  jumpTo2DSegmentSlice(targetSopUid, worldCoord[2], imageIds);

  // 2. Jump 3D MPR Viewports
  try {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;

    MPR_VIEWPORT_IDS.forEach((id) => {
      const vp = engine.getViewport(id) as any;
      if (!vp) return;

      const camera = vp.getCamera();
      if (!camera.focalPoint || !camera.position) return;

      const normal = camera.viewPlaneNormal;
      const distance = Math.sqrt(
        Math.pow(camera.position[0] - camera.focalPoint[0], 2) +
        Math.pow(camera.position[1] - camera.focalPoint[1], 2) +
        Math.pow(camera.position[2] - camera.focalPoint[2], 2)
      );

      const newFocalPoint: [number, number, number] = [
        worldCoord[0],
        worldCoord[1],
        worldCoord[2],
      ];

      const newPosition: [number, number, number] = [
        newFocalPoint[0] + normal[0] * distance,
        newFocalPoint[1] + normal[1] * distance,
        newFocalPoint[2] + normal[2] * distance,
      ];

      vp.setCamera({
        focalPoint: newFocalPoint,
        position: newPosition,
      });
      vp.render();
    });
  } catch (e) {
    console.warn("Failed to jump to world coordinate:", e);
  }
}

