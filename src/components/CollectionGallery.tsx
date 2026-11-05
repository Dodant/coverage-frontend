"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Artwork } from "@/lib/artworks";
import { ArtworkCard } from "./ArtworkCard";
import { ArtworkImage } from "./ArtworkImage";
import { EASE_OUT } from "./motion";

export type CollectionView = "gallery" | "shelf" | "salon";

type Props = {
  works: Artwork[];
  view: CollectionView;
  onRemove?: (id: string) => void;
  onMove?: (id: string, dir: -1 | 1) => void;
};

// Every view hangs covers at one shared height; only widths differ, following each cover. ArtworkCard draws
// each cover at that height (measuring the image when the API has no size); each item is as wide as its cover.
const H = { wall: "clamp(13rem, 25vw, 23rem)", shelf: "clamp(9rem, 14vw, 13rem)", salon: "clamp(8.5rem, 13vw, 12rem)" };

function Controls({ a, i, n, onRemove, onMove }: { a: Artwork; i: number; n: number } & Pick<Props, "onRemove" | "onMove">) {
  if (!onRemove) return null;
  return (
    <div className="mt-2 flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover/item:opacity-100 md:group-focus-within/item:opacity-100">
      {onMove && <>
      <button type="button" className="label size-9 rounded-full hover:bg-ink/10 disabled:opacity-30" disabled={i === 0} onClick={() => onMove?.(a.id, -1)} aria-label={`Move ${a.title} earlier`}>←</button>
      <button type="button" className="label size-9 rounded-full hover:bg-ink/10 disabled:opacity-30" disabled={i === n - 1} onClick={() => onMove?.(a.id, 1)} aria-label={`Move ${a.title} later`}>→</button>
      </>}
      <button type="button" className="label ml-auto h-9 rounded-full px-3 hover:bg-coral" onClick={() => onRemove(a.id)} aria-label={`Remove ${a.title} from exhibition`}>Remove</button>
    </div>
  );
}

/** A collection presented as an exhibition — wall, shelf or salon hang. */
export function CollectionGallery({ works, view, onRemove, onMove }: Props) {
  const reduce = useReducedMotion();
  const item = (i: number) => ({
    layout: !reduce,
    initial: reduce ? false : { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.92, transition: { duration: 0.2 } },
    transition: { duration: 0.6, ease: EASE_OUT, delay: Math.min(i, 12) * 0.04 },
  });

  if (view === "shelf") {
    const rows: Artwork[][] = [];
    works.forEach((w, i) => { if (i % 7 === 0) rows.push([]); rows[rows.length - 1].push(w); });
    return (
      <div className="space-y-16">
        {rows.map((row, r) => (
          <div key={r}>
            <ul className="flex items-end gap-3 overflow-x-auto px-1 pb-0 md:gap-5">
              <AnimatePresence mode="popLayout">
                {row.map((a, i) => (
                  <motion.li key={a.id} {...item(i)} className="group/item w-min shrink-0" style={{ transformOrigin: "50% 100%" }}>
                    <ArtworkCard a={a} caption="none" save={false} sizes="180px" rowHeight={H.shelf} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {/* the shelf */}
            <div aria-hidden="true" className="h-3 bg-gradient-to-b from-[color-mix(in_srgb,var(--c-ink)_18%,var(--c-paper))] to-[color-mix(in_srgb,var(--c-ink)_26%,var(--c-paper))] shadow-[0_14px_24px_-12px_rgb(0_0_0/0.35)]" />
            <div className="label mt-3 flex justify-between text-ash"><span>Shelf {String(r + 1).padStart(2, "0")}</span><span>{row.length} volumes</span></div>
          </div>
        ))}
      </div>
    );
  }

  if (view === "salon") {
    return (
      <ul className="flex flex-wrap items-start gap-x-4 gap-y-8 md:gap-x-6">
        <AnimatePresence mode="popLayout">
          {works.map((a, i) => (
            <motion.li key={a.id} {...item(i)} className="group/item w-min flex-none">
              <ArtworkCard a={a} sizes="(max-width:768px) 40vw, 16vw" rowHeight={H.salon} />
              <Controls a={a} i={i} n={works.length} onRemove={onRemove} onMove={onMove} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    );
  }

  return (
    <ol className="flex flex-wrap items-start gap-x-[calc(var(--gutter)*1.4)] gap-y-14">
      <AnimatePresence mode="popLayout">
        {works.map((a, i) => (
          <motion.li key={a.id} {...item(i)} className="group/item w-min flex-none">
            <ArtworkCard a={a} caption="none" save={false} sizes="(max-width:768px) 60vw, 26vw" rowHeight={H.wall} />
            <div className="mt-3 grid grid-cols-[2em_1fr] gap-2 text-[12px]">
              <span className="label text-ash">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="kr font-semibold">{a.title}</p>
                <p className="kr text-ash">{[a.credit, a.year].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            <Controls a={a} i={i} n={works.length} onRemove={onRemove} onMove={onMove} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

/** Compact fanned preview used in the exhibitions index. */
export function CollectionFan({ works, href }: { works: Artwork[]; href: string }) {
  const four = works.slice(0, 5);
  return (
    <Link href={href} className="group relative flex h-56 items-end justify-center md:h-64" aria-hidden="true" tabIndex={-1}>
      {four.length === 0 && <span className="label flex h-40 w-28 items-center justify-center border border-dashed border-ink/30 text-ash">Empty room</span>}
      {four.map((a, i) => {
        const m = (four.length - 1) / 2;
        return (
          <span
            key={a.id}
            className="absolute bottom-0 h-[86%] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:[transform:translateX(var(--tx))_rotate(var(--r2))]"
            style={{ ...(a.ratioUnknown ? {} : { aspectRatio: `${a.w} / ${a.h}` }), transform: `translateX(${(i - m) * 30}%) rotate(${(i - m) * 4}deg)`, "--tx": `${(i - m) * 52}%`, "--r2": `${(i - m) * 7}deg`, zIndex: i, transformOrigin: "50% 120%" } as React.CSSProperties}
          >
            <ArtworkImage a={a} sizes="160px" style={{ height: "100%", width: "auto" }} />
          </span>
        );
      })}
    </Link>
  );
}
