# Phase 3 브라우저 렌더 확인 (LB-132)

`SPEC.md` 8.1절 Phase 3의 완료 조건 — 페이지를 열면 추세 그래프의 x축 눈금이 **30개**,
분포 차트의 조각이 **7개** 렌더된다 — 를 실제 브라우저 DOM에서 세어 확인한 기록이다.

| 항목 | 값 |
|---|---|
| 확인 대상 | `http://localhost:3000` (`npm run dev`) |
| 필터 상태 | 기간 `최근 30일` · 제품 `전체` (기본값) |
| 차트 라이브러리 | Recharts |

## 센 방법

눈으로 세지 않고 DOM에서 셌다. 라이브러리가 축이 좁을 때 눈금을 스스로 솎아 낼 수 있어,
화면에 보이는 개수와 데이터가 정한 개수가 어긋날 수 있기 때문이다.

```js
// x축 눈금 — 눈금선과 눈금 글자를 따로 센다
document.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick').length
[...document.querySelectorAll('svg text')]
  .filter((e) => /^\d{2}-\d{2}$/.test(e.textContent.trim())).length

// 분포 차트 조각
document.querySelectorAll('.recharts-pie .recharts-sector').length
```

## 결과

| 확인 항목 | 기대 | 실제 | 판정 |
|---|---|---|---|
| x축 눈금선 | 30 | 30 | 통과 |
| x축 눈금 글자 | 30 | 30 (`07-15` ~ `08-13`, 빠진 날짜 없음) | 통과 |
| 감성 선 | 3 | 3 (긍정·부정·중립) | 통과 |
| 분포 차트 조각 | 7 | 7 | 통과 |
| 분포 차트 범례 | 7 | 7 (가격 27 · 기타 21 · 내구성 30 · 발열 39 · 성능 54 · 소비전력 33 · 화질 96) | 통과 |
| 언급 건수 카드 | 300 | 300 | 통과 |
| 부정 반응 비율 카드 | 45.0% | 45.0% | 통과 |

눈금 글자를 셀 때 `.recharts-xAxis text`로는 0개가 나온다. 이 버전의 Recharts는 눈금 글자를
`.recharts-xAxis` 바깥의 `recharts-cartesian-axis-tick-label` 레이어에 그린다. 렌더가 빠진 것이
아니라 셀 자리를 잘못 짚은 것이므로, 차트 설정을 고치지 말고 위 SVG 전체 기준 선택자로 센다.

## 캡처

| 파일 | 무엇이 담겨 있나 |
|---|---|
| `phase3-trend-xaxis-30.jpg` | 추세 그래프 전체. x축에 `07-15`부터 `08-13`까지 30개가 기울어져 나란히 서 있다 |
| `phase3-distribution-7slices.jpg` | 분포 차트 전체. 조각 7개와 건수·비율이 적힌 범례 7줄 |
