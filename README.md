# 🧬 3D DICOM Segmentation Viewer

A high-performance, web-based 3D viewer for DICOM Segmentation (SEG) files. This application allows users to visualize complex medical segmentations in a 3D environment, manage segment visibility, and export specific regions as STL files.

![Project Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- 🚀 **Fast 3D Rendering**: High-performance visualization using [VTK.js](https://kitware.github.io/vtk-js/).
- 🧪 **DICOM SEG Support**: Seamlessly parse and load DICOM segmentation objects using [dcmjs](https://github.com/dcmjs-org/dcmjs).
- 🎨 **Segment Management**: 
    - List all structures (e.g., organs, tumors) within a SEG file.
    - View metadata including volume (cc) and dimensions (mm).
    - Toggle visibility for individual segments.
- 📤 **STL Export**: Export any segment to an STL file for 3D printing or further analysis.
- ⚙️ **WASM Acceleration**: Powered by `@icr/polyseg-wasm` in a dedicated Web Worker for efficient labelmap-to-surface conversion.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Visualization**: [VTK.js](https://kitware.github.io/vtk-js/)
- **DICOM Parsing**: [dcmjs](https://github.com/dcmjs-org/dcmjs)
- **Segmentation Engine**: [@icr/polyseg-wasm](https://github.com/ICR-PolySeg/polyseg-wasm)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or higher)
- npm or yarn

### Running Locally

To run the application, ensure all three components (Orthanc DICOM Server, FastAPI AI Backend, and React Frontend) are started:

1. **Start the Orthanc DICOM Server:**
   ```bash
   docker compose up -d orthanc
   ```

2. **Start the FastAPI AI Backend:**
   - First-time setup:
     ```bash
     npm run start:server -- --install
     ```
   - Subsequent runs:
     ```bash
     npm run start:server
     ```

3. **Start the React Frontend:**
   ```bash
   npm install
   npm start
   ```

4. **Explore the interface:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.
   To run automated segmentations, load a series and click the **🧠 TotalSegmentator** button in the top menu. The backend will perform deep learning inference and output the DICOM SEG files directly into Orthanc and the 3D viewer.


### 📤 Uploading Data to Orthanc

To search and view DICOM studies in the viewer, you need to populate your local Orthanc instance. If you do not have any DICOM data on hand, you can download a sample dataset from [Hugging Face](https://huggingface.co/datasets/vishnusureshperumbavoor/dicom_public_dataset/tree/main).

1. **Open Orthanc Explorer 2**:
   Navigate to [http://localhost:8042/ui/app/index.html](http://localhost:8042/ui/app/index.html) (or click **Open Orthanc Explorer 2** from the default page at [http://localhost:8042](http://localhost:8042)). 
   *Note: Use the default credentials if prompted for login:*
   * **Username**: `orthanc`
   * **Password**: `orthanc`
2. **Upload Files**:
   * Click the **Upload** option in the sidebar/top menu.
   * Drag and drop your DICOM `.dcm` files (or select a directory containing the slice series).
   * Click **Start Upload** to load them into the database.
3. **Verify**:
   Once uploaded, return to the VSP Worklist page to search for and view the study.

## 📖 Usage

1. **Upload**: Drag and drop or select a `.dcm` (DICOM SEG) file using the sidebar.
2. **Explore**: Once loaded, the 3D surface will be rendered in the main viewport.
3. **Analyze**: Check the sidebar for detailed information about each segment, including its name, category, and calculated volume.
4. **Control**: Use the toggle switches to show/hide specific segments.
5. **Export**: Click the download icon next to a segment to save it as an STL file.

## 🤝 Contributing

Contributions are welcome!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
