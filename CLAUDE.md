# CLAUDE.md — coverage-frontend

COVERAGE의 사용자용 웹. "An Experimental Digital Museum of Book Cover Art" — 북커버를 독립된 시각 예술로 수집·감상하는 실험적 디지털 뮤지엄.
현재 진행 상황과 다음 할 일은 `HANDOFF.md` 참고.

## 형제 저장소 (`~/Documents/COVERAGE/`)
- `coverage-backend` — Spring Boot 3.2 API (`/api`, JWT). 프론트가 기대하는 계약: `docs/API_CONTRACT.md` (백엔드 소스에서 도출), 타입: `src/lib/api/types.ts`
- `coverage-backoffice` — 관리자 화면 (이 저장소와 무관하게 동작)
- `changbi-press` — 창비 보도자료 원본(표지 이미지·`books.json`). 이 저장소의 목업 데이터 출처

## 명령어
```bash
npm install
npm run dev            # 목업 데이터 모드 (기본), http://localhost:3000
npm run mock-api       # 계약서를 따르는 목업 백엔드 :4010 (demo@coverage.test / coverage123)
npm run dev:api        # API 모드로 목업 백엔드에 붙기
COVERAGE_API_ORIGIN=http://localhost:8080 NEXT_PUBLIC_DATA_SOURCE=api npm run dev   # 실제 백엔드
npm run build          # API 모드 빌드는 COVERAGE_API_ORIGIN 이 살아 있어야 홈이 채워짐
npm run data           # data/changbi-meta.json → src/data/artworks.json
npm run covers         # ../changbi-press/covers 원본 → public/covers/{id}-640/-1400.webp (있는 건 건너뜀, --force 로 전부 재생성)
npx tsc --noEmit       # 타입 검사
npm run lint           # ESLint (next/core-web-vitals + typescript). 경고 0 유지
npm run e2e            # Playwright E2E. mock-api(:4110), API 모드 dev(:3100, .next-e2e), 목업 모드 dev(:3101, .next-e2e-mock)를 스스로 띄움. public/covers 필요(npm run covers), 최초 1회 npx playwright install chromium
```
- tsc가 `.next/types`·`.next-e2e/types` 관련 에러를 내면 소스 문제가 아님. `next-env.d.ts`는 마지막에 돌린 `next dev`/`build`/`e2e`의 distDir를 가리키므로, 해당 폴더를 지웠다면 `npm run dev`를 한 번 띄우거나 `rm -rf .next/types` 후 재실행.

## 테스트
- 프로젝트 둘: `api`(`e2e/*.spec.ts`, API 모드 + `scripts/mock-api.mjs`, 목업 데이터 모드와 같은 컴포넌트 + 로그인·좋아요·전시)와 `mock`(`e2e/mock/`, 목업 데이터 모드의 localStorage 즐겨찾기·전시). 포트와 `distDir`가 따로라 `npm run dev`를 켜 둔 채 돌려도 됨. `e2e/global-setup.ts`가 `public/covers`가 비었으면 바로 실패시킴
- mock-api의 `GET /api/__requests`는 받은 요청 경로 로그(테스트 전용) — 차단된 id가 백엔드에 닿지 않았음을 확인할 때 씀
- 다루는 것: 표지 비율 왜곡 0(`img.art`의 offset 크기 vs natural 크기), 그리드 행·팬·비교의 높이 통일, 가입 검증 `details` 표시, 좋아요, 전시 생성·링크 공개·익명 공유, 잘못된 액세스 토큰 → 갱신 → 재시도, 갱신 5xx에도 세션 유지, 두 탭 동시 갱신, UUID가 아닌 라우트 id → 404(백엔드 호출 없음), 비공개 전환 즉시 공유 링크 404, 크기 없는 표지의 전시실 높이 통일, Compare 오버플로·포커스 트랩·복귀, 보안 헤더, 폰트 파일 500KB 미만, API 모드 JS에 목업 데이터 없음
- 셀렉터는 role·label·aria-label 기준. 새 UI에 테스트가 붙을 수 있게 접근성 이름을 유지할 것

## 스택
Next.js 15.5 App Router · React 19 · TypeScript · Tailwind CSS 4 (`@theme` 토큰) · motion 12. 폰트는 npm에서 셀프호스팅 — @fontsource는 `next/font/local`, Pretendard는 패키지의 dynamic-subset CSS(유니코드 범위별 조각, `layout.tsx`에서 import). Google Fonts 쓰지 말 것.

## 데이터 소스 (빌드 시 결정)
- `NEXT_PUBLIC_DATA_SOURCE=mock`(기본): `src/data/artworks.json`, 즐겨찾기·전시는 localStorage(`src/lib/store.ts`)
- 목업 데이터셋과 거기서 파생한 값(`ARTWORKS`·`BY_ID`·`YEARS`·`related` 등)은 `src/lib/mockData.ts`에만. `artworks.ts`는 타입과 순수 헬퍼만 두어 API 모드 클라이언트 번들에 JSON이 실리지 않게 함. 페이지에서 목업 전용 화면은 `process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? () => null : dynamic(...)`로 — `USE_API`로 쓰면 빌드 시 접히지 않아 번들에 남음
- `api`: `src/lib/api/*`. 백엔드에 CORS가 없어 `next.config.ts` rewrite가 `/api/*`를 `COVERAGE_API_ORIGIN`으로 넘김. 서버 렌더링은 `${COVERAGE_API_ORIGIN}/api`로 직접 호출
- 컴포넌트는 두 모드 모두 `Artwork`/`Edition` 뷰모델(`src/lib/artworks.ts`)만 소비. 백엔드 응답 → 뷰모델 변환은 `src/lib/api/adapt.ts` 한 곳에서
- 페이지/컴포넌트의 분기 방식: `USE_API ? <XApi/> : <X/>` (예: `ArchiveExplorerApi`, `CollectionsIndexApi`, `CollectionRoomApi`, `CollectionPickerApi`)

## 구조 메모
- 라우트 id: API 모드는 `o-<uuid>`(원서) / `t-<uuid>`(번역서) — `routeId`/`parseRouteId`. 컬렉션 항목은 `c-<coverId>`
- `session.ts`: 토큰은 localStorage `coverage:session`. 리프레시 토큰은 1회용이라 갱신은 반드시 `refreshOnce()`(탭 안 single-flight + 탭 간 Web Lock `coverage:refresh`)로만. 400/401만 세션 종료, 5xx·네트워크 오류는 유지, 갱신 중 로그아웃·계정 전환이면 응답 버림
- `client.ts`: `api()`가 Bearer 부착, 401이면 한 번 갱신 후 재시도. 백엔드는 대부분의 실패(틀린 비밀번호, 소유자 아님, 비공개)를 **400**으로 줌
- `useWork.ts`: 검색 히트(가벼운 Artwork)를 작품별 보기 카드가 마운트될 때 전체 작품(원서+번역서)으로 확장, 동시성 6
- 작품(work) = 원서 + 번역서. 백엔드에 Work 엔드포인트가 없음
- 공개 컬렉션 열람: `GET /collections/{id}`는 PUBLIC이어도 로그인 필요, 익명은 `/c/[token]`(shared)만 가능

## 반드시 지킬 디자인 규칙 (사용자가 명시)
- **표지는 원본 비율을 무조건 유지. 억지로 늘리거나 crop하지 않는다.** 높이를 맞추고 폭은 비율로 계산(`calc(h * w/h)`), 비율을 모르면(`ratioUnknown`, API의 width/height null) 이미지 자연 크기에 맡김. `object-fit: cover`/고정 aspect-ratio 박스 금지
- 그리드·전시·비교·팬 모두 **높이 통일**(들쭉날쭉 금지)
- **필름 그레인은 표지 위에 절대 올리지 않는다** — 고정 그레인 레이어는 `main`(z-[1]) 아래(z-0)
- 오로라: SVG 베지어 리본 + `feGaussianBlur`, 과감한 곡선, 채도는 유지하되 흐리게(`SOFTNESS=1.6`, `SATURATION=1`). 리본은 천천히 sway, 화면 밖이면 정지. 점 모양 blob으로 되돌리지 말 것
- 다크모드: 배경 검정, 그레인 흰색(screen). `[data-theme="dark"]` 변수 오버라이드, 레이아웃의 부트 스크립트가 페인트 전에 테마 적용
- 상단바: 애플식 글래스(`.glass-bar`, `saturate(180%) blur(20px)`)
- 여러 판본: **작품별 보기**가 기본. 카드에 호버하면 모든 판본이 촤라락 펼쳐짐(`EditionsFan`), 판본이 많으면 카드처럼 겹치고 12개 초과는 "+N → Compare"
- 사용자가 빼라고 한 것 — 다시 넣지 말 것: "PICK TWO → SPLIT INSPECT", scale(실제 크기) 토글
- `prefers-reduced-motion` 존중, 키보드 접근(Escape 닫기, focus) 유지. 모달(Compare·Inspect)은 `useDialogFocus`로 포커스 가두기·연 버튼으로 복귀

## 이미지·권리
- `public/covers/{id}-640.webp`, `-1400.webp`는 **git에 없음**(.gitignore). 창비 보도자료 이미지라 공개 배포 전 창비 허락 확인 필요
- 생성: `npm run covers` (`scripts/build-covers.mjs`, sharp). `data/changbi-meta.json`의 각 항목을 `../changbi-press/covers`의 `{id}` 또는 `{id}_*` 파일과 width×height로 대조해 폭 640/1400 WebP로 만든다(확대 없음, 비율 유지, CMYK는 sRGB로). 원본 폴더는 `COVERS_SRC`로 바꿀 수 있음

## Git
- 기본 브랜치 `main`. 새 작업은 최신 `main`에서 새 브랜치를 만들어 하고 PR로 합친다(`main`에 직접 커밋하지 않음). **push하지 않는다** (사용자가 요청할 때만)
- 커밋 메시지는 한국어. 작성자: `git -c user.name="Maestr Oh" -c user.email="ohho0506@gmail.com" commit`
