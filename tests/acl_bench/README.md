# acl_bench 시험 (tests/acl_bench)

`CONTRACT_SEND/acl_bench.html` (ACL (NACCS) ↔ COMPASS 엄격 대조 · 읽기만) 을 node 로 시험한다.
**네트워크 없음 · 실제 COMPASS · SharePoint 없음 · 가짜 데이터만** — LEENAI 공통 · Dataverse (GET 만) · Graph (검색 · PDF · 저장) 를 가짜로, ACL PDF 는 **pdf-lib 로 만든 가짜 NACCS 양식** (회사 · 번호 · 컨테이너 모두 가짜), 읽기는 도구와 같은 **pdf.js 3.11.174**.

## 돌리는 법 (명령 1줄)

```bash
cd tests/acl_bench && npm install && node run_all.js
```

- 필요: node 18 이상 · jsdom 30.1.2 · pdf-lib 1.17.1 · pdfjs-dist 3.11.174 (package.json 에 고정)
- 마지막 줄이 `✅ ALL PASS` 면 통과

## 파일

| 파일 | 내용 |
|---|---|
| `run_all.js` | 아래 전부 + 가짜 데이터 확인 (GUID 가짜 모양 · 실제 ACL 실례의 값이 시험 파일 · 도구에 0건) |
| `check.js` | 문법 · `version:'x.y'` 1곳 · 공통 파일 1회 · confirm/alert 0 · 보안 grep 0 · 푸터 |
| `unit.js` | `<script id="acl-core">` — 대상 모으기 (두 폴더 · 최근 1개) · 좌표 셀 (값이 라벨보다 먼저 · 오른쪽/아래 라벨 · 넘침 → 位置あいまい · 같은 줄 값) · 형식 (NACCS / SCAN / OTHER) · **D-03 v4.11 기대 문면** (descBlock XX 치환 · 품명 최신 · `#` · `***` 그대로 · shipper 기본값 · Notify · POL) · 문면 비교 (完全一致 · 表記差 · 脱落 · 追加 · 相違) · 세트 비교 · 가짜 PDF → 읽기 → 비교 (부킹 번호 · Attached Sheet · 넘침) · 저장 문지기 · CSV · summary |
| `e2e.js` | jsdom 통합 — (v0.3) 표시 칸 · ③ 担当者実績 (검색 · 끌어다 놓기 · _input 控え 덮어쓰기 금지) · 버튼 순서 · 저장 6파일 / 가짜 Invoice 13건: 완전 · 씰 다름 · Bales 다름 · 순서만 다름 · ACL 에만 컨테이너 · 부킹 번호 다름 · 한 줄 빠짐/더함 · 줄바꿈만 다름 · 컨테이너 20개 (2쪽) · 스캔 · 다른 양식 · 셀 넘침 · COMPASS 없음 / 검색 2쪽 · 경로 보충 · 옛 파일 · 폴더 밖 · 이름 모양 / 저장 경로 · 좌표 저장 · COMPASS GET 만 |
| `staff.js` | (v0.3) 담당자 메일 실적 — CSV 파서 (BOM · 따옴표 안 줄바꿈 · 「; 」) · 메일 종류 (本登録 먼저) · 연결 (Invoice · BKG/BL · 紐付けなし) · 실적 4종 + 期間外 · 「訂正後の ACL の可能性」 · 訂正 쌍 (「→」 · 전각 공백 · 300자 잘림 → 不完全 · 표시 칸 요청 · 「空欄のまま」) · 표시 칸 6개 (master_si_rule acl_* · 빈칸 규칙 · 좁은 범위 우선) · 규칙 후보 (3건 · 保留 · 섞임) · 実績表記 (3건 · 같은 형의 訂正 쌍 → 금지) · 공백 둘로 (줄 끝 꺾임 / 낱말 경계) · 저장 파일 — **가짜 메일 CSV** |
| `same_v02.js` | (v0.3) 회귀 — 메일 CSV · 규칙 없이 v0.2 (`3e1b99f`) 와 같은 결과인지 (다른 곳은 Step 4 낱말 경계 · 표시 칸 그룹뿐) |
| `regress.js` | (v0.2) 회귀 — 실제 NACCS 위치 관계의 가짜 PDF 를 v0.1 (`60c2909`) 규칙으로 읽으면 실제와 같은 실패 (씰 빈칸 · 총 중량 · 「-」/코드 섞임) · v0.2 규칙은 完全一致 |
| `fake_naccs.js` | 가짜 NACCS ACL PDF — **v0.2: 실제 NACCS (2026-11-17 좌표 5건) 의 라벨 좌표 · 값 자리 · 라벨 줄 코드 (LOCODE · 호출 부호 · 「-」) · 값 줄 끝 「51」 · 가운데 정렬 컨테이너 머리 · 합계 칸 Gross/Net · 1쪽 1줄 + 3쪽부터 12줄 을 그대로 흉내 냄 (Courier)**. 값 · 회사 · 번호는 가짜 · 그리는 순서 섞기 · 스캔 · 다른 양식 · 넘침 |
| `fixtures.js` | 가짜 COMPASS (부킹 · 항구 · 컨테이너 · S/I sino 1·2 · S/I 명세) 와 그에 맞는 「완전한」 ACL spec |
| `pdfread.js` | node 용 pdf.js 읽기 (도구의 readPdf 와 같은 모양) · jsdom 페이지용 pdfjsLib |

> v0.3: 담당자 메일 CSV 는 **가짜만** (회사 · 주소 · 번호 · 메일 주소 모두 `example.test` / SAMPLE). 실제 메일 (`mail_docstaff_*.csv`) 의 값은 `run_all` 이 시험 파일 · 도구에 0건인지 확인한다.

> v0.2 부터 가짜 NACCS 양식의 **위치 관계는 실제와 같다** (라벨 좌표 · 값 자리 — 실제 좌표 파일에서 옮김). 실제 값 · 실제 PDF 는 레포에 넣지 않는다 (`run_all` 이 실제 값 0건을 확인). 실제 좌표 확인은 도구의 「座標も保存」 으로 SharePoint 에 남긴 `coords/{Invoice}.json` 으로 한다.

---
✦ Powered by LEENAI Automation System
