#!/usr/bin/env node
/**
 * A stand-in for coverage-backend, following docs/API_CONTRACT.md closely enough to develop and
 * test the frontend in API mode without Spring/Postgres/Elasticsearch.
 *
 *   npm run mock-api                  # http://localhost:4010/api
 *   COVERAGE_API_ORIGIN=http://localhost:4010 NEXT_PUBLIC_DATA_SOURCE=api npm run dev
 *
 * Data: src/data/artworks.json (the Changbi set). Each work becomes one original book plus its
 * translations; only the Changbi edition carries an image (from public/covers), the others are
 * hidden covers — like a real archive with gaps. State (users, likes, collections) is in memory.
 *
 * Reproduced quirks: 400 for wrong password / not owner / private collection, single-use refresh
 * tokens, blank search → empty, GET /collections/{id} needs a token, duplicate returns items: [].
 */
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, existsSync, createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT ?? 4010);
const ORIGIN = process.env.MOCK_PUBLIC_ORIGIN ?? `http://localhost:${PORT}`;
const ACCESS_TTL = Number(process.env.MOCK_ACCESS_TTL ?? 86400);
const artworks = JSON.parse(readFileSync(join(ROOT, "src/data/artworks.json"), "utf8"));

// ── Deterministic ids ─────────────────────────────────────────────────────
const uuid = (s) => {
  const h = createHash("sha1").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const now = () => new Date().toISOString();
const LANG = { KO: "ko", EN: "en", ES: "es", FR: "fr", DE: "de", JA: "ja", IT: "it", LZH: "zh" };
const COUNTRY = { 대한민국: "KR", 미국: "US", 영국: "GB", 일본: "JP", 프랑스: "FR", 독일: "DE", 스페인: "ES", 이탈리아: "IT", 중국: "CN", 아르헨티나: "AR", 캐나다: "CA", 아일랜드: "IE", 스위스: "CH", 벨기에: "BE", 쿠바: "CU" };
const GENRE = { fiction: "소설", poetry: "시", children: "동화", picture: "그림책", ya: "청소년", nonfiction: "인문", essay: "산문", criticism: "평론", comics: "만화", periodical: "잡지" };

// ── Catalogue ─────────────────────────────────────────────────────────────
const covers = new Map();
const originals = new Map();
const translated = new Map();
const docs = []; // search/browse documents

function cover(seed, a, { image, lang, country, year }) {
  const id = uuid(`cover:${seed}`);
  const c = {
    id,
    imageUrl: image ? `${ORIGIN}/files${a.img}-1400.webp` : null,
    thumbnailUrl: image ? `${ORIGIN}/files${a.img}-640.webp` : null,
    originalFileName: image ? `${a.id}.jpg` : "missing.jpg",
    width: image ? a.w : null,
    height: image ? a.h : null,
    fileSize: null,
    coverType: "FRONT",
    imageSource: image ? "PUBLISHER" : null,
    sourceUrl: null,
    sourceName: image ? "창비" : null,
    dominantColor: image ? a.key : null,
    layout: null,
    likeCount: 0,
    commentCount: 0,
    hidden: !image,
    createdAt: new Date(Date.UTC(year ?? 2000, (a.month ?? 1) - 1, 1)).toISOString(),
    label: null,
    printingFrom: 1,
    usedFrom: year ? `${year}-01-01` : null,
    countryCode: country,
    languageCode: lang,
    credits: image ? (a.illustrators ?? []).map((n) => ({ designerId: uuid(`designer:${n}`), name: n, role: "ILLUSTRATION" })) : [],
    tags: [],
    similarGroupId: null,
    variantType: "INITIAL",
    ribbonStatus: "UNKNOWN",
    copyrightHolder: image ? "창비" : null,
  };
  covers.set(id, c);
  return c;
}
const person = (name) => (name ? { id: uuid(`person:${name}`), name } : null);

for (const a of artworks) {
  const eds = a.editions?.length ? a.editions : [{ key: "own", kind: "original", lang: "KO", country: "대한민국", year: a.year, publisher: a.imprint, cover: true }];
  const orig = eds.find((e) => e.kind === "original") ?? eds[0];
  const isOwn = (e) => e.cover;
  const ocountry = COUNTRY[orig.country] ?? (orig.lang === "KO" ? "KR" : null);
  const olang = LANG[orig.lang] ?? "ko";
  const ofront = cover(`${a.id}:${orig.key}`, a, { image: isOwn(orig), lang: olang, country: ocountry, year: orig.year });
  const oid = uuid(`original:${a.id}`);
  const o = {
    id: oid,
    title: isOwn(orig) ? a.title : orig.title ?? a.originalTitle ?? a.title,
    originalTitle: a.originalTitle ?? orig.title ?? a.title,
    countryCode: ocountry,
    languageCode: olang,
    year: orig.year ?? a.year,
    genre: GENRE[a.genre] ?? null,
    isbn: isOwn(orig) && /^\d{13}$/.test(a.id) ? a.id : null,
    purchaseLinks: null,
    edition: null,
    author: person(a.authors),
    publisher: person(isOwn(orig) ? a.imprint : orig.publisher),
    series: person(a.series),
    seriesNumber: a.volume,
    workId: uuid(`work:${a.id}`),
    frontCover: ofront,
    backCover: null,
    covers: [ofront],
    status: "PUBLISHED",
    translationCount: 0,
    createdAt: ofront.createdAt,
    updatedAt: ofront.createdAt,
  };
  originals.set(oid, o);
  docs.push({ id: `original_${oid}`, type: "ORIGINAL", book: o, author: a.authors, credit: a.credit });
  for (const e of eds.filter((x) => x !== orig)) {
    const lang = LANG[e.lang] ?? "ko";
    const country = COUNTRY[e.country] ?? (e.lang === "KO" ? "KR" : null);
    const front = cover(`${a.id}:${e.key}`, a, { image: isOwn(e), lang, country, year: e.year });
    const tid = uuid(`translated:${a.id}:${e.key}`);
    const t = {
      id: tid,
      title: isOwn(e) ? a.title : e.title ?? o.title,
      countryCode: country,
      languageCode: lang,
      year: e.year,
      isbn: isOwn(e) && /^\d{13}$/.test(a.id) ? a.id : null,
      purchaseLinks: null,
      edition: null,
      originalBookId: oid,
      originalBookTitle: o.title,
      author: o.author,
      translator: person(isOwn(e) ? a.translator : e.translator),
      publisher: person(isOwn(e) ? a.imprint : e.publisher),
      series: isOwn(e) ? person(a.series) : null,
      seriesNumber: isOwn(e) ? a.volume : null,
      frontCover: front,
      backCover: null,
      covers: [front],
      status: "PUBLISHED",
      createdAt: front.createdAt,
      updatedAt: front.createdAt,
    };
    translated.set(tid, t);
    o.translationCount++;
    docs.push({ id: `translated_${tid}`, type: "TRANSLATED", book: t, author: a.authors, credit: a.credit, genre: o.genre });
  }
}
// Newest first, like the createdAt sort.
docs.sort((x, y) => y.book.createdAt.localeCompare(x.book.createdAt));

const item = (d, withDesigners) => ({
  id: d.id,
  type: d.type,
  title: d.book.title,
  thumbnailUrl: d.book.frontCover.thumbnailUrl,
  author: d.author ?? null,
  publisher: d.book.publisher?.name ?? null,
  ...(withDesigners ? { designers: d.book.frontCover.credits.map((c) => c.name) } : {}),
  year: d.book.year,
  countryCode: d.book.countryCode,
  genre: d.genre ?? d.book.genre ?? null,
  likeCount: d.book.frontCover.likeCount,
  createdAt: d.book.createdAt,
});

// ── State ─────────────────────────────────────────────────────────────────
const users = new Map(); // id → user
const byEmail = new Map();
const accessTokens = new Map(); // token → { userId, exp }
const refreshTokens = new Map(); // token → userId (single use)
const likes = new Set(); // `${userId}|${type}|${coverId}`
const collections = new Map();

function addUser({ email, password, displayName, role = "MEMBER" }) {
  const u = { id: randomUUID(), email, password, displayName, role, title: "MEMBER", websiteUrl: null, portfolioUrl: null, snsAccounts: {}, contributionCount: 0, createdAt: now(), lastLoginAt: null };
  users.set(u.id, u);
  byEmail.set(email.toLowerCase(), u);
  return u;
}
const demo = addUser({ email: "demo@coverage.test", password: "coverage123", displayName: "큐레이터" });
{
  const picks = docs.filter((d) => d.book.frontCover.thumbnailUrl).slice(3, 9);
  const c = {
    id: randomUUID(), name: "푸른 시간", description: "새벽빛을 닮은 표지들을 한 방에 걸었습니다.", visibility: "PUBLIC", shareToken: randomUUID(), ownerId: demo.id,
    items: picks.map((d, i) => ({ id: randomUUID(), itemType: d.type === "ORIGINAL" ? "ORIGINAL_COVER" : "TRANSLATED_COVER", itemId: d.book.frontCover.id, addedAt: new Date(Date.now() - (10 - i) * 6e4).toISOString() })),
    createdAt: now(), updatedAt: now(),
  };
  collections.set(c.id, c);
}

function issue(u) {
  const accessToken = `at.${randomUUID()}`;
  const refreshToken = `rt.${randomUUID()}`;
  accessTokens.set(accessToken, { userId: u.id, exp: Date.now() + ACCESS_TTL * 1000 });
  refreshTokens.set(refreshToken, u.id);
  return { accessToken, refreshToken, tokenType: "Bearer", expiresIn: ACCESS_TTL, user: { id: u.id, email: u.email, displayName: u.displayName, role: u.role } };
}
const profile = (u) => ({ id: u.id, email: u.email, displayName: u.displayName, role: u.role, title: u.title, websiteUrl: u.websiteUrl, portfolioUrl: u.portfolioUrl, snsAccounts: u.snsAccounts, contributionCount: u.contributionCount, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt });
const collectionView = (c) => ({ id: c.id, name: c.name, description: c.description, visibility: c.visibility, shareToken: c.shareToken, ownerId: c.ownerId, ownerName: users.get(c.ownerId)?.displayName ?? "—", items: c.items, itemCount: c.items.length, createdAt: c.createdAt, updatedAt: c.updatedAt });
const summary = (c) => ({ id: c.id, name: c.name, description: c.description, visibility: c.visibility, ownerId: c.ownerId, ownerName: users.get(c.ownerId)?.displayName ?? "—", itemCount: c.items.length, createdAt: c.createdAt });

// ── HTTP helpers ──────────────────────────────────────────────────────────
class HttpError extends Error {
  constructor(status, code, message, details = null) { super(message); Object.assign(this, { status, code, details }); }
}
const bad = (message, details = null) => new HttpError(400, "VALIDATION_ERROR", message, details);
const notFound = (resourceType, fieldValue) => new HttpError(404, "NOT_FOUND", `${resourceType}을(를) 찾을 수 없습니다`, { resourceType, fieldName: "id", fieldValue });
const unauthorized = () => new HttpError(401, "UNAUTHORIZED", "인증이 필요합니다");

function send(res, status, body) {
  if (body === undefined) { res.writeHead(status); return res.end(); }
  res.writeHead(status, { "Content-Type": "application/json;charset=UTF-8" });
  res.end(JSON.stringify(body));
}
function springPage(all, page, size) {
  const content = all.slice(page * size, page * size + size);
  const totalPages = Math.max(1, Math.ceil(all.length / size));
  const sort = { empty: false, sorted: true, unsorted: false };
  return { content, pageable: { pageNumber: page, pageSize: size, sort, offset: page * size, paged: true, unpaged: false }, last: page >= totalPages - 1, totalElements: all.length, totalPages, size, number: page, sort, first: page === 0, numberOfElements: content.length, empty: content.length === 0 };
}
async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw bad("요청 본문을 읽을 수 없습니다", { reason: "malformed JSON" }); }
}
function authUser(req, required) {
  const h = req.headers.authorization ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  const t = token ? accessTokens.get(token) : null;
  if (t && t.exp > Date.now()) return users.get(t.userId) ?? null;
  if (required) throw unauthorized();
  return null;
}
const int = (v, d) => (v === null || v === undefined || v === "" ? d : Number.parseInt(v, 10));

const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^/api${pattern.replace(/\{(\w+)\}/g, "(?<$1>[^/]+)")}$`), fn });

// ── Auth ──────────────────────────────────────────────────────────────────
route("POST", "/auth/signup", async (req) => {
  const b = await readJson(req);
  const errs = {};
  if (!b.email || !/^\S+@\S+\.\S+$/.test(b.email)) errs.email = "올바른 이메일 형식이어야 합니다";
  if (!b.password || b.password.length < 8) errs.password = "비밀번호는 8자 이상이어야 합니다";
  if (!b.displayName || b.displayName.length < 2 || b.displayName.length > 50) errs.displayName = "표시 이름은 2~50자여야 합니다";
  if (!b.role || b.role === "ADMIN") errs.role = "역할을 선택해 주세요";
  if (Object.keys(errs).length) throw bad("입력값이 올바르지 않습니다", errs);
  if (byEmail.has(b.email.toLowerCase())) throw bad("이미 사용 중인 이메일입니다", { email: "이미 사용 중인 이메일입니다" });
  return [201, issue(addUser(b))];
});
route("POST", "/auth/login", async (req) => {
  const b = await readJson(req);
  const u = byEmail.get(String(b.email ?? "").toLowerCase());
  if (!u || u.password !== b.password) throw bad("이메일 또는 비밀번호가 올바르지 않습니다");
  u.lastLoginAt = now();
  return [200, issue(u)];
});
route("POST", "/auth/refresh", async (req) => {
  const b = await readJson(req);
  const userId = refreshTokens.get(b.refreshToken);
  if (!userId) throw bad("유효하지 않은 리프레시 토큰입니다");
  refreshTokens.delete(b.refreshToken); // single use
  return [200, issue(users.get(userId))];
});
route("POST", "/auth/logout", async (req) => {
  const b = await readJson(req);
  refreshTokens.delete(b.refreshToken);
  return [200, undefined];
});

// ── Users ─────────────────────────────────────────────────────────────────
route("GET", "/users/me", async (req) => [200, profile(authUser(req, true))]);
route("PUT", "/users/me", async (req) => {
  const u = authUser(req, true);
  const b = await readJson(req);
  if (b.displayName !== undefined && b.displayName !== null) {
    if (b.displayName.length < 2 || b.displayName.length > 50) throw bad("입력값이 올바르지 않습니다", { displayName: "표시 이름은 2~50자여야 합니다" });
    u.displayName = b.displayName;
  }
  for (const k of ["websiteUrl", "portfolioUrl"]) {
    if (b[k] === undefined || b[k] === null) continue;
    if (b[k] && !/^https?:\/\//.test(b[k])) throw bad("입력값이 올바르지 않습니다", { [k]: "http(s) URL이어야 합니다" });
    u[k] = b[k] || null;
  }
  if (b.snsAccounts) u.snsAccounts = b.snsAccounts;
  return [200, profile(u)];
});

// ── Search & browse ───────────────────────────────────────────────────────
route("GET", "/search", async (_req, q) => {
  const query = (q.get("query") ?? "").trim().toLowerCase();
  const page = int(q.get("page"), 0), size = Math.min(int(q.get("size"), 20), 100);
  let hits = !query ? [] : docs.filter((d) => [d.book.title, d.book.originalTitle, d.book.originalBookTitle, d.author, d.credit, d.book.publisher?.name].some((s) => s && s.toLowerCase().includes(query)));
  const cc = q.get("countryCode"), lc = q.get("languageCode"), g = q.get("genre");
  const yf = int(q.get("yearFrom"), null), yt = int(q.get("yearTo"), null);
  if (cc) hits = hits.filter((d) => d.book.countryCode === cc.toUpperCase());
  if (lc) hits = hits.filter((d) => d.book.languageCode === lc.toLowerCase());
  if (g) hits = hits.filter((d) => (d.genre ?? d.book.genre) === g);
  if (yf !== null) hits = hits.filter((d) => (d.book.year ?? 0) >= yf);
  if (yt !== null) hits = hits.filter((d) => (d.book.year ?? 9999) <= yt);
  const sortBy = q.get("sortBy");
  if (sortBy === "YEAR_DESC") hits = [...hits].sort((x, y) => (y.book.year ?? 0) - (x.book.year ?? 0));
  if (sortBy === "YEAR_ASC") hits = [...hits].sort((x, y) => (x.book.year ?? 0) - (y.book.year ?? 0));
  if (sortBy === "NEWEST") hits = [...hits].sort((x, y) => y.book.createdAt.localeCompare(x.book.createdAt));
  if (sortBy === "LIKES") hits = [...hits].sort((x, y) => y.book.frontCover.likeCount - x.book.frontCover.likeCount);
  const items = hits.slice(page * size, page * size + size).map((d) => item(d, true));
  return [200, { items, totalCount: hits.length, facets: { countries: {}, years: {}, genres: {}, tags: {} }, page, size, totalPages: Math.ceil(hits.length / size), empty: items.length === 0 }];
});
function browse(category, categoryValue, list, q) {
  const page = int(q.get("page"), 0), size = int(q.get("size"), category === "latest" ? 24 : 20);
  if (category === "latest" && (size < 1 || size > 60)) throw bad("size는 1~60이어야 합니다");
  const items = list.slice(page * size, page * size + size).map((d) => item(d, false));
  return [200, { category, categoryValue, totalCount: list.length, items, page, size, totalPages: Math.ceil(list.length / size), empty: items.length === 0 }];
}
route("GET", "/search/browse/latest", async (_req, q) => browse("latest", "all", docs, q));
route("GET", "/search/browse/country/{v}", async (_req, q, p) => browse("country", p.v, docs.filter((d) => d.book.countryCode === p.v.toUpperCase()), q));
route("GET", "/search/browse/year/{v}", async (_req, q, p) => browse("year", p.v, docs.filter((d) => String(d.book.year) === p.v), q));
route("GET", "/search/browse/genre/{v}", async (_req, q, p) => browse("genre", p.v, docs.filter((d) => (d.genre ?? d.book.genre) === p.v), q));
route("GET", "/search/browse/tag/{v}", async (_req, q, p) => browse("tag", p.v, [], q));

// ── Books & covers ────────────────────────────────────────────────────────
route("GET", "/books/original/{id}", async (_req, _q, p) => { const b = originals.get(p.id); if (!b) throw notFound("OriginalBook", p.id); return [200, b]; });
route("GET", "/books/translated/{id}", async (_req, _q, p) => { const b = translated.get(p.id); if (!b) throw notFound("TranslatedBook", p.id); return [200, b]; });
route("GET", "/books/original/{id}/translations", async (_req, _q, p) => {
  if (!originals.has(p.id)) throw notFound("OriginalBook", p.id);
  return [200, [...translated.values()].filter((t) => t.originalBookId === p.id)];
});
route("GET", "/covers/{id}", async (_req, _q, p) => { const c = covers.get(p.id); if (!c) throw notFound("BookCover", p.id); return [200, c]; });

// ── Likes ─────────────────────────────────────────────────────────────────
const LIKE_TYPES = ["ORIGINAL_COVER", "TRANSLATED_COVER", "REDESIGN"];
const likeCount = (type, id) => [...likes].filter((k) => k.endsWith(`|${type}|${id}`)).length;
route("POST", "/likes/{type}/{id}", async (req, _q, p) => {
  const u = authUser(req, true);
  if (!LIKE_TYPES.includes(p.type)) throw bad("잘못된 값입니다", { parameterName: "targetType", allowedValues: LIKE_TYPES });
  const k = `${u.id}|${p.type}|${p.id}`;
  const liked = !likes.has(k);
  if (liked) likes.add(k); else likes.delete(k);
  const n = likeCount(p.type, p.id);
  const c = covers.get(p.id); if (c) c.likeCount = n;
  return [200, { liked, likeCount: n }];
});
route("GET", "/likes/{type}/{id}/status", async (req, _q, p) => {
  const u = authUser(req, true);
  return [200, { liked: likes.has(`${u.id}|${p.type}|${p.id}`), likeCount: likeCount(p.type, p.id) }];
});

// ── Collections ───────────────────────────────────────────────────────────
const VIS = ["PRIVATE", "PUBLIC", "LINK_ONLY"];
const own = (c, u) => { if (c.ownerId !== u.id) throw bad("컬렉션 소유자가 아닙니다"); };
const findCollection = (id) => { const c = collections.get(id); if (!c) throw notFound("Collection", id); return c; };
route("GET", "/collections/my", async (req, q) => {
  const u = authUser(req, true);
  const list = [...collections.values()].filter((c) => c.ownerId === u.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt)).map(summary);
  return [200, springPage(list, int(q.get("page"), 0), int(q.get("size"), 20))];
});
route("GET", "/collections/public", async (_req, q) => {
  const list = [...collections.values()].filter((c) => c.visibility === "PUBLIC").sort((x, y) => y.createdAt.localeCompare(x.createdAt)).map(summary);
  return [200, springPage(list, int(q.get("page"), 0), int(q.get("size"), 20))];
});
route("GET", "/collections/shared/{token}", async (_req, _q, p) => {
  const c = [...collections.values()].find((x) => x.shareToken === p.token && x.visibility !== "PRIVATE");
  if (!c) throw notFound("Collection", p.token);
  return [200, collectionView(c)];
});
route("POST", "/collections", async (req) => {
  const u = authUser(req, true);
  const b = await readJson(req);
  if (!b.name?.trim() || b.name.length > 100) throw bad("입력값이 올바르지 않습니다", { name: "이름은 1~100자여야 합니다" });
  if (b.description && b.description.length > 500) throw bad("입력값이 올바르지 않습니다", { description: "설명은 500자 이하여야 합니다" });
  const c = { id: randomUUID(), name: b.name, description: b.description ?? null, visibility: VIS.includes(b.visibility) ? b.visibility : "PRIVATE", shareToken: randomUUID(), ownerId: u.id, items: [], createdAt: now(), updatedAt: now() };
  collections.set(c.id, c);
  return [201, collectionView(c)];
});
route("GET", "/collections/{id}", async (req, _q, p) => {
  const u = authUser(req, true);
  const c = findCollection(p.id);
  if (c.visibility === "PRIVATE" && c.ownerId !== u.id) throw bad("비공개 컬렉션입니다");
  return [200, collectionView(c)];
});
route("PUT", "/collections/{id}", async (req, _q, p) => {
  const u = authUser(req, true);
  const c = findCollection(p.id); own(c, u);
  const b = await readJson(req);
  if (b.name !== undefined && b.name !== null) { if (!b.name.trim() || b.name.length > 100) throw bad("입력값이 올바르지 않습니다", { name: "이름은 1~100자여야 합니다" }); c.name = b.name; }
  if (b.description !== undefined && b.description !== null) { if (b.description.length > 500) throw bad("입력값이 올바르지 않습니다", { description: "설명은 500자 이하여야 합니다" }); c.description = b.description; }
  if (b.visibility) { if (!VIS.includes(b.visibility)) throw bad("잘못된 값입니다", { reason: "visibility" }); c.visibility = b.visibility; }
  c.updatedAt = now();
  return [200, collectionView(c)];
});
route("DELETE", "/collections/{id}", async (req, _q, p) => {
  const u = authUser(req, true);
  const c = findCollection(p.id); own(c, u);
  collections.delete(c.id);
  return [204, undefined];
});
route("POST", "/collections/{id}/items", async (req, _q, p) => {
  const u = authUser(req, true);
  const c = findCollection(p.id); own(c, u);
  const b = await readJson(req);
  if (!["ORIGINAL_COVER", "TRANSLATED_COVER", "REDESIGN"].includes(b.itemType) || !b.itemId) throw bad("입력값이 올바르지 않습니다", { itemType: "필수입니다" });
  if (c.items.some((i) => i.itemId === b.itemId && i.itemType === b.itemType)) throw bad("이미 컬렉션에 추가된 항목입니다");
  c.items.push({ id: randomUUID(), itemType: b.itemType, itemId: b.itemId, addedAt: now() });
  c.updatedAt = now();
  return [200, collectionView(c)];
});
route("DELETE", "/collections/{id}/items/{itemId}", async (req, _q, p) => {
  const u = authUser(req, true);
  const c = findCollection(p.id); own(c, u);
  const before = c.items.length;
  c.items = c.items.filter((i) => i.itemId !== p.itemId);
  if (c.items.length === before) throw notFound("CollectionItem", p.itemId);
  c.updatedAt = now();
  return [200, collectionView(c)];
});
route("POST", "/collections/{id}/duplicate", async (req, _q, p) => {
  const u = authUser(req, true);
  const src = findCollection(p.id);
  if (src.visibility === "PRIVATE" && src.ownerId !== u.id) throw bad("비공개 컬렉션입니다");
  const c = { ...src, id: randomUUID(), name: `${src.name} (복제)`, visibility: "PRIVATE", shareToken: randomUUID(), ownerId: u.id, items: src.items.map((i) => ({ ...i, id: randomUUID(), addedAt: i.addedAt })), createdAt: now(), updatedAt: now() };
  collections.set(c.id, c);
  return [201, { ...collectionView(c), items: [], itemCount: 0 }]; // backend quirk: the copy comes back empty
});

// ── Server ────────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  if (req.method === "GET" && url.pathname.startsWith("/files/covers/")) {
    const file = join(ROOT, "public", url.pathname.slice("/files".length));
    if (!file.startsWith(join(ROOT, "public", "covers")) || !existsSync(file)) return send(res, 404, { code: "NOT_FOUND", message: "file", timestamp: now() });
    res.writeHead(200, { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400" });
    return createReadStream(file).pipe(res);
  }
  const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
  if (!r) return send(res, 404, { code: "NOT_FOUND", message: `No handler for ${req.method} ${url.pathname}`, timestamp: now() });
  try {
    const [status, body] = await r.fn(req, url.searchParams, url.pathname.match(r.re).groups ?? {});
    send(res, status, body);
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { code: e.code, message: e.message, details: e.details, timestamp: now() });
    console.error(e);
    send(res, 500, { code: "INTERNAL_ERROR", message: "서버 오류", timestamp: now() });
  }
});
server.listen(PORT, () => {
  console.log(`mock coverage-backend on ${ORIGIN}/api — ${originals.size} originals, ${translated.size} translations, ${covers.size} covers`);
  console.log(`demo login: demo@coverage.test / coverage123`);
});
