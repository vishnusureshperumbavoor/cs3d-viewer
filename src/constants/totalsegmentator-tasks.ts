export interface TotalSegTask {
  id: string;
  name: string;
  category: "abdomen" | "cardiac_vascular" | "chest" | "musculoskeletal" | "head_neck" | "whole_body" | "mri";
  categoryLabel: string;
  description: string;
  structures: string[];
  bodyParts: string[];
  modality: "CT" | "MR" | "ANY";
  requiresContrast?: boolean;
}

export const TOTALSEGMENTATOR_TASKS: TotalSegTask[] = [
  // ── Whole Body ──
  {
    id: "total",
    name: "Whole Body (117 Structures)",
    category: "whole_body",
    categoryLabel: "Whole Body",
    description: "Comprehensive multi-organ segmentation (liver, spleen, kidneys, pancreas, GI tract, skeleton & major vessels).",
    structures: ["Liver", "Spleen", "Kidneys", "Pancreas", "Aorta", "IVC", "Vertebrae", "Ribs", "Muscles"],
    bodyParts: ["ABDOMEN", "CHEST", "THORAX", "PELVIS", "WHOLEBODY", "BODY"],
    modality: "CT",
  },

  // ── Abdomen & Body Composition ──
  {
    id: "liver_vessels",
    name: "Hepatic Vessels",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description: "Dedicated portal vein and hepatic veins vascular tree segmentation.",
    structures: ["Portal Vein", "Hepatic Veins", "Inferior Vena Cava"],
    bodyParts: ["ABDOMEN", "LIVER", "WHOLEBODY"],
    modality: "CT",
    requiresContrast: true,
  },
  {
    id: "tissue_types",
    name: "Body Composition (Fat / Muscle / Bone)",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description: "Visceral adipose tissue (VAT), subcutaneous adipose tissue (SAT), skeletal muscle, and bone density analysis.",
    structures: ["Visceral Fat", "Subcutaneous Fat", "Skeletal Muscle", "Intermuscular Fat", "Bone"],
    bodyParts: ["ABDOMEN", "PELVIS", "WHOLEBODY", "BODY"],
    modality: "CT",
  },

  // ── Musculoskeletal & Spine ──
  {
    id: "vertebrae_body",
    name: "Spine / Vertebral Bodies",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description: "Individual vertebral bodies segmentation separated from posterior spinal elements and arches.",
    structures: ["C1-C7", "T1-T12", "L1-L5", "Sacrum", "Vertebral Bodies"],
    bodyParts: ["SPINE", "CSPINE", "TSPINE", "LSPINE", "ABDOMEN", "CHEST", "WHOLEBODY"],
    modality: "CT",
  },
  {
    id: "appendicular_bones",
    name: "Appendicular Bones",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description: "Extremity skeletal system segmentation (femur, tibia, fibula, humerus, radius, ulna, clavicle, scapula).",
    structures: ["Femur", "Tibia", "Fibula", "Humerus", "Radius", "Ulna", "Clavicle", "Scapula", "Pelvis"],
    bodyParts: ["LEG", "ARM", "SHOULDER", "THIGH", "EXTREMITY", "WHOLEBODY"],
    modality: "CT",
  },
  {
    id: "thigh_shoulder_muscles",
    name: "Thigh & Shoulder Muscles",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description: "Individual muscle bundle segmentation for limb and rotator cuff musculature.",
    structures: ["Quadriceps", "Hamstrings", "Gluteal Muscles", "Deltoid", "Rotator Cuff"],
    bodyParts: ["THIGH", "LEG", "SHOULDER", "ARM", "EXTREMITY"],
    modality: "CT",
  },

  // ── Cardiac & Vascular ──
  {
    id: "heartchambers_highres",
    name: "Cardiac Chambers (High-Res)",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description: "High-resolution four-chamber cardiac segmentation with myocardium and great vessel roots.",
    structures: ["Left Ventricle", "Right Ventricle", "Left Atrium", "Right Atrium", "Myocardium", "Ascending Aorta", "Pulmonary Artery"],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
  },
  {
    id: "coronary_arteries",
    name: "Coronary Arteries (CTA)",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description: "Left anterior descending (LAD), left circumflex (LCx), and right coronary artery (RCA) tree.",
    structures: ["LAD", "LCx", "RCA", "Main Coronary Arteries"],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
    requiresContrast: true,
  },
  {
    id: "aortic_sinuses",
    name: "Aortic Valve Sinuses",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description: "Left, right, and non-coronary aortic sinuses and aortic root anatomy.",
    structures: ["Left Coronary Sinus", "Right Coronary Sinus", "Non-Coronary Sinus"],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
    requiresContrast: true,
  },

  // ── Chest & Lungs ──
  {
    id: "lung_vessels",
    name: "Pulmonary Vessels",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description: "Detailed pulmonary arterial and venous vascular tree throughout all lung lobes.",
    structures: ["Pulmonary Arteries", "Pulmonary Veins"],
    bodyParts: ["CHEST", "THORAX", "LUNG"],
    modality: "CT",
  },
  {
    id: "pleural_pericard_effusion",
    name: "Pleural & Pericardial Effusion",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description: "Automated quantification and segmentation of abnormal fluid accumulation in pleural and pericardial cavities.",
    structures: ["Pleural Effusion", "Pericardial Effusion"],
    bodyParts: ["CHEST", "THORAX", "HEART", "LUNG"],
    modality: "CT",
  },

  // ── Head, Neck & Brain ──
  {
    id: "brain_structures",
    name: "Brain Sub-structures",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Deep gray nuclei, cerebral ventricles, brainstem, and cerebellum sub-segmentation.",
    structures: ["Ventricles", "Brainstem", "Cerebellum", "Thalamus", "Hippocampus", "Basal Ganglia"],
    bodyParts: ["HEAD", "BRAIN", "SKULL"],
    modality: "CT",
  },
  {
    id: "cerebral_bleed",
    name: "Intracranial Hemorrhage",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Emergency acute intracranial bleeding detection (subarachnoid, subdural, epidural, intraparenchymal).",
    structures: ["Intracranial Bleed", "Hemorrhage Volume"],
    bodyParts: ["HEAD", "BRAIN", "SKULL"],
    modality: "CT",
  },
  {
    id: "head_glands_cavities",
    name: "Head Glands & Cavities",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Parotid & submandibular salivary glands, nasal cavities, orbits, and paranasal sinuses.",
    structures: ["Parotid Glands", "Submandibular Glands", "Nasal Cavity", "Maxillary Sinus", "Orbits"],
    bodyParts: ["HEAD", "NECK", "SKULL", "FACE"],
    modality: "CT",
  },
  {
    id: "headneck_muscles",
    name: "Head & Neck Muscles",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Sternocleidomastoid, trapezius, and pharyngeal/masticatory muscle groups.",
    structures: ["Sternocleidomastoid", "Trapezius", "Masseter", "Pterygoid"],
    bodyParts: ["HEAD", "NECK"],
    modality: "CT",
  },

  // ── MRI Support ──
  {
    id: "total_mr",
    name: "Total MRI (Whole Body)",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Multi-organ segmentation model specifically trained on Magnetic Resonance Imaging sequences.",
    structures: ["Liver", "Kidneys", "Spleen", "Pancreas", "Bones", "Major Vessels"],
    bodyParts: ["ABDOMEN", "CHEST", "PELVIS", "WHOLEBODY"],
    modality: "MR",
  },
];

/**
 * Returns recommended TotalSegmentator tasks matching the current study/series metadata.
 */
export function getRecommendedTasks(metadata?: {
  modality?: string;
  bodyPartExamined?: string;
  seriesDescription?: string;
  contrastBolusAgent?: string;
}): TotalSegTask[] {
  const modality = (metadata?.modality || "CT").toUpperCase();
  const bodyPart = (metadata?.bodyPartExamined || "").toUpperCase();
  const desc = (metadata?.seriesDescription || "").toLowerCase();

  // If MRI scan
  if (modality === "MR") {
    return TOTALSEGMENTATOR_TASKS.filter((t) => t.id === "total_mr");
  }

  // Head / Brain
  if (bodyPart.includes("HEAD") || bodyPart.includes("BRAIN") || desc.includes("head") || desc.includes("brain")) {
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      ["brain_structures", "cerebral_bleed", "head_glands_cavities", "headneck_muscles", "total"].includes(t.id)
    );
  }

  // Chest / Thorax
  if (bodyPart.includes("CHEST") || bodyPart.includes("THORAX") || desc.includes("chest") || desc.includes("thorax") || desc.includes("lung")) {
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      ["total", "heartchambers_highres", "lung_vessels", "coronary_arteries", "pleural_pericard_effusion"].includes(t.id)
    );
  }

  // Extremity
  if (bodyPart.includes("LEG") || bodyPart.includes("ARM") || bodyPart.includes("THIGH") || bodyPart.includes("KNEE") || bodyPart.includes("SHOULDER")) {
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      ["appendicular_bones", "thigh_shoulder_muscles", "total"].includes(t.id)
    );
  }

  // Default Abdomen / Pelvis / Whole body
  return TOTALSEGMENTATOR_TASKS.filter((t) =>
    ["total", "liver_vessels", "tissue_types", "vertebrae_body"].includes(t.id)
  );
}
