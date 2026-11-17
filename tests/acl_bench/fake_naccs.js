/* 가짜 NACCS ACL PDF 만들기 (pdf-lib · Helvetica) — 레포 공개: 회사 · 번호 · 컨테이너 모두 가짜.
   실제 NACCS 처럼 「라벨 = 셀 왼쪽 위 (작은 글자) · 값 = 그 아래」. 그리는 순서를 섞어 pdf.js 글자 순서가 라벨 → 값 순서가 아니게 할 수 있다 (F3).
   spec: {fields:{key:[줄…]}, rows:[{container,seal,type,size,bales,cargo,measure,tare}], totals:{containers,bales,weight,measure},
          order:'valuesFirst'|'shuffle'|'normal', perPage1:15, overflow:'description 에 덧붙일 긴 줄', kind:'NACCS'|'SCAN'|'OTHER'} */
const {PDFDocument, StandardFonts, rgb}=require('pdf-lib');
const W=595, H=842;
/* 라벨 자리 (x, y) · 값 첫 줄은 라벨 y-12, 다음 줄 -10 */
const P1={
  shipper:['Shipper',30,812], booking:['Booking No.',330,812], carrier:['Carrier/Shipping Agent',460,812],
  consignee:['Consignee',30,760], masterBl:['Master B/L No.',330,760], refNo:['Ref No.',460,760],
  notify:['Notify Party',30,705], originals:['Number of Original B(S)/L',330,705], issuePlace:['Place of B(S)/L Issue',460,705],
  alsoNotify:['Also Notify Party',30,650], wayBill:['Way Bill',330,650], received:['Received B/L',390,650], freight:['Freight As Arranged',460,650],
  vessel:['Ocean Vessel',30,615], voy:['Voy.No.',180,615], preCarriage:['Pre-Carriage By',330,615], receipt:['Place of Receipt',460,615],
  pol:['Port of Loading',30,588], pod:['Port of Discharge',180,588], delivery:['Place of Delivery',330,588], finalDest:['Final Destination',460,588],
  marks:['Marks & No.',30,560], description:['Description of Goods',130,560], hsMain:['HS Code(Main)',460,560],
  totalContainers:['Total Number of Containers',30,130], totalPkgs:['Total Number and Kind of Packages',180,130], totalWeight:['Total Weight',330,130], totalMeasure:['Total Measurement',460,130]
};
const COLS=[['Container No.',30,'container'],['Seal No.',100,'seal'],['Type',170,'type'],['Size',200,'size'],['Number and kind',230,'pkgs'],['Cargo Weight',330,'cargo'],['Measurement',400,'measure'],['Tare',470,'tare']];
const fmt=(n,d)=>Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
function rowCells(r){ return {container:r.container, seal:r.seal, type:r.type||'GP', size:r.size||'45', pkgs:'BALE,COMPRESSED BL '+r.bales, cargo:'KGM '+fmt(r.cargo,3), measure:'MTQ '+fmt(r.measure==null?40:r.measure,3), tare:'KGM '+fmt(r.tare,0)}; }
function rng(seed){ let s=seed>>>0||1; return ()=>{ s=(s*1103515245+12345)>>>0; return s/4294967296; }; }

async function build(spec){
  const doc=await PDFDocument.create(), font=await doc.embedFont(StandardFonts.Helvetica);
  const kind=spec.kind||'NACCS';
  if(kind==='SCAN'){ const p=doc.addPage([W,H]); p.drawRectangle({x:40,y:40,width:500,height:700,borderColor:rgb(0,0,0),borderWidth:1}); return doc.save(); }
  if(kind==='OTHER'){ const p=doc.addPage([W,H]); ['BILL OF LADING (DRAFT) - TEST','SHIPPER: SAMPLE CO','CONSIGNEE: TO ORDER','VESSEL: SAMPLE STAR'].forEach((t,i)=>p.drawText(t,{x:40,y:780-i*14,size:9,font})); return doc.save(); }
  const ops=[];   // {page, s, x, y, size, lab}
  const F=spec.fields||{};
  ops.push({page:0, s:'ACL INFO (TEST FORM)', x:200, y:830, size:9});
  Object.keys(P1).forEach(k=>{ const [lab,x,y]=P1[k]; ops.push({page:0, s:lab, x, y, size:6, lab:true});
    (F[k]||[]).forEach((line,i)=>{ if(String(line).length) ops.push({page:0, s:String(line), x:x+2, y:y-12-i*10, size:8}); }); });
  if(spec.overflow){ const n=(F.description||[]).length; ops.push({page:0, s:spec.overflow, x:132, y:560-12-n*10, size:8}); }
  const per=spec.perPage1||15, rows=spec.rows||[], pages=Math.max(1, rows.length>per?2:1);
  for(let pg=0; pg<pages; pg++){
    const headY=pg===0?340:790; if(pg>0) ops.push({page:pg, s:'ATTACHED SHEET (TEST FORM)', x:200, y:820, size:9});
    COLS.forEach(([lab,x])=>ops.push({page:pg, s:lab, x, y:headY, size:6, lab:true}));
    const list=pg===0?rows.slice(0,per):rows.slice(per);
    list.forEach((r,i)=>{ const y=headY-12-i*12, c=rowCells(r); ops.push({page:pg, s:(i+1)+')', x:18, y, size:5});
      COLS.forEach(([,x,k])=>ops.push({page:pg, s:c[k], x:x+2, y, size:8})); });
  }
  // 그리는 순서 (pdf.js 글자 순서)
  let order=ops.slice();
  if(spec.order==='valuesFirst') order=ops.filter(o=>!o.lab).concat(ops.filter(o=>o.lab));
  else if(spec.order==='shuffle'){ const r=rng(spec.seed||7); for(let i=order.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; } }
  const P=[]; for(let i=0;i<pages;i++) P.push(doc.addPage([W,H]));
  order.forEach(o=>P[o.page].drawText(o.s,{x:o.x, y:o.y, size:o.size, font}));
  return doc.save();
}
module.exports={build, P1, COLS, W, H};
