# bl_bench 시험 (tests/bl_bench)

`CONTRACT_SEND/bl_bench.html` (B/L Draft ↔ COMPASS · L/C 보관소 대조 + 바이어용 Draft 운임 가리기 · 읽기만) 을 node 로 시험한다.
**네트워크 없음 · 실제 COMPASS · SharePoint 없음 · 가짜 데이터만** — B/L Draft 는 pdf-lib 로 만든 가짜 양식, 읽기는 도구와 같은 **pdf.js 3.11.174**.

## 돌리는 법

```bash
cd tests/bl_bench && npm install && node run_all.js
```

- 필요: node 18 이상 · jsdom 30.1.2 · pdf-lib 1.17.1 · pdfjs-dist 3.11.174 (package.json 에 고정)
- 마지막 줄이 `ALL PASS` 면 통과
- 브라우저 가리기 시험은 playwright 가 있을 때만: `BL_PLAYWRIGHT=<playwright 경로> BL_CHANNEL=chrome node run_all.js` (cdnjs 의 pdf.js · jsPDF 를 받음)

## 파일

| 파일 | 내용 |
|---|---|
| `run_all.js` | 아래 전부 |
| `check.js` | 문법 · 버전 1곳 · 공통 파일 1회 · confirm/alert 0 · 쓰기 0 · CDN 고정판 · 보안 grep 0 · 실명 0 · 푸터 |
| `unit.js` | 이름 · 판 · B/L 쪽 · 판정 5가지 · R1~R11 · 다른 건 Draft · L/C 7항목 · 항구 별칭 · 판 사이 · 가리기 좌표 · 쪽 빼기 |
| `e2e.js` | jsdom 통합 — 가짜 COMPASS · Invoice 폴더 · L/C 보관소 → 照合 · 結果 · 확인 문구 (GET 만 · 쓰기 0) · v0.2: 고정 커밋의 ACL 엔진 (sha256) · 가짜 마스터 + 판 기록 |
| `v02.js` | v0.2 — 체크포인트 (stage BL_DRAFT 基本 CP 번호 · 停止 · CP-A01 을 Draft 에 · 끝 쉼표 · 試験 = 参考) · Draft 칸 · 화면 · 当社書類 쪽 · B/L 쪽 없음 · 마스터 없음 = v0.1 |
| `mask_browser.js` | Chrome 에서 바이어용 Draft — 글자 층 0 · 검은 칸 화소 · 쪽 빼기 |
| `lib.js` · `fixtures.js` | bl-core 읽기 (+ 같은 레포의 ACL 엔진 `useEngine`) · 가짜 PDF · 가짜 S/I · 가짜 L/C 보관소 · 港の別名 시험용 고정값 (`PORT_ALIAS_TEST`) |

전수 재현 (실제 자료 · 로컬) 은 `tools/bl_repro.mjs` (`--cp` = 체크포인트 追加 를 Draft 에 시험) — 레포에는 실제 값이 없다.

✦ Powered by LEENAI Automation System
