/* fd_bench v0.2 시험 (지시서 THOR_15 ①-1 ~ ①-7 · v0.2 THOR_17 E-K3 보험 AI · E-K4 FD送付日) — 가짜 데이터 · 가짜 거래처 (SAMPLE · TEST · 2699) · 네트워크 없음 · AI 0
   쪽 판별 (v3 + 새 종류 6 · 手形 종류 없음) · 읽는 곳 순서 (FD_DATA > 文字版 > DRAFT DOC > 단품 > 通関 [通関版] · FD.pdf · TO BANK 안 읽음) ·
   묶음별 판정 (一致 · 相違 · 読取確認 · 対象外) · 試験 = trial (전체 판정 영향 0) · 有効 만 판정 · 마스터에 없는 줄 = 실행 안 함 ·
   TO BANK AI (2 회 같음/다름 · THIRD ORIGINAL = TRIPLICATE · 1 쪽째만 셈 · Sea Waybill 사본 · Free Time 증명) · 저장본 다시 안 읽음 · 화면 한글 0 · 버전 · 푸터
   node run_all.js [fd_bench.html] */
const fs=require('fs'), path=require('path');
const HTML_P=process.argv[2]||path.join(__dirname,'../../fd_bench.html'), HTML=fs.readFileSync(HTML_P,'utf8');
const FD=new Function('module',HTML.match(/<script id="fd-core">([\s\S]*?)<\/script>/)[1]+';return FD;')(undefined);
let pass=0,fail=0; const J=JSON.stringify, rows=[];
const ok=(c,m,info)=>{ if(c){pass++;} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,700));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
const sect=(name,fn)=>{ const p0=pass,f0=fail; fn(); rows.push([fail===f0?'PASS':'FAIL',name,'pass '+(pass-p0)+' fail '+(fail-f0)]); };
const pg=(n,lines)=>({page:n, lines});
const cls=t=>FD.classifyPage(t).type;

/* ── 가짜 서류 (D-03 모양) ── */
const IV='NTST2699-01';
const ivLines=(o)=>{ o=o||{}; return ['COMMERCIAL INVOICE','Seller Date 2026/11/05','SAMPLE EXPORT CORPORATION','2-6-99 SAMPLE-CHO, TOKYO, JAPAN Invoice No '+IV,'Payment Term AT 90 DAYS AFTER B/L DATE FOR 100PCT OF','INVOICE VALUE',
  'SAMPLE BUYER PAPER CO., LTD Shipped per SAMPLE STAR 2699S','Buyer','99 SAMPLE ROAD, SAMPLE CITY, SAMPLELAND','On or about 2026/11/05','From TOKYO, JAPAN','Trade Term CIF SAMPLE PORT, SAMPLELAND','To SAMPLE PORT, SAMPLELAND',
  'L/C No. TESTLC2699001 DATED ON OCT 09, 2026','Shipping Mark NO MARK',(o.grade||'WASTE PAPER SAMPLE OCC')+' 117 119.47 '+(o.price||205)+' 24,491.35','TOTAL 117 119.47 24,491.35'].concat(o.noOrigin?[]:['COUNTRY OF ORIGIN : JAPAN'],['SAMPLE EXPORT CORPORATION']); };
const plLines=(o)=>{ o=o||{}; return ['PACKING LIST','Seller Date 2026/11/05','SAMPLE EXPORT CORPORATION Invoice No '+IV,'SAMPLE BUYER PAPER CO., LTD Shipped per SAMPLE STAR 2699S','From TOKYO, JAPAN','To SAMPLE PORT, SAMPLELAND',
  'L/C No. TESTLC2699001 DATED ON OCT 09, 2026','Shipping Mark NO MARK','1 WASTE PAPER SAMPLE OCC TSTU2699001 SEAL2699 117 119.47 119.47 45GP','TOTAL 1 Containers 117 119.47 '+(o.gross||119.47)].concat(o.noOrigin?[]:['COUNTRY OF ORIGIN : JAPAN']); };
const blLines=['SHIPPER SAMPLE EXPORT CORPORATION','CONSIGNEE TO ORDER OF SAMPLE BANK','OCEAN VESSEL SAMPLE STAR 2699S','PORT OF LOADING TOKYO, JAPAN','PORT OF DISCHARGE SAMPLE PORT, SAMPLELAND','FCL/FCL CY/CY SHIPPER\'S LOAD, COUNT & SEAL','SHIPPED ON BOARD NOV 05, 2026','BILL OF LADING NO TESTBL2699'];
const beneLines=['BENEFICIARY\'S CERTIFICATE','Date : 2026/11/05','WE HEREBY CERTIFY THAT SHIPMENT ADVICE INDICATING CONTRACT NUMBER, GOODS, TOTAL WEIGHT, VALUE OF SHIPMENT HAS BEEN SENT TO APPLICANT','L/C NO.: TESTLC2699001','SAMPLE EXPORT CORPORATION'];
const LC=o=>Object.assign({schema:'lc_read/1', lc_no:'TESTLC2699001', issue_date:'2026-10-09', expiry_date:'2026-12-20', latest_shipment:'2026-11-30', price_term:'CIF SAMPLE PORT, SAMPLELAND',
  amount:{number:102500, currency:'USD'}, tolerance:{pct:5}, payment:{tenor_text:'AT 090 DAYS AFTER B/L DATE FOR 100 PERCENT INVOICE VALUE'}, applicant:{name:'SAMPLE BUYER PAPER CO., LTD', address:'99 SAMPLE ROAD, SAMPLE CITY, SAMPLELAND'},
  beneficiary:'SAMPLE EXPORT CORPORATION 2-6-99 SAMPLE-CHO, TOKYO, JAPAN', pod:{text:'SAMPLE PORT IN SAMPLELAND'}, pol:{text:'ANY PORT IN JAPAN'}, bl:{originals:'3'},
  goods:[{grade:'WASTE PAPER SAMPLE OCC', quantity:'500MT', unit_price:'USD205/MT'}],
  docs_46A:[{doc_type:'IV', quote:'SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS'},{doc_type:'PL', quote:'PACKING LIST IN 3 COPIES'},{doc_type:'B/L', quote:'FULL SET OF CLEAN ON BOARD OCEAN BILLS OF LADING MADE OUT TO THE ORDER OF SAMPLE BANK'},
    {doc_type:'INS', quote:'FULL SET OF INSURANCE POLICY FOR 110 PERCENT OF INVOICE VALUE COVERING INSTITUTE CARGO CLAUSES (A), CLAIMS PAYABLE IN SAMPLELAND'},
    {doc_type:'BENE_CERT', quote:"BENEFICIARY'S CERTIFICATE CERTIFYING THAT SHIPMENT ADVICE INDICATING CONTRACT NUMBER, GOODS, TOTAL WEIGHT, VALUE OF SHIPMENT HAS BEEN SENT TO APPLICANT"}],
  conditions_47A:[{quote:'ALL DOCUMENTS MUST SHOW THIS CREDIT NUMBER.'}]}, o||{});
const files=(o)=>{ o=o||{}; return [{name:IV+'_.pdf', modified:'2026-11-05T01:00:00Z', pages:[pg(1,ivLines(o.iv)),pg(2,plLines(o.pl)),pg(3,beneLines)]}, {name:IV+'_DRAFT.pdf', pages:[pg(1,blLines)]},
  {name:'通関/'+IV+'_IV_PL.pdf', pages:[pg(1,ivLines({grade:'OLD GRADE'})),pg(2,plLines())]}, {name:IV+'_FD.pdf', pages:[pg(1,['scan'])]}, {name:IV+'_TO BANK.pdf', pages:[pg(1,['scan'])]}].concat(o.extra||[]); };
const run=(o)=>FD.check(Object.assign({iv:IV, files:files(o), lc:LC(o&&o.lc), lcText:':43P: PARTIAL SHIPMENTS = ALLOWED\n:43T: TRANSHIPMENT = ALLOWED\n:48: PERIOD FOR PRE IN DAYS = 21', meta:{country:'SAMPLELAND', blDate:'2026-11-05'}, today:'2026-11-10'}, (o&&o.ctx)||{}));
const it=(r,k)=>r.items.find(i=>i.key===k)||{};
const W=i=>i.trial?i.would:i.status;

sect('기본 (버전 0.2 · LEENAI.init 1곳 · 푸터 · confirm/alert 0 · 한글 0 · 쓰기 0)', ()=>{
  eq(FD.VERSION,'0.2','fd-core VERSION'); eq((HTML.match(/version:'0\.2'/g)||[]).length,1,'LEENAI.init version 1곳');
  ok(/✦ Powered by LEENAI Automation System/.test(HTML),'푸터'); ok(!/\b(confirm|alert)\(/.test(HTML),'confirm/alert 0');
  ok(!/[가-힣]/.test(HTML),'화면 · 코드 한글 0'); ok(/書き込み禁止/.test(HTML)&&!/method:'(PUT|POST|PATCH|DELETE)'/.test(HTML),'Graph 쓰기 0 (GET 만)');
  ok(!/ghp_|github_pat_|sk-ant|client_secret|AKIA/.test(HTML),'보안 grep 0');
});
sect('쪽 판별 (v3 + 새 종류 6 · 手形 종류 없음)', ()=>{
  eq([cls(ivLines().join('\n')),cls(plLines().join('\n')),cls(beneLines.join('\n')),cls(blLines.join('\n'))],['IV','PL','BENE','BL'],'IV · PL · BENE · BL');
  const pad='\nSAMPLE TEXT LINE FOR LENGTH 2699 SAMPLE SAMPLE SAMPLE';
  eq(cls('CERTIFICATE OF ORIGIN'+pad),'CO','C/O'); eq(cls('MARINE CARGO POLICY'+pad),'INS','保険'); eq(cls('SECURITY LABEL ISSUE DATE'+pad),'LABEL','라벨');
  eq(cls('SHIPPER SAMPLE EXPORT CONSIGNEE TO ORDER OF SAMPLE BANK NOTIFY SAMPLE BUYER'+pad),'SI','새 종류: S/I 사본 (제목 없는 S/I 양식)');
  eq(cls('COTECNA INSPECTION SAMPLE ASSIGNMENT LETTER DEAR SIR BEST REGARDS'+pad),'PIR_LETTER','새 종류: COTECNA 배정 편지');
  eq(cls('T H E S G S T E R M S A N D C O N D I T I O N S R E L I E V E L I A B I L I T Y'+pad),'LABEL_TERMS','새 종류: 보안 라벨 약관 (글자 사이 공백)');
  eq(cls('OCEAN NETWORK EXPRESS TO WHOM IT MAY CONCERN WE CERTIFY THE VESSEL'+pad),'CARRIER_CERT','새 종류: 선사 증명 (TO WHOM IT MAY CONCERN + 선사 머리글)');
  eq(cls('From: sample@example.test Sent: NOV 05 Subject: SHIPPING ADVICE PARTICULARS OF SHIPMENT'+pad),'SHIP_ADVICE','새 종류: 선적 통지 사본');
  eq(cls('TO WHOM IT MAY CONCERN THIS IS TO CERTIFY THAT THE GOODS'+pad),'CERT_GEN','새 종류: 일반 증명서');
  eq(FD.NEW_TYPES,['SI','PIR_LETTER','LABEL_TERMS','CARRIER_CERT','SHIP_ADVICE','CERT_GEN'],'새 종류 6');
  ok(!Object.keys(FD.TYPES).some(k=>/BOE|DRAFT_BILL|手形/.test(k+FD.TYPES[k])),'手形 종류 없음 (형님: 은행 사이트에서 만듦 → 대상 아님)');
  ok(cls('BILL OF EXCHANGE AT 90 DAYS SIGHT OF THIS FIRST'+pad)!=='DRAFT_BOE','手形 쪽은 手形 으로 판별하지 않음');
  eq(cls('scan'),'SCAN','글자 없는 쪽 = 스캔');
});
sect('읽는 곳 순서 (FD_DATA > 文字版 > DRAFT DOC > 단품 > 通関 · FD.pdf · TO BANK 안 읽음)', ()=>{
  eq([IV+'_FD_DATA.pdf',IV+'_.pdf',IV+'_DRAFT DOC REV.pdf',IV+'_IV,PL.pdf','通関/'+IV+'_IV_PL.pdf',IV+'_FD.pdf',IV+'_TO BANK.pdf',IV+'_FRT MEMO.pdf'].map(n=>FD.fileTier(n,IV).tier),[1,2,3,4,5,0,0,0],'단 1 ~ 5 · 0 = 안 읽음');
  const r=run(); const ivr=r.read.find(x=>x.type==='IV'); eq([ivr.file,ivr.src],[IV+'_.pdf','文字版'],'IV = 文字版 (通関版 보다 먼저)');
  const r2=FD.check({iv:IV, files:[{name:'通関/'+IV+'_IV_PL.pdf', pages:[pg(1,ivLines()),pg(2,plLines())]}], lc:LC(), meta:{}}); ok(/通関版/.test(r2.read.find(x=>x.type==='IV').src)&&it(r2,'fd:iv:goods').tsukan,'通関 만 있으면 [通関版] 표시');
  const r3=FD.check({iv:IV, files:files({extra:[{name:IV+'_FD_DATA.pdf', pages:[pg(1,ivLines({grade:'WASTE PAPER SAMPLE OCC'})),pg(2,plLines())]}]}), lc:LC(), meta:{}}); eq(r3.read.find(x=>x.type==='IV').file,IV+'_FD_DATA.pdf','FD_DATA 가 맨 앞');
  ok(!r.read.some(x=>/_FD\.pdf$|TO BANK/.test(x.file)),'FD.pdf · TO BANK 은 문구 확인에 안 씀');
});
sect('묶음별 판정 (一致 · 相違 · 読取確認 · 対象外)', ()=>{
  const r=run(); const keys=['fd:iv:42c','fd:iv:goods','fd:iv:price','fd:iv:qty','fd:iv:amount','fd:iv:incoterms','fd:iv:origin','fd:iv:bene','fd:iv:applicant','fd:iv:date','fd:iv:47a','fd:iv:english','fd:iv:port','fd:pl:goods','fd:pl:qty','fd:pl:gross','fd:pl:origin','fd:pl:lcno','fd:pl:port','fd:bl:onboard','fd:bl:partial','fd:bl:tranship','fd:bene:text','fd:bene:form','fd:47a:lang'];
  const bad=keys.filter(k=>W(it(r,k))!=='MATCH'); eq(bad.map(k=>[k,W(it(r,k)),it(r,k).detail]),[],'맞는 서류 = 一致');
  eq(W(it(run({iv:{grade:'WASTE PAPER SAMPLE OCCC'}}),'fd:iv:goods')),'DIFF','품명 1 글자 다름 = 相違 (誤字の疑い)');
  eq(W(it(run({iv:{price:210}}),'fd:iv:price')),'DIFF','단가 다름 = 相違');
  eq(W(it(run({pl:{noOrigin:true}}),'fd:pl:origin')),'DIFF','P/L 原産国 없음 = 相違');
  eq(W(it(run({pl:{gross:100}}),'fd:pl:gross')),'DIFF','Gross < Net = 相違');
  eq(W(it(run({lc:{expiry_date:'2026-11-01'}}),'fd:iv:date')),'DIFF','IV 날짜 > 有効期限 = 相違');
  eq(W(it(run({lc:{latest_shipment:'2026-11-01'}}),'fd:bl:onboard')),'DIFF','ON BOARD > 44C = 相違');
  ['fd:ins:amount','fd:ins:cond','fd:ins:claims'].forEach(k=>eq(W(it(r,k)),'READ_CHECK',k+' 보험 표면 글자 없음 = 読取確認'));
  eq(W(it(r,'fd:pl:mark')),'NA','タイ 아님 = 対象外'); eq(W(it(r,'fd:co:issuer')),'NA','46A 에 C/O 없음 = 対象外');
  eq(W(it(run({ctx:{today:'2026-11-10'}}),'fd:due:present')),'INFO','提出期限 — FD送付日 없음 = 参考 (期限 표시)'); eq(W(it(run({ctx:{today:'2026-11-28'}}),'fd:due:present')),'INFO','v0.2 (K4): 지나도 FD送付日 없음 = 参考 (注意 아님)');
  ok(/2026-11-26/.test(it(r,'fd:due:present').expected),'提出期限 = 船積 + 21 日',it(r,'fd:due:present'));
  const t=run({extra:[{name:'通関/'+IV+'_IV.pdf', pages:[]}]}); ok(t.items.length>=44,'FD 항목 44 + TO BANK',t.items.length);
});
sect('試験 = trial (전체 판정 영향 0) · 有効 만 판정 · 마스터에 없는 줄 실행 안 함 · 停止', ()=>{
  const bad=run({iv:{price:210}}); ok(bad.items.every(i=>i.trial&&i.status==='INFO'),'마스터 없음 → 전부 試験'); eq([bad.verdict,bad.trialDiff>0],['NONE',true],'試験 相違 → 전체 판정 NONE · trialDiff 만');
  const mk=(st)=>({rows:FD.CHECKS.map((k,i)=>({id:'CP-T'+i, engine_key:k.key, stages:['FD'], state:k.key==='fd:iv:price'?st:'試験', why:''})).filter(r=>r.engine_key!=='fd:iv:goods')});
  const r1=run({iv:{price:210},ctx:{cp:mk('試験')}}); eq([r1.verdict, W(it(r1,'fd:iv:price')), it(r1,'fd:iv:price').cp],['NONE','DIFF','CP-T2'],'試験 줄 → 판정 영향 0 · CP 번호');
  ok(!r1.items.some(i=>i.key==='fd:iv:goods'),'마스터에 없는 줄 = 실행 안 함');
  const r2=run({iv:{price:210},ctx:{cp:mk('有効')}}); eq([r2.verdict, it(r2,'fd:iv:price').status, it(r2,'fd:iv:price').trial],['DIFF','DIFF',false],'有効 줄만 판정');
  const r3=run({iv:{price:210},ctx:{cp:mk('停止')}}); ok(!r3.items.some(i=>i.key==='fd:iv:price'),'停止 = 실행 안 함');
  const fx=run({ctx:{cp:{rows:[{id:'CP-T9', engine_key:'fd:iv:origin', stages:['FD'], state:'試験', left:'text:COUNTRY OF ORIGIN : SAMPLELAND'}]}}}); eq(W(it(fx,'fd:iv:origin')),'DIFF','고정값 = 마스터 그 줄의 기대값 (left text:)');
});
sect('TO BANK AI (2 회 같음/다름 · THIRD ORIGINAL · 1 쪽째 · Sea Waybill · Free Time · 서명) · 저장본 재사용', ()=>{
  const P=(page,a,b)=>({page, r1:a, r2:b||a});
  const D=(t,m,s,f)=>({doc_type:t, mark:m, signed:s!==false, first:f!==false});
  const ai={pages:[P(1,D('COVER','NONE',false)),P(2,D('IV','NONE')),P(3,D('IV','NONE')),P(4,D('IV','NONE')),P(5,D('PL','NONE')),P(6,D('PL','NONE')),P(7,D('PL','NONE')),
    P(8,D('BL','ORIGINAL')),P(9,D('BL','ORIGINAL',true,false)),P(10,D('BL','ORIGINAL'),D('BL','TRIPLICATE')),P(11,D('BL','DUPLICATE')),P(12,D('INS','ORIGINAL')),P(13,D('BENE','NONE'))]};
  const t=FD.tbTally(ai); eq([t.unsure,t.t.BL.count,t.t.BL.orig,t.t.IV.count],[[],3,3,3],'ORIGINAL ↔ TRIPLICATE = 같음 · 2 쪽째 (first=false) 안 셈');
  const r=run({ctx:{ai, toBank:{name:IV+'_TO BANK.pdf', modified:'2026-11-08T00:00:00Z'}}}); eq(['IV','PL','BL','BENE'].map(k=>W(it(r,'fd:tb:count:'+k))),['MATCH','MATCH','MATCH','MATCH'],'TO BANK 매수 一致');
  const ai2={pages:ai.pages.map(p=>p.page===3?P(3,D('IV','NONE'),D('PL','NONE')):p)}; eq(FD.tbTally(ai2).unsure,[3],'2 회 다름 → 그 쪽은 안 셈 (unsure)');
  const ai3={pages:ai.pages.filter(p=>p.page!==3&&p.page!==4)}; eq(W(it(run({ctx:{ai:ai3,toBank:{name:'x'}}}),'fd:tb:count:IV')),'DIFF','IV 원본 3 → 1 통 = 相違');
  const ai4={pages:ai.pages.map(p=>p.page===2?P(2,D('IV','NONE',false)):p)}; eq(W(it(run({ctx:{ai:ai4,toBank:{name:'x'}}}),'fd:tb:count:IV')),'DIFF','SIGNED INVOICE 인데 서명 없는 통 = 相違');
  const swb=LC({docs_46A:[{doc_type:'B/L', quote:'THREE PHOTOCOPIES OF TELEX RELEASED BILL OF LADING OR NON NEGOTIABLE SEA WAYBILL'}], bl:{originals:'1'}});
  const ai5={pages:[P(1,D('BL','NON-NEGOTIABLE',false,false)),P(2,D('BL','NON-NEGOTIABLE',false,false)),P(3,D('BL','COPY',false,false))]};
  eq(W(it(FD.check({iv:IV, files:files(), lc:swb, meta:{}, ai:ai5, toBank:{name:'x'}}),'fd:tb:count:BL')),'MATCH','Sea Waybill 사본 3 = 원본 요구 없음');
  const ft=LC({docs_46A:LC().docs_46A.concat([{doc_type:'FREE_TIME_CERT', quote:'14 DAYS FREE TIME SHOULD BE MENTIONED ON B/L OR ON A SHIPPING CERTIFICATE'}])});
  eq(W(it(FD.check({iv:IV, files:files(), lc:ft, meta:{}, ai:{pages:ai.pages.concat([P(14,D('CERT','NONE'))])}, toBank:{name:'x'}}),'fd:tb:count:FT')),'MATCH','Free Time = 선사 증명 (CERT) 도 됨');
  eq(W(it(FD.check({iv:IV, files:files(), lc:ft, meta:{}, ai:{pages:ai.pages.filter(p=>p.page!==13)}, toBank:{name:'x'}}),'fd:tb:count:FT')),'NOTATION','증명 없음 + 「B/L 기재도 가」 = 注意');
  eq(W(it(run(),'fd:tb:count:IV')),'READ_CHECK','AI 없음 = 読取確認 (화면: 未実行)');
  const cache={schema:'fd_ai/1', sha256:'AB'+'0'.repeat(62), pages:[1,2,3].map(n=>P(n,D('IV','NONE')))};
  eq([FD.AI.pending(cache,3), FD.AI.pending(cache,4), FD.AI.usable(cache,'ab'+'0'.repeat(62)), FD.AI.usable(cache,'cd'+'0'.repeat(62))],[[],[4],true,false],'저장본 = 다시 안 읽음 (빠진 쪽만) · sha256 다르면 안 씀');
  ok(/claude-opus-5-5/.test(FD.AI.model)&&FD.AI.dpi===150&&FD.AI.gray&&FD.AI.effort==='low','AI 설정 (opus 5.5 · 150 dpi 회색 · effort low)');
  ok(/doc_type/.test(FD.AI.prompt)&&!/wording|quote/i.test(FD.AI.prompt.replace(/doc_type|mark|signed|first/g,'')),'AI 는 쪽 판별 (종류 · 원본/사본 · 서명) 만 — 문구 판정 안 함');
  eq(FD.AI.parse('x {"doc_type":"iv","mark":"original","signed":1,"first":false} y'),{doc_type:'IV',mark:'ORIGINAL',signed:true,first:false},'AI 답 읽기');
});
sect('v0.2 — K4 提出期限 = FD送付日 · K3 보험증권 AI (2 회 같은 값 · 코드 판정 · 읽는 쪽 · 저장본)', ()=>{
  eq([W(it(run({ctx:{fdSent:'2026-11-20'}}),'fd:due:present')), W(it(run({ctx:{fdSent:'2026-11-27'}}),'fd:due:present')), W(it(run({ctx:{fdSent:'2026-11-26'}}),'fd:due:present'))],['MATCH','DIFF','MATCH'],'FD送付日 ≤ 船積 + 21 日 = 一致 · 넘으면 相違 (그날까지 一致)');
  eq(W(it(run({ctx:{fdSent:'2026-12-21'}, lc:{expiry_date:'2026-11-20'}}),'fd:due:present')),'DIFF','有効期限이 더 빠르면 그날이 기한');
  eq(W(it(run({ctx:{fdSent:'', toBank:{name:'x', modified:'2026-12-30T00:00:00Z'}}}),'fd:due:present')),'INFO','TO BANK 파일 날짜는 안 씀 (FD送付日 없음 = 参考)');
  const rd={is_insurance:true, currency:'USD', amount:'26,940.49', conditions:'INSTITUTE CARGO CLAUSES (A) 1/1/82', exclusions:'', vessel:'SAMPLE STAR 2699S', sailing:'ON OR ABOUT NOV. 05, 2026', voyage_from:'TOKYO, JAPAN', voyage_to:'SAMPLE PORT, SAMPLELAND',
    claims_payable_at:'SAMPLELAND', claims_currency:'USD', agent:'SAMPLE SURVEY CO., SAMPLE CITY, SAMPLELAND', assured:'SAMPLE EXPORT CORPORATION', originals:'ISSUED IN 2 ORIGINALS'};
  const ins=(a,b)=>({schema:'fd_ins_ai/1', sha256:'0'.repeat(64), by:'TB_AI', pages:[12], reads:[Object.assign({},rd,a||{}),Object.assign({},rd,b||a||{})]});
  const R0=run({ctx:{insAi:ins()}}), K=['amount','cond','claims','originals','assured','currency','sailing','voyage','vessel'];
  eq(K.map(k=>W(it(R0,'fd:ins:'+k))),K.map(()=>'MATCH'),'보험 AI 2 회 같음 → 9 줄 一致 (코드 판정)');
  eq(W(it(run(),'fd:ins:amount')),'READ_CHECK','AI 없음 = 지금처럼 読取確認');
  eq(W(it(run({ctx:{insAi:ins({amount:'20,000.00'})}}),'fd:ins:amount')),'DIFF','금액 < Invoice × 110 % = 相違');
  eq(W(it(run({ctx:{insAi:ins({amount:'26,940.49'},{amount:'28,940.49'})}}),'fd:ins:amount')),'READ_CHECK','2 회 다름 = 読取確認');
  eq(W(it(run({ctx:{insAi:ins({exclusions:'EXCLUDING RUST'})}}),'fd:ins:cond')),'NOTATION','제외 특약 = 注意');
  eq(W(it(run({ctx:{insAi:ins({conditions:'INSTITUTE CARGO CLAUSES (C)'})}}),'fd:ins:cond')),'DIFF','(A) 아님 = 相違');
  eq(W(it(run({ctx:{insAi:ins({sailing:'ON OR ABOUT NOV. 07, 2026'})}}),'fd:ins:sailing')),'DIFF','Sailing ≠ B/L ON BOARD = 相違');
  eq(W(it(run({ctx:{insAi:ins({sailing:'AS PER B/L'})}}),'fd:ins:sailing')),'NOTATION','AS PER B/L = 注意');
  eq(W(it(run({ctx:{insAi:ins({vessel:'OTHER SHIP'})}}),'fd:ins:vessel')),'DIFF','선명 다름 = 相違');
  eq(W(it(run({ctx:{insAi:ins({originals:''})}}),'fd:ins:originals')),'DIFF','ORIGINALS 기재 없음 = 相違');
  eq(W(it(run({ctx:{insAi:ins({claims_payable_at:'TOKYO'})}}),'fd:ins:claims')),'DIFF','支払地 다름 = 相違');
  eq(W(it(run({ctx:{insAi:ins({voyage_to:'OTHER PORT'})}}),'fd:ins:voyage')),'DIFF','VOYAGE 에 44F 없음 = 相違');
  eq(W(it(run({ctx:{insAi:{schema:'fd_ins_ai/1', pages:[3], reads:[{is_insurance:false},{is_insurance:false}]}}}),'fd:ins:amount')),'READ_CHECK','보험 쪽이 아님 = 読取確認');
  ok(/保険 AI \(TB_AI p\.12\)/.test(it(R0,'fd:ins:amount').detail),'detail 에 읽은 쪽',it(R0,'fd:ins:amount').detail);
  eq(W(it(R0,'fd:ins:count')),'READ_CHECK','枚数 = TO BANK AI 그대로 (보험 AI 안 씀)');
  const P=(page,t)=>({page, r1:{doc_type:t}, r2:{doc_type:t}});
  eq(FD.insPick([{name:'X_1POL.pdf'}],null,'TB.pdf'),{by:'POL',file:'X_1POL.pdf',pages:[1,2]},'읽는 쪽 ① 보험 파일 (_1POL)');
  eq(FD.insPick([],{pages:[P(11,'BL'),P(12,'INS'),P(13,'INS'),P(15,'INS')]},'TB.pdf'),{by:'TB_AI',file:'TB.pdf',pages:[12,13]},'② TO BANK AI 의 INS 첫 쪽 + 이어진 1 쪽');
  eq(FD.insPick([],null,'TB.pdf'),{by:'LOCATE',file:'TB.pdf',pages:null},'③ 없으면 축소 그림으로 찾기');
  ok(FD.INS_AI.usable({schema:'fd_ins_ai/1',sha256:'AB'+'0'.repeat(62),reads:[{},{}]},'ab'+'0'.repeat(62))&&!FD.INS_AI.usable({schema:'fd_ins_ai/1',sha256:'AB',reads:[{}]},'ab'),'저장본 = 같은 파일 다시 안 읽음');
  ok(/claude-opus-5-5/.test(FD.INS_AI.model)&&FD.INS_AI.maxPages===2&&/\.ins\.json$/.test(FD.INS_AI.cachePath('ab')),'설정 (opus 5.5 · 1 ~ 2 쪽 · .ins.json)');
});
sect('가짜 데이터 (시험 파일에 실제 거래 값 0)', ()=>{
  const me=fs.readFileSync(__filename,'utf8'); ok(!/\b(LRS-\d{4}[A-Z]{1,3}\d|N[A-Z]{1,3}\d{4}-\d{2})\b/.test(me.replace(/NTST2699-01/g,'')),'실제 모양의 계약 · Invoice 번호 0');
  ok(!/@(?!example\.test)[a-z0-9.-]+\.(com|jp|vn|kr)/i.test(me),'실제 메일 주소 0');
});
rows.forEach(r=>console.log(r[0]+'  '+r[1]+'  — '+r[2]));
console.log(fail?'FAIL '+fail:'ALL PASS '+rows.length); process.exit(fail?1:0);
