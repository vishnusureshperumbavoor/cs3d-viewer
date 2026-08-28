# 🧬 CS3D Viewer — 3D DICOM & AI Segmentation Workspace

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cornerstone3D](https://img.shields.io/badge/Cornerstone3D-v5-orange)](https://www.cornerstonejs.org/)
[![VTK.js](https://img.shields.io/badge/VTK.js-v36-008080)](https://kitware.github.io/vtk-js/)
[![TotalSegmentator](https://img.shields.io/badge/TotalSegmentator-v2-red)](https://github.com/wasserth/TotalSegmentator)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Orthanc](https://img.shields.io/badge/Orthanc-DICOMweb-blue)](https://www.orthanc-server.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A state-of-the-art, web-based medical imaging workspace for DICOM visualization and deep learning segmentation analysis. Built with **Cornerstone3D**, **VTK.js**, and **TotalSegmentator v2**, CS3D Viewer provides synchronized Multi-Planar Reconstruction (MPR), GPU/WASM-accelerated 3D surface mesh generation, automated clinical AI segmentations, and DICOMweb PACS connectivity via **Orthanc**.

---

## 🌟 Highlights & Key Features

### 🖥️ Cornerstone3D Multi-Planar Reconstruction (MPR)
- **Synchronized Orthogonal Viewports**: High-performance Axial, Sagittal, and Coronal reconstructions.
- **Clinical Tools**: Crosshairs, zoom, pan, synchronized slice scrolling, and VOI / Window-Level adjustments.
- **Window/Level Presets**: One-click CT presets (Soft Tissue / Abdomen, Bone, Lung, Brain, Mediastinum, Angio) with live HUD telemetry (WW/WC, slice index, zoom level, slice thickness).

### 🧊 Interactive 3D Surface Rendering & WASM Mesh Engine
- **VTK.js 3D Viewport**: Real-time rendering of full 3D anatomical structures with camera orbit, pan, zoom, and orientation gizmo.
- **WASM Acceleration**: Powered by `@icr/polyseg-wasm` running in dedicated Web Workers for instant client-side conversion of DICOM SEG labelmaps to 3D surface meshes.
- **STL Export**: Export any segmented organ or pathological structure to a 3D-printable `.stl` file with real-world millimeter coordinates.

### 🧠 TotalSegmentator v2 AI Hub
- **15+ Automated Deep Learning Tasks**: Whole Body (117 anatomical structures), Abdominal Organs & Vessels, Spine & Vertebrae, Cardiac Chambers & Coronary Arteries, Pulmonary Vessels, Head & Brain, and MRI models.
- **Intelligent Recommendation Engine**: Automatically suggests relevant AI segmentation tasks based on DICOM series metadata (modality, body part examined, contrast agent, slice count).
- **Fast / High-Res Modes**: Fast 3mm inference for rapid previews or full-resolution inference for fine anatomical detail.
- **Compliance**: Generates standard DICOM SEG objects and automatically stores them in Orthanc via STOW-RS.

### ☁️ Hugging Face & Cloud Dataset Integration
- **1-Click Public Dataset Streaming**: Download and ingest sample CT/MR studies directly from the [Hugging Face Sample Dataset Repository](https://huggingface.co/datasets/vishnusureshperumbavoor/dicom_public_dataset) into Orthanc with live SSE progress tracking.
- **Cloud Segmentation Sync**: Push generated DICOM SEG objects directly to the Hugging Face dataset repository for remote sharing, archiving, and collaboration.

### 📲 Real-Time Telegram Notifications
- Live bot notifications with rich clinical metadata (Patient Name/ID, Study Description, Anatomy, Slice dimensions, Contrast status) upon AI task execution and completion.

### 📋 DICOMweb Worklist & PACS Integration
- **QIDO-RS Search**: Query studies and series from Orthanc DICOM server with filters for Patient ID, Name, Modality, and Date range.
- **Series Preview**: Thumbnail strip and series selector for seamless switching between original imaging and segmentation objects.

---

## 🏗️ Architecture

```mermaid
flowchart TB
    subgraph Frontend ["Frontend (React 19 + TypeScript)"]
        UI["Modern Dark Glassmorphism UI"]
        CS3D["Cornerstone3D MPR Engine (Axial / Sagittal / Coronal)"]
        VTK["VTK.js 3D Surface Mesh Viewport"]
        PolySeg["PolySeg WASM Worker (Labelmap -> Mesh)"]
        Worklist["DICOMweb QIDO-RS Worklist & Dataset Hub"]
    end

    subgraph Backend ["AI Backend (FastAPI + PyTorch)"]
        API["FastAPI Endpoints"]
        TS["TotalSegmentator v2 (nnU-Net Models)"]
        DatasetSvc["Hugging Face Dataset Ingestion & Sync"]
        Telegram["Telegram Notification Bot"]
    end

    subgraph PACS ["PACS / DICOM Server"]
        Orthanc["Orthanc DICOM Server (DICOMweb: WADO-RS / QIDO-RS / STOW-RS)"]
    end

    subgraph Cloud ["External Cloud Services"]
        HF["Hugging Face Hub"]
        TG["Telegram API"]
    end

    UI --> CS3D
    UI --> VTK
    VTK <--> PolySeg
    UI <--> Worklist
    Worklist <-->|WADO-RS / QIDO-RS| Orthanc

    UI <-->|REST / SSE Stream| API
    API <-->|REST / STOW-RS| Orthanc
    API --> TS
    API <-->|Datasets & SEG Upload| HF
    API -->|Progress Alerts| TG
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, TypeScript, React App Rewired |
| **Medical Imaging (2D/MPR)** | `@cornerstonejs/core`, `@cornerstonejs/tools`, `@cornerstonejs/dicom-image-loader` |
| **3D Rendering & Meshing** | `@kitware/vtk.js`, `@icr/polyseg-wasm` |
| **DICOM Parsing & SEG** | `dcmjs`, `dicom-parser` |
| **Backend Framework** | FastAPI, Uvicorn, Python 3.12 (`uv` virtual environment) |
| **AI Inference** | TotalSegmentator v2, PyTorch, SimpleITK, `pydicom` |
| **PACS / DICOM Server** | Orthanc (with DICOMweb plugin) via Docker |
| **Cloud Integrations** | Hugging Face Hub API (`huggingface_hub`), Telegram Bot API |

---

## 🚀 Quick Start

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) (v18.x or higher) and `npm`
- [uv](https://astral.sh/uv) (recommended) or Python 3.10–3.12

---

### Step 1: Start the Orthanc DICOM Server

Launch the Orthanc PACS server with DICOMweb support via Docker:

```bash
docker compose up -d orthanc
```

* **Orthanc Web UI**: [http://localhost:8042](http://localhost:8042)
* **Orthanc Explorer 2**: [http://localhost:8042/ui/app/index.html](http://localhost:8042/ui/app/index.html)
* **Default Credentials**: Username: `orthanc` | Password: `orthanc`

---

### Step 2: Start the FastAPI AI Backend

The backend launcher script automatically manages the virtual environment, detects GPU/CPU hardware, and installs all dependencies:

```bash
# First-time setup (creates virtual environment and installs dependencies)
npm run start:server -- --install

# Subsequent runs
npm run start:server
```

> **Note**: If an NVIDIA GPU is present with CUDA drivers, PyTorch with GPU acceleration will be used. Otherwise, a lightweight CPU build is automatically configured.

* **FastAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Step 3: Start the React Frontend

Install npm dependencies and launch the dev server:

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### ⚙️ Environment Variables (Optional)

Create a `.env` file in the project root to configure cloud features:

```env
# Hugging Face Access Token (for downloading datasets and pushing SEG objects)
HF_TOKEN=hf_your_huggingface_token_here

# Telegram Bot Notifications (optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

---

## 🧬 TotalSegmentator Task Catalog

CS3D Viewer provides built-in UI triggers for over 15 clinical AI segmentation models:

| Category | Task ID | Model Name | Anatomy / Target Structures | Modality |
|---|---|---|---|---|
| **Whole Body** | `total` | Whole Body (117 Structures) | Liver, spleen, kidneys, pancreas, GI tract, skeleton, major vessels | CT |
| **Abdomen** | `liver_vessels` | Hepatic Vessels | Portal vein, hepatic veins, inferior vena cava | CT (CE) |
| **Abdomen** | `tissue_types` | Body Composition | Visceral fat (VAT), subcutaneous fat (SAT), skeletal muscle, bone | CT |
| **Musculoskeletal** | `vertebrae_body` | Vertebral Bodies | Individual cervical, thoracic, lumbar vertebrae, and sacrum | CT |
| **Musculoskeletal** | `appendicular_bones` | Appendicular Bones | Extremity bones (femur, tibia, fibula, humerus, radius, ulna, etc.) | CT |
| **Musculoskeletal** | `thigh_shoulder_muscles` | Limb Musculature | Quadriceps, hamstrings, gluteal, deltoid, rotator cuff muscles | CT |
| **Cardiac & Vascular** | `heartchambers_highres` | Cardiac Chambers | Left/Right ventricles and atria, myocardium, ascending aorta | CT |
| **Cardiac & Vascular** | `coronary_arteries` | Coronary Arteries | LAD, LCx, RCA arterial tree | CT (CTA) |
| **Cardiac & Vascular** | `aortic_sinuses` | Aortic Valve Sinuses | Left, right, and non-coronary aortic sinuses | CT (CE) |
| **Chest & Lungs** | `lung_vessels` | Pulmonary Vessels | Pulmonary arterial and venous vascular trees across all lobes | CT |
| **Chest & Lungs** | `pleural_pericard_effusion` | Fluid Effusions | Pleural and pericardial fluid accumulations | CT |
| **Head & Brain** | `brain_structures` | Brain Sub-structures | Deep gray nuclei, ventricles, brainstem, cerebellum, hippocampus | CT |
| **Head & Brain** | `cerebral_bleed` | Intracranial Hemorrhage | Subarachnoid, subdural, epidural, and intraparenchymal bleeding | CT |
| **Head & Brain** | `head_glands_cavities` | Head Glands & Cavities | Parotid/submandibular glands, nasal cavity, orbits, sinuses | CT |
| **Head & Brain** | `headneck_muscles` | Head & Neck Muscles | Sternocleidomastoid, trapezius, masticatory muscle groups | CT |
| **MRI** | `total_mr` | Total MRI | Multi-organ segmentation optimized for MR sequences | MR |

---

## 📖 User Workflow

1. **Load a Study**:
   - Navigate to the **Worklist** tab to browse studies already in Orthanc, or
   - Click **Import Sample Dataset** to stream a sample CT dataset from Hugging Face.
2. **Explore in 2D / MPR**:
   - Inspect axial, sagittal, and coronal planes with synced crosshairs and custom CT Window/Level presets.
3. **Execute TotalSegmentator AI**:
   - Switch to the **TotalSegmentator** tab in the right panel.
   - Choose a recommended or specialized task and click **Run TotalSegmentator**.
   - Monitor real-time status and receive instant Telegram alerts upon completion.
4. **Inspect & Manage 3D Segments**:
   - Inspect generated DICOM SEG objects directly in the 3D VTK viewport.
   - Toggle segment visibility, adjust opacity, and inspect structure volume (cm³) and bounding box metrics.
5. **Export 3D STL**:
   - Click the **STL Export** button on any segment to generate and download a 3D-printable mesh.
6. **Push to Hugging Face**:
   - Upload completed DICOM SEG results directly to your Hugging Face dataset repository for collaboration.

---

## 📁 Repository Structure

```
cs3d-viewer/
├── backend/                        # FastAPI AI Backend
│   ├── core/                       # App configuration & settings
│   ├── routers/                    # API routes (dataset, segmentation)
│   ├── services/                   # Business logic (Orthanc client, TotalSegmentator runner, Telegram)
│   ├── Dockerfile                  # Docker build for AI backend
│   ├── requirements.txt            # Python dependencies
│   └── run_server.sh               # Auto-setup & startup script
├── public/                         # Static assets & HTML template
├── src/
│   ├── components/                 # React UI components
│   │   ├── viewer/                 # Viewer panels, headers, TotalSegmentator UI
│   │   ├── viewport/               # MPR & VTK viewport components, HUD, W/L toolbar
│   │   └── worklist/               # QIDO-RS search table & dataset import widgets
│   ├── constants/                  # TotalSegmentator tasks & DICOM presets
│   ├── hooks/                      # Custom React hooks
│   ├── pages/                      # WorklistPage & ViewerPage
│   ├── services/                   # Frontend services (Cornerstone, VTK, PolySeg, DICOMweb)
│   ├── styles/                     # Component stylesheets
│   ├── types/                      # TypeScript definitions
│   └── workers/                    # Web Workers (PolySeg WASM worker)
├── docker-compose.yml              # Orthanc & Backend Docker services
├── package.json                    # NPM scripts & dependencies
└── README.md                       # Project documentation
```

---

## 🤝 Contributing

Contributions are welcome! If you have suggestions, feature requests, or bug reports, please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
