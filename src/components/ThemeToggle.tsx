"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "coverage:theme";

const apply = (t: Theme) => { document.documentElement.dataset.theme = t; };

/** Light / dark switch. Follows the OS until the visitor picks one; the pick is remembered. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) ?? "light");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onOS = (e: MediaQueryListEvent) => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(KEY); } catch {}
      if (saved !== "light" && saved !== "dark") { const t = e.matches ? "dark" : "light"; apply(t); setTheme(t); }
    };
    mq.addEventListener("change", onOS);
    return () => mq.removeEventListener("change", onOS);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    setTheme(next);
    try { localStorage.setItem(KEY, next); } catch {}
  };

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      className={`relative flex size-11 items-center justify-center rounded-full border border-ink/70 transition-colors hover:bg-ink hover:text-museum ${className}`}
    >
      {/* A half-filled disc: light/dark at a glance, no emoji. */}
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] transition-transform duration-500" style={{ transform: dark ? "rotate(180deg)" : "none" }}>
        <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" />
      </svg>
    </button>
  );
}
