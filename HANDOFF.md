# HANDOFF — 2026-11-06

이전 세션(Claude Code)에서 이어받는 메모. 공통 규칙은 `CLAUDE.md`.

## 지금 상태
- 2026-11-06: `feat/frontend`를 PR #1로 `main`에 스쿼시 머지(`2a962da`)하고 브랜치 삭제. 아래 커밋 해시는 그 브랜치의 기록(지금 `main`에는 한 커밋으로 합쳐짐)
  - `d05ae6a` COVERAGE 프론트엔드 초기 구현 (목업 데이터)
  - `f172718` 백엔드 API 연동 (검색·작품·로그인·좋아요·전시)
  - `3ffab6b` Claude Code 이어받기용 CLAUDE.md, HANDOFF.md 추가
  - `9b6666b` 표지 파일이 없을 때 빈 액자 표시 · `e2b18a1` 빈 캡션·섹션 정리 · `68e366a` watcher `.playwright-mcp/` 제외 · HANDOFF 갱신 — 아래 "2026-11-04 세션에서 한 것" 참고. `npx tsc --noEmit` 통과, `next build` API/mock 두 모드 통과
  - 2026-11-05: 표지 이미지 생성 스크립트(`npm run covers`) — 아래 "2026-11-05 세션" 참고
  - 2026-11-05: ESLint + Playwright E2E 세팅, `changbi-press` 압축 파일 정리 반영
  - 2026-11-05: 브랜치 push, PR #1(https://github.com/Dodant/coverage-frontend/pull/1). 보안 리뷰 반영 — `5b0552f` URL 유래 값 차단(`safeNext`·API 경로 세그먼트 인코딩·UUID 검증→404), `39361a4`·`b6143fd` `safeNext`를 URL 해석으로, `9218a10` 팬 테스트 경합 수정. `/review` 결과는 아래 "2026-11-05 리뷰" 참고
- 구현된 페이지: `/`, `/archive`, `/artwork/[id]`, `/collections`, `/collections/[id]`, `/c/[token]`, `/login`, `/signup`, `/account`
- **실제 백엔드로 검증 완료 (2026-11-04)** — `coverage-backend` `docker compose up -d` + `./gradlew bootRun`, 프론트 `COVERAGE_API_ORIGIN=http://localhost:8080 NEXT_PUBLIC_DATA_SOURCE=api npm run dev`
  - 응답 형태는 `docs/API_CONTRACT.md`·`scripts/mock-api.mjs`와 일치. `adapt.ts`/`endpoints.ts` 수정 불필요
  - 확인한 것: `browse/{genre,country,year}`에 `sort=createdAt,desc` 허용(엉뚱한 sort 필드는 500) · `search` `sortBy`는 RELEVANCE/LIKES/NEWEST/YEAR_ASC/YEAR_DESC · 표지 `width/height`는 251건 중 86건 null(→ `ratioUnknown` 경로) · 회원가입 검증 `details`가 필드별로 매핑돼 폼에 표시됨 · 잘못된 액세스 토큰 → 401 → `POST /auth/refresh` → 재시도 200(토큰 회전 확인) · 리프레시 토큰 재사용 400 · 좋아요 토글 · 전시 생성/항목 추가/공개범위 변경/서문 · 익명 `/c/[token]` · `/account`
  - 브라우저(Playwright)에서 홈·아카이브·검색·작품·전시·공유·계정 확인, 표지 비율 왜곡 0건

## 2026-11-05 세션에서 한 것
- ESLint: `eslint.config.mjs`(FlatCompat로 `next/core-web-vitals` + `next/typescript`), `npm run lint` = `eslint .`, 기준 경고 0. Playwright: `playwright.config.ts`(mock-api :4110 + API 모드 dev :3100, `distDir` `.next-e2e`), `e2e/{helpers,covers.spec,auth.spec,routes.spec}.ts` 10건 통과(약 20초 + 서버 기동; `public/covers`가 있어야 함). `next.config.ts`에 `distDir: process.env.NEXT_DIST_DIR`
- `../changbi-press/` 전송용 압축 5개 삭제(사용자 확인). 표지는 `npm run covers`로 재생성
- `scripts/build-covers.mjs` + `npm run covers` + devDependency `sharp`: `../changbi-press/covers` 원본 → `public/covers/{id}-640/-1400.webp`. 271건 전부 원본과 width×height 일치 확인(모호한 후보 3건도 치수로 구분됨). 기존 tar 세트와 비교: 파일 목록 동일, 치수 동일(1px 반올림 2건), CMYK 14건은 ICC 변환이라 색이 약간 다름(깨짐 없음). CLAUDE.md·README 갱신

## 2026-11-04 세션에서 한 것 (커밋됨)
- `ArtworkImage`: 파일이 없거나 로드 실패한 표지는 깨진 이미지 대신 **빈 액자(`.art-missing`, 점선+해칭)** 를 표지 비율로 유지 → 그리드 높이 통일 유지. `EditionsRail`/`EditionsFan`/`CompareOverlay`의 raw `<img>`도 실패 시 기존 `EditionPlaceholder`로 전환
- `ArtworkViewer`: 관련 작품이 없으면 "In conversation" 섹션 숨김
- `CollectionGallery`·카드 alt/sr-only: 저자·연도가 없을 때 "·"만 남는 캡션 제거
- `next.config.ts`: 웹팩 watcher가 `.playwright-mcp/`를 무시(브라우저 자동화 로그가 Fast Refresh를 무한 재빌드시키던 문제). `.gitignore`에 `.playwright-mcp/` 추가

## 개발 DB 상태 (백엔드 쪽에 알릴 것)
- 251 표지 중 **실제 이미지가 있는 건 27건**(`/bookcovers/cover/…`). 나머지는 smoke 테스트 잔재(`신고 테스트 표지`, `QA숨김…`, `first.jpg`, `a_t.jpg`, `http://x/…`) → 홈·아카이브 "latest"가 잔재로 채워짐. 실제 책: 채식주의자 원서 + 번역서 14종 등
- ES `book_covers` 인덱스에 삭제된 책 2건이 남아 있어 상세 조회가 404 (`239a6974-…`, `907da8a2-…`). 프론트는 해당 히트를 버림. `POST /admin/search/reindex`로 정리 가능
- 검증용 계정: `probe1793789149@coverage.test` / `coverage123` (전시 "실백엔드 검증" 1개, LINK_ONLY). 그 외 `probe<timestamp>@coverage.test` 계정 2개 생성됨 — 지워도 됨
- RustFS `bookcovers` 버킷은 익명 GetObject 허용돼 있음(브라우저에서 `localhost:9000` 직접 로드)

## 다음 할 일 (우선순위)
1. 백엔드 쪽에 요청할 만한 것 (README "Backend gaps"):
   - 컬렉션 항목 → 책 정보(표지→책 조회 또는 항목 응답에 책 요약). 지금은 이 브라우저가 추가할 때 기억한 `coverIndex`로만 제목/링크 표시, 그 외는 "Archived cover"
   - 내가 좋아요한 표지 목록 (API 모드엔 Saved 페이지 없음)
   - 전시 항목 순서 필드 (재정렬 불가)
   - `/collections/public` 요약에 `shareToken`, 또는 공개 컬렉션 익명 GET 허용
   - Work(작품) 엔드포인트(현재 작품별 보기는 히트마다 2~3회 호출), 검색 facet 집계(항상 빈 값), CORS
   - 개발 DB smoke 잔재 정리 + 삭제 책 reindex (위 참고)
2. 공개 배포 전 창비 표지 사용 권한 확인
3. (선택) CI: `npm run lint && npx tsc --noEmit`을 GitHub Actions로. `npm run e2e`는 `public/covers`(창비 이미지, git 밖)가 있어야 돌아가므로 권한 확인 전에는 CI에 넣지 말 것

## 참고
- 디자인 캔버스(Claude artifact, Design type): https://claude.ai/code/artifact/20e87c3f-a17c-4649-a741-2016b5b69f76
- 백엔드 계약서: `docs/API_CONTRACT.md` — 백엔드 소스 기준 2026-11-04 도출, 실서버로 2026-11-04 검증. 백엔드가 바뀌면 갱신 필요
- 브라우저 검증 시 Playwright MCP 산출물은 `.playwright-mcp/`(gitignore, watcher 제외)

## 2026-11-05 리뷰 (`/review`, PR #1 기준 b6143fd)
- 자동 수정 68건 + 문서 10건은 `526f469`…`d5eb565` 9개 커밋으로 반영됨(세션 JSON 검증, 목업 API 계약 불일치 4건, `?by=` 검증·URL 동기화, 전시실 fetch alive 가드·더블클릭 방지, 좋아요 경합, "Nonfiction"→fiction·언어 표기 오류, 로그인 뒤 /login 재진입 방지, 서버 fetch 10초 타임아웃, 죽은 코드·stale 문서 정리 등). tsc·lint·E2E 10건·mock 빌드 통과 확인
- 사용자가 승인한 수정은 2026-11-06에 반영(아래 "2026-11-06 세션"): 세션 5xx 유지·늦은 refresh 응답 무시·계정 전환 재로드·401 재시도(`session.ts`/`client.ts`/`AccountView`), 탭 간 refresh Web Locks, 보안 헤더 + `getSharedCollection` no-store, 전시실 높이 통일(`CollectionGallery` rowHeight, 팬 2곳, `EditionsFan` 측정 비율, `ArtworkCard` 하이드레이션 전 로드), Compare 오버플로 + Compare/Inspect 포커스 트랩·복귀, 서문 자동저장 덮어쓰기 제거 + 추가 시 선택 판본 기억, `EditionsRail` Item 호이스팅 + 번역 히트 중복 호출 제거, Pretendard 동적 서브셋, 목업 데이터 번들 분리, 목업 모드 E2E 프로젝트 + covers 사전조건, 컬렉션 100개 초과 페이지네이션
- Skip으로 기록: 판본 팬 Escape(window keydown) · reduced-motion MotionConfig · 홈 ISR 오류 캐시 · advisory 정리

## 2026-11-06 세션
- 리뷰에서 승인된 수정 반영. 먼저 써 둔 테스트(수정 전 9건 빨강)를 적용한 뒤 구현, E2E 26건 통과(api 24 + mock 2), tsc·lint, `next build` 목업·API 두 모드 통과
  - 세션: 갱신 400/401만 종료(5xx 유지), 갱신 중 로그아웃·계정 전환이면 응답 버림, 탭 간 Web Lock, 401 때 다른 호출이 이미 회전한 토큰으로 재시도. `AccountView`는 계정 전환 시 다시 로드
  - `next.config.ts` 보안 헤더(frame-ancestors 'none', X-Frame-Options, nosniff, Referrer-Policy), 공유 링크 no-store
  - 전시실 Wall/Shelf/Salon과 팬 2곳이 크기 없는 표지도 같은 높이, `EditionsFan`은 로드된 이미지 비율로 배치, `ArtworkCard`는 하이드레이션 전에 끝난 이미지 비율도 읽음
  - Compare 오버플로 시 첫 판본 접근 가능, Compare·Inspect 포커스 트랩·복귀(`useDialogFocus`)
  - 서문 입력 중 다른 수정의 응답이 덮어쓰지 않음, 다른 판본을 고른 채 저장하면 그 판본의 경로·제목으로 기억
  - 번역 히트의 원서 조회를 `fetchWork`로 합쳐 중복 요청 제거, `EditionsRail` Item 모듈 스코프로
  - Pretendard 2MB 단일 파일 → dynamic subset, 목업 데이터셋을 `mockData.ts`로 분리하고 목업 전용 화면은 빌드 시 접히는 분기로
  - 내 전시 100개 초과도 모두 불러옴(`allMyCollections`)
- 탭 간 갱신 테스트는 경합 테스트라 Web Lock을 빼도 3번 중 1번만 실패함(잡기는 함)
- 리뷰 재실행(`/review`)은 아직 안 함

