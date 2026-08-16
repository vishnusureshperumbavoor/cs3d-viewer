/* eslint-disable no-restricted-globals */
let polyseg;
let isInitialized = false;
let initializationPromise = null;

const initializePolyseg = async () => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const module = await import("@icr/polyseg-wasm");
      const ICRPolySeg = module.default;
      polyseg = new ICRPolySeg();
      await polyseg.initialize({
        updateProgress: (progress) => {},
      });
      isInitialized = true;
      console.log("Polyseg initialized successfully");
    } catch (error) {
      console.error("Failed to initialize polyseg:", error);
      throw error;
    }
  })();

  return initializationPromise;
};

self.onmessage = async (event) => {
  const { id, payload } = event.data;

  try {
    // Ensure polyseg is initialized before processing
    if (!isInitialized) {
      await initializePolyseg();
    }

    const { data, dimensions, spacing, direction, origin, isovalues } = payload;
    const pixelData = new Uint8Array(data);

    const surface = polyseg.instance.convertLabelmapToSurface(
      pixelData,
      dimensions,
      spacing,
      direction,
      origin,
      isovalues
    );

    if (!surface || !surface.points || !surface.polys) {
      throw new Error("Polyseg failed to generate a surface.");
    }

    self.postMessage(
      {
        id,
        success: true,
        payload: {
          points: surface.points.buffer,
          polys: surface.polys.buffer,
        },
      },
      [surface.points.buffer, surface.polys.buffer]
    );
  } catch (error) {
    console.error("Error in polyseg worker:", error);
    self.postMessage({
      id,
      success: false,
      error: error.message,
    });
  }
};
