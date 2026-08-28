export const renderPresetIcon = (id: string) => {
  switch (id) {
    case "CT-Segmentation-Only":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.12 6.4-6.05-3.5a3 3 0 0 0-2.94 0L6.08 6.4a3 3 0 0 0-1.5 2.6v7a3 3 0 0 0 1.5 2.6l6.05 3.5a3 3 0 0 0 2.94 0l6.05-3.5a3 3 0 0 0 1.5-2.6v-7a3 3 0 0 0-1.5-2.6Z" />
          <path d="m12 2.5 9 5.2-9 5.2-9-5.2 9-5.2Z" />
          <path d="M12 12.9V22" />
          <path d="m21 7.7-9 5.2" />
        </svg>
      );
    case "CT-Ghost-Body":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="5" r="3" />
          <path d="M6 21v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3" strokeDasharray="2 2" />
          <path d="M9 13a3 3 0 0 0 6 0" />
        </svg>
      );
    case "CT-Bone":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 5a3 3 0 0 0-3 3 3 3 0 0 0 .1 1L9 15.1A3 3 0 1 0 5 19a3 3 0 0 0 3-3 3 3 0 0 0-.1-1L14 8.9A3 3 0 1 0 18 5Z" />
          <path d="m9 9 6 6" />
        </svg>
      );
    case "CT-AAA":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v6" />
          <path d="M8 6a4 4 0 0 1 8 0v4c0 3-2 5-4 7-2-2-4-4-4-7V6" />
          <path d="M8 12l-4 3" />
          <path d="M16 12l4 3" />
          <path d="M12 17v4" />
        </svg>
      );
    case "CT-Chest-Vessels":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22V12" />
          <path d="M12 12c0-3-2-5-5-7" />
          <path d="M12 12c0-3 2-5 5-7" />
          <path d="M7 5c0-1.5-1-2.5-3-3" />
          <path d="M7 5c1-1 2-2 3-3" />
          <path d="M17 5c-1-1-2-2-3-3" />
          <path d="M17 5c0-1.5 1-2.5 3-3" />
          <path d="M12 17c-2 0-4 1-5 3" />
          <path d="M12 17c2 0 4 1 5 3" />
        </svg>
      );
    case "CT-Soft-Tissue":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3c-4.5 0-8 3-8 7.5 0 5 4 10.5 8 10.5s8-5.5 8-10.5C20 6 16.5 3 12 3Z" />
          <path d="M8 11c1 2 2.5 3 4 3s3-1 4-3" strokeDasharray="2 2" />
        </svg>
      );
    case "CT-MIP":
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
          <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
          <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
        </svg>
      );
    default:
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
        </svg>
      );
  }
};
