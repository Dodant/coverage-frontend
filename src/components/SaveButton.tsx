"use client";

import { AnimatePresence, motion } from "motion/react";
import { actions, useStore } from "@/lib/store";
import { EASE_OUT } from "./motion";

export function HeartIcon({ filled, className = "" }: { filled?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
      <path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4Z" strokeLinejoin="round" />
    </svg>
  );
}

/** Favorite toggle with a small "saved" bloom as feedback. */
export function SaveButton({ id, title, className = "", variant = "chip" }: { id: string; title: string; className?: string; variant?: "chip" | "icon" }) {
  const { favorites } = useStore();
  const on = favorites.includes(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `${title} — 즐겨찾기에서 제거` : `${title} — 즐겨찾기에 저장`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); actions.toggleFavorite(id); }}
      className={`group/save relative inline-flex items-center justify-center gap-2 transition-colors duration-200 ${
        variant === "icon"
          ? "size-11 rounded-full bg-museum/90 text-ink shadow-[0_2px_10px_rgb(0_0_0/0.12)] backdrop-blur hover:bg-ink hover:text-museum"
          : "h-11 rounded-full border border-ink/80 px-5 label hover:bg-ink hover:text-museum"
      } ${on && variant === "icon" ? "!bg-coral !text-ink" : ""} ${className}`}
    >
      <span className="relative inline-flex">
        <motion.span key={String(on)} initial={{ scale: on ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 14 }} className="inline-flex">
          <HeartIcon filled={on} className="size-[18px]" />
        </motion.span>
        <AnimatePresence>
          {on && (
            <motion.span
              key="bloom"
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-coral"
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 2.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
            />
          )}
        </AnimatePresence>
      </span>
      {variant === "chip" && <span>{on ? "Saved · 저장됨" : "Save · 저장"}</span>}
    </button>
  );
}
