/* lc_read 1.1 시험 (지시서 MAC-THOR_6 D00 L/C 合わせ · 스캔 ACL Step 3) — C1 「Amend 칸만 교체」 · C3 「UNCHANGED のみ」 — 가짜 데이터만 · 네트워크 없음 · AI 없음
   1 amendTargets — MT707 태그 (:46B → 46A · :47B UNCHANGED のみ = 안 셈) · 문장 (FIELD 47A NO. n · FIELD 46A POINT n · DELETE 46A POINT n · FIELD 45A LINE NO n · READ AS 다음 줄 번호 · FIELD 50 = 태그 전체) · since (이미 넣은 Amend 는 뺌)
   2 mergeRecords — 칸 3 경우: amend (Amend 칸 → N) / fill (O 빈칸 → N) / keep (그 밖 → O 그대로 · N 의 흔들림 무시) · 46A 번호 삭제 · 訂正前 문장 (Amend 원문에 없음) 은 버림 · 파생 칸 (원본 통수 · 은행 · Notify 이름) 은 원래 칸을 따름 · 판 번호 · from 기록 · MD 「Amend で変わった欄」
   3 C3 — buildRecord: 47A 에 「ALL OTHER TERMS … UNCHANGED」 만 → conditions_47A 에서 빼고 amend_history 에 · 다른 말이 붙으면 그대로 조건
   4 회귀 — Amend 없는 판독은 HEAD e18253a 의 buildRecord 와 같은 결과 (git 이 있을 때)
   node lc_merge.js */
const fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
const REPO=path.join(__dirname,'../..');
let pass=0, fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});

/* 가짜 L/C 원문 (lc_text 모양 = 判読構造 + 「====」 + 원문) — 회사 · 은행 · 번호 모두 가짜 */
const BASE=[':20: CREDIT NUMBER = TLC0001',':32B: CURRENCY CODE, AMOUNT = USD 100,000.00',':42C: DRAFTS AT = 60 DAYS AFTER SIGHT'].join('\n');
const RAW_BASE=['=== TEST-2611XX1_TLC0001.pdf ===','--- Page 1 ---',':46A: 1. COMMERCIAL INVOICE IN 2 ORIGINALS AND 3 COPIES','2. PACKING LIST IN 2 ORIGINALS AND 3 COPIES',
  '3. 2/3 ORIGINAL BILL OF LADING MADE OUT TO THE ORDER OF SAMPLE BANK, MARKED FREIGHT PREPAID, NOTIFY APPLICANT','4. BENEFICIARY CERTIFICATE THAT 1/3 ORIGINAL B/L SENT TO APPLICANT',
  ':47A: 1. ALL DOCUMENTS IN ENGLISH','2. TOLERANCE 5 PCT MORE OR LESS ACCEPTABLE'].join('\n');
const AM707=['=== TEST-2611XX1_TLC0001_AMEND1.pdf (AMEND1) ===','--- Page 2 ---','707  AMENDMENT TO A DOCUMENTARY CREDIT',
  ' SENDER\'S REFERENCE            :20   TLC0001',' NUMBER OF AMENDMENT           :26E  1',' DOCUMENTS REQUIRED            :46B','        /REPALL/','        .',
  '        UNDER FIELD 46A POINT 1, AMENDED TO :','        COMMERCIAL INVOICE IN 3 ORIGINALS AND 3 COPIES','        .',
  '        UNDER FIELD 46A POINT 3, AMENDED TO :','        FULL SET 3/3 ORIGINAL BILL OF LADING MADE OUT TO THE ORDER OF SAMPLE BANK,','        MARKED FREIGHT PREPAID AND NOTIFY APPLICANT','        .',
  '        PLEASE DELETE 46A POINT 4',' ADDITIONAL CONDITIONS         :47B','        /ADD/','        .','        ALL OTHER TERMS AND CONDITIONS REMAIN UNCHANGED','        .','        BEST REGARDS','        SAMPLE-IMPORT/ZZ',
  ' AMENDMENT CHARGE PAYABLE BY   :71N  OTHR','TRAILER     -MAC:00000000'].join('\n');
const AM799=['=== TEST-2611XX1_TLC0001_AMEND2.pdf (AMEND2) ===','--- Page 3 ---','799  FREE FORMAT MESSAGE',' NARRATIVE                     :79',
  '        PLEASE BE INFORMED WE MAKE CORRECTION','        UNDER FIELD 47A NO. 2, SHOULD BE READ :','        2. TOLERANCE 10 PCT MORE OR LESS ACCEPTABLE','        .',
  '        IN FIELD 50, PLS REPLACE \'SAMPLE PAPER JOINT STOCK\' WITH','        \'SAMPLE PAPER JOINT STOCK COMPANY\'','        .','        ALL OTHER TERMS AND CONDITIONS REMAIN UNCHANGED.','TRAILER     -MAC:00000000'].join('\n');
const lcText=(...am)=>'﻿'+BASE+'\n\n'+'='.repeat(60)+'\n'+[RAW_BASE].concat(am).join('\n\n');

/* 가짜 판 (lc_read/1 의 欄 · 46A · 47A 모양) — O = Amend 전 판독 · N = Amend 넣고 다시 판독 (Amend 밖 칸도 글자 모양이 흔들림) */
const F=(value,loc,quote,extra)=>Object.assign({value, loc, quote:quote===undefined?value:quote, agree:true, quote_check:'ok', check:null, note:null},extra||{});
const docs=(arr)=>arr.map(([t,loc,o,c,q])=>({doc_type:t, originals:o, copies:c, set_fraction:null, alt_group:null, loc, quote:q, agree:true, quote_check:'ok', check:null}));
const cond=(no,q)=>({no, quote:q, agree:true, quote_check:'ok', check:null});
function rec(ver, f, d, c, amends){
  const fields={lc_no:F('TLC0001',':20'), issue_date:F('NOV 1, 2026',':31C',undefined,{date:'2026-11-01'}), expiry:F('DEC 31, 2026,JAPAN',':31D',undefined,{date:'2026-12-31'}), latest_shipment:F('DEC 15, 2026',':44C',undefined,{date:'2026-12-15'}),
    port_loading:F('ANY PORT IN JAPAN',':44E'), port_discharge:F('SAMPLE PORT',':44F'), tolerance:F('5% MORE OR 5% LESS',':39A'), payment_term:F('60 DAYS AFTER SIGHT',':42C'),
    applicant_name:F('SAMPLE PAPER JOINT STOCK',':50-1'), applicant_address:F(null,':50-2', null, {agree:false, check:'2回判読が違う: A | B'}), beneficiary:F('TEST BENEFICIARY CO',':59'),
    bl_consignee:F('MADE OUT TO THE ORDER OF SAMPLE BANK','46A-3'), bl_notify:F('NOTIFY APPLICANT','46A-3'), po:F(null,null,null), hs:F('470730','45A-2'), price_term:F('CIF SAMPLE PORT','45A-4'), port_45A:F('SAMPLE PORT','45A-4'), included_costs:F(null,null,null),
    bl_originals:{value:null, loc:'46A', quote:null, agree:false, derived:'x', check:'2回判読で原本通数が違う: 2 | 3'}, bl_consignee_bank:{value:'SAMPLE BANK', derived:'x', agree:true, check:null}, bl_notify_name:{value:{is_applicant:true, words:['SAMPLE','PAPER']}, derived:'x', agree:true, check:null}};
  Object.keys(f||{}).forEach(k=>{ fields[k]=Object.assign({},fields[k],f[k]); });
  return {schema:'lc_read/1', contract:'TEST-2611XX1', version:ver, created_at:'2026-11-23T00:00:00Z', source:{run:'test v'+ver, reads:2, image:false, retried:[false,false], lc_pdf:['TEST-2611XX1_TLC0001.pdf'], lc_text:'x', amends:amends||[]},
    image:false, fields, docs_46A:d, conditions_47A:c, goods:[{grade:'OCC', quantity:'500 MT', unit_price:'USD 100/MT', amount:null, loc:'45A-3', quote:'500 MT OCC', agree:true, quote_check:'ok', check:null}], bl:{freight:'PREPAID'}, checks:[]};
}
const O=rec(1, {}, docs([['IV','46A-1','2','3','1. COMMERCIAL INVOICE IN 2 ORIGINALS AND 3 COPIES'],['PL','46A-2','2','3','2. PACKING LIST IN 2 ORIGINALS AND 3 COPIES'],
  ['B/L','46A-3','2','3','3. 2/3 ORIGINAL BILL OF LADING MADE OUT TO THE ORDER OF SAMPLE BANK, MARKED FREIGHT PREPAID, NOTIFY APPLICANT'],['BENE_CERT','46A-4',null,null,'4. BENEFICIARY CERTIFICATE THAT 1/3 ORIGINAL B/L SENT TO APPLICANT']]),
  [cond('47A-1','1. ALL DOCUMENTS IN ENGLISH'), cond('47A-2','2. TOLERANCE 5 PCT MORE OR LESS ACCEPTABLE')]);
/* N: Amend 칸 (46A 1 · 3 · 4 삭제 · 47A 2 · 50) + 흔들림 (Consignee 「MADE OUT」 없음 · PL 글자 모양 · 47A-1 끝 「.」) + O 빈칸을 채울 값 (po · 주소) + 訂正前 47A-2 도 같이 읽음 + 47B UNCHANGED 줄 */
const N=rec(2, {bl_consignee:{value:'TO THE ORDER OF SAMPLE BANK', loc:'AMEND 1 :46B → 46A-3', quote:'MADE OUT TO THE ORDER OF SAMPLE BANK'}, bl_notify:{value:'NOTIFY APPLICANT', loc:'AMEND 1 :46B → 46A-3'},
    applicant_name:{value:'SAMPLE PAPER JOINT STOCK COMPANY', loc:'AMEND 2 (MT799 :79)', quote:'SAMPLE PAPER JOINT STOCK COMPANY'}, applicant_address:{value:'1 SAMPLE STREET, SAMPLE CITY', loc:':50 (2-4行)', quote:'1 SAMPLE STREET, SAMPLE CITY', agree:true, check:null},
    po:{value:'PO-TEST-01', loc:'45A-1', quote:'PO-TEST-01'}, hs:{value:'4707.30', loc:'45A 6行目'}, tolerance:{value:'5% MORE OR  5% LESS'},
    bl_originals:{value:3, loc:'46A', quote:null, agree:true, derived:'x', check:null}, bl_consignee_bank:{value:'SAMPLE BANK.', derived:'x', agree:true, check:null}, bl_notify_name:{value:{is_applicant:true, words:['SAMPLE','PAPER','COMPANY']}, derived:'x', agree:true, check:null}},
  docs([['IV','AMEND 1 :46B → 46A-1','3','3','COMMERCIAL INVOICE IN 3 ORIGINALS AND 3 COPIES'],['PL','46A-2','2','THREE','PACKING LIST IN 2 ORIGINALS AND 3 COPIES'],
    ['B/L','AMEND 1 :46B → 46A-3','3','3','FULL SET 3/3 ORIGINAL BILL OF LADING MADE OUT TO THE ORDER OF SAMPLE BANK, MARKED FREIGHT PREPAID AND NOTIFY APPLICANT']]),
  [cond('47A-1','1. ALL DOCUMENTS IN ENGLISH.'), cond('47A-2 (原文 · AMEND 2 で訂正済)','2. TOLERANCE 5 PCT MORE OR LESS ACCEPTABLE'), cond('47A-2 AMEND 2 (訂正後)','2. TOLERANCE 10 PCT MORE OR LESS ACCEPTABLE'),
   cond('47B /ADD/ (AMEND 1)','ALL OTHER TERMS AND CONDITIONS REMAIN UNCHANGED')],
  [{no:1, file:'TEST-2611XX1_TLC0001_AMEND1.pdf', date:'2026-11-17'},{no:2, file:'TEST-2611XX1_TLC0001_AMEND2.pdf', date:null}]);
N.goods[0].quote='500 MT OCC (AS PER ORDER)';

(async()=>{
  const L=await import(require('url').pathToFileURL(path.join(REPO,'tools/lc_read_lib.mjs')).href);
  const A1=L.loadA1(), ACL=L.loadAcl(), ctx={A1, ACL, now:'2026-11-23T12:00:00Z'};

  /* 1 amendTargets */
  const T=L.amendTargets(lcText(AM707, AM799), 0);
  eq(T.amends,[1,2],'1-1 Amend 2 개 (AMEND1 707 · AMEND2 799)');
  eq(T.tags['46A'],{nums:[1,3,4]},'1-2 :46B + FIELD 46A POINT 1 · 3 + DELETE 46A POINT 4 → 46A 1/3/4 만');
  eq(T.tags['47A'],{nums:[2]},'1-3 47A = 799 「FIELD 47A NO. 2」 만 (:47B /ADD/ UNCHANGED のみ 는 안 셈 · C3)');
  eq(T.tags['50'],{nums:[]},'1-4 「IN FIELD 50」 번호 없음 → 50 전체');
  ok(!T.tags['20']&&!T.tags['26E']&&!T.tags['71N'],'1-5 머리 태그 (:20 · :26E · :71N) 는 대상 아님',T.tags);
  ok(T.skipped.length===1&&T.skipped[0].tag==='47B','1-6 건너뛴 47B 기록 (Amend 의 기록)',T.skipped);
  eq(Object.keys(L.amendTargets(lcText(AM707, AM799), 1).tags).sort(),['47A','50'],'1-7 since=1 → AMEND2 만 (이미 넣은 AMEND1 은 다시 안 셈)');
  eq(L.amendTargets(lcText(),0).amends,[],'1-8 Amend 없음 → 대상 없음');
  const RA=['=== TEST_AMEND1.pdf (AMEND1) ===',' NARRATIVE :79','   UNDER FIELD 45A LINE NO 3 PLS READ AS','   500 MT OCC','   PLEASE CORRECT FIELD 47A TO READ AS :-','    5) NEW WORDING ACCEPTABLE'].join('\n');
  const T2=L.amendTargets(lcText(RA),0); eq([T2.tags['45A'],T2.tags['47A']],[{nums:[3]},{nums:[5]}],'1-9 「FIELD 45A LINE NO 3」 → 45A 3 · 「TO READ AS :-」 다음 줄 「5)」 → 47A 5');

  /* 2 mergeRecords */
  const M=L.mergeRecords(O, N, lcText(AM707, AM799), ctx), f=M.fields;
  eq(M.version,3,'2-1 판 = max(O, N) + 1');
  eq([f.applicant_name.from, f.applicant_name.value],['amend','SAMPLE PAPER JOINT STOCK COMPANY'],'2-2 amend — 50 전체: Applicant 이름 = N');
  eq([f.applicant_address.from, f.applicant_address.value],['amend','1 SAMPLE STREET, SAMPLE CITY'],'2-3 amend — 50 전체라 주소도 N (O 는 2回判読が違う)');
  eq([f.bl_consignee.from, f.bl_consignee.value],['amend','TO THE ORDER OF SAMPLE BANK'],'2-4 amend — B/L Consignee (46A-3 = Amend 번호) = N');
  eq([f.po.from, f.po.value],['fill','PO-TEST-01'],'2-5 fill — O 빈칸 (PO) → N 값으로 채움 (형님 D1)');
  eq([f.hs.from, f.hs.value],['keep','470730'],'2-6 keep — Amend 밖 (45A 는 Amend 없음) · N 이 다르게 읽어도 O 그대로');
  eq([f.tolerance.from, f.tolerance.value],['keep','5% MORE OR 5% LESS'],'2-7 keep — 39A 공백 흔들림 → O 그대로');
  eq([f.bl_originals.from, f.bl_originals.value, M.bl.originals],['amend',3,3],'2-8 파생 — 원본 통수: B/L 문서 (46A-3) 가 Amend → N (3)');
  eq([f.bl_notify_name.from, M.bl.notify_name_words],['amend',['SAMPLE','PAPER','COMPANY']],'2-9 파생 — Notify 이름: Applicant 이름이 Amend → N');
  eq(M.docs_46A.map(d=>d.doc_type+':'+d.from),['IV:amend','PL:keep','B/L:amend'],'2-10 46A — 1 · 3 = Amend · 2 = 그대로 · 4 = 삭제 (DELETE 46A POINT 4)');
  eq(M.docs_46A[1].copies,'3','2-11 46A-2 (Amend 밖) 의 copies 는 O 값 (N 의 「THREE」 흔들림 무시)');
  eq(M.merge.deleted.length,1,'2-12 삭제 기록 1 (46A-4)');
  eq(M.conditions_47A.map(c=>c.quote),['1. ALL DOCUMENTS IN ENGLISH','2. TOLERANCE 10 PCT MORE OR LESS ACCEPTABLE'],'2-13 47A — 1 = O 그대로 (끝 「.」 흔들림 무시) · 2 = 訂正後 만 (訂正前 문장은 Amend 원문에 없어 버림) · UNCHANGED 없음');
  eq(M.conditions_47A.map(c=>c.from),['keep','amend'],'2-14 47A from');
  eq(M.goods.map(g=>g.from+':'+g.quote),['keep:500 MT OCC'],'2-15 45A — Amend 없음 → O 그대로');
  ok((M.amend_history||[]).some(h=>/UNCHANGED/.test(h.quote)),'2-16 UNCHANGED 문장은 amend_history 에만',M.amend_history);
  eq(M.merge.targets,{'46A':[1,3,4],'47A':[2],'50':'all'},'2-17 merge.targets 기록');
  ok(/lc_read 1\.1/.test(M.source.run)&&M.merge.old_version===1&&M.merge.new_version===2,'2-18 source.run · merge 판 기록',M.source.run);
  eq([M.applicant.name, M.bl.consignee_text, M.lc_no, M.amount&&M.amount.number, M.payment.tenor_text],['SAMPLE PAPER JOINT STOCK COMPANY','TO THE ORDER OF SAMPLE BANK','TLC0001',100000,'60 DAYS AFTER SIGHT'],'2-19 윗단 (applicant · bl · lc_no · 32B · 42C) 은 합친 칸에서 다시 조립 (assembleRecord 1 곳)');
  ok(!M.checks.some(c=>c.field==='applicant_address'||c.field==='bl_originals'),'2-20 checks 도 합친 칸 기준 (Amend 로 채운 주소 · 원본 통수의 옛 check 없음)',M.checks);
  const md=L.renderMd(M); ok(/## Amend で変わった欄/.test(md)&&/空欄を埋めた: fields\.po/.test(md)&&/削除 \(Amend\)/.test(md)&&/## Amend の記録/.test(md),'2-21 MD 「Amend で変わった欄」 · 埋めた · 削除 · 記録',md.slice(-800));
  ok(!/[가-힣]/.test(md),'2-22 MD 한글 0');
  /* O 에 이미 AMEND1 이 들어 있음 → AMEND2 만 대상 */
  const O1=JSON.parse(J(O)); O1.source.amends=[{no:1}]; const M2=L.mergeRecords(O1, N, lcText(AM707, AM799), ctx);
  eq([M2.merge.since_amend, M2.docs_46A.map(d=>d.from).join(','), M2.fields.applicant_name.from],[1,'keep,keep,keep,keep','amend'],'2-23 since — 이미 넣은 AMEND1 의 46A 는 O 그대로 · AMEND2 (50) 만 N');
  /* O 가 요소 없음 → N 전부 fill */
  const O2=JSON.parse(J(O)); O2.goods=[]; eq(L.mergeRecords(O2, N, lcText(AM707, AM799), ctx).goods.map(g=>g.from),['fill'],'2-24 O 에 45A 품목 없음 → N 으로 채움');
  /* 같은 번호 요소 1:1 → O 의 빈 하위 칸만 채움 */
  const O3=JSON.parse(J(O)); O3.docs_46A[1].copies=null; const M3=L.mergeRecords(O3, N, lcText(AM707, AM799), ctx);
  eq([M3.docs_46A[1].copies, M3.docs_46A[1].filled],['THREE',['copies']],'2-25 46A-2 copies 빈칸 → N 값으로 채움 (filled 기록)');
  /* 입력 판은 바꾸지 않음 */
  ok(O.fields.applicant_name.from===undefined&&N.docs_46A[0].from===undefined,'2-26 O · N 원본 객체는 그대로 (복사해서 합침)');

  /* 3 C3 — buildRecord */
  ok(L.isUnchangedOnly('ALL OTHER TERMS AND CONDITIONS REMAIN UNCHANGED')&&L.isUnchangedOnly('/ADD/ . ALL OTHER TERMS REMAIN UNCHANGED. BEST REGARDS SAMPLE')&&L.isUnchangedOnly('ALL OTHER TERMS AND CONDITIONS OF THE CREDIT REMAINS UNCHANGED.'),'3-1 UNCHANGED のみ 판단 (/ADD/ · BEST REGARDS 뒤 · OF THE CREDIT · REMAINS)');
  ok(!L.isUnchangedOnly('BENEFICIARY CERTIFICATE REQUIRED. ALL OTHER TERMS AND CONDITIONS REMAIN UNCHANGED')&&!L.isUnchangedOnly('1. ALL DOCUMENTS IN ENGLISH'),'3-2 다른 말이 붙으면 조건 그대로');
  const raw0=RAW_BASE+'\n\n'+AM707, txt0='﻿'+BASE+'\n\n'+'='.repeat(60)+'\n'+raw0;
  const ex=(conds)=>({lc_no:{value:'TLC0001',loc:':20',quote:'TLC0001'}, conditions_47A:conds, docs:[], goods:[]});
  const r2={no:'TEST-2611XX1', image:false, retried:[false,false], extract:[ex([{no:'47A-1',quote:'1. ALL DOCUMENTS IN ENGLISH'},{no:'47B /ADD/',quote:'ALL OTHER TERMS AND CONDITIONS REMAIN UNCHANGED'}]), ex([{no:'47A-1',quote:'1. ALL DOCUMENTS IN ENGLISH'},{no:'47B /ADD/',quote:'ALL OTHER TERMS AND CONDITIONS REMAIN UNCHANGED'}])],
    checks:[{item:'lc_no',read:'一致'},{item:'47A-1',read:'一致'},{item:'47A-2',read:'一致'}]};
  const B=L.buildRecord(r2, txt0, Object.assign({run:'t'},ctx));
  eq([B.conditions_47A.map(c=>c.no), (B.amend_history||[]).map(h=>h.no)],[['47A-1'],['47B /ADD/']],'3-3 buildRecord — UNCHANGED 줄은 47A 에서 빠지고 amend_history 에');
  const B0=L.buildRecord(Object.assign({},r2,{extract:[ex([{no:'47A-1',quote:'1. ALL DOCUMENTS IN ENGLISH'}]),ex([{no:'47A-1',quote:'1. ALL DOCUMENTS IN ENGLISH'}])]}), txt0, Object.assign({run:'t'},ctx));
  ok(!('amend_history' in B0)&&!('merge' in B0),'3-4 UNCHANGED 없음 → amend_history · merge 칸 자체가 없음 (예전 판과 같은 모양)');

  /* 4 회귀 — HEAD e18253a 의 buildRecord 와 같은 결과 (Amend 없음) */
  let old=null; try{ old=cp.execFileSync('git',['show','e18253a:tools/lc_read_lib.mjs'],{cwd:REPO,encoding:'utf8',stdio:['ignore','pipe','ignore']}); }catch(e){}
  if(old){ const d=fs.mkdtempSync(path.join(os.tmpdir(),'lcold_')), f=path.join(d,'lib.mjs'); fs.writeFileSync(f, old.replace("const HERE = path.dirname(fileURLToPath(import.meta.url));","const HERE = "+J(path.join(REPO,'tools'))+";"));
    const OL=await import(require('url').pathToFileURL(f).href); const a=J(OL.buildRecord(JSON.parse(J(B0r())), txt0, Object.assign({run:'t'},ctx))), b=J(L.buildRecord(JSON.parse(J(B0r())), txt0, Object.assign({run:'t'},ctx)));
    ok(a===b,'4-1 Amend 없는 판독 — e18253a buildRecord 와 바이트까지 같음 (assembleRecord 로 나눈 뒤)',{a:a.slice(0,300),b:b.slice(0,300)}); fs.rmSync(d,{recursive:true,force:true}); }
  else ok(true,'4-1 (git 기록 없음 · 생략)');
  function B0r(){ return Object.assign({},r2,{extract:[ex([{no:'47A-1',quote:'1. ALL DOCUMENTS IN ENGLISH'}]),ex([{no:'47A-1',quote:'1. ALL DOCUMENTS IN ENGLISH'}])]}); }

  console.log(`lcmerge pass ${pass} fail ${fail}`); process.exit(fail?1:0);
})().catch(e=>{ console.log('FAIL 예외',e.stack); console.log('lcmerge pass '+pass+' fail '+(fail+1)); process.exit(1); });
