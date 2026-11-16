# a1_bench 시험 (tests/a1_bench)

`CONTRACT_SEND/a1_bench.html` 을 node 로 시험한다. 집 Mac · 회사 PC 어느 쪽이든 같은 명령으로 돌린다.
**네트워크 없음** — LEENAI 공통 · Dataverse · Graph(SharePoint) · Anthropic 을 모두 mock 으로 바꾼다. **가짜 데이터만** (실제 COMPASS · LC 원문 · API 키 없음).

## 돌리는 법 (명령 1줄)

```bash
cd tests/a1_bench && npm install && node run_all.js
```

- 필요: **node 18 이상** · npm 패키지 **jsdom 30.1.2** (package.json 에 고정. `npm install` 이 이 폴더에만 설치)
- 마지막 줄이 `✅ ALL PASS` 면 통과. 실패하면 `FAIL` 줄에 이유
- `--old <html>` : 비교할 이전 버전 html 을 직접 지정 (없으면 `git show 1191185:a1_bench.html` = v0.7 을 씀)
- `--skip-old` : 이전 버전 비교(④) 생략

## 파일

| 파일 | 내용 |
|---|---|
| `run_all.js` | 아래 전부를 순서대로 · 결과 표 |
| `check.js` | 문법(node --check) · `version:'x.y'` 1곳 · 공통 파일 1회 · confirm/alert 호출 0 (주석 제외) · 보안 grep 0 · 푸터 |
| `unit_v06.js` | v0.6 マスター草案 단위 42건 (지시서 v0.6 Step 5 표 10줄 + 추가 32건) |
| `unit_v07.js` | v0.7 단위 — Step 1 표 (`{CONTRACT_NO}` · 번호 주인 · LC 줄바꿈) · 누설 금지 (앞 A · 대상 B · 뒤 C) · master_check · 마스터 블록 |
| `unit_v08.js` | v0.8 단위 — 지급 조건 3칸 마스터 · `{HS}` 前回値 · 예상 시간 · 이어서 실행 설정 비교 |
| `harness.js` | jsdom 하네스. `node harness.js <html> <integ\|bench\|r2\|resume> <out.json> [on\|off]` — 가짜 SharePoint 저장소(PUT 저장 · GET 읽기 · 목록)를 페이지끼리 공유 |
| `cmp.js` | 두 버전 bench 산출물 문자 단위 비교 (실행 ID · 시각 · 소요 시간 · 버전 표기만 맞춤) |

### run_all.js 가 하는 것

1. **① 점검** — check.js
2. **② 단위** — unit_v06 · unit_v07 · unit_v08 (+ tests/ 에 실제 NPWP 0건)
3. **③ 통합** — integ (マスター草案 표 · 저장 확인 상자: 취소 0회 · 저장 3파일 · 초안 만들 때 통신 0회) / r2 (「R2만」 3건, R2 마스터 켬 · 끔: 첫 거래 블록 없음 · 확실 틀이 ③ 프롬프트에 · 누설 금지 · master_check · §12 · run_config · 예상 비용) / resume (v0.8: 전체 실행 6건 — 취소 호출 0 · 2건 뒤 강제 중단 → 새 페이지 「이어서 실행」: 설정 다르면 막힘 · 1·2건 호출 0 · 최종 결과 = 끊김 없는 실행)
4. **④ 이전 버전 비교** — bench(파일럿 R1+R2 2건 + R0)를 이전 버전과 새 버전(마스터 끔 · 켬)으로 돌려
   - 마스터 끔: 산출물 + R0 가 이전 버전과 **문자 단위로 같음** (v0.8~ `progress.json` · `partial/` 은 실행 도중 기록이라 비교 제외)
   - 마스터 켬: results.csv 의 **R1 행 + R0** 가 같음

## 아직 옮기지 못한 것

- 집 Mac 에 있는 **v0.3 ~ v0.5 시험 (306건)** — 집 PC 에서 이 폴더로 옮길 것 (가짜 데이터인지 확인 후)

---
✦ Powered by LEENAI Automation System
