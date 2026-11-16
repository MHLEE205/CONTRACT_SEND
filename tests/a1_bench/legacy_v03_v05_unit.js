/* legacy 시험 (v0.3 ~ v0.5) — 단위 · 집 Mac 에서 옮김 (2026-11-16, 리나이 지시서 D00_A1_예전시험파일이관 v1.0)
   node legacy_v03_v05_unit.js [a1_bench.html]   가짜 데이터만 (실제 회사명 · 주소 · 세금번호 · 허가번호 · LC 번호 · PO 를 SAMPLE · 가짜 번호로 바꿈)
   v0.3 ~ v0.5 지시서 표 + 판독 · 판정 · 누설 금지 · 층 태그 · HEX · PUNCT · 支店違い · R2 ①②③ · P-PAY · auto_cat · format_check · fieldLcCheck */
const fs=require('fs'),path=require('path'),assert=require('assert');   // assert 는 무작위 3000쌍 시험 안에서만
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const core=html.match(/<script id="a1-core">([\s\S]*?)<\/script>/)[1];
const A1C=new Function(core+';return A1C;')();
const FX=require('./legacy_fixtures.js');
let pass=0, fail=0; const ok=(c,m)=>{ let r=false; try{ r=!!c; }catch(e){} if(r){ pass++; console.log('PASS',m); } else { fail++; console.log('FAIL',m); } };

console.log('③ 「TEL: 02」 · 본문 「:23」 은 태그가 아님 (R18)');
const t3=` 700  ISSUE OF A DOCUMENTARY CREDIT
    INPUT HEADER            1648 260407BFTVVNVXAXXX5256684857
 SEQUENCE OF TOTAL             :27   1/1
 DOCUMENTARY CREDIT NUMBER     :20   ILC0000101
 ADDITIONAL CONDITIONS         :47A
        1/ APPLICANT TEL: 02 3456 7890 FAX: 02 3456 7891
        2/ CUT OFF TIME:23 HRS LOCAL
TEL: 02 1234
 TEL:02 1234
        3/ END
`;
const m3=A1C.parseSwiftMessages(t3);
const tags3=m3[0].tags.map(t=>t.tag);
ok(JSON.stringify(tags3)===JSON.stringify(['27','20','47A']), '태그 = 27·20·47A 만 ('+tags3.join(',')+')');
ok(!tags3.includes('02') && !tags3.includes('23'), '02 · 23 을 태그로 자르지 않음');
const c47=A1C.splitClauses(m3[0].tags[2].value);
ok(c47.length===3 && /TIME:23/.test(c47[1].text), '47A 조항 3개 유지, 「TIME:23」 은 2항 본문');

console.log('④ MT701 이어 붙이기 순서 (R1) — 파일 안 순서가 701 → 700 이어도 700(1/2) → 701(2/2)');
const t4=` 701  ISSUE OF A DOCUMENTARY CREDIT
 SEQUENCE OF TOTAL             :27   2/2
 DOCUMENTARY CREDIT NUMBER     :20   ABC123
 DOCUMENTS REQUIRED            :46A
        1. SIGNED COMMERCIAL INVOICE
        2. PACKING LIST
--- Page 2 ---
 700  ISSUE OF A DOCUMENTARY CREDIT
    INPUT HEADER            1648 260407BOTKJPJTAXXX5256684857
 SEQUENCE OF TOTAL             :27   1/2
 DOCUMENTARY CREDIT NUMBER     :20   ABC123
 PORT OF DISCHARGE/AIRPORT OF DESTINATION:44F
        REFER FIELD 47A
 ADDITIONAL CONDITIONS         :47A
        11. PORT OF DISCHARGE (FIELD 44F): CAT LAI OR CAI MEP
        - VUNG TAU
`;
const lc4=A1C.analyzeLcTexts([{name:'x.pdf',text:t4}],[]);
ok(lc4.msgTypes.join(',')==='700(1/2),701(2/2)', '순서 = '+lc4.msgTypes.join(','));
ok(lc4.current['46A'] && /PACKING LIST/.test(lc4.current['46A'].value), '701 의 46A 가 현재 LC 에 들어감');
ok(lc4.bank.key==='BIC:BOTKJPJT' && lc4.bank.source==='700:INPUT HEADER', '은행 키 = 700 INPUT HEADER 의 BIC8');
ok(lc4.forwarding.some(f=>f.tag==='44F'&&f.to==='47A'), '44F 「REFER FIELD 47A」 → 47A 조항 연결 (R3)');
const c4=A1C.splitClauses(lc4.current['47A'].value);
ok(c4.length===1 && /\n- VUNG TAU/.test(c4[0].text), '「- 」 하위 항목은 위 조항(47A-11)에 합침');

console.log('   MT710 (R8) — :21 = LC 번호, :52A = 발행은행');
const t710=` 710  ADVICE OF A THIRD BANK'S DOCUMENTARY CREDIT
    INPUT HEADER            1648 260407PCBCCNBJAXXX5256684857
 SEQUENCE OF TOTAL             :27   1/1
 SENDER'S REFERENCE            :20   CCBSH-REF-1
 DOCUMENTARY CREDIT NUMBER     :21   LC710XYZ
 ISSUING BANK                  :52A  PCBCMYKLXXX
`;
const lc710=A1C.analyzeLcTexts([{name:'y.pdf',text:t710}],[]);
ok(lc710.lcNo==='LC710XYZ' && lc710.bank.key==='BIC:PCBCMYKL', 'MT710: LC '+lc710.lcNo+' / '+lc710.bank.key);

console.log('   HEX → # (R2) · Amend 적용');
const h=A1C.hexToHash('CONSIGNEE 0300000002 HEX 999/GPMT HEX13-05');
ok(h.text==='CONSIGNEE 0300000002 # 999/GPMT #13-05' && h.log.length===2, 'HEX 2곳 → #, 기록 2건');
const am=A1C.applyAmends({'31D':{tag:'31D',label:'EXPIRY',value:'JUN 5, 2026,JAPAN'},'47A':{tag:'47A',label:'ADD',value:'1/ A'}},
  [{n:1,msgs:[{type:'707',tags:[{tag:'31E',label:'NEW DATE',value:'JUL 5, 2026'},{tag:'47B',label:'ADD',value:'/ADD/ 2/ B'},{tag:'71N',label:'CHG',value:'BENE'}]}]}]);
ok(am.tags['31D'].value==='JUL 5, 2026' && /\[AMEND1 ADD\] 2\/ B/.test(am.tags['47A'].value) && am.log.length===3, 'Amend: 31E→31D 교체 · 47B /ADD/ 추가 · 71N 기록');

console.log('⑤ leave-one-out — 대상 자신 · 이후 계약의 S/I 는 입력에 넣지 않음');
const T={no:'LRS-2609SG1',date:'2026-09-03',buyerId:'B',bankKey:'BIC:VCB'};
const pool=[
  {no:'LRS-2609SG1',date:'2026-09-03',buyerId:'B',bankKey:'BIC:VCB',hasSi:true},   // 자신
  {no:'LRS-2609SG2',date:'2026-09-10',buyerId:'B',bankKey:'BIC:VCB',hasSi:true},   // 같은 달 · 이후
  {no:'LRS-2610SG1',date:'2026-08-30',buyerId:'B',bankKey:'BIC:VCB',hasSi:true},   // 번호는 이후 (날짜가 앞서도 제외)
  {no:'LRS-2611SG3',date:'2026-11-01',buyerId:'B',bankKey:'BIC:VCB',hasSi:true},   // 이후
  {no:'LRS-2608SG3',date:'2026-08-20',buyerId:'B',bankKey:'BIC:VCB',hasSi:true},   // 앞 ✓
  {no:'LRS-2607SG1',date:'2026-07-02',buyerId:'B',bankKey:'BIC:VCB',hasSi:true},   // 앞 ✓
  {no:'LRS-2608SG1',date:'2026-08-01',buyerId:'B',bankKey:'BIC:MUFG',hasSi:true},  // 앞 · 다른 은행
  {no:'LRS-2608XS1',date:'2026-08-01',buyerId:'X',bankKey:'BIC:VCB',hasSi:true}    // 다른 바이어
];
const pr=A1C.pickPriors(T,pool,2,1);
ok(JSON.stringify(pr.same.map(x=>x.no))==='["LRS-2608SG3","LRS-2607SG1"]', '같은 은행 직전 = '+pr.same.map(x=>x.no).join(','));
ok(pr.other.length===0, '같은 은행 직전이 있으면 다른 은행 참고는 넣지 않음');
const all=pr.same.concat(pr.other).map(x=>x.no);
ok(!all.some(n=>['LRS-2609SG1','LRS-2609SG2','LRS-2610SG1','LRS-2611SG3'].includes(n)), '자신·이후 계약 0건');
const pr2=A1C.pickPriors(Object.assign({},T,{bankKey:'BIC:BNP'}),pool,2,1);
ok(pr2.same.length===0 && pr2.other.length===1 && pr2.other[0].no==='LRS-2608SG3', '첫 은행이면 같은 바이어 다른 은행 1건을 참고로 ('+pr2.other.map(x=>x.no)+')');
// 같은 날짜 · 같은 코드는 번호 순
ok(A1C.isEarlier({no:'LRS-2609SG1',date:'2026-09-03'},{no:'LRS-2609SG2',date:'2026-09-03'}) && !A1C.isEarlier({no:'LRS-2609SG2',date:'2026-09-03'},{no:'LRS-2609SG1',date:'2026-09-03'}), '같은 날 SG1 < SG2');
// 무작위 시험: 어떤 조합에서도 isEarlier 가 참이면 대상보다 앞선 계약번호 연월·날짜
let rnd=0; for(let i=0;i<3000;i++){ const mk=()=>({no:'LRS-26'+String(1+Math.floor(Math.random()*11)).padStart(2,'0')+'SG'+(1+Math.floor(Math.random()*3)),date:'2026-'+String(1+Math.floor(Math.random()*11)).padStart(2,'0')+'-'+String(1+Math.floor(Math.random()*27)).padStart(2,'0')});
  const a=mk(),b=mk(); if(A1C.isEarlier(a,b)){ rnd++; const pa=A1C.parseContractNo(a.no),pb=A1C.parseContractNo(b.no); assert.ok(pa.yymm<=pb.yymm && a.date<=b.date && a.no!==b.no, JSON.stringify([a,b])); assert.ok(!A1C.isEarlier(b,a)); } }
ok(rnd>0, '무작위 3000쌍: 「앞선 계약」 은 항상 번호 연월 ≤ · 날짜 ≤ · 반대 방향 거짓 ('+rnd+'쌍 해당)');

console.log('⑥ 정규화 · 판정 (完全一致 · 表記差 · 内容差 예시 각 3개)');
const J=(a,r,f)=>A1C.judgeField(a,r,f||'x');
[['TO ORDER OF  VIETCOMBANK','to order of vietcombank'],['NO. 10 SAMPLE BLVD HEX13-05','NO. 10 SAMPLE BLVD #13-05'],['DELTA PAPER***SAMPLE A','DELTA PAPER\nSAMPLE A']]
  .forEach(([a,r])=>ok(J(a,r).verdict==='完全一致', `完全一致: 「${a.replace(/\n/g,'⏎')}」 = 「${r.replace(/\n/g,'⏎')}」`));
[['HO CHI MINH CITY, VIET NAM','HO CHI MINH CITY, VIETNAM','P1'],['90 DAYS AFTER BILL OF LADING DATE','90 DAYS AFTER B/L DATE','P8a'],['HS CODE: 4707 10 00','HS CODE: 47071000','R15']]
  .forEach(([a,r,rule])=>{ const j=J(a,r,rule==='R15'?'hs_code':'x'); ok(j.verdict==='表記差' && j.rules.includes(rule), `表記差(${j.rules.join('+')}): 「${a}」 ↔ 「${r}」`); });
[['ILC0000101 DATED ON APR 07, 2026','ILC0000102 DATED ON APR 07, 2026'],['PO NO. SOP0000001','PO NO. SOP0000002'],['CIF CAI MEP PORT','CAI MEP PORT']]
  .forEach(([a,r])=>ok(J(a,r).verdict==='内容差?', `内容差 후보: 「${a}」 ↔ 「${r}」`));
ok(J('','X').verdict==='正解なし' && J('X','').verdict==='推奨なし' && J('','').verdict==='両方空', '正解なし · 推奨なし · 両方空');
ok(A1C.ungroundedNumbers('PO SOP0000001 / LC 99999999','... SOP0000001 ...').join()==='99999999', '숫자 근거 검사: 원문에 없는 번호만 걸림');

console.log('v1.2 층 태그 · S/I 변화 · LC JSON 비교');
ok(A1C.formatTags(lc4,'SUMITOMO MITSUI BANKING CORPORATION').join()==='SMBC_MT700_701', '형식 = SMBC_MT700_701');
ok(A1C.formatTags(lc710,'SUMITOMO MITSUI BANKING').join()==='SMBC_MT710', '형식 = SMBC_MT710');
ok(A1C.formatTags({image:true,amends:[{n:1}]},'').join()==='IMAGE,AMEND있음', '형식 = IMAGE + AMEND있음');
ok(A1C.classifyChange('PO NO. 1111/2222','PO NO. 1112/2223')==='番号のみ' && A1C.classifyChange('A','B C')==='文言' && A1C.classifyChange('','X')==='追加' && A1C.classifyChange('X','')==='削除' && A1C.classifyChange('x','X')==='同じ', 'S/I 변화 분류 5종');
const ch=A1C.siChanges([{no:'A1',layer:'L',sis:[{crcf9_sino:1,crcf9_po_vo:'PO 1',crcf9_consignee:'TO ORDER',_details:[{crcf9_hs_code:'HS CODE: 4707'}]}]},{no:'A2',layer:'L',sis:[{crcf9_sino:1,crcf9_po_vo:'PO 2',crcf9_consignee:'TO ORDER OF X',_details:[{crcf9_hs_code:'HS CODE: 4707'}]}]}]);
ok(ch.find(x=>x.field==='po_vo').change==='番号のみ' && ch.find(x=>x.field==='consignee').change==='文言' && ch.find(x=>x.field==='hs_code').change==='同じ', 'siChanges: po_vo 番号のみ · consignee 文言 · 명세 hs 同じ');
const lcS=A1C.analyzeLcTexts([{name:'s',text:FX.SG_LC}],[]);   // 가짜 SMBC 통지 텍스트 (legacy_fixtures.js)
const d01=FX.D01_SG[0];
const df=A1C.lcJsonDiff(d01,lcS); console.log(df.map(x=>`     ${x.item}: D-01=${String(x.d01).slice(0,40)} / 신규=${String(x.new_read).slice(0,40)} → ${x.same}`).join('\n'));
ok(df.find(x=>x.item==='lc_no').same==='一致' && df.find(x=>x.item==='amount').same==='一致' && df.find(x=>x.item==='expiry_31D').same==='一致', 'D-01 JSON(2604SG1) 과 LC 번호 · 금액 · 유효기한 一致');
console.log('추가 ② HEX→# (리나이 지시 2026-11-15, v0.2): 모든 HEX → #, 예외 단어(HEXAGON · HEXANE 등)만 제외');
[['0300000002HEX999','0300000002#999'],['NUMBERHEXSAIGON','NUMBER#SAIGON'],['HEX13-05','#13-05'],['10 SAMPLE BOULEVARD HEX13-05','10 SAMPLE BOULEVARD #13-05'],['TAX ID HEX 0101','TAX ID # 0101'],['CHEX 123','C# 123']]
  .forEach(([i,o])=>ok(A1C.hexToHash(i).text===o, `변환: 「${i}」 → 「${o}」`));
[['HEXAGON','예외 단어'],['HEXAGONAL NUT','예외 단어'],['N-HEXANE','예외 단어'],['HEXADECIMAL','예외 단어']]
  .forEach(([i,why])=>ok(A1C.hexToHash(i).text===i && A1C.hexToHash(i).log.length===0, `그대로: 「${i}」 (${why})`));
{ const h=A1C.hexToHash('A 0300000002HEX999/GPMT HEX13-05 HEXAGON NUMBERHEXSAIGON'); ok(h.text==='A 0300000002#999/GPMT #13-05 HEXAGON NUMBER#SAIGON' && h.log.length===3 && /0300000002HEX999/.test(h.log[0]), '바꾼 3곳을 전부 hexLog 에 (문맥 포함), HEXAGON 은 기록 없음'); }
ok(A1C.judgeField('0300000002HEX999/GPMT','0300000002#999/GPMT').verdict==='完全一致', '정규화(normV)도 같은 규칙: 「…231HEX999」 = 「…231#999」 完全一致');
ok(A1C.judgeField('HEXAGON BOLT','#AGON BOLT').verdict!=='完全一致', 'normV 에서도 HEXAGON 은 바꾸지 않음');

console.log('추가 ③ PUNCT (리나이 지시) — 다른 구두점의 앞·뒤가 숫자면 内容差');
[['USD 80,800.00','USD 80800.00'],['1.5 MT','15 MT'],['LOT CN5, NO 12','LOT CN5 NO.12'],['DATED 07.04.2026','DATED 07042026']]
  .forEach(([a,r])=>{ const j=A1C.judgeField(a,r); ok(j.verdict==='内容差' && j.rules.join()==='PUNCT-NUM', `内容差(PUNCT-NUM): 「${a}」 ↔ 「${r}」`); });
[['DELTA PAPER CORPORATION.','DELTA PAPER CORPORATION'],['SAMPLE A, SAMPLE WARD','SAMPLE A SAMPLE WARD'],['TEL: 02 3456','TEL 02 3456']]
  .forEach(([a,r])=>{ const j=A1C.judgeField(a,r); ok(j.verdict==='表記差' && j.rules.includes('PUNCT'), `表記差(PUNCT): 「${a}」 ↔ 「${r}」`); });
ok(A1C.judgeField('USD 80,800.00 PAID','USD 80,800.00 PAID.').verdict==='表記差', '양쪽에 같이 있는 「80,800.00」 은 문제 삼지 않음 (다른 구두점 「.」 만 봄 — 앞이 D)');
ok(A1C.judgeField('USD 80,800.00 X','USD 80,800.00, X').verdict==='内容差', '다른 구두점 「,」 의 앞이 숫자(0) → 内容差');

console.log('추가 ① 지점 키 (리나이 지시) · 支店違い');
const pg=(name,next)=>` LEENEAR\n${name}\nISSUING BANK\n${next||'198 TRAN'}\n 700  ISSUE OF A DOCUMENTARY CREDIT\n    INPUT HEADER            1648 260407ICBVVNVXAXXX5256684857\n DOCUMENTARY CREDIT NUMBER     :20   X1\n`;
const bA=A1C.analyzeLcTexts([{name:'a',text:pg('VIETNAM JOINT STOCK COMM.BANK FOR INDUSTRY AND TRADE HAI BA TRUNG BR.')}],[]);
const bB=A1C.analyzeLcTexts([{name:'b',text:pg('VIETNAM JOINT STOCK COMM.BANK FOR INDUSTRY AND TRADE TIEN SON BR.')}],[]);
const bC=A1C.analyzeLcTexts([{name:'c',text:pg('JOINT STOCK COMM\'L BANK FOR FOREIGN TRADE OF VIETNAM HANOI','(H.O.)   198 TRAN')}],[]);
ok(bA.bank.key==='BIC:ICBVVNVX' && bB.bank.key==='BIC:ICBVVNVX', '은행 키(BIC 8자리)는 같음: '+bA.bank.key);
ok(bA.branch.key!==bB.branch.key && /HAI BA TRUNG/.test(bA.branch.key) && bA.branch.source==='page1:ISSUING BANK', '지점 키는 다름: '+bA.branch.key+' / '+bB.branch.key);
ok(/HANOI HO$/.test(bC.branch.key), '「(H.O.)」 는 다음 줄이어도 지점명에 포함: '+bC.branch.key);
const m52=A1C.analyzeLcTexts([{name:'d',text:` 710  ADVICE OF A THIRD BANK'S DOCUMENTARY CREDIT\n DOCUMENTARY CREDIT NUMBER     :21   Z9\n ISSUING BANK                  :52A  PCBCMYKL123\n`}],[]);
ok(m52.branch.key==='BIC11:PCBCMYKL123' && m52.branch.source==='710:52A', ':52A 가 있으면 BIC 11자리: '+m52.branch.key);
let bc=A1C.branchCompare(bA.branch.key,[{no:'P1',branchKey:bB.branch.key}]);
ok(bc.flag==='支店違い' && bc.detail[0].state==='違い', '대상 HAI BA TRUNG vs 직전 TIEN SON → 支店違い');
bc=A1C.branchCompare(bA.branch.key,[{no:'P1',branchKey:bA.branch.key},{no:'P2',branchKey:bA.branch.key}]);
ok(bc.flag==='', '같은 지점 → 표시 없음');
bc=A1C.branchCompare(bA.branch.key,[{no:'P1',branchKey:''}]);
ok(bc.flag==='支店不明', '직전 계약 LC 원본 없음 → 支店不明 (支店違い 아님)');
bc=A1C.branchCompare(bA.branch.key,[{no:'P1',branchKey:'BIC11:ICBVVNVX142'}]);
ok(bc.flag==='支店不明', 'BIC11 과 지점명은 서로 비교하지 않음 → 支店不明');
ok(A1C.branchCompare(bA.branch.key,[]).flag==='', '직전 S/I 없음 → 표시 없음');
ok(A1C.BRANCH_FIELDS.join()==='consignee,notify_party', '표시 대상 칸 = consignee · notify_party');


console.log('v0.3 ① R2-① 프롬프트에 COMPASS · 직전 S/I · 마스터가 들어가지 않음');
{ const lcp={view:'VIEW-LC-ONLY', files:[{text:'LC BODY TEXT :50 A.B.C. PAPER MILL'}], amends:[{n:1,text:'AMEND BODY'}],
    contract:{no:'LRS-2608CA1',buyerName:'SENTINEL_BUYER_NAME'}, priorSi:'SENTINEL_PRIOR_SI', master:'SENTINEL_MASTER', name:'LRS-2608CA1_THF1.pdf', _base:[{name:'LRS-2608CA1_THF1.pdf'}] };
  const pr=A1C.r2ExtractPrompt(lcp);
  ok(pr.indexOf('LC BODY TEXT')>=0 && pr.indexOf('AMEND BODY')>=0 && pr.indexOf('VIEW-LC-ONLY')>=0, '① 프롬프트 = LC 본문 · Amend · 판독 구조');
  ok(!/SENTINEL|LRS-2608CA1|THF1\.pdf/.test(pr), '① 프롬프트에 판매계약 · 직전 S/I · 마스터 · 파일명(계약번호) 없음 — 같은 객체에 넣어 줘도 읽지 않음');
  ok(A1C.r2ExtractPrompt.length===1, '① 조립 함수의 인수는 1개 (LC 판독 결과)'); }

console.log('v0.3 ② 원문 검사');
{ const raw='--- Page 1 ---\n 46A\n        2/ THREE PHOTOCOPIES OF BILL\n        OF LADING CONSIGNED TO\n--- Page 2 ---\n        0300000002HEX999/GPMT-BTNMT#SECURITY';
  ok(A1C.quoteCheck('THREE PHOTOCOPIES OF BILL OF LADING CONSIGNED TO',raw)==='OK', '있음 (줄바꿈 · 들여쓰기는 공백 1칸으로)');
  ok(A1C.quoteCheck('CONSIGNED TO 0300000002#999/GPMT',raw)==='OK', '있음 (쪽 표시를 넘어서 · HEX↔#)');
  ok(A1C.quoteCheck('0300000002HEX999',raw)==='OK' && A1C.quoteCheck('0300000002#999',raw)==='OK', 'HEX 와 # 어느 쪽으로 인용해도 OK');
  ok(A1C.quoteCheck('THREE COPIES OF BILL OF LADING',raw)==='原文なし', '없음 (한 단어라도 바꾸면)');
  ok(A1C.quoteCheck(null,raw)==='原文なし' && A1C.quoteCheck('',raw)==='原文なし', 'quote 비어 있음 → 原文なし');
  const e1={lc_no:{value:'ILC1',loc:':20',quote:'ILC1'},applicant_name:{value:'A.B.C. PAPER MILL CO., LTD.',loc:':50',quote:'A.B.C. PAPER MILL CO., LTD.'},po:{value:'1111',loc:'47A-1',quote:'ORDER NO. 1111'}};
  const e2={lc_no:{value:'ILC1',loc:':20',quote:'ILC1'},applicant_name:{value:'A.B.C. PAPER MILL CO., LTD.',loc:':50',quote:'A.B.C. PAPER MILL CO., LTD.'},po:{value:'1113',loc:'47A-1',quote:'ORDER NO. 1113'}};
  const ck=A1C.r2Check(e1,e2,':20 ILC1\n:50 A.B.C. PAPER MILL CO., LTD.\n 47A 1. ORDER NO. 1111',false);
  const g=k=>ck.find(x=>x.item===k);
  ok(g('lc_no').pass && g('applicant_name').pass, '두 번 일치 + 원문 있음 → 통과');
  ok(g('po').read==='判読不一致' && !g('po').pass, '두 번 다름 → 判読不一致 (통과 안 함)');
  const ck2=A1C.r2Check({applicant_name:{value:'A.B.C.PAPER CO.,LTD.',quote:'A.B.C.PAPER CO.,LTD. 1 EXAMPLE'}},{applicant_name:{value:'A.B.C.PAPER CO.,LTD.',quote:'A.B.C.PAPER CO.,LTD. 1 EXAMPLE'}},':50 A.B.C. PAPER MILL CO., LTD. 64/3 MOO 3',false);
  ok(ck2[0].read==='一致' && ck2[0].quote1==='原文なし' && !ck2[0].pass, 'CAS 실례형: 두 번 같아도 원문에 없으면 原文なし (LC 출처로 못 씀)');
  const ck3=A1C.r2Check({lc_no:{value:'M06',quote:'M06'}},{lc_no:{value:'M06',quote:'M06'}},'',true);
  ok(ck3[0].quote1==='イメージLC' && ck3[0].pass, '이미지 LC: 원문 검사 대신 イメージLC, 두 번 일치하면 통과'); }

console.log('v0.3 ③ 출처 검사 · 대조표');
{ const q=['A.B.C. PAPER MILL CO., LTD. 64/3 MOO 3, SAMPLE HIGHWAY ROAD','TO THE ORDER OF KASIKORNBANK'];
  ok(A1C.sourceCheck('A.B.C. PAPER MILL CO., LTD.','LC(:50)',q)==='OK', 'LC 값이 quote 안에 있음 → OK');
  ok(A1C.sourceCheck('A.B.C.PAPER CO.,LTD.\n1 EXAMPLE ROAD BANGKOK','LC(:50)',q)==='出典不一致', 'LC 에 없는 방콕 주소 → 出典不一致 (CAS 실례형)');
  ok(A1C.sourceCheck('TO THE ORDER OF KASIKORNBANK***XX','LC(46A-3)',q)==='OK', '*** · XX 자리표시는 빼고 검사');
  ok(A1C.sourceCheck('ILC0000101 DATED ON APR 07, 2026','LC(:20 :31C)',['ILC0000101','APR  7, 2026'])==='OK', 'LC 번호 + 발행일 조합 (DATED ON) → 숫자 토큰이 모두 원문에 있으면 OK');
  ok(A1C.sourceCheck('ILC0000101 DATED ON APR 07, 2099','LC(:20)',['ILC0000101','APR  7, 2026'])==='出典不一致', '연도가 원문에 없음 → 出典不一致');
  ok(A1C.sourceCheck('SAMPLE A INDUSTRIAL PARK, HO CHI MINH CITY, VIETNAM','LC(:50)',['SAMPLE A INDUSTRIAL PARK, SAMPLE WARD, HO CHI MINH CITY, VIET NAM'])==='OK', '표기 차이(VIET NAM) · 일부 생략은 핵심 낱말 60% 이상이면 OK');
  ok(A1C.sourceCheck('ANYTHING','PRIOR(LRS-2606CA1)',q)==='' && A1C.sourceCheck('XX','PLACEHOLDER',q)==='', 'source 가 LC 가 아니면 검사 안 함');
  const ck=A1C.r2Check({applicant_name:{value:'A.B.C. PAPER MILL CO., LTD.',quote:'A.B.C. PAPER MILL CO., LTD.'},goods:[{grade:'OCC',quantity:'400 MT',unit_price:'USD 180',quote:'400 MT'}]},
    {applicant_name:{value:'A.B.C. PAPER MILL CO., LTD.',quote:'A.B.C. PAPER MILL CO., LTD.'},goods:[{grade:'OCC',quantity:'400 MT',unit_price:'USD 180',quote:'400 MT'}]},'A.B.C. PAPER MILL CO., LTD. 400 MT',false);
  const rc=A1C.r2Reconcile(ck,{contract:{no:'LRS-2608CA1',buyerName:'A.B.C.PAPER CO.,LTD.',details:[{item:'JOCC',quantity:400,price:175}]},prior:{no:'LRS-2606CA1',s1:{crcf9_notify_party:'A.B.C. PAPER MILL CO., LTD.'}},masterHs:[],lcRaw:'... ORDER ...'});
  const r=(i,src)=>rc.find(x=>x.item===i&&x.compass_src.indexOf(src)>=0);
  ok(r('applicant_name','buyer_name').result==='差異' && r('applicant_name','notify_party').result==='一致', '대조표: LC :50 ↔ COMPASS 바이어명 差異 · ↔ 직전 S/I notify 一致');
  ok(r('goods[0].quantity','数量').result==='一致' && r('goods[0].unit_price','単価').result==='差異', '대조표: 수량 一致 (400 MT ↔ 400) · 단가 差異 (180 ↔ 175)');
  ok(r('contract_no','contract_no').result==='片方のみ', '대조표: 계약번호가 LC 에 없으면 片方のみ'); }

console.log('v0.3 ④ 명세 짝짓기 (2609A1 실데이터 형태)');
{ const ans=[{crcf9_productname:'WASTE PAPER (ONP)HS CODE 4707 30',crcf9_hs_code:'HS CODE: 4707 30'},{crcf9_productname:'WASTE PAPER (OMG)HS CODE 4707 90',crcf9_hs_code:'HS CODE: 4707 90'}];
  const rec=[{crcf9_productname:'WASTE PAPER (OMG)HS CODE 4707 90',crcf9_hs_code:'HS CODE: 4707 90'},{crcf9_productname:'WASTE PAPER (ONP)HS CODE 4707 30',crcf9_hs_code:'HS CODE: 4707 30'}];
  const pr=A1C.pairDetails(ans,rec);
  ok(pr[0].ri===1 && pr[1].ri===0, '정답 ONP ↔ 추천 2행, 정답 OMG ↔ 추천 1행');
  let oldDiff=0, newDiff=0;
  for(let run=0;run<6;run++) ans.forEach((a,i)=>A1C.DETAIL_FIELDS.forEach(([s,col])=>{ if(A1C.judgeField(a[col],rec[i][col],s).verdict!=='完全一致') oldDiff++; if(A1C.judgeField(a[col],rec[pr[i].ri][col],s).verdict!=='完全一致') newDiff++; }));
  ok(oldDiff===24 && newDiff===0, '3모델 × 2회 × 2칸 × 2줄: 줄 순서 비교 24행 → 품목 짝짓기 0행 ('+oldDiff+'→'+newDiff+')');
  const pr2=A1C.pairDetails([{crcf9_productname:'JONP'},{crcf9_productname:'JOCC'}],[{crcf9_productname:'OCC'}]);
  ok(pr2[0].ri===-1 && pr2[1].ri===0, '추천에 없는 품목 → 対応なし (JONP), JOCC ↔ OCC'); }

console.log('v0.3 ⑤ P-PAY');
{ const J=(a,r,f)=>A1C.judgeField(a,r,f||'payment_deadline');
  let j=J('90 DAYS AFTER BILL OF LADING DATE FOR 100 PERCENT INVOICE VALUE','90 DAYS AFTER B/L FOR 100PCT OF INVOICE VALUE');
  ok(j.verdict==='表記差' && j.rules.includes('P-PAY'), '같은 뜻 (파일럿 2608SG3 실례) → 表記差 '+j.rules.join('+'));
  j=J('AT 90 DAYS AFTER THE B/L DATE','AT 90 DAYS AFTER B/L'); ok(j.verdict==='表記差', 'THE · DATE 생략 → 表記差');
  j=J('100 % OF INVOICE VALUE','100PCT INVOICE VALUE'); ok(j.verdict==='表記差', '% ↔ PCT → 表記差');
  j=J('120 DAYS AFTER BILL OF LADING DATE','90 DAYS AFTER B/L'); ok(j.verdict==='内容差' && j.rules.join()==='P-PAY-NUM', '숫자 다름 → 内容差 (P-PAY-NUM)');
  j=J('90 DAYS AFTER B/L FOR 100PCT','90 DAYS AFTER B/L FOR 110PCT'); ok(j.verdict==='内容差', '비율 다름 → 内容差');
  j=A1C.judgeField('90 DAYS AFTER BILL OF LADING DATE FOR 100 PERCENT','90 DAYS AFTER B/L FOR 100PCT','consignee'); ok(j.verdict!=='表記差' || !j.rules.includes('P-PAY'), 'P-PAY 는 지급조건 칸(payment_deadline · payment_terms)에만'); }

console.log('v0.3 ⑥ auto_cat 3종');
{ const src='LC :20 ILC1 PO 1111 / 直前SI ... / 契約 LRS-2609MG1';
  ok(A1C.autoCat({verdict:'内容差',answer:'VO NO. VO-26-0912 PO 1111'},src,null)==='E5_入力外番号', 'E5: 정답의 「VO-26-0912」 가 입력 어디에도 없음');
  ok(A1C.autoCat({verdict:'内容差',answer:'90 DAYS AFTER B/L DATE'},src,'90 DAYS AFTER B/L DATE')==='E4_前回維持', 'E4: 정답 = 직전 S/I 값');
  ok(A1C.autoCat({verdict:'内容差',answer:'X',after_etd:'ETD後に修正'},src,'Y')==='ETD後修正', 'ETD後修正: S/I 수정일 > ETD');
  ok(A1C.autoCat({verdict:'内容差',answer:'PO 1111'},src,'Z')==='' && A1C.autoCat({verdict:'表記差',answer:'VO-99'},src,null)==='', '그 밖 · 内容差가 아닌 행 → 빈칸');
  ok(A1C.autoCat({verdict:'内容差',answer:'VO 7777',after_etd:'x'},src,'VO 7777')==='E5_入力外番号+E4_前回維持+ETD後修正', '여러 개면 + 로 이음'); }

console.log('v0.3 비용 추정');
{ const e=A1C.estimateCost([{label:'R1',model:'claude-opus-5-5',calls:24,inTok:15000,outTok:8000},{label:'x',model:'unknown',calls:2,inTok:1,outTok:1}],{'claude-opus-5-5':[4,20]});
  ok(Math.abs(e.total-24*(15000*4+8000*20)/1e6)<1e-9 && e.lines[1].priced===false, '호출 수 × 토큰 × 단가 (단가 없는 모델은 「단가 없음」)'); }

console.log('v0.4 Step 1 — ② 이중 판독 일치 판정 (지시서 표 11줄)');
{ const one=(item,v1,v2,image)=>{ const mk=v=>{ const e={}; if(item==='47A') e.conditions_47A=[{no:v,quote:'X'}]; else if(/^goods/.test(item)) e.goods=[{quantity:v,quote:null}]; else e[item]={value:v,quote:null}; return e; };
    const ck=A1C.r2Check(mk(v1),mk(v2),'',!!image); return item==='47A'?ck:ck.find(x=>x.item===(item==='goods'?'goods[0].quantity':item)); };
  const T=[['issue_date','2026-09-08','SEP 8, 2026','一致'],['expiry','NOV 4, 2026, JAPAN','2026-11-04 / JAPAN','一致'],['tolerance','+5% / -5%','5% MORE OR 5% LESS','一致'],
    ['tolerance','10/10','+/-10% (10/10)','一致'],['goods','500 MT(+/-5%)','500 MT (+/-5%)','一致'],['bl_notify','APPLICANT WITH FULL NAME AND ADDRESS','THE APPLICANT WITH FULL NAME AND ADDRESS','一致'],
    ['po','IP-PO0000099999','IP-PO0000099999 (45Aには記載なし…)','一致'],['tolerance','+5% / -5%','+10% / -10%','判読不一致'],['issue_date','2026-08-05','2026-08-15','判読不一致']];
  T.forEach(([it,a,b,exp])=>{ const r=one(it,a,b); ok(r.read===exp && (exp!=='一致'||r.read_basis==='normalized'), `${it}: 「${a}」 / 「${b}」 → ${r.read} (${r.read_basis})`); });
  const k47=one('47A','47A-14 (AMEND 1 …)','47A-14 (AMEND1 :47B …)');
  ok(k47.length===1 && k47[0].item==='47A-14/AMEND' && k47[0].read==='一致', '47A: 「47A-14 (AMEND 1 …)」 / 「47A-14 (AMEND1 :47B …)」 → 같은 조항 47A-14/AMEND 로 짝지어 비교');
  const k47b=A1C.r2Check({conditions_47A:[{no:'47A-14 (原発行時)',quote:'A'},{no:'47A-14 (AMEND 1)',quote:'B'}]},{conditions_47A:[{no:'14',quote:'A'},{no:'47A 14 AMEND',quote:'B'}]},'',true);
  ok(k47b.length===2 && k47b.every(x=>x.read==='一致'), '47A: 원문 14번 · Amend 14번이 둘 다 있으면 따로 짝지음');
  const img=A1C.r2Check({applicant_address:{value:'123 SAMPLE -EUP SAMPLECITY',quote:null}},{applicant_address:{value:'123 SAMPLE-EUP SAMPLECITY',quote:null}},'',true)[0];
  ok(img.read==='判読不一致' && img.quote1==='イメージLC', '이미지 LC applicant_address 「SAMPLE -EUP」 / 「SAMPLE-EUP」 → 判読不一致 유지 (글자 판독 차이)');
  const img2=A1C.r2Check({lc_no:{value:'M0609',quote:null}},{lc_no:{value:'M0609',quote:null}},'',true)[0];
  ok(img2.pass && img2.image_confirm==='要確認', '이미지 LC 통과 값에 image_confirm=要確認');
  const raw=':31C  SEP  8, 2026\n:20 ILC9';
  const qq=A1C.r2Check({issue_date:{value:'2026-09-08',quote:'SEP 8, 2026'}},{issue_date:{value:'SEP 8, 2026',quote:'SEP  8, 2026'}},raw,false)[0];
  ok(qq.read==='一致' && qq.read_basis==='normalized' && qq.pass && qq.passValue==='2026-09-08', '(v0.5 변경) quote 가 같아도 一致 근거는 값 — 날짜 정규화로 一致 (normalized), v0.4 는 quote');
  const dc=A1C.r2Check({docs:[{doc_type:'IV',originals:'3',quote:'X'}]},{docs:[{doc_type:'IV',copies:'3',quote:'X'}]},'',true)[0];
  ok(dc.kind==='docs', 'docs 는 kind=docs 로 따로 셈'); }

console.log('v0.4 Step 4 — 칸별 · 양방향 출처 검사 (지시서 표 8줄)');
{ const lc={applicant_name:'A.B.C. PAPER MILL CO., LTD.',applicant_address:'64/3 MOO 3, SAMPLE HIGHWAY ROAD, SAMPLEKRUAM, MUANG SAMPLEPROV DISTRICT, SAMPLEPROV 16000 THAILAND',
    bl_consignee:'TO THE ORDER OF KASIKORNBANK PUBLIC COMPANY LIMITED, BANGKOK'};
  const F=(f,v,prior)=>A1C.fieldLcCheck(f,v,lc,prior||null,[],[]);
  let r=F('notify_party','A.B.C. PAPER MILL CO., LTD.'); ok(r.result==='OK','notify_party 「A.B.C. PAPER MILL CO., LTD.」 → OK');
  r=F('notify_party','A.B.C.PAPER CO.,LTD.'); ok(r.result==='LC確認' && r.missing.join()==='MILL','notify_party 「A.B.C.PAPER CO.,LTD.」 → LC確認 (missing '+r.missing+')');
  r=F('address','46/3 MOO 5, SAMPLE HIGHWAY ROAD, SAMPLEPROV 16000 THAILAND'); ok(r.result==='LC確認' && r.extra.sort().join()==='46,5','address 「46/3 MOO 5 …」 → LC確認 (extra '+r.extra+')');
  r=F('address','400/99 SAMPLEYOTHIN ROAD BANGKOK 10400 THAILAND'); ok(r.result==='LC確認','address 은행 주소 「400/99 SAMPLEYOTHIN …」 → LC確認 (extra '+r.extra.join(' ')+')');
  r=F('consignee','TO THE ORDER OF BANGKOK BANK PUBLIC COMPANY LIMITED'); ok(r.result==='LC確認' && r.missing.indexOf('KASIKORNBANK')>=0,'consignee 「…BANGKOK BANK…」 → LC確認 (missing KASIKORNBANK)');
  const em='64/3 MOO 3, SAMPLE HIGHWAY ROAD, SAMPLEKRUAM, MUANG SAMPLEPROV DISTRICT, SAMPLEPROV 16000 THAILAND EMAIL:XXX@ABC.COM';
  r=F('address',em,'SOMETHING EMAIL:XXX@ABC.COM'); ok(r.result==='OK','address 정답형 + 직전 S/I 에 같은 EMAIL → OK');
  r=F('address',em,'NO MAIL HERE'); ok(r.result==='LC確認' && /EMAIL/.test(r.extra.join()),'같은 값, 직전 S/I 에 EMAIL 없음 → LC確認 (extra '+r.extra.join(' ')+')');
  r=F('address','1 EXAMPLE ROAD BANGKOK'); ok(r.result==='LC確認','source=PRIOR(…) 인 방콕 주소도 LC確認 (함수는 source 를 받지 않음)');
  ok(A1C.fieldLcCheck('po_vo','SOP1 EXAMPLE',{po:'SOP1'},null,[],[]).result==='LC確認' && A1C.fieldLcCheck('po_vo','SOP1 EXAMPLE',{po:'SOP1'},null,[],['EXAMPLE']).result==='OK', '허용 목록 인수 (나중에 바이어 × 은행 마스터) — v0.5: address 는 누락 검사가 생겨 po_vo 로 시험');
  ok(A1C.fieldLcCheck('lc_no','ILC0000101 DATED ON SEP 08, 2026',{lc_no:'ILC0000101',issue_date:'SEP 8, 2026'},'ILC2601111 DATED ON AUG 06, 2026',[],[]).result==='OK', 'lc_no 「… DATED ON SEP 08, 2026」 → OK (DATED · ON 은 직전 S/I 형식)');
  ok(A1C.fieldLcCheck('remark','ANY',lc,null,[],[])===null, '대응표에 없는 칸은 검사 안 함'); }

console.log('v0.4 Step 2 — format_check · Step 3 자리표시');
{ const FC=A1C.formatCheck;
  ok(FC('0300000002#999/GPMT-BTNMT#DEPOSIT#SAIGON','0300000002#999/GPMT-BTNMT#DEPOSIT#SAIGON',true,[],'')==='SAME_AS_PRIOR', 'SAME_AS_PRIOR');
  ok(FC('PO NO. 1112/2223','PO NO. 1111/2222',true,['ORDER NO. 1112/2223'],'')==='CONTENT_UPDATED', 'CONTENT_UPDATED (바뀐 낱말이 이번 LC 값)');
  ok(FC('0300000002#999/GPMT-BTNMT#SECURITY DEPOSIT NUMBER#SAIGON','0300000002#999/GPMT-BTNMT#DEPOSIT#SAIGON',true,[],'')==='FORMAT_CHANGED', 'FORMAT_CHANGED (F4 실례 「#SECURITY DEPOSIT NUMBER#」 — 이번 LC 통과 값에 없는 낱말)');
  ok(FC('0300000002#999/GPMT-BTNMT#DEPOSIT : XX#SAIGON','0300000002#999/GPMT-BTNMT#DEPOSIT#SAIGON',true,[],'')==='FORMAT_CHANGED', 'FORMAT_CHANGED (파일럿 F4 실례형 「#DEPOSIT : XX#」 — 새 낱말이 LC 에 없음)');
  ok(FC('SAMPLE A, VIETNAM','SAMPLE A, VIETNAM EMAIL: SAMPLE@EXAMPLE.COM',true,[],'')==='FORMAT_CHANGED', 'FORMAT_CHANGED (주소 뒤 EMAIL 이 빠짐 — F4)');
  // v0.9 규칙 변경 (지시서 v0.9 Step 3-3): note 의 「L/C指定文言」 만으로는 LC_REQUIRED_WORDING 을 붙이지 않음 — 코드가 L/C 지시를 찾았을 때(6번째 인수 lcw.found)만
  ok(FC('ANY','PRIOR',true,[],'L/C指定文言',{found:true,match:false})==='LC_REQUIRED_WORDING' && FC('ANY','PRIOR',true,[],'L/C指定文言')!=='LC_REQUIRED_WORDING' && FC('ANY','',false,[],'')==='NO_PRIOR', 'LC_REQUIRED_WORDING (L/C 지시 찾음 · v0.9) · note 만 → 붙이지 않음 · NO_PRIOR');
  const PR=A1C.applyPlaceholderRule;
  ok(PR('vo_no','XX',true,'').removed && PR('vo_no','XX',true,'').value==='', 'VO 안 쓰는 바이어 (직전 같은 칸 빈칸) → XX 넣지 않음');
  ok(PR('remark','VO NUMBER: XX',true,null).removed, '「VO NUMBER: XX」 처럼 자리표시뿐인 값도');
  ok(!PR('vo_no','XX',true,'VO-26-0001').removed, '직전 S/I 가 그 칸을 쓰던 경우 → XX 유지');
  ok(PR('vo_no','XX',false,null).removed && !PR('bl_text1','DEPOSIT: XX',false,null).removed, '직전 S/I 없음 → vo_no 만 XX 빼고, 다른 칸은 유지');
  ok(!PR('bl_text1','WASTE PAPER#XXKGS#XXBALES',true,'').removed, '내용이 있는 값(XXKGS 등이 섞인 문구)은 자리표시뿐이 아님'); }

console.log('v0.5 Step 1 — 一致는 값으로만 (지시서 표)');
{ const raw=' :44C  261020\n 47A  1. SHIPMENT 261020 OR LATEST 261120 ACCEPTABLE\n 45A + QUANTITY: 500 MT, UNIT PRICE: USD 215/MT';
  let r=A1C.r2Check({latest_shipment:{value:'261020',quote:'261020'}},{latest_shipment:{value:'261120',quote:'SHIPMENT 261020 OR LATEST 261120'}},raw,false)[0];
  ok(r.read==='判読不一致' && !r.pass, 'latest_shipment 261020 / 261120 (2회 quote 가 1회 quote 를 포함) → 判読不一致 (v0.4 는 一致 · pass)');
  const gq='QUANTITY: 500 MT, UNIT PRICE: USD 215/MT';
  const ck=A1C.r2Check({goods:[{quantity:'500 MT',unit_price:'USD 215',quote:gq}]},{goods:[{quantity:'550 MT',unit_price:'USD 215',quote:gq}]},raw,false);
  const g=k=>ck.find(x=>x.item===k);
  ok(g('goods[0].quantity').read==='判読不一致' && !g('goods[0].quantity').pass, 'goods[0].quantity 500 MT / 550 MT (같은 goods quote) → 判読不一致');
  ok(g('goods[0].unit_price').read==='一致' && g('goods[0].unit_price').read_basis==='same' && g('goods[0].unit_price').pass, 'goods[0].unit_price USD 215 / USD 215 → 一致 (same)');
  r=A1C.r2Check({issue_date:{value:'2026-09-08',quote:null}},{issue_date:{value:'SEP 8, 2026',quote:null}},'',true)[0];
  ok(r.read==='一致' && r.read_basis==='normalized', 'issue_date 2026-09-08 / SEP 8, 2026 → 一致 (normalized)');
  const c47=A1C.r2Check({conditions_47A:[{no:'47A-1',quote:'SHIPMENT 261020 OR LATEST 261120'}]},{conditions_47A:[{no:'1',quote:'SHIPMENT 261020 OR LATEST 261120'}]},raw,false)[0];
  ok(c47.read==='一致' && c47.read_basis==='same' && c47.pass, '47A (value = quote) 는 영향 없음 → 一致 (same) · 통과');
  r=A1C.r2Check({po:{value:'SOP-9',quote:gq}},{po:{value:'SOP-9',quote:gq}},raw,false)[0];
  ok(r.pass && r.value_in_quote==='NG', 'value_in_quote: 통과 값이 자기 quote 안에 없으면 NG (pass 는 그대로)');
  r=A1C.r2Check({po:{value:'500 MT',quote:gq}},{po:{value:'500 MT',quote:gq}},raw,false)[0];
  ok(r.pass && !r.value_in_quote, '값이 quote 안에 있으면 표시 없음');
  r=A1C.r2Check({latest_shipment:{value:'2026-10-20',quote:'261020'}},{latest_shipment:{value:'OCT 20, 2026',quote:'261020'}},raw,false)[0];
  ok(r.pass && !r.value_in_quote, '정규화 항목(날짜 등)은 value_in_quote 검사 제외'); }

console.log('v0.5 Step 2 — address 누락 검사 (지시서 표)');
{ const LCA='64/3 MOO 3, SAMPLE HIGHWAY ROAD, SAMPLEKRUAM, MUANG SAMPLEPROV DISTRICT, SAMPLEPROV 16000 THAILAND', BKK='1010 EXAMPLE ROAD, SAMPLEKHLO, SAMPLELAEM, BANGKOK 10120 THAILAND';
  const lc={applicant_name:'A.B.C. PAPER MILL CO., LTD.',applicant_address:LCA};
  const F=(v,prior)=>A1C.fieldLcCheck('address',v,lc,prior==null?null:prior,[],[]);
  let r=F(BKK,BKK); ok(r.result==='LC確認' && ['SAMPLEPROV','16000','SAMPLE','HIGHWAY'].every(w=>r.missing.indexOf(w)>=0) && r.extra.length===0, 'address=BKK · 직전=BKK → LC確認 (missing '+r.missing.join(' ')+') — v0.4 는 OK');
  r=F(BKK,null); ok(r.result==='LC確認' && r.extra.length>0 && r.missing.length>0, 'address=BKK · 직전 없음 → LC確認 (extra · missing 둘 다)');
  r=F(LCA,BKK); ok(r.result==='OK', 'address=LC 주소 그대로 · 직전=BKK → OK');
  r=F(LCA+' EMAIL:XXX@ABC.COM','X EMAIL:XXX@ABC.COM'); ok(r.result==='OK', 'address=LC 주소 + EMAIL · 직전에 같은 EMAIL → OK');
  r=F(LCA.replace('SAMPLEKRUAM, ',''),LCA); ok(r.result==='LC確認' && r.missing.join()==='SAMPLEKRUAM', 'address=LC 주소에서 SAMPLEKRUAM 만 뺌 · 직전=LC 주소 → LC確認 (missing SAMPLEKRUAM)');
  r=A1C.fieldLcCheck('address',BKK,{applicant_name:'X'},BKK,[],[]); ok(r.result==='OK', 'LC 주소가 ②를 통과 못 해 없으면 누락 검사 안 함 (지금처럼)'); }
console.log('legacy_unit pass',pass,'fail',fail); process.exitCode=fail?1:0;
