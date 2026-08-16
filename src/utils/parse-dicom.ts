import dcmjs from "dcmjs";

const { DicomMessage, DicomMetaDictionary } = dcmjs.data;
const { BitArray } = dcmjs.data;

function dataURLToBuffer(dataURL: string) {
  const byteString = atob(dataURL.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return ab;
}

function unpackBinarySegmentation(
  pixelData: Uint8Array,
  numPixels: number
): Uint8Array {
  const unpacked = new Uint8Array(numPixels);
  const unpackedBitArray: Uint8Array = BitArray.unpack(pixelData);
  for (let i = 0; i < numPixels; i++) {
    unpacked[i] = unpackedBitArray[i];
  }
  return unpacked;
}

export async function parseSeg(url: string) {
  const buffer = dataURLToBuffer(url);
  const dcmDict = DicomMessage.readFile(buffer);
  const dataset = DicomMetaDictionary.naturalizeDataset(dcmDict.dict);

  // Store dataset globally for later use
  (window as any).lastParsedSegDataset = dataset;

  const isSeg = dataset.SOPClassUID === "1.2.840.10008.5.1.4.1.1.66.4";
  if (!isSeg) throw new Error("Not a DICOM SEG object");

  const pixelElement = dataset.PixelData;
  if (!pixelElement) throw new Error("No Pixel Data found in DICOM SEG");

  const pixelData = Array.isArray(pixelElement)
    ? pixelElement[0]
    : pixelElement;

  const rows = dataset.Rows;
  const cols = dataset.Columns;
  const numberOfFrames = dataset.NumberOfFrames || 1;

  const segmentSequence = dataset.SegmentSequence;
  const numSegments = Array.isArray(segmentSequence)
    ? segmentSequence.length
    : 1;

  if (numberOfFrames % numSegments !== 0) {
    console.warn(
      "Number of frames is not a multiple of number of segments. Parsing might be incorrect."
    );
  }
  const framesPerSegment = Math.floor(numberOfFrames / numSegments);

  const frameSize = rows * cols;

  let pixelSpacing = [1, 1];
  let sliceThickness = 1;

  if (dataset.SharedFunctionalGroupsSequence?.[0]?.PixelMeasuresSequence?.[0]) {
    const measures =
      dataset.SharedFunctionalGroupsSequence[0].PixelMeasuresSequence[0];
    pixelSpacing = measures.PixelSpacing || [1, 1];
    sliceThickness = measures.SliceThickness || 1;
  }

  const frames = [];
  const packedFrameLength = Math.ceil((rows * cols) / 8);

  for (let f = 0; f < numberOfFrames; f++) {
    const frameOffset = f * packedFrameLength;
    const packedFrame = new Uint8Array(
      pixelData.slice(frameOffset, frameOffset + packedFrameLength)
    );
    const unpacked = unpackBinarySegmentation(packedFrame, frameSize);
    frames.push(unpacked);
  }

  const labelmaps = [];
  for (let s = 0; s < numSegments; s++) {
    const segmentFrames = frames.slice(
      s * framesPerSegment,
      (s + 1) * framesPerSegment
    );

    if (segmentFrames.length === 0) continue;

    const flatPixels = new Uint8Array(frameSize * framesPerSegment);
    segmentFrames.forEach((frame, i) => {
      const segmentValue = s + 1;
      const segmentFrame = new Uint8Array(frame.length);
      for (let j = 0; j < frame.length; j++) {
        if (frame[j] > 0) {
          segmentFrame[j] = segmentValue;
        }
      }
      flatPixels.set(segmentFrame, i * frameSize);
    });

    let segmentNumber = segmentSequence?.[s]?.SegmentNumber;
    if (segmentNumber === undefined && segmentSequence?.SegmentNumber)
      segmentNumber = segmentSequence.SegmentNumber;

    labelmaps.push({
      pixelData: flatPixels,
      rows,
      cols,
      slices: framesPerSegment,
      pixelSpacing,
      sliceThickness,
      segmentNumber,
    });
  }

  return labelmaps;
}

/**
 * Extracts segmentation structure info from a DICOM SEG dataset.
 * @param dataset The parsed DICOM SEG dataset.
 * @param labelmaps The labelmaps returned by parseSeg.
 * @returns Array of segment info objects.
 */
export function extractSegmentationInfo(dataset: any, labelmaps: any[]) {
  const segmentSequence = dataset.SegmentSequence;
  const segments = Array.isArray(segmentSequence)
    ? segmentSequence
    : [segmentSequence];

  const results = [];

  for (let s = 0; s < segments.length; s++) {
    const segment = segments[s];
    // Structure name
    let name = segment.SegmentLabel || "";
    if (
      segment.SegmentedPropertyTypeCodeSequence &&
      segment.SegmentedPropertyTypeCodeSequence[0]?.CodeMeaning
    ) {
      name = segment.SegmentedPropertyTypeCodeSequence[0].CodeMeaning;
    }

    // Structure Category
    let category = "";
    if (
      segment.SegmentedPropertyCategoryCodeSequence &&
      segment.SegmentedPropertyCategoryCodeSequence[0]?.CodeMeaning
    ) {
      category = segment.SegmentedPropertyCategoryCodeSequence[0].CodeMeaning;
    }

    // Dimensions and volume
    const labelmap = labelmaps[s];
    if (!labelmap) continue;

    const { pixelData, rows, cols, slices, pixelSpacing, sliceThickness } =
      labelmap;
    const voxelVolume =
      (pixelSpacing[0] || 1) * (pixelSpacing[1] || 1) * (sliceThickness || 1); // mm^3

    let voxelCount = 0;
    let minI = cols,
      minJ = rows,
      minK = slices;
    let maxI = 0,
      maxJ = 0,
      maxK = 0;
    for (let k = 0; k < slices; k++) {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const idx = k * rows * cols + j * cols + i;
          if (pixelData[idx] > 0) {
            voxelCount++;
            if (i < minI) minI = i;
            if (j < minJ) minJ = j;
            if (k < minK) minK = k;
            if (i > maxI) maxI = i;
            if (j > maxJ) maxJ = j;
            if (k > maxK) maxK = k;
          }
        }
      }
    }

    // Dimensions in mm
    const dimX = (maxI - minI + 1) * (pixelSpacing[0] || 1);
    const dimY = (maxJ - minJ + 1) * (pixelSpacing[1] || 1);
    const dimZ = (maxK - minK + 1) * (sliceThickness || 1);

    // Volume in cc
    const volumeCC = (voxelCount * voxelVolume) / 1000;

    results.push({
      name,
      category,
      dimension_mm: [dimX, dimY, dimZ],
      volume_cc: volumeCC,
      voxel_count: voxelCount,
      segment_number: segment.SegmentNumber,
    });
  }

  return results;
}
