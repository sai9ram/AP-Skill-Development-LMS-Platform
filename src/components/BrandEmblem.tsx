import React from "react";

export function BrandEmblem({
  variant = "light",
  size = 40,
}: {
  variant?: "light" | "dark";
  size?: number;
}) {
  const stroke = variant === "light" ? "#FFFFFF" : "#0F3D2E";
  const fill = variant === "light" ? "#FFFFFF" : "#0F3D2E";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AP Skill Development LMS Emblem"
    >
      <circle cx="24" cy="24" r="22" stroke={stroke} strokeWidth="2.2" />
      <circle
        cx="24"
        cy="24"
        r="17.5"
        stroke={stroke}
        strokeWidth="1"
        strokeDasharray="3 2"
      />
      <path
        d="M24 10L34 15.5V23.5C34 30.2 29.7 35.8 24 38C18.3 35.8 14 30.2 14 23.5V15.5L24 10Z"
        stroke={stroke}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M19.5 24.5L22.5 27.5L29 20.5"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="14.5" r="1.5" fill={fill} />
    </svg>
  );
}
