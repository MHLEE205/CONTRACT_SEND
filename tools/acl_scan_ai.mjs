/* スキャン ACL — AI で 2 回読む (acl_bench v0.14 · 指示書 (2026-11-23)MAC-THOR_6 C4 · 형님 D2)
   node tools/acl_scan_ai.mjs <ACL.pdf> [--out <dir>] [--cache <dir>] [--other]
     --other (acl_bench v0.15 · G9) = 乙仲の独自様式: scanPrompt({other:true}) · 保存 {sha256}.other.json (format OTHER · prompt_ver o1) · 合わせ方 scanMerge(…,{other:true}) (様式にない欄 = NA)
     → {sha256}.json = {schema:'acl_scan_ai/1', sha256, file, model, reads:[j1, j2], usage, cost_usd, at} (AI の生の 2 回) · 画面に 2 回の一致 · 違う欄
   規則 (プロンプト · 2 回の合わせ方 · 合計) は ../acl_bench.html <script id="acl-core"> の ACL.scanPrompt · SCAN_SYSTEM · scanMerge (2 か所に書かない)
   呼び方は lc_read_one と同じ (claude-opus-5-5 · thinking adaptive · effort high · ストリーミング · 再試行 · PDF を document で送る · 2 回目はキャッシュ読み)
   同じ PDF (sha256) は もう一度 AI に送らない — cache dir に {sha256}.json があれば それを使う (費用)
   API キー = Mac キーチェーン LEENAI_ANTHROPIC_API_KEY → なければ 環境変数 (ファイル · 画面に出さない) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { loadAcl } from './lc_read_lib.mjs';

export const SCHEMA = 'acl_scan_ai/1';
/* 費用の目安 = ACL.scanCost (acl-core SCAN_AI.price · 1 か所) */
export const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

/* API キー: Mac キーチェーン → なければ 環境変数 LEENAI_ANTHROPIC_API_KEY (Windows 会社 PC) · ファイル · 画面に出さない */
export function apiKey(){ let k=''; if(process.platform==='darwin'){ try{ k=execFileSync('security',['find-generic-password','-s','LEENAI_ANTHROPIC_API_KEY','-w'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(); }catch(e){} }
  if(!k) k=String(process.env.LEENAI_ANTHROPIC_API_KEY||'').trim(); if(!k) throw new Error('API キーがない (Mac キーチェーン / 環境変数 LEENAI_ANTHROPIC_API_KEY)'); return k; }
/* Claude (ストリーミング · 529/429/5xx 再試行) — lc_read_one callClaude と同じ */
export async function callClaude(body, label){
  let last=null;
  for(let a=0;a<4;a++){
    let res; try{ res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':apiKey(),'anthropic-version':'2023-06-01'},body:JSON.stringify(Object.assign({},body,{stream:true}))}); }
    catch(e){ last=String(e.message||e); await new Promise(s=>setTimeout(s,[5000,10000,20000][a]||20000)); continue; }
    if(!res.ok){ const ej=await res.json().catch(()=>({})); last=res.status+' '+((ej.error&&ej.error.message)||''); if(res.status===529||res.status===429||res.status>=500){ await new Promise(s=>setTimeout(s,[5000,10000,20000][a]||20000)); continue; } throw new Error(label+': '+last); }
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

/* 1 つの PDF → AI 2 回 (call は差し替え可 — 試験は 偽の AI) */
export async function scanRead(buf, opt){
  opt=opt||{}; const ACL=opt.ACL||loadAcl(), call=opt.call||callClaude, S=ACL.SCAN_AI, label=opt.label||'scan', O=!!opt.other;
  const body={model:S.model, max_tokens:S.maxTokens, system:ACL.SCAN_SYSTEM, thinking:{type:'adaptive'}, output_config:{effort:S.effort},
    messages:[{role:'user', content:[{type:'document', source:{type:'base64', media_type:'application/pdf', data:Buffer.from(buf).toString('base64')}}, {type:'text', text:ACL.scanPrompt(O?{other:true}:undefined), cache_control:{type:'ephemeral'}}]}]};
  const reads=[], usage=[]; let cost=0;
  for(let i=0;i<S.reads;i++){
    let r=await call(body, label+' #'+(i+1)); usage.push(r.usage||{}); cost+=ACL.scanCost(r.usage);
    if(r.stop==='refusal') throw new Error(label+': refusal');
    let j=ACL.scanJson(r.text);
    if(!j){ const b2=JSON.parse(JSON.stringify(body)); b2.messages[0].content.push({type:'text', text:'Return only the JSON object, nothing else.'});
      r=await call(b2, label+' #'+(i+1)+' (再試行)'); usage.push(r.usage||{}); cost+=ACL.scanCost(r.usage); j=ACL.scanJson(r.text); }
    if(!j) throw new Error(label+' #'+(i+1)+': JSON を読めない');
    reads.push(j);
  }
  return Object.assign({schema:SCHEMA, sha256:sha256(buf), model:S.model, effort:S.effort, prompt_ver:O?S.otherVer:S.ver, reads, usage, cost_usd:+cost.toFixed(4), at:new Date().toISOString()}, O?{format:'OTHER'}:{});
}
/* キャッシュ (sha256) つき */
export const cacheName = (h, other) => h+(other?'.other':'')+'.json';   // v0.15: 形式の印だけ足す
export async function scanReadCached(buf, cacheDir, opt){
  const h=sha256(buf), f=cacheDir&&path.join(cacheDir, cacheName(h, opt&&opt.other));
  if(f&&fs.existsSync(f)) return Object.assign(JSON.parse(fs.readFileSync(f,'utf8')), {cached:true});
  const r=await scanRead(buf, opt); if(f){ fs.mkdirSync(cacheDir,{recursive:true}); fs.writeFileSync(f, JSON.stringify(r)); }
  return Object.assign(r, {cached:false});
}

async function main(){
  const args=process.argv.slice(2), file=args.find(a=>!a.startsWith('--')&&/\.pdf$/i.test(a)), arg=k=>{ const i=args.indexOf('--'+k); return i>=0?args[i+1]:null; };
  if(!file){ console.error('使い方: node tools/acl_scan_ai.mjs <ACL.pdf> [--out dir] [--cache dir] [--other]'); process.exit(2); }
  const other=args.indexOf('--other')>=0, buf=fs.readFileSync(file), ACL=loadAcl(), r=await scanReadCached(buf, arg('cache'), {ACL, label:path.basename(file), other});
  r.file=path.basename(file);
  const m=ACL.scanMerge(r.reads[0], r.reads[1], {model:r.model, sha256:r.sha256, cost_usd:r.cost_usd, at:r.at, other});
  const out=arg('out')||'acl_scan_out'; fs.mkdirSync(out,{recursive:true}); fs.writeFileSync(path.join(out, cacheName(r.sha256,other)), JSON.stringify(r,null,1)); fs.writeFileSync(path.join(out, r.sha256+(other?'.other':'')+'.merged.json'), JSON.stringify(m,null,1));
  console.log(JSON.stringify({file:r.file, sha256:r.sha256, cached:r.cached, cost_usd:r.cost_usd, form:m.ai.form, naFields:m.ai.naFields, diffFields:m.ai.diffFields, diffRows:m.ai.diffRows, rows:m.rows.length, totals:m.totals}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)   /* Windows でも同じ (URL.pathname は /C:/ · 漢字が % になる) */) main().catch(e=>{ console.error('ERROR', e.message); process.exit(1); });
