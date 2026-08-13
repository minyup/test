# AGENTS.md

## 명령어

`package.json`은 아직 없다. 현재 실행 가능한 명령은 아래 셋뿐이다.

| 명령 | 결과 |
|---|---|
| `node tools/backlog.mjs list` | 작업 40건이 `LB-101 todo 제목` 형식으로 한 줄씩 출력된다 |
| `node tools/backlog.mjs set <id> <status>` | 해당 작업의 status를 바꾸고 바뀐 한 줄을 출력한다. status는 `todo` `in_progress` `blocked` `done` 중 하나여야 하고, 아니면 종료 코드 1로 실패한다 |
| `node tools/backlog.mjs validate` | 문제가 없으면 `VALID` 한 줄, 있으면 `- 문제` 목록과 종료 코드 1 |

아래 명령은 아직 없다. 해당 작업을 끝낸 뒤에 `issue-radar/package.json`에 생긴다.

| 명령 | 생기는 시점 |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | LB-101 완료 후 |
| `npm test` | LB-128 완료 후 |

`npm` 명령은 전부 `issue-radar/`에서 실행한다. 저장소 루트에서는 실행되지 않는다.

## 구조

| 경로 | 무엇의 기준인가 |
|---|---|
| `AGENTS.md` | 이 문서. 에이전트 지침의 정본이다. Claude Code와 Codex가 같은 내용을 본다 |
| `CLAUDE.md` | `@AGENTS.md` 한 줄짜리 import. 내용을 여기에 적지 않는다 |
| `.agents/skills/` | 두 도구가 함께 쓰는 스킬 원본 |
| `.claude/skills/` | `.agents/skills`를 가리키는 정션. 안에 파일을 직접 만들지 않는다 |
| `.claude/settings.json` · `.claude/settings.local.json` | Claude Code 전용 설정. Codex는 읽지 않는다 |
| `.claude/hooks/guard-backlog.mjs` | 파일 도구가 `backlog.json`에 손대는 것을 막는 훅 |
| `BRIEF.md` | 전체 구상의 기준. 언젠가 만들 것 전부가 여기 있다 |
| `PLAN.md` | 6~8시간 실행 계약의 기준. `BRIEF.md`만 근거로 쓴다 |
| `SPEC.md` | 이번에 만들 것의 기준. 건수·비율·날짜 같은 숫자는 이 문서가 정본이다 |
| `backlog.json` | 작업 목록과 상태의 기준. `LB-101`~`LB-140` 40건 |
| `tools/backlog.mjs` | `backlog.json`을 읽고 쓰는 유일한 통로 |
| `docs/verification/` | 브라우저로 눈으로 확인한 검증의 기록과 캡처. Phase별로 파일 하나를 둔다 |
| `issue-radar/` | 앱 루트. `SPEC.md`의 `data/`·`app/` 경로는 이 폴더 기준으로 읽는다 |
| `issue-radar/data/products.json` | 모니터링 대상 제품의 기준. 제품 추가는 코드가 아니라 이 파일을 고쳐서 한다 |
| `issue-radar/data/feedback_items.json` | 원문 300건의 기준 |
| `issue-radar/data/feedback_analyses.json` | 분석 300건의 기준. 원문과 1:1 |
| `issue-radar/lib/loader.ts` | 저장소를 바꿀 때 갈아끼우는 유일한 파일 |
| `SPEC_opus.md` · `SPEC_sonet.md` · `SPEC_codex_5.6_sol_mid.md` · `backlog_sol.json` | 비교용 초안. 근거로 쓰지 않는다 |

문서 참조는 `BRIEF.md` → `PLAN.md` → `SPEC.md` 한 방향으로만 둔다. 위 문서가 아래 문서를 가리키면 안 된다.

## 항상 지킬 것

- `backlog.json`을 편집기로 열어 고치지 않는다. 상태 변경은 `node tools/backlog.mjs set`으로만 한다.
- `backlog.json`을 고친 뒤에는 `node tools/backlog.mjs validate`가 `VALID`를 내는 것을 확인한다.
- 작업 하나를 `done`으로 바꿀 때마다 커밋을 하나 남긴다. 한 커밋에 작업 하나만 담고, 제목은 `feat: LB-1xx 작업 제목` 형식으로 쓰며, 상태가 바뀐 `backlog.json`도 같은 커밋에 넣는다. 여러 작업을 몰아서 한 번에 커밋하지 않는다 — 검증이 깨졌을 때 어느 작업까지 되돌릴지가 커밋 경계로 드러나야 한다.
- 기록은 추가만 한다. `data/*.json`의 기존 레코드를 덮어쓰거나 지우지 않고, 새 레코드를 뒤에 붙인다.
- 검증이 실패한 작업은 `blocked`로 바꾸고, 그 작업의 `note`에 무엇을 어떻게 조치할지 한 줄을 남긴다. 조치 메모 없이 다음 작업으로 넘어가지 않는다.
- 외부 DB를 붙이지 않는다. 저장소는 `data/` 안의 JSON 파일이고, SQLite·PostgreSQL·ORM 패키지를 설치하지 않는다.
- 앱 실행에 API 키를 쓰지 않는다. `.env`가 없어도 대시보드가 뜨고 300건이 화면에 나와야 한다.
- 데이터에 실제 제품명·브랜드명·실제 사이트 URL·실명을 넣지 않는다. URL은 `https://example.com/`으로 시작하고 작성자는 `익명N`만 쓴다.
- 기준일은 `2026-08-13` 고정이다. 기간 계산에 실행 시각의 오늘 날짜를 읽는 코드를 넣지 않는다.
- 기대값은 `SPEC.md` 8.2·8.3절 표의 숫자를 그대로 적는다. 테스트 안에서 다시 계산해 비교하지 않는다.

## 막히면

- `npm run dev`가 없다고 나오면 `issue-radar/package.json`이 있는지 본다. 없으면 LB-101이 아직 안 끝난 것이다.
- `npm` 명령이 루트에서 실패하면 `issue-radar/`로 들어가서 다시 실행한다.
- `node tools/backlog.mjs`가 "읽을 수 없습니다"로 끝나면 `tools/backlog.mjs` 8번 줄의 `backlogPath`가 `backlog.json`을 가리키는지 확인한다.
- `set`이 "허용되지 않은 상태"로 끝나면 `backlog.json`의 `enums.status` 네 값 중 하나를 썼는지 본다.
- 화면이 흰 채로 뜨면 `issue-radar/data/`에 JSON 파일 세 개가 다 있는지 본다.
- 화면에 스키마 오류가 뜨면 메시지에 찍힌 레코드 id와 필드명을 그 데이터 파일에서 찾아 고친다.
- 건수가 300이 아니면 데이터 파일을 손으로 고치지 말고 `issue-radar/scripts/seed/`를 다시 돌린다.
- 추세 그래프 눈금이 30개가 아니면 차트 설정을 만지기 전에 `trendBySentiment`가 빈 날짜를 0으로 채워 30개를 돌려주는지 먼저 본다.
- 분포 차트 조각이 7개가 아니면 `distributionByCategory`가 건수 0인 카테고리를 빼고 있는지 본다.
- 부정 반응 비율이 `0.0%`로 보이면 0건일 때 `null`을 돌려주는지 본다. 0건은 `—`로 표시한다.
