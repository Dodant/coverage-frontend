"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Artwork } from "@/lib/artworks";
import { browseBy, browseLatest, getTranslated, search } from "@/lib/api/endpoints";
import { fromHit } from "@/lib/api/adapt";
import { ApiError } from "@/lib/api/client";
import type { SortOption } from "@/lib/api/types";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { EditorialHeading } from "@/components/EditorialHeading";

type Facet = "latest" | "country" | "year" | "genre";
type Density = "compact" | "regular" | "large";
const PAGE = 30;
const LANGS = ["ko", "en", "ja", "zh", "fr", "de", "es", "it"];
const SORTS: { id: SortOption; label: string }[] = [
  { id: "RELEVANCE", label: "Relevance" }, { id: "NEWEST", label: "Newest" }, { id: "LIKES", label: "Most liked" },
  { id: "YEAR_DESC", label: "Year ↓" }, { id: "YEAR_ASC", label: "Year ↑" },
];

/**
 * Archive on live data.
 * - With a query: full-text search, with country/language/year/genre filters and a sort.
 * - Without one: the backend can only browse by one facet at a time (search needs a query),
 *   so the filters become a single "browse by" choice.
 * Works mode shows one card per work: an original stands for its work; a translation shows only
 * when its original isn't already on the page (search hits are per book, and the archive's own
 * cover is often a translation). Every-cover mode shows originals and translations separately.
 */
const originOf = new Map<string, Promise<string | null>>();
const originalIdOf = (translatedUuid: string) => {
  let p = originOf.get(translatedUuid);
  if (!p) { p = getTranslated(translatedUuid, 600).then((t) => t.originalBookId).catch(() => null); originOf.set(translatedUuid, p); }
  return p;
};

export function ArchiveExplorerApi() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const dq = useDeferredValue(q.trim());
  const [facet, setFacet] = useState<Facet>((params.get("by") as Facet) || "latest");
  const [facetValue, setFacetValue] = useState(params.get("v") ?? "");
  const [country, setCountry] = useState("");
  const [lang, setLang] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [genre, setGenre] = useState(params.get("genre") ?? "");
  const [sortBy, setSortBy] = useState<SortOption>("RELEVANCE");
  const [unit, setUnit] = useState<"works" | "covers">("works");
  const [density, setDensity] = useState<Density>("regular");

  const [items, setItems] = useState<Artwork[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const key = JSON.stringify({ dq, facet, facetValue, country, lang, yearFrom, yearTo, genre, sortBy });

  const fetchPage = useCallback(async (p: number) => {
    const id = ++reqId.current;
    setLoading(true); setError(null);
    try {
      const res = dq
        ? await search({
            query: dq, countryCode: country || undefined, languageCode: lang || undefined,
            yearFrom: yearFrom ? Number(yearFrom) : undefined, yearTo: yearTo ? Number(yearTo) : undefined,
            genre: genre || undefined, sortBy, page: p, size: PAGE,
          })
        : facet !== "latest" && facetValue.trim()
          ? await browseBy(facet, facetValue.trim(), p, PAGE)
          : await browseLatest(p, PAGE);
      if (id !== reqId.current) return;
      const next = (res.items as Parameters<typeof fromHit>[0][]).map(fromHit).filter(Boolean) as Artwork[];
      setItems((prev) => {
        const all = p === 0 ? next : [...prev, ...next];
        const seen = new Set<string>();
        return all.filter((a) => !seen.has(a.id) && seen.add(a.id));
      });
      setTotal(res.totalCount);
      setPages(res.totalPages);
      setPage(p);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof ApiError ? (e.status === 0 ? "백엔드에 연결할 수 없습니다 · Can't reach the backend" : `${e.message}`) : "Something went wrong");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setItems([]); fetchPage(0); }, [fetchPage]);

  // Infinite scroll.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !loading && page + 1 < pages) fetchPage(page + 1); }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [fetchPage, loading, page, pages]);

  // translated book uuid → its original's uuid ("" while unknown or unresolvable)
  const [origins, setOrigins] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (unit !== "works") return;
    let live = true;
    for (const a of items) {
      const r = a.remote;
      if (r?.kind !== "TRANSLATED" || r.bookId in origins) continue;
      originalIdOf(r.bookId).then((o) => live && setOrigins((m) => ({ ...m, [r.bookId]: o })));
    }
    return () => { live = false; };
  }, [items, unit]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    if (unit === "covers") return items;
    // Group hits by work (= original book id), keep the page order of each work's first hit,
    // and let the work be represented by a hit that actually has a cover image.
    const workOf = (a: Artwork) => (a.remote?.kind === "TRANSLATED" ? origins[a.remote.bookId] || `t:${a.remote.bookId}` : a.remote?.bookId ?? a.id);
    const groups = new Map<string, Artwork[]>();
    for (const a of items) {
      if (a.remote?.kind === "TRANSLATED" && !(a.remote.bookId in origins)) continue; // resolving — avoids a duplicate flashing in
      const k = workOf(a);
      groups.set(k, [...(groups.get(k) ?? []), a]);
    }
    return [...groups.values()].map((g) => g.find((a) => a.remote?.thumb) ?? g[0]);
  }, [items, unit, origins]);
  const hiddenTranslations = unit === "works" ? items.length - shown.length : 0;

  const input = "h-10 w-full border-b border-ink/40 bg-transparent text-sm outline-none focus:border-ink";
  const pill = (on: boolean) => `label inline-flex h-9 items-center rounded-full px-3.5 ${on ? "bg-ink text-museum" : "border border-ink/30 hover:border-ink"}`;

  return (
    <div className="wrap pb-[var(--section-y)] pt-24 md:pt-28">
      <header className="grid grid-cols-12 items-end gap-x-[var(--gutter)]">
        <div className="col-span-12 md:col-span-8">
          <p className="label mb-6 text-ash">Archive — 아카이브 / Live</p>
          <EditorialHeading as="h1" trigger="mount" lines={["Archive"]} className="display text-[length:var(--fs-mega)] leading-[0.8]" />
        </div>
        <div className="col-span-12 mt-6 flex items-end justify-between md:col-span-4 md:mt-0 md:justify-end md:gap-6">
          <p className="display outline-text text-[clamp(3.5rem,8vw,8rem)] leading-[0.8] tabular-nums" aria-live="polite">
            {total === null ? "···" : String(total).padStart(3, "0")}
          </p>
          <p className="label pb-2 text-ash">{dq ? "results" : "books"}<br />{unit === "works" ? "works · 작품" : "covers · 표지"}</p>
        </div>
      </header>

      <div className="glass-bar is-scrolled sticky top-14 z-30 -mx-[var(--gutter)] mt-12 px-[var(--gutter)] py-3 md:top-16">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="relative flex min-w-[min(100%,22rem)] flex-1 items-center">
            <span className="sr-only">Search the archive</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute left-0 size-5" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, author, publisher, designer, ISBN…  제목·저자·출판사 검색" className="kr h-11 w-full border-b border-ink/40 bg-transparent pl-8 text-[15px] outline-none placeholder:text-ash/80 focus:border-ink" />
          </label>
          <div role="radiogroup" aria-label="Show" className="flex rounded-full border border-ink p-[3px]">
            {(["works", "covers"] as const).map((u) => (
              <button key={u} role="radio" aria-checked={unit === u} onClick={() => setUnit(u)} className={`label h-8 rounded-full px-3 ${unit === u ? "bg-ink text-museum" : "hover:bg-ink/10"}`}>
                {u === "works" ? "Works · 작품별" : "Every cover · 표지별"}
              </button>
            ))}
          </div>
          {dq && (
            <label className="flex items-center gap-2">
              <span className="label text-ash">Sort</span>
              <select className="h-9 appearance-none border-b border-ink/40 bg-transparent pr-2 text-sm outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          )}
          <div role="radiogroup" aria-label="Grid density" className="flex items-center gap-1">
            {(["compact", "regular", "large"] as Density[]).map((d) => (
              <button key={d} role="radio" aria-checked={density === d} onClick={() => setDensity(d)} className={`label h-9 rounded-full px-3 ${density === d ? "bg-ink text-museum" : "hover:bg-ink/10"}`}>{d[0].toUpperCase()}</button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-ink/15 pt-3">
          {dq ? (
            <>
              <label className="w-28"><span className="label text-ash">Country</span><input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))} placeholder="KR" className={input} /></label>
              <label className="w-36"><span className="label text-ash">Language</span>
                <select value={lang} onChange={(e) => setLang(e.target.value)} className={input}>
                  <option value="">Any</option>{LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
              </label>
              <label className="w-24"><span className="label text-ash">From</span><input inputMode="numeric" value={yearFrom} onChange={(e) => setYearFrom(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1990" className={input} /></label>
              <label className="w-24"><span className="label text-ash">To</span><input inputMode="numeric" value={yearTo} onChange={(e) => setYearTo(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2026" className={input} /></label>
              <label className="w-40"><span className="label text-ash">Genre</span><input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="소설" className={input} /></label>
            </>
          ) : (
            <>
              <div role="radiogroup" aria-label="Browse by" className="flex flex-wrap items-center gap-1.5">
                <span className="label mr-1 text-ash">Browse</span>
                {(["latest", "genre", "country", "year"] as Facet[]).map((f) => (
                  <button key={f} role="radio" aria-checked={facet === f} onClick={() => setFacet(f)} className={pill(facet === f)}>
                    {{ latest: "Latest · 최신", genre: "Genre · 장르", country: "Country · 나라", year: "Year · 연도" }[f]}
                  </button>
                ))}
              </div>
              {facet !== "latest" && (
                <label className="w-44">
                  <span className="sr-only">{facet}</span>
                  <input
                    autoFocus
                    value={facetValue}
                    onChange={(e) => setFacetValue(facet === "country" ? e.target.value.toUpperCase().slice(0, 2) : facet === "year" ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value)}
                    placeholder={{ genre: "소설", country: "KR", year: "2024", latest: "" }[facet]}
                    className={input}
                  />
                </label>
              )}
              <p className="label text-ash">검색어를 넣으면 여러 조건을 함께 걸 수 있습니다 · type a query to combine filters</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-14">
        {error ? (
          <div className="py-24 text-center">
            <p className="serif-i text-[clamp(2rem,5vw,4rem)]">The archive is out of reach.</p>
            <p className="kr mt-3 text-ash">{error}</p>
            <button type="button" onClick={() => fetchPage(0)} className="label mt-6 rounded-full border border-ink px-5 py-3 hover:bg-ink hover:text-museum">Try again</button>
          </div>
        ) : shown.length ? (
          <ArtworkGrid works={shown} density={density} stack={unit === "works"} />
        ) : loading ? (
          <div aria-busy="true" className="flex flex-wrap gap-6">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-[clamp(11.5rem,19vw,17.5rem)] w-[calc(clamp(11.5rem,19vw,17.5rem)*0.667)] animate-pulse bg-ink/10" />)}
          </div>
        ) : (
          <div className="py-24 text-center">
            <p className="serif-i text-[clamp(2rem,5vw,4rem)]">Nothing on these walls — yet.</p>
            <p className="kr mt-3 text-ash">{hiddenTranslations ? `번역서 ${hiddenTranslations}권은 ‘표지별’ 보기에서 보입니다.` : "조건에 맞는 표지가 없습니다."}</p>
          </div>
        )}
        <div ref={sentinel} className="h-px" />
        {loading && shown.length > 0 && <p className="label mt-10 text-center text-ash">Loading…</p>}
        {!loading && page + 1 < pages && (
          <div className="mt-12 text-center"><button type="button" onClick={() => fetchPage(page + 1)} className="label rounded-full border border-ink px-5 py-3 hover:bg-ink hover:text-museum">Load more</button></div>
        )}
      </div>
    </div>
  );
}
