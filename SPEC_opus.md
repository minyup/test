# 디스플레이 시장 이슈 조기 감지 대시보드 — 기술·기능 명세

- 문서 상태: 초안
- 작성일: 2026-08-12
- 상위 문서: `BRIEF.md`
- 범위: 1단계 로컬 MVP (2단계·3단계는 경계만 정의)

`BRIEF.md`가 "왜, 무엇을"을 정의한다면 이 문서는 "어떻게"를 정의한다. BRIEF에서 열려 있던 결정과 문서 내 충돌을 해소한 결과를 담는다.

---

## 1. 확정된 결정과 잔여 항목

### 1.1 확정 결정

| 항목 | 결정 | BRIEF 참조 |
| --- | --- | --- |
| 기술 스택 | Next.js(App Router) + TypeScript + Prisma + SQLite | 명시 없었음 |
| MVP 수집 출처 | RSS, 네이버 검색 API, Reddit API, YouTube Data API — 4종 | 9장 |
| 분류·요약 방식 | 규칙 기반 + Claude API 보조 하이브리드, 1단계부터 적용 | 5.7, 9장 |
| 원문 저장 범위 | 제목 + 발췌(≤500자) + 링크. 본문 전문은 저장하지 않음 | 14장 6번 |
| 대상 언어 | 한국어 + 영어 | 14장 8번 |

### 1.2 가정 (BRIEF에서 도출, 이견 있으면 수정 필요)

| 항목 | 가정 | 근거 |
| --- | --- | --- |
| 모니터링 제품 | Galaxy S 시리즈, iPhone 시리즈, Galaxy Tab 시리즈 (3종) | 5.6 예시, 9장 "2~3개 제품" |
| 수집 주기 | 1단계 수동 실행만. 2단계에서 6시간 간격 자동화 | 9장 1단계 "수동 수집 실행" |
| 사용 범위 | 1단계는 로컬 단일 사용자, 인증 없음 | 10장 "복잡한 권한 관리" 제외 |
| 기준 시간대 | `Asia/Seoul`. 모든 일자 집계의 하루 경계는 KST 00:00 | 명시 없었음 |

### 1.3 잔여 미결정 (담당자 확인 필요)

- 유료 API 및 Claude API 월 예산 한도
- 사내 정책상 외부 API로 전송 가능한 데이터 범위 (BRIEF 8장)
- 각 API 키의 발급 주체 (개인 계정 vs 사내 계정)
- 원문이 삭제·수정된 경우의 데이터 보관 정책 (BRIEF 8장 "현실적인 제약")

---

## 2. 범위 조정 사항 — BRIEF 대비 변경점

이 절은 BRIEF와 다르게 정한 부분만 모은 것이다.

**(1) 1단계 출처가 1~2개에서 4개로 확대됐다.**
BRIEF 9장은 1단계에 "1~2개 데이터 출처만 연결"을 지시하나, 4종 전부를 채택했다. 각 출처는 인증 방식·응답 스키마·언어가 모두 달라 1단계 작업량이 실질적으로 늘어난다. 이를 흡수하기 위해 공통 `Collector` 인터페이스 + 어댑터 구조로 설계하고, **RSS → 네이버 → Reddit → YouTube 순서로 순차 착수**한다. RSS 어댑터 하나만 완성돼도 앱 전체가 동작해야 한다.

**(2) 영어 콘텐츠가 1단계 범위에 포함된다.**
Reddit과 YouTube를 채택한 결과 BRIEF 14장 8번은 "한/영 동시 지원"으로 확정된다. 키워드 사전, 감성 어휘, 이슈 카테고리 규칙을 한국어/영어 두 벌로 유지한다.

**(3) 제품 관리 화면을 2단계에서 1단계로 앞당긴다.**
BRIEF 9장은 제품 관리 화면을 2단계에 두지만, 2장 핵심 성공 기준은 "코드 수정 없이 제품을 추가·비활성화"를 요구한다. 충돌이므로 1단계에 포함한다.

**(4) 국내 커뮤니티 직접 수집은 1단계에서 제외한다.**
BRIEF 5.1은 "주요 커뮤니티" 수집을 요구하고 8장은 국내 커뮤니티를 "중요"로 두지만, 같은 문서가 "무단 크롤링을 기본 전제로 하지 않는다"고 못 박는다. 디시인사이드·클리앙·뽐뿌 등 국내 주요 커뮤니티는 공개 API나 RSS를 제공하지 않으므로 두 요구를 동시에 만족할 수 없다. **1단계에서는 네이버 검색 API의 블로그·카페 검색 결과를 국내 소비자 반응의 대리 지표로 사용**하고, 커뮤니티 직접 수집은 사이트별 약관 검토 후 별도 판단으로 미룬다.

---

## 3. 기술 스택

| 영역 | 선택 | 비고 |
| --- | --- | --- |
| 프레임워크 | Next.js (App Router) + TypeScript | 화면·API·수집 스크립트를 단일 리포에 둔다 |
| DB | SQLite + Prisma ORM | 3단계 PostgreSQL 전환을 마이그레이션으로 흡수 |
| 스타일 | Tailwind CSS | |
| 차트 | Recharts | 시계열·분포·비교 3종 |
| 수집 실행 | `tsx` 기반 로컬 CLI (`scripts/collect.ts`) | Next 요청 수명주기와 분리. 서버리스 타임아웃 사전 회피 |
| AI | Anthropic SDK, `claude-sonnet-5` | 서버 사이드 전용 |
| 환경변수 | `.env.local` (git 제외) | `NEXT_PUBLIC_` 접두사 금지 |

### 3.1 디렉터리 구조

```text
app/
  page.tsx                 대시보드
  explore/page.tsx         이슈 탐색
  products/page.tsx        제품 관리
  status/page.tsx          수집 상태
  api/                     라우트 핸들러
lib/
  collectors/              rss.ts, naver.ts, reddit.ts, youtube.ts, index.ts
  classify/                rules.ts, sentiment.ts, keywords.ko.ts, keywords.en.ts
  ai/                      client.ts, classify.ts, summarize.ts
  metrics/                 trend.ts, spike.ts
prisma/
  schema.prisma
scripts/
  collect.ts               수동 수집 CLI
```

### 3.2 필요한 환경변수

```text
DATABASE_URL=file:./dev.db
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=
YOUTUBE_API_KEY=
ANTHROPIC_API_KEY=          # 없어도 앱은 동작해야 한다
```

---

## 4. 데이터 모델

BRIEF 7장을 기준으로 하며, 보강한 부분에는 근거를 함께 적는다. SQLite 제약상 배열은 JSON 문자열 컬럼으로 저장한다.

### 4.1 Product

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | String (cuid) | |
| `category` | String | 제품군: smartphone / tablet / laptop / monitor / tv |
| `brand` | String | |
| `name` | String | 예) Galaxy S 시리즈 |
| `aliases` | String (JSON) | 약칭·오탈자. 한/영 혼재 |
| `searchKeywords` | String (JSON) | 한/영 검색 키워드 |
| `excludeKeywords` | String (JSON) | 예) 케이스, 배경화면, case, wallpaper |
| `isActive` | Boolean | |
| `createdAt` / `updatedAt` | DateTime | |

### 4.2 Source

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | String | |
| `name` | String | 예) "네이버 뉴스 검색" |
| `sourceType` | String | news / community / video / blog |
| `baseUrl` | String? | |
| `collectionMethod` | String | rss / naver_api / reddit_api / youtube_api |
| `configJson` | String (JSON) | 어댑터별 설정. RSS URL, subreddit 목록, 채널 ID 등 |
| `isActive` | Boolean | |

### 4.3 FeedbackItem — 원문 메타데이터

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | String | |
| `sourceId` | String | → Source |
| `externalId` | String | 출처가 제공하는 고유 ID (Reddit post id, YouTube comment id 등) |
| `title` | String | |
| `contentExcerpt` | String | **최대 500자.** HTML 태그 제거 후 저장 |
| `originalUrl` | String | |
| `authorName` | String? | 비식별 값만. 채널명 또는 해시. 실명·이메일 저장 금지 |
| `publishedAt` | DateTime? | 출처가 제공하지 않으면 null |
| `collectedAt` | DateTime | |
| `language` | String | ko / en |
| `contentHash` | String | `sha256(정규화 title + excerpt)` |

- `@@unique([sourceId, externalId])` — 같은 출처의 재수집 차단
- `@@index([contentHash])` — 다른 출처에 전재된 동일 기사 탐지
- `@@index([publishedAt])` — 일자별 집계용

중복 판정은 두 단계다. 먼저 `(sourceId, externalId)`로 걸러내고, 통과한 항목을 `contentHash`로 한 번 더 검사한다. 두 번째 단계에서 걸린 항목은 저장하되 `duplicateOfId`로 원본을 가리켜 집계에서 제외한다.

### 4.4 FeedbackAnalysis — 분석 결과

원문과 분석 결과를 분리 저장하라는 BRIEF 5.3 요구를 반영한 별도 테이블이다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | String | |
| `feedbackItemId` | String | → FeedbackItem |
| `productId` | String? | **null 허용.** 제품 매칭 실패 항목 추적용 |
| `issueCategory` | String? | 화질 / 성능 / 소비전력 / 가격 / 내구성 / 발열 / 기타 |
| `issueSubcategory` | String? | 색균일도 / 번인 / 플리커 / 밝기 / 색정확도 / 잔상 등 |
| `sentiment` | String | positive / negative / neutral |
| `summary` | String? | AI 생성 시에만 채움 |
| `keywords` | String (JSON) | |
| `confidenceScore` | Float | 0.0 ~ 1.0 |
| `analysisMethod` | String | `rule` / `ai` / `manual` |
| `analyzedAt` | DateTime | |
| `isUserEdited` | Boolean | **BRIEF 추가분** |
| `editedAt` | DateTime? | **BRIEF 추가분** |

- `isUserEdited`/`editedAt`는 BRIEF 12장 지표 "사용자가 수정한 AI 분류 비율"을 계산하기 위해 추가했다. 이 필드 없이는 해당 지표를 산출할 수 없다.
- `FeedbackItem : FeedbackAnalysis = 1 : N`으로 둔다. BRIEF는 관계를 명시하지 않았으나, 한 기사가 Galaxy와 iPhone을 함께 비교하는 경우가 흔하므로 제품별로 분석 레코드를 나눠야 제품별 언급량 집계가 정확해진다.

### 4.5 CollectionRun — 수집 실행 기록

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | String | |
| `sourceId` | String | |
| `startedAt` / `finishedAt` | DateTime | |
| `status` | String | running / success / partial / failed |
| `itemsFound` | Int | 출처에서 받은 건수 |
| `itemsSaved` | Int | 중복 제거 후 실제 저장 건수 |
| `errorMessage` | String? | |

---

## 5. 수집 파이프라인

### 5.1 공통 인터페이스

```ts
interface RawItem {
  externalId: string;
  title: string;
  excerpt: string;
  url: string;
  author?: string;
  publishedAt?: Date;
  language: 'ko' | 'en';
}

interface Collector {
  id: string;                                    // Source.collectionMethod와 대응
  isConfigured(): boolean;                       // 필요한 키가 있는지
  fetch(product: Product, since: Date): Promise<RawItem[]>;
}
```

처리 순서: **수집 → 정규화 → 중복 판정 → 제품 매칭 → 분류 → 저장**. 새 출처 추가는 어댑터 파일 하나를 추가하고 `lib/collectors/index.ts`에 등록하는 것으로 끝나야 한다.

### 5.2 어댑터별 명세

| 어댑터 | 인증 | 호출 한도 | 언어 | 취할 필드 | 한계 |
| --- | --- | --- | --- | --- | --- |
| `rss` | 없음 | 없음 | ko/en | title, description, link, pubDate | 검색이 아니라 전체 피드 수신 후 키워드 필터. 특정 제품 관련 건수가 적게 잡힌다 |
| `naver_api` | Client ID/Secret | 일 25,000회 (사용 전 최신 한도 재확인) | ko | title, description, link, pubDate | `description`이 요약 스니펫이라 발췌 저장 정책과 정합. HTML `<b>` 태그 제거 필요 |
| `reddit_api` | OAuth2 (앱 등록) | 분당 약 100회 | en | id, title, selftext, permalink, created_utc | 앱 등록 승인 필요. subreddit 목록을 `Source.configJson`에 둔다 |
| `youtube_api` | API Key | 일 10,000 유닛 | ko/en | videoId, commentId, textOriginal, publishedAt | 유닛 소모가 빠르다. 댓글 노이즈(스팸·무관 잡담) 필터 필요 |

각 어댑터는 사용 전 해당 서비스의 최신 요금·호출 한도·데이터 저장 허용 범위를 확인한다 (BRIEF 8장).

### 5.3 제품 매칭

활성 제품마다 `searchKeywords` 중 하나 이상이 `title + excerpt`에 포함되고 `excludeKeywords`가 하나도 포함되지 않으면 매칭한다. 대소문자 무시, 한국어는 공백 변형(`갤럭시S` / `갤럭시 S`)을 정규화한다.

매칭에 실패한 항목도 `productId = null`로 저장한다. 버리면 BRIEF 12장의 "분류되지 않은 항목 비율"을 계산할 수 없고, 키워드 사전의 누락을 발견할 방법도 사라진다.

### 5.4 실패 처리

- 어댑터 단위로 예외를 격리한다. 하나가 실패해도 나머지는 계속 실행하고, 해당 `CollectionRun.status`를 `partial` 또는 `failed`로 남긴다.
- API 키가 없는 어댑터는 `isConfigured()`에서 걸러 조용히 건너뛴다. 오류가 아니다.
- 1단계의 재시도는 수동 재실행이다. 자동 재시도는 2단계.
- 원문 URL이 404를 반환해도 이미 저장된 레코드는 삭제하지 않고 UI에서 "원문 접근 불가"로 표시한다.

---

## 6. 분류 및 AI

### 6.1 2단 구조

**1차 — 규칙 기반 (항상 실행)**

`lib/classify/keywords.ko.ts`, `keywords.en.ts`의 사전으로 이슈 카테고리·세부 이슈·감성을 판정한다. 매칭된 키워드 수와 가중치로 `confidenceScore`를 산출하고 `analysisMethod = 'rule'`로 기록한다.

**2차 — Claude 보조 (키가 있을 때만)**

`confidenceScore`가 임계값 미만이거나 카테고리가 미판정인 항목만 `claude-sonnet-5`로 재분류한다. 배치로 묶어 호출 수를 줄이고, 결과는 `analysisMethod = 'ai'`로 기록한다. 원본 규칙 기반 결과는 덮어쓰지 않고 새 레코드로 남겨 비교 가능하게 한다.

**요약**

대시보드에서 선택한 조건의 상위 게시물을 묶어 온디맨드로 요약한다. 같은 조건의 요약은 캐시해 재호출을 막는다.

### 6.2 AI 없이도 동작해야 한다

`ANTHROPIC_API_KEY`가 없으면 2차 단계 전체를 건너뛴다. 수집·저장·필터·차트·원문 링크는 모두 정상 동작하고, AI 요약 카드만 "AI 미설정" 상태로 표시한다. BRIEF 2장 핵심 성공 기준을 충족하기 위한 필수 조건이다.

AI 호출이 실패해도 같다. 예외를 삼키고 규칙 기반 결과를 그대로 쓴다.

### 6.3 표시 규칙

AI가 생성한 모든 결과는 다음을 함께 표시한다 (BRIEF 5.7, 11장).

- "AI 참고 분석" 배지
- 근거가 된 원문 링크
- `confidenceScore`
- 사실 확정이 아닌 참고용이라는 문구

---

## 7. 화면 명세

### 7.1 `/` 대시보드

- **KPI 4종**: 오늘의 신규 수집 건수 / 부정 반응 비율 / 급증 이슈 수 / 미분류 항목 비율
- **일자별 언급량 추이** (라인) — 제품별 다중 시리즈
- **감성 추이** (스택 영역) — 긍정·부정·중립
- **제품별 비교** (가로 바) — 언급량과 부정 건수 병렬
- **카테고리별 분포** (도넛)
- **급증 이슈 카드** — 아래 정의에 따른 상위 항목 + 각 항목의 대표 원문 링크
- **AI 요약 카드** — 현재 필터 조건 기준. 키 없으면 비활성 상태 표시

**급증 판정**: 최근 7일 일평균이 직전 7일 일평균 대비 증가율 임계값(기본 50%)을 넘고, 최근 7일 최소 건수(기본 5건) 이상인 경우. 두 조건을 모두 요구하는 이유는 1건 → 2건 같은 저건수 변동이 100% 증가로 잡히는 것을 막기 위해서다. 임계값은 설정으로 노출한다.

경보성 단정은 하지 않는다. 게시물 수만으로 실제 품질 문제의 크기를 확정할 수 없다는 BRIEF 8장 제약을 화면에도 반영해, 순위와 변화량을 보여주되 "이상 감지" 같은 확정적 표현은 쓰지 않는다.

### 7.2 `/explore` 이슈 탐색

- **복합 필터** (BRIEF 5.5 전체, 동시 적용 가능)
  - 기간: 오늘 / 최근 7일 / 최근 30일 / 사용자 지정
  - 제품군, 브랜드, 제품
  - 이슈 카테고리, 세부 이슈
  - 소비자 반응
  - 출처 유형, 개별 출처
- **목록**: 제목, 발췌, 제품, 카테고리, 감성, 출처, 작성일, 분석 방식 배지
- **정렬**: 최신순 / 언급량순 / 부정 반응순
- **원문 링크**: 새 탭으로 이동
- **인라인 분류 수정**: 카테고리·감성을 그 자리에서 수정. 저장 시 `analysisMethod = 'manual'`, `isUserEdited = true`

### 7.3 `/products` 제품 관리

- 모니터링 제품 목록 (활성/비활성 구분)
- 추가·수정·비활성화. 삭제 대신 비활성화를 기본으로 한다 (기존 수집 데이터의 참조 무결성 유지)
- 제품별 공식 명칭, 모델명, 약칭, 오탈자, 한/영 키워드, 제외 키워드 편집
- 제품별 수집 대상 출처 선택
- 키워드 저장 시 기존 미분류 항목에 대해 재매칭을 실행할지 묻는다

### 7.4 `/status` 수집 상태

- 출처별 마지막 수집 시각, 상태, 신규 저장 건수
- 최근 `CollectionRun` 이력 (성공/부분/실패)
- 오류 메시지 표시
- 수동 수집 트리거 버튼 (전체 / 특정 출처)
- 각 어댑터의 키 설정 여부 표시

---

## 8. API 라우트

| 메서드 | 경로 | 요청 | 응답 |
| --- | --- | --- | --- |
| GET | `/api/metrics/summary` | `from`, `to`, 필터 | KPI 4종 |
| GET | `/api/metrics/trend` | `from`, `to`, `groupBy=day`, 필터 | 일자별 시계열 |
| GET | `/api/metrics/distribution` | `dimension=category\|product\|sentiment`, 필터 | 분포 |
| GET | `/api/metrics/spikes` | `window=7`, 임계값 | 급증 이슈 목록 |
| GET | `/api/items` | 필터 + `sort` + `page` | 수집 항목 페이지 |
| PATCH | `/api/analysis/:id` | `issueCategory`, `sentiment` 등 | 수정된 분석 결과 |
| GET/POST | `/api/products` | | 제품 목록 / 생성 |
| PATCH | `/api/products/:id` | | 수정·비활성화 |
| GET | `/api/sources` | | 출처 목록 + 설정 상태 |
| POST | `/api/collect` | `sourceId?` | `CollectionRun` id |
| GET | `/api/runs` | `limit` | 수집 이력 |
| POST | `/api/ai/summary` | 필터 조건 | 요약 텍스트 + 근거 링크 |

공통 필터 파라미터: `from`, `to`, `productIds`, `productCategory`, `brand`, `issueCategory`, `issueSubcategory`, `sentiment`, `sourceType`, `sourceIds`.

---

## 9. 비기능 요구사항

BRIEF 11장을 검증 가능한 문장으로 재작성했다.

| 항목 | 검증 가능한 기준 |
| --- | --- |
| 원문 추적성 | 목록·차트·AI 요약의 모든 항목에서 클릭 1회로 `originalUrl`에 도달한다 |
| 데이터 신뢰성 | 같은 게시물을 두 번 수집해도 `itemsSaved`가 증가하지 않는다. 수집 실패는 `/status`에서 확인된다 |
| 수정 가능성 | 목록에서 카테고리·감성을 수정할 수 있고, 수정 사실이 `isUserEdited`로 남는다 |
| 확장성 | 새 출처 추가 = 어댑터 파일 1개 + 등록 1줄. 새 제품 추가 = 화면 조작만, 코드 수정 없음 |
| 보안 | API 키는 서버 사이드에서만 참조한다. `NEXT_PUBLIC_` 접두사를 쓰지 않고, 브라우저 번들과 API 응답에 키가 포함되지 않는다 |
| 개인정보 보호 | `authorName`에 실명·이메일·프로필 URL을 저장하지 않는다 |
| 법적 준수 | 본문 전문을 저장하지 않는다. 출처별 이용약관·`robots.txt`·API 정책을 어댑터 추가 시 확인한다 |
| 설명 가능성 | AI 결과에는 분석 방식, 신뢰도, 참고용 표시, 근거 링크가 항상 함께 표시된다 |

---

## 10. 지표 산출 정의

BRIEF 12장 지표가 위 스키마만으로 계산 가능함을 확인한다.

| 지표 | 산출 |
| --- | --- |
| 제품별 일간 언급량 | `FeedbackAnalysis`를 `productId` + `publishedAt` 일자로 집계 |
| 제품별 부정 반응 건수/비율 | 위에 `sentiment='negative'` 조건 |
| 카테고리별 언급량 | `issueCategory`로 집계 |
| 전일·전주 대비 증가율 | 일자별 집계의 시프트 비교 |
| 신규 이슈 키워드 수 | 기간 내 `keywords` 중 직전 기간에 없던 항목 수 |
| 출처별 수집 성공률 | `CollectionRun`의 `status='success'` 비율 |
| 미분류 항목 비율 | `productId IS NULL` 또는 `issueCategory IS NULL` 비율 |
| 사용자 수정 AI 분류 비율 | `isUserEdited=true` / `analysisMethod='ai'` |

---

## 11. 범위 밖 (1단계 제외)

BRIEF 10장 제외 목록에 다음을 더한다.

- 사용자 인증 및 권한 관리
- 이메일·Slack·Teams 알림
- PostgreSQL 이전 및 Vercel 배포
- 국내 커뮤니티 직접 크롤링
- 자동 수집 스케줄링 (2단계)
- 자동 재시도 (2단계)
- 번역 기능 — 영어 콘텐츠는 원문 그대로 표시하고 영어 키워드 사전으로 분류한다

---

## 12. 제약 및 리스크

- **국내 커뮤니티 공백**: 2절 (4)에 기술. 국내 소비자 반응은 네이버 블로그·카페 검색 결과에 의존하므로 실제 커뮤니티 여론과 편차가 있을 수 있다.
- **원문 전문 미저장**: 분류 정확도가 발췌 품질에 종속된다. 발췌만으로 판단이 어려운 항목은 사용자가 링크를 열어 확인해야 하고, 원문이 삭제되면 근거 확인이 불가능해진다.
- **감성 분석 한계**: 반어법, 전문 용어, 복합 평가("화질은 좋은데 발열이 심하다")를 오분류할 수 있다. 분류 수정 UI가 이를 보완하는 유일한 수단이다.
- **게시물 수 ≠ 문제 규모**: 언급량 급증이 품질 결함을 증명하지 않는다. 마케팅 캠페인, 신제품 출시, 무관한 화제로도 급증한다.
- **API 한도**: 제품 3종 × 출처 4종의 조합에서 YouTube 유닛이 가장 먼저 소진될 가능성이 높다. 수집 대상 출처를 제품별로 선택할 수 있게 한 이유다.

---

## 13. 완료 기준

BRIEF 10장의 핵심 질문 — *"최근 7일 동안 모니터링 중인 제품에서 어떤 이슈가 증가했으며, 사용자 반응은 어떠하고, 그 근거가 되는 원문은 무엇인가"* — 에 대시보드에서 화면 이동 3회 이내로 답할 수 있으면 1단계 완료로 본다.

세부 인수 조건:

1. 제품 3종을 화면에서 등록하고, 코드 수정 없이 다음 수집부터 반영된다.
2. 4개 어댑터 중 설정된 것들이 실행되고, 미설정 어댑터는 오류 없이 건너뛴다.
3. 같은 수집을 두 번 실행해도 중복 저장이 발생하지 않는다.
4. 필터 5종 이상을 동시에 적용해도 목록과 차트가 일관된 결과를 낸다.
5. 일자별 추세와 최근 7일 대비 결과가 DB 원본 집계와 일치한다.
6. 모든 목록 항목에서 원문으로 이동할 수 있다.
7. `ANTHROPIC_API_KEY`를 제거해도 수집·조회·규칙 기반 분석이 정상 동작한다.
8. AI 결과에 분석 방식·신뢰도·참고용 표시가 남는다.
9. 수집 실패 내역을 `/status`에서 확인하고 재실행할 수 있다.
10. 잘못된 자동 분류를 화면에서 수정할 수 있고, 수정 이력이 기록된다.

---

## 14. 2단계·3단계 경계

1단계 구현 시 다음을 염두에 두되 구현하지는 않는다.

- **2단계**: 수집 CLI를 스케줄러가 그대로 호출할 수 있도록 CLI 진입점을 순수 함수로 유지한다. 자동 재시도, 유사 이슈 클러스터링, 급증 이슈 AI 요약.
- **3단계**: DB 접근을 Prisma로 일원화해 PostgreSQL 전환 시 스키마 마이그레이션만으로 끝나게 한다. 수집 로직을 Next 요청 핸들러에 넣지 않아 별도 실행 환경으로 분리 가능하게 유지한다. 인증·권한·알림.
