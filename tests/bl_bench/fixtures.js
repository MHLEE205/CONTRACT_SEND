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
/* v0.9 (THOR_35 · N69): 44B の実例の形 (Place of Delivery 空欄の Draft) を 가짜 값으로 — 칸 이름 = 대소문자 섞인 긴 이름 (Place of Delivery. Applicable only …) ·
   POD 와 Place of Delivery 가 같은 줄 · 바로 아래 줄은 Description 칸 이름 + Weight · Measurement — delivery 를 비우면 (기본) Place of Delivery 칸이 빈칸 */
const IV9='NTE2699-01';
function draftWaybill(d){
  d=Object.assign({booking:'TEST26990001', shipper:['SAMPLE EXPORT CO., LTD.','1-2-3 SAMPLE TOWN, TOKYO, JAPAN'],
    consignee:['TO ORDER OF SAMPLE BANK','NORTH BRANCH'], notify:['SAMPLE TRADING JSC','LOT 0, SAMPLE PARK, SAMPLE DISTRICT','TEL: 84-0000-0000'],
    vessel:'SAMPLE STAR', voy:'699S', receipt:'', pol:'TOKYO, JAPAN', pod:'CAT LAI PORT, VIETNAM', delivery:'',
    desc:['WASTE PAPER OCC','HS CODE: 47071000','FREIGHT PREPAID'], extra:[]}, d||{});
  const I=[], add=(x,y,t,size)=>I.push({x,y,t,size});
  add(300,36,'NON-NEGOTIABLE WAYBILL',9); add(494,56,'B/L No.',7); add(513,56,d.booking);
  add(39,68,'Shipper (As principal, where care of, c/o, or other variants used.)',6); d.shipper.forEach((t,i)=>add(39,76+i*10,t));
  add(305,68,'Booking No.',7); add(305,76,d.booking);
  add(35,138,'Consignee',7); d.consignee.forEach((t,i)=>add(35,146+i*10,t));
  add(34,208,'Notify Party (see clause 22)',7); d.notify.forEach((t,i)=>add(34,216+i*10,t));
  add(36,275,'Vessel',7); add(181,275,'Voyage No.',7); add(305,275,'Place of Receipt. Applicable only when document used as Multimodal Waybill',6);
  add(36,283,d.vessel); add(181,283,d.voy); if(d.receipt) add(305,283,d.receipt);
  add(35,299,'Port of Loading',7); add(181,299,'Port of Discharge',7); add(303,300,'Place of Delivery. Applicable only when document used as Multimodal Transport B/L.',6);
  add(35,307,d.pol); add(181,307,d.pod); if(d.delivery) add(305,307,d.delivery);
  add(220,322,'PARTICULARS FURNISHED BY SHIPPER',7);
  add(37,333,'Kind of Packages; Description of goods; Marks and Numbers; Container No./Seal No.',6); add(415,333,'Weight',7); add(501,333,'Measurement',7);
  add(413,341,'60600.000 KGS'); add(39,351,'3 containers said to contain 66 BALES');
  d.desc.forEach((t,i)=>add(39,362+i*10,t));
  [['TSTU1000011','SL0001','22','20100'],['TSTU1000022','SL0002','22','20200'],['TSTU1000033','SL0003','22','20300']].forEach(([no,s,b,w],i)=>add(39,400+i*10,no+' / '+s+' / '+b+' BALES / '+w+' KGS'));
  add(39,440,"SHIPPER'S LOAD, STOW, WEIGHT AND COUNT"); add(39,460,'FREIGHT PREPAID'); add(300,480,'Shipped on Board Date',7);
  d.extra.forEach(e=>add(e.x,e.y,e.t,e.size));
  return I;
}
/* L/C 判読構造 (lc_text の view · 가짜) — 44B 가 있는 것 · 없는 것 */
function lcText(v44b, more){
  return ['LC 番号: TLC2699 (TEST)',':20: DOCUMENTARY CREDIT NUMBER = TLC2699',':44E: PORT OF LOADING/AIRPORT OF DEPARTURE = ANY PORT IN JAPAN',
    ':44F: PORT OF DISCHARGE/AIRPORT OF DESTINATION = CAT LAI PORT, VIETNAM'].concat(v44b==null?[]:[':44B: PLACE OF FINAL DESTINATION/FOR TRANSPORTATION TO .../PLACE OF DELIVERY = '+v44b])
    .concat([':44C: LATEST DATE OF SHIPMENT = OCT 31, 2026'], more||[], ['='.repeat(60),'(原文 · 가짜)',' PLACE OF FINAL DESTINATION/FOR TRANSPORTATION TO .../PLACE OF DELIVERY:44B']).join(String.fromCharCode(10));
}
module.exports={IV, si, draftItems, FREIGHT, lc, IV9, draftWaybill, lcText};
