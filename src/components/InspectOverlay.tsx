"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Artwork } from "@/lib/artworks";
import { src } from "@/lib/artworks";
import { useModalDialog } from "./useModalDialog";

/** Full-screen inspection: wheel / buttons / keys to zoom, drag to pan. */
export function InspectOverlay({ a, onClose }: { a: Artwork; onClose: () => void }) {
  const root = useRef<HTMLDialogElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const zoom = useCallback((d: number) => setScale((s) => { const n = Math.min(5, Math.max(1, +(s + d).toFixed(2))); if (n === 1) setPos({ x: 0, y: 0 }); return n; }), []);

  useModalDialog(root, closeBtn, onClose);
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") zoom(0.5);
      if (e.key === "-") zoom(-0.5);
      if (e.key === "0") { setScale(1); setPos({ x: 0, y: 0 }); }
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); document.documentElement.style.overflow = prev; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, [zoom]);

  return createPortal(
    <motion.dialog
      ref={root}
      role="dialog"
      aria-label={`Inspect ${a.title}`}
      className="modal open:flex flex-col bg-[#0d0c10] text-snow"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between gap-4 px-[var(--gutter)] py-4">
        <p className="label truncate"><span className="kr normal-case tracking-normal">{a.title}</span> — inspection · {Math.round(scale * 100)}%</p>
        <div className="flex items-center gap-1">
          <button type="button" className="label size-11 rounded-full border border-snow/30 hover:bg-snow hover:text-night" onClick={() => zoom(-0.5)} aria-label="Zoom out">−</button>
          <button type="button" className="label size-11 rounded-full border border-snow/30 hover:bg-snow hover:text-night" onClick={() => zoom(0.5)} aria-label="Zoom in">+</button>
          <button type="button" className="label h-11 rounded-full border border-snow/30 px-4 hover:bg-snow hover:text-night" onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }}>Fit</button>
          <button
            type="button"
            className="label hidden h-11 rounded-full border border-snow/30 px-4 hover:bg-snow hover:text-night sm:block"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : root.current?.requestFullscreen?.())?.catch?.(() => {})}
          >
            Fullscreen
          </button>
          <button ref={closeBtn} type="button" className="label h-11 rounded-full bg-snow px-4 text-night" onClick={onClose}>Close ✕</button>
        </div>
      </div>
      <div
        className={`relative flex-1 touch-none overflow-hidden ${scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        onWheel={(e) => zoom(e.deltaY < 0 ? 0.25 : -0.25)}
        onDoubleClick={() => (scale > 1 ? (setScale(1), setPos({ x: 0, y: 0 })) : setScale(2.5))}
        onPointerDown={(e) => { if (scale <= 1) return; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; }}
        onPointerMove={(e) => { const d = drag.current; if (d) setPos({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }); }}
        onPointerUp={() => (drag.current = null)}
        onClick={(e) => { if (scale === 1 && e.detail === 1 && e.target === e.currentTarget) onClose(); }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src(a, 1400)}
          alt={`${a.title} 표지 확대`}
          draggable={false}
          className="absolute left-1/2 top-1/2 max-h-[calc(100%-3rem)] max-w-[calc(100%-2rem)] select-none"
          style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`, transition: drag.current ? "none" : "transform 0.35s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </div>
      <p className="label px-[var(--gutter)] py-3 text-snow/50">Scroll or +/− to zoom · drag to pan · double-click to toggle · Esc to close</p>
    </motion.dialog>,
    document.body,
  );
}
