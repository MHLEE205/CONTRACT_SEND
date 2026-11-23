/* acl_bench v0.10 시험 (지시서 D00 L/C 보관소 · ACL 전환 v1.0 Step 5) — 가짜 데이터만 · 네트워크 없음 · 실제 거래처 · 은행 · L/C 값 0
   1 Consignee 은행 (지점 · 도시 빠짐 = 相違 · 같은 은행 = 一致 · 줄바꿈 · 붙여 쓰기 = 一致 · TO ORDER · TO ORDER OF APPLICANT · ACL 못 읽음 = 読取確認要)
   2 선적기한 ↔ ETD (초과 = 相違 · 0~3 일 전 = 参考 임박 · 여유 = 一致 · ETD 없음 = 参考)
   3 판독 확인요 칸 → 照合 안 함 · 読取確認要 「L/C 判読 要確認」 · 판독 없음 → 参考 「保管所に未登録」 · 揚地 ANY PORT → 照合しない · イメージ L/C 표시
   4 보관소 만들기 규칙 (tools/lc_read_lib.mjs buildRecord — 2 회 다름 → null + check · 인용 없음 → null + check · 날짜 · 과부족 · 은행 · Notify = Applicant (베트남 # 형) · 원본 통수)
   node v10.js [html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures');
const HTML=process.argv[2]||path.join(__dirname,'../../acl_bench.html');
const ACL=new Function('module',fs.readFileSync(HTML,'utf8').match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
const item=(r,k)=>r.items.find(i=>i.key===k);
const KEYS=['shipper','consignee','notify','alsoNotify','booking','masterBl','vessel','voy','receipt','pol','pod','delivery','finalDest','hsMain','description','marks','originals','wayBill','received','freight','agentSign','shipperMail'];
function mkAcl(cp, over, miss){
  const ex=ACL.expected(cp), F={}; KEYS.forEach(k=>{ F[k]={text:'',conf:'SURE'}; });
  Object.assign(F,{shipper:{text:ex.shipper,conf:'SURE'},consignee:{text:ex.consignee,conf:'SURE'},notify:{text:ex.notify,conf:'SURE'},description:{text:ex.description,conf:'SURE'},marks:{text:ex.marks,conf:'SURE'},
    booking:{text:ex.booking,conf:'SURE'},vessel:{text:'SAMPLE STAR',conf:'SURE'},voy:{text:'101W',conf:'SURE'},receipt:{text:ex.pol,conf:'SURE'},pol:{text:ex.pol,conf:'SURE'},
    pod:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},delivery:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},originals:{text:'3',conf:'SURE'}});
  Object.keys(over||{}).forEach(k=>{ F[k]={text:over[k],conf:'SURE'}; });
  (miss||[]).forEach(k=>{ F[k]={text:'',conf:'MISSING'}; });
  const rows=cp.containers.filter(c=>c.crcf9_container_no).map(c=>({container:c.crcf9_container_no, seal:c.crcf9_seal_no, type:'GP', size:'45', bales:c.crcf9_quantity, cargo:c.crcf9_n_w, tare:c.crcf9_t_w, measure:40, conf:'SURE'}));
  return {fields:F, rows, totals:{containers:rows.length, bales:rows.reduce((s,r)=>s+r.bales,0), weight:rows.reduce((s,r)=>s+r.cargo,0)}};
}
/* 가짜 보관소 판독 (lc_read/1) */
const LCR=o=>{ const b=Object.assign({consignee_text:'MADE OUT TO THE ORDER OF SAMPLE BANK HO CHI MINH BRANCH', consignee_bank:'SAMPLE BANK HO CHI MINH BRANCH', notify_text:'NOTIFY APPLICANT', notify_is_applicant:true, notify_name_words:['SAMPLE','PAPER'], originals:3, freight:'PREPAID'},(o&&o.bl)||{});
  return Object.assign({schema:'lc_read/1', contract:'TEST-0000A1', version:1, lc_no:'TLC0006', issue_date:'2026-10-01', expiry_date:'2026-12-31', latest_shipment:'2026-12-15',
    pol:{text:'ANY JAPANESE PORT', any_japan:true}, pod:{text:'CAT LAI PORT, VIETNAM', list:['CAT LAI']}, applicant:{name:'SAMPLE PAPER CO., LTD.', address:''}, fields:{}, checks:[]}, o||{}, {bl:b}); };
const mk=()=>{ const cp=FX.compass(6); cp.sis[0].cr49f_lc_no='TLC0006'; cp.sis[0].crcf9_bl_text2=''; return cp; };
const R=(lc, over, meta, miss, siCons)=>{ const cp=mk(); if(siCons!=null) cp.sis[0].crcf9_consignee=siCons; cp.lc=lc; return ACL.compareOne(mkAcl(cp,over,miss),cp,{meta:Object.assign({pay:'LC', etd:'2026-11-20', etdSrc:'B/L date'},meta||{})}); };

console.log('1 Consignee 은행');
{ const r=R(LCR()); eq([item(r,'lc:consignee').status,item(r,'lc:consignee_acl').status],['MATCH','MATCH'],'같은 은행 · 지점 (줄바꿈 넘어) → S/I · ACL 一致');
  const city=R(LCR({bl:{consignee_bank:'SAMPLE BANK SEOUL'}}),{consignee:'TO THE ORDER OF SAMPLE BANK'},null,null,'TO THE ORDER OF SAMPLE BANK');
  eq([item(city,'lc:consignee').status,item(city,'lc:consignee_acl').status,item(city,'lc:consignee').kind],['DIFF','DIFF','相違:L/C:Consignee'],'L/C 「SAMPLE BANK SEOUL」 ↔ S/I · ACL 「SAMPLE BANK」 → 둘 다 相違 (도시 빠짐 — 지시서 실례 모양)');
  ok(/足りない語: SEOUL/.test(item(city,'lc:consignee').detail)&&city.verdict==='相違あり','상세에 빠진 낱말 · 판정 相違あり',item(city,'lc:consignee').detail);
  const brk=R(LCR({bl:{consignee_bank:'SAMPLE BANK FOR TRADE, SAM PLE BRANCH'}}),{consignee:'TO ORDER OF SAMPLE BANK FOR\nTRADE, SAMPLE BRANCH'},null,null,'TO ORDER OF SAMPLE BANK FOR TRADE, SAM PLE BRANCH');
  eq([item(brk,'lc:consignee').status,item(brk,'lc:consignee_acl').status],['MATCH','MATCH'],'줄바꿈 · 「SAM PLE」/「SAMPLE」 붙여 쓰기 → 一致 (語の切れ目 = 表記)');
  const oth=R(LCR(),{consignee:'TO ORDER OF OTHER BANK\nHO CHI MINH BRANCH'}); eq([item(oth,'lc:consignee').status,item(oth,'lc:consignee_acl').status],['MATCH','DIFF'],'ACL 만 다른 은행 → ACL ↔ L/C 만 相違');
  const to=R(LCR({bl:{consignee_bank:'TO ORDER'}}),{consignee:'TO ORDER'},null,null,'TO ORDER'); eq([item(to,'lc:consignee').status,item(to,'lc:consignee_acl').status],['MATCH','MATCH'],'L/C 「TO ORDER」 → S/I · ACL 에 TO ORDER 있음 = 一致');
  const to2=R(LCR({bl:{consignee_bank:'TO ORDER'}}),{consignee:'SAMPLE PAPER CO., LTD.'},null,null,'SAMPLE PAPER CO., LTD.'); eq(item(to2,'lc:consignee').status,'DIFF','L/C 「TO ORDER」 ↔ S/I 회사 이름 → 相違');
  const ap=R(LCR({bl:{consignee_bank:'APPLICANT'}}),{consignee:'TO ORDER OF SAMPLE PAPER CO., LTD.'},null,null,'TO ORDER OF SAMPLE PAPER CO., LTD.'); eq(item(ap,'lc:consignee').status,'MATCH','「TO ORDER OF APPLICANT」 → Applicant 회사 이름의 낱말로 대조');
  const mi=R(LCR(),null,null,['consignee']); eq(item(mi,'lc:consignee_acl').status,'READ_CHECK','ACL Consignee 못 읽음 → 読取確認要');
  const nb=R(LCR({bl:{consignee_bank:null}})); ok(!item(nb,'lc:consignee')&&!item(nb,'lc:consignee_acl'),'은행 없음 (회사가 Consignee) → 은행 대조 안 함');
  eq([ACL.lcConsigneeBank('FULL SET OF B/L MADE OUT TO THE ORDER OF SAMPLE BANK SEOUL MARKED FREIGHT PREPAID AND NOTIFY APPLICANT'),ACL.lcConsigneeBank('B/L MADE OUT TO ORDER AND BLANK ENDORSED'),ACL.lcConsigneeBank('CONSIGNED TO SAMPLE PAPER CO')],['SAMPLE BANK SEOUL','TO ORDER',null],'은행 뽑기 (MARKED 앞까지 · 도시 자르지 않음 · TO ORDER · 회사)'); }

console.log('2 선적기한 ↔ ETD');
{ const over=R(LCR({latest_shipment:'2026-10-15'}),null,{etd:'2026-10-17'}); const it=item(over,'lc:shipment');
  eq([it.status,it.kind,over.verdict],['DIFF','相違:L/C:船積期限','相違あり'],'ETD 가 선적기한보다 2 일 뒤 → 相違 (D7 실례 모양 10/15 ↔ 10/17)');
  ok(/2 日 後/.test(it.detail),'상세 「2 日 後」',it.detail);
  eq([0,1,3].map(d=>item(R(LCR({latest_shipment:'2026-11-23'}),null,{etd:'2026-11-'+String(23-d).padStart(2,'0')}),'lc:shipment').status),['INFO','INFO','INFO'],'0 · 1 · 3 일 전 → 参考 (임박)');
  ok(/間近/.test(item(R(LCR({latest_shipment:'2026-11-23'}),null,{etd:'2026-11-21'}),'lc:shipment').detail),'임박 문구');
  eq(item(R(LCR({latest_shipment:'2026-11-24'}),null,{etd:'2026-11-20'}),'lc:shipment').status,'MATCH','4 일 이상 여유 → 一致');
  eq(item(R(LCR(),null,{etd:''}),'lc:shipment').status,'INFO','ETD 없음 → 参考');
  eq(ACL.lcDays('2026-12-30','2027-01-02'),3,'날짜 차이 (해 넘김)'); }

console.log('3 판독 확인요 · 없음 · 揚地 ANY · イメージ');
{ const ck=R(LCR({fields:{lc_no:{check:'2回判読が違う: A | B'}, bl_consignee_bank:{check:'2回判読で違う'}, latest_shipment:{check:'日付を YYYY-MM-DD にできない'}}}),null,{etd:'2027-01-30'});
  eq(['lc:no','lc:consignee','lc:shipment'].map(k=>item(ck,k).status),['READ_CHECK','READ_CHECK','READ_CHECK'],'check 있는 칸 → 대조 안 함 · 読取確認要');
  ok(item(ck,'lc:no').kind==='読取確認要:L/C判読'&&/L\/C 判読 要確認/.test(item(ck,'lc:no').detail)&&!item(ck,'lc:consignee_acl'),'「L/C 判読 要確認」 · 은행 확인요면 ACL 쪽도 대조 안 함');
  const none=R(null); ok(item(none,'lc:none')&&item(none,'lc:none').status==='INFO'&&/保管所 \(古紙\/LC\/_READ\) に未登録/.test(item(none,'lc:none').detail),'판독 없음 → 参考 「保管所に未登録」');
  const any=R(LCR({pod:{text:'ANY PORT IN VIETNAM', list:['ANY PORT IN VIETNAM']}})); eq(item(any,'lc:pod').status,'INFO','揚地 「ANY PORT IN …」 → 照合しない');
  const im=R(LCR({image:true})); ok(item(im,'lc:image')&&item(im,'lc:image').status==='INFO','イメージ L/C 표시 (参考)');
  const nt=R(LCR({bl:{notify_text:'0000000000#000/GPMT-BTNMT#DEPOSIT#SAMPLE PAPER CO., LTD.#ADDR', notify_is_applicant:true, notify_name_words:['SAMPLE','PAPER']}})); eq(item(nt,'lc:notify').status,'MATCH','Notify 베트남 # 형 = Applicant 표기 (D4) → 회사 이름 一致');
  ok(ACL.LC_RULE.APPLICANT.test('SPECIFYING THE APPLICANT AS NOTIFY PARTY WITH TEL'),'「SPECIFYING THE APPLICANT AS NOTIFY PARTY」 = Applicant');
  eq(ACL.lcNameWords('SHOWING CONSIGNEE AND NOTIFY SAMPLE PAPER CO., LTD., ADDR'),['SAMPLE','PAPER'],'「SHOWING CONSIGNEE AND NOTIFY …」 머리 떼고 회사 이름');
  const tt=(()=>{ const cp=mk(); cp.lc=LCR(); return ACL.compareOne(mkAcl(cp),cp,{meta:{pay:'TT', etd:'2026-12-30'}}); })(); ok(!tt.items.some(i=>i.group==='L/C'),'T/T → L/C 그룹 없음 (지금과 같음)'); }

console.log('4 보관소 만들기 규칙 (tools/lc_read_lib.mjs)');
(async()=>{
  const lib=await import(path.join(__dirname,'../../tools/lc_read_lib.mjs'));
  const A1=lib.loadA1(path.join(__dirname,'../../a1_bench.html')), A=lib.loadAcl(HTML);
  const V=(value,loc,quote)=>({value,loc,quote:quote===undefined?value:quote,note:null});
  const base={lc_no:V('TLC0006',':20','TLC0006'), issue_date:V('OCT 1, 2026',':31C','DATE OF ISSUE :31C OCT 1, 2026'), expiry:V('261231BENEFICIARY COUNTRY',':31D','261231BENEFICIARY COUNTRY'), latest_shipment:V('DEC 15, 2026',':44C','DEC 15, 2026'),
    port_loading:V('ANY JAPANESE PORT',':44E'), port_discharge:V('CAT LAI PORT OR SAMPLE PORT, VIETNAM',':44F'), tolerance:V('10 PCT MORE OR LESS',':39A'), payment_term:V('AT SIGHT',':42C'), applicant_name:V('SAMPLE PAPER CO., LTD.',':50'),
    applicant_address:V('NO.1 SAMPLE ROAD',':50'), beneficiary:V('SAMPLE EXPORTER',':59'), bl_consignee:V('MADE OUT TO THE ORDER OF SAMPLE BANK SEOUL MARKED FREIGHT PREPAID','46A-3'),
    bl_notify:V('0000000000#000/GPMT-BTNMT#DEPOSIT#SAMPLE PAPER CO., LTD.#ADDR','46A-3'), po:V(null,null,null), hs:V(null,null,null), price_term:V('CIF CAT LAI','45A'), port_45A:V(null,null,null), included_costs:V(null,null,null),
    goods:[], docs:[{doc_type:'B/L',originals:null,copies:null,set_fraction:null,alt_group:null,loc:'46A-3',quote:'FULL SET OF CLEAN ON BOARD B/L'}], conditions_47A:[]};
  const raw='=== TEST.pdf ===\n:20: TLC0006\nDATE OF ISSUE :31C OCT 1, 2026\n261231BENEFICIARY COUNTRY\nDEC 15, 2026\nANY JAPANESE PORT\nCAT LAI PORT OR SAMPLE PORT, VIETNAM\n10 PCT MORE OR LESS\nAT SIGHT\nSAMPLE PAPER CO., LTD.\nNO.1 SAMPLE ROAD\nSAMPLE EXPORTER\nMADE OUT TO THE ORDER OF SAMPLE\n--- Page 2 ---\nBANK SEOUL MARKED FREIGHT PREPAID\n0000000000#000/GPMT-BTNMT#DEPOSIT#SAMPLE PAPER CO., LTD.#ADDR\nCIF CAT LAI\nFULL SET OF CLEAN ON BOARD B/L';
  const txt='﻿【LC 판독 결과】\n:32B: CURRENCY CODE, AMOUNT = USD 1,000.\n:42C: DRAFTS AT ... = AT SIGHT\n\n'+'='.repeat(60)+'\n'+raw;
  const e2=JSON.parse(JSON.stringify(base)); e2.bl_consignee=V('TO THE ORDER OF SAMPLE BANK SEOUL MARKED FREIGHT PREPAID','46A-3'); e2.hs=V('4707.10','45A','HS 4707.10');
  const r2={no:'TEST-0000A1', image:false, retried:[false,false], extract:[base,e2], checks:A1.r2Check(base,e2,raw,false)};
  const rec=lib.buildRecord(r2, txt, {A1, ACL:A, run:'test', now:'2026-11-23T00:00:00Z'});
  eq([rec.schema,rec.lc_no,rec.issue_date,rec.latest_shipment,rec.expiry_date,rec.expiry_place],['lc_read/1','TLC0006','2026-10-01','2026-12-15','2026-12-31','BENEFICIARY COUNTRY'],'날짜 → YYYY-MM-DD (MMM D, YYYY · 붙은 YYMMDD) · 유효 장소');
  eq([rec.pol.any_japan,rec.pod.list,rec.tolerance.pct,rec.payment.tenor_text,rec.payment.source_tag,rec.amount.number],[true,['CAT LAI','SAMPLE'],10,'AT SIGHT',':42C',1000],'積地 ANY · 揚地 나눔 · 과부족 10 · 지급 :42C · 금액');
  ok(rec.bl.consignee_text===null&&/2回判読が違う/.test(rec.fields.bl_consignee.check),'2 회 판독 문장이 다름 → 값 null + check (어느 쪽도 고르지 않음)',rec.fields.bl_consignee);
  eq([rec.bl.consignee_bank,rec.fields.bl_consignee_bank.check],['SAMPLE BANK SEOUL',null],'은행은 두 판독 모두 같음 → 대조에 씀 (지점 · 도시 그대로)');
  eq([rec.bl.notify_is_applicant,rec.bl.notify_name_words],[true,['SAMPLE','PAPER']],'Notify 베트남 # 형 = Applicant (D4)');
  eq([rec.bl.originals,rec.bl.freight],[3,'PREPAID'],'원본 통수 FULL SET → 3 · FREIGHT');
  ok(rec.hs===null&&/2回判読が違う/.test(rec.fields.hs.check),'한쪽만 값 → 다름 → null + check');
  const bad=JSON.parse(JSON.stringify(base)); bad.lc_no=V('TLC0006',':20','DOCUMENTARY CREDIT NUMBER TLC0006 (NOT IN TEXT)');
  const rb=lib.buildRecord({no:'TEST-0000A1', image:false, extract:[bad,bad], checks:A1.r2Check(bad,bad,raw,false)}, txt, {A1, ACL:A, run:'test', now:'x'});
  ok(rb.lc_no===null&&/引用が L\/C 原文にない/.test(rb.fields.lc_no.check),'인용이 원문에 없음 → null + check');
  ok(rec.fields.bl_notify.quote_check==='ok','인용 안의 頁 표시 · 줄바꿈 → 원문에 있음');
  const md=lib.renderMd(rec); ok(/船積期限/.test(md)&&/有効期限/.test(md)&&/確認が必要/.test(md)&&/✦ Powered by LEENAI Automation System\n$/.test(md),'MD: 선적기한 · 유효기한 · 확인 필요 · 푸터');
  const r2b=JSON.parse(JSON.stringify(rec)); r2b.created_at='other'; r2b.version=9; ok(lib.sameContent(rec,r2b),'같은 내용 = 판 그대로 (만든 날 · 판 번호는 안 봄)');
  ok(A.lcOriginalsText('2/3 ORIGINAL B/L')===null,'원본 통수 규칙 = 엔진 lcOriginalsText (2/3 만 → 모름)');
  console.log('버전');
  ok(/version:'0\.10'/.test(fs.readFileSync(HTML,'utf8')),"version:'0.10'");
  console.log('v10 pass '+pass+' fail '+fail); process.exit(fail?1:0);
})().catch(e=>{ console.log('FAIL 예외',e.message); process.exit(1); });
