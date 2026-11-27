/* bl_bench v0.6 시험 (지시서 THOR_17 E-V6 · 형님 V6) — 가짜 데이터 · 네트워크 0
   Shipper · Consignee · Notify 의 줄 찾기: 전화 · FAX = 숫자만 (「+81-…」 = 「(+81)-…」 = 「0…」) · Draft 에만 우편번호 · 번호가 다르면 그대로 (못 찾음)
   규칙 = ACL 엔진 v0.19 partyLineKey (한 곳) · node v06.js [bl_bench.html] */
const T=require('./lib.js'), F=require('./fixtures.js'), {ok, eq}=T;
const BL=T.loadCore(process.argv[2]);
const pdfLines=async pages=>BL.linesOf(await T.readPages(await T.mkPdf(pages)));
async function run(siOver, dOver){ const L=await pdfLines([F.draftItems(dOver)]); const si=F.si(siOver); const ch=BL.check(si,L,null); return BL.classifyAll(ch.rows,L); }
const row=(rows,f)=>rows.find(x=>x.field===f)||{};
(async()=>{
  const base=await run(); const nb=row(base,'Notify');
  const tel=await run({notify:'SAMPLE PAPER INDUSTRY CO., LTD.\nADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT\nTEL: +84-28-0000-0000'}, {notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT','TEL: (+84)-28-0000-0000']});
  eq(row(tel,'Notify').class, nb.class, '① 「+84-28-…」 = 「(+84)-28-…」 (괄호 · 기호) = 기본과 같은 판정');
  const tel0=await run({notify:'SAMPLE PAPER INDUSTRY CO., LTD.\nADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT\nTEL: 028-0000-0000'}, {notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT','TEL: +84-28-0000-0000']});
  ok(['SAME','NOTATION'].indexOf(row(tel0,'Notify').class)>=0&&/表記:電話・郵便番号/.test(row(tel0,'Notify').note||''), '② 「028-…」 = 「+84-28-…」 (국번 + 0) = 表記', row(tel0,'Notify'));
  const zip=await run({shipper:'SAMPLE EXPORT CO., LTD.\n1-2-3 SAMPLE TOWN, TOKYO, JAPAN'}, {shipper:['SAMPLE EXPORT CO., LTD.','1-2-3 SAMPLE TOWN, TOKYO 100-0001, JAPAN']});
  ok(['SAME','NOTATION'].indexOf(row(zip,'Shipper').class)>=0&&/表記:電話・郵便番号/.test(row(zip,'Shipper').note||''), '③ Draft 에만 우편번호 = 表記', row(zip,'Shipper'));
  const bad=await run({notify:'SAMPLE PAPER INDUSTRY CO., LTD.\nADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT\nTEL: 84-28-0000-0000'}, {notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT','TEL: 84-28-0000-0009']});
  ok(row(bad,'Notify').class!==nb.class, '④ 번호가 다르면 그대로 (못 찾음 → 다른 판정)', [row(bad,'Notify').class, nb.class]);
  ok(['0.6','0.7','0.8','0.9'].indexOf(BL.VERSION)>=0, '⑤ bl-core 0.6 이상');
  T.done('v06');
})().catch(e=>{ console.log('FAIL', e.stack); process.exit(1); });
