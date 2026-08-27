import { getRenderingEngine, Enums as CoreEnums } from "@cornerstonejs/core";
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

          // Air, lungs, and deep fat: 0 opacity
          ofun.addPoint(-1024, 0.0);
          ofun.addPoint(-50, 0.0);
          // Translucent glass skin & soft tissue silhouette
          ofun.addPoint(0, 0.005);
          ofun.addPoint(120, 0.005);
          // Semi-transparent skeletal context (ribs & spine)
          ofun.addPoint(220, 0.03);
          ofun.addPoint(450, 0.18);
          ofun.addPoint(1200, 0.35);

          cfun.addRGBPoint(-1024, 0.0, 0.0, 0.0);
          cfun.addRGBPoint(-50, 0.0, 0.0, 0.0);
          cfun.addRGBPoint(0, 0.75, 0.82, 0.9);   // Ice-glass contour
          cfun.addRGBPoint(120, 0.7, 0.75, 0.85);
          cfun.addRGBPoint(220, 0.85, 0.85, 0.8); // Bone landmarks
          cfun.addRGBPoint(1200, 1.0, 1.0, 1.0);

          prop.setRGBTransferFunction(0, cfun);
          prop.setScalarOpacity(0, ofun);
          if (typeof prop.setScalarOpacityUnitDistance === "function") {
            prop.setScalarOpacityUnitDistance(0, 30.0);
          }
          prop.setShade(true);
          prop.setAmbient(0.25);
          prop.setDiffuse(0.75);
          prop.setSpecular(0.2);
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
