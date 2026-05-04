"use client";
import { kiddoColors } from "./kiddoColors";

interface HandwrittenWordProps {
  text: string;
  color?: string;
  highlightColor?: string;
  fontSize?: string | number;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function HandwrittenWord({
  text,
  color = kiddoColors.lime,
  highlightColor,
  fontSize = 48,
  rotation = 0,
  className = "",
  style,
}: HandwrittenWordProps) {
  return (
    <span
      className={`relative inline-block ${className}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        display: "inline-block",
        ...style,
      }}
    >
      {/* Optional highlight blob behind word */}
      {highlightColor && (
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: highlightColor,
            transform: "skewX(-4deg) scaleX(1.06)",
            borderRadius: "2px 4px 3px 2px / 3px 2px 4px 3px",
            zIndex: 0,
            top: "5%",
            height: "90%",
          }}
        />
      )}
      <span
        className="relative"
        style={{
          color,
          fontSize,
          fontFamily: "var(--font-hand), Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          fontWeight: 700,
          lineHeight: 1,
          zIndex: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {text}
      </span>
    </span>
  );
}
