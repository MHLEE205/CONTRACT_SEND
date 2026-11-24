/* チェックポイント 試し実行 (過去の書類で 先に走らせてみる) — 指示書 (2026-11-23) D00 체크포인트 마스터 v1 Step 4 · DOC-D-00 §2-13 「② 過去書類全部で試す」
   node tools/cp_trial.mjs <CP-ID> [--file <試験用 JSON>] [--cache <dir>] [--refresh] [--out <dir>] [--write]
   - 行は マスター 古紙/-. AI 活用/MASTER/master_checkpoint.json から (--file = 行 1 つ · 行の配列 · マスターの形 の JSON — マスターを読まない)
   - 書類 = ACL_bench と同じ対象 (書類作成中 · _OLD_DOC の Invoice フォルダの ACL PDF · NACCS だけ) · COMPASS (読むだけ) · L/C 保管所 古紙/LC/_READ (読むだけ)
     → 1 回目は集めて --cache (既定 ~/thor_work/cp_trial_cache) に置く · 2 回目からはそれを使う (--refresh で集め直す)
   - その行を 「有効」 として実行 (状態 · 承認は見ない — 試し) → 当たった件数 · 結果別 · Invoice の一覧 (CSV) を --out (既定 = cache/trial_{ID}_{時刻}.csv)
   - --write のときだけ: マスターのその行の 試験結果 (trial) 欄に 1 行 · 変更記録 (history) に 1 行 (ETag で 他の人の保存とぶつかったら書かない)
   - 書く先は マスター 1 か所 (--write) だけ · COMPASS · メールは書かない · トークン = tools/ms_token.mjs (Mac ms.py · Windows bl_supp/tok.py · 画面 · ファイルに出さない)
   - 必要: tests/acl_bench/node_modules (pdfjs-dist) */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { msToken } from './ms_token.mjs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url)), REPO=path.join(HERE,'..');
const arg=k=>{ const i=process.argv.indexOf('--'+k); return i>0?process.argv[i+1]:null; }, flag=k=>process.argv.indexOf('--'+k)>0;
const ID=(process.argv[2]||'').trim();
if(!ID||/^--/.test(ID)){ console.error('使い方: node tools/cp_trial.mjs <CP-ID> [--file <JSON>] [--cache <dir>] [--refresh] [--out <dir>] [--write]'); process.exit(2); }
const ACL=new Function('module',fs.readFileSync(path.join(REPO,'acl_bench.html'),'utf8').match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const CACHE=arg('cache')||path.join(os.homedir(),'thor_work','cp_trial_cache');
const DRIVE='b!ZK58_9YllU-vETQD3Xz0TbOInXbVCXJHnQ2280KJBArFLeM_18EgRbSeoO-TW__U', G='https://graph.microsoft.com/v1.0/', DV='https://orgde512c6f.crm7.dynamics.com/api/data/v9.2/';
const MASTER='古紙/-. AI 活用/MASTER/master_checkpoint.json', LC_DIR='古紙/LC/_READ';
/* v0.16 (E-6): Microsoft トークン = tools/ms_token.mjs (OS ごと 1 か所) · g = Graph (マスターに書くので write) · d = COMPASS */
function tok(k){ return msToken(k==='g'?'write':'dv'); }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function req(url, k, o){ o=o||{};
  for(let i=0;i<6;i++){ const r=await fetch(url,{method:o.method||'GET', headers:Object.assign({Authorization:'Bearer '+tok(k)},o.headers||{}), body:o.body});
    if(r.status===404&&!o.method) return null;
    if(r.status===401){ delete TK[k]; continue; }
    if(r.status===429||r.status>=500){ await sleep(Math.min(30000,(+r.headers.get('Retry-After')||2**i)*1000)); continue; }
    if(o.raw) return r; if(!r.ok) throw new Error((k==='g'?'Graph ':'DV ')+r.status+' '+url.slice(0,100));
    return o.buf?Buffer.from(await r.arrayBuffer()):r.json(); }
  throw new Error('retry over '+url.slice(0,100)); }
const DVH={'OData-MaxVersion':'4.0','OData-Version':'4.0',Accept:'application/json',Prefer:'odata.maxpagesize=5000,odata.include-annotations="OData.Community.Display.V1.FormattedValue"'};
const dvGet=p=>req(DV+p,'d',{headers:DVH});
async function dvAll(p){ let d=await dvGet(p), out=(d.value||[]).slice(); while(d['@odata.nextLink']){ d=await req(d['@odata.nextLink'],'d',{headers:DVH}); out=out.concat(d.value||[]); } return out; }
const spEnc=p=>p.split('/').map(encodeURIComponent).join('/');
const spUrl=p=>G+'drives/'+DRIVE+'/root:/'+spEnc(p);
async function spKids(p){ let url=spUrl(p)+':/children?$select=id,name,folder,file,size,lastModifiedDateTime&$top=999', out=[];
  while(url){ const j=await req(url,'g'); if(!j) return null; out=out.concat(j.value||[]); url=j['@odata.nextLink']||null; } return out; }
async function mapLimit(arr,n,fn){ let i=0; await Promise.all(Array.from({length:Math.min(n,arr.length)},async()=>{ while(i<arr.length){ const k=i++; await fn(arr[k],k); } })); }
const FV=(o,k)=>(o&&o[k+'@OData.Community.Display.V1.FormattedValue'])||'';
const keyOf=iv=>String(iv).replace(/[^A-Za-z0-9_\-]/g,'_');

/* ── 集める (読むだけ) — acl_bench acl-app · 書類ツール aclFetchCompass と同じ質問 ── */
async function readPdf(buf){
  const require=createRequire(import.meta.url), T=path.join(REPO,'tests/acl_bench/node_modules/');
  const pdfjs=require(T+'pdfjs-dist/legacy/build/pdf.js'); const task=pdfjs.getDocument({data:new Uint8Array(buf), standardFontDataUrl:T+'pdfjs-dist/standard_fonts/', cMapUrl:T+'pdfjs-dist/cmaps/', cMapPacked:true, verbosity:0}); let pdf=null;
  try{ pdf=await task.promise; const pages=[]; for(let i=1;i<=pdf.numPages;i++){ const pg=await pdf.getPage(i), vp=pg.getViewport({scale:1}), tc=await pg.getTextContent();
      pages.push({page:i, w:vp.width, items:tc.items.filter(it=>it.str&&it.str.trim()).map(it=>({s:it.str, x:Math.round(it.transform[4]*10)/10, y:Math.round(it.transform[5]*10)/10, w:Math.round((it.width||0)*10)/10}))}); }
    return pages; } finally { try{ await (pdf||task).destroy(); }catch(e){} } }
async function fetchCompass(inv){
  if(!/^[A-Za-z0-9_\-]+$/.test(inv)) return {ok:false, reason:'Invoice 番号の形が違う'};
  const bk=await dvAll(`cr49f_bookings?$filter=cr49f_invoice_no eq '${inv}'&$select=cr49f_bookingid,cr49f_booking_no,cr49f_bl_number,cr49f_main_ship_name,cr49f_invoice_no,crcf9_delivery_location,_cr49f_sale_contract_id_value,_cr49f_region_japan_id_value,_cr49f_region_id_value,_cr49f_carrier_id_value,_cr49f_fowarder_id_value,modifiedon,cr49f_etd,crcf9_bl_etd`);
  if(!bk.length) return {ok:false, reason:'COMPASS に Invoice '+inv+' のブッキングなし'};
  const b=bk[0]; let pol='', pod='';
  if(b._cr49f_region_japan_id_value){ try{ pol=(await dvGet(`crcf9_region_japans(${b._cr49f_region_japan_id_value})?$select=crcf9_pol`)).crcf9_pol||''; }catch(e){} }
  if(b._cr49f_region_id_value){ try{ pod=(await dvGet(`cr49f_regions(${b._cr49f_region_id_value})?$select=cr49f_pod`)).cr49f_pod||''; }catch(e){} }
  const containers=await dvAll(`crcf9_container_informations?$filter=_crcf9_booking_id_value eq ${b.cr49f_bookingid}&$select=crcf9_container_informationid,crcf9_container_no,crcf9_seal_no,crcf9_type,crcf9_quantity,crcf9_n_w,crcf9_g_w,crcf9_t_w,_crcf9_sale_detail_id_value`);
  let sis=[]; const details={}; const cid=b._cr49f_sale_contract_id_value;
  if(cid){ sis=await dvAll(`cr49f_s_is?$filter=_cr49f_sale_contract_id_value eq ${cid}&$select=cr49f_s_iid,crcf9_sino,cr49f_lc_no,crcf9_consignee,crcf9_notify_party,crcf9_address,crcf9_tel,crcf9_fax,crcf9_place_of_delivery_1,crcf9_place_of_delivery_2,crcf9_place_of_delivery_3,crcf9_pod_bl1,crcf9_pod_bl2,crcf9_pod_bl3,crcf9_bl_text1,crcf9_bl_text2,crcf9_shipper,crcf9_shipper_address,crcf9_shipper_tel,crcf9_shipper_fax,crcf9_shipping_mark,crcf9_local_agent_note,crcf9_payment_classification&$orderby=crcf9_sino asc`);
    for(const s of sis) details[s.cr49f_s_iid]=await dvAll(`crcf9_s_i_details?$filter=_crcf9_s_i_id_value eq ${s.cr49f_s_iid}&$select=crcf9_productname,_crcf9_sale_detail_id_value,crcf9_hs_code,modifiedon`); }
  const meta={carrier:FV(b,'_cr49f_carrier_id_value'), forwarder:FV(b,'_cr49f_fowarder_id_value'), contract:'', buyer:'', buyerCode:'', country:'', pay:''};
  if(cid){ try{ const sc=await dvGet(`cr49f_sale_contracts(${cid})?$select=cr49f_sale_contract_no,cr49f_pay_cls,_cr49f_buyer_id_value`); meta.contract=sc.cr49f_sale_contract_no||''; meta.pay=FV(sc,'cr49f_pay_cls')||sc.cr49f_pay_cls||'';
      if(sc._cr49f_buyer_id_value){ const by=await dvGet(`cr49f_buyers(${sc._cr49f_buyer_id_value})?$select=cr49f_buyer,cr49f_buyer_code,crcf9_country`); meta.buyer=by.cr49f_buyer||FV(sc,'_cr49f_buyer_id_value'); meta.buyerCode=by.cr49f_buyer_code||''; meta.country=FV(by,'crcf9_country')||by.crcf9_country||''; } }catch(e){ meta.error=String(e.message||e); } }
  const s1=ACL.pickBlSi(sis); if(!meta.pay&&s1) meta.pay=FV(s1,'crcf9_payment_classification')||s1.crcf9_payment_classification||'';
  meta.etd=String(b.crcf9_bl_etd||b.cr49f_etd||'').slice(0,10); meta.etdSrc=b.crcf9_bl_etd?'B/L date':b.cr49f_etd?'ETD':'';
  return {ok:true, booking:b, bookings:bk.length, pol, pod, containers, sis, details, meta};
}
async function collect(){
  fs.mkdirSync(path.join(CACHE,'pdf'),{recursive:true}); fs.mkdirSync(path.join(CACHE,'cp'),{recursive:true}); fs.mkdirSync(path.join(CACHE,'lc'),{recursive:true});
  const t0=Date.now(), dirs=ACL.SRC_DIRS.map(d=>d.replace(/\/$/,'')), roots=[];
  ((await spKids(dirs[0]))||[]).filter(x=>x.folder).forEach(x=>roots.push({invoice:x.name.trim(), path:dirs[0]+'/'+x.name}));
  for(const y of ((await spKids(dirs[1]))||[]).filter(x=>x.folder&&/^\d{4}$/.test(x.name))) ((await spKids(dirs[1]+'/'+y.name))||[]).filter(x=>x.folder).forEach(x=>roots.push({invoice:x.name.trim(), path:dirs[1]+'/'+y.name+'/'+x.name}));
  await mapLimit(roots,6,async f=>{ try{ f.files=((await spKids(f.path))||[]).filter(x=>x.file).map(x=>({id:x.id, name:x.name, size:x.size, lastModifiedDateTime:x.lastModifiedDateTime})); }catch(e){ f.files=[]; f.error=e.message; } });
  const g=ACL.groupTargets(roots); console.log('フォルダ',roots.length,'· 対象',g.targets.length);
  let k=0; await mapLimit(g.targets,4,async t=>{ try{ const pages=await readPdf(await req(G+'drives/'+DRIVE+'/items/'+t.file.id+'/content','g',{buf:true})); fs.writeFileSync(path.join(CACHE,'pdf',keyOf(t.invoice)+'.json'),JSON.stringify(pages)); const c=ACL.classifyFormat(pages); t.format=c.format; }
    catch(e){ t.format='ERROR'; t.why=e.message; } if(++k%100===0) console.log('PDF',k,'/',g.targets.length); });
  k=0; await mapLimit(g.targets.filter(t=>t.format==='NACCS'),3,async t=>{ try{ fs.writeFileSync(path.join(CACHE,'cp',keyOf(t.invoice)+'.json'),JSON.stringify(await fetchCompass(t.invoice))); }catch(e){ t.cpErr=e.message; } if(++k%100===0) console.log('COMPASS',k); });
  for(const x of ((await spKids(LC_DIR))||[]).filter(x=>x.file&&/\.json$/i.test(x.name)&&!/^_/.test(x.name))) fs.writeFileSync(path.join(CACHE,'lc',x.name),await req(spUrl(LC_DIR+'/'+x.name)+':/content','g',{buf:true}));
  let rules=null; try{ const j=await req(spUrl('古紙/-. AI 活用/MASTER/master_si_rule.json')+':/content','g'); rules=j&&j.items; }catch(e){}
  fs.writeFileSync(path.join(CACHE,'rules.json'),JSON.stringify(rules||[]));
  fs.writeFileSync(path.join(CACHE,'list.json'),JSON.stringify({targets:g.targets, at:new Date().toISOString(), ms:Date.now()-t0}));
  console.log('集め終わり',((Date.now()-t0)/1000).toFixed(0)+'s');
}

/* ── 実行 ── */
function loadRows(){
  const f=arg('file'); if(f){ const j=JSON.parse(fs.readFileSync(f,'utf8')); return Array.isArray(j)?j:Array.isArray(j.items)?j.items:[j]; }
  return null; }
(async()=>{
  if(flag('refresh')||!fs.existsSync(path.join(CACHE,'list.json'))) await collect();
  let doc=null, etag='', rows=loadRows();
  if(!rows){ const r=await req(spUrl(MASTER)+':/content','g',{raw:true}); if(!r.ok) throw new Error('マスターを読めない ('+r.status+')'); etag=r.headers.get('etag')||''; doc=await r.json(); rows=doc.items||[]; }
  const row=rows.find(x=>String(x.id||'').trim()===ID); if(!row) throw new Error(ID+' がない');
  const P=ACL.cpPrepare([Object.assign({},row,{status:'有効'})], [], {trustAll:true}); if(P.warnings.length) console.log('警告',P.warnings.join(' / '));
  const R=P.rows[0]; if(R.kind!=='追加') throw new Error(ID+' は 追加 ではない (基本 はエンジンの照合そのもの)'); if(R.stages.indexOf('ACL')<0) throw new Error(ID+' の段階に ACL がない (v1 は ACL だけ)');
  const list=JSON.parse(fs.readFileSync(path.join(CACHE,'list.json'),'utf8')), rules=JSON.parse(fs.readFileSync(path.join(CACHE,'rules.json'),'utf8'));
  const disp=ACL.dispRules(rules).rules, podEx=ACL.podExcludeRules(rules), rd=(sub,n)=>{ const f=path.join(CACHE,sub,n); return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):null; };
  const out=[], cnt={対象:0, 範囲外:0}, byS={};
  for(const t of list.targets.filter(t=>t.format==='NACCS')){
    const pages=rd('pdf',keyOf(t.invoice)+'.json'), cp=rd('cp',keyOf(t.invoice)+'.json'); if(!pages||!cp||!cp.ok) continue;
    const meta=cp.meta||{}; cp.lc=String(meta.pay||'').toUpperCase()==='LC'&&meta.contract?rd('lc',meta.contract+'.json'):null;   // L/C = 保管所だけ
    const c=ACL.compareOne(ACL.readNaccs(pages), cp, {rules:disp, meta, podExclude:podEx, checkpoints:P});
    const it=c.items.find(i=>i.key==='cp:'+ID); if(!it){ cnt.範囲外++; continue; } cnt.対象++;
    byS[it.status]=(byS[it.status]||0)+1;
    out.push({invoice:t.invoice, contract:meta.contract||'', buyer:meta.buyerCode||meta.buyer||'', country:meta.country||'', status:it.status, word:{MATCH:'一致',DIFF:'相違',NOTATION:'注意',READ_CHECK:'読取確認',INFO:'参考'}[it.status]||it.status, expected:it.expected, actual:it.actual, detail:it.detail});
  }
  const hit=out.filter(o=>o.status!=='MATCH'&&o.status!=='INFO');
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"', stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15);
  const csv='﻿'+['invoice,contract,buyer,country,result,expected,actual,detail'].concat(out.sort((a,b)=>(a.status===b.status?a.invoice.localeCompare(b.invoice):a.status==='DIFF'?-1:b.status==='DIFF'?1:a.status.localeCompare(b.status))).map(o=>[o.invoice,o.contract,o.buyer,o.country,o.word,o.expected,o.actual,o.detail].map(q).join(','))).join('\r\n');
  const od=arg('out')||CACHE; fs.mkdirSync(od,{recursive:true}); const cf=path.join(od,'trial_'+ID+'_'+stamp+'.csv'); fs.writeFileSync(cf,csv);
  const NM={MATCH:'一致',DIFF:'相違',NOTATION:'注意',READ_CHECK:'読取確認',INFO:'参考'};
  const line=new Date(Date.now()+9*3600e3).toISOString().slice(0,10)+' ACL '+list.targets.filter(t=>t.format==='NACCS').length+' 中 '+cnt.対象+' 件 ('+Object.keys(byS).sort().map(s=>NM[s]+' '+byS[s]).join(' · ')+')';
  console.log(JSON.stringify({id:ID, title:R.title, line, 範囲外:cnt.範囲外, csv:cf, hit:hit.length},null,1));
  if(flag('write')){ if(!doc) throw new Error('--file のときは --write できない');
    const i=doc.items.findIndex(x=>String(x.id||'').trim()===ID); doc.items[i]=Object.assign({},doc.items[i],{trial:line});
    const at=new Date(Date.now()+9*3600e3).toISOString().slice(0,19)+'+09:00', by='cp_trial (토르)';
    doc.updated_at=at; doc.updated_by=by; doc.history=[{at, by, summary:ID+' 試験結果: '+line}].concat(doc.history||[]).slice(0,50);
    const r=await req(spUrl(MASTER)+':/content','g',{method:'PUT', raw:true, headers:Object.assign({'Content-Type':'application/json'},etag?{'If-Match':etag}:{}), body:JSON.stringify(doc,null,2)});
    if(r.status===412) throw new Error('他の人がマスターを保存した — 書かない (もう一度実行)'); if(!r.ok) throw new Error('マスターに書けない ('+r.status+')');
    console.log('マスターの 試験結果 に書いた: '+line); }
})().catch(e=>{ console.error('エラー',e.message); process.exit(1); });
