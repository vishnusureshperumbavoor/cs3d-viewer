import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { polysegServices } from "../services/polyseg-services";
import "@kitware/vtk.js/Rendering/Profiles/Geometry";

import vtkRenderWindow from "@kitware/vtk.js/Rendering/Core/RenderWindow";
import vtkRenderer from "@kitware/vtk.js/Rendering/Core/Renderer";
import vtkOpenGLRenderWindow from "@kitware/vtk.js/Rendering/OpenGL/RenderWindow";
import vtkRenderWindowInteractor from "@kitware/vtk.js/Rendering/Core/RenderWindowInteractor";
import vtkInteractorStyleTrackballCamera from "@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkPoints from "@kitware/vtk.js/Common/Core/Points";
import vtkCellArray from "@kitware/vtk.js/Common/Core/CellArray";

import {
  LabelmapData,
  RawLabelmap,
  SurfaceMesh,
  VtkContextType,
} from "../types";
import {
  clearAllSegmentations,
  getNextColor,
  getUniqueSegmentValues,
} from "../utils";
import vtkSTLWriter from "@kitware/vtk.js/IO/Geometry/STLWriter";

interface VtkViewerProps {
  segLabelmaps: RawLabelmap[] | null;
  segmentVisibility?: Record<number, boolean>;
}

export const VtkViewer = forwardRef(function VtkViewer(
  { segLabelmaps, segmentVisibility }: VtkViewerProps,
  ref
) {
  const vtkContainerRef = useRef<HTMLDivElement>(null);

  const vtkContext = useRef<VtkContextType>({});

  const segmentActorsRef = useRef<Record<number, any>>({});
  const segmentMeshesRef = useRef<Record<number, vtkPolyData>>({});

  const exportSTL = (segmentNumber: number) => {
    const polyData: vtkPolyData = segmentMeshesRef.current[segmentNumber];
    if (!polyData) return;

    const stlArrayBuffer = vtkSTLWriter.writeSTL(
      polyData
    ) as unknown as ArrayBuffer;

    const blob = new Blob([stlArrayBuffer], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `segment_${segmentNumber}.stl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useImperativeHandle(ref, () => ({
    exportSTL,
  }));

  useEffect(() => {
    if (!vtkContainerRef.current || vtkContext.current.renderer) return;

    const renderWindow = vtkRenderWindow.newInstance();
    const renderer = vtkRenderer.newInstance();
    renderer.setBackground(0.06, 0.06, 0.06);

    renderWindow.addRenderer(renderer);

    const openGLRenderWindow = vtkOpenGLRenderWindow.newInstance();
    openGLRenderWindow.setContainer(vtkContainerRef.current);

    const { width, height } = vtkContainerRef.current.getBoundingClientRect();
    openGLRenderWindow.setSize(width, height);

    renderWindow.addView(openGLRenderWindow);

    const interactor = vtkRenderWindowInteractor.newInstance();
    interactor.setView(openGLRenderWindow);
    interactor.initialize();
    interactor.bindEvents(vtkContainerRef.current);

    const interactorStyle = vtkInteractorStyleTrackballCamera.newInstance();
    interactor.setInteractorStyle(interactorStyle);

    vtkContext.current = {
      renderWindow,
      renderer,
      openGLRenderWindow,
      interactor,
      actors: [],
    };

    const handleResize = () => {
      if (vtkContainerRef.current && vtkContext.current.openGLRenderWindow) {
        const { width, height } =
          vtkContainerRef.current.getBoundingClientRect();
        vtkContext.current.openGLRenderWindow.setSize(width, height);
        vtkContext.current.renderWindow?.render();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (vtkContext.current.interactor)
        vtkContext.current.interactor.unbindEvents();

      vtkContext.current.actors?.forEach((obj) => {
        if (obj && typeof obj.delete === "function") obj.delete();
      });

      if (vtkContext.current.renderWindow) {
        vtkContext.current.renderWindow.removeView(
          vtkContext.current.openGLRenderWindow
        );
        if (vtkContext.current.openGLRenderWindow?.delete)
          vtkContext.current.openGLRenderWindow.delete();
        if (vtkContext.current.renderWindow?.delete)
          vtkContext.current.renderWindow.delete();
        if (vtkContext.current.interactor?.delete)
          vtkContext.current.interactor.delete();
      }
      vtkContext.current = {};
    };
  }, []);

  useEffect(() => {
    if (!vtkContext.current.renderer) return;

    const { renderer, renderWindow } = vtkContext.current;

    vtkContext.current.actors?.forEach((actor) => renderer.removeActor(actor));
    vtkContext.current.actors?.forEach((obj) => {
      if (obj && typeof obj.delete === "function") obj.delete();
    });
    vtkContext.current.actors = [];
    segmentActorsRef.current = {};
    clearAllSegmentations();

    let hasData = false;

    if (segLabelmaps && segLabelmaps.length > 0) {
      const processSegmentations = async () => {
        for (
          let labelmapIdx = 0;
          labelmapIdx < segLabelmaps.length;
          labelmapIdx++
        ) {
          const labelmap = segLabelmaps[labelmapIdx];
          try {
            const uniqueValues = getUniqueSegmentValues(labelmap);
            if (uniqueValues.length === 0) continue;

            for (const segmentValue of uniqueValues) {
              const binaryData = new Uint8Array(labelmap.pixelData.length);
              for (let i = 0; i < labelmap.pixelData.length; i++) {
                binaryData[i] = labelmap.pixelData[i] === segmentValue ? 1 : 0;
              }

              const labelmapData: LabelmapData = {
                data: binaryData,
                dimensions: [labelmap.cols, labelmap.rows, labelmap.slices],
                spacing: [
                  labelmap.pixelSpacing[0],
                  labelmap.pixelSpacing[1],
                  labelmap.sliceThickness || 1,
                ],
                direction: [1, 0, 0, 0, 1, 0, 0, 0, 1],
                origin: [0, 0, 0],
                isovalues: [0.5],
              };

              try {
                const surface: SurfaceMesh =
                  await polysegServices.convertLabelmapToSurface(labelmapData);

                const polyData = vtkPolyData.newInstance();

                segmentMeshesRef.current[labelmap.segmentNumber as number] =
                  polyData;

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

                const color = getNextColor();
                actor.getProperty().setColor(...color);
                actor.getProperty().setOpacity(0.8);

                const segmentNumber =
                  labelmap.segmentNumber !== undefined
                    ? labelmap.segmentNumber
                    : segmentValue;

                renderer.addActor(actor);
                vtkContext.current.actors?.push(
                  actor,
                  mapper,
                  polyData,
                  points,
                  polys
                );
                segmentActorsRef.current[segmentNumber as number] = actor;

                hasData = true;
              } catch (error) {
                console.error(
                  `Error processing segment ${segmentValue}:`,
                  error
                );
              }
            }
          } catch (error) {
            console.error(`Error rendering segmentation:`, error);
          }
        }

        if (hasData) {
          renderer.resetCamera();
        }
        renderWindow?.render();
      };

      processSegmentations();
    }
  }, [segLabelmaps]);

  useEffect(() => {
    if (!segmentVisibility || !vtkContext.current.renderer) return;
    const actors = segmentActorsRef.current;
    Object.entries(segmentVisibility).forEach(([segmentNumber, visible]) => {
      const actor = actors[segmentNumber as any];
      if (actor) {
        actor.setVisibility(visible !== false);
      }
    });
    vtkContext.current.renderWindow?.render();
  }, [segmentVisibility]);

  return (
    <div className="vtk-root" ref={vtkContainerRef}>
      {!segLabelmaps?.length && (
        <div className="viewer-empty-state">
          <div>
            <h3>3D Segmentation Viewer</h3>
            <p>Upload a DICOM SEG file to visualize segmentations in 3D.</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default VtkViewer;
