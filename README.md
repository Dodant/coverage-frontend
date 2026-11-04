# coverage-frontend

COVERAGE 사용자용 웹 (북커버 디자인 아카이브: 원서·번역서 표지 비교, 리디자인, 소셜).
An experimental digital museum of book cover art — *Every Cover Is a World.*

- 백엔드 API: [coverage-backend](https://github.com/Dodant/coverage-backend) (`/api`, Swagger `/api/swagger-ui.html`)
- 관리자 화면: [coverage-backoffice](https://github.com/Dodant/coverage-backoffice)
- 백엔드에 CORS 설정이 없으므로 같은 출처에서 `/api`를 백엔드로 넘기거나(개발 서버 프록시) 백엔드에 CORS를 추가해야 한다 — `COVERAGE_API_ORIGIN=http://localhost:8080 npm run dev` 로 실행하면 `next.config.ts`의 rewrite가 `/api/*`를 백엔드로 넘긴다.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Next.js 15.5 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion 12. Fonts are self-hosted from npm (Space Grotesk, Instrument Serif, IBM Plex Mono, Pretendard Variable), so builds need no network.

## Pages

| Route | What it is |
|---|---|
| `/` | Hero (wordmark, aurora, floating covers) → Featured Exhibition → Archive index → A World of Colour → Unexpected Discoveries → Private Exhibitions → The Art Beyond the Story |
| `/archive` | Search, genre / colour / publisher / edition / country / year filters, sort, density, saved-only. Filters sync to `?genre=&color=&q=` |
| `/artwork/[id]` | Viewing room: palette-reactive aurora, museum label, palette, save, add to exhibition, zoom/pan inspection + fullscreen, related, prev/next (← → keys). Statically generated for every cover |
| `/collections`, `/collections/[id]` | Private exhibitions (mock: `localStorage`; API: account): create, rename, delete, curator's note, remove; Wall / Shelf / Salon views. API mode adds visibility + share link and `/c/[token]` |
| `/login`, `/signup`, `/account` | API mode only |

## Design system

- Tokens: `src/app/globals.css` (`@theme` colours & fonts, fluid type scale, grain opacity, shadows, motion durations, registered `--a1…--a5` aurora colour properties so palettes interpolate).
- `AuroraBackground` — composited radial "clouds" drifting on 22–35s cycles; colours come from CSS variables, so the viewing room re-tints by setting variables only (no filter repaints). Presets: `dawn`, `nocturne`, `lagoon`, `ember`, `reactive`.
- `FilmGrainOverlay` — one static SVG `feTurbulence` tile shifted with a stepped transform. The page-wide layer sits **beneath** content; grain never touches archived artwork.
- `EditorialHeading`, `AnimatedWordmark`, `ArtworkCard`, `ArtworkGrid`, `ArtworkViewer`, `ArchiveFilters`, `ExhibitionSection`, `CollectionGallery`, `Magnetic`, `SaveButton`, `CollectionPicker`, `InspectOverlay`.
- Archive → viewing room uses the View Transitions API (`src/lib/transition.ts`) as a shared-element morph; falls back to normal navigation. `prefers-reduced-motion` disables ambient motion and transitions.

## Data

`src/data/artworks.json` is generated from `data/changbi-meta.json` (271 covers curated from `../changbi-press`, Changbi Publishers press materials) by `npm run data`. Images are pre-sized WebP in `public/covers/{id}-640.webp` / `-1400.webp`.

Fields such as dominant colour, colour family and aurora palette are computed. Original language / country for translated titles is a hand-written editorial annotation in `scripts/build-data.mjs`. Cover designer is not present in the press data and is shown as "Not recorded".

**Rights:** these are real Changbi covers. Confirm display permission with Changbi before any public deployment.

## Live data (coverage-backend)

Two data sources, picked at build time:

| `NEXT_PUBLIC_DATA_SOURCE` | Data | Accounts, likes, exhibitions |
|---|---|---|
| `mock` (default) | `src/data/artworks.json` | `localStorage` only |
| `api` | coverage-backend via `/api` | backend (JWT login) |

```bash
# real backend on :8080 (no CORS there, so Next proxies /api → backend)
COVERAGE_API_ORIGIN=http://localhost:8080 NEXT_PUBLIC_DATA_SOURCE=api npm run dev

# no backend? a contract-following stand-in with the Changbi set
npm run mock-api   # :4010 · demo@coverage.test / coverage123
npm run dev:api    # = COVERAGE_API_ORIGIN=http://localhost:4010 NEXT_PUBLIC_DATA_SOURCE=api next dev
```

`COVERAGE_API_ORIGIN` is read on the server too (SSR fetches go straight to `${origin}/api`), so set it for `next build` / `next start` as well. Contract: `docs/API_CONTRACT.md`; types: `src/lib/api/types.ts`.

Code: `src/lib/api/` — `client.ts` (fetch wrapper, `ApiError`, one retry after 401), `session.ts` (tokens in `localStorage`, single-flight refresh — refresh tokens are single-use), `endpoints.ts`, `adapt.ts` (backend → `Artwork`/`Edition`), `works.ts` (server loaders), `useWork.ts` (client work cache for the hover fan), `collectionWorks.ts`, `coverIndex.ts`.

| Route (API mode) | Backend |
|---|---|
| `/` | `GET /search/browse/latest`, then each work's books |
| `/archive` | `GET /search` with a query (+ country / language / year / genre / sort); otherwise `GET /search/browse/{latest,genre,country,year}` — search rejects blank queries |
| `/artwork/o-<uuid>`, `/artwork/t-<uuid>` | `GET /books/original/{id}` / `translated/{id}` + `/books/original/{id}/translations`; like = `POST /likes/{ORIGINAL_COVER\|TRANSLATED_COVER}/{coverId}` |
| `/login`, `/signup`, `/account` | `/auth/*`, `/users/me` |
| `/collections`, `/collections/[id]` | `/collections/my`, `/collections/public`, CRUD, items, visibility, duplicate |
| `/c/[token]` | `GET /collections/shared/{token}` — the only anonymous view of an exhibition |

### Backend gaps the UI works around

- **No Work endpoint.** A "work" is an original + its translations; other publishers' originals of the same work can't be reached. Works mode shows one card per original, resolving translated search hits to their original (`GET /books/translated/{id}`) and preferring a hit that has an image.
- **Collection items carry only a cover id**, and there's no cover → book lookup. Titles/links come from `coverIndex` (what this browser remembered when adding); other covers show as "Archived cover" linking to the archive. Reorder isn't supported (no order field).
- **`GET /collections/{id}` requires login even for PUBLIC**, and `/collections/public` summaries have no `shareToken` — anonymous visitors can only open share links.
- **No "my likes" list**, so there is no Saved page in API mode; the heart is per cover.
- `POST /collections/{id}/duplicate` returns `items: []` — the UI navigates to the copy and re-fetches.
- Search facets are always empty, so filter options are fixed lists.
