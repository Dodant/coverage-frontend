"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import type { Artwork } from "@/lib/artworks";
import { useCatalog } from "@/lib/catalog";
import { navigateWithArtwork } from "@/lib/transition";
import { AuroraBackground } from "../AuroraBackground";
import { AnimatedWordmark } from "../AnimatedWordmark";
import { ArtworkImage } from "../ArtworkImage";
import { EASE_OUT } from "../motion";

type Pos = [left: string, top: string, width: string];
type Slot = { d: Pos; m?: Pos; rot: number; z: number; depth: number; label: "l" | "r" };
// Desktop & mobile placements are art-directed separately.
// Slot 2 is the largest cover on both, so it alone gets fetchpriority="high"; slots without `m`
// are hidden on mobile and load lazily so phones never fetch them.
const SLOTS: Slot[] = [
  { d: ["4.5%", "19%", "clamp(7.5rem,12.5vw,15rem)"], m: ["5%", "24%", "35vw"], rot: -5, z: 2, depth: 18, label: "r" },
  { d: ["36.5%", "23%", "clamp(5.5rem,8.6vw,10.5rem)"], rot: 4, z: 4, depth: 34, label: "r" },
  { d: ["53%", "13%", "clamp(8.5rem,14.5vw,17.5rem)"], m: ["47%", "19%", "42vw"], rot: 2.5, z: 2, depth: 12, label: "l" },
  { d: ["82%", "21%", "clamp(6rem,10.5vw,12.5rem)"], m: ["69%", "40%", "26vw"], rot: -3.5, z: 4, depth: 28, label: "l" },
  { d: ["68%", "54%", "clamp(7rem,12vw,14.5rem)"], rot: 6, z: 2, depth: 20, label: "l" },
];

function Floating({ a, s, i, mx, my }: { a: Artwork; s: Slot; i: number; mx: MotionValue<number>; my: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const ref = useRef<HTMLImageElement>(null);
  const x = useTransform(mx, (v) => v * s.depth);
  const y = useTransform(my, (v) => v * s.depth);
  return (
    <motion.div
      className={`absolute left-[var(--lm)] top-[var(--tm)] w-[var(--wm)] md:left-[var(--ld)] md:top-[var(--td)] md:w-[var(--wd)] ${s.m ? "" : "hidden md:block"}`}
      style={{
        "--ld": s.d[0], "--td": s.d[1], "--wd": s.d[2],
        "--lm": (s.m ?? s.d)[0], "--tm": (s.m ?? s.d)[1], "--wm": (s.m ?? s.d)[2],
        zIndex: s.z, x: reduce ? 0 : x, y: reduce ? 0 : y,
      } as React.CSSProperties & { x: unknown; y: unknown }}
      initial={reduce ? false : { opacity: 0, y: 80, rotate: s.rot * 2.2, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, rotate: s.rot, scale: 1 }}
      transition={{ duration: 1.25, ease: EASE_OUT, delay: 0.55 + i * 0.11 }}
    >
      <div className="motion-safe:animate-[float_var(--fd)_ease-in-out_infinite_alternate]" style={{ "--fd": `${7 + i * 1.3}s` } as React.CSSProperties}>
        <Link
          href={`/artwork/${a.id}`}
          className="art-hover group block"
          onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); navigateWithArtwork(router.push, `/artwork/${a.id}`, ref.current); }}
        >
          <div className="art-frame"><ArtworkImage a={a} priority={i === 2} loading={i === 2 || s.m ? "eager" : "lazy"} sizes="18vw" imgRef={ref} /></div>
          <span className={`label absolute top-full mt-2 hidden w-[16em] text-ink/75 ${i === 4 ? "" : "lg:block"} ${s.label === "l" ? "right-0 text-right" : "left-0"}`}>
            fig. {String(i + 1).padStart(2, "0")} — <span className="kr normal-case tracking-normal">{a.title}</span>, {a.year}
          </span>
        </Link>
      </div>
    </motion.div>
  );
}

export function Hero({ covers }: { covers: Artwork[] }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 18 });
  const sy = useSpring(my, { stiffness: 40, damping: 18 });
  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] flex-col overflow-hidden"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        mx.set(e.clientX / window.innerWidth - 0.5);
        my.set(e.clientY / window.innerHeight - 0.5);
      }}
    >
      <motion.div className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.2, ease: EASE_OUT }}>
        <AuroraBackground preset="dawn" grain={0.3} />
      </motion.div>

      {/* Annotations */}
      <motion.div
        className="wrap relative z-[5] grid w-full grid-cols-1 gap-4 pt-20 md:grid-cols-12 md:pt-24"
        initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.9 }}
      >
        <p className="label md:col-span-3">Nº 001<span className="md:hidden"> · Museum of Cover Art</span><span className="hidden md:inline"><br />An Experimental Digital<br />Museum of Book Cover Art</span></p>
        <HeroIndex />
        <p className="label hidden text-right md:col-span-3 md:col-start-10 md:block">37.5665° N, 126.9780° E<br />Seoul / Online<br />Open always</p>
      </motion.div>

      <div className="pointer-events-none absolute inset-0 [&_a]:pointer-events-auto">
        {covers.slice(0, 5).map((a, i) => (
          <Floating key={a.id} a={a} s={SLOTS[i]} i={i} mx={sx} my={sy} />
        ))}

        {/* Statement */}
        <div className="wrap pointer-events-none absolute inset-x-0 top-[58%] z-[5] md:top-[25%]">
          <div className="max-w-[22ch] md:ml-[17%]">
            <motion.p
              className="serif-i text-[clamp(2.4rem,6.4vw,6.4rem)] leading-[0.92]"
              initial={reduce ? false : { opacity: 0, y: 30, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 1.05, duration: 1.2, ease: EASE_OUT }}
            >
              Every Cover<br /><span className="ml-[0.9em]">Is a World.</span>
            </motion.p>
            <motion.p
              className="kr label mt-4 ml-[0.3em] normal-case tracking-[0.02em] md:ml-[2.6em]"
              initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 0.8 }}
            >
              모든 표지는 하나의 세계다 — 표지를 책의 포장이 아닌,<br className="hidden md:block" /> 그 자체로 완결된 작품으로 바라보는 아카이브.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Wordmark */}
      <div className="pointer-events-none relative z-[3] mt-auto [&_a]:pointer-events-auto">
        <div className="flex items-end justify-between px-[var(--gutter)] pb-2">
          <p className="label hidden sm:block">↘ Scroll to enter the archive</p>
          <a href="#exhibition" className="group label ml-auto flex items-center gap-3" aria-label="Scroll to the featured exhibition">
            <span>Exhibition 01</span>
            <span aria-hidden="true" className="relative block h-12 w-px overflow-hidden bg-ink/15"><span className="cue-line absolute inset-0 bg-ink" /></span>
          </a>
        </div>
        <AnimatedWordmark
          className="-mb-[0.085em] block px-[calc(var(--gutter)*0.5)] text-[length:var(--fs-wordmark)] leading-[0.8] tracking-[var(--track-tight)] text-ink"
          delay={0.35}
        />
        <span id="hero-title" className="sr-only">COVERAGE — Every Cover Is a World</span>
      </div>
    </section>
  );
}

function HeroIndex() {
  const { works, live } = useCatalog();
  const years = works.map((w) => w.year).filter(Boolean) as number[];
  return (
    <p className="label hidden md:col-span-3 md:col-start-6 md:block">
      {live ? "Live archive" : "Collection I — Changbi"}<br />
      {live ? "Newest arrivals" : `${works.length} works on view`}<br />
      {years.length ? `${Math.min(...years)} — ${Math.max(...years)}` : ""}
    </p>
  );
}
