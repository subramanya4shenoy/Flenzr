import React from "react";

interface LogoProps {
  size?: number;
  variant?: "duotone" | "cream" | "crimson" | "black" | "monochrome";
  withWordmark?: boolean;
  className?: string;
}

export function Logo({
  size = 36,
  variant = "duotone",
  withWordmark = false,
  className = "",
}: LogoProps) {
  // Brand color mappings
  let topFill = "#c1121f"; // Crimson
  let bottomFill = "#fdf0d5"; // Cream

  if (variant === "cream") {
    topFill = "#fdf0d5";
    bottomFill = "#fdf0d5";
  } else if (variant === "crimson") {
    topFill = "#c1121f";
    bottomFill = "#c1121f";
  } else if (variant === "black") {
    topFill = "#000000";
    bottomFill = "#000000";
  } else if (variant === "monochrome") {
    topFill = "currentColor";
    bottomFill = "currentColor";
  }

  // Calculate proportional dimensions
  const height = size;
  const width = Math.round((size * 280) / 400);

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="40 70 280 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <g transform="translate(0, 496) scale(0.1, -0.1)">
          {/* Top Wing */}
          <path
            fill={topFill}
            d="M3035 4144 c-33 -13 -230 -87 -438 -164 -639 -238 -1006 -380 -1512 -585 -300 -121 -333 -137 -395 -186 -68 -53 -115 -120 -142 -199 -21 -61 -22 -85 -25 -440 -2 -220 0 -381 6 -389 11 -16 71 11 611 276 195 96 436 207 535 248 99 40 320 135 490 210 171 75 393 173 495 217 102 43 206 93 233 110 86 55 144 134 190 258 19 50 21 82 25 363 2 169 0 307 -5 306 -4 0 -35 -12 -68 -25z"
          />
          {/* Lower Stem & Arm */}
          <path
            fill={bottomFill}
            d="M1330 2374 c-168 -80 -415 -197 -550 -261 -135 -63 -248 -120 -253 -127 -9 -13 -5 -1621 4 -1631 10 -9 830 511 863 548 15 17 40 57 55 87 26 55 26 56 29 333 2 152 7 277 12 277 4 0 192 -57 416 -127 385 -119 414 -127 494 -127 77 -1 92 2 152 32 107 52 177 146 203 271 12 54 15 129 13 313 l-3 243 -165 48 c-91 26 -226 66 -300 87 -74 22 -244 71 -377 110 -133 38 -252 70 -265 69 -13 0 -160 -66 -328 -145z"
          />
        </g>
      </svg>

      {withWordmark && (
        <span
          className="font-black tracking-tight text-white select-none"
          style={{ fontSize: `${Math.round(size * 0.72)}px`, color: "#fdf0d5" }}
        >
          FLENZR
        </span>
      )}
    </div>
  );
}

export default Logo;
