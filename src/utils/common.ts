import { RawLabelmap } from "../types";

const segmentations = new Map<string, any>();
const colors: [number, number, number][] = [
  [1, 0, 0], // Red
  [0, 1, 0], // Green
  [0, 0, 1], // Blue
  [1, 1, 0], // Yellow
  [1, 0, 1], // Magenta
  [0, 1, 1], // Cyan
  [0.5, 0.5, 0.5], // Gray
  [1, 0.5, 0], // Orange
];
let nextColorIndex = 0;

export function getNextColor(): [number, number, number] {
  const color = colors[nextColorIndex];
  nextColorIndex = (nextColorIndex + 1) % colors.length;
  return color;
}

export function clearAllSegmentations(): void {
  segmentations.clear();
  nextColorIndex = 0;
}

export const getUniqueSegmentValues = (labelmap: RawLabelmap) => {
  const uniqueValues = new Set();
  labelmap.pixelData.forEach((value) => {
    if (value > 0) uniqueValues.add(value);
  });
  return Array.from(uniqueValues);
};

export function readFilesAsDataURL(files: File[]): Promise<string[]> {
  const promises: Promise<string | ArrayBuffer | null>[] = files.map((file) => {
    return new Promise<string | ArrayBuffer | null>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  });
  return Promise.all(promises).then((results) =>
    results.map((result) => (typeof result === "string" ? result : ""))
  );
}
