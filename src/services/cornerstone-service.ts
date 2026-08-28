import * as cornerstone3D from "@cornerstonejs/core";
import * as cornerstone3DTools from "@cornerstonejs/tools";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";

let isCornerstoneInitialized = false;

export const initCornerstone = async (): Promise<void> => {
  if (isCornerstoneInitialized) {
    return;
  }
  isCornerstoneInitialized = true;

  try {
    // Initialize image loader, Cornerstone3D Core, and Tools
    await cornerstoneDICOMImageLoader.init();

    // Configure image loader with Orthanc basic auth
    cornerstoneDICOMImageLoader.internal.setOptions({
      beforeSend: () => {
        return {
          Authorization: "Basic " + btoa("orthanc:orthanc"),
        };
      },
    });

    await cornerstone3D.init();
    await cornerstone3DTools.init();

    // Register tools globally
    cornerstone3DTools.addTool(cornerstone3DTools.ZoomTool);
    cornerstone3DTools.addTool(cornerstone3DTools.PanTool);
    cornerstone3DTools.addTool(cornerstone3DTools.WindowLevelTool);
    cornerstone3DTools.addTool(cornerstone3DTools.StackScrollTool);
    cornerstone3DTools.addTool(cornerstone3DTools.TrackballRotateTool);
  } catch (err) {
    console.warn("Cornerstone init warning:", err);
  }
};
