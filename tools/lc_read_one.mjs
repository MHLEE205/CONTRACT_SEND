/* 新しい L/C 1 件を判読して L/C 保管所 (古紙/LC/_READ) に置く — 試験運用中に新しい L/C · Amend が来たとき 토르 / 리나이 が実行
   node tools/lc_read_one.mjs <契約番号> [--out <dir>] [--put] [--prev <dir>]
     --out  出力 dir (既定 ./lc_read_out) — {契約}.json · {契約}.md · {契約}.r2.json (2 回判読の生) · {契約}.lc_text.txt
     --put  SharePoint 古紙/LC/_READ/ に置く (前の判があり内容が違えば 前の判を _old/{契約}_v{n}.json へ移し version + 1)。付けなければ 手元だけ
   判読は a1_bench R2 ① と同じ: プロンプト (A1C.r2ExtractPrompt) · system (R2_EXTRACT_SYSTEM) · JSON 再指示 (A1_JSON_RETRY_NOTE) は ../a1_bench.html から実行時に読み込む (新しいプロンプトは作らない) ·
     L/C PDF の読み方 (0 復元 = extractLcPdfExact · 文字なし = extractPdfText → イメージ L/C) は a1_bench <script id="a1-d01"> (D-01 v3.2 の複写) をそのまま · Amend 適用 = A1C.analyzeLcTexts ·
     2 回判読の照合 = A1C.r2Check · モデル claude-opus-5-5 · thinking adaptive · effort high · max_tokens 32000 · 2 回 (A1 run A1_20261116-164541_full の設定)
   その後の整理は tools/lc_read_lib.mjs buildRecord (lc_read_build.mjs と同じ)
   lc_read 1.1: --put で前の判があり Amend 込みの判読なら mergeRecords (Amend が変えた欄だけ新しい判読 · 空欄は埋める · そのほか前の判) — 指示書 (2026-11-23)MAC-THOR_6 C1
   API キー = Mac キーチェーン LEENAI_ANTHROPIC_API_KEY (ファイル · 画面に出さない) · Microsoft トークン = ~/thor_work/d00_acl_survey/ms.py のキャッシュ (出さない)
   読むもの: 古紙/LC/2026/ の L/C · Amend PDF · 書くもの: --put のときだけ 古紙/LC/_READ/ の下 (それ以外は書かない)
   指示書: (2026-11-23)THOR_指示書_D00_LC보관소_ACL전환_v1_0 Step 2 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { REPO, loadA1, loadAcl, buildRecord, renderMd, indexRow, sameContent, splitLcText, mergeRecords, LC_READ_VER } from './lc_read_lib.mjs';

export const R2 = { model:'claude-opus-5-5', effort:'high', maxTokens:32000, reads:2, run:'lc_read_one' };
const PRICE = { 'claude-opus-5-5':{in:4, out:20, cacheWrite:5, cacheRead:0.4} };   // US$ / 100 万トークン (費用の目安) — 入力 · 出力は a1_bench A1_PRICE と同じ · キャッシュ書き 1.25 倍 · 読み 0.1 倍
const LC_DIR='古紙/LC/2026', READ_DIR='古紙/LC/_READ';
const DRIVE='b!ZK58_9YllU-vETQD3Xz0TbOInXbVCXJHnQ2280KJBArFLeM_18EgRbSeoO-TW__U', G='https://graph.microsoft.com/v1.0/drives/'+DRIVE;
const PDFJS_DIR=process.env.PDFJS_DIR||path.join(REPO,'tests/acl_bench/node_modules/pdfjs-dist');
const MS_DIR=process.env.MS_DIR||path.join(os.homedir(),'thor_work/d00_acl_survey'), PY=process.env.MS_PY||path.join(os.homedir(),'thor_work/venv/bin/python');

/* ── a1_bench.html から そのまま 読む部品 ── */
const A1HTML=fs.readFileSync(path.join(REPO,'a1_bench.html'),'utf8');
const strConst = (name, q) => { const m=A1HTML.match(new RegExp('const '+name+'='+(q==='`'?'`([\\s\\S]*?)`':"'((?:[^'\\\\]|\\\\.)*)'")+';')); if(!m) throw new Error(name+' を a1_bench.html で見つけられない'); return q==='`'?m[1]:JSON.parse('"'+m[1].replace(/"/g,'\\"')+'"'); };
export const R2_EXTRACT_SYSTEM = strConst('R2_EXTRACT_SYSTEM','`');
export const A1_JSON_RETRY_NOTE = strConst('A1_JSON_RETRY_NOTE',"'");
function loadD01(){
  const src=A1HTML.match(/<script id="a1-d01">([\s\S]*?)<\/script>/)[1];
  const req=createRequire(path.join(PDFJS_DIR,'package.json')), pdfjsLib=req(path.join(PDFJS_DIR,'legacy/build/pdf.js'));
  const window={pdfjsLib}; const quiet={warn(){}, log(){}, error(){}};
  return new Function('window','pdfjsLib','document','FileReader','console', src+';return {extractLcPdfExact, extractPdfText};')(window, pdfjsLib, undefined, undefined, quiet);
}
/* a1-app readLcFile と同じ判定 (0 復元 → だめなら 文字だけ → それもなければ イメージ) · CMap は手元の pdfjs-dist (同じ 3.11.174) */
async function readLcFile(D01, name, buf){
  const file={name, arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.byteLength)};
  const cm=[path.join(PDFJS_DIR,'cmaps')+path.sep];
  let r; try{ r=await D01.extractLcPdfExact(file,{cMapUrls:cm}); }catch(e){ r={ok:false,zeros:0,failed:0,pages:0,text:'',textLen:0,error:String(e.message||e)}; }
  let plain=null; if(!r.ok && !(r.textLen>200)){ try{ plain=await D01.extractPdfText(file); }catch(e){} }
  const image=!r.ok && !(r.textLen>200) && !plain;
  return {name, buf, size:buf.length, restore:r, text:r.text||plain||'', image, zeros:r.zeros, failed:r.failed, pages:r.pages};
}

/* ── Microsoft Graph (トークンはこのプロセスのメモリだけ) ── */
let TK=null; function tok(){ if(TK&&Date.now()-TK.at<40*60e3) return TK.v; const v=execFileSync(PY,['-W','ignore','-c','import ms,sys;sys.stdout.write(ms._tok(ms.GRAPH))'],{cwd:MS_DIR,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(); TK={v,at:Date.now()}; return v; }
const enc=p=>p.split('/').map(encodeURIComponent).join('/');
async function g(url, opt, raw){ for(let i=0;i<6;i++){ const r=await fetch(url.startsWith('http')?url:G+url, Object.assign({},opt||{},{headers:Object.assign({Authorization:'Bearer '+tok()},(opt&&opt.headers)||{})}));
    if(r.status===404) return null; if(r.status===401){ TK=null; continue; } if(r.status===429||r.status>=500){ await new Promise(s=>setTimeout(s,Math.min(30000,(+r.headers.get('Retry-After')||2**i)*1000))); continue; }
    if(!r.ok) throw new Error('Graph '+r.status+' '+(await r.text()).slice(0,200)); return raw?Buffer.from(await r.arrayBuffer()):r.json(); } throw new Error('Graph 再試行の上限'); }
export async function spList(dir){ let u='/root:/'+enc(dir)+':/children?$top=999&$select=name,size,file,folder,lastModifiedDateTime', out=[]; while(u){ const j=await g(u); if(!j) return null; out=out.concat(j.value||[]); u=j['@odata.nextLink']||null; } return out; }
export const spGet = p => g('/root:/'+enc(p)+':/content',null,true);
function guard(p){ if(p.indexOf(READ_DIR+'/')!==0) throw new Error('書き込み禁止の場所: '+p); }
export async function spPut(p, body, type){ guard(p); const r=await fetch(G+'/root:/'+enc(p)+':/content',{method:'PUT',headers:{Authorization:'Bearer '+tok(),'Content-Type':type},body}); if(!r.ok) throw new Error('PUT '+r.status+' '+p); return r.json(); }
export async function spMove(from, toDir, name){ guard(from); guard(toDir+'/x');
  const it=await g('/root:/'+enc(from)); if(!it) return null; const parent=await g('/root:/'+enc(toDir));
  if(!parent){ const up=toDir.slice(0,toDir.lastIndexOf('/')), nm=toDir.slice(toDir.lastIndexOf('/')+1); guard(up+'/x');
    const r=await fetch(G+'/root:/'+enc(up)+':/children',{method:'POST',headers:{Authorization:'Bearer '+tok(),'Content-Type':'application/json'},body:JSON.stringify({name:nm,folder:{},'@microsoft.graph.conflictBehavior':'fail'})}); if(!r.ok&&r.status!==409) throw new Error('フォルダ作成 '+r.status); }
  const pid=(await g('/root:/'+enc(toDir))).id;
  const r=await fetch(G+'/items/'+it.id,{method:'PATCH',headers:{Authorization:'Bearer '+tok(),'Content-Type':'application/json'},body:JSON.stringify({parentReference:{id:pid},name})}); if(!r.ok) throw new Error('移動 '+r.status+' '+from); return r.json(); }

/* ── Claude API (a1_bench callClaude / callJson と同じ流れ · ストリーミング · 529/429/5xx 再試行) ── */
function apiKey(){ return execFileSync('security',['find-generic-password','-s','LEENAI_ANTHROPIC_API_KEY','-w'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(); }
async function callClaude(body, label){
  let last=null;
  for(let a=0;a<4;a++){
    let res; try{ res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':apiKey(),'anthropic-version':'2023-06-01'},body:JSON.stringify(Object.assign({},body,{stream:true}))}); }
    catch(e){ last=String(e.message||e); await new Promise(s=>setTimeout(s,[5000,10000,20000][a]||20000)); continue; }
    if(!res.ok){ const ej=await res.json().catch(()=>({})); last=res.status+' '+((ej.error&&ej.error.message)||''); if(res.status===529||res.status===429||res.status>=500){ console.error(label+': '+res.status+' → 再試行'); await new Promise(s=>setTimeout(s,[5000,10000,20000][a]||20000)); continue; } throw new Error(label+': '+last); }
    const rd=res.body.getReader(), dec=new TextDecoder(); let buf='', text='', usage={}, stop='', model='', err=null;
    for(;;){ const {done,value}=await rd.read(); if(done) break; buf+=dec.decode(value,{stream:true}); let i;
      while((i=buf.indexOf('\n\n'))>=0){ const ch=buf.slice(0,i); buf=buf.slice(i+2); const dl=ch.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join(''); if(!dl) continue; let ev; try{ ev=JSON.parse(dl); }catch(e){ continue; }
        if(ev.type==='message_start'){ usage=Object.assign({},ev.message.usage||{}); model=ev.message.model||''; }
        else if(ev.type==='content_block_delta'&&ev.delta&&ev.delta.type==='text_delta') text+=ev.delta.text;
        else if(ev.type==='message_delta'){ if(ev.delta&&ev.delta.stop_reason) stop=ev.delta.stop_reason; if(ev.usage) Object.assign(usage,ev.usage); }
        else if(ev.type==='error') err=ev.error||{}; } }
    if(err){ last=err.type+' '+err.message; if(err.type==='overloaded_error'&&a<3){ await new Promise(s=>setTimeout(s,[5000,10000,20000][a])); continue; } throw new Error(label+': '+last); }
    return {text, usage, stop, model};
  }
  throw new Error(label+': 再試行の上限 '+last);
}
export function costOf(usage, model){ const p=PRICE[model]||PRICE['claude-opus-5-5'], u=usage||{};
  return ((u.input_tokens||0)*p.in+(u.output_tokens||0)*p.out+(u.cache_creation_input_tokens||0)*p.cacheWrite+(u.cache_read_input_tokens||0)*p.cacheRead)/1e6; }
async function callJson(A1, body, label, spent){
  let r=await callClaude(body,label); spent.push({label, usage:r.usage, model:r.model||body.model});
  if(r.stop==='refusal') throw new Error(label+': refusal');
  let j=A1.extractJson(r.text), retried=false;
  if(!j){ retried=true; const b2=JSON.parse(JSON.stringify(body)), m=b2.messages[b2.messages.length-1]; m.content.push({type:'text',text:A1_JSON_RETRY_NOTE});
    r=await callClaude(b2,label+' (再試行)'); spent.push({label:label+' retry', usage:r.usage, model:r.model||body.model}); j=A1.extractJson(r.text); if(!j) throw new Error(label+': JSON を読めない (再試行後)'); }
  return {json:j, retried};
}

/* ── 1 契約 ── */
/* PDF を読んで Amend を当てるところまで (AI なし) — 試験では A1 run の lc_text と同じになるかを見る */
export async function prepareLc(contract){
  const A1=loadA1(), D01=loadD01();
  const files=(await spList(LC_DIR))||[], mine=[];
  files.filter(f=>f.file&&/\.pdf$/i.test(f.name)).forEach(f=>{ const p=A1.parseLcFileName(f.name); if(p&&p.contract===contract) mine.push({name:f.name, amend:p.amend}); });
  const baseF=mine.filter(x=>!x.amend), amF=mine.filter(x=>x.amend).sort((a,b)=>a.amend-b.amend);
  if(!baseF.length) throw new Error(contract+': '+LC_DIR+' に本 L/C の PDF がない'+(amF.length?' (Amend だけある)':''));
  const base=[], amends=[];
  for(const f of baseF) base.push(await readLcFile(D01, f.name, await spGet(LC_DIR+'/'+f.name)));
  for(const f of amF){ const x=await readLcFile(D01, f.name, await spGet(LC_DIR+'/'+f.name)); x.n=f.amend; amends.push(x); }
  /* a1-app parseContractLc と同じ */
  const lcp=A1.analyzeLcTexts(base.filter(x=>x.text).map(x=>({name:x.name,text:x.text})), amends.filter(x=>x.text).map(x=>({n:x.n,name:x.name,text:x.text})));
  lcp.image=base.some(x=>x.image)||!base.length;
  lcp.rawRestored=base.map(x=>'=== '+x.name+' ===\n'+x.text).concat(amends.map(x=>'=== '+x.name+' (AMEND'+x.n+') ===\n'+x.text)).join('\n\n');
  return {A1, lcp, base, amends, lcText:'\uFEFF'+lcp.view+'\n\n'+'='.repeat(60)+'\n'+lcp.rawRestored};   // a1-app の lc_text 保存と同じ形
}
export async function readOne(contract){
  const {A1, lcp, base, amends, lcText}=await prepareLc(contract), ACL=loadAcl(), spent=[];
  /* a1-app runR2Extract と同じ (r2LcInput = 原文テキストと判読構造だけ · ファイル名 · COMPASS なし) */
  const content=[]; if(lcp.image) for(const x of base.concat(amends)) if(x.image) content.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:x.buf.toString('base64')}});
  content.push({type:'text',text:A1.r2ExtractPrompt({view:lcp.view, files:base.map(x=>({text:x.text})), amends:amends.map(x=>({n:x.n,text:x.text}))}),cache_control:{type:'ephemeral'}});
  const body={model:R2.model,max_tokens:R2.maxTokens,system:R2_EXTRACT_SYSTEM,thinking:{type:'adaptive'},output_config:{effort:R2.effort},messages:[{role:'user',content}]};
  const x1=await callJson(A1, body, contract+' R2① #1', spent), x2=await callJson(A1, body, contract+' R2① #2', spent);
  const lcRaw=base.map(x=>x.text).concat(amends.map(x=>x.text)).join('\n');   // a1-app r2RawForCheck
  const r2={no:contract, image:!!lcp.image, retried:[x1.retried,x2.retried], extract:[x1.json,x2.json], checks:A1.r2Check(x1.json,x2.json,lcRaw,!!lcp.image)};
  const rec=buildRecord(r2, lcText, {A1, ACL, run:'lc_read_one '+new Date().toISOString().slice(0,10)+' ('+R2.model+' · '+R2.effort+' · 2 回)', now:new Date().toISOString()});
  rec.source.lc_text=READ_DIR+'/_text/'+contract+'.txt';
  const cost=spent.reduce((s,c)=>s+costOf(c.usage,c.model),0);
  return {rec, r2, lcText, spent, cost};
}
/* 保管所に置く — 前の判と同じ内容なら そのまま · 違えば 前の判を _old/{契約}_v{n}.json へ · version = 前 + 1 以上 · _index.json の 1 行を差し替え */
export async function putRecord(contract, rec, lcText, prevIn){
  const prev = prevIn!==undefined ? prevIn : (b=>b?JSON.parse(b.toString('utf8')):null)(await spGet(READ_DIR+'/'+contract+'.json'));
  if(prev&&sameContent(prev,rec)) return prev;
  if(prev){ rec.version=Math.max(+rec.version||1, (+prev.version||1)+1); await spMove(READ_DIR+'/'+contract+'.json', READ_DIR+'/_old', contract+'_v'+prev.version+'.json'); }
  await spPut(READ_DIR+'/'+contract+'.json', JSON.stringify(rec,null,1), 'application/json');
  await spPut(READ_DIR+'/'+contract+'.md', renderMd(rec), 'text/markdown; charset=utf-8');
  if(lcText!=null) await spPut(READ_DIR+'/_text/'+contract+'.txt', lcText, 'text/plain; charset=utf-8');
  const ib=await spGet(READ_DIR+'/_index.json'), ix=ib?JSON.parse(ib.toString('utf8')):{schema:'lc_read_index/1', items:[]};
  ix.items=(ix.items||[]).filter(r=>r.contract!==contract).concat([indexRow(rec)]).sort((a,b)=>a.contract.localeCompare(b.contract)); ix.contracts=ix.items.length; ix.updated_at=new Date().toISOString();
  await spPut(READ_DIR+'/_index.json', JSON.stringify(ix,null,1), 'application/json');
  return rec;
}
async function main(){
  const args=process.argv.slice(2), contract=args.find(a=>!a.startsWith('--')&&!/^\.|\//.test(a)), arg=k=>{ const i=args.indexOf('--'+k); return i>=0?args[i+1]:null; };
  if(!contract||!/^[A-Z]{2,4}-\d{4}[A-Z0-9]{1,4}$/.test(contract)){ console.error('使い方: node tools/lc_read_one.mjs <契約番号 例 LRS-2611XX1> [--out dir] [--put]'); process.exit(2); }
  const out=arg('out')||'lc_read_out'; fs.mkdirSync(out,{recursive:true});
  const {rec, r2, lcText, spent, cost}=await readOne(contract);
  let fin=rec, merged=false;
  if(args.includes('--put')){
    /* lc_read 1.1 (C1) — 前の判があり 今回 Amend 込みで読んだなら 「Amend 칸만 교체」 で合わせる (Amend がない契約は 今までどおり) */
    const prevBuf=await spGet(READ_DIR+'/'+contract+'.json'), prev=prevBuf?JSON.parse(prevBuf.toString('utf8')):null;
    if(prev && (rec.source.amends||[]).length){ fin=mergeRecords(prev, rec, lcText, {A1:loadA1(), ACL:loadAcl(), now:rec.created_at}); merged=true; }
    fin=await putRecord(contract, fin, lcText, prev);
  }
  fs.writeFileSync(path.join(out,contract+'.json'), JSON.stringify(fin,null,1));
  fs.writeFileSync(path.join(out,contract+'.md'), renderMd(fin));
  fs.writeFileSync(path.join(out,contract+'.r2.json'), JSON.stringify(r2,null,1));
  fs.writeFileSync(path.join(out,contract+'.lc_text.txt'), lcText);
  console.log(JSON.stringify({contract, version:fin.version, merged, lc_read:LC_READ_VER, checks:fin.checks.length, image:fin.image, amends:fin.source.amends.length, put:args.includes('--put'), calls:spent.length, cost_usd:+cost.toFixed(3),
    tokens:spent.reduce((s,c)=>({in:s.in+(c.usage.input_tokens||0), out:s.out+(c.usage.output_tokens||0), cw:s.cw+(c.usage.cache_creation_input_tokens||0), cr:s.cr+(c.usage.cache_read_input_tokens||0)}),{in:0,out:0,cw:0,cr:0})}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)) main().catch(e=>{ console.error('ERROR', e.message); process.exit(1); });
