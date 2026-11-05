"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { actions, useStore } from "@/lib/store";
import { EASE_OUT } from "./motion";
import type { Artwork } from "@/lib/artworks";
import { USE_API } from "@/lib/api/config";
import { CollectionPickerApi } from "./CollectionPickerApi";

/** "Add to exhibition" popover: toggle membership or start a new exhibition. */
export function CollectionPicker({ id, className = "", art }: { id: string; className?: string; art?: Artwork }) {
  if (USE_API && art?.remote) return <CollectionPickerApi art={art} className={className} />;
  return <LocalPicker id={id} className={className} />;
}

function LocalPicker({ id, className = "" }: { id: string; className?: string }) {
  const { collections } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const count = collections.filter((c) => c.ids.includes(id)).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", esc); };
  }, [open]);

  const note = (t: string) => { setFlash(t); window.setTimeout(() => setFlash(null), 1600); };

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="label inline-flex h-11 items-center gap-2 rounded-full border border-ink/80 px-5 hover:bg-ink hover:text-museum"
      >
        <span aria-hidden="true">＋</span> Exhibit · 전시에 추가 {count > 0 && <span className="rounded-full bg-lime px-1.5 text-ink">{count}</span>}
      </button>
      <AnimatePresence>
        {flash && (
          <motion.p key="flash" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="label absolute -top-7 left-0 whitespace-nowrap text-ink">
            {flash}
          </motion.p>
        )}
        {open && (
          <motion.div
            key="picker"
            role="dialog"
            aria-label="Add to exhibition"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="absolute bottom-[calc(100%+10px)] left-0 z-40 w-[min(20rem,85vw)] origin-bottom-left border border-ink bg-museum p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)]"
          >
            <p className="label mb-3 text-ash">Your exhibitions</p>
            {collections.length === 0 && <p className="kr mb-3 text-sm text-ash">아직 전시가 없습니다. 첫 전시를 열어 보세요.</p>}
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {collections.map((c) => {
                const on = c.ids.includes(id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => { actions.toggleInCollection(c.id, id); note(on ? `Removed from ${c.name}` : `Hung in ${c.name}`); }}
                      className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-violet"
                    >
                      <span className="kr truncate font-medium">{c.name}</span>
                      <span className={`flex size-5 shrink-0 items-center justify-center border ${on ? "border-ink bg-ink text-museum" : "border-ink/40"}`} aria-hidden="true">{on ? "✓" : ""}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <form
              className="mt-3 flex gap-2 border-t border-ink/15 pt-3"
              onSubmit={(e) => { e.preventDefault(); const c = actions.createCollection(name || "Untitled Exhibition", [id]); setName(""); note(`Opened “${c.name}”`); }}
            >
              <label className="sr-only" htmlFor={`new-col-${id}`}>New exhibition name</label>
              <input id={`new-col-${id}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="New exhibition…" className="kr h-10 min-w-0 flex-1 border-b border-ink/40 bg-transparent text-sm outline-none focus:border-ink" />
              <button type="submit" className="label h-10 bg-ink px-3 text-museum">Create</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
