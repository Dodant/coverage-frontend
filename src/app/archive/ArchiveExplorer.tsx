"use client";

import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ARTWORKS, FAMILIES, GENRES, type ColorFamily, type Genre } from "@/lib/artworks";
import { useStore } from "@/lib/store";
import { ArchiveFilters, DEFAULT_FILTERS, SortAndDensity, type FilterState } from "@/components/ArchiveFilters";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { EditorialHeading } from "@/components/EditorialHeading";
import { EASE_OUT } from "@/components/motion";

const norm = (s: string) => s.toLowerCase().normalize("NFC");

export function ArchiveExplorer() {
  const params = useSearchParams();
  const { favorites } = useStore();
  const [f, setF] = useState<FilterState>(() => ({
    ...DEFAULT_FILTERS,
    genres: (params.get("genre")?.split(",").filter((g) => g in GENRES) as Genre[]) ?? [],
    colors: (params.get("color")?.split(",").filter((c) => FAMILIES.some((x) => x.id === c)) as ColorFamily[]) ?? [],
    q: params.get("q") ?? "",
  }));
  const [open, setOpen] = useState(() => Boolean(params.get("genre") || params.get("color")));
  const set = (p: Partial<FilterState>) => setF((s) => ({ ...s, ...p }));
  const q = useDeferredValue(f.q);

  useEffect(() => {
    const u = new URLSearchParams();
    if (f.genres.length) u.set("genre", f.genres.join(","));
    if (f.colors.length) u.set("color", f.colors.join(","));
    if (f.q) u.set("q", f.q);
    const s = u.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [f.genres, f.colors, f.q]);

  const works = useMemo(() => {
    const nq = norm(q.trim());
    const list = ARTWORKS.filter((a) => {
      if (f.genres.length && !f.genres.includes(a.genre)) return false;
      if (f.colors.length && !f.colors.includes(a.family)) return false;
      if (f.imprint && a.imprint !== f.imprint) return false;
      if (f.edition === "original" && a.translated) return false;
      if (f.edition === "translated" && !a.translated) return false;
      if (f.country && a.country !== f.country) return false;
      if (f.lang && !a.editions.some((e) => e.lang === f.lang)) return false;
      if (a.year && (a.year < Math.min(f.from, f.to) || a.year > Math.max(f.from, f.to))) return false;
      if (f.favOnly && !favorites.includes(a.id)) return false;
      if (nq) {
        const hay = norm([a.title, a.subtitle, a.credit, a.series, a.originalTitle, a.translator, a.illustrators.join(" "), GENRES[a.genre].en, GENRES[a.genre].kr, a.id].filter(Boolean).join(" "));
        if (!nq.split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const by = {
      newest: (a: (typeof list)[0], b: (typeof list)[0]) => (b.year ?? 0) * 13 + (b.month ?? 0) - ((a.year ?? 0) * 13 + (a.month ?? 0)),
      oldest: (a: (typeof list)[0], b: (typeof list)[0]) => (a.year ?? 0) * 13 + (a.month ?? 0) - ((b.year ?? 0) * 13 + (b.month ?? 0)),
      title: (a: (typeof list)[0], b: (typeof list)[0]) => a.title.localeCompare(b.title, "ko"),
      hue: (a: (typeof list)[0], b: (typeof list)[0]) => (a.sat < 0.15 ? 400 : a.hue) - (b.sat < 0.15 ? 400 : b.hue),
      light: (a: (typeof list)[0], b: (typeof list)[0]) => b.light - a.light,
      chroma: (a: (typeof list)[0], b: (typeof list)[0]) => b.sat - a.sat,
    }[f.sort];
    return [...list].sort(by);
  }, [f, q, favorites]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of ARTWORKS) c[`g:${a.genre}`] = (c[`g:${a.genre}`] ?? 0) + 1;
    return c;
  }, []);
  const active = f.genres.length + f.colors.length + (f.imprint ? 1 : 0) + (f.edition !== "all" ? 1 : 0) + (f.country ? 1 : 0) + (f.lang ? 1 : 0) + (f.from !== DEFAULT_FILTERS.from || f.to !== DEFAULT_FILTERS.to ? 1 : 0);

  return (
    <div className="wrap pb-[var(--section-y)] pt-24 md:pt-28">
      <header className="grid grid-cols-12 items-end gap-x-[var(--gutter)]">
        <div className="col-span-12 md:col-span-8">
          <p className="label mb-6 text-ash">Archive — 아카이브 / Collection I, Changbi</p>
          <EditorialHeading as="h1" trigger="mount" lines={["Archive"]} className="display text-[length:var(--fs-mega)] leading-[0.8]" />
        </div>
        <div className="col-span-12 mt-6 flex items-end justify-between md:col-span-4 md:mt-0 md:justify-end md:gap-6">
          <p className="display outline-text text-[clamp(3.5rem,8vw,8rem)] leading-[0.8] tabular-nums" aria-live="polite" aria-label={`${works.length} ${f.unit}`}>
            {String(works.length).padStart(3, "0")}
          </p>
          <p className="label pb-2 text-ash">of {ARTWORKS.length}<br />{f.unit === "works" ? "works · 작품" : "covers · 표지"}</p>
        </div>
      </header>

      <div className="glass-bar is-scrolled sticky top-14 z-30 -mx-[var(--gutter)] mt-12 px-[var(--gutter)] py-3 md:top-16">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="relative flex min-w-[min(100%,22rem)] flex-1 items-center">
            <span className="sr-only">Search the archive</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute left-0 size-5" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
            <input
              type="search"
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search title, author, illustrator, series…  제목·저자·시리즈 검색"
              className="kr h-11 w-full border-b border-ink/40 bg-transparent pl-8 text-[15px] outline-none placeholder:text-ash/80 focus:border-ink"
            />
          </label>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="archive-filters"
            onClick={() => setOpen((o) => !o)}
            className="label inline-flex h-9 items-center gap-2 rounded-full border border-ink px-4 hover:bg-ink hover:text-museum"
          >
            Filters {active > 0 && <span className="rounded-full bg-lime px-1.5 text-ink">{active}</span>}
            <span aria-hidden="true" className={`transition-transform duration-300 ${open ? "rotate-45" : ""}`}>+</span>
          </button>
          <SortAndDensity f={f} set={set} />
          {(active > 0 || f.q || f.favOnly) && (
            <button type="button" onClick={() => setF({ ...DEFAULT_FILTERS, density: f.density, sort: f.sort, unit: f.unit })} className="label underline underline-offset-4 hover:text-coral">
              Reset
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="archive-filters"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="max-h-[60vh] overflow-y-auto pb-3 pt-4"><ArchiveFilters f={f} set={set} counts={counts} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-14">
        {works.length ? (
          <ArtworkGrid works={works} density={f.density} stack={f.unit === "works"} />
        ) : (
          <div className="py-24 text-center">
            <p className="serif-i text-[clamp(2rem,5vw,4rem)]">Nothing on these walls — yet.</p>
            <p className="kr mt-3 text-ash">조건에 맞는 표지가 없습니다. 필터를 조정해 보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
