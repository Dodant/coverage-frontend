"use client";

import { FAMILIES, GENRES, COUNTRIES, IMPRINTS, YEARS, EDITION_LANGS, LANG_LABEL, type ColorFamily, type Genre } from "@/lib/artworks";

export type Sort = "newest" | "oldest" | "title" | "hue" | "light" | "chroma";
export type Density = "compact" | "regular" | "large";
export type Unit = "works" | "covers";
export interface FilterState {
  q: string;
  genres: Genre[];
  colors: ColorFamily[];
  imprint: string;
  edition: "all" | "original" | "translated";
  country: string;
  lang: string;
  from: number;
  to: number;
  favOnly: boolean;
  sort: Sort;
  density: Density;
  unit: Unit;
}
export const DEFAULT_FILTERS: FilterState = {
  q: "", genres: [], colors: [], imprint: "", edition: "all", country: "", lang: "", from: YEARS[0], to: YEARS[YEARS.length - 1], favOnly: false, sort: "newest", density: "regular", unit: "works",
};

const SORTS: { id: Sort; label: string }[] = [
  { id: "newest", label: "Newest" }, { id: "oldest", label: "Oldest" }, { id: "title", label: "Title 가나다" },
  { id: "hue", label: "Hue" }, { id: "light", label: "Lightness" }, { id: "chroma", label: "Chroma" },
];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Chip({ on, onClick, children, swatch }: { on: boolean; onClick: () => void; children: React.ReactNode; swatch?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors duration-200 ${on ? "border-ink bg-ink text-museum" : "border-ink/25 hover:border-ink"}`}
    >
      {swatch && <span className="size-3 rounded-full ring-1 ring-black/10" style={{ background: swatch }} />}
      {children}
    </button>
  );
}

const selectCls = "h-10 w-full appearance-none rounded-none border-b border-ink/40 bg-transparent pr-6 text-sm outline-none focus:border-ink";

export function ArchiveFilters({ f, set, counts }: { f: FilterState; set: (p: Partial<FilterState>) => void; counts: Record<string, number> }) {
  return (
    <div className="grid gap-x-[var(--gutter)] gap-y-8 border-t border-ink/20 pt-6 md:grid-cols-12">
      <fieldset className="md:col-span-5">
        <legend className="label mb-3 text-ash">Genre · 장르</legend>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(GENRES) as Genre[]).map((g) => (
            <Chip key={g} on={f.genres.includes(g)} onClick={() => set({ genres: toggle(f.genres, g) })}>
              {GENRES[g].en} <span className="kr text-[11px] opacity-60">{GENRES[g].kr}</span>
              <span className="label opacity-50">{counts[`g:${g}`] ?? 0}</span>
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="md:col-span-4">
        <legend className="label mb-3 text-ash">Colour · 색</legend>
        <div className="flex flex-wrap gap-1.5">
          {FAMILIES.map((c) => (
            <Chip key={c.id} swatch={c.swatch} on={f.colors.includes(c.id)} onClick={() => set({ colors: toggle(f.colors, c.id) })}>
              {c.en}
            </Chip>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:col-span-3">
        <label className="block">
          <span className="label text-ash">Publisher</span>
          <select className={selectCls} value={f.imprint} onChange={(e) => set({ imprint: e.target.value })}>
            <option value="">All imprints</option>
            {IMPRINTS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label text-ash">Edition</span>
          <select className={selectCls} value={f.edition} onChange={(e) => set({ edition: e.target.value as FilterState["edition"] })}>
            <option value="all">All</option>
            <option value="original">Korean originals</option>
            <option value="translated">Translations</option>
          </select>
        </label>
        <label className="block">
          <span className="label text-ash">Country of origin</span>
          <select className={selectCls} value={f.country} onChange={(e) => set({ country: e.target.value })}>
            <option value="">Anywhere</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label text-ash">Any edition in</span>
          <select className={selectCls} value={f.lang} onChange={(e) => set({ lang: e.target.value })}>
            <option value="">Any language</option>
            {EDITION_LANGS.map((l) => <option key={l} value={l}>{LANG_LABEL[l]?.en ?? l} · {LANG_LABEL[l]?.kr ?? ""}</option>)}
          </select>
        </label>
        <div>
          <span className="label text-ash" id="year-label">Year</span>
          <div className="flex items-center gap-1" aria-labelledby="year-label">
            <select aria-label="From year" className={selectCls} value={f.from} onChange={(e) => set({ from: +e.target.value })}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-ash">–</span>
            <select aria-label="To year" className={selectCls} value={f.to} onChange={(e) => set({ to: +e.target.value })}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SortAndDensity({ f, set }: { f: FilterState; set: (p: Partial<FilterState>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div role="radiogroup" aria-label="Show" className="flex rounded-full border border-ink p-[3px]">
        {([["works", "Works · 작품별"], ["covers", "Every cover · 표지별"]] as [Unit, string][]).map(([u, l]) => (
          <button key={u} role="radio" aria-checked={f.unit === u} onClick={() => set({ unit: u })} className={`label h-8 rounded-full px-3 transition-colors ${f.unit === u ? "bg-ink text-museum" : "hover:bg-ink/10"}`}>
            {l}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <span className="label text-ash">Sort</span>
        <select className="h-9 appearance-none border-b border-ink/40 bg-transparent pr-2 text-sm outline-none focus:border-ink" value={f.sort} onChange={(e) => set({ sort: e.target.value as Sort })}>
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <div role="radiogroup" aria-label="Grid density" className="flex items-center gap-1">
        <span className="label mr-1 text-ash">Density</span>
        {(["compact", "regular", "large"] as Density[]).map((d, i) => (
          <button
            key={d}
            role="radio"
            aria-checked={f.density === d}
            aria-label={d}
            onClick={() => set({ density: d })}
            className={`flex size-9 items-center justify-center rounded-full transition-colors ${f.density === d ? "bg-ink text-museum" : "hover:bg-ink/10"}`}
          >
            <span aria-hidden="true" className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${[4, 3, 2][i]}, 1fr)` }}>
              {Array.from({ length: [8, 6, 4][i] }).map((_, k) => <span key={k} className="block bg-current" style={{ width: [3, 4, 6][i], height: [4, 5, 8][i] }} />)}
            </span>
          </button>
        ))}
      </div>
      <button type="button" aria-pressed={f.favOnly} onClick={() => set({ favOnly: !f.favOnly })} className={`label inline-flex h-9 items-center gap-2 rounded-full border px-3.5 ${f.favOnly ? "border-coral bg-coral" : "border-ink/30 hover:border-ink"}`}>
        ♥ Saved only
      </button>
    </div>
  );
}
