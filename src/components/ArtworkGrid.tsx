"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Artwork } from "@/lib/artworks";
import { ArtworkCard } from "./ArtworkCard";
import { EASE_OUT } from "./motion";

// Every cover in a row shares one height; widths follow each cover's own proportions.
const ROW = {
  compact: { h: "clamp(7.5rem, 12vw, 11rem)", gap: "gap-x-3 gap-y-8 md:gap-x-5" },
  regular: { h: "clamp(11.5rem, 19vw, 17.5rem)", gap: "gap-x-5 gap-y-12 md:gap-x-8" },
  large: { h: "clamp(17rem, 30vw, 27rem)", gap: "gap-x-6 gap-y-16 md:gap-x-12" },
};
const COLS = ROW;
const SIZES = { compact: "(max-width:640px) 30vw, 12vw", regular: "(max-width:640px) 46vw, 18vw", large: "(max-width:640px) 92vw, 26vw" };

/** Covers stand in rows of equal height, like books on a shelf; proportions are never altered. */
export function ArtworkGrid({ works, density = "regular", stack = false }: { works: Artwork[]; density?: keyof typeof COLS; stack?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.ul layout={!reduce} className={`flex flex-wrap items-start ${ROW[density].gap}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        {works.map((a, i) => (
          <motion.li
            key={a.id}
            className="relative hover:z-30 focus-within:z-30"
            layout={reduce ? false : "position"}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
            transition={{ duration: 0.55, ease: EASE_OUT, delay: Math.min(i, 24) * 0.012 }}
          >
            <ArtworkCard a={a} sizes={SIZES[density]} caption={density === "compact" ? "none" : "hover"} stack={stack && density !== "compact"} rowHeight={ROW[density].h} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
