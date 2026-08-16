import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {}

export default function Logo(props: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <text
        x="12"
        y="15.5"
        fontFamily="sans-serif"
        fontSize="13.5"
        fontWeight="900"
        fill="currentColor"
        stroke="none"
        textAnchor="middle"
        letterSpacing="-0.02em"
      >
        VSP
      </text>
    </svg>
  );
}
