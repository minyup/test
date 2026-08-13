# issue-radar

디스플레이 시장 이슈 조기 감지 대시보드. 명세는 저장소 루트의 `SPEC.md`가 정본이다.

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

`.env`가 없어도 뜬다. 앱 실행에 API 키를 한 개도 쓰지 않는다(SPEC 8.4).

## 차트 라이브러리

**Recharts를 쓴다** — 검증(SPEC 8.1 Phase 3)이 "x축 눈금 30개 / 조각 7개"를 세는 방식인데,
Recharts는 SVG로 그려서 눈금과 조각이 각각 하나의 DOM 노드로 남아 브라우저에서 그대로 셀 수 있다.
canvas로 그리는 라이브러리는 화면에 보이더라도 셀 DOM이 없다.

### 눈금과 조각을 어떻게 세는가

Recharts 3.10 기준이며, 아래 선택자는 실제 DOM에서 확인한 것이다.
셀 때 두 가지를 조심해야 한다.

**1. 축 눈금은 선과 글자가 서로 다른 자리에 그려진다.** Recharts 3.x는 눈금선을
`.recharts-xAxis` 안에 두지만, 눈금 글자는 `.recharts-zIndex-layer_2000`이라는 별도
레이어로 끌어올린다. 그래서 `.recharts-xAxis text`로 찾으면 **0개가 나온다** — 화면에는
분명히 보이는데도 그렇다. 글자를 세려면 축 하위가 아니라 tick-labels 그룹을 직접 잡는다.

```js
// 눈금 글자 (사람이 보는 "눈금")
document.querySelectorAll('.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value').length
// 눈금선
document.querySelectorAll('.recharts-xAxis-tick-lines .recharts-cartesian-axis-tick').length
```

**2. 조각은 `.recharts-sector`다.** 범례는 차트마다 따로 세야 하는데, 파이 차트를 가리키는
클래스가 따로 없으므로 `.recharts-pie`를 품은 `.recharts-wrapper`로 범위를 좁힌다.

```js
document.querySelectorAll('.recharts-pie .recharts-sector').length   // 조각 7개
const pie = [...document.querySelectorAll('.recharts-wrapper')].find(w => w.querySelector('.recharts-pie'));
pie.querySelectorAll('.recharts-legend-item').length                 // 범례 7개
```

**3. `<XAxis interval={0}>`을 반드시 준다.** 기본값에서 Recharts는 축이 좁으면 눈금을 스스로
솎아 낸다. 30일 추세에서 이 옵션이 없으면 눈금이 30개가 아니라 5~6개로 나온다.
눈금 수가 안 맞으면 차트 설정을 만지기 전에 이 옵션부터 본다(LB-132).

**4. 서버 렌더 HTML에는 SVG가 없다.** Recharts 3.x는 `.recharts-wrapper` div만 서버에서
내고 그 안은 클라이언트에서 채운다. `curl`로 받은 HTML을 세면 항상 0이므로,
Phase 3 검증은 반드시 실제 브라우저에서 해야 한다.
