import data from "@/data/artworks.json";
import type { Artwork } from "./artworks";

// The bundled Changbi set (mock-data mode). Kept apart from artworks.ts so the pure helpers there
// never pull this JSON into the browser in API mode: import it only from mock-mode code.

export const ARTWORKS = data as Artwork[];
export const BY_ID = new Map(ARTWORKS.map((a) => [a.id, a]));
export const getArtwork = (id: string) => BY_ID.get(id);
export const indexOf = (id: string) => ARTWORKS.findIndex((a) => a.id === id);
/** Catalogue number — stable, museum-style. */
export const catNo = (a: Artwork) => `CVG–${String(indexOf(a.id) + 1).padStart(4, "0")}`;

export const IMPRINTS = [...new Set(ARTWORKS.map((a) => a.imprint))];
export const YEARS = [...new Set(ARTWORKS.map((a) => a.year).filter(Boolean) as number[])].sort();
export const COUNTRIES = [...new Set(ARTWORKS.map((a) => a.country).filter(Boolean) as string[])];

export const related = (a: Artwork, n = 8) => {
  const score = (b: Artwork) =>
    (b.series && b.series === a.series ? 5 : 0) +
    (b.genre === a.genre ? 2 : 0) +
    (b.family === a.family ? 2 : 0) +
    (Math.abs((b.year ?? 0) - (a.year ?? 0)) <= 1 ? 1 : 0) -
    Math.min(Math.abs(b.hue - a.hue), 360 - Math.abs(b.hue - a.hue)) / 120;
  return ARTWORKS.filter((b) => b.id !== a.id).sort((x, y) => score(y) - score(x)).slice(0, n);
};

export const EDITION_LANGS = [...new Set(ARTWORKS.flatMap((a) => a.editions.map((e) => e.lang)).filter(Boolean) as string[])];
