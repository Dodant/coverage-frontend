"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { EASE_OUT } from "./motion";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/archive", n: "01", en: "Archive", kr: "아카이브" },
  { href: "/#color", n: "02", en: "Colour", kr: "색의 세계" },
  { href: "/#discover", n: "03", en: "Discover", kr: "우연한 발견" },
  { href: "/collections", n: "04", en: "Exhibitions", kr: "나의 전시" },
];

export function SiteNav() {
  const path = usePathname();
  const { favorites, collections } = useStore();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      <header className={`glass-bar fixed inset-x-0 top-0 z-50 ${scrolled && !open ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
        <nav aria-label="Primary" className="wrap flex h-14 items-center justify-between gap-6 md:h-16">
          <Link href="/" className="display text-[19px] tracking-[-0.05em]" aria-label="COVERAGE home">
            COVER<span className="outline-text">AGE</span>
          </Link>
          <ul className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => {
              const active = path === l.href || (l.href !== "/" && !l.href.includes("#") && path.startsWith(l.href));
              return (
                <li key={l.href}>
                  <Link href={l.href} className="group flex items-baseline gap-1.5" aria-current={active ? "page" : undefined}>
                    <span className="label text-ash">{l.n}</span>
                    <span className={`font-[family-name:var(--font-grotesk)] text-[15px] font-medium tracking-[-0.02em] underline-offset-[6px] ${active ? "underline decoration-1" : "group-hover:underline decoration-1"}`}>
                      {l.en}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/collections#favorites" className="label hidden items-center gap-2 rounded-full border border-ink/70 px-3.5 py-2 hover:bg-ink hover:text-museum sm:flex">
              <span>Saved</span>
              <span className="tabular-nums">{String(favorites.length).padStart(2, "0")}</span>
              <span aria-hidden="true" className="text-ash">/</span>
              <span className="tabular-nums">{String(collections.length).padStart(2, "0")}</span>
              <span className="sr-only">favorites / exhibitions</span>
            </Link>
            <button
              type="button"
              className="label flex size-11 items-center justify-center rounded-full border border-ink/70 md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <span aria-hidden="true" className="relative block h-2.5 w-4">
                <span className={`absolute left-0 h-px w-4 bg-current transition-transform duration-300 ${open ? "top-1 rotate-45" : "top-0"}`} />
                <span className={`absolute left-0 h-px w-4 bg-current transition-transform duration-300 ${open ? "top-1 -rotate-45" : "top-2.5"}`} />
              </span>
            </button>
          </div>
        </nav>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-40 flex flex-col justify-end bg-paper px-[var(--gutter)] pb-10 pt-20"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            <ul className="space-y-1">
              {LINKS.map((l, i) => (
                <motion.li key={l.href} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 + i * 0.06, duration: 0.6, ease: EASE_OUT }}>
                  <Link href={l.href} onClick={() => setOpen(false)} className="flex items-baseline gap-3 border-b border-ink/15 py-2">
                    <span className="label text-ash">{l.n}</span>
                    <span className="display text-[clamp(3rem,15vw,5rem)]">{l.en}</span>
                    <span className="kr ml-auto text-sm text-ash">{l.kr}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
            <p className="label mt-8 text-ash">Saved {favorites.length} · Exhibitions {collections.length}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
