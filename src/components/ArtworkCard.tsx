"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { Artwork } from "@/lib/artworks";
import { GENRES, archivedCount, editionImage, editionLangs } from "@/lib/artworks";
import { useWork } from "@/lib/api/useWork";
import { navigateWithArtwork } from "@/lib/transition";
import { ArtworkImage } from "./ArtworkImage";
import { SaveButton } from "./SaveButton";
import { EditionsFan } from "./EditionsFan";

type Props = {
  a: Artwork;
  sizes?: string;
  priority?: boolean;
  caption?: "hover" | "always" | "none";
  save?: boolean;
  className?: string;
  index?: string;
  /** Works mode: hint at the work's other editions with stacked paper and an editions label. */
  stack?: boolean;
  /** Uniform-height mode: every cover is drawn at this CSS height, width follows its own proportions. */
  rowHeight?: string;
};

/** A cover presented as a physical object: lift on hover, essential label only. */
export function ArtworkCard({ a: light, sizes, priority, caption = "hover", save = true, className = "", index, stack = false, rowHeight }: Props) {
  // Live data: a search hit carries no size, colour or editions — expand it to the full work.
  const a = useWork(light, Boolean(stack && light.remote));
  const [ratio, setRatio] = useState<number | null>(a.ratioUnknown ? null : a.w / a.h);
  useEffect(() => { if (!a.ratioUnknown) setRatio(a.w / a.h); }, [a.ratioUnknown, a.w, a.h]);
  const n = a.editions.length;
  const stacked = stack && n > 1;
  const router = useRouter();
  const ref = useRef<HTMLImageElement>(null);
  const href = a.href ?? `/artwork/${a.id}`;

  // Editions fan: opens after a short hover (so sweeping across the grid doesn't fire it), or by the chip.
  const [fan, setFan] = useState<{ h: number; dir: 1 | -1; room: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const openFan = () => {
    const img = ref.current;
    if (!img) return;
    const r = img.getBoundingClientRect();
    // Same cap as the fan itself: it never grows past ~5.5 cover-widths.
    const natural = a.editions.reduce((s, e) => { const im = editionImage(a, e); return s + r.height * (im?.w && im?.h ? im.w / im.h : 2 / 3) + 10; }, 20);
    const total = Math.min(natural, r.height * (2 / 3) * 5.5 + 20);
    // Deal toward whichever side has room; if neither fits, the fan compresses into the roomier side.
    const roomR = window.innerWidth - r.left - 16, roomL = r.right - 16;
    const dir: 1 | -1 = total <= roomR ? 1 : total <= roomL ? -1 : roomR >= roomL ? 1 : -1;
    setFan({ h: r.height, dir, room: dir === 1 ? roomR : roomL });
  };
  const enter = (e: React.PointerEvent) => {
    if (!stacked || e.pointerType !== "mouse") return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(openFan, 180);
  };
  const leave = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setFan(null), 120); };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <figure
      className={`art-hover group relative ${rowHeight ? "flex-none" : ""} ${fan ? "z-30" : ""} ${className}`}
      style={rowHeight ? { width: `calc(${rowHeight} * ${(ratio ?? 2 / 3).toFixed(4)})` } : undefined}
      onPointerEnter={enter}
      onPointerLeave={leave}
    >
      <Link
        href={href}
        className="block outline-none"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          navigateWithArtwork(router.push, href, ref.current);
        }}
      >
        <div className="relative">
          {stacked && (
            <>
              {n > 2 && <span aria-hidden="true" className="absolute inset-0 translate-x-[12px] -translate-y-[11px] rotate-[3deg] border border-[var(--c-sheet-line)] bg-[var(--c-sheet-2)] transition-transform duration-300 group-hover:translate-x-[18px] group-hover:-translate-y-[15px]" />}
              <span aria-hidden="true" className="absolute inset-0 translate-x-[6px] -translate-y-[6px] rotate-[1.5deg] border border-[var(--c-sheet-line)] bg-[var(--c-sheet-1)] transition-transform duration-300 group-hover:translate-x-[10px] group-hover:-translate-y-[9px]" />
            </>
          )}
          <div className="art-frame">
            <ArtworkImage
              a={a}
              sizes={sizes}
              priority={priority}
              imgRef={ref}
              onLoad={(e) => { const i = e.currentTarget; if (a.ratioUnknown && i.naturalWidth) setRatio(i.naturalWidth / i.naturalHeight); }}
            />
          </div>
        </div>
        {caption !== "none" && (
          <figcaption
            className={`mt-3 flex items-baseline justify-between gap-3 transition-all duration-300 ease-[var(--ease-out-expo)] ${
              caption === "hover" ? "opacity-100 md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100" : ""
            }`}
          >
            <span className="kr line-clamp-1 text-[13px] font-medium leading-snug tracking-[-0.01em]">{a.title}</span>
            <span className="label shrink-0 text-ash">{index ?? a.year}</span>
          </figcaption>
        )}
        <span className="sr-only">{`${a.credit}, ${a.imprint} ${a.year ?? ""}, ${GENRES[a.genre].kr}${stacked ? `, ${n} editions, ${archivedCount(a)} cover archived` : ""}`}</span>
      </Link>
      {stack && (
        <span className="label mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px]">
          {stacked ? (
            <>
              <button
                type="button"
                aria-expanded={Boolean(fan)}
                onClick={() => (fan ? setFan(null) : openFan())}
                className="bg-ink px-1.5 py-[1px] text-museum hover:bg-violet"
              >
                {n} editions
              </button>
              <span className="text-ash">{editionLangs(a).join(" · ")}</span>
            </>
          ) : (
            <span className="text-ash">Single edition · {editionLangs(a)[0]}</span>
          )}
        </span>
      )}
      <AnimatePresence>{fan && <EditionsFan a={a} height={fan.h} dir={fan.dir} room={fan.room} onClose={() => setFan(null)} />}</AnimatePresence>
      {save && !a.remote && (
        <div className="pointer-events-none absolute right-2 top-2 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
          <SaveButton id={a.id} title={a.title} variant="icon" />
        </div>
      )}
    </figure>
  );
}
