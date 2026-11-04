/**
 * Reusable analog film-grain layer. A single static SVG `feTurbulence` tile,
 * rendered once by the browser and shifted with a stepped, composited transform
 * (no per-frame noise generation). Never placed over archived artwork.
 */
const noise = (seed: number, freq: number, tone = 0.5) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${tone}  0 0 0 0 ${tone}  0 0 0 0 ${tone}  0 0 0 1.9 -0.55'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
  ).replace(/%2523/g, "%23")}")`;

export const GRAIN_URL = noise(7, 0.86);
export const GRAIN_URL_B = noise(23, 0.62);
/** White grain for the dark theme (applied via CSS variables on <html>). */
export const GRAIN_URL_WHITE = noise(7, 0.86, 1);
export const GRAIN_URL_WHITE_B = noise(23, 0.62, 1);

type Props = {
  /** 0–1 opacity; defaults to the token for neutral surfaces. */
  intensity?: number;
  /** "fixed" for the page-wide layer, "absolute" inside a section. */
  position?: "fixed" | "absolute";
  blend?: "multiply" | "overlay" | "soft-light" | "screen";
  className?: string;
};

export function FilmGrainOverlay({ intensity, position = "absolute", blend = "multiply", className = "" }: Props) {
  const vars = {
    "--grain-o": intensity,
    "--grain-blend": blend,
  } as React.CSSProperties;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none inset-0 overflow-hidden ${position === "fixed" ? "fixed z-0" : "absolute z-[1]"} ${className}`}
      style={vars}
    >
      <div className="grain" style={{ backgroundImage: GRAIN_URL }} />
      <div className="grain grain--b" style={{ backgroundImage: GRAIN_URL_B }} />
    </div>
  );
}
