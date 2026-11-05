/**
 * Map backend responses onto the view model the UI already renders (Artwork / Edition),
 * so every component works the same on mock and live data.
 */
import type { Artwork, CoverImage, Edition, Genre } from "../artworks";
import { auroraFrom, familyOf, hexToHsl } from "../color";
import type { BookCoverResponse, BrowseResultItem, OriginalBookResponse, SearchResultItem, TranslatedBookResponse } from "./types";

type Book = OriginalBookResponse | TranslatedBookResponse;
const isOriginal = (b: Book): b is OriginalBookResponse => "translationCount" in b;

/** Backend ids and share tokens are UUIDs; anything else never reaches the API as a path segment. */
export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Route id for a book: "o-<uuid>" (original) or "t-<uuid>" (translation). */
export const routeId = (kind: "ORIGINAL" | "TRANSLATED", uuid: string) => `${kind === "ORIGINAL" ? "o" : "t"}-${uuid}`;
export function parseRouteId(id: string): { kind: "ORIGINAL" | "TRANSLATED"; uuid: string } | null {
  const m = id.match(/^([ot])-(.+)$/);
  return m && isUuid(m[2]) ? { kind: m[1] === "o" ? "ORIGINAL" : "TRANSLATED", uuid: m[2] } : null;
}

/** Backend genres are free text (e.g. "소설", "Fiction"); bucket them into the UI's genres. */
export function genreOf(raw: string | null | undefined): Genre {
  const s = (raw ?? "").toLowerCase();
  if (/잡지|periodical|magazine/.test(s)) return "periodical";
  if (/그림책|picture/.test(s)) return "picture";
  if (/만화|comic|graphic/.test(s)) return "comics";
  if (/시|poetry|poem/.test(s) && !/시리즈/.test(s)) return "poetry";
  if (/청소년|young adult|\bya\b/.test(s)) return "ya";
  if (/동화|아동|어린이|children/.test(s)) return "children";
  if (/소설|fiction|novel|sf|판타지|fantasy|mystery/.test(s)) return "fiction";
  if (/산문|에세이|essay/.test(s)) return "essay";
  if (/평론|비평|criticism/.test(s)) return "criticism";
  return "nonfiction";
}

const LANG: Record<string, string> = { ko: "한국어", en: "영어", es: "스페인어", fr: "프랑스어", de: "독일어", ja: "일본어", it: "이탈리아어", zh: "중국어" };
const COUNTRY: Record<string, string> = { KR: "대한민국", US: "미국", GB: "영국", JP: "일본", FR: "프랑스", DE: "독일", ES: "스페인", IT: "이탈리아", CN: "중국", AR: "아르헨티나", CA: "캐나다", IE: "아일랜드", CH: "스위스", BE: "벨기에", CU: "쿠바" };
const countryName = (c: string | null) => (c ? COUNTRY[c.toUpperCase()] ?? c.toUpperCase() : null);

export function coverImage(c: BookCoverResponse | null | undefined): CoverImage | null {
  if (!c) return null;
  return {
    coverId: c.id,
    thumb: c.hidden ? null : c.thumbnailUrl,
    full: c.hidden ? null : c.imageUrl,
    w: c.width ?? null,
    h: c.height ?? null,
    label: c.label,
    variantType: c.variantType,
    ribbonStatus: c.ribbonStatus,
    usedFrom: c.usedFrom,
    likeCount: c.likeCount,
    credits: (c.credits ?? []).map((x) => ({ name: x.name, role: x.role, designerId: x.designerId })),
    dominantColor: c.dominantColor,
  };
}

function editionOf(b: Book): Edition {
  const front = coverImage(b.frontCover);
  // Every front variant, representative first; legacy rows may miss the representative in `covers`.
  const seen = new Set<string>();
  const variants = [b.frontCover, ...(b.covers ?? [])].filter((c) => c && !seen.has(c.id) && seen.add(c.id)).map((c) => coverImage(c)!);
  return {
    key: routeId(isOriginal(b) ? "ORIGINAL" : "TRANSLATED", b.id),
    kind: isOriginal(b) ? "original" : "translation",
    lang: (b.frontCover?.languageCode ?? b.languageCode ?? "").toUpperCase() || null,
    country: countryName(b.frontCover?.countryCode ?? b.countryCode),
    title: b.title,
    year: b.year,
    publisher: b.publisher?.name ?? null,
    translator: "translator" in b ? b.translator?.name ?? null : null,
    format: null,
    cover: Boolean(front?.thumb || front?.full),
    bookId: b.id,
    bookKind: isOriginal(b) ? "ORIGINAL" : "TRANSLATED",
    image: front,
    variants,
    back: coverImage(b.backCover),
  };
}

function colourFields(hex: string | null) {
  const key = hex ?? "#d9d5cb";
  const [h, s, l] = hexToHsl(key);
  return { key, hue: Math.round(h), sat: Math.round(s * 100) / 100, light: Math.round(l * 100) / 100, family: familyOf(key), aurora: auroraFrom(key), palette: hex ? [hex] : [] };
}

/**
 * A full work around one book: `primary` is the book being viewed, `original` and `translations`
 * are its siblings (other publishers' originals are not reachable through the public API).
 */
export function workFromBooks(primary: Book, original: OriginalBookResponse | null, translations: TranslatedBookResponse[]): Artwork {
  const kind = isOriginal(primary) ? "ORIGINAL" : "TRANSLATED";
  const front = coverImage(primary.frontCover);
  const editions: Edition[] = [];
  if (original) editions.push(editionOf(original));
  for (const t of [...translations].sort((x, y) => (x.year ?? 0) - (y.year ?? 0))) editions.push(editionOf(t));
  if (!editions.some((e) => e.bookId === primary.id)) editions.push(editionOf(primary));
  // Mark the viewed edition as "the" cover of this artwork.
  const ed = editions.map((e) => ({ ...e }));
  const genreLabel = original?.genre ?? (isOriginal(primary) ? primary.genre : null);
  const translated = kind === "TRANSLATED";
  return {
    id: routeId(kind, primary.id),
    img: "",
    title: primary.title,
    subtitle: null,
    credit: [primary.author?.name, "translator" in primary && primary.translator ? `${primary.translator.name} 옮김` : null].filter(Boolean).join(" · "),
    authors: primary.author?.name ?? null,
    illustrators: (primary.frontCover?.credits ?? []).filter((c) => c.role === "ILLUSTRATION").map((c) => c.name),
    translator: "translator" in primary ? primary.translator?.name ?? null : null,
    originalTitle: original ? original.originalTitle ?? original.title : "originalBookTitle" in primary ? primary.originalBookTitle : null,
    series: primary.series?.name ?? null,
    volume: primary.seriesNumber,
    genre: genreOf(genreLabel),
    kind: "단권",
    imprint: primary.publisher?.name ?? "—",
    year: primary.year,
    month: null,
    format: null,
    pages: null,
    price: null,
    w: front?.w ?? 2,
    h: front?.h ?? 3,
    ratioUnknown: !(front?.w && front?.h),
    translated,
    editions: ed,
    language: LANG[(primary.languageCode ?? "").toLowerCase()] ?? primary.languageCode,
    country: countryName(original?.countryCode ?? primary.countryCode),
    ...colourFields(primary.frontCover?.dominantColor ?? null),
    remote: {
      kind,
      bookId: primary.id,
      coverId: primary.frontCover?.id ?? null,
      thumb: front?.thumb ?? null,
      full: front?.full ?? null,
      likeCount: primary.frontCover?.likeCount ?? 0,
      genreLabel,
    },
  };
}

/** A light Artwork straight from a search/browse hit (no colour, no size until details load). */
export function fromHit(item: SearchResultItem | BrowseResultItem): Artwork | null {
  const m = item.id.match(/^(original|translated)_(.+)$/);
  if (!m) return null; // redesigns are out of scope for the archive grid
  const kind = m[1] === "original" ? "ORIGINAL" : "TRANSLATED";
  return {
    id: routeId(kind, m[2]),
    img: "",
    title: item.title ?? "—",
    subtitle: null,
    credit: item.author ?? "",
    authors: item.author,
    illustrators: [],
    translator: null,
    originalTitle: null,
    series: null,
    volume: null,
    genre: genreOf(item.genre),
    kind: "단권",
    imprint: item.publisher ?? "—",
    year: item.year,
    month: null,
    format: null,
    pages: null,
    price: null,
    w: 2,
    h: 3,
    ratioUnknown: true,
    translated: kind === "TRANSLATED",
    editions: [{ key: routeId(kind, m[2]), kind: kind === "ORIGINAL" ? "original" : "translation", lang: null, country: countryName(item.countryCode), title: item.title, year: item.year, publisher: item.publisher, translator: null, format: null, cover: Boolean(item.thumbnailUrl), bookId: m[2], bookKind: kind }],
    language: null,
    country: countryName(item.countryCode),
    ...colourFields(null),
    remote: { kind, bookId: m[2], coverId: null, thumb: item.thumbnailUrl, full: item.thumbnailUrl, likeCount: item.likeCount ?? 0, genreLabel: item.genre },
  };
}

/**
 * A collection item as an Artwork. Items carry only a cover id, so title and link come from what
 * this browser remembered when the cover was added (`known`); otherwise the card links to the archive.
 */
export function fromCover(c: BookCoverResponse, itemType: "ORIGINAL_COVER" | "TRANSLATED_COVER" | "REDESIGN", known: { workId: string; title: string } | null): Artwork {
  const kind = itemType === "TRANSLATED_COVER" ? "TRANSLATED" : "ORIGINAL";
  const img = coverImage(c)!;
  const parsed = known ? parseRouteId(known.workId) : null;
  const title = known?.title ?? c.label ?? "Archived cover · 표지";
  return {
    id: `c-${c.id}`,
    href: known ? `/artwork/${known.workId}` : "/archive",
    img: "",
    title,
    subtitle: null,
    credit: (c.credits ?? []).map((x) => x.name).join(" · ") || (c.copyrightHolder ?? ""),
    authors: null,
    illustrators: (c.credits ?? []).filter((x) => x.role === "ILLUSTRATION").map((x) => x.name),
    translator: null,
    originalTitle: null,
    series: null,
    volume: null,
    genre: "nonfiction",
    kind: "단권",
    imprint: c.copyrightHolder ?? "—",
    year: c.usedFrom ? Number(c.usedFrom.slice(0, 4)) : null,
    month: null,
    format: null,
    pages: null,
    price: null,
    w: c.width ?? 2,
    h: c.height ?? 3,
    ratioUnknown: !(c.width && c.height),
    translated: kind === "TRANSLATED",
    editions: [],
    language: null,
    country: countryName(c.countryCode),
    ...colourFields(c.dominantColor),
    remote: { kind, bookId: parsed?.uuid ?? "", coverId: c.id, thumb: img.thumb, full: img.full, likeCount: c.likeCount, genreLabel: null },
  };
}
