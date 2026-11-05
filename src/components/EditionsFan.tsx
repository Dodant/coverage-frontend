"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { Artwork, Edition } from "@/lib/artworks";
import { editionImage, ownEdition } from "@/lib/artworks";
import { EditionPlaceholder } from "./EditionPlaceholder";
import { EASE_OUT } from "./motion";

export const GAP = 10;
export const PAD = 10;
export const PLACEHOLDER_RATIO = 2 / 3;
/** Beyond this many editions the fan shows the first ones plus a "+N" tile into Compare. */
const MAX_SHOWN = 12;
/** The fan never grows wider than this many cover-widths; past it, covers overlap like a hand of cards. */
export const MAX_SPAN_IN_COVERS = 5.5;

/**
 * Hovering a work deals every one of its editions out of the stack — side by side,
 * all at the height of the hovered cover, each at its own true proportions.
 * The hovered (archived) cover stays put; the others slide out from behind it.
 *
 * Few editions → laid out in a row with gaps.
 * Many editions → the row is compressed so covers overlap; the one under the pointer lifts forward.
 * Very many → the first ones plus a "+N more" tile that opens Compare.
 */
export function EditionsFan({ a, height, dir, room, onClose }: { a: Artwork; height: number; dir: 1 | -1; room: number; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  // The archived cover stays exactly over the card; the others deal out from behind it.
  // Dealt leftwards, the fan reads chronologically left → right (original first).
  const own = ownEdition(a);
  const others = a.editions.filter((e) => e !== own);
  const all: Edition[] = [own, ...(dir === -1 ? [...others].reverse() : others)];
  const overflow = all.length > MAX_SHOWN ? all.length - (MAX_SHOWN - 1) : 0;
  const shown = overflow ? all.slice(0, MAX_SHOWN - 1) : all;
  type Item = { kind: "edition"; e: Edition } | { kind: "more"; n: number };
  const items: Item[] = [...shown.map((e) => ({ kind: "edition" as const, e })), ...(overflow ? [{ kind: "more" as const, n: overflow }] : [])];

  const ratioOf = (e: Edition) => { const im = editionImage(a, e); return im ? (im.w && im.h ? im.w / im.h : PLACEHOLDER_RATIO) : PLACEHOLDER_RATIO; };
  const widthOf = (it: Item) => height * (it.kind === "more" ? 0.36 : ratioOf(it.e));
  const natural = items.reduce((s, it) => s + widthOf(it), 0) + GAP * (items.length - 1);
  // `room` = space from the card's anchored edge to the viewport edge on the dealing side.
  const maxW = Math.max(widthOfOwn(), Math.min(room - PAD * 2, height * PLACEHOLDER_RATIO * MAX_SPAN_IN_COVERS));
  function widthOfOwn() { return height * ratioOf(own) * 1.6; }
  const compressed = natural > maxW;

  // Left edge of each item, measured from the anchored side.
  const lefts: number[] = [];
  if (!compressed) {
    let acc = 0;
    for (const it of items) { lefts.push(acc); acc += widthOf(it) + GAP; }
  } else {
    // Overlap the edition covers; a "+N" tile, if any, sits clear of the hand at the far end.
    const moreW = overflow ? widthOf(items[items.length - 1]) + GAP : 0;
    const eds = items.length - (overflow ? 1 : 0);
    const lastEd = widthOf(items[eds - 1]);
    const step = (maxW - moreW - lastEd) / Math.max(1, eds - 1);
    for (let i = 0; i < eds; i++) lefts.push(i * step);
    if (overflow) lefts.push(maxW - moreW + GAP);
  }
  const span = compressed ? maxW : natural;

  const label = (e: Edition) => `${e.kind === "original" ? "Original · " : ""}${e.lang ?? "??"} · ${e.year ?? "—"}`;
  const focus = hover !== null && items[hover]?.kind === "edition" ? (items[hover] as { e: Edition }).e : null;
  const [missing, setMissing] = useState<Set<string>>(new Set()); // covers whose file failed to load


  return (
    <motion.div
      role="dialog"
      aria-label={`${a.title} — ${a.editions.length} editions`}
      className="absolute top-0 z-40"
      style={{ [dir === 1 ? "left" : "right"]: -PAD, top: -PAD }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="rounded-[3px] shadow-[0_24px_60px_-24px_rgb(0_0_0/0.45)] ring-1 ring-ink/10"
        style={{ padding: PAD, background: "color-mix(in srgb, var(--c-museum) 92%, transparent)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)" }}
      >
        <ul className="relative" style={{ width: span, height: height + (compressed ? 0 : 22) }} onPointerLeave={() => setHover(null)}>
          {items.map((it, i) => {
            const w = widthOf(it);
            const im = it.kind === "edition" && !missing.has(it.e.key) ? editionImage(a, it.e) : null;
            const pos = { [dir === 1 ? "left" : "right"]: lefts[i] } as React.CSSProperties;
            const lifted = compressed && hover === i;
            const z = lifted ? 200 : i === 0 ? 150 : it.kind === "more" ? 140 : items.length - i;
            const from = reduce || i === 0 ? false : { x: -lefts[i] * dir, opacity: 0.6, rotate: 2 * dir };
            return (
              <motion.li
                key={it.kind === "edition" ? it.e.key : "more"}
                className="absolute top-0"
                style={{ ...pos, width: w, zIndex: z }}
                initial={from}
                animate={{ x: 0, opacity: 1, rotate: 0, y: lifted ? -10 : 0, scale: lifted ? 1.04 : 1 }}
                transition={{ duration: lifted || hover !== null ? 0.22 : 0.5, ease: EASE_OUT, delay: hover === null ? Math.min(i, 10) * 0.04 : 0 }}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
              >
                {compressed && i > 0 && it.kind === "edition" && (
                  // In the overlapped hand only a strip of each cover shows — label that strip.
                  <span
                    aria-hidden="true"
                    className={`label pointer-events-none absolute top-2 z-10 text-[9px] text-ink/80 [writing-mode:vertical-rl] ${dir === 1 ? "right-1.5" : "left-1.5 rotate-180"}`}
                  >
                    {it.e.lang ?? "??"} · {it.e.year ?? "—"}
                  </span>
                )}
                {it.kind === "edition" ? (
                  <Link href={it.e === own ? `/artwork/${a.id}` : `/artwork/${a.id}?edition=${it.e.key}`} className="block outline-offset-2" onClick={onClose} aria-label={`${a.title} — ${label(it.e)}`}>
                    {im ? (
                      // Height fixed, width from the image's own proportions — never stretched.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={im.url} alt="" onError={() => setMissing((s) => new Set(s).add(it.e.key))} className="block max-w-none shadow-[0_6px_14px_-6px_rgb(0_0_0/0.35)]" style={{ height, width: "auto" }} />
                    ) : (
                      <div className="bg-museum shadow-[0_6px_14px_-6px_rgb(0_0_0/0.25)]">
                        <EditionPlaceholder e={it.e} workTitle={a.title} size="sm" style={{ height }} />
                      </div>
                    )}
                    {!compressed && <span className="label mt-1.5 block truncate text-[10px]">{label(it.e)}</span>}
                  </Link>
                ) : (
                  <Link
                    href={`/artwork/${a.id}?compare=1`}
                    onClick={onClose}
                    className="label flex flex-col items-center justify-center gap-1 bg-ink text-center text-[10px] text-museum hover:bg-violet"
                    style={{ height }}
                  >
                    <span className="display text-[1.6rem] normal-case tracking-[-0.04em]">+{it.n}</span>
                    <span>more ·<br />compare all</span>
                  </Link>
                )}
              </motion.li>
            );
          })}
        </ul>
        {compressed && (
          <p className="label mt-2 flex justify-between gap-4 text-[10px]" aria-live="polite">
            <span className="truncate">{focus ? label(focus) : `${a.editions.length} editions — point to inspect`}</span>
            <span className="shrink-0 text-ash">{focus?.title ?? ""}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}
