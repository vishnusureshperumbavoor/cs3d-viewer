import * as ort from "onnxruntime-web";

// Configure WASM worker paths & multithreading
ort.env.wasm.numThreads = Math.min(4, typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2);
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";

export type PointPrompt = {
  x: number; // 0 to image width
  y: number; // 0 to image height
  label: number; // 1 = positive foreground, 0 = background
};

const SAM2_DECODER_URLS = [
  "https://huggingface.co/SharpAI/sam2-hiera-tiny-onnx/resolve/main/decoder.onnx",
  "https://huggingface.co/vietanhdev/segment-anything-2-onnx-models/resolve/main/sam2_hiera_tiny.decoder.onnx",
];

// --- IndexedDB Model Cache Manager ---
const DB_NAME = "ONNX_Model_Cache_DB";
const STORE_NAME = "models";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB unavailable"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCachedModelBuffer(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function setCachedModelBuffer(key: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(buffer, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("Failed saving model buffer to IndexedDB:", e);
  }
}

class MedSAMONNXService {
  private decoderSession: ort.InferenceSession | null = null;
  private isInitializing: boolean = false;
  private embeddingCache = new Map<string, Float32Array>();

  async init(): Promise<boolean> {
    if (this.decoderSession) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;

    for (const url of SAM2_DECODER_URLS) {
      try {
        console.log(`Checking IndexedDB cache for ONNX model: ${url}`);
        let buffer = await getCachedModelBuffer(url);

        if (buffer) {
          console.log("⚡ Model buffer restored instantly from IndexedDB cache!");
        } else {
          console.log(`Fetching ONNX model from network: ${url}`);
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          buffer = await response.arrayBuffer();
          await setCachedModelBuffer(url, buffer);
          console.log("Saved ONNX model binary to IndexedDB for offline persistence.");
        }

        this.decoderSession = await ort.InferenceSession.create(new Uint8Array(buffer), {
          executionProviders: ["wasm", "webgl"],
        });
        console.log("SAM 2 ONNX decoder session initialized successfully!");
        console.log("Decoder Model Input Names:", this.decoderSession.inputNames);
        console.log("Decoder Model Output Names:", this.decoderSession.outputNames);
        break;
      } catch (err) {
        console.warn(`Failed loading decoder from ${url}:`, err);
      }
    }

    this.isInitializing = false;
    return this.decoderSession !== null;
  }

  /**
   * Helper to store or retrieve cached ViT image embedding
   */
  getEmbedding(imageId: string): Float32Array | undefined {
    return this.embeddingCache.get(imageId);
  }

  setEmbedding(imageId: string, embedding: Float32Array) {
    this.embeddingCache.set(imageId, embedding);
  }

  /**
   * Run ONNX SAM 2 prompt decoder for point prompt(s)
   */
  async predictMask(
    imageId: string,
    imageEmbedding: Float32Array,
    points: PointPrompt[],
    imageSize: [number, number] = [1024, 1024]
  ): Promise<Uint8Array | null> {
    if (!this.decoderSession) {
      const ok = await this.init();
      if (!ok || !this.decoderSession) return null;
    }

    try {
      const numPoints = points.length;
      const pointCoordsData = new Float32Array(numPoints * 2);
      const pointLabelsData = new Float32Array(numPoints);

      points.forEach((pt, i) => {
        pointCoordsData[i * 2] = pt.x;
        pointCoordsData[i * 2 + 1] = pt.y;
        pointLabelsData[i] = pt.label;
      });

      const inputNames = this.decoderSession.inputNames;
      const feeds: Record<string, ort.Tensor> = {};

      // Map image embedding tensor ('image_embed' or 'image_embeddings')
      const imageEmbedKey = inputNames.find((n) => n.includes("embed")) || "image_embed";
      feeds[imageEmbedKey] = new ort.Tensor("float32", imageEmbedding, [1, 256, 64, 64]);

      // Map point coordinates tensor ('point_coords')
      const pointCoordsKey = inputNames.find((n) => n.includes("coords")) || "point_coords";
      feeds[pointCoordsKey] = new ort.Tensor("float32", pointCoordsData, [1, numPoints, 2]);

      // Map point labels tensor ('point_labels')
      const pointLabelsKey = inputNames.find((n) => n.includes("labels")) || "point_labels";
      feeds[pointLabelsKey] = new ort.Tensor("float32", pointLabelsData, [1, numPoints]);

      // Map image size tensor if requested by ONNX export
      const origSizeKey = inputNames.find((n) => n.includes("size"));
      if (origSizeKey) {
        feeds[origSizeKey] = new ort.Tensor("float32", new Float32Array(imageSize), [2]);
      }

      // Map optional mask_input tensor if requested
      const maskInputKey = inputNames.find((n) => n === "mask_input");
      if (maskInputKey) {
        feeds[maskInputKey] = new ort.Tensor("float32", new Float32Array(1 * 1 * 256 * 256), [1, 1, 256, 256]);
      }

      // Map optional has_mask_input tensor if requested
      const hasMaskKey = inputNames.find((n) => n === "has_mask_input");
      if (hasMaskKey) {
        feeds[hasMaskKey] = new ort.Tensor("float32", new Float32Array([0]), [1]);
      }

      // Map optional high resolution feature tensors if requested by SAM 2
      const highRes0 = inputNames.find((n) => n.includes("high_res_feats_0"));
      if (highRes0) {
        feeds[highRes0] = new ort.Tensor("float32", new Float32Array(1 * 32 * 256 * 256), [1, 32, 256, 256]);
      }
      const highRes1 = inputNames.find((n) => n.includes("high_res_feats_1"));
      if (highRes1) {
        feeds[highRes1] = new ort.Tensor("float32", new Float32Array(1 * 64 * 128 * 128), [1, 64, 128, 128]);
      }

      const results = await this.decoderSession.run(feeds);
      const outputTensorName = this.decoderSession.outputNames[0] || "masks";
      const outputMask = results[outputTensorName]?.data as Float32Array;

      if (!outputMask) return null;

      // Threshold mask to binary Uint8Array (0 or 255)
      const binaryMask = new Uint8Array(outputMask.length);
      for (let i = 0; i < outputMask.length; i++) {
        binaryMask[i] = outputMask[i] > 0 ? 255 : 0;
      }

      return binaryMask;
    } catch (err) {
      console.error("SAM 2 ONNX inference error:", err);
      return null;
    }
  }
}

export const medsamONNXService = new MedSAMONNXService();
