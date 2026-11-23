/* 가짜 B/L Draft (칸 이름이 위 · 값이 아래 — 흔한 선사 양식 모양) · 가짜 S/I (ACL 엔진 결과와 같은 모양) · 가짜 L/C 보관소 (lc_read/1) — 모두 가짜 값 */
const IV='NFK2601-01';
/* 기본 S/I (ACL 엔진 items 모양: key · expected · actual · set) */
function si(over){
  const base={
    shipper:'SAMPLE EXPORT CO., LTD.\n1-2-3 SAMPLE TOWN, TOKYO, JAPAN',
    consignee:'TO ORDER OF SAMPLE BANK\nNORTH BRANCH',
    notify:'SAMPLE PAPER INDUSTRY CO., LTD.\nADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT\nTEL: 84-28-0000-0000',
    alsoNotify:'', description:'WASTE PAPER OCC\nHS CODE: 47071000\nFREIGHT PREPAID AS ARRANGED', marks:'NO MARK',
    vessel:'SAMPLE STAR 101W', receipt:'TOKYO, JAPAN', pol:'TOKYO, JAPAN', pod:'CAT LAI PORT, VIETNAM', delivery:'CAT LAI PORT, VIETNAM' };
  const v=Object.assign({},base,over||{});
  const items=['vessel','receipt','pol','pod','delivery'].map(k=>({key:k, expected:v[k], actual:v[k]}))
    .concat(['shipper','consignee','notify','alsoNotify','description','marks'].map(k=>({key:k, expected:v[k], actual:(v.acl&&v.acl[k]!=null)?v.acl[k]:v[k]})));
  const cn=[['TSTU1000011','SL0001','22','20100'],['TSTU1000022','SL0002','22','20200'],['TSTU1000033','SL0003','22','20300']];
  cn.forEach(([no,seal,b,w])=>items.push({key:'set:'+no, expected:'', actual:'', set:{container:no, cells:[{k:'番号',acl:no,cp:no,ok:true},{k:'シール',acl:seal,cp:seal,ok:true},{k:'Bales',acl:b,cp:b,ok:true},{k:'重量',acl:w,cp:w,ok:true}]}}));
  items.push({key:'total:containers', expected:'3', actual:'3'},{key:'total:bales', expected:'66', actual:'66'},{key:'total:weight', expected:'60600', actual:'60600'});
  return {items, cp:{booking_no:'BK1000001', bl_number:'TSTCBK1000001'}, format:'NACCS', meta:{country:'VIETNAM'}};
}
/* 가짜 Draft 1 쪽 — d = 바꿀 값 (S/I 와 같은 줄을 쓰면 一致) */
function draftItems(d){
  d=Object.assign({
    shipper:['SAMPLE EXPORT CO., LTD.','1-2-3 SAMPLE TOWN, TOKYO, JAPAN'],
    consignee:['TO ORDER OF SAMPLE BANK','NORTH BRANCH'],
    notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT','TEL: 84-28-0000-0000'],
    vessel:'SAMPLE STAR 101W', receipt:'TOKYO, JAPAN', pol:'TOKYO, JAPAN', pod:'CAT LAI PORT, VIETNAM', delivery:'CAT LAI PORT, VIETNAM',
    desc:['WASTE PAPER OCC','HS CODE: 47071000','FREIGHT PREPAID AS ARRANGED'], marks:['NO MARK'], booking:'BK1000001',
    onboard:'15 OCT 2026', originals:'THREE (3)', extra:[], freight:null}, d||{});
  const I=[], add=(x,y,t,size)=>I.push({x,y,t,size});
  add(200,30,'BILL OF LADING',12); add(30,60,'SHIPPER/EXPORTER',7); d.shipper.forEach((t,i)=>add(30,72+i*11,t));
  add(330,60,'BOOKING NO.',7); add(330,72,d.booking);
  add(30,120,'CONSIGNEE',7); d.consignee.forEach((t,i)=>add(30,132+i*11,t));
  add(30,190,'NOTIFY PARTY',7); d.notify.forEach((t,i)=>add(30,202+i*11,t));
  add(30,260,'PRE-CARRIAGE BY',7); add(200,260,'PLACE OF RECEIPT',7); add(200,272,d.receipt);
  add(30,290,'OCEAN VESSEL VOYAGE NO.',7); add(30,302,d.vessel); add(200,290,'PORT OF LOADING',7); add(200,302,d.pol);
  add(30,320,'PORT OF DISCHARGE',7); add(30,332,d.pod); add(200,320,'PLACE OF DELIVERY',7); add(200,332,d.delivery);
  add(30,355,'CONTAINER NO. / SEAL NO.',7); add(200,355,'DESCRIPTION OF GOODS',7);
  [['TSTU1000011','SL0001','22','20100'],['TSTU1000022','SL0002','22','20200'],['TSTU1000033','SL0003','22','20300']].forEach(([no,s,b,w],i)=>add(30,370+i*11,no+' / '+s+' / '+b+' BALES / '+w+' KGS'));
  add(30,410,'SHIPPER\'S LOAD AND COUNT'); add(30,421,'SAID TO CONTAIN');
  d.marks.forEach((t,i)=>add(30,445+i*11,t)); d.desc.forEach((t,i)=>add(200,445+i*11,t));
  add(200,500,'66 BALES   60,600 KGS'); add(30,520,'SAY : THREE (3) CONTAINERS ONLY');
  add(30,545,'NUMBER OF ORIGINAL B/L',7); add(30,557,d.originals); add(330,545,'SHIPPED ON BOARD',7); add(330,557,d.onboard);
  d.extra.forEach(e=>add(e.x,e.y,e.t,e.size));
  if(d.freight) d.freight.forEach(e=>add(e.x,e.y,e.t,e.size));
  return I;
}
/* 운임 표 (가짜 · ONE 모양) — 가릴 숫자: 요율 850.00 · 30.00 / 금액 2550.00 · 5000.00 · 90.00 / 합계 7640.00 · 123456.00 — 남길 것: 3.000 (수량) · JPY/150.0000 (환율) · 칸 이름 */
const FREIGHT=[{x:30,y:600,t:'CODE TARIFF ITEM',size:7},{x:150,y:600,t:'FREIGHTED AS',size:7},{x:220,y:600,t:'RATE',size:7},{x:310,y:600,t:'PREPAID',size:7},{x:400,y:600,t:'COLLECT',size:7},
  {x:30,y:615,t:'OCEAN FREIGHT'},{x:150,y:615,t:'3.000'},{x:220,y:615,t:'850.00'},{x:270,y:615,t:'USD'},{x:310,y:615,t:'2550.00'},{x:400,y:615,t:'JPY/150.0000'},
  {x:30,y:627,t:'DOC FEE'},{x:150,y:627,t:'1.000'},{x:220,y:627,t:'5000.00'},{x:270,y:627,t:'JPY'},{x:310,y:627,t:'5000.00'},
  {x:30,y:639,t:'SEAL FEE'},{x:150,y:639,t:'3.000'},{x:220,y:639,t:'30.00'},{x:270,y:639,t:'USD'},{x:310,y:639,t:'90.00'},
  {x:30,y:660,t:'TOTAL'},{x:270,y:660,t:'USD'},{x:310,y:660,t:'7640.00'},
  {x:30,y:680,t:'TOTAL PREPAID IN PAYMENT CURRENCY JPY 123456.00'}];
/* L/C 보관소 (lc_read/1 · 가짜) */
function lc(over){
  return Object.assign({schema:'lc_read/1', contract:'LRS-2601FK1', lc_no:'TLC0001', latest_shipment:'2026-10-31',
    pol:{text:'ANY JAPANESE PORT', any_japan:true}, pod:{text:'CAT LAI PORT, VIETNAM', list:['CAT LAI']},
    applicant:{name:'SAMPLE PAPER INDUSTRY CO., LTD.', address:''},
    bl:{consignee_text:'TO ORDER OF SAMPLE BANK NORTH BRANCH', consignee_bank:'SAMPLE BANK NORTH BRANCH', notify_text:'APPLICANT', notify_is_applicant:true, originals:3, freight:'PREPAID'},
    docs_46A:[{doc_type:'B/L', quote:'FULL SET (3/3) OF CLEAN ON BOARD OCEAN BILLS OF LADING MADE OUT TO THE ORDER OF SAMPLE BANK NORTH BRANCH MARKED FREIGHT PREPAID NOTIFY APPLICANT'}],
    conditions_47A:[{quote:'ALL DOCUMENTS MUST INDICATE THIS CREDIT NUMBER.'}], checks:[], source:{amends:[]}}, over||{});
}
module.exports={IV, si, draftItems, FREIGHT, lc};
