"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FilmGrainOverlay } from "./FilmGrainOverlay";

export type AuroraPreset = "dawn" | "nocturne" | "lagoon" | "ember" | "reactive";

/**
 * A ribbon of light: one sweeping Bézier stroke, softened by an SVG blur.
 * Colours are CSS variables (--a1…--a5) so the environment can re-tint to an artwork.
 * The blur is rasterised once inside the SVG; motion is a composited CSS transform
 * on the wrapper, so the blur is never recomputed per frame.
 */
type Ribbon = {
  d: string;
  w: number; // stroke width in viewBox units (1600 × 1000)
  c: [string, string, string?];
  blur: number;
  o: number;
  dur: number;
  delay?: number;
  sway?: [string, string, string]; // dx, dy, rotate
  blend?: "screen" | "multiply" | "normal" | "soft-light";
};

// Shared choreography of curves — presets re-colour and re-weight them.
const P = {
  crest: "M -300 420 C 120 -60, 520 80, 760 420 S 1240 900, 1500 420 S 1800 -40, 2000 160",
  swell: "M -260 1000 C 120 560, 520 600, 760 860 S 1200 1180, 1480 760 S 1780 420, 1960 620",
  fall: "M 120 -220 C 520 160, 220 520, 620 720 S 1180 760, 1260 1240",
  hook: "M 980 -200 C 1180 260, 1820 80, 1780 520 S 1300 820, 1140 600",
  low: "M -240 700 C 320 380, 760 980, 1140 620 S 1640 300, 1960 520",
};
const LINES = [
  "M -300 470 C 120 -10, 520 130, 760 470 S 1240 950, 1500 470 S 1800 10, 2000 210",
  "M -300 505 C 120 25, 520 165, 760 505 S 1240 985, 1500 505 S 1800 45, 2000 245",
  "M -260 1050 C 120 610, 520 650, 760 910 S 1200 1230, 1480 810 S 1780 470, 1960 670",
];

const PRESETS: Record<AuroraPreset, { base: string; vars: string[]; ribbons: Ribbon[]; lines?: string; veil?: string }> = {
  dawn: {
    base: "#f2eee7",
    vars: ["#345cff", "#ff7771", "#8edfea", "#9b67f5", "#ffb58a"],
    ribbons: [
      { d: P.low, w: 520, c: ["var(--a5)", "var(--a3)", "var(--a5)"], blur: 66, o: 0.55, dur: 34, sway: ["3vw", "2vh", "1.5deg"] },
      { d: P.crest, w: 250, c: ["var(--a1)", "var(--a4)", "var(--a1)"], blur: 31, o: 0.9, dur: 28, sway: ["-4vw", "3vh", "-2deg"] },
      { d: P.swell, w: 290, c: ["var(--a2)", "var(--a5)", "var(--a2)"], blur: 35, o: 0.9, dur: 31, delay: -9, sway: ["4vw", "-3vh", "2deg"] },
      { d: P.fall, w: 150, c: ["var(--a3)", "var(--a1)"], blur: 24, o: 0.75, dur: 25, delay: -5, sway: ["3vw", "4vh", "3deg"] },
      { d: P.hook, w: 200, c: ["var(--a4)", "var(--a2)"], blur: 33, o: 0.7, dur: 29, delay: -14, sway: ["-3vw", "-2vh", "-3deg"] },
    ],
    lines: "rgba(21,21,21,0.16)",
    veil: "linear-gradient(180deg, transparent 55%, rgba(242,238,231,0.5))",
  },
  nocturne: {
    base: "#0f0d13",
    vars: ["#345cff", "#643de8", "#9b67f5", "#ff7771", "#8edfea"],
    ribbons: [
      { d: P.low, w: 560, c: ["var(--a2)", "var(--a1)", "var(--a2)"], blur: 71, o: 0.6, dur: 36, sway: ["3vw", "2vh", "1deg"] },
      { d: P.crest, w: 230, c: ["var(--a4)", "var(--a3)", "var(--a1)"], blur: 30, o: 0.85, dur: 30, sway: ["-4vw", "3vh", "-2deg"], blend: "screen" },
      { d: P.swell, w: 210, c: ["var(--a1)", "var(--a2)", "var(--a3)"], blur: 33, o: 0.8, dur: 27, delay: -8, sway: ["4vw", "-3vh", "2deg"], blend: "screen" },
      { d: P.fall, w: 70, c: ["var(--a5)", "var(--a3)"], blur: 14, o: 0.6, dur: 24, delay: -4, sway: ["2vw", "3vh", "3deg"], blend: "screen" },
    ],
    lines: "rgba(252,251,248,0.14)",
    veil: "radial-gradient(90% 70% at 50% 50%, transparent 35%, rgba(10,9,12,0.55))",
  },
  lagoon: {
    base: "#edf0ec",
    vars: ["#8edfea", "#dfff78", "#345cff", "#ffb58a", "#9b67f5"],
    ribbons: [
      { d: P.low, w: 520, c: ["var(--a1)", "var(--a2)", "var(--a1)"], blur: 66, o: 0.6, dur: 33, sway: ["3vw", "2vh", "1.5deg"] },
      { d: P.swell, w: 270, c: ["var(--a1)", "var(--a3)", "var(--a1)"], blur: 33, o: 0.8, dur: 29, sway: ["-4vw", "-3vh", "-2deg"] },
      { d: P.crest, w: 200, c: ["var(--a2)", "var(--a1)", "var(--a4)"], blur: 30, o: 0.85, dur: 26, delay: -7, sway: ["4vw", "3vh", "2deg"] },
      { d: P.hook, w: 150, c: ["var(--a5)", "var(--a3)"], blur: 27, o: 0.55, dur: 31, delay: -12, sway: ["-2vw", "2vh", "-2deg"] },
    ],
    lines: "rgba(21,21,21,0.13)",
  },
  ember: {
    base: "#f5eee7",
    vars: ["#ff7771", "#ffb58a", "#9b67f5", "#dfff78", "#345cff"],
    ribbons: [
      { d: P.low, w: 540, c: ["var(--a2)", "var(--a1)", "var(--a2)"], blur: 66, o: 0.55, dur: 34, sway: ["3vw", "2vh", "1.5deg"] },
      { d: P.crest, w: 260, c: ["var(--a1)", "var(--a2)", "var(--a3)"], blur: 33, o: 0.9, dur: 29, sway: ["-4vw", "3vh", "-2deg"] },
      { d: P.hook, w: 220, c: ["var(--a3)", "var(--a1)"], blur: 34, o: 0.7, dur: 27, delay: -10, sway: ["-3vw", "-2vh", "-3deg"] },
      { d: P.fall, w: 110, c: ["var(--a4)", "var(--a2)"], blur: 22, o: 0.55, dur: 24, delay: -4, sway: ["3vw", "4vh", "2deg"] },
    ],
    lines: "rgba(21,21,21,0.12)",
  },
  reactive: {
    base: "#f1eee8",
    vars: [],
    ribbons: [
      { d: P.low, w: 560, c: ["var(--a1)", "var(--a3)", "var(--a1)"], blur: 71, o: 0.55, dur: 34, sway: ["3vw", "2vh", "1.5deg"] },
      { d: P.crest, w: 260, c: ["var(--a1)", "var(--a2)", "var(--a1)"], blur: 33, o: 0.85, dur: 29, sway: ["-4vw", "3vh", "-2deg"] },
      { d: P.swell, w: 280, c: ["var(--a2)", "var(--a3)", "var(--a2)"], blur: 35, o: 0.8, dur: 31, delay: -9, sway: ["4vw", "-3vh", "2deg"] },
      { d: P.fall, w: 120, c: ["#ffffff", "var(--a3)"], blur: 22, o: 0.55, dur: 25, delay: -5, sway: ["3vw", "4vh", "3deg"] },
    ],
    lines: "rgba(21,21,21,0.12)",
    veil: "linear-gradient(180deg, transparent 60%, rgba(241,238,232,0.45))",
  },
};

type Props = {
  preset?: AuroraPreset;
  /** Feather the top/bottom edges into the surrounding paper. */
  fade?: boolean;
  /** Hairline contour curves over the light. */
  lines?: boolean;
  grain?: number;
  className?: string;
  style?: React.CSSProperties;
  base?: string;
  /** Colour saturation of the light, 0–1+. Applied inside the SVG filter, so it is rasterised once. */
  saturation?: number;
};

/** House defaults. SATURATION 1 = colours as authored; SOFTNESS scales every ribbon's blur. */
const SATURATION = 1;
const SOFTNESS = 1.6;

export function AuroraBackground({ preset = "dawn", grain = 0.26, className = "", style, base, fade = false, lines = true, saturation = SATURATION }: Props) {
  const uid = useId().replace(/:/g, "");
  const root = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(true);
  // Pause the ambient motion while the section is off screen.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const p = PRESETS[preset];
  const vars = Object.fromEntries(p.vars.map((v, i) => [`--a${i + 1}`, v]));
  const mask = fade ? "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)" : undefined;
  return (
    <div ref={root} aria-hidden="true" className={`aurora ${preset === "nocturne" ? "aurora--night" : ""} ${live ? "" : "is-paused"} ${className}`} style={{ ...vars, maskImage: mask, WebkitMaskImage: mask, ...style }}>
      <div className="aurora__base" style={{ background: base ?? (fade ? "transparent" : p.base) }} />
      {p.ribbons.map((r, i) => {
        const id = `${uid}-${i}`;
        return (
          <div
            key={i}
            className="aurora__ribbon"
            style={{ "--d": `${r.dur}s`, "--delay": `${r.delay ?? 0}s`, "--dx": r.sway?.[0], "--dy": r.sway?.[1], "--rot": r.sway?.[2], mixBlendMode: r.blend ?? "normal", opacity: `calc(${r.o} * var(--aurora-dim, 1))` } as React.CSSProperties}
          >
            <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="0.35">
                  <stop offset="0" style={{ stopColor: r.c[0] }} />
                  <stop offset={r.c[2] ? "0.5" : "1"} style={{ stopColor: r.c[1] }} />
                  {r.c[2] && <stop offset="1" style={{ stopColor: r.c[2] }} />}
                </linearGradient>
                <filter id={`f${id}`} filterUnits="userSpaceOnUse" x="-900" y="-900" width="3400" height="2800" colorInterpolationFilters="sRGB">
                  <feGaussianBlur stdDeviation={r.blur * SOFTNESS} result="soft" />
                  {saturation !== 1 && <feColorMatrix in="soft" type="saturate" values={String(saturation)} />}
                </filter>
              </defs>
              <path d={r.d} fill="none" stroke={`url(#g${id})`} strokeWidth={r.w} strokeLinecap="round" filter={`url(#f${id})`} />
            </svg>
          </div>
        );
      })}
      {lines && p.lines && (
        <div className="aurora__ribbon aurora__lines" style={{ "--d": "38s", "--dx": "-2vw", "--dy": "1.5vh", "--rot": "-1deg" } as React.CSSProperties}>
          <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full overflow-visible">
            {LINES.map((d, i) => (
              <path key={i} d={d} fill="none" style={{ stroke: `var(--aurora-line, ${p.lines})` }} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        </div>
      )}
      {p.veil && <div className="aurora__veil" style={{ background: p.veil }} />}
      <FilmGrainOverlay intensity={preset === "nocturne" ? grain * 0.55 : grain} blend={preset === "nocturne" ? "soft-light" : "multiply"} />
    </div>
  );
}
