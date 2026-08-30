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
    name: "Total (Whole Body)",
    category: "whole_body",
    categoryLabel: "Whole Body",
    description:
      "Comprehensive multi-organ segmentation (liver, spleen, kidneys, pancreas, GI tract, skeleton & major vessels).",
    structures: [
      "Spleen",
      "Kidney (Right)",
      "Kidney (Left)",
      "Gallbladder",
      "Liver",
      "Stomach",
      "Pancreas",
      "Adrenal Gland (Right)",
      "Adrenal Gland (Left)",
      "Lung Upper Lobe (Left)",
      "Lung Lower Lobe (Left)",
      "Lung Upper Lobe (Right)",
      "Lung Middle Lobe (Right)",
      "Lung Lower Lobe (Right)",
      "Esophagus",
      "Trachea",
      "Thyroid Gland",
      "Small Bowel",
      "Duodenum",
      "Colon",
      "Urinary Bladder",
      "Prostate",
      "Kidney Cyst (Left)",
      "Kidney Cyst (Right)",
      "Sacrum",
      "Vertebrae S1",
      "Vertebrae L5",
      "Vertebrae L4",
      "Vertebrae L3",
      "Vertebrae L2",
      "Vertebrae L1",
      "Vertebrae T12",
      "Vertebrae T11",
      "Vertebrae T10",
      "Vertebrae T9",
      "Vertebrae T8",
      "Vertebrae T7",
      "Vertebrae T6",
      "Vertebrae T5",
      "Vertebrae T4",
      "Vertebrae T3",
      "Vertebrae T2",
      "Vertebrae T1",
      "Vertebrae C7",
      "Vertebrae C6",
      "Vertebrae C5",
      "Vertebrae C4",
      "Vertebrae C3",
      "Vertebrae C2",
      "Vertebrae C1",
      "Heart",
      "Aorta",
      "Pulmonary Vein",
      "Brachiocephalic Trunk",
      "Subclavian Artery (Right)",
      "Subclavian Artery (Left)",
      "Common Carotid Artery (Right)",
      "Common Carotid Artery (Left)",
      "Brachiocephalic Vein (Left)",
      "Brachiocephalic Vein (Right)",
      "Atrial Appendage (Left)",
      "Superior Vena Cava (SVC)",
      "Inferior Vena Cava (IVC)",
      "Portal & Splenic Veins",
      "Iliac Artery (Left)",
      "Iliac Artery (Right)",
      "Iliac Vein (Left)",
      "Iliac Vein (Right)",
      "Humerus (Left)",
      "Humerus (Right)",
      "Scapula (Left)",
      "Scapula (Right)",
      "Clavicula (Left)",
      "Clavicula (Right)",
      "Femur (Left)",
      "Femur (Right)",
      "Hip (Left)",
      "Hip (Right)",
      "Spinal Cord",
      "Gluteus Maximus (Left)",
      "Gluteus Maximus (Right)",
      "Gluteus Medius (Left)",
      "Gluteus Medius (Right)",
      "Gluteus Minimus (Left)",
      "Gluteus Minimus (Right)",
      "Autochthon Muscle (Left)",
      "Autochthon Muscle (Right)",
      "Iliopsoas (Left)",
      "Iliopsoas (Right)",
      "Brain",
      "Skull",
      "Rib Left 1",
      "Rib Left 2",
      "Rib Left 3",
      "Rib Left 4",
      "Rib Left 5",
      "Rib Left 6",
      "Rib Left 7",
      "Rib Left 8",
      "Rib Left 9",
      "Rib Left 10",
      "Rib Left 11",
      "Rib Left 12",
      "Rib Right 1",
      "Rib Right 2",
      "Rib Right 3",
      "Rib Right 4",
      "Rib Right 5",
      "Rib Right 6",
      "Rib Right 7",
      "Rib Right 8",
      "Rib Right 9",
      "Rib Right 10",
      "Rib Right 11",
      "Rib Right 12",
      "Sternum",
      "Costal Cartilages",
    ],
    bodyParts: ["ABDOMEN", "CHEST", "THORAX", "PELVIS", "WHOLEBODY", "BODY"],
    modality: "CT",
  },
  {
    id: "total_v3",
    name: "Total V3",
    category: "whole_body",
    categoryLabel: "Whole Body",
    description:
      "Latest generation whole-body multi-organ segmentation with updated residual encoder architecture.",
    structures: [
      "Spleen",
      "Kidney (Right)",
      "Kidney (Left)",
      "Gallbladder",
      "Liver",
      "Stomach",
      "Pancreas",
      "Adrenal Gland (Right)",
      "Adrenal Gland (Left)",
      "Lung Upper Lobe (Left)",
      "Lung Lower Lobe (Left)",
      "Lung Upper Lobe (Right)",
      "Lung Middle Lobe (Right)",
      "Lung Lower Lobe (Right)",
      "Esophagus",
      "Trachea",
      "Thyroid Gland",
      "Small Bowel",
      "Duodenum",
      "Colon",
      "Urinary Bladder",
      "Prostate",
      "Kidney Cyst (Left)",
      "Kidney Cyst (Right)",
      "Sacrum",
      "Vertebrae L6",
      "Vertebrae L5",
      "Vertebrae L4",
      "Vertebrae L3",
      "Vertebrae L2",
      "Vertebrae L1",
      "Vertebrae T12",
      "Vertebrae T11",
      "Vertebrae T10",
      "Vertebrae T9",
      "Vertebrae T8",
      "Vertebrae T7",
      "Vertebrae T6",
      "Vertebrae T5",
      "Vertebrae T4",
      "Vertebrae T3",
      "Vertebrae T2",
      "Vertebrae T1",
      "Vertebrae C7",
      "Vertebrae C6",
      "Vertebrae C5",
      "Vertebrae C4",
      "Vertebrae C3",
      "Vertebrae C2",
      "Vertebrae C1",
      "Heart",
      "Aorta",
      "Pulmonary Vein",
      "Brachiocephalic Trunk",
      "Subclavian Artery (Right)",
      "Subclavian Artery (Left)",
      "Common Carotid Artery (Right)",
      "Common Carotid Artery (Left)",
      "Brachiocephalic Vein (Left)",
      "Brachiocephalic Vein (Right)",
      "Atrial Appendage (Left)",
      "Superior Vena Cava (SVC)",
      "Inferior Vena Cava (IVC)",
      "Portal & Splenic Veins",
      "Iliac Artery (Left)",
      "Iliac Artery (Right)",
      "Iliac Vein (Left)",
      "Iliac Vein (Right)",
      "Humerus (Left)",
      "Humerus (Right)",
      "Scapula (Left)",
      "Scapula (Right)",
      "Clavicula (Left)",
      "Clavicula (Right)",
      "Femur (Left)",
      "Femur (Right)",
      "Hip (Left)",
      "Hip (Right)",
      "Spinal Cord",
      "Gluteus Maximus (Left)",
      "Gluteus Maximus (Right)",
      "Gluteus Medius (Left)",
      "Gluteus Medius (Right)",
      "Gluteus Minimus (Left)",
      "Gluteus Minimus (Right)",
      "Autochthon Muscle (Left)",
      "Autochthon Muscle (Right)",
      "Iliopsoas (Left)",
      "Iliopsoas (Right)",
      "Brain",
      "Skull",
      "Rib Left 1",
      "Rib Left 2",
      "Rib Left 3",
      "Rib Left 4",
      "Rib Left 5",
      "Rib Left 6",
      "Rib Left 7",
      "Rib Left 8",
      "Rib Left 9",
      "Rib Left 10",
      "Rib Left 11",
      "Rib Left 12",
      "Rib Right 1",
      "Rib Right 2",
      "Rib Right 3",
      "Rib Right 4",
      "Rib Right 5",
      "Rib Right 6",
      "Rib Right 7",
      "Rib Right 8",
      "Rib Right 9",
      "Rib Right 10",
      "Rib Right 11",
      "Rib Right 12",
      "Sternum",
      "Costal Cartilages",
    ],
    bodyParts: ["ABDOMEN", "CHEST", "THORAX", "PELVIS", "WHOLEBODY", "BODY"],
    modality: "CT",
  },
  {
    id: "body",
    name: "Body",
    category: "whole_body",
    categoryLabel: "Whole Body",
    description:
      "Full external body habitus delineation and patient outer contour extraction.",
    structures: ["Trunk / Torso", "Extremities (Limbs)"],
    bodyParts: ["WHOLEBODY", "BODY", "ABDOMEN", "CHEST", "PELVIS"],
    modality: "CT",
  },

  // ──────────────────────────────────────────
  // ── ABDOMEN & ORGANS ──
  // ──────────────────────────────────────────
  {
    id: "liver_vessels",
    name: "Liver Vessels",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description:
      "Dedicated portal vein and hepatic veins vascular tree segmentation.",
    structures: ["Liver Vessels", "Liver Tumor"],
    bodyParts: ["ABDOMEN", "LIVER", "WHOLEBODY"],
    modality: "CT",
    requiresContrast: true,
  },
  {
    id: "liver_segments",
    name: "Liver Segments",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description:
      "Functional anatomical liver segmentation into segments I to VIII according to Couinaud classification.",
    structures: [
      "Liver Segment I",
      "Liver Segment II",
      "Liver Segment III",
      "Liver Segment IV",
      "Liver Segment V",
      "Liver Segment VI",
      "Liver Segment VII",
      "Liver Segment VIII",
    ],
    bodyParts: ["ABDOMEN", "LIVER", "WHOLEBODY"],
    modality: "CT",
    requiresContrast: true,
  },
  {
    id: "tissue_types",
    name: "Tissue Types",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description:
      "Visceral adipose tissue (VAT), subcutaneous adipose tissue (SAT), and skeletal muscle analysis.",
    structures: ["Subcutaneous Fat", "Visceral / Torso Fat", "Skeletal Muscle"],
    bodyParts: ["ABDOMEN", "PELVIS", "WHOLEBODY", "BODY"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "tissue_4_types",
    name: "Tissue 4 Types",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description:
      "Extended sarcopenia assessment including intermuscular adipose tissue (IMAT), SAT, VAT, and skeletal muscle.",
    structures: [
      "Subcutaneous Fat",
      "Visceral / Torso Fat",
      "Skeletal Muscle",
      "Intermuscular Fat",
    ],
    bodyParts: ["ABDOMEN", "PELVIS", "WHOLEBODY", "BODY"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "abdominal_muscles",
    name: "Abdominal Muscles",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description:
      "High-resolution segmentation of individual abdominal wall, retroperitoneal, and back muscle groups.",
    structures: [
      "Pectoralis Major (Right)",
      "Pectoralis Major (Left)",
      "Rectus Abdominis (Right)",
      "Rectus Abdominis (Left)",
      "Serratus Anterior (Right)",
      "Serratus Anterior (Left)",
      "Latissimus Dorsi (Right)",
      "Latissimus Dorsi (Left)",
      "Trapezius (Right)",
      "Trapezius (Left)",
      "External Oblique (Right)",
      "External Oblique (Left)",
      "Internal Oblique (Right)",
      "Internal Oblique (Left)",
      "Erector Spinae (Right)",
      "Erector Spinae (Left)",
      "Transversospinalis (Right)",
      "Transversospinalis (Left)",
      "Psoas Major (Right)",
      "Psoas Major (Left)",
      "Quadratus Lumborum (Right)",
      "Quadratus Lumborum (Left)",
    ],
    bodyParts: ["ABDOMEN", "PELVIS", "LSPINE", "BODY"],
    modality: "CT",
  },
  {
    id: "trunk_cavities",
    name: "Trunk Cavities",
    category: "abdomen",
    categoryLabel: "Abdomen & Organs",
    description:
      "Major anatomical compartments of the torso (abdominal cavity, thoracic cavity, pericardium, mediastinum).",
    structures: [
      "Abdominal Cavity",
      "Thoracic Cavity",
      "Pericardium",
      "Mediastinum",
    ],
    bodyParts: ["ABDOMEN", "CHEST", "THORAX", "PELVIS", "BODY"],
    modality: "CT",
  },

  // ──────────────────────────────────────────
  // ── CARDIAC & VASCULAR ──
  // ──────────────────────────────────────────
  {
    id: "heartchambers_highres",
    name: "Heart Chambers (High-Res)",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description:
      "High-resolution four-chamber cardiac segmentation with myocardium and great vessel roots.",
    structures: [
      "Myocardium",
      "Left Atrium",
      "Left Ventricle",
      "Right Atrium",
      "Right Ventricle",
      "Aorta",
      "Pulmonary Artery",
    ],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "ventricle_parts",
    name: "Ventricle Parts",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description:
      "Detailed ventricular components including papillary muscles, outflow tracts, and interventricular septum.",
    structures: [
      "Ventricle Frontal Horn (Left)",
      "Ventricle Occipital Horn (Left)",
      "Ventricle Body (Left)",
      "Ventricle Temporal Horn (Left)",
      "Ventricle Trigone (Left)",
      "Ventricle Frontal Horn (Right)",
      "Ventricle Occipital Horn (Right)",
      "Ventricle Body (Right)",
      "Ventricle Temporal Horn (Right)",
      "Ventricle Trigone (Right)",
      "Third Ventricle",
      "Fourth Ventricle",
    ],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
  },
  {
    id: "coronary_arteries",
    name: "Coronary Arteries",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description:
      "Left anterior descending (LAD), left circumflex (LCx), and right coronary artery (RCA) tree.",
    structures: ["Coronary Arteries"],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
    requiresContrast: true,
    requiresLicense: true,
  },
  {
    id: "aortic_sinuses",
    name: "Aortic Sinuses",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description:
      "Left, right, and non-coronary aortic sinuses and aortic root anatomy.",
    structures: [
      "Left Ventricular Outflow Tract",
      "Right Coronary Cusp",
      "Left Coronary Cusp",
      "Non Coronary Cusp",
    ],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
    requiresContrast: true,
    requiresLicense: true,
  },
  {
    id: "aorta_annulus",
    name: "Aorta Annulus",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description:
      "Aortic valve annulus proper and sinotubular junction for transcatheter aortic valve replacement (TAVR) planning.",
    structures: ["Annulus Proper", "Sinotubular Junction"],
    bodyParts: ["CHEST", "THORAX", "HEART", "CARDIAC"],
    modality: "CT",
    requiresContrast: true,
    requiresLicense: true,
  },
  {
    id: "aortic_dissection",
    name: "Aortic Dissection",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description:
      "Automated delineation of aortic true lumen and false lumen in acute aortic dissection.",
    structures: ["Aorta True Lumen", "Aorta False Lumen"],
    bodyParts: ["CHEST", "THORAX", "ABDOMEN", "HEART", "CARDIAC"],
    modality: "CT",
    requiresContrast: true,
    requiresLicense: true,
  },
  {
    id: "renal_arteries",
    name: "Renal Arteries",
    category: "cardiac_vascular",
    categoryLabel: "Cardiac & Vascular",
    description:
      "Major visceral aorta branches: celiac trunk, superior mesenteric artery (SMA), and left/right renal arteries.",
    structures: [
      "Celiac Trunk",
      "Superior Mesenteric Artery",
      "Renal Arteries",
    ],
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
    description:
      "Key anatomical landmarks of the pulmonary trunk, bifurcation, annulus, and main branch origins.",
    structures: [
      "Annulus",
      "Sinotubular Junction",
      "Pul Annulus",
      "Pul Sinotubular Junction",
      "Pul Bifurcation",
      "Pul Left Start",
      "Pul Right Start",
    ],
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
    name: "Lung Vessels",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description:
      "Detailed pulmonary arterial and venous vascular tree throughout all lung lobes.",
    structures: [
      "Airways",
      "Airway Walls",
      "Pulmonary Arteries",
      "Pulmonary Veins",
    ],
    bodyParts: ["CHEST", "THORAX", "LUNG"],
    modality: "CT",
  },
  {
    id: "lung_nodules",
    name: "Lung Nodules",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description:
      "Detection and volumetric segmentation of suspicious solid and sub-solid pulmonary lung nodules.",
    structures: ["Lung", "Lung Nodules"],
    bodyParts: ["CHEST", "THORAX", "LUNG"],
    modality: "CT",
  },
  {
    id: "pleural_pericard_effusion",
    name: "Pleural Pericard Effusion",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description:
      "Automated quantification and segmentation of abnormal fluid accumulation in pleural and pericardial cavities.",
    structures: ["Pleura", "Pleural Effusion", "Pericardial Effusion"],
    bodyParts: ["CHEST", "THORAX", "HEART", "LUNG"],
    modality: "CT",
  },
  {
    id: "breasts",
    name: "Breasts",
    category: "chest",
    categoryLabel: "Chest & Lungs",
    description:
      "Delineation of bilateral glandular and fibroadipose breast parenchyma.",
    structures: ["Breast"],
    bodyParts: ["CHEST", "THORAX", "BREAST"],
    modality: "CT",
  },

  // ──────────────────────────────────────────
  // ── MUSCULOSKELETAL & SPINE ──
  // ──────────────────────────────────────────
  {
    id: "vertebrae_body",
    name: "Vertebrae Body",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description:
      "Vertebral bodies segmentation separated from posterior spinal elements and intervertebral discs.",
    structures: ["Vertebrae Body", "Intervertebral Discs"],
    bodyParts: [
      "SPINE",
      "CSPINE",
      "TSPINE",
      "LSPINE",
      "ABDOMEN",
      "CHEST",
      "WHOLEBODY",
    ],
    modality: "CT",
  },
  {
    id: "vertebrae_pp",
    name: "Vertebrae (Posterior Processes)",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description:
      "Complete spine numbering with 24 individual vertebral classes from cervical C1 through lumbar L5.",
    structures: [
      "Vertebrae C1",
      "Vertebrae C2",
      "Vertebrae C3",
      "Vertebrae C4",
      "Vertebrae C5",
      "Vertebrae C6",
      "Vertebrae C7",
      "Vertebrae T1",
      "Vertebrae T2",
      "Vertebrae T3",
      "Vertebrae T4",
      "Vertebrae T5",
      "Vertebrae T6",
      "Vertebrae T7",
      "Vertebrae T8",
      "Vertebrae T9",
      "Vertebrae T10",
      "Vertebrae T11",
      "Vertebrae T12",
      "Vertebrae L1",
      "Vertebrae L2",
      "Vertebrae L3",
      "Vertebrae L4",
      "Vertebrae L5",
    ],
    bodyParts: [
      "SPINE",
      "CSPINE",
      "TSPINE",
      "LSPINE",
      "NECK",
      "CHEST",
      "ABDOMEN",
      "WHOLEBODY",
    ],
    modality: "CT",
  },
  {
    id: "vertebrae_pp_refined",
    name: "Vertebrae Refined (Posterior Processes)",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description:
      "Refined high-fidelity boundary segmentation of 24 individual vertebrae from C1 to L5.",
    structures: [
      "Vertebrae C1",
      "Vertebrae C2",
      "Vertebrae C3",
      "Vertebrae C4",
      "Vertebrae C5",
      "Vertebrae C6",
      "Vertebrae C7",
      "Vertebrae T1",
      "Vertebrae T2",
      "Vertebrae T3",
      "Vertebrae T4",
      "Vertebrae T5",
      "Vertebrae T6",
      "Vertebrae T7",
      "Vertebrae T8",
      "Vertebrae T9",
      "Vertebrae T10",
      "Vertebrae T11",
      "Vertebrae T12",
      "Vertebrae L1",
      "Vertebrae L2",
      "Vertebrae L3",
      "Vertebrae L4",
      "Vertebrae L5",
    ],
    bodyParts: [
      "SPINE",
      "CSPINE",
      "TSPINE",
      "LSPINE",
      "NECK",
      "CHEST",
      "ABDOMEN",
      "WHOLEBODY",
    ],
    modality: "CT",
  },
  {
    id: "appendicular_bones",
    name: "Appendicular Bones",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description:
      "Extremity skeletal system segmentation (femur, tibia, fibula, humerus, radius, ulna, carpal, tarsal, phalanges).",
    structures: [
      "Patella",
      "Tibia",
      "Fibula",
      "Tarsal",
      "Metatarsal",
      "Phalanges Feet",
      "Ulna",
      "Radius",
      "Carpal",
      "Metacarpal",
      "Phalanges Hand",
    ],
    bodyParts: [
      "LEG",
      "ARM",
      "SHOULDER",
      "THIGH",
      "KNEE",
      "FOOT",
      "HAND",
      "EXTREMITY",
      "WHOLEBODY",
    ],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "thigh_shoulder_muscles",
    name: "Thigh Shoulder Muscles",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description:
      "Individual muscle bundle segmentation for limb, rotator cuff, and thigh musculature (18 classes).",
    structures: [
      "Quadriceps Femoris (Left)",
      "Quadriceps Femoris (Right)",
      "Thigh Medial Compartment (Left)",
      "Thigh Medial Compartment (Right)",
      "Thigh Posterior Compartment (Left)",
      "Thigh Posterior Compartment (Right)",
      "Sartorius (Left)",
      "Sartorius (Right)",
      "Deltoid",
      "Supraspinatus",
      "Infraspinatus",
      "Subscapularis",
      "Coracobrachial",
      "Trapezius",
      "Pectoralis Minor",
      "Serratus Anterior",
      "Teres Major",
      "Triceps Brachii",
    ],
    bodyParts: ["THIGH", "LEG", "SHOULDER", "ARM", "EXTREMITY"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "hip_implant",
    name: "Hip Implant",
    category: "musculoskeletal",
    categoryLabel: "Musculoskeletal & Spine",
    description:
      "Localization and segmentation of prosthetic hip joint implants and metal hardware.",
    structures: ["Hip Implant"],
    bodyParts: ["PELVIS", "HIP", "THIGH", "LEG"],
    modality: "CT",
  },

  // ──────────────────────────────────────────
  // ── HEAD, NECK & DENTAL ──
  // ──────────────────────────────────────────
  {
    id: "brain_structures",
    name: "Brain Structures",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description:
      "Deep gray nuclei, cerebral ventricles, brainstem, internal capsule, insula, and cerebral lobes.",
    structures: [
      "Brainstem",
      "Subarachnoid Space",
      "Venous Sinuses",
      "Septum Pellucidum",
      "Cerebellum",
      "Caudate Nucleus",
      "Lentiform Nucleus",
      "Insular Cortex",
      "Internal Capsule",
      "Ventricle",
      "Central Sulcus",
      "Frontal Lobe",
      "Parietal Lobe",
      "Occipital Lobe",
      "Temporal Lobe",
      "Thalamus",
    ],
    bodyParts: ["HEAD", "BRAIN", "SKULL"],
    modality: "CT",
    requiresLicense: true,
  },
  {
    id: "head_glands_cavities",
    name: "Head Glands Cavities",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description:
      "Parotid & submandibular salivary glands, nasal cavities, orbits, and paranasal sinuses.",
    structures: [
      "Eye (Left)",
      "Eye (Right)",
      "Eye Lens (Left)",
      "Eye Lens (Right)",
      "Optic Nerve (Left)",
      "Optic Nerve (Right)",
      "Parotid Gland (Left)",
      "Parotid Gland (Right)",
      "Submandibular Gland (Right)",
      "Submandibular Gland (Left)",
      "Nasopharynx",
      "Oropharynx",
      "Hypopharynx",
      "Nasal Cavity (Right)",
      "Nasal Cavity (Left)",
      "Auditory Canal (Right)",
      "Auditory Canal (Left)",
      "Soft Palate",
      "Hard Palate",
    ],
    bodyParts: ["HEAD", "NECK", "SKULL", "FACE"],
    modality: "CT",
  },
  {
    id: "head_muscles",
    name: "Head Muscles",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description: "Detailed masticatory and facial expression muscle groups.",
    structures: [
      "Masseter (Right)",
      "Masseter (Left)",
      "Temporalis (Right)",
      "Temporalis (Left)",
      "Lateral Pterygoid (Right)",
      "Lateral Pterygoid (Left)",
      "Medial Pterygoid (Right)",
      "Medial Pterygoid (Left)",
      "Tongue",
      "Digastric (Right)",
      "Digastric (Left)",
    ],
    bodyParts: ["HEAD", "FACE", "SKULL", "NECK"],
    modality: "CT",
  },
  {
    id: "headneck_bones_vessels",
    name: "Headneck Bones Vessels",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description:
      "Cervical spine, skull base osseous anatomy, carotid arteries, and internal jugular veins.",
    structures: [
      "Larynx Air",
      "Thyroid Cartilage",
      "Hyoid",
      "Cricoid Cartilage",
      "Zygomatic Arch (Right)",
      "Zygomatic Arch (Left)",
      "Styloid Process (Right)",
      "Styloid Process (Left)",
      "Internal Carotid Artery (Right)",
      "Internal Carotid Artery (Left)",
      "Internal Jugular Vein (Right)",
      "Internal Jugular Vein (Left)",
    ],
    bodyParts: ["HEAD", "NECK"],
    modality: "CT",
    requiresContrast: true,
  },
  {
    id: "headneck_muscles",
    name: "Headneck Muscles",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description:
      "Sternocleidomastoid, trapezius, scalenes, and pharyngeal muscle groups.",
    structures: [
      "Sternocleidomastoid (Right)",
      "Sternocleidomastoid (Left)",
      "Superior Pharyngeal Constrictor",
      "Middle Pharyngeal Constrictor",
      "Inferior Pharyngeal Constrictor",
      "Trapezius (Right)",
      "Trapezius (Left)",
      "Platysma (Right)",
      "Platysma (Left)",
      "Levator Scapulae (Right)",
      "Levator Scapulae (Left)",
      "Anterior Scalene (Right)",
      "Anterior Scalene (Left)",
      "Middle Scalene (Right)",
      "Middle Scalene (Left)",
      "Posterior Scalene (Right)",
      "Posterior Scalene (Left)",
      "Sterno Thyroid (Right)",
      "Sterno Thyroid (Left)",
      "Thyrohyoid (Right)",
      "Thyrohyoid (Left)",
      "Prevertebral (Right)",
      "Prevertebral (Left)",
    ],
    bodyParts: ["HEAD", "NECK"],
    modality: "CT",
  },
  {
    id: "oculomotor_muscles",
    name: "Oculomotor Muscles",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description:
      "Extraocular eye muscles (recti, obliques), optic nerve, eyeball, and retrobulbar orbital fat.",
    structures: [
      "Skull",
      "Eyeball (Right)",
      "Lateral Rectus Muscle (Right)",
      "Superior Oblique Muscle (Right)",
      "Levator Palpebrae Superioris (Right)",
      "Superior Rectus Muscle (Right)",
      "Medial Rectus Muscle (Left)",
      "Inferior Oblique Muscle (Right)",
      "Inferior Rectus Muscle (Right)",
      "Optic Nerve (Left)",
      "Eyeball (Left)",
      "Lateral Rectus Muscle (Left)",
      "Superior Oblique Muscle (Left)",
      "Levator Palpebrae Superioris (Left)",
      "Superior Rectus Muscle (Left)",
      "Medial Rectus Muscle (Right)",
      "Inferior Oblique Muscle (Left)",
      "Inferior Rectus Muscle (Left)",
      "Optic Nerve (Right)",
    ],
    bodyParts: ["HEAD", "FACE", "SKULL", "ORBIT"],
    modality: "CT",
  },
  {
    id: "craniofacial_structures",
    name: "Craniofacial Structures",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description:
      "Bony structures of the midface and skull base: maxilla, mandible, zygomatic bones, nasal bone.",
    structures: [
      "Mandible",
      "Teeth Lower",
      "Skull",
      "Head",
      "Sinus Maxillary",
      "Sinus Frontal",
      "Teeth Upper",
    ],
    bodyParts: ["HEAD", "FACE", "SKULL"],
    modality: "CT",
  },
  {
    id: "teeth",
    name: "Teeth",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description:
      "Every individual tooth according to the universal FDI notation (incisors, canines, premolars, molars, root canals).",
    structures: [
      "Lower Jawbone",
      "Upper Jawbone",
      "Left Inferior Alveolar Canal",
      "Right Inferior Alveolar Canal",
      "Left Maxillary Sinus",
      "Right Maxillary Sinus",
      "Pharynx",
      "Bridge",
      "Crown",
      "Implant",
      "Upper Right Central Incisor Fdi11",
      "Upper Right Lateral Incisor Fdi12",
      "Upper Right Canine Fdi13",
      "Upper Right First Premolar Fdi14",
      "Upper Right Second Premolar Fdi15",
      "Upper Right First Molar Fdi16",
      "Upper Right Second Molar Fdi17",
      "Upper Right Third Molar Fdi18",
      "Upper Left Central Incisor Fdi21",
      "Upper Left Lateral Incisor Fdi22",
      "Upper Left Canine Fdi23",
      "Upper Left First Premolar Fdi24",
      "Upper Left Second Premolar Fdi25",
      "Upper Left First Molar Fdi26",
      "Upper Left Second Molar Fdi27",
      "Upper Left Third Molar Fdi28",
      "Lower Left Central Incisor Fdi31",
      "Lower Left Lateral Incisor Fdi32",
      "Lower Left Canine Fdi33",
      "Lower Left First Premolar Fdi34",
      "Lower Left Second Premolar Fdi35",
      "Lower Left First Molar Fdi36",
      "Lower Left Second Molar Fdi37",
      "Lower Left Third Molar Fdi38",
      "Lower Right Central Incisor Fdi41",
      "Lower Right Lateral Incisor Fdi42",
      "Lower Right Canine Fdi43",
      "Lower Right First Premolar Fdi44",
      "Lower Right Second Premolar Fdi45",
      "Lower Right First Molar Fdi46",
      "Lower Right Second Molar Fdi47",
      "Lower Right Third Molar Fdi48",
      "Left Mandibular Incisive Canal Fdi103",
      "Right Mandibular Incisive Canal Fdi104",
      "Lingual Canal",
      "Upper Right Central Incisor Pulp Fdi111",
      "Upper Right Lateral Incisor Pulp Fdi112",
      "Upper Right Canine Pulp Fdi113",
      "Upper Right First Premolar Pulp Fdi114",
      "Upper Right Second Premolar Pulp Fdi115",
      "Upper Right First Molar Pulp Fdi116",
      "Upper Right Second Molar Pulp Fdi117",
      "Upper Right Third Molar Pulp Fdi118",
      "Upper Left Central Incisor Pulp Fdi121",
      "Upper Left Lateral Incisor Pulp Fdi122",
      "Upper Left Canine Pulp Fdi123",
      "Upper Left First Premolar Pulp Fdi124",
      "Upper Left Second Premolar Pulp Fdi125",
      "Upper Left First Molar Pulp Fdi126",
      "Upper Left Second Molar Pulp Fdi127",
      "Upper Left Third Molar Pulp Fdi128",
      "Lower Left Central Incisor Pulp Fdi131",
      "Lower Left Lateral Incisor Pulp Fdi132",
      "Lower Left Canine Pulp Fdi133",
      "Lower Left First Premolar Pulp Fdi134",
      "Lower Left Second Premolar Pulp Fdi135",
      "Lower Left First Molar Pulp Fdi136",
      "Lower Left Second Molar Pulp Fdi137",
      "Lower Left Third Molar Pulp Fdi138",
      "Lower Right Central Incisor Pulp Fdi141",
      "Lower Right Lateral Incisor Pulp Fdi142",
      "Lower Right Canine Pulp Fdi143",
      "Lower Right First Premolar Pulp Fdi144",
      "Lower Right Second Premolar Pulp Fdi145",
      "Lower Right First Molar Pulp Fdi146",
      "Lower Right Second Molar Pulp Fdi147",
      "Lower Right Third Molar Pulp Fdi148",
    ],
    bodyParts: ["HEAD", "FACE", "SKULL", "TEETH", "DENTAL"],
    modality: "CT",
  },
  {
    id: "face",
    name: "Face",
    category: "head_neck",
    categoryLabel: "Head & Neck / Brain",
    description:
      "Facial contour segmentation for research de-identification and clinical aesthetic evaluation.",
    structures: ["Face"],
    bodyParts: ["HEAD", "FACE", "SKULL"],
    modality: "CT",
    requiresLicense: true,
  },

  // ──────────────────────────────────────────
  // ── PATHOLOGY & EMERGENCY ──
  // ──────────────────────────────────────────
  {
    id: "cerebral_bleed",
    name: "Cerebral Bleed",
    category: "pathology",
    categoryLabel: "Pathology & Emergency",
    description:
      "Emergency acute intracranial bleeding detection (subarachnoid, subdural, epidural, intraparenchymal).",
    structures: ["Intracerebral Hemorrhage"],
    bodyParts: ["HEAD", "BRAIN", "SKULL"],
    modality: "CT",
  },
  {
    id: "liver_lesions",
    name: "Liver Lesions",
    category: "pathology",
    categoryLabel: "Pathology & Emergency",
    description:
      "Segmentation and volumetric assessment of primary and metastatic focal liver lesions.",
    structures: ["Liver Lesions"],
    bodyParts: ["ABDOMEN", "LIVER", "WHOLEBODY"],
    modality: "CT",
    requiresContrast: true,
  },
  {
    id: "kidney_cysts",
    name: "Kidney Cysts",
    category: "pathology",
    categoryLabel: "Pathology & Emergency",
    description:
      "Automated identification, localization, and volumetric measurement of renal cysts.",
    structures: ["Kidney Cyst (Left)", "Kidney Cyst (Right)"],
    bodyParts: ["ABDOMEN", "KIDNEY", "WHOLEBODY"],
    modality: "CT",
  },

  // ──────────────────────────────────────────
  // ── MRI SEQUENCES ──
  // ──────────────────────────────────────────
  {
    id: "total_mr",
    name: "Total MR",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description:
      "Multi-organ segmentation model specifically trained on Magnetic Resonance Imaging sequences.",
    structures: [
      "Spleen",
      "Kidney (Right)",
      "Kidney (Left)",
      "Gallbladder",
      "Liver",
      "Stomach",
      "Pancreas",
      "Adrenal Gland (Right)",
      "Adrenal Gland (Left)",
      "Lung (Left)",
      "Lung (Right)",
      "Esophagus",
      "Small Bowel",
      "Duodenum",
      "Colon",
      "Urinary Bladder",
      "Prostate",
      "Sacrum",
      "Vertebrae",
      "Intervertebral Discs",
      "Spinal Cord",
      "Heart",
      "Aorta",
      "Inferior Vena Cava (IVC)",
      "Portal & Splenic Veins",
      "Iliac Artery (Left)",
      "Iliac Artery (Right)",
      "Iliac Vein (Left)",
      "Iliac Vein (Right)",
      "Humerus (Left)",
      "Humerus (Right)",
      "Scapula (Left)",
      "Scapula (Right)",
      "Clavicula (Left)",
      "Clavicula (Right)",
      "Femur (Left)",
      "Femur (Right)",
      "Hip (Left)",
      "Hip (Right)",
      "Gluteus Maximus (Left)",
      "Gluteus Maximus (Right)",
      "Gluteus Medius (Left)",
      "Gluteus Medius (Right)",
      "Gluteus Minimus (Left)",
      "Gluteus Minimus (Right)",
      "Autochthon Muscle (Left)",
      "Autochthon Muscle (Right)",
      "Iliopsoas (Left)",
      "Iliopsoas (Right)",
      "Brain",
    ],
    bodyParts: ["ABDOMEN", "CHEST", "PELVIS", "WHOLEBODY"],
    modality: "MR",
  },
  {
    id: "body_mr",
    name: "Body MR",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description:
      "Body trunk boundary extraction on abdominal and whole-body MR sequences.",
    structures: ["Trunk / Torso", "Extremities (Limbs)"],
    bodyParts: ["WHOLEBODY", "BODY", "ABDOMEN", "PELVIS"],
    modality: "MR",
  },
  {
    id: "vertebrae_mr",
    name: "Vertebrae MR",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description:
      "Individual vertebral bodies and sacrum segmentation on spine MRI exams.",
    structures: [
      "Sacrum",
      "Vertebrae L5",
      "Vertebrae L4",
      "Vertebrae L3",
      "Vertebrae L2",
      "Vertebrae L1",
      "Vertebrae T12",
      "Vertebrae T11",
      "Vertebrae T10",
      "Vertebrae T9",
      "Vertebrae T8",
      "Vertebrae T7",
      "Vertebrae T6",
      "Vertebrae T5",
      "Vertebrae T4",
      "Vertebrae T3",
      "Vertebrae T2",
      "Vertebrae T1",
      "Vertebrae C7",
      "Vertebrae C6",
      "Vertebrae C5",
      "Vertebrae C4",
      "Vertebrae C3",
      "Vertebrae C2",
      "Vertebrae C1",
    ],
    bodyParts: ["SPINE", "CSPINE", "TSPINE", "LSPINE", "NECK", "WHOLEBODY"],
    modality: "MR",
  },
  {
    id: "appendicular_bones_mr",
    name: "Appendicular Bones MR",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description:
      "Extremity bones delineated on musculoskeletal MR examinations.",
    structures: [
      "Patella",
      "Tibia",
      "Fibula",
      "Tarsal",
      "Metatarsal",
      "Phalanges Feet",
      "Ulna",
      "Radius",
    ],
    bodyParts: ["LEG", "ARM", "KNEE", "EXTREMITY"],
    modality: "MR",
    requiresLicense: true,
  },
  {
    id: "thigh_shoulder_muscles_mr",
    name: "Thigh Shoulder Muscles MR",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description:
      "Individual musculature assessment on limb and girdle MRI sequences (18 muscle groups).",
    structures: [
      "Quadriceps Femoris (Left)",
      "Quadriceps Femoris (Right)",
      "Thigh Medial Compartment (Left)",
      "Thigh Medial Compartment (Right)",
      "Thigh Posterior Compartment (Left)",
      "Thigh Posterior Compartment (Right)",
      "Sartorius (Left)",
      "Sartorius (Right)",
      "Deltoid",
      "Supraspinatus",
      "Infraspinatus",
      "Subscapularis",
      "Coracobrachial",
      "Trapezius",
      "Pectoralis Minor",
      "Serratus Anterior",
      "Teres Major",
      "Triceps Brachii",
    ],
    bodyParts: ["THIGH", "LEG", "SHOULDER", "ARM", "EXTREMITY"],
    modality: "MR",
    requiresLicense: true,
  },
  {
    id: "tissue_types_mr",
    name: "Tissue Types MR",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description:
      "Fat and muscle compartment quantification on Dixon and T1/T2 abdominal MRI.",
    structures: ["Subcutaneous Fat", "Visceral / Torso Fat", "Skeletal Muscle"],
    bodyParts: ["ABDOMEN", "PELVIS", "WHOLEBODY"],
    modality: "MR",
    requiresLicense: true,
  },
  {
    id: "liver_segments_mr",
    name: "Liver Segments MR",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description: "Couinaud liver segments I-VIII on liver MRI protocols.",
    structures: [
      "Liver Segment I",
      "Liver Segment II",
      "Liver Segment III",
      "Liver Segment IV",
      "Liver Segment V",
      "Liver Segment VI",
      "Liver Segment VII",
      "Liver Segment VIII",
    ],
    bodyParts: ["ABDOMEN", "LIVER"],
    modality: "MR",
  },
  {
    id: "liver_lesions_mr",
    name: "Liver Lesions MR",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description:
      "Focal liver lesion delineation on contrast-enhanced or diffusion MRI.",
    structures: ["Liver Lesions"],
    bodyParts: ["ABDOMEN", "LIVER"],
    modality: "MR",
  },
  {
    id: "brain_aneurysm",
    name: "Brain Aneurysm",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description:
      "Automated localization and segmentation of cerebral arterial aneurysms on MR Angiography (MRA).",
    structures: ["Brain Aneurysm"],
    bodyParts: ["HEAD", "BRAIN", "SKULL"],
    modality: "MR",
  },
  {
    id: "face_mr",
    name: "Face MR",
    category: "mri",
    categoryLabel: "Magnetic Resonance (MRI)",
    description:
      "Patient face contour removal on head MRI for HIPAA-compliant research anonymization.",
    structures: ["Face"],
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
        ["vertebrae_mr", "total_mr", "body_mr"].includes(t.id),
      );
    }
    if (
      bodyPart.includes("HEAD") ||
      bodyPart.includes("BRAIN") ||
      desc.includes("brain") ||
      desc.includes("head") ||
      desc.includes("mra")
    ) {
      return TOTALSEGMENTATOR_TASKS.filter((t) =>
        ["brain_aneurysm", "face_mr", "total_mr"].includes(t.id),
      );
    }
    if (bodyPart.includes("LIVER") || desc.includes("liver")) {
      return TOTALSEGMENTATOR_TASKS.filter((t) =>
        [
          "liver_segments_mr",
          "liver_lesions_mr",
          "tissue_types_mr",
          "total_mr",
        ].includes(t.id),
      );
    }
    if (
      bodyPart.includes("LEG") ||
      bodyPart.includes("ARM") ||
      bodyPart.includes("THIGH") ||
      bodyPart.includes("KNEE") ||
      bodyPart.includes("SHOULDER")
    ) {
      return TOTALSEGMENTATOR_TASKS.filter((t) =>
        [
          "appendicular_bones_mr",
          "thigh_shoulder_muscles_mr",
          "total_mr",
        ].includes(t.id),
      );
    }
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      ["total_mr", "body_mr", "tissue_types_mr", "vertebrae_mr"].includes(t.id),
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
    if (
      desc.includes("dental") ||
      desc.includes("teeth") ||
      desc.includes("mandible") ||
      desc.includes("maxilla")
    ) {
      return TOTALSEGMENTATOR_TASKS.filter((t) =>
        [
          "teeth",
          "craniofacial_structures",
          "head_muscles",
          "head_glands_cavities",
        ].includes(t.id),
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
      ].includes(t.id),
    );
  }

  // Neck
  if (bodyPart.includes("NECK") || desc.includes("neck")) {
    return TOTALSEGMENTATOR_TASKS.filter((t) =>
      [
        "headneck_muscles",
        "headneck_bones_vessels",
        "vertebrae_pp",
        "head_glands_cavities",
        "total",
      ].includes(t.id),
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
      ].includes(t.id),
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
      [
        "vertebrae_pp",
        "vertebrae_pp_refined",
        "vertebrae_body",
        "total",
      ].includes(t.id),
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
      [
        "appendicular_bones",
        "thigh_shoulder_muscles",
        "hip_implant",
        "total",
      ].includes(t.id),
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
    ].includes(t.id),
  );
}
