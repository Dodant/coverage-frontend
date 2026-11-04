"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "./motion";

type Props = {
  className?: string;
  delay?: number;
  /** "hero" = solid COVER + outlined AGE; "outline" = all outline; "solid" = all solid. */
  variant?: "hero" | "outline" | "solid";
  trigger?: "mount" | "view";
  as?: "h1" | "p" | "div";
};

const LETTERS = "COVERAGE".split("");

/** The COVERAGE wordmark — set as eight masked letters that rise into place. */
export function AnimatedWordmark({ className = "", delay = 0.25, variant = "hero", trigger = "mount", as = "h1" }: Props) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  const play = trigger === "mount" ? { animate: "show" } : { whileInView: "show", viewport: { once: true } };
  return (
    <Tag aria-label="COVERAGE" className={`display select-none whitespace-nowrap ${className}`} initial={reduce ? false : "hide"} {...play}>
      {LETTERS.map((l, i) => {
        const outline = variant === "outline" || (variant === "hero" && i >= 5);
        return (
          <span key={i} aria-hidden="true" className="inline-block overflow-hidden align-bottom" style={{ marginRight: i === 4 && variant === "hero" ? "0.02em" : undefined }}>
            <motion.span
              className={`inline-block ${outline ? "outline-text" : ""}`}
              variants={{
                hide: { y: "104%", skewY: 6 },
                show: { y: "0%", skewY: 0, transition: { duration: 1.05, ease: EASE_OUT, delay: delay + i * 0.055 } },
              }}
            >
              {l}
            </motion.span>
          </span>
        );
      })}
    </Tag>
  );
}
