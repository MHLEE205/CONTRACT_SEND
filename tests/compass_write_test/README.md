# compass_write_test 시험 (tests/compass_write_test)

`CONTRACT_SEND/compass_write_test.html` (COMPASS S/I 변경 시험 · v0.3~ 신규 입력 시험 도구) 을 node 로 시험한다.
**네트워크 없음 · 실제 COMPASS 쓰기 없음** — LEENAI 공통 · Dataverse(메타데이터 · GET · PATCH · POST · DELETE 기록) · SharePoint 를 모두 가짜로 바꾼다. **가짜 데이터만** (GUID · 회사명 · 번호 모두 가짜).

## 돌리는 법 (명령 1줄)

```bash
cd tests/compass_write_test && npm install && node run_all.js
```

- 필요: node 18 이상 · jsdom 30.1.2 (package.json 에 고정)
- 마지막 줄이 `✅ ALL PASS` 면 통과

## 파일

| 파일 | 내용 |
|---|---|
| `run_all.js` | 아래 전부 + **회귀** (v0.1 `83758fe` 은 엄격한 가짜 Dataverse 에서 「읽기」 가 MaxLength 400 으로 실패 · 지금 버전은 성공) + 가짜 데이터 확인 (GUID 모양) |
| `check.js` | 문법 · `version:'x.y'` 1곳 · 공통 파일 1회 · confirm/alert 0 · 보안 grep 0 · 푸터 |
| `unit.js` | `<script id="cw-core">` 단위 — 칸 분류 · 쓰기 문지기(엔터티 · 계약 · 행 · 칸) · SharePoint 경로 · 저장본 비교 · 확인 ① · 밖 수정 감지 · summary.md |
| `e2e.js` | jsdom 통합 — 허용 밖 계약 잠김 · 다른 엔터티 막힘 · 시작 확인 멈춤 · 정상 흐름(「1」 → 확인 ① → 되돌리기 → 확인 ② 완전히 같음) · 2번째 행 실패 → 되돌리기만 · 취소/계약번호 틀림 · 저장 경로 · (v0.2) 메타데이터 읽기: 가짜 Dataverse 가 실제처럼 엄격 (기본형에 없는 `MaxLength` 등을 고르면 400) · SourceType 없는 환경 · MaxLength 형별 읽기 실패. `--load-only` = 「읽기」 만 |
| `unit_create.js` | (v0.3) 신규 입력 단위 — 메타데이터 → 세트 · 탐색 · 컬렉션 이름 · 만들기 칸 분류(IsValidForCreate) · 본문(@odata.bind · deep insert) · 만들기/지우기 문지기 · 확인 · summary.md |
| `e2e_create.js` | (v0.3) 신규 입력 jsdom — TEST01 밖 잠김 · 다른 엔터티/GUID/기록 밖 ID 막힘 · 시작 확인 멈춤 → 남은 시험 행 지우기(이전 기록 ID 만) · 방법 A(S/I → 명세) · 명세 실패 → 반쪽 기록 → 지우기 · 방법 B(deep insert) · 확인 · 지우기(명세 → S/I) · 최종 확인 · **엄격한 가짜 DV** (모르는 세트 · 탐색 이름(대소문자) · 없는 행 연결 · 만들 수 없는 칸 → 400 · 명세 붙은 S/I DELETE → 400) |
| `fixtures_create.js` | (v0.3) 가짜 엔터티 세트 · 관계(탐색 이름 일부러 대소문자 섞음) · 만들기용 칸. TEST01 GUID 는 시험 파일에 적지 않고 도구의 `CW.CREATE_ALLOWED` 에서 읽음 |
| `fixtures.js` | 가짜 메타데이터 · 가짜 S/I 3행 + 명세 1행 (줄바꿈 · `#` · `***` · 한자 · null 포함) |

---
✦ Powered by LEENAI Automation System
