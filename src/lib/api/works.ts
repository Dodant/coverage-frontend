/**
 * Loading a work = one original book + its published translations (the public API has no
 * Work endpoint; other publishers' originals of the same work are not reachable — see docs).
 * Works on the server (direct to COVERAGE_API_ORIGIN) and in the browser (via the /api rewrite).
 */
import type { Artwork } from "../artworks";
import { ApiError } from "./client";
import { workFromBooks, parseRouteId, fromHit } from "./adapt";
import { browseBy, browseLatest, getOriginal, getTranslated, getTranslations } from "./endpoints";
import type { OriginalBookResponse, TranslatedBookResponse } from "./types";

export async function loadWork(id: string, revalidate = 120): Promise<Artwork | null> {
  const r = parseRouteId(id);
  if (!r) return null;
  try {
    if (r.kind === "TRANSLATED") {
      const t = await getTranslated(r.uuid, revalidate);
      const [o, ts] = await Promise.all([
        getOriginal(t.originalBookId, revalidate).catch(nullOn404),
        getTranslations(t.originalBookId, revalidate).catch(() => [] as TranslatedBookResponse[]),
      ]);
      return workFromBooks(t, o, ts.some((x) => x.id === t.id) ? ts : [...ts, t]);
    }
    const [o, ts] = await Promise.all([getOriginal(r.uuid, revalidate), getTranslations(r.uuid, revalidate).catch(() => [] as TranslatedBookResponse[])]);
    return workFromBooks(o, o, ts);
  } catch (e) {
    if (e instanceof ApiError && e.isNotFound) return null;
    throw e;
  }
}

function nullOn404(e: unknown): OriginalBookResponse | null {
  if (e instanceof ApiError && e.isNotFound) return null;
  throw e;
}

/** Run async jobs with a concurrency cap. */
export async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

/**
 * Newest works with full detail (cover size, colour, editions) — for the home page.
 * Search hits lack size and colour, so each hit is expanded with its book call.
 */
export async function loadLatestWorks(n = 36, revalidate = 300): Promise<Artwork[]> {
  const res = await browseLatest(0, Math.min(60, n), revalidate);
  const hits = res.items.map(fromHit).filter(Boolean) as Artwork[];
  const full = await pool(hits, 8, (h) => loadWork(h.id, revalidate).catch(() => null));
  return dedupeWorks(full.filter(Boolean) as Artwork[]);
}

/** Related works: same genre facet when known, else the newest. */
export async function loadRelated(a: Artwork, n = 8): Promise<Artwork[]> {
  try {
    const g = a.remote?.genreLabel;
    const res = g ? await browseBy("genre", g, 0, n + 4, 300) : await browseLatest(0, n + 4, 300);
    return (res.items.map(fromHit).filter(Boolean) as Artwork[]).filter((x) => x.id !== a.id && !a.editions.some((e) => e.key === x.id)).slice(0, n);
  } catch {
    return [];
  }
}

/** A translation and its original are the same work — keep one card per work (prefer the original). */
export function dedupeWorks(list: Artwork[]): Artwork[] {
  const seen = new Set<string>();
  const out: Artwork[] = [];
  for (const a of list) {
    const orig = a.editions.find((e) => e.kind === "original")?.bookId ?? a.remote?.bookId ?? a.id;
    if (seen.has(orig)) continue;
    seen.add(orig);
    out.push(a);
  }
  return out;
}
