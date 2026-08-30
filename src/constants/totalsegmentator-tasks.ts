export interface TotalSegTask {
  id: string;
  name: string;
  category:
    | "whole_body"
    | "abdomen"
    | "cardiac_vascular"
    | "chest"
    | "musculoskeletal"
    | "head_neck"
    | "pathology"
    | "mri";
  categoryLabel: string;
  description: string;
  structures: string[];
  bodyParts: string[];
  modality: "CT" | "MR" | "ANY";
  requiresContrast?: boolean;
  requiresLicense?: boolean;
}

export const TOTALSEGMENTATOR_TASKS: TotalSegTask[] = [
  // ──────────────────────────────────────────
  // ── WHOLE BODY ──
  // ──────────────────────────────────────────
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
  {
    id: "total_v3",
    name: "Whole Body v3 (nnU-Net ResEnc)",
    category: "whole_body",
    categoryLabel: "Whole Body",
    description: "Latest generation whole-body multi-organ segmentation with updated residual encoder architecture.",
    structures: ["117 Multi-Organ Structures", "Parenchyma", "Vascular System", "Axial Skeleton"],
    bodyParts: ["ABDOMEN", "CHEST", "THORAX", "PELVIS", "WHOLEBODY", "BODY"],
    modality: "CT",
  },
  {
    id: "body",
    name: "Body Contour & Skin",
    category: "whole_body",
    categoryLabel: "Whole Body",
    description: "Full external body habitus delineation and patient outer contour extraction.",
    structures: ["Body Truncus", "Skin Outer Boundary"],
    bodyParts: ["WHOLEBODY", "BODY", "ABDOMEN", "CHEST", "PELVIS"],
    modality: "CT",
  },

  // ──────────────────────────────────────────
  // ── ABDOMEN & ORGANS ──
  // ──────────────────────────────────────────
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
    id: "liver_segments",
    name: "Couinaud Liver Segments (I-VIII)",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description: "Functional anatomical liver segmentation into segments I to VIII according to Couinaud classification.",
    structures: ["Segment I (Caudate)", "Segments II-III (Lateral)", "Segment IVa/b", "Segments V-VIII"],
    bodyParts: ["ABDOMEN", "LIVER", "WHOLEBODY"],
    modality: "CT",
    requiresContrast: true,
  },
  {
    id: "tissue_types",
    name: "Body Composition (3-Class)",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description: "Visceral adipose tissue (VAT), subcutaneous adipose tissue (SAT), and skeletal muscle analysis.",
    structures: ["Visceral Fat (VAT)", "Subcutaneous Fat (SAT)", "Skeletal Muscle"],
    bodyParts: ["ABDOMEN", "PELVIS", "WHOLEBODY", "BODY"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "tissue_4_types",
    name: "Body Composition (4-Class)",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description: "Extended sarcopenia assessment including intermuscular adipose tissue (IMAT), SAT, VAT, and skeletal muscle.",
    structures: ["Visceral Fat", "Subcutaneous Fat", "Skeletal Muscle", "Intermuscular Fat (IMAT)"],
    bodyParts: ["ABDOMEN", "PELVIS", "WHOLEBODY", "BODY"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "abdominal_muscles",
    name: "Abdominal Wall Muscles (22 Classes)",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description: "High-resolution segmentation of individual abdominal wall, retroperitoneal, and back muscle groups.",
    structures: ["Rectus Abdominis", "External Oblique", "Internal Oblique", "Transversus", "Psoas", "Erector Spinae"],
    bodyParts: ["ABDOMEN", "PELVIS", "LSPINE", "BODY"],
    modality: "CT",
  },
  {
    id: "trunk_cavities",
    name: "Trunk Body Cavities",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description: "Major anatomical compartments of the torso (abdominal cavity, thoracic cavity, pericardium, mediastinum).",
    structures: ["Abdominal Cavity", "Thoracic Cavity", "Pericardium", "Mediastinum"],
    bodyParts: ["ABDOMEN", "CHEST", "THORAX", "PELVIS", "BODY"],
    modality: "CT",
  },

  // ──────────────────────────────────────────
  // ── CARDIAC & VASCULAR ──
  // ──────────────────────────────────────────
  {
    id: "heartchambers_highres",
    name: "Cardiac Chambers (High-Res)",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description: "High-resolution four-chamber cardiac segmentation with myocardium and great vessel roots.",
    structures: ["Left Ventricle", "Right Ventricle", "Left Atrium", "Right Atrium", "Myocardium", "Ascending Aorta", "Pulmonary Artery"],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "ventricle_parts",
    name: "Ventricle Sub-structures (12 Classes)",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description: "Detailed ventricular components including papillary muscles, outflow tracts, and interventricular septum.",
    structures: ["Left/Right Ventricle", "Papillary Muscles", "Interventricular Septum", "Outflow Tracts"],
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
    requiresLicense: true,
  },
  {
    id: "aortic_sinuses",
    name: "Aortic Valve Sinuses",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description: "Left, right, and non-coronary aortic sinuses and aortic root anatomy.",
    structures: ["Left Coronary Sinus", "Right Coronary Sinus", "Non-Coronary Sinus", "LV Outflow Tract"],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
    requiresContrast: true,
    requiresLicense: true,
  },
  {
    id: "aorta_annulus",
    name: "Aorta Annulus & STJ (TAVR)",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description: "Aortic valve annulus proper and sinotubular junction for transcatheter aortic valve replacement (TAVR) planning.",
    structures: ["Annulus Proper", "Sinotubular Junction"],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
    requiresContrast: true,
    requiresLicense: true,
  },
  {
    id: "aortic_dissection",
    name: "Aortic Dissection (True/False Lumen)",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description: "Automated delineation of aortic true lumen and false lumen in acute aortic dissection.",
    structures: ["Aorta True Lumen", "Aorta False Lumen"],
    bodyParts: ["CHEST", "THORAX", "ABDOMEN", "HEART", "CARDIAC"],
    modality: "CT",
    requiresContrast: true,
    requiresLicense: true,
  },
  {
    id: "renal_arteries",
    name: "Renal & Visceral Arteries",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description: "Major visceral aorta branches: celiac trunk, superior mesenteric artery (SMA), and left/right renal arteries.",
    structures: ["Celiac Trunk", "Superior Mesenteric Artery", "Renal Arteries"],
    bodyParts: ["ABDOMEN", "KIDNEY", "WHOLEBODY"],
    modality: "CT",
    requiresContrast: true,
    requiresLicense: true,
  },
  {
    id: "pulmonary_artery_landmarks",
    name: "Pulmonary Artery Landmarks",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description: "Key anatomical landmarks of the pulmonary trunk, bifurcation, annulus, and main branch origins.",
    structures: ["Pulmonary Annulus", "Sinotubular Junction", "Bifurcation", "Left/Right Branch Origins"],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
    requiresContrast: true,
    requiresLicense: true,
  },

  // ──────────────────────────────────────────
  // ── CHEST & LUNGS ──
  // ──────────────────────────────────────────
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
    id: "lung_nodules",
    name: "Pulmonary Nodules",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description: "Detection and volumetric segmentation of suspicious solid and sub-solid pulmonary lung nodules.",
    structures: ["Lung Nodules", "Sub-solid Nodules"],
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
  {
    id: "breasts",
    name: "Breast Tissue",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description: "Delineation of bilateral glandular and fibroadipose breast parenchyma.",
    structures: ["Bilateral Breast Tissue"],
    bodyParts: ["CHEST", "THORAX", "BREAST"],
    modality: "CT",
  },

  // ──────────────────────────────────────────
  // ── MUSCULOSKELETAL & SPINE ──
  // ──────────────────────────────────────────
  {
    id: "vertebrae_body",
    name: "Spine / Vertebral Bodies",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description: "Vertebral bodies segmentation separated from posterior spinal elements and intervertebral discs.",
    structures: ["Vertebral Bodies", "Intervertebral Discs"],
    bodyParts: ["SPINE", "CSPINE", "TSPINE", "LSPINE", "ABDOMEN", "CHEST", "WHOLEBODY"],
    modality: "CT",
  },
  {
    id: "vertebrae_pp",
    name: "Individual Vertebrae (C1-L5)",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description: "Complete spine numbering with 24 individual vertebral classes from cervical C1 through lumbar L5.",
    structures: ["C1-C7", "T1-T12", "L1-L5"],
    bodyParts: ["SPINE", "CSPINE", "TSPINE", "LSPINE", "NECK", "CHEST", "ABDOMEN", "WHOLEBODY"],
    modality: "CT",
  },
  {
    id: "vertebrae_pp_refined",
    name: "Refined Vertebrae (C1-L5)",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description: "Refined high-fidelity boundary segmentation of 24 individual vertebrae from C1 to L5.",
    structures: ["Refined C1-C7", "Refined T1-T12", "Refined L1-L5"],
    bodyParts: ["SPINE", "CSPINE", "TSPINE", "LSPINE", "NECK", "CHEST", "ABDOMEN", "WHOLEBODY"],
    modality: "CT",
  },
  {
    id: "appendicular_bones",
    name: "Appendicular Bones (Extremities)",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description: "Extremity skeletal system segmentation (femur, tibia, fibula, humerus, radius, ulna, carpal, tarsal, phalanges).",
    structures: ["Patella", "Tibia", "Fibula", "Radius", "Ulna", "Carpal/Tarsal", "Metacarpal/Metatarsal", "Phalanges"],
    bodyParts: ["LEG", "ARM", "SHOULDER", "THIGH", "KNEE", "FOOT", "HAND", "EXTREMITY", "WHOLEBODY"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "thigh_shoulder_muscles",
    name: "Thigh & Shoulder Muscles",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description: "Individual muscle bundle segmentation for limb, rotator cuff, and thigh musculature (18 classes).",
    structures: ["Quadriceps", "Hamstrings", "Sartorius", "Deltoid", "Rotator Cuff", "Trapezius", "Triceps"],
    bodyParts: ["THIGH", "LEG", "SHOULDER", "ARM", "EXTREMITY"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "hip_implant",
    name: "Hip Arthroplasty Implant",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description: "Localization and segmentation of prosthetic hip joint implants and metal hardware.",
    structures: ["Hip Joint Prosthesis"],
    bodyParts: ["PELVIS", "HIP", "THIGH", "LEG"],
    modality: "CT",
  },

  // ──────────────────────────────────────────
  // ── HEAD, NECK & DENTAL ──
  // ──────────────────────────────────────────
  {
    id: "brain_structures",
    name: "Brain Sub-structures (16 Classes)",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Deep gray nuclei, cerebral ventricles, brainstem, internal capsule, insula, and cerebral lobes.",
    structures: ["Brainstem", "Ventricles", "Cerebellum", "Caudate", "Thalamus", "Frontal/Parietal/Temporal/Occipital Lobes"],
    bodyParts: ["HEAD", "BRAIN", "SKULL"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "head_glands_cavities",
    name: "Head Glands & Cavities",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Parotid & submandibular salivary glands, nasal cavities, orbits, and paranasal sinuses.",
    structures: ["Parotid Glands", "Submandibular Glands", "Nasal Cavity", "Maxillary Sinuses", "Orbits"],
    bodyParts: ["HEAD", "NECK", "SKULL", "FACE"],
    modality: "CT",
  },
  {
    id: "head_muscles",
    name: "Head & Facial Muscles (11 Classes)",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Detailed masticatory and facial expression muscle groups.",
    structures: ["Masseter", "Temporalis", "Medial Pterygoid", "Lateral Pterygoid"],
    bodyParts: ["HEAD", "FACE", "SKULL", "NECK"],
    modality: "CT",
  },
  {
    id: "headneck_bones_vessels",
    name: "Head & Neck Bones & Great Vessels",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Cervical spine, skull base osseous anatomy, carotid arteries, and internal jugular veins.",
    structures: ["Carotid Arteries", "Internal Jugular Veins", "Cervical Bones", "Hyoid Bone"],
    bodyParts: ["HEAD", "NECK"],
    modality: "CT",
    requiresContrast: true,
  },
  {
    id: "headneck_muscles",
    name: "Head & Neck Muscles (23 Classes)",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Sternocleidomastoid, trapezius, scalenes, and pharyngeal muscle groups.",
    structures: ["Sternocleidomastoid", "Trapezius", "Scalene Muscles", "Digastric", "Omohyoid"],
    bodyParts: ["HEAD", "NECK"],
    modality: "CT",
  },
  {
    id: "oculomotor_muscles",
    name: "Oculomotor Muscles & Orbit (19 Classes)",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Extraocular eye muscles (recti, obliques), optic nerve, eyeball, and retrobulbar orbital fat.",
    structures: ["Medial/Lateral Rectus", "Superior/Inferior Rectus", "Superior/Inferior Oblique", "Optic Nerve", "Eyeball"],
    bodyParts: ["HEAD", "FACE", "SKULL", "ORBIT"],
    modality: "CT",
  },
  {
    id: "craniofacial_structures",
    name: "Craniofacial Bones (7 Classes)",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Bony structures of the midface and skull base: maxilla, mandible, zygomatic bones, nasal bone.",
    structures: ["Maxilla", "Mandible", "Zygoma Left/Right", "Nasal Bones"],
    bodyParts: ["HEAD", "FACE", "SKULL"],
    modality: "CT",
  },
  {
    id: "teeth",
    name: "Complete Dental Arch (77 Teeth Classes)",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Every individual tooth according to the universal FDI notation (incisors, canines, premolars, molars, root canals).",
    structures: ["All 32 Adult Teeth (FDI 11-48)", "Pulp Cavities", "Incisive & Mandibular Canals"],
    bodyParts: ["HEAD", "FACE", "SKULL", "TEETH", "DENTAL"],
    modality: "CT",
  },
  {
    id: "face",
    name: "Facial Soft Tissue & Defacing",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Facial contour segmentation for research de-identification and clinical aesthetic evaluation.",
    structures: ["Facial Mask Surface"],
    bodyParts: ["HEAD", "FACE", "SKULL"],
    modality: "CT",
    requiresLicense: true,
  },

  // ──────────────────────────────────────────
  // ── PATHOLOGY & EMERGENCY ──
  // ──────────────────────────────────────────
  {
    id: "cerebral_bleed",
    name: "Intracranial Hemorrhage",
    category: "pathology",
    categoryLabel: "Pathology & Emergency",
    description: "Emergency acute intracranial bleeding detection (subarachnoid, subdural, epidural, intraparenchymal).",
    structures: ["Intracranial Bleed", "Hemorrhage Volume"],
    bodyParts: ["HEAD", "BRAIN", "SKULL"],
    modality: "CT",
  },
  {
    id: "liver_lesions",
    name: "Focal Liver Lesions",
    category: "pathology",
    categoryLabel: "Pathology & Emergency",
    description: "Segmentation and volumetric assessment of primary and metastatic focal liver lesions.",
    structures: ["Hepatic Lesions"],
    bodyParts: ["ABDOMEN", "LIVER", "WHOLEBODY"],
    modality: "CT",
    requiresContrast: true,
  },
  {
    id: "kidney_cysts",
    name: "Renal Cysts",
    category: "pathology",
    categoryLabel: "Pathology & Emergency",
    description: "Automated identification, localization, and volumetric measurement of renal cysts.",
    structures: ["Left Renal Cyst", "Right Renal Cyst"],
    bodyParts: ["ABDOMEN", "KIDNEY", "WHOLEBODY"],
    modality: "CT",
  },

  // ──────────────────────────────────────────
  // ── MRI SEQUENCES ──
  // ──────────────────────────────────────────
  {
    id: "total_mr",
    name: "Total MRI (Whole Body 50 Classes)",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Multi-organ segmentation model specifically trained on Magnetic Resonance Imaging sequences.",
    structures: ["Liver", "Kidneys", "Spleen", "Pancreas", "Bones", "Major Vessels"],
    bodyParts: ["ABDOMEN", "CHEST", "PELVIS", "WHOLEBODY"],
    modality: "MR",
  },
  {
    id: "body_mr",
    name: "MRI Body Contour",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Body trunk boundary extraction on abdominal and whole-body MR sequences.",
    structures: ["Body Truncus"],
    bodyParts: ["WHOLEBODY", "BODY", "ABDOMEN", "PELVIS"],
    modality: "MR",
  },
  {
    id: "vertebrae_mr",
    name: "MRI Vertebrae (25 Classes)",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Individual vertebral bodies and sacrum segmentation on spine MRI exams.",
    structures: ["C1-C7", "T1-T12", "L1-L5", "Sacrum"],
    bodyParts: ["SPINE", "CSPINE", "TSPINE", "LSPINE", "NECK", "WHOLEBODY"],
    modality: "MR",
  },
  {
    id: "appendicular_bones_mr",
    name: "MRI Appendicular Bones",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Extremity bones delineated on musculoskeletal MR examinations.",
    structures: ["Patella", "Tibia", "Fibula", "Radius", "Ulna", "Foot & Hand Bones"],
    bodyParts: ["LEG", "ARM", "KNEE", "EXTREMITY"],
    modality: "MR",
    requiresLicense: true,
  },
  {
    id: "thigh_shoulder_muscles_mr",
    name: "MRI Thigh & Shoulder Muscles",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Individual musculature assessment on limb and girdle MRI sequences (18 muscle groups).",
    structures: ["Quadriceps", "Hamstrings", "Rotator Cuff", "Deltoid", "Trapezius"],
    bodyParts: ["THIGH", "LEG", "SHOULDER", "ARM", "EXTREMITY"],
    modality: "MR",
    requiresLicense: true,
  },
  {
    id: "tissue_types_mr",
    name: "MRI Body Composition",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Fat and muscle compartment quantification on Dixon and T1/T2 abdominal MRI.",
    structures: ["Visceral Fat", "Subcutaneous Fat", "Skeletal Muscle"],
    bodyParts: ["ABDOMEN", "PELVIS", "WHOLEBODY"],
    modality: "MR",
    requiresLicense: true,
  },
  {
    id: "liver_segments_mr",
    name: "MRI Couinaud Liver Segments",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Couinaud liver segments I-VIII on liver MRI protocols.",
    structures: ["Segment I-VIII"],
    bodyParts: ["ABDOMEN", "LIVER"],
    modality: "MR",
  },
  {
    id: "liver_lesions_mr",
    name: "MRI Focal Liver Lesions",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Focal liver lesion delineation on contrast-enhanced or diffusion MRI.",
    structures: ["Hepatic Lesions"],
    bodyParts: ["ABDOMEN", "LIVER"],
    modality: "MR",
  },
  {
    id: "brain_aneurysm",
    name: "MRI Intracranial Aneurysm",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Automated localization and segmentation of cerebral arterial aneurysms on MR Angiography (MRA).",
    structures: ["Intracranial Aneurysm"],
    bodyParts: ["HEAD", "BRAIN", "SKULL"],
    modality: "MR",
  },
  {
    id: "face_mr",
    name: "MRI Facial Defacing",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Patient face contour removal on head MRI for HIPAA-compliant research anonymization.",
    structures: ["Facial Mask Surface"],
    bodyParts: ["HEAD", "FACE", "SKULL", "BRAIN"],
    modality: "MR",
    requiresLicense: true,
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
    if (bodyPart.includes("SPINE") || desc.includes("spine")) {
      return TOTALSEGMENTATOR_TASKS.filter((t) =>
        ["vertebrae_mr", "total_mr", "body_mr"].includes(t.id)
      );
    }
    if (bodyPart.includes("HEAD") || bodyPart.includes("BRAIN") || desc.includes("brain") || desc.includes("head") || desc.includes("mra")) {
      return TOTALSEGMENTATOR_TASKS.filter((t) =>
        ["brain_aneurysm", "face_mr", "total_mr"].includes(t.id)
      );
    }
    if (bodyPart.includes("LIVER") || desc.includes("liver")) {
      return TOTALSEGMENTATOR_TASKS.filter((t) =>
        ["liver_segments_mr", "liver_lesions_mr", "tissue_types_mr", "total_mr"].includes(t.id)
      );
    }
    if (bodyPart.includes("LEG") || bodyPart.includes("ARM") || bodyPart.includes("THIGH") || bodyPart.includes("KNEE") || bodyPart.includes("SHOULDER")) {
      return TOTALSEGMENTATOR_TASKS.filter((t) =>
        ["appendicular_bones_mr", "thigh_shoulder_muscles_mr", "total_mr"].includes(t.id)
      );
    }
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      ["total_mr", "body_mr", "tissue_types_mr", "vertebrae_mr"].includes(t.id)
    );
  }

  // Head / Brain / Dental
  if (
    bodyPart.includes("HEAD") ||
    bodyPart.includes("BRAIN") ||
    bodyPart.includes("SKULL") ||
    bodyPart.includes("FACE") ||
    bodyPart.includes("DENTAL") ||
    desc.includes("head") ||
    desc.includes("brain") ||
    desc.includes("dental") ||
    desc.includes("teeth")
  ) {
    if (desc.includes("dental") || desc.includes("teeth") || desc.includes("mandible") || desc.includes("maxilla")) {
      return TOTALSEGMENTATOR_TASKS.filter((t) =>
        ["teeth", "craniofacial_structures", "head_muscles", "head_glands_cavities"].includes(t.id)
      );
    }
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      [
        "brain_structures",
        "cerebral_bleed",
        "teeth",
        "craniofacial_structures",
        "oculomotor_muscles",
        "head_glands_cavities",
        "headneck_muscles",
        "headneck_bones_vessels",
        "total",
      ].includes(t.id)
    );
  }

  // Neck
  if (bodyPart.includes("NECK") || desc.includes("neck")) {
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      ["headneck_muscles", "headneck_bones_vessels", "vertebrae_pp", "head_glands_cavities", "total"].includes(t.id)
    );
  }

  // Chest / Thorax / Heart
  if (
    bodyPart.includes("CHEST") ||
    bodyPart.includes("THORAX") ||
    bodyPart.includes("LUNG") ||
    bodyPart.includes("HEART") ||
    bodyPart.includes("CARDIAC") ||
    desc.includes("chest") ||
    desc.includes("thorax") ||
    desc.includes("lung") ||
    desc.includes("coronary") ||
    desc.includes("cardiac")
  ) {
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      [
        "total",
        "total_v3",
        "heartchambers_highres",
        "ventricle_parts",
        "coronary_arteries",
        "lung_vessels",
        "lung_nodules",
        "pleural_pericard_effusion",
        "aortic_sinuses",
        "aorta_annulus",
        "aortic_dissection",
        "breasts",
      ].includes(t.id)
    );
  }

  // Spine
  if (
    bodyPart.includes("SPINE") ||
    bodyPart.includes("CSPINE") ||
    bodyPart.includes("TSPINE") ||
    bodyPart.includes("LSPINE") ||
    desc.includes("spine")
  ) {
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      ["vertebrae_pp", "vertebrae_pp_refined", "vertebrae_body", "total"].includes(t.id)
    );
  }

  // Extremity / Limbs / Pelvis
  if (
    bodyPart.includes("LEG") ||
    bodyPart.includes("ARM") ||
    bodyPart.includes("THIGH") ||
    bodyPart.includes("KNEE") ||
    bodyPart.includes("SHOULDER") ||
    bodyPart.includes("HIP") ||
    desc.includes("extremity") ||
    desc.includes("leg") ||
    desc.includes("arm") ||
    desc.includes("hip")
  ) {
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      ["appendicular_bones", "thigh_shoulder_muscles", "hip_implant", "total"].includes(t.id)
    );
  }

  // Default Abdomen / Pelvis / Whole body
  return TOTALSEGMENTATOR_TASKS.filter((t) =>
    [
      "total",
      "total_v3",
      "body",
      "liver_segments",
      "liver_vessels",
      "liver_lesions",
      "kidney_cysts",
      "tissue_types",
      "tissue_4_types",
      "abdominal_muscles",
      "vertebrae_body",
      "vertebrae_pp",
      "renal_arteries",
      "trunk_cavities",
    ].includes(t.id)
  );
}
