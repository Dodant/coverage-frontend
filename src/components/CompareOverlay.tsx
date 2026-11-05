"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Artwork } from "@/lib/artworks";
import { editionImage, trimMm } from "@/lib/artworks";
import { EditionPlaceholder } from "./EditionPlaceholder";
import { editionLabel } from "./EditionsRail";
import { useDialogFocus } from "./useDialogFocus";

/** Every edition of a work hung side by side at the same height, so only the design is compared. */
export function CompareOverlay({ a, onClose }: { a: Artwork; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useDialogFocus(root, close);
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); document.documentElement.style.overflow = prev; };
  }, [onClose]);

  const H = "56vh";
  const known = a.editions.map((e) => trimMm(e.format));
  const [missing, setMissing] = useState<Set<string>>(new Set()); // covers whose file failed to load


  return createPortal(
    <motion.div
      ref={root}
      role="dialog" aria-modal="true" aria-label={`Compare editions of ${a.title}`}
      className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-[#141217] text-snow"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
    >
      <div className="wrap flex w-full flex-wrap items-end justify-between gap-6 pt-6">
        <div>
          <p className="label opacity-70">Compare all editions · 판 비교 — {a.editions.length} editions</p>
          <h2 className="display mt-3 text-[clamp(2.4rem,6vw,5.5rem)] leading-[0.86]">Side <span className="serif-i font-normal">by side.</span></h2>
        </div>
        <div className="flex items-center gap-3">
          <button ref={close} type="button" onClick={onClose} className="label h-11 rounded-full bg-snow px-4 text-night">Close ✕</button>
        </div>
      </div>
      {/* The row centres itself with auto margins, which drop to 0 when it overflows — so the first edition stays reachable. */}
      <div className="wrap mt-10 flex w-full flex-1 items-end overflow-x-auto pb-4">
        <div className="mx-auto flex w-max items-end gap-[clamp(1rem,4vw,3.5rem)]">
        {a.editions.map((e, i) => {
          const mm = known[i];
          const im = missing.has(e.key) ? null : editionImage(a, e, 1400);
          return (
            <figure key={e.key} className="m-0 shrink-0">
              {im ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={im.url} alt={`${a.title} — ${editionLabel(e)}`} onError={() => setMissing((s) => new Set(s).add(e.key))} className="block max-w-none shadow-[0_30px_60px_-24px_rgb(0_0_0/0.8)]" style={{ height: H, width: "auto" }} />
              ) : (
                <EditionPlaceholder e={e} workTitle={a.title} tone="dark" style={{ height: H }} />
              )}
              <figcaption className="label mt-3 flex justify-between gap-6 text-[10.5px]">
                <span>{String(i + 1).padStart(2, "0")} · {e.kind === "original" ? "Original" : "Translation"}</span>
                <span className="opacity-65">{editionLabel(e)}{mm ? ` · ${mm[0]}×${mm[1]}` : ""}</span>
              </figcaption>
            </figure>
          );
        })}
        </div>
      </div>
      <p className="label wrap w-full pb-6 pt-4 opacity-60">
        모든 판을 같은 높이로 맞춰 표지 디자인만 비교합니다 · Esc to close
      </p>
    </motion.div>,
    document.body,
  );
}
