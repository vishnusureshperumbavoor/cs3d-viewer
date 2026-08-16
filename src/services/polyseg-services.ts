import { LabelmapData, SurfaceMesh } from "../types/common";

const worker = new Worker(
  new URL("../workers/polyseg-workers.js", import.meta.url)
);

const requestMap = new Map();
let nextRequestId = 1;

worker.onmessage = (event) => {
  const { id, success, payload, error } = event.data;
  if (requestMap.has(id)) {
    const { resolve, reject } = requestMap.get(id);
    if (success) {
      const surface = {
        points: new Float32Array(payload.points),
        polys: new Uint32Array(payload.polys),
      };
      resolve(surface);
    } else {
      reject(new Error(error));
    }
    requestMap.delete(id);
  }
};

export const polysegServices = {
  /**
   * Converts a labelmap to a surface mesh using a web worker.
   * @returns {Promise<{points: Float32Array, polys: Uint32Array}>}
   */
  convertLabelmapToSurface: (
    labelmapData: LabelmapData
  ): Promise<SurfaceMesh> => {
    const id = nextRequestId++;
    const promise = new Promise<SurfaceMesh>((resolve, reject) => {
      requestMap.set(id, { resolve, reject });
    });

    const { data, dimensions, spacing, direction, origin, isovalues } =
      labelmapData;

    worker.postMessage(
      {
        id,
        payload: {
          data: data.buffer,
          dimensions,
          spacing,
          direction,
          origin,
          isovalues,
        },
      },
      [data.buffer]
    );

    return promise;
  },
};
