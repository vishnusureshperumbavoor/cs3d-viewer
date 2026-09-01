export interface MonaiTask {
  id: string;
  name: string;
  category: "chest" | "abdomen" | "oncology" | "neuro_mri" | "musculoskeletal" | "all";
  categoryLabel: string;
  description: string;
  structures: string[];
  bodyParts: string[];
  modality: "CT" | "MR" | "ANY";
  modelType: "Segmentation" | "Detection + Seg" | "Multi-Region";
}

export const MONAI_TASKS: MonaiTask[] = [
  // ── CHEST & PULMONARY ──
  {
    id: "lung_nodule_ct_detection",
    name: "Pulmonary Nodules (GGN & Solid)",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description:
      "Specialized 3D Anchor-Free detection & segmentation for Pure Ground-Glass (GGN), Part-Solid, and sub-centimeter Solid lung nodules trained on LIDC-IDRI / LUNA16.",
    structures: [
      "Pure Ground Glass Nodule",
      "Part-Solid Nodule",
      "Solid Pulmonary Nodule",
      "Lung Parenchyma",
    ],
    bodyParts: ["CHEST", "THORAX", "LUNG", "ABDOMEN"],
    modality: "CT",
    modelType: "Detection + Seg",
  },
  {
    id: "lung_airways",
    name: "Airway Tree & Bronchi",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description:
      "High-fidelity bronchial tree, trachea, and segmental airway lumen segmentation from chest CT.",
    structures: [
      "Trachea",
      "Main Bronchi",
      "Lobar Bronchi",
      "Segmental Bronchial Branches",
    ],
    bodyParts: ["CHEST", "THORAX", "LUNG"],
    modality: "CT",
    modelType: "Segmentation",
  },
  {
    id: "covid19_lesion_ct",
    name: "Lung Opacity & Consolidation",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description:
      "Automated volumetric segmentation of ground-glass opacities (GGO), consolidation, and pleural effusion in thoracic CT.",
    structures: [
      "Ground Glass Opacities (GGO)",
      "Parenchymal Consolidation",
      "Pleural Effusion",
    ],
    bodyParts: ["CHEST", "THORAX", "LUNG"],
    modality: "CT",
    modelType: "Segmentation",
  },

  // ── ABDOMINAL ORGANS ──
  {
    id: "spleen_ct_segmentation",
    name: "Spleen 3D UNet",
    category: "abdomen",
    categoryLabel: "Abdomen",
    description:
      "High-resolution 3D volumetric spleen segmentation from contrast-enhanced and non-contrast abdominal CT scans.",
    structures: ["Spleen"],
    bodyParts: ["ABDOMEN", "CHEST", "PELVIS", "WHOLEBODY"],
    modality: "CT",
    modelType: "Segmentation",
  },
  {
    id: "pancreas_ct_segmentation",
    name: "Pancreas & Ducts",
    category: "abdomen",
    categoryLabel: "Abdomen",
    description:
      "Precision deep neural network for pancreatic parenchymal boundary and ductal morphology assessment.",
    structures: ["Pancreas Parenchyma", "Pancreatic Duct"],
    bodyParts: ["ABDOMEN", "WHOLEBODY"],
    modality: "CT",
    modelType: "Segmentation",
  },
  {
    id: "liver_multiorgan_ct",
    name: "Liver & Hepatic Lesions",
    category: "abdomen",
    categoryLabel: "Abdomen",
    description:
      "Automated segmentation of whole liver volume alongside focal hepatic lesions, cysts, and tumors on abdominal CT.",
    structures: ["Liver", "Hepatic Tumor / Lesion"],
    bodyParts: ["ABDOMEN", "WHOLEBODY"],
    modality: "CT",
    modelType: "Segmentation",
  },

  // ── ONCOLOGY & PATHOLOGY ──
  {
    id: "colon_cancer_ct",
    name: "Colorectal Lesions & Polyps",
    category: "oncology",
    categoryLabel: "Oncology",
    description:
      "3D detection and volumetric segmentation of suspicious colorectal wall thickening, masses, and polyps.",
    structures: ["Colorectal Wall", "Colorectal Lesion", "Malignant Polyp"],
    bodyParts: ["ABDOMEN", "PELVIS", "WHOLEBODY"],
    modality: "CT",
    modelType: "Detection + Seg",
  },

  // ── NEUROLOGY & MRI ──
  {
    id: "brain_tumor_mri",
    name: "BraTS Brain Tumor Multi-Region",
    category: "neuro_mri",
    categoryLabel: "MRI & Neuro",
    description:
      "BraTS benchmark multi-sequence MRI segmentation for necrotic core, peritumoral edema, and GD-enhancing tumor.",
    structures: [
      "Enhancing Tumor (ET)",
      "Tumor Core (TC)",
      "Peritumoral Edema (WT)",
    ],
    bodyParts: ["BRAIN", "HEAD", "CRANIUM"],
    modality: "MR",
    modelType: "Multi-Region",
  },
  {
    id: "prostate_mri",
    name: "Prostate PZ & TZ (MRI)",
    category: "neuro_mri",
    categoryLabel: "MRI & Neuro",
    description:
      "Multi-parametric T2W MRI segmentation of prostate gland, peripheral zone (PZ), and transition zone (TZ).",
    structures: ["Peripheral Zone (PZ)", "Transition Zone (TZ)", "Prostate Capsule"],
    bodyParts: ["PELVIS", "PROSTATE"],
    modality: "MR",
    modelType: "Segmentation",
  },

  // ── MUSCULOSKELETAL ──
  {
    id: "vertebrae_segmentation_ct",
    name: "Spine & Vertebral Seg",
    category: "musculoskeletal",
    categoryLabel: "Spine & Bones",
    description:
      "Dense voxel-level 3D segmentation of cervical, thoracic, and lumbar vertebrae on spinal CT exams.",
    structures: ["Vertebral Bodies", "Posterior Neural Arch", "Spinal Canal"],
    bodyParts: ["SPINE", "CHEST", "ABDOMEN", "THORAX"],
    modality: "CT",
    modelType: "Segmentation",
  },
];

export function getRecommendedMonaiTasks(metadata?: {
  modality?: string;
  bodyPartExamined?: string;
  seriesDescription?: string;
}): MonaiTask[] {
  if (!metadata) return MONAI_TASKS.slice(0, 3);

  const mod = (metadata.modality || "CT").toUpperCase();
  const bp = (metadata.bodyPartExamined || "").toUpperCase();
  const desc = (metadata.seriesDescription || "").toUpperCase();

  return MONAI_TASKS.filter((t) => {
    // Modality matching
    if (t.modality !== "ANY" && t.modality !== mod) return false;

    // Body part matching
    if (bp && t.bodyParts.some((b) => bp.includes(b) || b.includes(bp))) {
      return true;
    }

    // Series description heuristic matching
    if (desc) {
      if (desc.includes("CHEST") || desc.includes("LUNG") || desc.includes("THORAX")) {
        return t.category === "chest";
      }
      if (desc.includes("ABD") || desc.includes("LIVER") || desc.includes("SPLEEN") || desc.includes("PANCREAS")) {
        return t.category === "abdomen";
      }
      if (desc.includes("BRAIN") || desc.includes("HEAD") || desc.includes("MR")) {
        return t.category === "neuro_mri";
      }
    }

    return false;
  });
}
