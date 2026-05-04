"use client";

interface GridPaperPatchProps {
  width?: number;
  height?: number;
  gridColor?: string;
  bgColor?: string;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function GridPaperPatch({
  width = 160,
  height = 140,
  gridColor = "rgba(80,80,80,0.25)",
  bgColor = "#F0EBDE",
  rotation = 3,
  className = "",
  style,
}: GridPaperPatchProps) {
  const cellSize = 14;
  const lines: React.ReactNode[] = [];

  // Vertical lines
  for (let x = cellSize; x < width; x += cellSize) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={gridColor} strokeWidth="0.6" />
    );
  }
  // Horizontal lines
  for (let y = cellSize; y < height; y += cellSize) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={gridColor} strokeWidth="0.6" />
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transform: `rotate(${rotation}deg)`, ...style }}
    >
      {/* Paper background — slightly torn/organic shape */}
      <path
        d={`M 6 4 C 20 2 ${width - 20} 2 ${width - 6} 4
           C ${width - 2} 8 ${width - 2} 20 ${width - 4} ${height - 16}
           C ${width - 2} ${height - 6} ${width - 18} ${height - 2} ${width - 40} ${height - 4}
           C ${width - 60} ${height} 50 ${height - 2} 20 ${height - 4}
           C 8 ${height - 2} 2 ${height - 8} 4 ${height - 20}
           C 2 ${Math.floor(height / 2)} 2 20 6 4 Z`}
        fill={bgColor}
      />
      {/* Grid lines clipped inside */}
      <clipPath id="patchClip">
        <path
          d={`M 6 4 C 20 2 ${width - 20} 2 ${width - 6} 4
             C ${width - 2} 8 ${width - 2} 20 ${width - 4} ${height - 16}
             C ${width - 2} ${height - 6} ${width - 18} ${height - 2} ${width - 40} ${height - 4}
             C ${width - 60} ${height} 50 ${height - 2} 20 ${height - 4}
             C 8 ${height - 2} 2 ${height - 8} 4 ${height - 20}
             C 2 ${Math.floor(height / 2)} 2 20 6 4 Z`}
        />
      </clipPath>
      <g clipPath="url(#patchClip)">{lines}</g>
    </svg>
  );
}
