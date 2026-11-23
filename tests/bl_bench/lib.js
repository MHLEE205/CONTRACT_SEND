/* bl_bench 시험 공통 — bl-core 읽기 · 가짜 PDF (pdf-lib · Courier) · pdf.js 읽기 (브라우저 bl-app readPages 와 같은 모양) — 네트워크 0 · 가짜 값만 */
const fs=require('fs'), path=require('path'), vm=require('vm');
const HTML=path.resolve(process.env.BL_HTML||path.join(__dirname,'../../bl_bench.html'));
function script(id, html){ const s=fs.readFileSync(html||HTML,'utf8'), m=s.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>')); if(!m) throw new Error('script '+id+' 없음'); return m[1]; }
/* v0.2: ACL エンジン (同じレポの acl_bench.html の acl-core) を BL.useEngine で渡す — 画面ではコミット固定 + sha256 で読むもの */
const ACL_HTML=path.join(__dirname,'../../acl_bench.html');
function loadAcl(html){ return new Function('module', fs.readFileSync(html||ACL_HTML,'utf8').match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined); }
function loadCore(html, acl){ const ctx={module:{exports:{}}, console}; vm.createContext(ctx); vm.runInContext(script('bl-core',html)+'\n;module.exports=BL;',ctx); const B=ctx.module.exports; if(B.useEngine) B.useEngine(acl||loadAcl()); return B; }
/* 港の別名の 試験用 固定値 (형님 지시 · master_port_alias が無いときの試験 — 2 段階で bl-core から ここへ移した) = cpPrepare の alias の形 */
const PORT_ALIAS_TEST = [['JAKARTA','JAKARTA'],['JAKARTA','TAN'+'JUNG PRIOK']].map(([g,n])=>({group:g, name:n, country:'', ok:true, why:''}));
const {PDFDocument, StandardFonts, rgb}=require('pdf-lib');
const pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
/* pages = [[{x, y(위에서), t, size}]] → PDF bytes (A4) */
async function mkPdf(pages, opt){
  opt=opt||{}; const doc=await PDFDocument.create(), font=await doc.embedFont(StandardFonts.Courier), W=595, H=842;
  for(const items of pages){ const pg=doc.addPage([W,H]); for(const it of items) pg.drawText(String(it.t),{x:it.x, y:H-it.y, size:it.size||9, font, color:rgb(0,0,0)}); }
  return new Uint8Array(await doc.save());
}
async function readPages(bytes){
  const pdf=await pdfjs.getDocument({data:bytes.slice(0), verbosity:0, standardFontDataUrl:path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts/')}).promise, pages=[];
  try{ for(let i=1;i<=pdf.numPages;i++){ const pg=await pdf.getPage(i), vb=pg.view, tc=await pg.getTextContent();
      pages.push({page:i, w:vb[2]-vb[0], h:vb[3]-vb[1], items:tc.items.filter(it=>it.str&&it.str.trim()).map(it=>({s:it.str, x:it.transform[4]-vb[0], y:it.transform[5]-vb[1], w:it.width||0, h:it.height||Math.hypot(it.transform[2],it.transform[3])}))}); } }
  finally{ await pdf.destroy(); }
  return pages;
}
let pass=0, fail=0; const fails=[];
function ok(c, msg){ if(c) pass++; else { fail++; fails.push(msg); console.log('FAIL', msg); } }
function eq(a, b, msg){ ok(JSON.stringify(a)===JSON.stringify(b), msg+' — got '+JSON.stringify(a)+' want '+JSON.stringify(b)); }
function done(name){ console.log(name+' pass '+pass+' fail '+fail); process.exit(fail?1:0); }
module.exports={HTML, script, loadCore, loadAcl, ACL_HTML, PORT_ALIAS_TEST, mkPdf, readPages, ok, eq, done};
