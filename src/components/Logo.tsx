import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {}

export default function Logo(props: LogoProps) {
  return (
    <svg
      viewBox="0 0 48 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <text
        x="24"
        y="12"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontSize="15"
        fontWeight="800"
        fill="#ffffff"
        letterSpacing="0.06em"
        textAnchor="middle"
        dominantBaseline="central"
      >
        VMI
      </text>
    </svg>
  );
}
