# CLAUDE.md — CONTRACT_SEND (D-00 엔진 · 시험 페이지)

> 어느 PC 의 토르 (회사 Windows · 집 Mac) 든 이 레포를 열면 이 파일을 먼저 읽는다.
> **공개 레포다 — 키 · 토큰 · 비밀번호 · 실제 거래 값 (계약 · Invoice · L/C · 바이어 · 乙仲 실명 …) 을 넣지 않는다.**
> (DOC_TOOL `CLAUDE.md` 를 본떠 2026-11-24 토르_11 이 처음 씀 — 지시서 `THOR_11_지시서_D00_엔진v0.16_書類ツールv0.18` E-7)

✦ Powered by LEENAI Automation System

---

## 1. 이 레포

| 파일 | 내용 |
|---|---|
| `acl_bench.html` | **ACL 대조 엔진** (`<script id="acl-core">` · 순수 로직) + 시험 화면 (acl-app) — 현재 **v0.19** (당사자 전화 · FAX 숫자만 · 우편번호 = 表記差 `partyNotation` · CP-A04 표기차 · AI 「読めず」 칸 3 번째 판독 `scanApplyR3` · 화면 `viewHtml(…,{v22:true})` = 書類ツール v0.22 순서) |
| `bl_bench.html` | **B/L Draft 대조 엔진** (`<script id="bl-core">` · ACL 엔진을 `BL.useEngine` 로 받음) + 시험 화면 — 현재 **v0.6** (전화 · 우편번호 줄 찾기 = ACL `partyLineKey`) |
| `fd_bench.html` | **FD 확인 엔진** (`<script id="fd-core">` · 순수 로직 · `FD`) + 시험 화면 (fd-app · 읽기만 · AI 0) — 현재 **v0.2** (보험증권 앞면 AI 판독 `FD.INS_AI` · 저장본 `_fd_ai/{sha256}.ins.json` · 제출기한 = FD送付日). 부품 PDF 글자 ↔ L/C 보관소 (묶음 Invoice 13 · B/L 5 · P/L 7 · 보험 11 · C/O 4 · BENE/47A/기한 4) + TO BANK AI 쪽 판별 저장본 (`ACL_bench/_fd_ai/{sha256}.json` · 매수 · 원본/사본 · 서명만). 새 판정은 마스터 `master_checkpoint` 의 그 줄 (engine_key `fd:…`) 이 있을 때만 · 有効 만 판정 (지금은 전부 試験) |
| `a1_bench.html` | S/I 추천 (A1 R2) 엔진 · 시험 화면 |
| `compass_write_test.html` | COMPASS 쓰기 시험 |
| `index.html` · `mail/` · `common-test/` | A-02 MAIL 포털 시험 페이지 · LEENAI_COMMON 동작 확인 (README) |
| `tools/` | node 도구 (PC 에서 실행): `acl_scan_ai.mjs` (스캔 · 乙仲様式 ACL AI 판독 저장) · **`acl_scan_r3.mjs` (v0.19 — 「読めず」 칸만 잘라 3 번째 판독 · `_scan_ai/{sha256}[.other].r3.json` + 잘라낸 그림 png)** · `lc_read_*.mjs` (L/C 보관소) · `cp_trial.mjs` (체크포인트 시험) · `bl_repro.mjs` (B/L 전수 재현) · **`ms_token.mjs` (Microsoft 토큰 · OS 별 한 곳)** |
| `tests/acl_bench` · `tests/bl_bench` · `tests/fd_bench` · `tests/a1_bench` · `tests/compass_write_test` | node 시험 (가짜 데이터만 · 네트워크 0) |

- **書類ツール (DOC_TOOL) 이 이 엔진을 쓴다** — DOC_TOOL 은 `acl_bench.html` · `bl_bench.html` 을 **커밋 + sha256 으로 고정**해서 raw 로 읽는다 (복사하지 않음). 엔진을 고치면 → push → 그 커밋 · sha256 을 DOC_TOOL `CLAUDE.md` §5 와 `index.html` (`ACL_ENGINE` · `BL_ENGINE`) 에 넣는다 (한 토르가 순서대로 · 버전을 다시 맞추는 일 0).
- 엔진 안의 규칙 표는 **한 곳**: 형태 대응 `CNTR_TYPES` · 표시칸 `DISP` · 乙仲様式 `NA_MAP` · `CT_ONLY` · `PRINTED` · 체크포인트 `CP_OPS` · B/L `OTHER_CT` 등. 같은 규칙을 두 군데 쓰지 않는다.

## 2. 시험

```bash
# Windows 는 반드시 줄 끝을 바꾸지 않게 (sha256 · 바이트 비교 시험이 깨짐)
git clone -c core.autocrlf=false https://github.com/MHLEE205/CONTRACT_SEND.git
cd CONTRACT_SEND/tests/acl_bench && npm install && node run_all.js   # ✅ ALL PASS
cd ../bl_bench && npm install && node run_all.js                     # ALL PASS
cd ../fd_bench && node run_all.js                                      # ALL PASS (npm install 필요 없음)
```

- node 18 이상. 일부 시험은 `git show <옛 커밋>:acl_bench.html` 로 **전 판과 바이트 비교**를 하므로 **클론 (git 기록) 에서** 돌린다.
- `tests/bl_bench/mask_browser.js` 는 playwright 가 없으면 건너뜀.
- `tests/a1_bench` · `tests/compass_write_test` 는 각자 `npm install` 필요 (이 PC 에 없으면 그 묶음만 실패 — 엔진 변경과 무관한지 HEAD 에서도 같은지 확인).

## 3. 지켜야 할 규칙

0. **새 체크포인트 (v0.18 · fd v0.1 · 형님 F2)** — 마스터 追加 줄에 `engine_key` 가 있으면 엔진 코드 (`ACL.CP_CODE` · `FD.CHECKS`) 가 판정. 상태가 有効 이 아니면 결과는 `trial:true` · 전체 판정에 0 영향. 有効 전환은 형님 승인 (承認の安全装置 그대로).

1. **버전** — 각 html 의 `LEENAI.init({ … version:'x.y' … })` 1곳 (+ bl-core `VERSION`) · 맨 위 주석에 「vX.Y (날짜 · 지시서 · 형님 결정) 무엇을」 한 줄. 시험의 버전 기대값도 같이.
2. **푸터** 「✦ Powered by LEENAI Automation System」 유지.
3. **직원 화면 = 일본어 · 한글 0** (`tests/bl_bench/hangul.js` 가 bl_bench · acl_bench 를 봄). 판정 값은 코드 (영문) · 화면 글자는 표.
4. **판정을 바꾸는 수정은 전후 비교 필수** — 2026 ACL 전체 (NACCS · 스캔 NACCS · 乙仲様式) · B/L Draft 를 옛 커밋 ↔ 새 판으로 돌려 **판정 변화 목록**을 보고서에. 허용 변화 (지시서) 로 설명되지 않는 변화 0. AI 는 다시 부르지 않고 `ACL_bench/_scan_ai/{sha256}.json` · `{sha256}.other.json` 저장본을 쓴다.
5. **쓰기** — 엔진 · 시험 화면은 COMPASS · MASTER 를 쓰지 않는다 (예외는 지시서에 적힌 것만 · 예: `cp_trial --write`). SharePoint 쓰기 = `古紙/-. AI 活用/D-00/ACL_bench/` 실행 폴더 · `_scan_ai/` (새 파일만 · 덮어쓰기 0).
6. **乙仲별 과거 오기** `ACL_bench/otsunaka_mistakes.json` (schema `otsunaka_mistakes/1` · 乙仲 = 짧은 이름 `otsunaka` · 정식 이름 `otsunaka_full` · 번호 `otsunaka_id` · 바꾸기 전 `ACL_bench/_backup/` 에 사본) = **사람이 확인한 것만** · 엔진은 읽기만 (`pastMistakes`) · 새 「誤字の疑い」 는 summary.md 의 후보 표로만 (자동 추가 0).
7. **실제 값은 레포에 넣지 않는다** — 시험은 가짜 번호 (`TEST…` · `2699` · `SAMPLE` · `example.test`) · GUID 는 `00000000-0000-4000-8000-…` (`tests/acl_bench/run_all.js` 가 확인). 실자료 확인 스크립트 · 결과는 레포 밖 (PC 작업 폴더 → SharePoint 실행 폴더 `scripts/`).
8. **보안 grep** — push 전 `ghp_ · github_pat_ · sk-ant · client_secret · AKIA` 0.

## 4. 키 · 토큰 (출력 금지)

- **Anthropic API 키**: Mac = 키체인 `LEENAI_ANTHROPIC_API_KEY` → 없거나 다른 OS = 환경변수 `LEENAI_ANTHROPIC_API_KEY` (회사 PC 는 사용자 환경변수). `tools/acl_scan_ai.mjs` · `lc_read_one.mjs` 의 `apiKey()`. **값을 화면 · 파일 · 로그 · 오류에 내지 않는다** (있는지 · 형식만).
- **Microsoft 토큰 (Graph · COMPASS)**: `tools/ms_token.mjs` 한 곳 — Mac = `~/thor_work/venv/bin/python` + `~/thor_work/d00_acl_survey/ms.py` · Windows = `~/thor_work/bl_supp/tok.py` (`graph` · `dv` · `write`). 환경변수 `MS_PY` · `MS_DIR` · `MS_TOK` 로 장소 변경. 없으면 분명한 오류 (값 0).
- 브라우저 화면은 LEENAI_COMMON 로그인 (MSAL) — 키는 그 브라우저의 localStorage (`leenai_apikey_v1`) 만.

## 5. AI 비용

- AI 를 부르는 곳 = 스캔 · 乙仲様式 ACL 판독 (`scanReadBrowser` · `acl_scan_ai.mjs`) · **「読めず」 칸 3 번째 판독 (`scanR3For` · `acl_scan_r3.mjs` — 그 칸만 · 300 dpi 잘라 2 회 · 체크 칸은 ☒/☐ 만)** · **보험증권 앞면 (`FD.INS_AI` — 보험 쪽 1 ~ 2 쪽 · 2 회 같은 값만 · 부르는 곳 = 書類ツール 브라우저)** · L/C 판독 (`lc_read_one`) · A1 추천 · **TO BANK 쪽 판별 (`FD.AI` — 프롬프트 · 읽는 법은 fd-core · 부르는 곳은 書類ツール 브라우저 · 2 회 같을 때만 · 회색 150 dpi · 문구 판정 안 함)**.
- **같은 파일은 다시 읽지 않는다** (sha256 저장본) · 실행 전 예상 비용 · 실행 후 실제 비용을 보고서에. 한 번 실행 상한은 지시서 (없으면 **US$10** — 넘을 것 같으면 멈추고 보고).
- 회귀 · 전후 비교는 **AI 0** (저장본만).

## 6. 시작 · 끝 순서

1. Drive `LEENAI(CLAUDE)/1. THOR/THOR_작업현황.md` 를 **먼저 읽는다** (다른 토르가 CONTRACT_SEND · DOC_TOOL 작업 중이면 멈춤).
2. `git clone -c core.autocrlf=false` → HEAD 확인 · 시험 ALL PASS.
3. 작업 → 시험 → 전후 비교 → 보안 grep → `git -c user.name="THOR" -c user.email="…" commit` (`[D-00] acl_bench vX → vY — …`) → `git push origin main`.
4. Pages 크기 · sha256 = raw 확인 → DOC_TOOL 고정 (위 §1).
5. 보고서 (Drive `D-00 D영역통합/`) · 작업 현황 · 작업 폴더 삭제 — **PC 에는 아무것도 남기지 않는다**.

---
✦ Powered by LEENAI Automation System
