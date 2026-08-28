export const renderTotalSegIcon = (id: string) => {
  switch (id) {
    case "total":
    case "total_mr":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="3" />
          <path d="M6 21v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3" />
          <path d="M9 13a3 3 0 0 0 6 0" />
        </svg>
      );

    case "liver_vessels":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20" />
          <path d="M12 7c-3 0-6 2-7 5" />
          <path d="M12 12c4 0 7 2 7 5" />
          <path d="M5 12c-1 2-1 4 0 6" />
          <path d="M19 17c1 1 2 2 2 4" />
        </svg>
      );

    case "tissue_types":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="3" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M9 3v18" />
        </svg>
      );

    case "vertebrae_body":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="12" height="4" x="6" y="3" rx="1.5" />
          <rect width="14" height="4" x="5" y="10" rx="1.5" />
          <rect width="16" height="4" x="4" y="17" rx="1.5" />
          <line x1="12" y1="7" x2="12" y2="10" />
          <line x1="12" y1="14" x2="12" y2="17" />
        </svg>
      );

    case "appendicular_bones":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 5a3 3 0 0 0-3 3 3 3 0 0 0 .1 1L9 15.1A3 3 0 1 0 5 19a3 3 0 0 0 3-3 3 3 0 0 0-.1-1L14 8.9A3 3 0 1 0 18 5Z" />
          <path d="m9 9 6 6" />
        </svg>
      );

    case "thigh_shoulder_muscles":
    case "headneck_muscles":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 18c0-3 2-6 6-6s6 3 6 6" />
          <path d="M8 12c0-2 1.5-4 4-4s4 2 4 4" />
          <circle cx="12" cy="4" r="2" />
        </svg>
      );

    case "heartchambers_highres":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <path d="M12 5v16" strokeDasharray="2 2" />
          <path d="M4.5 11h15" strokeDasharray="2 2" />
        </svg>
      );

    case "coronary_arteries":
    case "aortic_sinuses":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v6" />
          <path d="M8 6a4 4 0 0 1 8 0v4c0 3-2 5-4 7-2-2-4-4-4-7V6" />
          <path d="M8 12l-4 3" />
          <path d="M16 12l4 3" />
          <path d="M12 17v4" />
        </svg>
      );

    case "lung_vessels":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V12" />
          <path d="M12 12c0-3-2-5-5-7" />
          <path d="M12 12c0-3 2-5 5-7" />
          <path d="M7 5c0-1.5-1-2.5-3-3" />
          <path d="M17 5c0-1.5 1-2.5 3-3" />
          <path d="M12 17c-2 0-4 1-5 3" />
          <path d="M12 17c2 0 4 1 5 3" />
        </svg>
      );

    case "pleural_pericard_effusion":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          <path d="M8 15a4 4 0 0 0 8 0" strokeDasharray="2 2" />
        </svg>
      );

    case "brain_structures":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z" />
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z" />
        </svg>
      );

    case "cerebral_bleed":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );

    case "head_glands_cavities":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="9" cy="10" r="1.5" />
          <circle cx="15" cy="10" r="1.5" />
          <path d="M12 14v2" />
          <path d="M9 18h6" />
        </svg>
      );

    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
  }
};
