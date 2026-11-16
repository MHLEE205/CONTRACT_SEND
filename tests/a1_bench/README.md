# a1_bench 시험 (tests/a1_bench)

`CONTRACT_SEND/a1_bench.html` 을 node 로 시험한다. 집 Mac · 회사 PC 어느 쪽이든 같은 명령으로 돌린다.
**네트워크 없음** — LEENAI 공통 · Dataverse · Graph(SharePoint) · Anthropic 을 모두 mock 으로 바꾼다. **가짜 데이터만** (실제 COMPASS · LC 원문 · API 키 없음).

## 돌리는 법 (명령 1줄)

```bash
cd tests/a1_bench && npm install && node run_all.js
```

- 필요: **node 18 이상** · npm 패키지 **jsdom 30.1.2** · **pdfjs-dist 3.11.174** (package.json 에 고정. `npm install` 이 이 폴더에만 설치)
- 마지막 줄이 `✅ ALL PASS` 면 통과. 실패하면 `FAIL` 줄에 이유
- `--old <html>` : 비교할 이전 버전 html 을 직접 지정 (없으면 `git show 188ba74:a1_bench.html` = v0.8 을 씀 — v0.9 에서 바꿈)
- `--skip-old` : 이전 버전 비교(④) 생략

## 파일

| 파일 | 내용 |
|---|---|
| `run_all.js` | 아래 전부를 순서대로 · 결과 표 |
| `check.js` | 문법(node --check) · `version:'x.y'` 1곳 · 공통 파일 1회 · confirm/alert 호출 0 (주석 제외) · 보안 grep 0 · 푸터 |
| `unit_v06.js` | v0.6 マスター草案 단위 42건 (지시서 v0.6 Step 5 표 10줄 + 추가 32건) |
| `unit_v07.js` | v0.7 단위 — Step 1 표 (`{CONTRACT_NO}` · 번호 주인 · LC 줄바꿈) · 누설 금지 (앞 A · 대상 B · 뒤 C) · master_check · 마스터 블록 |
| `unit_v08.js` | v0.8 단위 — 지급 조건 3칸 마스터 · `{HS}` 前回値 · 예상 시간 · 이어서 실행 설정 비교 |
| `unit_v09.js` | v0.9 단위 51 — 인도 장소 `{POD}` (실제 항구) · po_vo 종류 (その他 → L/C PO 안 넣음) · L/C 지정 문구 (FORMAT · SHOWING · ORDER OF · CONSIGNED TO, 값 이름 = 자리) · 나라 기본과 다름 · 새 업체 빌려 쓰기 (누설 · 다른 바이어 번호 0) |
| `legacy_v03_v05_unit.js` · `legacy_v03_v05_pdf.js` · `legacy_v03_v05_e2e.js` · `legacy_fixtures.js` | **legacy 시험 = v0.3 ~ v0.5 에서 옮김 · 가짜 데이터** (2026-11-16, 집 Mac). 단위 154 · PDF 0 복원 · NET/SET (합성 PDF 15) · 통합 파일럿 113 · 전체 18. e2e 는 `node legacy_v03_v05_e2e.js <html> pilot\|full` |
| `harness.js` | jsdom 하네스. `node harness.js <html> <integ\|bench\|r2\|resume> <out.json> [on\|off]` — 가짜 SharePoint 저장소(PUT 저장 · GET 읽기 · 목록)를 페이지끼리 공유 |
| `cmp.js` | 두 버전 bench 산출물 문자 단위 비교 (실행 ID · 시각 · 소요 시간 · 버전 표기만 맞춤). `allfc` (v0.9) = format_check 값만 빼고 비교 + 바뀐 format_check 는 모두 LC_REQUIRED_WORDING 이 낀 변화인지 확인 |

### run_all.js 가 하는 것

1. **① 점검** — check.js
2. **② 단위** — unit_v06 · unit_v07 · unit_v08 · unit_v09 · legacy 단위 · legacy PDF (+ tests/ 에 실제 NPWP 0건 · legacy 이관 전 실제 값 0건)
3. **③ 통합** — legacy 통합 (파일럿 R1+R2 · 전체 실행 — v0.3~v0.5 기능: 대상 목록 · 제외 사유 · 은행 키 · 층 태그 · 支店違い · HEX 목록 · S/I 수정 이력 · si_changes · lcjson_diff · JSON 재시도 · R2 ①②③ · fieldLcCheck 등) / integ (マスター草案 표 · 저장 확인 상자: 취소 0회 · 저장 3파일 · 초안 만들 때 통신 0회) / r2 (「R2만」 3건, R2 마스터 켬 · 끔: 첫 거래 블록 없음 · 확실 틀이 ③ 프롬프트에 · 누설 금지 · master_check · §12 · run_config · 예상 비용) / resume (v0.8: 전체 실행 6건 — 취소 호출 0 · 2건 뒤 강제 중단 → 새 페이지 「이어서 실행」: 설정 다르면 막힘 · 1·2건 호출 0 · 최종 결과 = 끊김 없는 실행)
4. **④ 이전 버전 비교** — bench(파일럿 R1+R2 2건 + R0)를 이전 버전과 새 버전(마스터 끔 · 켬)으로 돌려
   - 마스터 끔: 산출물 + R0 가 이전 버전(v0.8)과 **문자 단위로 같음** — 단 v0.9 규칙 변경으로 `format_check` 만 다를 수 있고, 바뀐 것은 모두 LC_REQUIRED_WORDING 이 낀 변화여야 함 (`cmp.js allfc`). `progress.json` · `partial/` 은 실행 도중 기록이라 비교 제외
   - 마스터 켬: results.csv 의 **R1 행 + R0** 가 같음
   - v0.9: **R1 · R0 입력(프롬프트)** 가 v0.8 과 문자 단위로 같음 (끔 · 켬)
   - v0.9 통합: ③ 입력의 【実際の仕向港】 · 【バイヤー契約番号】 · 【L/C 指定文言】 · 「初回取引 — 全体確認」 한 줄 (켬만) · マスター草案 나라 · 国の基本と違う

## legacy 시험 (v0.3 ~ v0.5) 에 대해

- 2026-11-16 집 Mac 에서 옮김. 실제 회사명 · 주소 · 세금번호 · 허가번호 · LC 번호 · PO 는 SAMPLE · 가짜 번호로 바꿈 (은행 BIC · 항구 · 계약번호 모양만 실제 모양)
- 실제 LC PDF 로 하던 0 복원 시험은 **합성 PDF**(0 을 이미지 마스크로 그림)로 대체. 실제 PDF 에만 있는 확인(페이지 머리줄 0 개수 · pdf.js 텍스트층 대조)은 옮기지 않음
- 옮기지 않은 것: `splitcheck.js`(check.js 와 같음) · v0.3↔v0.4 R1 비교 모드(④ cmp.js 가 대신함)

---
✦ Powered by LEENAI Automation System
