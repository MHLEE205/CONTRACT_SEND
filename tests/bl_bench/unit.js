/* bl-core 단위 시험 — 판정 5가지 · R1 ~ R11 · L/C 7항목 · 항구 별칭 · 다른 건 Draft · 가리기 좌표 (가짜 PDF · 가짜 값) */
const T=require('./lib.js'), F=require('./fixtures.js'), {ok, eq}=T;
const BL=T.loadCore(process.argv[2]);
const pdfLines=async pages=>BL.linesOf(await T.readPages(await T.mkPdf(pages)));
const clsOf=(rows,f)=>{ const r=rows.find(x=>x.field===f); return r?r.class:null; };
const whyOf=(rows,f)=>{ const r=rows.find(x=>x.field===f); return r?r.why:''; };
async function run(siOver, dOver){ const L=await pdfLines([F.draftItems(dOver)]); const si=F.si(siOver); const ch=BL.check(si,L,null); return {L, si, rows:BL.classifyAll(ch.rows,L), raw:ch.rows}; }
(async()=>{
  /* difflib 와 같은 값 (Python 3.9 difflib.SequenceMatcher(None,a,b,autojunk=False).ratio()) */
  [['ADDLOTCN5SAMPLEZONE','ADDLOTCNSSAMPLEZONEIN',0.9],['SAMPLEPAPERJOINTSTOCKCOMPANY','SAMPLEPAPERJOINTSTOCKCOMPANADD',0.9310344827586207],['ABCABCABC','CBACBA',0.4],['SAMPLEBANKNORTH','SAMPLEBANK',0.8],['','X',0],['AAAAABBBBB','BBBBBAAAAA',0.5],['XYZXYZQQXYZ','QXYZXYQZ',0.631578947368421]]
    .forEach(([a,b,v])=>ok(Math.abs(BL.seqRatio(a,b)-v)<1e-12,'seqRatio '+a+'/'+b));
  /* Step 1 — 이름 (전수 조사 sel.py 와 같음) */
  eq(BL.draftName('NFK2601-01_DRAFT.pdf',F.IV),{kind:'DRAFT',rev:0},'이름 DRAFT');
  eq(BL.draftName('NFK2601-01_DRAFT REV2.pdf',F.IV),{kind:'DRAFT',rev:2},'이름 REV2');
  eq(BL.draftName('NFK2601-01_FRT MEMO(REV).pdf',F.IV),{kind:'MEMO',rev:1},'이름 MEMO REV');
  eq(BL.draftName('NFK2601-01_DRAFT 2.pdf',F.IV),{kind:'DRAFT',rev:1},'이름 _2 = 2번째');
  eq(BL.draftName('NFK2601-01_DRAFT DOC.pdf',F.IV).excl,'DRAFT DOC (当社書類)','이름 DRAFT DOC 제외');
  /* v0.8 (THOR_34 · N66): 「_」 이름 — 옛 이름과 같게 */
  eq(BL.draftName('NFK2601-01_FRT_MEMO.pdf',F.IV),{kind:'MEMO',rev:0},'v0.8 _FRT_MEMO');
  eq(BL.draftName('NFK2601-01_FRT_MEMO_REV2.pdf',F.IV),{kind:'MEMO',rev:2},'v0.8 _FRT_MEMO_REV2');
  eq(BL.draftName('NFK2601-01_BL_DRAFT.pdf',F.IV),{kind:'DRAFT',rev:0},'v0.8 _BL_DRAFT');
  eq(BL.draftName('NFK2601-01_BL_DRAFT_REV.pdf',F.IV),{kind:'DRAFT',rev:1},'v0.8 _BL_DRAFT_REV');
  eq(BL.draftName('NFK2601-01_DRAFT_DOC.pdf',F.IV).excl,'DRAFT DOC (当社書類)','v0.8 _DRAFT_DOC 제외');
  eq(BL.draftName('NFK2601-01_FD_DRAFT.pdf',F.IV).excl,'FD/DHL/FREE TIME','v0.8 _FD_DRAFT 제외');
  eq(BL.draftName('NFK2601-01_FRT MEMO REV.pdf',F.IV),{kind:'MEMO',rev:1},'v0.8 옛 이름 그대로');
  eq(BL.draftName('NFK2601-01_FD DRAFT.pdf',F.IV).excl,'FD/DHL/FREE TIME','이름 FD DRAFT 제외');
  eq(BL.draftName('NFK2601-01_DRAFT(旧).pdf',F.IV).excl,'(旧)','이름 (旧) 제외');
  eq(BL.draftName('NFK2601-02_DRAFT.pdf',F.IV).excl,'他の Invoice 番号','이름 다른 IV 제외');
  eq(BL.draftName('NFK2601-01_ACL.pdf',F.IV),null,'이름 ACL 은 Draft 아님');
  ok(BL.draftName('NFK2601-01_DRAFT 本船変更前.pdf',F.IV).rev<BL.draftName('NFK2601-01_DRAFT 本船変更.pdf',F.IV).rev,'本船変更前 = 本船変更 의 앞 판');
  /* 판 고르기: Draft 가 있으면 Draft (REV → 수정 시각) · 없으면 FRT MEMO 의 B/L 쪽 · 스캔 = 판 아님 */
  const Lok=await pdfLines([F.draftItems()]);
  const E=BL.editions(F.IV,[{id:'a',name:'NFK2601-01_DRAFT REV.pdf',mod:'2026-10-02',L:Lok},{id:'b',name:'NFK2601-01_DRAFT.pdf',mod:'2026-10-03',L:Lok},{id:'c',name:'NFK2601-01_FRT MEMO.pdf',mod:'2026-10-01',L:Lok},{id:'d',name:'NFK2601-01_DRAFT REV2.pdf',mod:'2026-10-04',L:[{p:1,y:1,x:1,t:'X'}]}]);
  eq(E.editions.map(e=>e.id),['b','a'],'판 순서 (REV 번호) · 스캔 빠짐'); eq(E.src,'DRAFT','Draft 우선'); eq(E.scans.map(e=>e.name),['NFK2601-01_DRAFT REV2.pdf'],'스캔 = 目で確認');
  ok(BL.isBlPage(Lok,1),'B/L 쪽');
  /* 청구서 쪽 (振込先 · 字間 INVOICE) = B/L 쪽 아님 (v0.1 · 전수 조사와 다름) */
  const Linv=await pdfLines([[{x:30,y:40,t:'Please remit to:'},{x:30,y:80,t:'I N V O I C E   NO.: 0000000001'},{x:30,y:100,t:'SHIPMENT 0000 FCL/FCL'},{x:30,y:120,t:'SAMPLE STAR 101W  VESSEL'},{x:30,y:140,t:'004 CONT. TSTU 1000011 TSTU 1000022'},{x:30,y:160,t:'SAID TO CONTAIN  ON BOARD  SHIPPER  MARKS  PORT OF LOADING'},{x:30,y:180,t:'DOCUMENT FEE   5000 JPY'}].concat(Array.from({length:16},(_,i)=>({x:30,y:220+i*12,t:'REMARK LINE '+(i+1)})))]);
  ok(!BL.isBlPage(Linv,1),'청구서 쪽 = B/L 아님');

  /* A — 판정 5가지 */
  let R=await run();
  ['Shipper','Consignee','Notify','Description','POD','POL','Vessel/Voyage','Booking/B/L No.'].forEach(f=>eq(clsOf(R.rows,f),'SAME','완전 일치 '+f));
  ok(R.rows.filter(r=>r.field.indexOf('Container')===0).every(r=>r.class==='SAME'),'컨테이너 세트 같음');
  eq(clsOf(R.rows,'Marks'),'SAME','Marks NO MARK');
  /* R1 넘침 (CN> 다음 줄이 다른 곳에) = 表記 */
  R=await run({notify:'SAMPLE PAPER INDUSTRY CO., LTD.\nADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT NORTH PROVINCE\nTEL: 84-28-0000-0000'},
    {notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CN5, SAMPLE ZONE, SAMPLE CN>','TEL: 84-28-0000-0000'], extra:[{x:200,y:480,t:'DISTRICT NORTH PROVINCE'}]});
  eq(clsOf(R.rows,'Notify'),'NOTATION','R1 넘침 = 表記'); ok(/はみ出し/.test((R.raw.find(r=>r.field==='Notify')||{}).note),'R1 넘침 메모');
  /* R2 항구 도시만 = 表記 */
  R=await run({},{pod:'CAT LAI PORT HCMC', delivery:'CAT LAI PORT HCMC'}); eq(clsOf(R.rows,'POD'),'NOTATION','R2 항구 도시만 = 表記');
  /* R4 N/M = 表記 */
  R=await run({},{marks:['N/M']}); eq(clsOf(R.rows,'Marks'),'NOTATION','R4 NO MARK ↔ N/M = 表記');
  /* R5 S/I XX 자리 = 参考 */
  R=await run({description:'WASTE PAPER OCC\nHS CODE: 47071000\nIMPORT LICENCE NO. XXXXX\nFREIGHT PREPAID AS ARRANGED'},{desc:['WASTE PAPER OCC','HS CODE: 47071000','IMPORT LICENCE NO. 0412','FREIGHT PREPAID AS ARRANGED']});
  eq(clsOf(R.rows,'Description'),'REF','R5 XX 자리 = 参考'); ok(/R5/.test(whyOf(R.rows,'Description')),'R5 이유');
  /* R6 S/I 에만 (ACL 도 Draft 도 없음) = 参考 */
  R=await run({description:'WASTE PAPER OCC\nHS CODE: 47071000\nINTERNAL REMARK QQQ\nFREIGHT PREPAID AS ARRANGED', acl:{description:'WASTE PAPER OCC\nHS CODE: 47071000\nFREIGHT PREPAID AS ARRANGED'}});
  eq(clsOf(R.rows,'Description'),'REF','R6 S/I 에만 = 参考');
  /* R7 본선 변경 = 参考 */
  R=await run({},{vessel:'OTHER MOON 202E'}); eq(clsOf(R.rows,'Vessel/Voyage'),'REF','R7 본선 다름 = 参考');
  /* R9 SAME AS CONSIGNEE = 表記 */
  R=await run({notify:'SAME AS CONSIGNEE'},{}); eq(clsOf(R.rows,'Notify'),'NOTATION','R9 SAME AS = 表記');
  /* R10 선사 별도 문구 (FREE TIME) = 参考 */
  R=await run({description:'WASTE PAPER OCC\nHS CODE: 47071000\n14 DAYS FREE TIME AT DESTINATION\nFREIGHT PREPAID AS ARRANGED'});
  eq(clsOf(R.rows,'Description'),'REF','R10 FREE TIME = 参考');
  /* 진짜 차이 의심: 숫자 다름 (CN5 ↔ CNS) · 글자 다름 · 줄 없음 · 약어 */
  R=await run({},{notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CNS, SAMPLE ZONE, SAMPLE DISTRICT','TEL: 84-28-0000-0000']});
  eq(clsOf(R.rows,'Notify'),'DIFF','숫자 다름 = 진짜'); ok(/\[数字が違う\]/.test(whyOf(R.rows,'Notify')),'숫자 다름 종류');
  R=await run({notify:'SAMPLE PAPER JOINT STOCK COMPANY\nADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT\nTEL: 84-28-0000-0000'},{notify:['SAMPLE PAPER JOINT STOCK COMPAN','ADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT','TEL: 84-28-0000-0000']});
  eq(clsOf(R.rows,'Notify'),'DIFF','글자 다름 = 진짜'); ok(/\[字が違う\]/.test(whyOf(R.rows,'Notify')),'글자 다름 종류');
  R=await run({},{notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT']});
  eq(clsOf(R.rows,'Notify'),'DIFF','줄 없음 (ACL 에는 있음) = 진짜'); ok(/\[行がない\]/.test(whyOf(R.rows,'Notify')),'줄 없음 종류');
  R=await run({notify:'SAMPLE PAPER INDUSTRY CO., LTD.\nBUILDING 7 NORTH SAMPLE INDUSTRIAL STREET DISTRICT 9\nTEL: 84-28-0000-0000'},{notify:['SAMPLE PAPER INDUSTRY CO., LTD.','BUILDING 7 NORTH SAMPLE INDUSTRIAL ST DISTRICT 9','TEL: 84-28-0000-0000']});
  ok(/\[略語\]/.test(whyOf(R.rows,'Notify')),'약어 종류 — '+whyOf(R.rows,'Notify'));
  /* 판단 불가: 합계 모양 */
  R=await run({},{}); const tb=R.si.items.find(i=>i.key==='total:bales'); tb.expected='77';
  eq(BL.classifyAll(BL.check(R.si,R.L,null).rows,R.L).find(r=>r.field==='Total Bales').class,'UNKNOWN','합계 다름 = 판단 불가');
  /* 컨테이너 씰 다름 = 진짜 */
  R=await run({}); const s1=R.si.items.find(i=>i.key==='set:TSTU1000022'); s1.set.cells[1].cp='SL9999';
  ok(BL.classifyAll(BL.check(R.si,R.L,null).rows,R.L).some(r=>r.field.indexOf('Container')===0&&r.class==='DIFF'),'씰 다름 = 진짜');
  /* 다른 건 Draft — Consignee · Notify 가 통째로 다름 · 다른 Invoice 번호 */
  R=await run({},{consignee:['TO ORDER OF OTHER TRUST BANK','SOUTH BRANCH'], notify:['OTHER TRADING CO., LTD.','99 OTHER ROAD, OTHER CITY','TEL: 00-0000']});
  let od=BL.otherDraft(F.IV,R.rows,R.L,R.si); ok(od.other,'다른 건 Draft (Consignee · Notify)');
  R=await run({},{extra:[{x:330,y:100,t:'INVOICE NO. NFK2609-77'}]}); od=BL.otherDraft(F.IV,R.rows,R.L,R.si); ok(od.other&&/別の Invoice/.test(od.why[0]),'다른 건 Draft (다른 Invoice 번호)');
  R=await run({},{notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CNS, SAMPLE ZONE, SAMPLE DISTRICT','TEL: 84-28-0000-0000']}); ok(!BL.otherDraft(F.IV,R.rows,R.L,R.si).other,'같은 건 (글자 1 다름) ≠ 다른 건');
  R=await run(); ok(!BL.otherDraft(F.IV,R.rows,R.L,R.si).other,'같은 건 ≠ 다른 건');

  /* B — L/C 보관소 7항목 */
  const lcRun=async(lcOver,dOver,alias)=>{ const L=await pdfLines([F.draftItems(dOver)]); const rowsA=BL.check(F.si(),L,null).rows; return BL.lcCheck(L,rowsA,BL.lcView(F.lc(lcOver)),alias||[],'TEST'); };
  const res=(rows,item)=>((rows.find(r=>r.item===item)||{}).result||'');
  let B=await lcRun({},{extra:[{x:200,y:480,t:'L/C NO.: TLC0001'}]});
  ['Consignee bank','Notify (APPLICANT)','FREIGHT PREPAID','Originals / SWB','Shipment ≤ 44C','揚地 (44F)','47A L/C No. in all docs'].forEach(it=>ok(/^SAME/.test(res(B,it)),'L/C 같음 '+it+' — '+res(B,it)));
  eq(res(B,'積地 (44E)'),'NA_ANYJP','積地 ANY JAPAN');
  B=await lcRun({},{consignee:['TO THE ORDER OF SAMPLE BANK']}); ok(/^DIFF/.test(res(B,'Consignee bank'))&&/NORTH/.test((B.find(r=>r.item==='Consignee bank')||{}).note),'Consignee 은행 낱말 없음 = 차이');
  B=await lcRun({bl:{consignee_bank:'SAMPLE BANK PUBLIC CO., LTD.', notify_text:'APPLICANT', freight:'PREPAID'}},{consignee:['TO ORDER OF SAMPLE BANK PUBLIC','COMPANY LIMITED']}); eq(res(B,'Consignee bank'),'DIFF_ABBR','은행 약어만 다름');
  B=await lcRun({},{onboard:'16 NOV 2026'}); eq(res(B,'Shipment ≤ 44C'),'DIFF_44C','44C 지남');
  B=await lcRun({},{onboard:''}); eq(res(B,'Shipment ≤ 44C'),'NO_DATE','On board 빈칸 = 날짜 없음');
  B=await lcRun({},{originals:'ONE (1)'}); ok(/^DIFF/.test(res(B,'Originals / SWB')),'원본 1통 ↔ 3/3 = 차이');
  B=await lcRun({},{}); eq(res(B,'47A L/C No. in all docs'),'DIFF','47A L/C 번호 없음 = 차이');
  B=await lcRun({},{notify:['OTHER NAME CO., LTD.','ADD: LOT CN5, SAMPLE ZONE']}); eq(res(B,'Notify (APPLICANT)'),'DIFF','Notify 신청인 낱말 없음 = 차이');
  B=await lcRun({checks:[{field:'bl_consignee', reason:'2回判読が違う: TO ORDER OF SAMPLE BANK NORTH BRANCH | TO ORDER OF SAMPLE TRUST BANK'}], bl:{consignee_text:null, consignee_bank:null, notify_text:'APPLICANT', freight:'PREPAID'}},{});
  eq(res(B,'Consignee bank'),'LC_READ_CHECK','2회 판독 은행 다름 = 要確認');
  B=await lcRun({checks:[{field:'bl_consignee', reason:'2回判読が違う: MADE OUT TO THE ORDER OF SAMPLE BANK NORTH BRANCH | TO THE ORDER OF SAMPLE BANK NORTH BRANCH'}], bl:{consignee_text:null, consignee_bank:null, notify_text:'APPLICANT', freight:'PREPAID'}},{});
  ok(/^SAME/.test(res(B,'Consignee bank')),'2회 판독 인용만 다름 = 비교함');
  eq(BL.lcCheck([],[],null,null,'')[0].result,'REF_NOLC','보관소 없음 = 参考');
  /* 항구 별칭 (D7) — v0.2: 엔진의 cpAliasSame (master_port_alias → cpPrepare · 승인 안전장치) — 같은 묶음 = 表記 · 없으면 차이 */
  const ACLE=T.loadAcl(), AD=[{code:'ADM_A', email:'adm_a@example.com', portal_admin:true}];
  const prepA=(rows,by)=>ACLE.cpPrepare([], rows.map(r=>Object.assign({approved_by:'ADM_A'},r)), {admins:ACLE.cpAdmins(AD), lastBy:rows.reduce((o,r)=>(o[ACLE.cpKey(r)]=by||'adm_a@example.com',o),{})}).alias;
  const alias=prepA([{group:'T1', name:'SAMPLEPORT ALPHA'},{group:'T1', name:'SAMPLEPORT BETA'}]);
  B=await lcRun({pod:{text:'SAMPLEPORT ALPHA, SAMPLELAND', list:['SAMPLEPORT ALPHA']}},{pod:'SAMPLEPORT BETA', delivery:'SAMPLEPORT BETA'},alias); eq(res(B,'揚地 (44F)'),'NOTATION_ALIAS','港の別名 = 表記');
  B=await lcRun({pod:{text:'SAMPLEPORT ALPHA, SAMPLELAND', list:['SAMPLEPORT ALPHA']}},{pod:'SAMPLEPORT GAMMA', delivery:'SAMPLEPORT GAMMA'},alias); eq(res(B,'揚地 (44F)'),'DIFF','별칭 아님 = 차이');
  B=await lcRun({pod:{text:'SAMPLEPORT ALPHA, SAMPLELAND', list:['SAMPLEPORT ALPHA']}},{pod:'SAMPLEPORT BETA', delivery:'SAMPLEPORT BETA', consignee:['TO ORDER OF SAMPLE BANK','NORTH BRANCH SAMPLEPORT ALPHA']},alias);
  eq(res(B,'揚地 (44F)'),'NOTATION_ALIAS','L/C 항구 낱말이 주소에만 있어도 별칭 = 表記');
  B=await lcRun({pod:{text:'SAMPLEPORT ALPHA, SAMPLELAND', list:['SAMPLEPORT ALPHA']}},{pod:'SAMPLEPORT BETA', delivery:'SAMPLEPORT BETA'},prepA([{group:'T1', name:'SAMPLEPORT ALPHA'},{group:'T1', name:'SAMPLEPORT BETA'}],'stf_b@example.com'));
  eq(res(B,'揚地 (44F)'),'DIFF','직원이 넣은 별칭 (마지막 변경자 = 직원) = 쓰지 않음 (승인 안전장치)');
  B=await lcRun({pod:{text:'SAMPLEPORT ALPHA, SAMPLELAND', list:['SAMPLEPORT ALPHA']}},{pod:'SAMPLEPORT BETA', delivery:'SAMPLEPORT BETA'},[]); eq(res(B,'揚地 (44F)'),'DIFF','별칭 없음 (마스터 없음) = 차이 (bl-core 안에 고정값 없음)');
  ok(T.PORT_ALIAS_TEST.length===2&&BL.samePortGroup(T.PORT_ALIAS_TEST,'JAKARTA, INDONESIA','TAN'+'JUNG PRIOK')==='JAKARTA','시험용 고정값 (시험 코드에만) = 같은 묶음');
  ok(BL.PORT_ALIAS_TEST===undefined&&BL.portAliasOf===undefined&&BL.literalSame===undefined,'bl-core 의 임시 부품 (고정값 · portAliasOf · literalSame) 없음 = 엔진 하나');
  /* C — ACL 참고 */
  R=await run({},{notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT']}); ok(BL.aclNote(R.rows).some(x=>x.field==='Notify'),'ACL では一致 → Draft で変わった');
  /* 판 사이 */
  const L1=await pdfLines([F.draftItems()]), L2=await pdfLines([F.draftItems({notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CN6, SAMPLE ZONE, SAMPLE DISTRICT','TEL: 84-28-0000-0000']})]);
  const rv=BL.revDiff(L1,L2); ok(rv.some(x=>x.change==='-'&&/CN5/.test(x.text))&&rv.some(x=>x.change==='+'&&/CN6/.test(x.text)),'판 사이 줄 차이');

  /* Step 5 — 가리기 계획 · 좌표 검사 */
  const LF=await pdfLines([F.draftItems({freight:F.FREIGHT})]);
  const P=BL.maskPlan(LF,{carrier:'ONE'}); ok(P.ok,'운임표 가리기 자동 — '+P.why.join(';'));
  const toks=P.targets.map(t=>t.tok).sort(); eq(toks,['123456.00','2550.00','30.00','5000.00','5000.00','7640.00','850.00','90.00'],'가릴 숫자 = 요율 · 금액 · 합계');
  ok(!toks.includes('3.000')&&!toks.some(t=>/150\.0000/.test(t)),'수량 · 환율은 남김 (D5)');
  const rects=P.pages[0].rects, inside=(b,r)=>b.x0>=r.x0&&b.x1<=r.x1&&b.y0>=r.y0&&b.y1<=r.y1;
  LF.filter(l=>/^(850\.00|2550\.00|7640\.00)$/.test(l.t)).forEach(l=>ok(BL.tokenBoxes(l,l.t).every(b=>rects.some(r=>inside(b,r))),'숫자 상자가 검은 칸 안 '+l.t));
  const keepL=LF.filter(l=>/FREIGHT PREPAID AS ARRANGED|^OCEAN FREIGHT$|^PREPAID$|^RATE$/.test(l.t));
  ok(keepL.length>=3&&keepL.every(l=>{ const b={x0:l.x0, x1:l.x1, y0:l.base-l.fh*0.7, y1:l.base}; return !rects.some(r=>r.x0<b.x1&&b.x0<r.x1&&r.y0<b.y1&&b.y0<r.y1); }),'남길 문구는 검은 칸 밖');
  /* 통화 붙은 금액이 표 밖에 남으면 만들지 않음 */
  const LR=await pdfLines([F.draftItems({freight:F.FREIGHT.concat([{x:30,y:700,t:'B/L AMENDMENT FEE 6100 JPY'}])})]);
  const PR=BL.maskPlan(LR,{carrier:'ONE'}); ok(!PR.ok&&/通貨の付いた金額/.test(PR.why.join(' ')),'표 밖 금액 남음 = 手で — '+PR.why.join(';'));
  /* 쪽 빼기 (D6): Attached List 의 <<Charge>> = 뺌 · << Description >> 이어짐 = 남김 · 둘이 같은 쪽 = 手で */
  const att=[{x:24,y:80,t:'*** B/L Attached List ***'},{x:30,y:100,t:'<<Charge>>'},{x:30,y:115,t:'CHG Code'},{x:200,y:115,t:'UNIT RATE'},{x:310,y:115,t:'PREPAID'},{x:30,y:130,t:'ALL'},{x:200,y:130,t:'USD250.00'},{x:310,y:130,t:'USD2500.00'},{x:30,y:145,t:'TOTAL'},{x:310,y:145,t:'JPY999990.00'}];
  const rider=[{x:24,y:80,t:'*** B/L Attached List ***'},{x:24,y:100,t:'<< Description >>'},{x:24,y:112,t:'WASTE PAPER OCC'},{x:24,y:124,t:'HS CODE : 4707.30.0000'},{x:24,y:136,t:'FREIGHT PREPAID AS ARRANGED'}];
  let LP=await pdfLines([F.draftItems(),att]); let PP=BL.maskPlan(LP,{}); ok(PP.ok&&PP.dropped.join()==='2','운임 목록 쪽 뺌');
  LP=await pdfLines([F.draftItems(),rider]); PP=BL.maskPlan(LP,{}); ok(PP.ok&&!PP.dropped.length,'품명 이어지는 쪽 남김 (HS 4707.30 ≠ 금액)');
  LP=await pdfLines([F.draftItems(),rider.concat(att.slice(1).map(x=>Object.assign({},x,{y:x.y+100})))]); PP=BL.maskPlan(LP,{}); ok(!PP.ok&&/品名の続きと運賃/.test(PP.why[0]),'품명 + 운임 같은 쪽 = 手で');
  /* 스캔 · 청구서만 = 手で */
  ok(!BL.maskPlan([],{}).ok&&/スキャン/.test(BL.maskPlan([],{}).why[0]),'스캔 = 手で');
  PP=BL.maskPlan(Linv,{}); ok(!PP.ok&&/B\/L の頁/.test(PP.why[0]),'청구서만 = 手で');

  /* 1 Invoice 결과 · 화면 · CSV */
  const J=BL.judgeInvoice({iv:F.IV, carrier:'TEST', si:F.si(), lc:F.lc(), lcWanted:true, files:[{id:'x',name:'NFK2601-01_DRAFT.pdf',mod:'2026-10-01',L:Lok}]});
  ok(J.verdict==='相違'&&J.B.some(r=>r.item==='47A L/C No. in all docs'&&r.result==='DIFF'),'결과: 47A 차이 → 相違');
  const h=BL.viewHtml(J); ok(/確認した項目/.test(h)&&/相違 \d+ か所/.test(h)&&/B\. L\/C 保管所/.test(h),'화면 HTML');
  ok(!/>(같음|차이|날짜 없음|해당 없음)/.test(h)&&/>一致</.test(h),'화면 L/C 판정 = 일본어');
  const J2=BL.judgeInvoice({iv:F.IV, carrier:'TEST', si:F.si({}), lc:null, lcWanted:false, files:[{id:'x',name:'NFK2601-01_DRAFT.pdf',mod:'2026-10-01',L:Lok}]}); eq(J2.verdict,'一致','결과: 一致');
  const J3=BL.judgeInvoice({iv:F.IV, files:[{id:'s',name:'NFK2601-01_DRAFT.pdf',mod:'',L:[]}]}); eq(J3.verdict,'スキャン','결과: 스캔 = 目で確認');
  const csv=BL.toCsv([J,J2,J3]); ok(csv.charCodeAt(0)===0xfeff&&csv.split('\r\n').length>10,'CSV');
  T.done('unit');
})().catch(e=>{ console.log('FAIL exception',e.stack); process.exit(1); });
