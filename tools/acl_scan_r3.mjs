/* スキャン · 乙仲様式 ACL — AI 「読めず」 (2 回違う) 欄だけ 3 回目 (acl_bench v0.19 · 指示書 THOR_17 E-V3 · 형님 V3)
   node tools/acl_scan_r3.mjs <ACL.pdf> --cache <dir> [--other] [--out <dir>] [--limit <US$>]
     --cache = {sha256}.json / {sha256}.other.json (2 回の保存本 · acl_scan_ai.mjs が作ったもの) のあるフォルダ
     → {sha256}[.other].r3.json = {schema:'acl_scan_r3/1', sha256, other, model, fields:{欄:{page, box, value, crop}}, cost_usd, at} + 切り抜き {sha256}[.other].r3.{欄}.png (300 dpi)
   規則 (どの欄 · 聞き方 · 合わせ方) は ../acl_bench.html の acl-core (SCAN_R3 · scanLocatePrompt · scanRetryPrompt · scanRetryValue · scanBox · scanApplyR3) — 2 か所に書かない
   ① 頁 (150 dpi 灰色) で欄の位置を聞く → ② その部分だけ 300 dpi で切り抜き → ③ 切り抜きを 2 回読む (チェック欄は 印があるかだけ) · 同じ PDF の r3 保存本があれば AI を呼ばない
   必要: tests/acl_bench/node_modules (pdfjs-dist · canvas) · API キー = acl_scan_ai.mjs の apiKey() (画面 · ファイルに出さない) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadAcl } from './lc_read_lib.mjs';
import { callClaude, sha256, cacheName } from './acl_scan_ai.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const req=createRequire(path.join(HERE,'../tests/acl_bench/package.json'));
export const r3Name = (h, other) => h+(other?'.other':'')+'.r3.json';
export const cropName = (h, other, k) => h+(other?'.other':'')+'.r3.'+k+'.png';

/* 頁 → PNG (dpi · 灰色) · box = [x0,y0,x1,y1] (0〜1) なら その部分だけ */
export async function renderPng(buf, page, dpi, box, minWidth){
  const pdfjs=req('pdfjs-dist/legacy/build/pdf.js'), { createCanvas }=req('canvas');
  const D=path.dirname(req.resolve('pdfjs-dist/package.json')), FONTS=path.join(D,'standard_fonts')+path.sep, CMAPS=path.join(D,'cmaps')+path.sep;   // 日本語の CID 字 (保険証券の打ち込み) は cMap がないと描かれない
  const pdf=await pdfjs.getDocument({data:new Uint8Array(buf), standardFontDataUrl:FONTS, cMapUrl:CMAPS, cMapPacked:true, verbosity:0}).promise;
  const pg=await pdf.getPage(Math.min(Math.max(1,page||1), pdf.numPages)), vp=pg.getViewport({scale:dpi/72});
  const cv=createCanvas(Math.ceil(vp.width), Math.ceil(vp.height)), cx=cv.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,cv.width,cv.height);
  await pg.render({canvasContext:cx, viewport:vp}).promise;
  const [x0,y0,x1,y1]=box||[0,0,1,1], sx=Math.floor(x0*cv.width), sy=Math.floor(y0*cv.height), w=Math.max(1,Math.ceil((x1-x0)*cv.width)), h=Math.max(1,Math.ceil((y1-y0)*cv.height));
  const z=minWidth&&w<minWidth?Math.ceil(minWidth/w):1, out=createCanvas(w*z,h*z), oc=out.getContext('2d'); oc.imageSmoothingEnabled=false; oc.drawImage(cv, sx, sy, w, h, 0, 0, w*z, h*z);   // 小さい切り抜きは 整数倍に拡大 (最近傍)
  const im=oc.getImageData(0,0,w*z,h*z), d=im.data; for(let i=0;i<d.length;i+=4){ const g=Math.round(d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114); d[i]=d[i+1]=d[i+2]=g; } oc.putImageData(im,0,0);
  await pdf.destroy(); return out.toBuffer('image/png');
}
async function ask(ACL, png, text, label, call, read){
  const S=ACL.SCAN_R3, body={model:S.model, max_tokens:read?S.readMaxTokens:S.maxTokens, output_config:{effort:read?S.readEffort:S.effort}, messages:[{role:'user', content:[{type:'image', source:{type:'base64', media_type:'image/png', data:png.toString('base64')}}, {type:'text', text}]}]};
  const r=await call(body, label); return {j:ACL.scanJson(r.text), cost:ACL.scanCost(r.usage)};
}
/* 1 つの PDF → AI_DIFF の欄だけ 3 回目 (call は差し替え可 — 試験は 偽の AI · 偽の描画) */
export async function scanRetry(buf, reads, opt){
  opt=opt||{}; const ACL=opt.ACL||loadAcl(), call=opt.call||callClaude, render=opt.render||renderPng, O=!!opt.other, h=sha256(buf), S=ACL.SCAN_R3, limit=opt.limit||10;
  const m=ACL.scanMerge(reads[0], reads[1], {other:O}), keys=Object.keys(m.fields).filter(k=>m.fields[k].conf==='AI_DIFF'), lb=ACL.scanLabelsSame(reads[0], reads[1]);
  const out={schema:S.schema, ver:S.ver, sha256:h, other:O, model:S.model, effort:S.effort, dpi:S.cropDpi, fields:{}, crops:{}, cost_usd:0, at:new Date().toISOString()};
  for(const k of keys){ if(out.cost_usd>limit) break; const page=m.fields[k].page||1;
    const a=await ask(ACL, await render(buf, page, S.locateDpi, null), ACL.scanLocatePrompt(k, lb[k], page), 'r3 位置 '+k, call); out.cost_usd+=a.cost;
    const box=ACL.scanBox(a.j); if(!box){ out.fields[k]={page, box:null, value:null, why:'位置が分からない'}; continue; }
    const png=await render(buf, page, S.cropDpi, box, S.minWidth), [b,b2]=await Promise.all([1,2].map(i=>ask(ACL, png, ACL.scanRetryPrompt(k, lb[k]), 'r3 判読 '+k+' #'+i, call, true))); out.cost_usd+=b.cost+b2.cost;
    const name=cropName(h, O, k); out.crops[name]=png; out.fields[k]={page, box:box.map(x=>+x.toFixed(4)), value:ACL.scanRetryValue(k, b.j), value2:ACL.scanRetryValue(k, b2.j), crop:name}; }
  out.cost_usd=+out.cost_usd.toFixed(4); return out;
}
async function main(){
  const args=process.argv.slice(2), file=args.find(a=>!a.startsWith('--')&&/\.pdf$/i.test(a)), arg=k=>{ const i=args.indexOf('--'+k); return i>=0?args[i+1]:null; };
  if(!file||!arg('cache')){ console.error('使い方: node tools/acl_scan_r3.mjs <ACL.pdf> --cache <dir> [--other] [--out dir] [--limit US$]'); process.exit(2); }
  const O=args.indexOf('--other')>=0, buf=fs.readFileSync(file), h=sha256(buf), cache=arg('cache'), out=arg('out')||cache, ACL=loadAcl();
  const f2=path.join(cache, cacheName(h,O)); if(!fs.existsSync(f2)) throw new Error('2 回の保存本がない: '+cacheName(h,O));
  const f3=path.join(cache, r3Name(h,O)); let r3;
  if(fs.existsSync(f3)) r3=Object.assign(JSON.parse(fs.readFileSync(f3,'utf8')),{cached:true});
  else { const two=JSON.parse(fs.readFileSync(f2,'utf8')); r3=await scanRetry(buf, two.reads, {ACL, other:O, limit:+(arg('limit')||10)}); r3.file=path.basename(file);
    fs.mkdirSync(out,{recursive:true}); Object.entries(r3.crops).forEach(([n,b])=>fs.writeFileSync(path.join(out,n),b)); delete r3.crops; fs.writeFileSync(path.join(out, r3Name(h,O)), JSON.stringify(r3,null,1)); }
  const two=JSON.parse(fs.readFileSync(f2,'utf8')), m=ACL.scanMerge(two.reads[0], two.reads[1], {other:O, r3});
  console.log(JSON.stringify({file:path.basename(file), sha256:h, cached:!!r3.cached, cost_usd:r3.cost_usd, decided:m.ai.r3.decided, open:m.ai.r3.open, values:Object.fromEntries(Object.entries(r3.fields).map(([k,x])=>[k,x.value]))}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(e=>{ console.error('ERROR', e.message); process.exit(1); });
