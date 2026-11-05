"use client";

/**
 * Collection items carry only a cover id, and the API has no cover → book lookup. When this
 * browser adds a cover we remember which work it came from, so the exhibition can link back.
 * Covers added elsewhere still render, just without a link and title.
 */
const KEY = "coverage:cover-index";
type Entry = { workId: string; title: string };

function read(): Record<string, Entry> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
export function rememberCover(coverId: string, workId: string, title: string) {
  try { const m = read(); m[coverId] = { workId, title }; localStorage.setItem(KEY, JSON.stringify(m)); } catch {}
}
export function lookupCover(coverId: string): Entry | null {
  return read()[coverId] ?? null;
}
