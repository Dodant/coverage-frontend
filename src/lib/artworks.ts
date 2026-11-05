export type Genre =
  | "fiction" | "poetry" | "children" | "picture" | "ya" | "nonfiction"
  | "essay" | "criticism" | "comics" | "periodical";

export type ColorFamily =
  | "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "violet" | "pink" | "light" | "dark";

/** One cover image of an edition (from the API: a BookCoverResponse). */
export interface CoverImage {
  coverId: string;
  thumb: string | null;
  full: string | null;
  /** May be null from the API — then the image's own natural size decides (never stretch). */
  w: number | null;
  h: number | null;
  label: string | null;
  variantType: string;
  ribbonStatus: string;
  usedFrom: string | null;
  likeCount: number;
  credits: { name: string; role: string; designerId: string }[];
  dominantColor: string | null;
}

/** One published edition of a work (원서 · 번역서 · 판). `cover` = an image is archived. */
export interface Edition {
  key: string;
  kind: "original" | "translation";
  lang: string | null;
  country: string | null;
  title: string | null;
  year: number | null;
  publisher: string | null;
  translator: string | null;
  format: string | null;
  cover: boolean;
  /** API data only: the book this edition is, its representative front cover, other front variants and back cover. */
  bookId?: string;
  bookKind?: "ORIGINAL" | "TRANSLATED";
  image?: CoverImage | null;
  variants?: CoverImage[];
  back?: CoverImage | null;
}

/**
 * An Artwork is one archived cover. In this dataset every work has exactly one archived
 * cover (the Changbi edition), so an Artwork also stands for its work; `editions` lists
 * every edition known for that work, archived or not.
 */
export interface Artwork {
  id: string;
  img: string;
  title: string;
  subtitle: string | null;
  credit: string;
  authors: string | null;
  illustrators: string[];
  translator: string | null;
  originalTitle: string | null;
  series: string | null;
  volume: string | null;
  genre: Genre;
  kind: string;
  imprint: string;
  year: number | null;
  month: number | null;
  format: string | null;
  pages: number | null;
  price: number | null;
  w: number;
  h: number;
  translated: boolean;
  editions: Edition[];
  language: string | null;
  country: string | null;
  palette: string[];
  key: string;
  hue: number;
  sat: number;
  light: number;
  family: ColorFamily;
  aurora: string[];
  /** API data only: where this artwork lives in the backend. */
  remote?: { kind: "ORIGINAL" | "TRANSLATED"; bookId: string; coverId: string | null; thumb: string | null; full: string | null; likeCount: number; genreLabel: string | null };
  /** Where the card links; defaults to `/artwork/{id}`. Collection items whose book is unknown use this. */
  href?: string;
  /** True when width/height are placeholders; the loaded image supplies the real ratio. */
  ratioUnknown?: boolean;
}

export const src = (a: Artwork, size: 640 | 1400 = 640) =>
  a.remote ? (size === 1400 ? a.remote.full ?? a.remote.thumb : a.remote.thumb ?? a.remote.full) ?? "" : `${a.img}-${size}.webp`;
export const srcSet = (a: Artwork) =>
  a.remote ? undefined : `${a.img}-640.webp 640w, ${a.img}-1400.webp ${Math.min(1400, a.w)}w`;

/** The image to show for an edition: its own archived cover (API), or the work's cover (mock). */
export function editionImage(a: Artwork, e: Edition, size: 640 | 1400 = 640): { url: string; w: number | null; h: number | null } | null {
  if (e.image) {
    const url = size === 1400 ? e.image.full ?? e.image.thumb : e.image.thumb ?? e.image.full;
    return url ? { url, w: e.image.w, h: e.image.h } : null;
  }
  if (e.cover && !a.remote) return { url: src(a, size), w: a.w, h: a.h };
  if (e.cover && a.remote) return { url: src(a, size), w: a.ratioUnknown ? null : a.w, h: a.ratioUnknown ? null : a.h };
  return null;
}

export const GENRES: Record<Genre, { en: string; kr: string }> = {
  fiction: { en: "Fiction", kr: "소설" },
  poetry: { en: "Poetry", kr: "시" },
  children: { en: "Children", kr: "어린이" },
  picture: { en: "Picture Books", kr: "그림책" },
  ya: { en: "Young Adult", kr: "청소년" },
  nonfiction: { en: "Nonfiction", kr: "인문·교양" },
  essay: { en: "Essays", kr: "산문" },
  criticism: { en: "Criticism", kr: "평론" },
  comics: { en: "Comics", kr: "만화" },
  periodical: { en: "Periodicals", kr: "잡지" },
};

export const FAMILIES: { id: ColorFamily; en: string; kr: string; swatch: string }[] = [
  { id: "red", en: "Vermilion", kr: "주홍", swatch: "#e5432f" },
  { id: "orange", en: "Amber", kr: "호박", swatch: "#ee8a3c" },
  { id: "yellow", en: "Saffron", kr: "치자", swatch: "#f0cf3a" },
  { id: "green", en: "Verdant", kr: "초록", swatch: "#3e9d5b" },
  { id: "cyan", en: "Lagoon", kr: "옥색", swatch: "#41b7c4" },
  { id: "blue", en: "Cobalt", kr: "쪽빛", swatch: "#345cff" },
  { id: "violet", en: "Violet", kr: "보라", swatch: "#643de8" },
  { id: "pink", en: "Rose", kr: "분홍", swatch: "#e769a4" },
  { id: "light", en: "Bone", kr: "백색", swatch: "#ece7da" },
  { id: "dark", en: "Ink", kr: "먹색", swatch: "#2a2830" },
];

export const auroraVars = (a: Artwork) => ({
  "--a1": a.aurora[0],
  "--a2": a.aurora[1],
  "--a3": a.aurora[2],
  "--a4": a.aurora[0],
  "--a5": a.aurora[1],
}) as React.CSSProperties;

/** Deterministic pseudo-random — stable across server & client renders. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function pick<T>(list: T[], n: number, seed: number) {
  const r = seeded(seed);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export const fmtDate = (a: Artwork) => (a.year ? `${a.year}${a.month ? "." + String(a.month).padStart(2, "0") : ""}` : "—");

export const LANG_LABEL: Record<string, { en: string; kr: string }> = {
  KO: { en: "Korean", kr: "한국어" }, EN: { en: "English", kr: "영어" }, ES: { en: "Spanish", kr: "스페인어" },
  FR: { en: "French", kr: "프랑스어" }, DE: { en: "German", kr: "독일어" }, JA: { en: "Japanese", kr: "일본어" },
  IT: { en: "Italian", kr: "이탈리아어" }, LZH: { en: "Classical Chinese", kr: "한문" },
};
export const archivedCount = (a: Artwork) => a.editions.filter((e) => e.cover).length;
export const editionLangs = (a: Artwork) => [...new Set(a.editions.map((e) => e.lang ?? "?"))];
/** Trim size in mm parsed from e.g. "122×188mm"; null when unknown or non-numeric (신국판 …). */
export const trimMm = (format: string | null): [number, number] | null => {
  const m = format?.match(/(\d{2,3})\s*[×x]\s*(\d{2,3})/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

/** The edition this artwork's own cover belongs to (the book being viewed). */
export const ownEdition = (a: Artwork): Edition =>
  a.editions.find((e) => a.remote && e.bookId === a.remote.bookId) ?? a.editions.find((e) => e.cover) ?? a.editions[a.editions.length - 1];
