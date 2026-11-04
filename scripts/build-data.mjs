// Builds src/data/artworks.json from data/changbi-meta.json (curated Changbi press-kit covers).
// Run: npm run data
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const meta = JSON.parse(fs.readFileSync(path.join(root, "data/changbi-meta.json"), "utf8"));

// Original language / country for translated titles (editorial annotation).
const ORIGIN = {
  "20191202": ["영어", "영국"], "20200203": ["스페인어", "스페인"], "9788936438982": ["스페인어", "아르헨티나"],
  "9788936439064": ["영어", "미국"], "9788936439699": ["영어", "미국"], "9788936452438": ["영어", "미국"],
  "9788936456993": ["영어", "미국"], "9788936464233": ["프랑스어", "프랑스"], "9788936464295": ["독일어", "스위스"],
  "9788936464417": ["일본어", "일본"], "9788936464639": ["영어", "영국"], "9788936464684": ["영어", "아일랜드"],
  "9788936464882": ["스페인어", "쿠바"], "9788936472351": ["영어", "미국"], "9788936474423": ["영어", "미국"],
  "9788936477752": ["일본어", "일본"], "9788936477783": ["영어", "미국"], "9788936478681": ["영어", "영국"],
  "9788936480592": ["한문", null], "9788936482701": ["일본어", "일본"], "9788936486075": ["영어", "미국"],
  "9788936486105": ["영어", "영국"], "9788936486365": ["영어", null], "9791165701192": ["영어", "영국"],
  "9791165702953": ["영어", "캐나다"], "9791165703431": ["영어", "미국"], "9791189280413": ["이탈리아어", "이탈리아"],
  "9791189280420": ["영어", "미국"], "9791189280666": ["프랑스어", "캐나다"], "9791189280871": ["영어", "미국"],
  "9791189280994": ["일본어", "일본"], "9791191248616": ["프랑스어", "프랑스"], "9791191248883": ["프랑스어", "벨기에"],
  "indian.jpg": ["독일어", "독일"],
};

const LANG_CODE = { 한국어: "KO", 영어: "EN", 스페인어: "ES", 프랑스어: "FR", 독일어: "DE", 일본어: "JA", 이탈리아어: "IT", 한문: "LZH" };
const LANG_BY_CODE = Object.fromEntries(Object.entries(LANG_CODE).map(([k, v]) => [v, k]));

/**
 * Parse the press-release "원제" field into editions.
 * e.g. "Pájaros en la boca(2009)/Mouthful of Birds(2019, 영문판)" → original 2009 + English 2019.
 */
const parseOriginal = (raw) => {
  if (!raw) return [];
  return raw.split("/").map((part, i) => {
    const m = part.trim().match(/^(.*?)\s*\((\d{4})(?:,\s*([^)]*))?\)\s*$/);
    const title = (m ? m[1] : part).trim();
    const year = m ? Number(m[2]) : null;
    const note = m?.[3] ?? "";
    const lang = /영문/.test(note) ? "EN" : null;
    return { title, year, lang, primary: i === 0 };
  });
};

const hexToHsl = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
};
const hslToHex = (h, s, l) => {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return "#" + [f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, "0")).join("");
};

const chroma = (p) => p.hsl[1] * (1 - Math.abs(2 * p.hsl[2] - 1));
const family = (h, s, l) => {
  if (s < 0.2 || l < 0.1 || l > 0.94) return l > 0.55 ? "light" : "dark";
  if (h < 15 || h >= 340) return "red";
  if (h < 42) return "orange";
  if (h < 68) return "yellow";
  if (h < 160) return "green";
  if (h < 200) return "cyan";
  if (h < 255) return "blue";
  if (h < 295) return "violet";
  return "pink";
};

const cleanTitle = (t, series) => {
  const q = t.match(/『([^』]+)』/);
  if (q) return q[1].trim();
  let s = t.replace(/^\[[^\]]+\]\s*/, "").replace(/\((창비세계문학|청소년문고|성인)[^)]*\)/, "");
  const tail = s.match(/\(([^)]*)\)\s*$/);
  if (tail && ((series && tail[1].includes(series.replace(/\s+/g, " ").split(" ")[0])) || /\d+\s*$|^전\d/.test(tail[1]))) s = s.slice(0, tail.index);
  return s.trim();
};

const people = (credit, authors) => {
  const ill = [];
  const m = (authors || "").matchAll(/([^,]+?)\(그림\)/g);
  for (const x of m) ill.push(x[1].trim());
  const c = credit || "";
  const cm = c.match(/([^,·/]+?)\s*그림(?!책)/);
  if (!ill.length && cm && !/글[•·]그림/.test(c)) ill.push(cm[1].replace(/^.*\s(?=\S+$)/, "").trim());
  const both = c.match(/^(.+?)\s*글\s*[•·‧]\s*그림/);
  if (both) ill.push(both[1].trim());
  return [...new Set(ill)].filter(Boolean);
};

const out = meta.map((m) => {
  const pal = m.palette.map(([hex, w]) => ({ hex, w, hsl: hexToHsl(hex) }));
  const avgL = pal.reduce((a, p) => a + p.hsl[2] * p.w, 0) / pal.reduce((a, p) => a + p.w, 0);
  const vivid = [...pal]
    .filter((p) => p.hsl[2] > 0.12 && p.hsl[2] < 0.93)
    .sort((a, b) => chroma(b) * Math.sqrt(b.w) - chroma(a) * Math.sqrt(a.w));
  const key = vivid[0] ?? pal[0];
  const fam = chroma(key) < 0.12 ? (avgL > 0.55 ? "light" : "dark") : family(...key.hsl);
  // Aurora: 3 luminous hues derived from the most expressive palette colours.
  const src = (vivid.length ? vivid : pal).slice(0, 3);
  const aurora = src.map((p, i) => {
    const [h, s] = p.hsl;
    return hslToHex(h, s < 0.15 ? 0.12 : Math.min(0.9, s * 0.9 + 0.25), 0.62 + i * 0.06);
  });
  while (aurora.length < 3) aurora.push(aurora[0]);
  const year = Number((m.pubMonth || "").slice(0, 4)) || null;
  const translated = Boolean(m.originalTitle || m.translator || /옮김|옮/.test(m.credit || ""));
  const origin = translated ? ORIGIN[m.id] ?? [null, null] : ["한국어", "대한민국"];
  const year0 = Number((m.pubMonth || "").slice(0, 4)) || null;
  const parsed = parseOriginal(m.originalTitle);
  // Editions of the work. The Changbi Korean edition is the one archived cover;
  // other editions are known from the bibliographic data but have no image yet.
  const editions = [];
  if (translated) {
    const o = parsed.find((p) => p.primary);
    editions.push({
      key: "original", kind: "original", lang: LANG_CODE[origin[0]] ?? null, country: origin[1],
      title: o?.title ?? null, year: o?.year ?? null, publisher: null, translator: null, format: null, cover: false,
    });
    for (const p of parsed.filter((p) => !p.primary)) {
      editions.push({ key: `${(p.lang ?? "xx").toLowerCase()}-${p.year ?? "na"}`, kind: "translation", lang: p.lang, country: null, title: p.title, year: p.year, publisher: null, translator: null, format: null, cover: false });
    }
  }
  editions.push({
    key: `ko-${year0 ?? "na"}`, kind: translated ? "translation" : "original", lang: "KO", country: "대한민국",
    title: null, year: year0, publisher: m.imprint || "창비", translator: m.translator || null, format: m.format || null, cover: true,
  });
  return {
    id: m.id.replace(/[^A-Za-z0-9]+/g, "-").replace(/-jpg$/, ""),
    img: `/covers/${encodeURIComponent(m.id)}`,
    ...(() => {
      const t = cleanTitle(m.title, m.series);
      const sub = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      return sub ? { title: sub[1].trim(), subtitle: sub[2].trim() } : { title: t, subtitle: null };
    })(),
    credit: (m.credit || "").replace(/\s*\/\s*/g, " · ").trim() || m.authors || "",
    authors: m.authors,
    illustrators: people(m.credit, m.authors),
    translator: m.translator,
    originalTitle: parsed.find((p) => p.primary)?.title ?? null,
    series: m.series,
    volume: m.volume,
    genre: m.genre,
    kind: m.kind,
    imprint: m.imprint,
    year,
    month: Number((m.pubMonth || "").slice(5, 7)) || null,
    format: m.format,
    pages: m.pages,
    price: m.price,
    w: m.width,
    h: m.height,
    translated,
    editions,
    language: origin[0],
    country: origin[1],
    palette: m.palette.map(([hex]) => hex),
    key: key.hex,
    hue: Math.round(key.hsl[0]),
    sat: Math.round(key.hsl[1] * 100) / 100,
    light: Math.round(avgL * 100) / 100,
    family: fam,
    aurora,
  };
});

out.sort((a, b) => (b.year ?? 0) * 100 + (b.month ?? 0) - ((a.year ?? 0) * 100 + (a.month ?? 0)));
fs.mkdirSync(path.join(root, "src/data"), { recursive: true });
fs.writeFileSync(path.join(root, "src/data/artworks.json"), JSON.stringify(out));
void LANG_BY_CODE;
console.log("artworks:", out.length, "families:", Object.entries(out.reduce((a, x) => ((a[x.family] = (a[x.family] || 0) + 1), a), {})));
