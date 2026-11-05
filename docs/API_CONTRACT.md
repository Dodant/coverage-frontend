# API Contract (frontend scope)

Derived from source on 2026-11-04 (Spring Boot 3.2.5, Jackson 2.15). Covers auth, users, search/browse, books/covers/contributors/series (read side plus book editing), likes and collections. **Out of scope:** `/admin/**`, reports, takedowns, redesign upload, comments, tag admin.

TypeScript types for everything here are in [`api-types.ts`](api-types.ts). Bugs and odd behaviour are collected under [Gotchas](#9-gotchas). Read that section before you build anything.

---

## 0. Conventions

### Base URL
- Every path starts with `/api` (`server.servlet.context-path: /api`). Dev: `http://localhost:8080/api`.
- **The backend has no CORS configuration** (no `CorsConfigurationSource`, no `@CrossOrigin`). Calls from the browser must go through a same-origin proxy. `coverage-frontend/next.config.ts` already rewrites `/api/:path*` to `${COVERAGE_API_ORIGIN}/api/:path*`.

### Auth header
`Authorization: Bearer <accessToken>`. The prefix must be exactly `Bearer ` (capital B, one space). The filter ignores any other header, query param or cookie.

The token is checked on every request. If it is missing, invalid or expired, or the user is SUSPENDED or DELETED, **the request still goes ahead as anonymous**: public endpoints return 200, protected ones return 401.

### JSON serialization (Spring Boot default ObjectMapper; no customization in this repo)
| Java | JSON |
|---|---|
| `UUID` | string `"3f2c…-…"` |
| `Instant` | ISO-8601 UTC string with up to 9 fractional digits, e.g. `"2026-11-04T09:12:31.244374Z"` |
| `LocalDate` (`usedFrom`) | `"YYYY-MM-DD"` |
| enums | constant name, e.g. `"FRONT"` |
| `null` fields | **included** as `null` (no `NON_NULL`) |
| `Set<String>` | array (order not guaranteed) |
| `Map<Integer, …>` | object with string keys |
| records | component names as written. **Extra `isX()` methods are also serialized**, so `SearchResult` and `BrowseResult` carry an extra `"empty": boolean`. I checked this with a Jackson run. |

No `@JsonProperty`, `@JsonIgnore`, `@JsonInclude` or `@JsonFormat` appears anywhere in the controller or DTO layer.

### Pagination
**`Page<T>` endpoints** (listed per endpoint):
- Query params: `page` (0-based, default `0`), `size` (default `20` via `@PageableDefault(size = 20)`, silently capped at `2000`), `sort=<property>,(asc|desc)` (repeatable).
- An unknown sort property usually gives **500**.

Spring Data 3.2 serializes `PageImpl` directly. Version 3.2 has no `PagedModel` and no `VIA_DTO` mode. The shape is:

```json
{
  "content": [ /* T */ ],
  "pageable": {
    "pageNumber": 0, "pageSize": 20,
    "sort": { "empty": true, "sorted": false, "unsorted": true },
    "offset": 0, "paged": true, "unpaged": false
  },
  "last": true,
  "totalElements": 3,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "sort": { "empty": true, "sorted": false, "unsorted": true },
  "first": true,
  "numberOfElements": 3,
  "empty": false
}
```

**Search and browse endpoints do not return `Page`.** They use their own wrappers (`SearchResult`, `BrowseResult`) with `items/totalCount/page/size/totalPages/empty` (see §3).

### Error body
`ErrorResponse` (record, `exception/ErrorResponse.java`):
```json
{ "code": "NOT_FOUND", "message": "OriginalBook not found with id: …", "details": { … } | null, "timestamp": "2026-…Z" }
```

**Exception:** a 401 or 403 raised by the Spring Security filter chain (`JwtAuthenticationEntryPoint`, `JwtAccessDeniedHandler`) is built from a plain `HashMap`. It has **no `details` key**:
```json
{ "code": "UNAUTHORIZED", "message": "Authentication required", "timestamp": "…" }
{ "code": "FORBIDDEN",    "message": "Access denied",           "timestamp": "…" }
```

### Codes actually emitted
`ErrorCode` declares more values than this (`INVALID_TOKEN`, `EXPIRED_TOKEN`, `USER_SUSPENDED`, `BOOK_NOT_FOUND`, `COLLECTION_NOT_FOUND`, `DUPLICATE_EMAIL`, `DUPLICATE_ENTRY`, `NO_SEARCH_RESULTS`, …), but **nothing ever emits them**.

| HTTP | `code` | When | `details` |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Bean validation (`details` = `{fieldName: message}`); every service `ValidationException` (`details` = service map); unreadable JSON or bad enum in body (`{reason}`); bad path/query type (`{parameterName, allowedValues?}`); `IllegalArgument/StateException` (`null`). **This also covers duplicate email, wrong login password, invalid refresh token, "not owner" and "private collection".** | varies |
| 400 | `MISSING_REQUIRED_FIELD` | A required `@RequestParam` is missing | `{parameterName, parameterType}` |
| 400 | `INVALID_IMAGE_SIZE` | Multipart larger than 10 MB | `{maxSize, recommendation}` |
| 401 | `UNAUTHORIZED` | Protected endpoint called with no valid token (filter-chain body); login for a SUSPENDED or DELETED account (Spring `LockedException`, `message: "인증에 실패했습니다"`, `details: null`) | — / null |
| 403 | `FORBIDDEN` | `/admin/**` without ADMIN; `@PreAuthorize` failure | — / null |
| 404 | `NOT_FOUND` | Any `ResourceNotFoundException` | `{resourceType, fieldName, fieldValue}` |
| 409 | `DUPLICATE_ISBN` | Creating or updating a book with an ISBN that already exists | `{existingBookId, isbn}` |
| 429 | `RATE_LIMITED` | Rate limit exceeded. Also sends the `Retry-After: <seconds>` header. | `{retryAfter: number, limit: number}` |
| 500 | `SEARCH_ERROR` | Elasticsearch failure in `GET /search` or `/search/browse/latest` | `{}` |
| 500 | `INTERNAL_ERROR` | Anything else. **This includes unmapped paths and wrong HTTP methods**, because the catch-all handler swallows `NoResourceFoundException` and `HttpRequestMethodNotSupportedException`. | null |

### Rate limits
Fixed windows in Redis, counted per user when logged in and per IP otherwise. Only these in-scope endpoints are limited:

| Action | Limit | Endpoints |
|---|---|---|
| `UPLOAD` | 10 / hour (shared) | `POST /books/original`, `PUT /books/original/{id}`, `POST /books/translated/original/{id}`, `PUT /books/translated/{id}`, `POST /books/{bookId}/covers` (plus image upload and redesign endpoints, which are out of scope) |
| `LIKE` | 100 / minute | `POST /likes/{targetType}/{targetId}` |

- Responses carry no `X-RateLimit-*` headers.
- A 4xx response refunds one count, up to 3× the limit per window.

### Access matrix (`SecurityConfig`)
Public (no token needed) for **GET only**: `/books/**`, `/covers/**`, `/redesigns/**`, `/search/**`, `/authors/**`, `/publishers/**`, `/designers/**`, `/series/**`, `/tags/**`, `/collections/public/**`, `/collections/shared/**`.

Also public for **any method**: `/auth/**`, Swagger, `/actuator/health`.

Everything else needs a valid access token. That includes **`GET /users/{id}`**, **`GET /collections/{id}`**, **`GET /likes/.../count`** and `GET /collections/my`. `/admin/**` needs ADMIN. The `GET /browse/**` rule in `SecurityConfig` matches no controller and does nothing.

---

## 1. Auth (`AuthController`, `/api/auth`)

**Token facts**

| | Value |
|---|---|
| Algorithm | HS256 (jjwt, secret from `JWT_SECRET`) |
| Access token lifetime | `jwt.expiration` = 86 400 000 ms (**24 h**). Returned as `expiresIn` = `86400` **seconds**. |
| Refresh token lifetime | `jwt.refresh-expiration` = 604 800 000 ms (**7 days**). Not returned in the body; decode `exp` if you need it. |
| Claims | `sub` = email, `typ` = `"access"` or `"refresh"` (one cannot stand in for the other), `uid` = user UUID, `iat`, `exp`. Refresh tokens also carry `jti`. |

**Refresh-token rotation**
- **Single use.** A successful `/auth/refresh` revokes the presented refresh token (Redis `revoked_refresh:{jti}`) and returns a **new access + refresh pair**. Store both.
- Reusing an old refresh token gives 400.
- Two concurrent refreshes with the same token: exactly one succeeds and the other gets 400. **Serialize refreshes on the client** (single-flight).
- A failed refresh does **not** burn the token. Revocation happens only after every check passes.
- Access tokens cannot be revoked. Logout only kills the refresh token; delete the access token on the client.
- Role and status changes take effect on the next request, because the filter re-reads the user from the DB.

| Method & path | Auth | Body | 2xx | Errors |
|---|---|---|---|---|
| `POST /api/auth/signup` | none | `SignupRequest` | **201** `AuthResponse` (logs the user in immediately) | 400 `VALIDATION_ERROR`: bad fields; email already registered (`details.email`, **not 409**); `role: "ADMIN"` (`details.role`) |
| `POST /api/auth/login` | none | `LoginRequest` | 200 `AuthResponse` | 400 `VALIDATION_ERROR` with `details.credentials` for an unknown email or wrong password (**not 401**); **401** `UNAUTHORIZED` (`details: null`) when the account is SUSPENDED (unexpired) or DELETED |
| `POST /api/auth/refresh` | none | `TokenRefreshRequest` | 200 `AuthResponse` (new pair) | 400 `VALIDATION_ERROR`. `details` is one of `{refreshToken}` (invalid, expired, reused, wrong `typ`), `{account}` (not active) or `{user}`. **Treat any 400 here as "session over".** |
| `POST /api/auth/logout` | none (no access token needed) | `TokenRefreshRequest` | **204**, even if the token is already invalid | 400 if `refreshToken` is blank |

**`SignupRequest`**

| Field | Type | Rules |
|---|---|---|
| `email` | string | required, email format |
| `password` | string | required, 8–100 chars |
| `displayName` | string | required, 2–50 chars |
| `role` | `"PUBLISHER" \| "AUTHOR" \| "DESIGNER" \| "MEMBER"` | required. `"ADMIN"` → 400 |
| `websiteUrl` | string? | must be an http(s) URL if non-blank |
| `portfolioUrl` | string? | same |
| `snsAccounts` | `Record<string,string>?` | free-form, e.g. `{"instagram":"@x"}` |

**`LoginRequest`**: `{ email: string (required, email), password: string (required) }`

**`TokenRefreshRequest`**: `{ refreshToken: string (required) }`

**`AuthResponse`**
```json
{
  "accessToken": "…",
  "refreshToken": "…",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": { "id": "uuid", "email": "…", "displayName": "…", "role": "MEMBER" }
}
```
`user.role` is a **string** (`role.name()`) and can be any `UserRole`, including `"ADMIN"`.

---

## 2. Users (`UserController`, `/api/users`)

| Method & path | Auth | Params / body | 2xx | Errors |
|---|---|---|---|---|
| `GET /api/users/me` | **required** | — | 200 `UserProfileResponse` (full) | 401 |
| `PUT /api/users/me` | **required** | `UpdateProfileRequest` | 200 `UserProfileResponse` (full) | 400, 401 |
| `PUT /api/users/me/password` | **required** | `{ currentPassword: string, newPassword: string (8–100) }` | 200, **empty body** | 400 wrong current password (`details.currentPassword`) or same password (`details.newPassword`) |
| `DELETE /api/users/me` | **required** | `{ password: string }` (a JSON body on DELETE) | 204 | 400 wrong password |
| `GET /api/users/{userId}` | **required** (not in `permitAll`) | `userId`: UUID | 200 `UserProfileResponse`. Full when it is your own ID. Otherwise "public": `email: null`, `lastLoginAt: null` | 401, 404 |
| `GET /api/users/search` | **required** | `displayName` (string, **required**) + Pageable (size 20) | 200 `Page<UserProfileResponse>` (public form; DELETED users excluded) | 400 `MISSING_REQUIRED_FIELD`, 401 |

**`UpdateProfileRequest`**: every field is optional.

| Field | `null` / omitted | `""` | Value |
|---|---|---|---|
| `displayName` | unchanged | **400** (`@Size(min=2)`) | sets it (2–50 chars) |
| `websiteUrl` | unchanged | clears | sets it (http(s) URL) |
| `portfolioUrl` | unchanged | clears | sets it (http(s) URL) |
| `snsAccounts` | unchanged | `{}` clears all | replaces the whole map |

**`UserProfileResponse`**
```
{ id: UUID, email: string|null, displayName, role: UserRole, title: "MEMBER"|"CONTRIBUTOR",
  websiteUrl: string|null, portfolioUrl: string|null, snsAccounts: {[k]: string},
  contributionCount: number, createdAt: Instant, lastLoginAt: Instant|null }
```

A deleted user still resolves via `/users/{id}`. They appear as `displayName: "탈퇴한 회원"` with their links cleared.

---

## 3. Search & browse (`SearchController`, `/api/search`)

Everything here is backed by Elasticsearch, a read model that Kafka updates asynchronously. Expect a short delay after writes. Only `PUBLISHED` content is returned.

**One hit = one book or redesign**, not one cover and not one Work.

### `GET /api/search`: full-text search
Auth: none.

| Query param | Type | Default | Notes |
|---|---|---|---|
| `query` | string | — | **Blank or missing returns an empty result** (`items: [], page: 0, size: 0, totalPages: 0`). Filters alone do not browse. Matched fuzzily against `title^3, originalTitle^2, author^2, publisher, designers, isbn^4, description`. |
| `countryCode` | string | — | exact term match (ISO 3166-1 alpha-2) |
| `languageCode` | string | — | exact (ISO 639-1) |
| `yearFrom`, `yearTo` | int | — | inclusive range |
| `genre` | string | — | exact keyword |
| `publisherId` | UUID | — | |
| `tagIds` | UUID[] | — | `tagIds=a&tagIds=b` or `tagIds=a,b`. Matches if **any** tag matches. |
| `sortBy` | `RELEVANCE \| LIKES \| NEWEST \| YEAR_ASC \| YEAR_DESC` | `RELEVANCE` | LIKES = `likeCount` desc, NEWEST = `createdAt` desc |
| `page`, `size`, `sort` | Pageable | 0, 20 | `sort` is also applied to ES; avoid it and use `sortBy` |

200 → `SearchResult`:
```json
{
  "items": [SearchResultItem],
  "totalCount": 123,
  "facets": { "countries": {}, "years": {}, "genres": {}, "tags": {} },
  "page": 0, "size": 20, "totalPages": 7,
  "empty": false
}
```
`facets` is **always empty**. Aggregations are not implemented.

`SearchResultItem`:
```
{ id: string, type: "ORIGINAL"|"TRANSLATED"|"REDESIGN", title: string|null, thumbnailUrl: string|null,
  author: string|null, publisher: string|null, designers: string[]|null, year: number|null,
  countryCode: string|null, genre: string|null, likeCount: number|null, createdAt: Instant }
```

**`id` is the ES document id, not a UUID.** It looks like `"original_<uuid>"`, `"translated_<uuid>"` or `"redesign_<uuid>"`. Strip the prefix before calling `/books/original/{uuid}`, `/books/translated/{uuid}` or `/redesigns/{uuid}`.

Other item fields:
- `thumbnailUrl` is the **representative (front) cover's** thumbnail.
- `likeCount` is the front cover's `likeCount`.
- `publisher` is null for redesigns.

Errors: 500 `SEARCH_ERROR` when ES is down; 400 for bad UUIDs, ints or enums.

### `GET /api/search/browse/latest`: home feed
Auth: none.

| Param | Type | Default | Rules |
|---|---|---|---|
| `page` | int | 0 | ≥ 0 |
| `size` | int | 24 | 1–60, otherwise 400 with `details: {page, size, maxSize: 60}` |

- **These are plain params, not a Pageable.** `sort` is ignored. Order is always `createdAt` desc.
- 200 → `BrowseResult` with `category: "latest"`, `categoryValue: "all"`.
- 500 `SEARCH_ERROR` on an ES failure.

### `GET /api/search/browse/country/{countryCode}`, `/browse/year/{year}`, `/browse/genre/{genre}`, `/browse/tag/{tagId}`
Auth: none.

| Path var | Type |
|---|---|
| `countryCode` | string, case-sensitive exact |
| `year` | int |
| `genre` | string |
| `tagId` | UUID |

- Pageable params: `page`, `size` (default 20), `sort`. **There is no default sort.** Order is unspecified, effectively the ES index order. Pass e.g. `sort=createdAt,desc`.
- 200 → `BrowseResult`. `category` is `"country" | "year" | "genre" | "tag"` and `categoryValue` is the path value as a string.
- `totalCount` comes from a separate count query (for tag, from the page itself). `totalPages` comes from the page.
- An ES failure gives 500 `INTERNAL_ERROR` here, not `SEARCH_ERROR`.

`BrowseResult`:
```
{ category: string, categoryValue: string, totalCount: number, items: BrowseResultItem[],
  page: number, size: number, totalPages: number, empty: boolean }
```

`BrowseResultItem` is the same as `SearchResultItem` **without `designers`**. Its `id` is also prefixed.

---

## 4. Books, covers, contributors

### 4.1 Domain model for display

```
Work (id, title, originalTitle, description)  ← NOT exposed by any public endpoint; only `workId` on OriginalBookResponse
  └─ OriginalBook *  (Media)            work_id nullable; several originals (other publishers' editions) can share a Work
        └─ TranslatedBook *  (Media)    original_book_id required
Media (abstract): id, title, countryCode?, languageCode, year?, status, series?, seriesNumber?, createdAt, updatedAt,
                  covers: BookCover[]  (FRONT variants, ordered usedFrom ASC, createdAt ASC; Postgres puts null usedFrom last)
                  frontCover: BookCover   (the representative cover; it is one of `covers`)
                  backCover:  BookCover?  (coverType BACK; NOT in `covers`)
BookCover: id, imageUrl, thumbnailUrl (300×450 thumbnail), width?, height?, fileSize?, coverType FRONT|BACK,
           variantType (UNKNOWN|INITIAL|RECOVER|SPECIAL|PRINTING|IMAGE_REPLACEMENT; never null, null in DB → UNKNOWN),
           ribbonStatus (UNKNOWN|CLEAN|BANDED; never null), dominantColor "#RRGGBB"?, layout?, label?,
           printingFrom?, usedFrom? (YYYY-MM-DD), countryCode?/languageCode? (null = inherit from book),
           credits[] (designerId, name, role), tags[] (approved only), similarGroupId?, hidden, likeCount, commentCount,
           imageSource?, sourceUrl?, sourceName?, copyrightHolder?, originalFileName, createdAt
```

- **There is no "representative" flag on a cover.** A cover is representative when `cover.id === book.frontCover.id`. Set it with `PUT /books/{bookId}/covers/{coverId}/representative`.
- **Hidden covers** (`hidden: true`, removed after a takedown) still appear in `covers`, `frontCover` and `backCover`, but with `imageUrl: null` and `thumbnailUrl: null`. Render a placeholder. `GET /covers/{id}` returns 404 for them.
- `width` and `height` can be `null`, because they are optional in the create requests. Get the aspect ratio from the loaded image when they are missing.
- `similarGroupId` is the same across covers with a similar design in different languages. Admins set it, and no public endpoint queries by it.
- The cover's `book` link is not exposed: `BookCoverResponse` has no `bookId`.

### 4.2 `BookCoverResponse` (`controller/dto/book/BookCoverResponse.java`)
```
{ id: UUID, imageUrl: string|null, thumbnailUrl: string|null, originalFileName: string,
  width: number|null, height: number|null, fileSize: number|null, coverType: "FRONT"|"BACK",
  imageSource: "SCAN"|"PHOTO"|"LINK"|"OTHER"|null, sourceUrl: string|null, sourceName: string|null,
  dominantColor: string|null, layout: "CENTER"|"LEFT"|"RIGHT"|"FULL_BLEED"|"MINIMAL"|null,
  likeCount: number, commentCount: number, hidden: boolean, createdAt: Instant,
  label: string|null, printingFrom: number|null, usedFrom: "YYYY-MM-DD"|null,
  countryCode: string|null, languageCode: string|null,
  credits: [{ designerId: UUID, name: string, role: "DESIGN"|"ART_DIRECTION"|"ILLUSTRATION"|"PHOTOGRAPHY"|"LETTERING" }],
  tags: [TagResponse], similarGroupId: UUID|null,
  variantType: CoverVariantType, ribbonStatus: RibbonStatus, copyrightHolder: string|null }
```

`TagResponse`:
```
{ id, name, category: "STYLE"|"COLOR"|"LAYOUT"|"TYPOGRAPHY"|"ILLUSTRATION", usageCount, approved, createdAt }
```

### 4.3 `OriginalBookResponse`
```
{ id, title, originalTitle, countryCode|null, languageCode, year|null, genre|null, isbn|null,
  purchaseLinks: { aladin, yes24, kyobo } | null   (null when there is no ISBN; KR stores only),
  edition|null, author: {id,name}|null, publisher: {id,name}|null, series: {id,name}|null, seriesNumber|null,
  workId: UUID|null, frontCover: BookCoverResponse, backCover: BookCoverResponse|null, covers: BookCoverResponse[],
  status: ContentStatus, translationCount: number, createdAt, updatedAt }
```
`translationCount` counts translations of **every** status. See Gotchas.

### 4.4 `TranslatedBookResponse`
```
{ id, title, countryCode|null, languageCode, year|null, isbn|null, purchaseLinks|null, edition|null,
  originalBookId: UUID, originalBookTitle: string,
  author|null, translator: {id,name}|null, publisher|null, series|null, seriesNumber|null,
  frontCover, backCover|null, covers[], status, createdAt, updatedAt }
```
This has no `workId`, `genre` or `originalTitle`. Get them from the original.

### 4.5 Original books (`/api/books/original`)

| Method & path | Auth | Params / body | 2xx | Errors |
|---|---|---|---|---|
| `GET /{id}` | none | `id`: UUID | 200 `OriginalBookResponse` | 404 if missing **or not PUBLISHED** |
| `GET /{id}/translations` | none | — | 200 `TranslatedBookResponse[]` (PUBLISHED only; not paged; DB order) | 404 if the original is missing or not public |
| `GET /check-duplicate` | none | `isbn` (string, required; normalized) | 200 `[{ id: UUID, title, type: "OriginalBook"\|"TranslatedBook" }]` | 400 missing param |
| `GET /find-similar` | none | `title` (req), `authorName` (req), `year` (int, opt) | 200 same `DuplicateCheckResponse[]` | 400 |
| `GET /by-author/{authorId}` | none | Pageable (20) | 200 `Page<OriginalBookResponse>` (PUBLISHED originals only) | — |
| `GET /by-publisher/{publisherId}` | none | Pageable (20) | 200 `Page<OriginalBookResponse>` (PUBLISHED originals only) | — |
| `POST /` | **required** · UPLOAD limit | `CreateOriginalBookRequest` | **201** `OriginalBookResponse` | 400, 404 (unknown `workId`, `authorId` or `seriesId`), 409 `DUPLICATE_ISBN`, 429 |
| `PUT /{id}` | **required** · UPLOAD limit | `UpdateOriginalBookRequest` | 200 `OriginalBookResponse` | 400, 404, 409, 429 |
| `DELETE /{id}` | **required** | — | 204 (soft delete → `DELETED`; idempotent) | 404 |

The `type` values in `check-duplicate` and `find-similar` are Java class names, not `ORIGINAL`/`TRANSLATED`.

**`CreateOriginalBookRequest`**

Required fields:
- `title` (non-blank)
- `languageCode` (exactly 2 chars)
- `frontCover`

Optional fields:
- `originalTitle` (defaults to `title`)
- `countryCode` (exactly 2 chars)
- `year`, `genre`
- `isbn` (validated, normalized)
- `authorId` **or** `authorName` (by name: found or created); same for `publisherId` / `publisherName`
- `edition`
- `seriesId` or `seriesName`; `seriesNumber` (max 20 chars)
- `workId`
- `backCover`
- `status`: `null` or `"PUBLISHED"`. `"DRAFT"` is allowed for ADMIN only; any other value → 400.

`createdById` in the body is **ignored** and replaced by the caller.

**`BookCoverInfo`** (shape of `frontCover` and `backCover`):

| Field | Required | Notes |
|---|---|---|
| `imageUrl` | yes | Must be an URL returned by `POST /api/covers` (upload, out of scope). The upload response field is called **`originalUrl`**. Map it to `imageUrl`. |
| `thumbnailUrl` | yes | Must match the upload record |
| `originalFileName` | yes | |
| `width`, `height`, `fileSize` | no | If present, must match the upload record |
| `imageSource`, `sourceUrl` (≤1000), `sourceName` (≤100) | no | |
| `credits` | no | `[{ designerId?: UUID, designerName?: string, role: CreditRole }]` |
| `copyrightHolder` | no | ≤500 chars |

**`UpdateOriginalBookRequest`**: every field optional. `null` means unchanged; values cannot be cleared to null.
- Fields: `title, originalTitle, countryCode(2), languageCode(2), year, genre, isbn, authorId, publisherId, edition, seriesId, seriesNumber(≤20), workId, frontCover, backCover`.
- There are **no** `authorName`, `publisherName` or `seriesName` on update.
- `frontCover` edits the **current representative cover in place**.
- `backCover` creates the back cover if it is missing.
- `BookCoverUpdateInfo` has the same fields as `BookCoverInfo`, all optional:
  - `credits`: `null` keeps the current credits; `[]` removes all; a list replaces them.
  - `copyrightHolder`: `null` keeps it; `""` clears it.

### 4.6 Translated books (`/api/books/translated`)

| Method & path | Auth | Params / body | 2xx | Errors |
|---|---|---|---|---|
| `GET /{id}` | none | UUID | 200 `TranslatedBookResponse` | 404 if missing or not PUBLISHED |
| `GET /by-original/{originalBookId}` | none | — | 200 `TranslatedBookResponse[]` (same as `/books/original/{id}/translations`) | 404 |
| `POST /original/{originalBookId}` | **required** · UPLOAD | `CreateTranslatedBookRequest` | **201** `TranslatedBookResponse` | 400 (including when the original is not PUBLISHED), 404, 409, 429 |
| `PUT /{id}` | **required** · UPLOAD | `UpdateTranslatedBookRequest` | 200 | 400, 404, 409, 429 |
| `DELETE /{id}` | **required** | — | 204 | 404 |

**`CreateTranslatedBookRequest`**
- Required: `title`, `languageCode(2)`, `frontCover`.
- Optional: `countryCode(2)`, `year`, `isbn`, `authorId|authorName`, `translatorId|translatorName`, `publisherId|publisherName`, `edition`, `seriesId|seriesName`, `seriesNumber`, `backCover`.
- `createdById` is ignored.
- The book is always created as PUBLISHED.

**`UpdateTranslatedBookRequest`**: `title, countryCode, languageCode, year, isbn, authorId, translatorId, publisherId, edition, seriesId, seriesNumber, frontCover, backCover`. Same update semantics as for originals.

### 4.7 Cover variants (`BookCoverVariantController`, `/api/books/{bookId}/covers`)
`bookId` may be the id of an original **or** a translated book.

**There is no GET on this path.** `GET /api/books/{id}/covers` returns **500** (method not supported, swallowed by the catch-all handler). Read covers from the book's `covers` field.

| Method & path | Auth | Body | 2xx | Errors |
|---|---|---|---|---|
| `POST /api/books/{bookId}/covers` | **required** · UPLOAD | `AddCoverRequest` | **201** `BookCoverResponse` (always `coverType: "FRONT"`; the representative cover does not change) | 400 (including an unverified `imageUrl`), 404 when the book is missing or DELETED, 429 |
| `PUT /api/books/{bookId}/covers/{coverId}/representative` | **required** | — | **204** | 400 (`Cover does not belong to this book`, `details.coverId`), 404 |

**`AddCoverRequest`**
- Required: `imageUrl`, `thumbnailUrl`, `originalFileName`.
- Optional:
  - `width`, `height`, `fileSize`, `imageSource`
  - `sourceUrl` (≤1000), `sourceName` (≤100)
  - `label` (≤100), `printingFrom` (≥1), `usedFrom` (`"YYYY-MM-DD"`)
  - `countryCode` (valid ISO, upper-cased), `languageCode` (valid ISO, lower-cased)
  - `credits: CreditInfo[]`, `variantType`, `ribbonStatus`, `copyrightHolder` (≤500)

### 4.8 Covers (`CoverController`, read only)
| Method & path | Auth | 2xx | Errors |
|---|---|---|---|
| `GET /api/covers/{id}` | none | 200 `BookCoverResponse` | 404 if missing or `hidden` |

- The response does not say which book the cover belongs to.
- It returns covers of DRAFT, HIDDEN and DELETED books too. Only `cover.hidden` is checked.

### 4.9 Authors, publishers, designers, series (GET only)
All of these are public.

| Method & path | Params | 200 | Errors |
|---|---|---|---|
| `GET /api/authors` | `name` (string, optional, case-insensitive "contains") + Pageable (20) | `Page<AuthorResponse>` | |
| `GET /api/authors/{id}` | | `AuthorProfileResponse` | 404 |
| `GET /api/authors/{id}/books` | Pageable (20) | `Page<OriginalBookResponse>` (PUBLISHED **originals only**) | 404 |
| `GET /api/publishers` | `name?` + Pageable | `Page<PublisherResponse>` | |
| `GET /api/publishers/{id}` | | `PublisherProfileResponse` | 404 |
| `GET /api/publishers/{id}/books` | Pageable | `Page<OriginalBookResponse>` (PUBLISHED **originals only**) | 404 |
| `GET /api/designers` | `name?` + Pageable | `Page<DesignerResponse>` | |
| `GET /api/designers/{id}` | | `DesignerProfileResponse` (`coverCount` = credited covers on PUBLISHED books, back covers included) | 404 |
| `GET /api/designers/{id}/covers` | `role?: CreditRole` + Pageable | `Page<DesignerCoverResponse>`. Always `createdAt` desc; a `sort` param is appended after that. | 404, 400 bad role |
| `GET /api/series` | `name?` + Pageable | `Page<SeriesResponse>` | |
| `GET /api/series/{id}` | | `SeriesResponse` | 404 |
| `GET /api/series/{id}/books` | — | `SeriesBookItem[]` (**not paged**; PUBLISHED originals and translations, ordered by the leading number in `seriesNumber`, then `seriesNumber`, then `year`) | 404 |

Shapes:

| Type | Fields |
|---|---|
| `AuthorResponse` | `{ id, name, aliases: string[], biography\|null, websiteUrl\|null, nationality\|null, createdAt, updatedAt }` |
| `AuthorProfileResponse` | `AuthorResponse` + `bookCount: number` |
| `PublisherResponse` | `{ id, name, aliases, description\|null, websiteUrl\|null, countryCode\|null, createdAt, updatedAt }` |
| `PublisherProfileResponse` | `PublisherResponse` + `bookCount` |
| `DesignerResponse` | `{ id, name, aliases, biography\|null, websiteUrl\|null, portfolioUrl\|null, nationality\|null, createdAt, updatedAt }` |
| `DesignerProfileResponse` | `DesignerResponse` + `coverCount` |
| `DesignerCoverResponse` | `{ coverId, thumbnailUrl, imageUrl, coverType, label\|null, roles: CreditRole[], book: { id, type: "ORIGINAL"\|"TRANSLATED", title, countryCode\|null, year\|null } \| null }` |
| `SeriesResponse` | `{ id, name, publisherId\|null, publisherName\|null }` |
| `SeriesBookItem` | `{ id, type: "ORIGINAL"\|"TRANSLATED", title, seriesNumber\|null, year\|null, countryCode\|null, thumbnailUrl\|null }` |

`bookCount` (authors and publishers) counts originals of **every** status, so it can exceed what `/books` returns.

---

## 5. Likes (`LikeController`, `/api/likes`)

`targetType` (`LikeTargetType`): `ORIGINAL_COVER | TRANSLATED_COVER | REDESIGN`.

`targetId` is the **cover id** (`BookCoverResponse.id`) for the two cover types, or the redesign id. It is **never a book id**.

**All three endpoints require auth**, including `count`. Anonymous users should read `BookCoverResponse.likeCount`.

| Method & path | Auth | 200 | Errors |
|---|---|---|---|
| `POST /api/likes/{targetType}/{targetId}` | **required** · LIKE 100/min | `{ liked: boolean, likeCount: number }`. This **toggles**: `liked` is the new state. | 400 bad enum or UUID (`details.allowedValues`), 401, 404 if the cover or redesign does not exist, 429 |
| `GET /api/likes/{targetType}/{targetId}/count` | **required** | `{ count: number }` | 401 |
| `GET /api/likes/{targetType}/{targetId}/status` | **required** | `{ liked: boolean, likeCount: number }` | 401 |

Rule: use `ORIGINAL_COVER` for covers of an `OriginalBook` and `TRANSLATED_COVER` for covers of a `TranslatedBook`. See Gotchas for why this matters.

---

## 6. Collections (`CollectionController`, `/api/collections`)

**Enums**
- `CollectionVisibility`: `PRIVATE | PUBLIC | LINK_ONLY`. The default on create is `PRIVATE`.
- `CollectionItemType`: `ORIGINAL_COVER | TRANSLATED_COVER | REDESIGN`. `itemId` is a cover id or a redesign id.

| Method & path | Auth | Params / body | 2xx | Errors |
|---|---|---|---|---|
| `POST /api/collections` | **required** | `{ name: string (required, ≤100), description?: string (≤500), visibility?: CollectionVisibility }` | **201** `CollectionResponse` | 400 |
| `GET /api/collections/{id}` | **required** (not in `permitAll`) | — | 200 `CollectionResponse` | 401 for anonymous callers, even on PUBLIC collections; **400** `VALIDATION_ERROR` "비공개 컬렉션입니다" when PRIVATE and not yours; 404 |
| `GET /api/collections/shared/{shareToken}` | none | `shareToken`: string (UUID text) | 200 `CollectionResponse` (PUBLIC or LINK_ONLY) | 404 when missing or PRIVATE |
| `PUT /api/collections/{id}` | **required**, owner | `{ name?: (≤100, non-blank if present), description?: (≤500), visibility? }`. `null` means unchanged; `description` cannot be cleared to null (`""` works). | 200 `CollectionResponse` | 400 (including **not owner**), 404 |
| `DELETE /api/collections/{id}` | **required**, owner | — | 204 (hard delete) | 400 not owner, 404 |
| `POST /api/collections/{id}/items` | **required**, owner | `{ itemType: CollectionItemType (required), itemId: UUID (required) }` | **200** (not 201) `CollectionResponse` | 400 duplicate item or not owner, 404 collection. **The target is not checked for existence.** |
| `DELETE /api/collections/{id}/items/{itemId}` | **required**, owner | `itemId` = the **target id** (`CollectionItemResponse.itemId`), **not** `CollectionItemResponse.id` | 200 `CollectionResponse` | 400 not owner, 404 |
| `GET /api/collections/my` | **required** | Pageable (20) | 200 `Page<CollectionSummaryResponse>` (all of yours, every visibility) | 401 |
| `GET /api/collections/public` | none | Pageable (20) | 200 `Page<CollectionSummaryResponse>` (PUBLIC only; LINK_ONLY excluded) | |
| `POST /api/collections/{id}/duplicate` | **required** | — | **201** `CollectionResponse`. The copy is named `"<name> (복제)"`, is PRIVATE, has a new share token and copies the items. **The response shows `items: []`**; see Gotchas. | 400 if PRIVATE and not yours, 404 |

**`CollectionResponse`**
```
{ id, name, description|null, visibility, shareToken: string, ownerId, ownerName,
  items: [{ id: UUID, itemType, itemId: UUID, addedAt: Instant }], itemCount, createdAt, updatedAt }
```
- `items` order is unspecified (no `@OrderBy`). Sort by `addedAt` on the client.
- `shareToken` is returned to anyone who can see the collection.

**`CollectionSummaryResponse`**
```
{ id, name, description|null, visibility, ownerId, ownerName, itemCount, createdAt }
```
There is **no `shareToken` and no `updatedAt`**.

---

## 7. Enum reference

| Enum | Values |
|---|---|
| `UserRole` | PUBLISHER, AUTHOR, DESIGNER, MEMBER, ADMIN |
| `UserTitle` | MEMBER, CONTRIBUTOR |
| `ContentStatus` | DRAFT, PUBLISHED, HIDDEN, DELETED (public reads only ever return PUBLISHED) |
| `CoverType` | FRONT, BACK |
| `CoverVariantType` | UNKNOWN, INITIAL, RECOVER, SPECIAL, PRINTING, IMAGE_REPLACEMENT |
| `RibbonStatus` | UNKNOWN, CLEAN, BANDED |
| `CoverLayout` | CENTER, LEFT, RIGHT, FULL_BLEED, MINIMAL |
| `ImageSource` | SCAN, PHOTO, LINK, OTHER |
| `CreditRole` | DESIGN, ART_DIRECTION, ILLUSTRATION, PHOTOGRAPHY, LETTERING |
| `TagCategory` | STYLE, COLOR, LAYOUT, TYPOGRAPHY, ILLUSTRATION |
| `DocumentType` (search) | ORIGINAL, TRANSLATED, REDESIGN |
| `SortOption` | RELEVANCE, LIKES, NEWEST, YEAR_ASC, YEAR_DESC |
| `LikeTargetType` | ORIGINAL_COVER, TRANSLATED_COVER, REDESIGN |
| `CollectionItemType` | ORIGINAL_COVER, TRANSLATED_COVER, REDESIGN |
| `CollectionVisibility` | PRIVATE, PUBLIC, LINK_ONLY |

---

## 8. How the frontend should load a Work page

There is **no `/works` endpoint** and no public way to list books by `workId`. The admin-only `GET /admin/catalog/{id}/editions` exists but is out of scope. `Work.title` and `Work.description` are never exposed.

The page has to be built around **one original book**. Steps:

1. **Resolve the entry point to an original id.**
   - From a search or browse hit: strip the `original_`, `translated_` or `redesign_` prefix from `item.id`.
   - If the hit was `TRANSLATED`, call `GET /api/books/translated/{uuid}` and take `originalBookId`.
2. **Load the original:** `GET /api/books/original/{originalId}`. This gives:
   - the book's metadata, including `workId`, `genre` and `originalTitle`
   - `frontCover` (the representative cover)
   - `covers[]` (every front-cover variant, representative included, in `usedFrom`, then `createdAt` order)
   - `backCover`
3. **Load the translations** (in parallel with step 2 if you already know the id): `GET /api/books/original/{originalId}/translations`. You get `TranslatedBookResponse[]`, each with its own `frontCover`, `covers[]` and `backCover`. You do not need a call per edition.
4. **Other publishers' editions of the same Work** (other originals sharing `workId`): **these are not reachable through the public API.** Two options:
   - **Best:** add a backend endpoint, e.g. `GET /books/original?workId=` or `GET /works/{id}/editions` backed by `OriginalBookRepository.findByWorkId`, which already exists.
   - **Stopgap:** `GET /api/search?query=<originalTitle>` → keep the `ORIGINAL` hits → `GET /books/original/{id}` for each → keep the ones with the same `workId` → load each one's translations as in step 3.
5. **Per-cover data needs no extra calls.**
   - Credits, tags, `variantType`, `ribbonStatus`, `label`, `printingFrom`, `usedFrom`, `dominantColor`, `width`/`height` and `likeCount` are all inside each `BookCoverResponse`.
   - Designer links: `/designers/{credit.designerId}`.
6. **Per-user state** (logged in only), for each cover shown: `GET /api/likes/{ORIGINAL_COVER|TRANSLATED_COVER}/{cover.id}/status`. Pick the type from the owning book's kind. This is one call per cover; there is no batch endpoint.
7. **Display rules:**
   - Cover tile:
     - mark the representative cover with `cover.id === book.frontCover.id`
     - if `hidden` (or `imageUrl == null`), show a placeholder
     - keep the original aspect ratio: use `width`/`height` when present, otherwise the loaded image's natural size
     - use `thumbnailUrl` (300×450 box) for grids and `imageUrl` for detail views
   - Edition group label: `countryCode` / `languageCode` / `publisher.name` / `year` / `edition`. A cover's own `countryCode`/`languageCode`, when non-null, overrides the book's.
   - Deduplicate covers by `id`. Legacy rows might have a `frontCover` that is missing from `covers`; prepend it if so.

---

## 9. Gotchas

**Auth and errors**
1. **No CORS.** Browser calls must go through the Next.js rewrite or proxy. A direct cross-origin `fetch` fails at preflight.
2. **Status codes do not match the README or Swagger.**
   - Duplicate email on signup → 400, not 409.
   - Wrong password → 400, not 401.
   - Bad refresh token → 400, not 401.
   - Not the collection owner, or viewing someone else's private collection → 400, not 403 or 404.
3. **A suspended or deleted account at login gives a bare 401 `UNAUTHORIZED` ("인증에 실패했습니다").** The friendlier `ValidationException` branches in `AuthServiceImpl.login` are unreachable, because Spring's `LockedException` fires first, before the password check.
4. **An expired access token on a public endpoint is silently ignored.** The request succeeds as anonymous with no 401. Personalized data (e.g. like status) just goes missing. Refresh proactively using `expiresIn`.
5. **Unknown paths and wrong methods return 500 `INTERNAL_ERROR`, not 404 or 405.**
   - On protected prefixes, anonymous callers get 401 first.
   - `GET /books/{id}/covers` (which the README advertises) does not exist and returns 500.
6. **The 401/403 bodies from the security chain have no `details` key.** Handler-produced bodies have `"details": null`.
7. **Only about 10 `ErrorCode` values are ever emitted** (§0). Do not switch on `EXPIRED_TOKEN`, `USER_SUSPENDED`, `BOOK_NOT_FOUND` or `DUPLICATE_EMAIL`; they never appear.

**Access rules**
8. **`GET /collections/{id}` requires login, even for PUBLIC collections.**
   - The only anonymous view is `/collections/shared/{shareToken}`.
   - `CollectionSummaryResponse` (from `/collections/public`) **does not include `shareToken`**.
   - So an anonymous visitor who clicks a public collection gets 401.
   - Separately, any logged-in user can open a LINK_ONLY collection by id.
9. **`GET /users/{id}` and all `/likes/*` GETs require login.**

**Search**
10. **Search and browse ids are prefixed strings** (`original_<uuid>`), not UUIDs. Other ids everywhere are plain UUIDs.
11. **`GET /search` needs a non-blank `query`.** Filters alone return an empty result. Use `/search/browse/*` to browse.
12. **`facets` are always empty.** The response also has an extra `empty` boolean.
13. **Browse country, year, genre and tag have no default order.** Pass `sort=createdAt,desc`.
14. **`/browse/latest` uses plain `page`/`size` params with a maximum `size` of 60.** Other paged endpoints use Spring Pageable with a maximum of 2000.
15. **The search grid is per book, not per Work.** Originals and translations appear as separate hits, and there is no `workId` in the index. A Work-grouped grid needs client-side grouping (fetch each original) or a backend change.
16. **Search and browse thumbnails do not respect `cover.hidden`.** The indexer copies `frontCover.thumbnailUrl` without checking it, so a taken-down representative cover can still appear in grids.

**Likes**
17. **The like type is not checked against the book kind.** The service only checks that the cover exists.
    - Liking the same cover once as `ORIGINAL_COVER` and once as `TRANSLATED_COVER` creates two likes and bumps `BookCover.likeCount` twice.
    - `/likes/.../count` counts per type, so it can disagree with `likeCount`.
    - Always derive the type from the owning book.
18. **Like toggle race.** Two fast clicks can hit the unique constraint, giving 500. Debounce the button.

**Collections**
19. **`POST /collections/{id}/duplicate` returns `items: []` and `itemCount: 0`, but the items were copied.** Re-fetch `GET /collections/{newId}`.
20. **`DELETE /collections/{id}/items/{itemId}` takes the target `itemId`, not the item row `id`.** If the same `itemId` is in a collection under two `itemType`s, the delete gives 500 (non-unique result).
21. **Collection items carry only `(itemType, itemId)`.**
    - To render one, call `GET /covers/{itemId}` (public; no book title or link) or `GET /redesigns/{itemId}`.
    - There is no batch endpoint and no cover-to-book lookup, so a collection page cannot show book titles without more backend work.
    - Items pointing at deleted or hidden content return 404 from those calls.

**Books, covers and contributors**
22. **`GET /covers/{id}` returns covers of non-public books** (only `cover.hidden` is checked).
23. **`/designers/{id}/covers` leaks hidden covers' URLs.** `DesignerCoverResponse` does not null `imageUrl`/`thumbnailUrl` for `hidden` covers, unlike `BookCoverResponse`. Check visibility yourself or ask for a backend fix.
24. **Counts disagree with lists.**
    - `translationCount` on `OriginalBookResponse` counts translations of every status.
    - `bookCount` on author and publisher profiles counts originals of every status.
    - The corresponding lists only return PUBLISHED books.
25. **`/authors/{id}/books`, `/publishers/{id}/books` and `/books/original/by-*` return originals only.** A publisher's translated editions are not listed anywhere publicly.
26. **Wiki-style editing has no ownership checks.**
    - Any logged-in user can `PUT` or `DELETE` (soft-delete) any book and change its representative cover.
    - `PUT` also works on DRAFT, HIDDEN and DELETED books, since its lookup has no status filter.
    - Gate these actions in the UI.
27. **`PUT /books/*` counts against the 10/hour UPLOAD limit**, together with creates and cover additions.
28. **Cover `width` and `height` may be null.** Never stretch: fall back to the image's natural size.
29. **Image upload response vs. request field names.** `POST /covers` returns `originalUrl`, but book and cover requests expect `imageUrl`.
30. **`purchaseLinks` always point to Korean stores** (Aladin, YES24, Kyobo), whatever the book's country.
31. **Covers from the DB carry microsecond timestamps** (`…T09:12:31.244374Z`), while values created in-request can have nanoseconds. Parse with `new Date()` or a library; do not regex fixed widths.
