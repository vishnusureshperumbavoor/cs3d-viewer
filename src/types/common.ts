import vtkRenderWindow from "@kitware/vtk.js/Rendering/Core/RenderWindow";
import vtkRenderer from "@kitware/vtk.js/Rendering/Core/Renderer";
import vtkOpenGLRenderWindow from "@kitware/vtk.js/Rendering/OpenGL/RenderWindow";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkRenderWindowInteractor from "@kitware/vtk.js/Rendering/Core/RenderWindowInteractor";

export type VtkContextType = {
  renderWindow?: vtkRenderWindow;
  renderer?: vtkRenderer;
  openGLRenderWindow?: vtkOpenGLRenderWindow;
  interactor?: vtkRenderWindowInteractor;
  actors?: any[];
};

export interface RawLabelmap {
  pixelData: Uint8Array;
  rows: number;
  cols: number;
  slices: number;
  pixelSpacing: number[];
  sliceThickness: number;
  segmentNumber?: number;
}

export interface LabelmapData {
  data: Uint8Array;
  dimensions: [number, number, number];
  spacing: [number, number, number];
  direction: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];
  origin: [number, number, number];
  isovalues: number[];
}

export interface SurfaceMesh {
  points: Float32Array;
  polys: Uint32Array;
}

export interface RequestMapValue {
  resolve: (value: SurfaceMesh) => void;
  reject: (reason?: unknown) => void;
}

export interface IVtkContext {
  renderWindow: vtkRenderWindow;
  renderer: vtkRenderer;
  openGLRenderWindow: vtkOpenGLRenderWindow;
  actors: vtkActor[];
}
