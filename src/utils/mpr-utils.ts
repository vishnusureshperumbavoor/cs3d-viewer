import { getRenderingEngine, Enums as CoreEnums } from "@cornerstonejs/core";

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
