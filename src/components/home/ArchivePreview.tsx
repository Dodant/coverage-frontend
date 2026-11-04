"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { ARTWORKS, GENRES, type Genre } from "@/lib/artworks";
import { ArtworkImage } from "../ArtworkImage";
import { ArtworkCard } from "../ArtworkCard";
import { EditorialHeading } from "../EditorialHeading";
import { EASE_OUT } from "../motion";

export function ArchivePreview() {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<Genre | null>(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 30 }), sy = useSpring(y, { stiffness: 300, damping: 30 });
  const genres = useMemo(() => {
    const m = new Map<Genre, typeof ARTWORKS>();
    for (const a of ARTWORKS) m.set(a.genre, [...(m.get(a.genre) ?? []), a]);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, []);
  const shelf = useMemo(() => ARTWORKS.filter((_, i) => i % 3 === 0).slice(0, 26), []);

  return (
    <section id="archive" aria-labelledby="archive-title" className="relative overflow-hidden bg-museum/60 py-[var(--section-y)]">
      <div className="wrap">
        <div className="grid grid-cols-12 gap-x-[var(--gutter)] border-t border-ink pt-4">
          <p className="label col-span-6 md:col-span-3">02 — Explore the Archive</p>
          <p className="label col-span-6 text-right md:col-span-3 md:col-start-10">Index by genre</p>
        </div>
        <div className="mt-8 grid grid-cols-12 items-end gap-x-[var(--gutter)]">
          <EditorialHeading
            as="h2"
            lines={[{ text: "The" }, { text: "Archive", className: "md:pl-[0.9em]" }]}
            className="display col-span-12 text-[length:var(--fs-mega)] leading-[0.8] md:col-span-8"
          />
          <span id="archive-title" className="sr-only">The Archive</span>
          <div className="col-span-12 mt-8 md:col-span-4 md:mt-0">
            <p className="kr text-[15px] leading-[1.75] text-ink/80">
              {ARTWORKS.length}점의 표지를 장르와 색, 출판 연도, 번역 여부로 탐색합니다. 표지는 언제나 원래의 비율 그대로, 어떤 필터도 거치지 않은 채 전시됩니다.
            </p>
            <Link href="/archive" className="group mt-6 inline-flex items-center gap-3 border-b border-ink pb-1 font-[family-name:var(--font-grotesk)] text-lg font-medium tracking-[-0.02em]">
              Enter the full archive <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>

        <ul
          className="relative mt-16 border-t border-ink/20"
          onPointerMove={(e) => { x.set(e.clientX); y.set(e.clientY); }}
          onPointerLeave={() => setHover(null)}
        >
          {genres.map(([g, list], i) => (
            <li key={g} className="border-b border-ink/20">
              <Link
                href={`/archive?genre=${g}`}
                onPointerEnter={() => setHover(g)}
                onFocus={() => setHover(g)}
                onBlur={() => setHover(null)}
                className="group grid grid-cols-12 items-baseline gap-x-[var(--gutter)] py-3 md:py-4"
              >
                <span className="label col-span-1 text-ash">{String(i + 1).padStart(2, "0")}</span>
                <span className="display col-span-8 text-[clamp(2rem,5.6vw,5.4rem)] leading-[0.95] transition-[letter-spacing,transform] duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-3 md:col-span-6">
                  <span className={i % 3 === 1 ? "serif-i" : ""}>{GENRES[g].en}</span>
                </span>
                <span className="kr col-span-3 hidden text-lg text-ash md:block">{GENRES[g].kr}</span>
                <span className="label col-span-3 text-right tabular-nums md:col-span-2">{String(list.length).padStart(3, "0")} works</span>
              </Link>
            </li>
          ))}
          <AnimatePresence>
            {hover && !reduce && (
              <motion.div
                key="peek"
                aria-hidden="true"
                className="pointer-events-none fixed left-0 top-0 z-30 hidden md:flex"
                style={{ x: sx, y: sy }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                <div className="-translate-y-1/2 translate-x-10 flex items-end gap-2">
                  {(genres.find(([g]) => g === hover)?.[1] ?? []).slice(0, 3).map((a, k) => (
                    <motion.div key={a.id + hover} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: k * 0.05, duration: 0.4, ease: EASE_OUT }} style={{ width: k === 1 ? 150 : 118, rotate: (k - 1) * 4 }}>
                      <ArtworkImage a={a} sizes="160px" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ul>
      </div>

      {/* Shelf marquee */}
      <div className="mt-[var(--section-y)] overflow-hidden" aria-label="Recently archived">
        <div className="marquee flex w-max items-end gap-6 px-6 md:gap-10" style={{ "--marquee-d": "90s" } as React.CSSProperties}>
          {[...shelf, ...shelf].map((a, i) => (
            <div key={i} aria-hidden={i >= shelf.length || undefined} inert={i >= shelf.length} className="shrink-0">
              <ArtworkCard a={a} caption="always" save={false} sizes="160px" rowHeight="clamp(9rem, 13vw, 12.5rem)" />
            </div>
          ))}
        </div>
        <div className="wrap"><div className="mt-4 h-px bg-ink/30" /></div>
      </div>
    </section>
  );
}
