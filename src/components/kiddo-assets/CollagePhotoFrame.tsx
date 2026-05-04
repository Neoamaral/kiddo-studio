"use client";
import { kiddoColors } from "./kiddoColors";

interface CollagePhotoFrameProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  rotation?: number;
  blackAndWhite?: boolean;
  shadow?: boolean;
  tape?: "top" | "corner" | "none";
  tapeColor?: "yellow" | "black" | "paper";
  className?: string;
  style?: React.CSSProperties;
}

const tapeColors = {
  yellow: kiddoColors.lime,
  black: kiddoColors.black,
  paper: "#D8CEBC",
};

export function CollagePhotoFrame({
  src,
  alt,
  width = 320,
  height = 380,
  rotation = -3,
  blackAndWhite = false,
  shadow = true,
  tape = "top",
  tapeColor = "yellow",
  className = "",
  style,
}: CollagePhotoFrameProps) {
  const padding = 16;
  const totalW = width + padding * 2;
  const totalH = height + padding * 2 + (tape !== "none" ? 0 : 0);

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        width: totalW,
        ...style,
      }}
    >
      {/* Shadow layer */}
      {shadow && (
        <div
          className="absolute inset-0"
          style={{
            transform: "translate(6px, 8px)",
            background: "rgba(0,0,0,0.18)",
            filter: "blur(10px)",
            borderRadius: 2,
          }}
        />
      )}

      {/* White photo paper */}
      <div
        className="relative"
        style={{
          background: "#fff",
          padding: padding,
          paddingBottom: padding + 6,
        }}
      >
        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          style={{
            display: "block",
            width: width,
            height: height,
            objectFit: "cover",
            filter: blackAndWhite ? "grayscale(100%) contrast(1.05)" : undefined,
          }}
        />
      </div>

      {/* Tape — top center */}
      {tape === "top" && (
        <div
          className="absolute left-1/2"
          style={{
            top: -10,
            transform: "translateX(-50%) rotate(-2deg)",
            width: 80,
            height: 26,
            background: tapeColors[tapeColor],
            opacity: 0.9,
          }}
        />
      )}

      {/* Tape — corner */}
      {tape === "corner" && (
        <>
          <div
            className="absolute"
            style={{
              top: -6,
              left: 12,
              transform: "rotate(-45deg)",
              width: 40,
              height: 22,
              background: tapeColors[tapeColor],
              opacity: 0.85,
            }}
          />
          <div
            className="absolute"
            style={{
              top: -6,
              right: 12,
              transform: "rotate(45deg)",
              width: 40,
              height: 22,
              background: tapeColors[tapeColor],
              opacity: 0.85,
            }}
          />
        </>
      )}
    </div>
  );
}
