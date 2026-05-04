"use client";
import { kiddoColors } from "./kiddoColors";

interface CircularBadgeSealProps {
  text?: string;
  size?: number;
  color?: string;
  bgColor?: string;
  className?: string;
  spinning?: boolean;
}

export function CircularBadgeSeal({
  text = "PLAY AROUND · KIDDO STUDIO ·",
  size = 140,
  color = kiddoColors.black,
  bgColor = kiddoColors.cream,
  className = "",
  spinning = false,
}: CircularBadgeSealProps) {
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${spinning ? "animate-spin-slow" : ""} ${className}`}
    >
      {/* Outer stamp circle — slightly rough */}
      <path
        d="M 70 8 C 90 6 112 18 122 36 C 132 54 130 80 120 96 C 110 112 90 124 68 124
           C 46 124 26 112 16 96 C 6 80 6 54 16 36 C 26 18 50 10 70 8 Z"
        fill={bgColor}
        stroke={color}
        strokeWidth={2.5}
      />
      {/* Inner circle dashed ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r - 10}
        stroke={color}
        strokeWidth={1.2}
        strokeDasharray="4 3"
        fill="none"
      />
      {/* Curved text path */}
      <defs>
        <path
          id="textCircle"
          d={`M ${cx - r},${cy} a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 ${-r * 2},0`}
        />
      </defs>
      <text
        fontSize="9"
        fontFamily="'Arial', sans-serif"
        fontWeight="700"
        fill={color}
        letterSpacing="3"
      >
        <textPath href="#textCircle" startOffset="0%">
          {text}
        </textPath>
      </text>
      {/* Center smiley */}
      <circle cx={cx} cy={cy} r="18" stroke={color} strokeWidth={2} fill="none" />
      <ellipse cx={cx - 6} cy={cy - 4} rx="2.5" ry="4" fill={color} />
      <ellipse cx={cx + 6} cy={cy - 4} rx="2.5" ry="4" fill={color} />
      <path
        d={`M ${cx - 9} ${cy + 4} C ${cx - 4} ${cy + 12} ${cx + 4} ${cy + 12} ${cx + 9} ${cy + 4}`}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
