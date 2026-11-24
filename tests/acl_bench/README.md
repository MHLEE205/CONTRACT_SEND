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
| `pdfclose.js` | (v0.3.1) `readPdf` 가 다 읽은 PDF 를 닫는지 — 도구의 `readPdf` · `mapLimit` · ① 一覧 콜백을 원문 그대로 꺼내 가짜 pdf.js 로: 정상 · 열기 실패 · 페이지 읽기 실패 → `destroy` 정확히 1번 · 원래 오류 그대로 (`t.format='ERROR'`) · 닫기 오류는 로그 1줄 / 가짜 PDF 400개 `mapLimit(4)` → 끝에 열린 문서 0 · 최대 4 / 실제 pdf.js 로 가짜 NACCS PDF 의 `pages` 가 v0.3 (`a8c6199`) 과 바이트까지 같음 |
| `v04.js` | (v0.4) 규칙 범위 `all` · `forwarder` (순서 · 겹친 규칙) · Agent Signature = S/I 現地Agent記載 (Yes/No/未入力 · 마스터 우선) · Way Bill/원본 조합 (SWB · OBL · Surrender 型 · 이상 조합 → 読取確認要) · 揚地 = S/I 값 (부킹 POD 참고 · 후보 2개 · `pod_exclude` · CAS) · 표기 정리 (기호 앞뒤 공백 · 대소문자 · 씰 공백 · `**` 넘침 이동) · **유지 확인** (낱말 안 공백 · 부호 순서/겹침/바뀜 · 1~2 글자 → 모두 相違) · 부킹 옆 칸 (v0.3.1 `e0c2199` 는 「- 01 1」 까지 읽음) · REV 판 (이름 모양 · 번호 우선 · 再輸入 제외 · aclVersion 열) · 본선 변경 라벨 |
| `v05.js` | (v0.5) **넘침 표시 이어 붙이기** (`*` · `**` · `***` · `****` · 번호 `*1`~`*9` · 한 칸 2개 · 단락 끝 = 빈 줄 (y 간격) · 다음 표시 · ACL 만 / S/I 만 / 양쪽 · 못 찾음 · 같은 표시 2단락 → 読取確認 · Description 에서 뺌 · 실례 모양의 가짜 PDF → Port 2칸 表記 · v0.4 `243897d` 는 相違) · **컨테이너 세트 6값** (형태 같음 · 표의 같은 뜻 · 표에 없음 · COMPASS 빈칸 → 参考 · ACL 못 읽음) · **ACL 이름** = 書類ツール v0.2 (`7af227d`) `aclScan` 과 같은 결과 · 仮 = 대상 · **결과 화면** (결론 · 전체 목록 · 相違만 · 내부 이름 관리자만 · 줄 단위 차이) |
| `v06.js` | (v0.6) **내용 항목** (당사자 줄 · TEL/FAX/TAX ID/EMAIL 번호 항목 · HS 표기 3가지 = 같음 · 날짜 표기 6가지 = 같음 · S/I 의 `#` = 줄바꿈 · 중복 = 1항목 · NO MARK = N/M) · **최종 분석** (다 있음 ✓ · 빠짐 ✗ · 번호 한 자리 = 없음 · 위치만 다름 = 場所が違う · ACL にだけある · 코드 · 라벨 · 숫자 · 합계 줄 제외 · 칸 라벨 못 읽음 = 読めない) · **Description 항목 비교** (순서 · 같은 줄 · HS 두 번 = 表記:並び・重複 · L/C 다름 · 빠짐 · ACL 만 = 相違 · 가짜 F3 실례 = 表記差 · v0.5 `903d923` 는 脱落) · **세트 회귀** = v0.5 · **最終確認 화면** |
| `v07.js` | (v0.7) **하이픈** 만 다름 = 表記:ハイフン (우편번호 · 하이픈↔띄어쓰기 · 글 항목 키) · 번호 항목은 그대로 (확인만) · `/` `&` 는 그대로 相違 · **乙仲への指示** (S/I 일본어 줄 · `#` 로 나뉜 줄 · 足りない 0 · 칸별 비교 제외 · 화면 접기) · **コンテナ別記載の指示** (일치 ✓ · 모양 2가지 · MT · 합계만 ✗ 相違 · 값 다름 · BASES · 일부만 · 표 못 읽음 ー · 지시 없음 = 확인 안 함) |
| `v14.js` | (v0.14 · 지시서 MAC-THOR_6 C4) **스캔 ACL AI 2 회 판독** — 프롬프트 (NACCS 칸 29 · 번역/정리 금지 · 쪽) · `scanJson` · `scanMerge` (2 회 같음 = 공백 · 대소문자만 다름 포함 → SURE · 다름 → `AI_DIFF` 値 비움 · 두 값 메모 · 「-」 = 빈칸 · 행은 照合에 쓰는 열만 (荷姿 · 容積 은 `aiNote`) · 한 번만 읽힌 행) · 합계 `naccsTotals` · `compareOne` (完全一致 + 「AI 判読 (スキャン)」 참고 줄 · 読取確認要) · **NACCS = v0.13 (`e18253a`) 바이트까지 같음** · `tools/acl_scan_ai.mjs` (가짜 AI · JSON 다시 묻기 · sha256 저장본) · 화면 jsdom (체크 없음 = 読取対象外 · 체크 = AI 2 회 · `ACL_bench/_scan_ai/{sha256}.json` · 다시 照合 = AI 0) |
| `v15.js` | (v0.15 · 지시서 THOR_10 G9) **乙仲 자체 양식 ACL 대조** — 인자 없는 `scanPrompt` = v0.14 와 한 글자도 같음 · `scanPrompt({other:true})` (양식 이름 · `absent` · `containerTable`) · `scanMerge(…,{other:true})` (2 회 다 欄なし = `NA` · 한쪽만 = `AI_DIFF` · 빈칸 "" 은 NA 아님) · `compareOne` (NA 칸 → 対象外 INFO · 진짜 차이는 相違 · 본선/항차 한 칸 · 컨테이너 표 없음 · Way Bill 없는 원본 수 조합) · NACCS · 스캔 NACCS = v0.14 (`6d57a01`) 바이트까지 · `tools/acl_scan_ai.mjs --other` (`{sha256}.other.json`) · 화면 (jsdom NFK2601-11) |
| `lc_merge.js` | (lc_read 1.1 · C1 · C3) `tools/lc_read_lib.mjs` **Amend 칸만 교체** — `amendTargets` (MT707 태그 · FIELD nnA NO./POINT/LINE NO · DELETE · READ AS 다음 줄 · 번호 없음 = 태그 전체 · :47B UNCHANGED のみ 안 셈 · since) · `mergeRecords` (amend / fill / keep · 46A 삭제 · 訂正前 문장 버림 · 파생 칸 · 판 번호 · MD) · C3 (`isUnchangedOnly` → `amend_history`) · Amend 없는 판독 = `e18253a` buildRecord |
| `pdfread.js` | node 용 pdf.js 읽기 (도구의 readPdf 와 같은 모양) · jsdom 페이지용 pdfjsLib |

> v0.3: 담당자 메일 CSV 는 **가짜만** (회사 · 주소 · 번호 · 메일 주소 모두 `example.test` / SAMPLE). 실제 메일 (`mail_docstaff_*.csv`) 의 값은 `run_all` 이 시험 파일 · 도구에 0건인지 확인한다.

> v0.2 부터 가짜 NACCS 양식의 **위치 관계는 실제와 같다** (라벨 좌표 · 값 자리 — 실제 좌표 파일에서 옮김). 실제 값 · 실제 PDF 는 레포에 넣지 않는다 (`run_all` 이 실제 값 0건을 확인). 실제 좌표 확인은 도구의 「座標も保存」 으로 SharePoint 에 남긴 `coords/{Invoice}.json` 으로 한다.

---
✦ Powered by LEENAI Automation System
