/* B/L Draft 엔진 (bl_bench.html 의 bl-core) 을 Node 에서 전수로 돌림 — 전수 조사 (AI 0 · Mac PDFKit) 와 판정 비교용.
   읽기만 · 쓰기 = --out 폴더 (로컬) 만 · 네트워크 0 (입력은 미리 받아 둔 로컬 파일).
   node tools/bl_repro.mjs --data <dir> --out <dir> [--core bl_bench.html] [--meta coverage.csv] [--only IV,IV]
     <dir>/folders.json   [{iv, files:[{id,name,mod}]}]  (Invoice 폴더 목록)
     <dir>/pdf/{id}.pdf    (Draft · FRT MEMO 후보)
     <dir>/acl.json        ACL 엔진 결과 ({results:[{invoice, items, cp, meta, format}]}) — S/I 기대값
     <dir>/compass.json    {bookings, carriers, contracts} — 선사 · 지불 · 계약 · 운임값
     <dir>/lc_read/{계약}.json  L/C 보관소 (lc_read/1)
     <dir>/port_alias.json (있으면) master_port_alias 의 items
   필요: tests/bl_bench/node_modules (pdfjs-dist 3.11.174) */
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const arg = k => { const i=process.argv.indexOf('--'+k); return i>0?process.argv[i+1]:null; };
const DATA=arg('data'), OUT=arg('out'), CORE=arg('core')||path.join(here,'..','bl_bench.html'), META=arg('meta'), ONLY=(arg('only')||'').split(',').filter(Boolean);
if(!DATA||!OUT){ console.error('--data · --out 필요'); process.exit(2); }
fs.mkdirSync(path.join(OUT,'lines'),{recursive:true});

/* bl-core 읽기 (html 의 <script id="bl-core"> 또는 .js) */
function loadCore(p){
  const src=fs.readFileSync(p,'utf8');
  const code=p.endsWith('.html')?(src.match(/<script id="bl-core">([\s\S]*?)<\/script>/)||[])[1]:src;
  if(!code) throw new Error('bl-core 없음: '+p);
  const ctx={module:{exports:{}}, console}; vm.createContext(ctx); vm.runInContext(code+'\n;module.exports=BL;',ctx); return ctx.module.exports;
}
const BL=loadCore(CORE);
const NM=path.join(here,'..','tests','bl_bench','node_modules');
const pdfjs=require(path.join(NM,'pdfjs-dist/legacy/build/pdf.js'));
/* 브라우저 bl-app readPdf 와 같은 모양 (pdf.js 3.11.174 · cMap) */
async function readPages(buf){
  const task=pdfjs.getDocument({data:new Uint8Array(buf), cMapUrl:path.join(NM,'pdfjs-dist/cmaps/'), cMapPacked:true, verbosity:0, standardFontDataUrl:path.join(NM,'pdfjs-dist/standard_fonts/')});
  const pdf=await task.promise, pages=[];
  try{ for(let i=1;i<=pdf.numPages;i++){ const pg=await pdf.getPage(i), vb=pg.view, tc=await pg.getTextContent();
      pages.push({page:i, w:vb[2]-vb[0], h:vb[3]-vb[1], items:tc.items.filter(it=>it.str&&it.str.trim()).map(it=>({s:it.str, x:it.transform[4]-vb[0], y:it.transform[5]-vb[1], w:it.width||0, h:it.height||Math.hypot(it.transform[2],it.transform[3])}))}); } }
  finally{ await pdf.destroy(); }
  return pages;
}
async function linesFor(id){
  const cp=path.join(OUT,'lines',id+'.json');
  if(fs.existsSync(cp)) return JSON.parse(fs.readFileSync(cp,'utf8'));
  const f=path.join(DATA,'pdf',id+'.pdf'); if(!fs.existsSync(f)) return null;
  let L=null; try{ L=BL.linesOf(await readPages(fs.readFileSync(f))); }catch(e){ L={error:String(e.message||e)}; }
  fs.writeFileSync(cp,JSON.stringify(L)); return L;
}
const csvCell=v=>{ const s=String(v==null?'':v); return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
const writeCsv=(name,rows,cols)=>fs.writeFileSync(path.join(OUT,name),'﻿'+[cols.join(',')].concat(rows.map(r=>cols.map(c=>csvCell(r[c])).join(','))).join('\r\n')+'\r\n');
function readCsv(p){ const t=fs.readFileSync(p,'utf8').replace(/^﻿/,''); const rows=[]; let row=[], cell='', q=false;
  for(let i=0;i<t.length;i++){ const c=t[i]; if(q){ if(c==='"'){ if(t[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=c; }
    else if(c==='"') q=true; else if(c===','){ row.push(cell); cell=''; } else if(c==='\n'){ row.push(cell.replace(/\r$/,'')); rows.push(row); row=[]; cell=''; } else cell+=c; }
  if(cell||row.length){ row.push(cell); rows.push(row); } const h=rows.shift(); return rows.filter(r=>r.length>1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]]))); }

const folders=JSON.parse(fs.readFileSync(path.join(DATA,'folders.json'),'utf8'));
const acl={}; for(const r of JSON.parse(fs.readFileSync(path.join(DATA,'acl.json'),'utf8')).results||[]) acl[r.invoice]=r;
const cpj=JSON.parse(fs.readFileSync(path.join(DATA,'compass.json'),'utf8'));
const car={}; cpj.carriers.forEach(c=>{ car[c.crcf9_carrierid]=c.crcf9_carrier; });
const con={}; cpj.contracts.forEach(c=>{ con[c.cr49f_sale_contractid]=c; });
const bk={}; cpj.bookings.forEach(b=>{ const iv=String(b.cr49f_invoice_no||'').trim().toUpperCase(); if(iv) (bk[iv]=bk[iv]||[]).push(b); });
const NORM={'CNC':'CMA CGM','YANGMING':'Yang Ming','INTERASIA':'Interasia','INTERASIA(N)':'Interasia','HEUNG A':'Heung-A','PAN OCEAN':'Pan Ocean','WAN HAI':'Wan Hai','HAPAG':'Hapag-Lloyd','HAPAG(N)':'Hapag-Lloyd','JIN JIANG':'JJ Shipping','MAERSK':'Maersk','SEALAND':'Maersk','SEALAND(N)':'Maersk','SINOKOR':'Sinokor','NAMSUNG':'Namsung','T.S.LINES':'TS Lines','OOCL(N)':'OOCL'};
const meta={}; if(META) readCsv(META).forEach(r=>{ meta[r.invoice]=r; });
let alias=null; try{ alias=BL.portAliasOf(JSON.parse(fs.readFileSync(path.join(DATA,'port_alias.json'),'utf8'))); }catch(e){ alias=BL.portAliasOf(null); }
const lcStore=c=>{ try{ return JSON.parse(fs.readFileSync(path.join(DATA,'lc_read',c+'.json'),'utf8')); }catch(e){ return null; } };

const by={}; for(const o of folders){ const iv=String(o.iv).split(/\s+/)[0].toUpperCase(); (by[iv]=by[iv]||[]).push(...(o.files||[])); }
const ivs=Object.keys(by).sort().filter(iv=>!ONLY.length||ONLY.includes(iv));
const outA=[], outB=[], outE=[], outRev=[], t0=Date.now(); let k=0;
for(const iv of ivs){
  const cands=by[iv].filter(f=>BL.draftName(f.name,iv)&&!BL.draftName(f.name,iv).excl);
  if(!cands.length) continue;
  const files=[]; for(const f of cands){ const L=await linesFor(f.id); files.push({id:f.id, name:f.name, mod:f.mod, L:Array.isArray(L)?L:null}); }
  const E=BL.editions(iv,files); const b=(bk[iv]||[{}])[0], c=con[b._cr49f_sale_contract_id_value]||{};
  const m=meta[iv]||{}; const carrier=m.carrier||NORM[car[b._cr49f_carrier_id_value]]||car[b._cr49f_carrier_id_value]||'?';
  let pay=m.pay||c.cr49f_pay_cls||((acl[iv]||{}).meta||{}).pay||''; pay=pay&&pay.toUpperCase().replace('/','').indexOf('LC')>=0?'LC':pay;
  const contract=m.contract||c.cr49f_sale_contract_no||'';
  outE.push({iv, carrier, pay, contract, editions:E.editions.length, src:E.src, names:E.editions.map(e=>e.name).join(' ; '), scans:E.scans.length, excl:E.excl.length});
  if(!E.editions.length) continue;
  const si=acl[iv]||null, n=E.editions.length;
  E.editions.forEach((e,i)=>{
    const ed=i===n-1?'last':(i===0?'first':'mid');
    if(si){ const ch=BL.check(si,e.L,null); const cls=BL.classifyAll(ch.rows,e.L); const od=BL.otherDraft(iv,cls,e.L,si);
      cls.forEach(r=>outA.push({iv, carrier, pay, file:e.name, ed, ed_idx:i+1, ed_n:n, field:r.field, class:r.class, why:r.why, judge:r.judge, note:r.note, other:od.other?od.why.join(' · '):''})); }
    if(i>0) BL.revDiff(E.editions[i-1].L,e.L).forEach(x=>outRev.push(Object.assign({iv, from_file:E.editions[i-1].name, to_file:e.name},x)));
  });
  if(pay==='LC'){ const e=E.editions[n-1]; const store=lcStore(contract); const rowsA=BL.check(si||{items:[],cp:{},meta:{}},e.L,null).rows;
    BL.lcCheck(e.L,rowsA,BL.lcView(store),alias,carrier).forEach(r=>outB.push(Object.assign({iv, carrier, contract, file:e.name},r))); }
  if(++k%50===0) console.log(k,'IV',Math.round((Date.now()-t0)/1000)+'s');
}
writeCsv('repro_compass.csv',outA,['iv','carrier','pay','file','ed','ed_idx','ed_n','field','class','why','judge','note','other']);
writeCsv('repro_lc.csv',outB,['iv','carrier','contract','file','item','result','lc_quote','draft','note']);
writeCsv('repro_editions.csv',outE,['iv','carrier','pay','contract','editions','src','names','scans','excl']);
writeCsv('repro_revision.csv',outRev,['iv','from_file','to_file','change','field','kind','text']);
console.log('done IV',k,'rows A',outA.length,'B',outB.length,'sec',Math.round((Date.now()-t0)/1000));
