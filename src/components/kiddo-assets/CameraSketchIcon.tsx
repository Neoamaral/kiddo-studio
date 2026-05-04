"use client";
import { kiddoColors } from "./kiddoColors";
import type { BaseIconProps } from "./kiddoStyles";

interface CameraSketchIconProps extends BaseIconProps {
  showAccent?: boolean;
}

export function CameraSketchIcon({
  width = 120,
  height = 100,
  color = kiddoColors.black,
  strokeWidth = 2.5,
  showAccent = true,
  className = "",
}: CameraSketchIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Neon accent blob behind camera */}
      {showAccent && (
        <ellipse cx="54" cy="56" rx="44" ry="34" fill={kiddoColors.lime} />
      )}
      {/* Camera body — slightly wobbly */}
      <path
        d="M 8 30 C 12 26 20 26 32 26 C 44 26 56 26 68 26 C 76 26 80 28 82 32
           L 82 74 C 82 78 78 80 70 80 C 56 80 36 80 20 80 C 10 80 6 78 6 74 Z"
        fill="white"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Top handle/mount */}
      <path
        d="M 28 18 C 32 14 44 14 56 16 L 58 26 L 26 26 Z"
        fill="white"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Main lens — concentric circles */}
      <circle cx="44" cy="54" r="20" fill="white" stroke={color} strokeWidth={strokeWidth} />
      <circle cx="44" cy="54" r="13" stroke={color} strokeWidth={strokeWidth - 0.5} fill="none" />
      <circle cx="44" cy="54" r="6" fill={color} />
      <circle cx="40" cy="50" r="2" fill="white" opacity="0.6" />
      {/* Viewfinder top right */}
      <rect x="64" y="22" width="16" height="10" rx="2" stroke={color} strokeWidth={strokeWidth - 0.5} fill="white" />
      {/* Side video arm */}
      <path
        d="M 82 36 L 114 24 L 114 76 L 82 66 Z"
        fill="white"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Recording light */}
      <circle cx="18" cy="36" r="5" fill={kiddoColors.lime} stroke={color} strokeWidth={1.5} />
      {/* Grip ridges */}
      <line x1="12" y1="44" x2="12" y2="68" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity="0.4" />
      <line x1="16" y1="44" x2="16" y2="68" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}
