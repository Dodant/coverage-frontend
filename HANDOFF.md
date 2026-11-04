# HANDOFF — 2026-11-04

이전 세션(Claude, Cowork)에서 이어받는 메모. 공통 규칙은 `CLAUDE.md`.

## 지금 상태
- 브랜치 `feat/frontend` (push 안 함)
  - `d05ae6a` COVERAGE 프론트엔드 초기 구현 (목업 데이터)
  - `f172718` 백엔드 API 연동 (검색·작품·로그인·좋아요·전시)
- 구현된 페이지: `/`(Hero·Featured Exhibition·Archive·A World of Colour·Unexpected Discoveries·Private Exhibitions·Art Beyond the Story), `/archive`, `/artwork/[id]`(뷰잉룸·판본 레일·Compare·Inspect), `/collections`, `/collections/[id]`, `/c/[token]`, `/login`, `/signup`, `/account`
- 검증: `scripts/mock-api.mjs`(목업 백엔드)로 Playwright E2E — 검색→작품→로그인 실패/성공→좋아요→전시 추가/생성→공개범위·서문 저장→항목 삭제→익명 공유 페이지→토큰 갱신 모두 통과. 표지 비율 왜곡 0건. mock/API 두 모드 `next build` 통과
- **실제 백엔드로는 아직 검증 안 됨** (이전 환경에서 맥 localhost:8080에 접근 불가였음)

## 다음 할 일 (우선순위)
1. **실제 백엔드로 검증**: `coverage-backend` 실행 후 `COVERAGE_API_ORIGIN=http://localhost:8080 NEXT_PUBLIC_DATA_SOURCE=api npm run dev`
   - 확인할 것: 검색/브라우즈 응답 형태(특히 `browse/{facet}`의 `sort=createdAt,desc` 허용 여부), 표지 URL·width/height, 회원가입 검증 메시지(`details`), 401→refresh 흐름, 컬렉션 CRUD
   - 목업과 다르게 동작하면 `src/lib/api/adapt.ts` / `endpoints.ts`를 고치고 `scripts/mock-api.mjs`도 같이 맞출 것
2. 백엔드 쪽에 요청할 만한 것 (현재 프론트가 우회 중, README "Backend gaps"에 정리):
   - 컬렉션 항목 → 책 정보(표지→책 조회 또는 항목 응답에 책 요약). 지금은 이 브라우저가 추가할 때 기억한 `coverIndex`로만 제목/링크 표시, 그 외는 "Archived cover"
   - 내가 좋아요한 표지 목록 (API 모드엔 Saved 페이지 없음)
   - 전시 항목 순서 필드 (재정렬 불가)
   - `/collections/public` 요약에 `shareToken`, 또는 공개 컬렉션 익명 GET 허용
   - Work(작품) 엔드포인트, 검색 facet 집계(현재 항상 빈 값), CORS
3. 표지 이미지 생성 스크립트 추가 (`changbi-press/covers` → 640/1400 WebP, 원본 비율 유지). 현재는 tar 백업에 의존
4. 테스트/린트 세팅 (Playwright E2E를 저장소로 옮기기, ESLint 설정)
5. 공개 배포 전 창비 표지 사용 권한 확인

## 정리 대기
`../changbi-press/`에 이전 파일 전송용 압축들이 남아 있음 — 사용자 확인 후 삭제:
`_backend_src.tgz`, `_coverage_frontend_src.tgz`, `_coverage_works_update.tgz`, `_coverage_dark.tgz` (불필요)
`_coverage_assets.tar` (~107MB)는 `public/covers` 유일한 백업이므로 3번 전엔 지우지 말 것

## 참고
- 디자인 캔버스(Claude artifact, Design type): https://claude.ai/code/artifact/20e87c3f-a17c-4649-a741-2016b5b69f76
- 백엔드 계약서: `docs/API_CONTRACT.md` — 백엔드 소스 기준 2026-11-04 도출. 백엔드가 바뀌면 갱신 필요
