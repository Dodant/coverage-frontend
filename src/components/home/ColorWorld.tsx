"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { ARTWORKS, FAMILIES, auroraVars, type Artwork, type ColorFamily } from "@/lib/artworks";
import { AuroraBackground } from "../AuroraBackground";
import { ArtworkCard } from "../ArtworkCard";
import { ArtworkImage } from "../ArtworkImage";
import { EditorialHeading } from "../EditorialHeading";
import { EASE_OUT } from "../motion";

const FAMILY_AURORA: Record<ColorFamily, string[]> = {
  red: ["#ff5a4e", "#ffb58a", "#9b67f5"],
  orange: ["#ff9a52", "#ffd08a", "#ff7771"],
  yellow: ["#ffe066", "#dfff78", "#ffb58a"],
  green: ["#6fd38c", "#dfff78", "#8edfea"],
  cyan: ["#8edfea", "#66c7d9", "#dfff78"],
  blue: ["#345cff", "#8edfea", "#9b67f5"],
  violet: ["#643de8", "#9b67f5", "#ff7771"],
  pink: ["#ff8fc2", "#ffb58a", "#9b67f5"],
  light: ["#ece4d6", "#d6dbe8", "#f3d9cf"],
  dark: ["#3a3550", "#643de8", "#252327"],
};

export function ColorWorld() {
  const reduce = useReducedMotion();
  const [family, setFamily] = useState<ColorFamily>("blue");
  const [peek, setPeek] = useState<Artwork | null>(null);
  const spectrum = useMemo(
    () => [...ARTWORKS].sort((a, b) => {
      const n = (x: Artwork) => (x.family === "light" ? 1000 + x.light : x.family === "dark" ? 2000 - x.light : x.hue < 12 ? x.hue + 360 : x.hue);
      return n(a) - n(b);
    }),
    [],
  );
  const works = useMemo(() => ARTWORKS.filter((a) => a.family === family).sort((a, b) => b.sat - a.sat).slice(0, 8), [family]);
  const fam = FAMILIES.find((f) => f.id === family)!;
  const vars = peek
    ? auroraVars(peek)
    : ({ "--a1": FAMILY_AURORA[family][0], "--a2": FAMILY_AURORA[family][1], "--a3": FAMILY_AURORA[family][2] } as React.CSSProperties);
  const darkInk = family === "dark" && !peek;

  return (
    <section id="color" aria-labelledby="color-title" className={`relative isolate overflow-hidden py-[var(--section-y)] transition-colors duration-700 ${darkInk ? "text-snow" : "text-ink"}`}>
      <AuroraBackground fade preset="reactive" style={vars} base={darkInk ? "#1b1820" : undefined} grain={0.3} />
      <div className="wrap relative z-[2]">
        <div className="grid grid-cols-12 gap-x-[var(--gutter)] border-t border-current pt-4">
          <p className="label col-span-6 md:col-span-3">03 — A World of Colour</p>
          <p className="label col-span-6 text-right md:col-span-3 md:col-start-10">Hue index · {ARTWORKS.length} specimens</p>
        </div>

        <div className="mt-8 grid grid-cols-12 gap-x-[var(--gutter)]">
          <EditorialHeading
            as="h2"
            lines={[{ text: "A World" }, { text: "of Colour", className: "serif-i font-normal tracking-[-0.03em] md:pl-[1.2em]" }]}
            className="display col-span-12 text-[length:var(--fs-mega)] leading-[0.82] md:col-span-9"
          />
          <span id="color-title" className="sr-only">A World of Colour</span>
          <p className="kr col-span-12 mt-6 self-end text-[15px] leading-[1.75] opacity-80 md:col-span-3 md:mt-0">
            모든 표지를 대표색의 색상환 순서로 펼쳤습니다. 색의 띠 위를 지나가면 그 표지의 빛이 공간을 물들입니다.
          </p>
        </div>

        {/* Spectrum */}
        <div className="relative mt-14">
          <div role="list" aria-label="Covers ordered by hue" className="flex h-28 items-stretch overflow-hidden rounded-[2px] md:h-40" onPointerLeave={() => setPeek(null)}>
            {spectrum.map((a) => (
              <Link
                role="listitem"
                key={a.id}
                href={`/artwork/${a.id}`}
                aria-label={`${a.title} — ${a.key}`}
                onPointerEnter={() => setPeek(a)}
                onFocus={() => setPeek(a)}
                className="group relative min-w-0 flex-1 outline-none transition-[flex-grow] duration-300 ease-[var(--ease-out-expo)] hover:flex-[6] focus-visible:flex-[6]"
                style={{ background: a.key }}
              />
            ))}
          </div>
          <div className="label mt-2 flex justify-between opacity-70"><span>0° Vermilion</span><span>120°</span><span>240°</span><span>Bone · Ink</span></div>
          <AnimatePresence>
            {peek && !reduce && (
              <motion.div
                key={peek.id}
                className="pointer-events-none absolute bottom-[calc(100%+1.5rem)] left-1/2 z-10 hidden w-44 -translate-x-1/2 md:block"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
              >
                <ArtworkImage a={peek} sizes="180px" />
                <p className="kr mt-2 text-center text-[13px] font-medium">{peek.title}</p>
                <p className="label text-center opacity-70">{peek.key.toUpperCase()} · {peek.year}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Families */}
        <LayoutGroup>
          <div role="radiogroup" aria-label="Colour family" className="mt-14 flex flex-wrap gap-2">
            {FAMILIES.map((f) => {
              const on = f.id === family;
              return (
                <button
                  key={f.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setFamily(f.id)}
                  className={`relative flex h-11 items-center gap-2.5 rounded-full border px-4 text-sm transition-colors duration-200 ${on ? "border-transparent text-museum" : "border-current/40 hover:border-current"}`}
                >
                  {on && <motion.span layoutId="fam-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ duration: 0.45, ease: EASE_OUT }} />}
                  <span className="relative size-3.5 rounded-full ring-1 ring-black/10" style={{ background: f.swatch }} />
                  <span className="relative font-[family-name:var(--font-grotesk)] font-medium tracking-[-0.01em]">{f.en}</span>
                  <span className="kr relative text-xs opacity-70">{f.kr}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        <div className="mt-12 grid grid-cols-12 gap-x-[var(--gutter)]">
          <div className="col-span-12 md:col-span-3">
            <p aria-live="polite" className="display text-[clamp(2.6rem,6vw,6rem)] leading-[0.85]">{fam.en}</p>
            <p className="label mt-3 opacity-75">{ARTWORKS.filter((a) => a.family === family).length} covers · {fam.kr}</p>
            <Link href={`/archive?color=${family}`} className="mt-6 inline-flex border-b border-current pb-1 text-sm font-medium">See all in the archive →</Link>
          </div>
          <ul className="col-span-12 mt-10 flex flex-wrap items-end gap-3 md:col-span-9 md:mt-0 md:gap-4">
            <AnimatePresence mode="popLayout">
              {works.map((a, i) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={reduce ? false : { opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, delay: i * 0.04 } }}
                  exit={{ opacity: 0, y: -20, transition: { duration: 0.25 } }}
                  onPointerEnter={() => setPeek(a)}
                  onPointerLeave={() => setPeek(null)}
                >
                  <ArtworkCard a={a} caption="none" save={false} sizes="(max-width:768px) 24vw, 10vw" rowHeight="clamp(7.5rem, 10vw, 10rem)" />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </section>
  );
}
