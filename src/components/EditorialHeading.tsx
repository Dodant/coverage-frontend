"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT, DUR } from "./motion";

type Line = string | { text: string; className?: string };

type Props = {
  lines: Line[];
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  /** Animate when scrolled into view (default) or immediately on mount. */
  trigger?: "view" | "mount";
};

/**
 * Monumental heading with masked line reveals. Each line slides up from behind
 * its own clipping box, the way type is set into a page.
 */
export function EditorialHeading({ lines, as = "h2", className = "", lineClassName = "", delay = 0, stagger = 0.09, trigger = "view" }: Props) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  const animateProps = trigger === "mount" ? { animate: "show" } : { whileInView: "show", viewport: { once: true, margin: "-12% 0px" } };
  return (
    <Tag className={className} initial={reduce ? false : "hide"} {...animateProps}>
      {lines.map((l, i) => {
        const line = typeof l === "string" ? { text: l } : l;
        return (
          <span key={i} className="block overflow-hidden pb-[0.06em] -mb-[0.06em]">
            <motion.span
              className={`block will-change-transform ${lineClassName} ${line.className ?? ""}`}
              variants={{
                hide: { y: "108%", rotate: 2.5 },
                show: { y: "0%", rotate: 0, transition: { duration: DUR.text, ease: EASE_OUT, delay: delay + i * stagger } },
              }}
              style={{ transformOrigin: "0% 100%" }}
            >
              {line.text}
            </motion.span>
          </span>
        );
      })}
    </Tag>
  );
}

/** Generic fade-and-rise for blocks. */
export function Reveal({ children, className = "", delay = 0, y = 28, as = "div" }: { children: React.ReactNode; className?: string; delay?: number; y?: number; as?: "div" | "li" | "figure" | "p" }) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: DUR.art, ease: EASE_OUT, delay }}
    >
      {children}
    </Tag>
  );
}
