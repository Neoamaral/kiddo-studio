"use client";
import { kiddoColors } from "./kiddoColors";

interface TapeStripProps {
  variant?: "yellow" | "black" | "paper";
  width?: number;
  height?: number;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function TapeStrip({
  variant = "yellow",
  width = 180,
  height = 32,
  rotation = -8,
  className = "",
  style,
}: TapeStripProps) {
  const colorMap = {
    yellow: { bg: kiddoColors.lime, border: "#A8C010", overlay: "rgba(255,255,255,0.12)" },
    black: { bg: kiddoColors.black, border: "#000000", overlay: "rgba(255,255,255,0.06)" },
    paper: { bg: kiddoColors.tapePaper, border: "#B8A890", overlay: "rgba(255,255,255,0.15)" },
  };

  const { bg, overlay } = colorMap[variant];

  return (
    <div
      className={`inline-block ${className}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        width,
        height,
        ...style,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 180 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Main body */}
        <path
          d="M 4 3 C 8 2 16 2 28 3 L 152 3 C 162 2 170 2 176 3 L 178 4 C 180 8 180 24 178 28
             L 176 29 C 170 30 162 30 152 29 L 28 29 C 16 30 8 30 4 29 L 2 28 C 0 24 0 8 2 4 Z"
          fill={bg}
        />
        {/* Subtle parallel lines (tape texture) */}
        <line x1="0" y1="11" x2="180" y2="11" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
        <line x1="0" y1="16" x2="180" y2="16" stroke="rgba(0,0,0,0.05)" strokeWidth="0.6" />
        <line x1="0" y1="21" x2="180" y2="21" stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
        {/* Transparent sheen overlay */}
        <path
          d="M 4 3 L 176 3 L 178 4 L 178 14 L 2 14 L 2 4 Z"
          fill={overlay}
        />
        {/* Left torn edge */}
        <path
          d="M 4 3 C 2 8 1 14 2 20 C 1 26 3 29 4 29"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Right torn edge */}
        <path
          d="M 176 3 C 178 8 179 14 178 20 C 179 26 177 29 176 29"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
