import React from "react";
import {
  Heart,
  Kidneys,
  Liver,
  Lungs,
  Spine,
  Neurology,
  Tooth,
  Eye,
  Head,
} from "healthicons-react/filled";

/**
 * Anatomically accurate medical organ SVG icons for TotalSegmentator model cards.
 * Replaces generic/abstract symbols with recognizable organs (Liver, Kidney, Brain, Heart, Lungs, Spine, etc.).
 */
export const renderTotalSegIcon = (id: string): React.ReactElement => {
  switch (id) {
    // ──────────────────────────────────────────
    // ── LIVER MODELS ──
    // ──────────────────────────────────────────
    case "liver_lesions":
    case "liver_lesions_mr":
    case "liver_vessels":
    case "liver_segments":
    case "liver_segments_mr":
      return <Liver width={20} height={20} />;

    // ──────────────────────────────────────────
    // ── KIDNEY MODELS ──
    // ──────────────────────────────────────────
    case "kidney_cysts":
    case "renal_arteries":
      return <Kidneys width={20} height={20} />;

    // ──────────────────────────────────────────
    // ── BRAIN & NEURO MODELS ──
    // ──────────────────────────────────────────
    case "cerebral_bleed":
    case "brain_structures":
    case "brain_aneurysm":
      return <Neurology width={20} height={20} />;

    // ──────────────────────────────────────────
    // ── HEART & GREAT VESSELS ──
    // ──────────────────────────────────────────
    case "heartchambers_highres":
    case "ventricle_parts":
    case "coronary_arteries":
    case "aortic_sinuses":
    case "aorta_annulus":
    case "aortic_dissection":
    case "pulmonary_artery_landmarks":
      return <Heart width={20} height={20} />;

    // ──────────────────────────────────────────
    // ── LUNGS & THORAX ──
    // ──────────────────────────────────────────
    case "lung_vessels":
    case "lung_nodules":
    case "pleural_pericard_effusion":
      return <Lungs width={20} height={20} />;

    case "breasts":
      return (
        /* Anatomical Mammary Gland Silhouette */
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 14C4 9.5 7.5 6 12 6C16.5 6 20 9.5 20 14C20 17 17.5 19 12 19C6.5 19 4 17 4 14Z"
            fill="#ec4899"
            fillOpacity="0.18"
            stroke="#f472b6"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="13" r="2.2" stroke="#f472b6" strokeWidth="1.5" />
          <circle cx="12" cy="13" r="0.8" fill="#f472b6" />
        </svg>
      );

    // ──────────────────────────────────────────
    // ── SPINE & SKELETAL ──
    // ──────────────────────────────────────────
    case "vertebrae_body":
    case "vertebrae_pp":
    case "vertebrae_pp_refined":
    case "vertebrae_mr":
      return <Spine width={20} height={20} />;

    case "appendicular_bones":
    case "appendicular_bones_mr":
      return <Spine width={20} height={20} />;

    case "hip_implant":
      return <Spine width={20} height={20} />;

    // ──────────────────────────────────────────
    // ── HEAD, DENTAL & SENSORY ──
    // ──────────────────────────────────────────
    case "teeth":
      return <Tooth width={20} height={20} />;

    case "oculomotor_muscles":
      return <Eye width={20} height={20} />;

    case "head_glands_cavities":
    case "craniofacial_structures":
    case "headneck_bones_vessels":
    case "face":
    case "face_mr":
      return <Head width={20} height={20} />;

    // ──────────────────────────────────────────
    // ── MUSCULOSKELETAL ──
    // ──────────────────────────────────────────
    case "thigh_shoulder_muscles":
    case "thigh_shoulder_muscles_mr":
    case "abdominal_muscles":
    case "headneck_muscles":
    case "head_muscles":
      return (
        /* Anatomical Striated Muscle Belly with Tendons */
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 4L7 7"
            stroke="#f43f5e"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M7 7C10 5 15 6 17 9C19 12 19 15 17 17C15 19 12 19 9 17C6 15 5 10 7 7Z"
            fill="#e11d48"
            fillOpacity="0.2"
            stroke="#fb7185"
            strokeWidth="1.8"
          />
          <path
            d="M9.5 9.5C12 11 14 13 14.5 15.5"
            stroke="#fb7185"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M12.5 8C14.5 10 16 11.5 16.5 14"
            stroke="#fb7185"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M17 17L20 20"
            stroke="#f43f5e"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );

    // ──────────────────────────────────────────
    // ── WHOLE BODY & COMPOSITION ──
    // ──────────────────────────────────────────
    case "total":
    case "total_v3":
    case "total_mr":
    case "body":
    case "body_mr":
    case "trunk_cavities":
      return (
        /* Anatomical Human Torso with Internal Visceral Organs */
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="4"
            r="2.2"
            fill="#38bdf8"
            fillOpacity="0.25"
            stroke="#38bdf8"
            strokeWidth="1.6"
          />
          {/* Anatomical Torso Silhouette */}
          <path
            d="M7 8C8.5 7.5 15.5 7.5 17 8C17.5 9 17 13 16 16C15.5 17.5 14 18 13.5 22H10.5C10 18 8.5 17.5 8 16C7 13 6.5 9 7 8Z"
            fill="#38bdf8"
            fillOpacity="0.15"
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Internal Visceral Organ Curves (Lungs, Heart, Liver, Intestine) */}
          <path
            d="M10 10.5C10.5 10 11.5 10 12 10.5"
            stroke="#38bdf8"
            strokeWidth="1.3"
          />
          <path
            d="M12 10.5C12.5 10 13.5 10 14 10.5"
            stroke="#38bdf8"
            strokeWidth="1.3"
          />
          <path
            d="M9.5 14C11 13 13 13 14.5 14"
            stroke="#38bdf8"
            strokeWidth="1.3"
          />
        </svg>
      );

    case "tissue_types":
    case "tissue_types_mr":
    case "tissue_4_types":
      return (
        /* Body Composition (Subcutaneous & Visceral Adipose Tissue / Skeletal Muscle) */
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            rx="3.5"
            fill="#f59e0b"
            fillOpacity="0.15"
            stroke="#fbbf24"
            strokeWidth="1.8"
          />
          {/* Layered tissue bands (SAT, VAT, Muscle) */}
          <path d="M3.5 9H20.5" stroke="#fbbf24" strokeWidth="1.4" />
          <path d="M3.5 15H20.5" stroke="#fbbf24" strokeWidth="1.4" />
          <circle cx="8" cy="6.2" r="1" fill="#fbbf24" />
          <circle cx="12" cy="12" r="1.4" fill="#38bdf8" />
          <circle cx="16" cy="17.8" r="1" fill="#fbbf24" />
        </svg>
      );

    // ──────────────────────────────────────────
    // ── DEFAULT MEDICAL SHIELD ──
    // ──────────────────────────────────────────
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L4 5V11C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11V5L12 2Z"
            fill="#38bdf8"
            fillOpacity="0.15"
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9 12L11 14L15 10"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};
