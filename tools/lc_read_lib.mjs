/* L/C 保管所 (lc_read/1) — 共通部品 (Node 18+ · 外部パッケージなし)
   指示書: (2026-11-23)THOR_指示書_D00_LC보관소_ACL전환_v1_0 Step 1 · 형님 D1 (L/C は 1 回きちんと読んで契約ごとに保管) · D3 (本文タグ優先 · 47A は情報) · D4 (ベトナム Notify = Applicant の表記)
   規則の出どころ (2 か所に書かない):
     - A1 判読の 2 回一致 · 引用の原文確認 · 日付 · 47A 番号 = ../a1_bench.html <script id="a1-core"> (A1C.normQuote · swiftDate · clauseKey47A) をそのまま読み込む
     - 積地 ANY · 揚地の分け方 · 原本通数 · Consignee 銀行 · Notify=Applicant = ../acl_bench.html <script id="acl-core"> (ACL.LC_RULE · lcPodSplit · lcOriginalsText · lcConsigneeBank · lcNotifyIsApplicant)
   AI は呼ばない (A1 R2 の 2 回判読の結果を コードで整理するだけ) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 'lc_read/1';
export const FOOTER = '✦ Powered by LEENAI Automation System';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..');

function scriptOf(html, id){ const m=fs.readFileSync(html,'utf8').match(new RegExp('<script id="'+id+'">([\\s\\S]*?)<\\/script>')); if(!m) throw new Error(id+' がない: '+html); return m[1]; }
export function loadA1(html){ return new Function(scriptOf(html||path.join(REPO,'a1_bench.html'),'a1-core')+';return A1C;')(); }
export function loadAcl(html){ return new Function('module',scriptOf(html||path.join(REPO,'acl_bench.html'),'acl-core')+';return ACL;')(undefined); }

/* R2 の項目 (a1_bench R2_ITEMS と同じ順) */
export const ITEMS = ['lc_no','issue_date','expiry','latest_shipment','port_loading','port_discharge','tolerance','payment_term','applicant_name','applicant_address',
  'beneficiary','bl_consignee','bl_notify','po','hs','price_term','port_45A','included_costs'];
const DATE_FIELDS = {issue_date:1, latest_shipment:1, expiry:1};

/* lc_text/{契約}.txt = 判読構造 (view) + 「====…」 + 0 復元後の原文 (rawRestored) — a1_bench a1-app の保存形 */
export function splitLcText(txt){
  const t=String(txt||'').replace(/^\uFEFF/,''), i=t.search(/\n={20,}\n/);
  if(i<0) return {view:t, raw:''};
  return {view:t.slice(0,i), raw:t.slice(t.indexOf('\n',i+1)+1)};
}
/* 原文の中のファイル (=== name === · Amend は 「(AMENDn)」) · view の Amend 記録 (AMENDn :30: info 日付) */
export function sourcesOf(view, raw, A1){
  const base=[], am={};
  String(raw||'').split('\n').forEach(l=>{ const m=l.match(/^===\s+(.+?)\s+===\s*$/); if(!m) return; const a=m[1].match(/^(.*?)\s+\(AMEND(\d+)\)$/); if(a) am[a[2]]={no:+a[2], file:a[1], date:null}; else base.push(m[1]); });
  String(view||'').split('\n').forEach(l=>{ const m=l.match(/^\s*AMEND(\d+)\s+:30:\s*info\s+(.+)$/); if(m){ const d=A1.swiftDate(m[2]); (am[m[1]]=am[m[1]]||{no:+m[1], file:null, date:null}).date=d||m[2].trim(); } });
  return {lc_pdf:base, amends:Object.values(am).sort((a,b)=>a.no-b.no)};
}
/* view の 1 タグ (「:32B: 名前 = 値」) — 判読構造から直接 (AI ではない) */
export function viewTag(view, tag){ const re=new RegExp('^:'+tag+':\\s*([^=\\n]*?)\\s*=\\s*(.*)$','m'), m=String(view||'').match(re); return m?{label:m[1].trim(), value:m[2].trim(), line:m[0]}:null; }

function parseTolerance(text){
  const t=String(text||'').toUpperCase();
  if(!t.trim()) return {pct:null, check:null};
  if(/\bABOUT\b|\bAPPROX/.test(t)) return {pct:null, check:'過不足が 「ABOUT」 等 — 原文のまま (数値にしない)'};
  let m=t.match(/\+\s*\/\s*-\s*(\d+(?:\.\d+)?)/)||t.match(/-\s*\/\s*\+\s*(\d+(?:\.\d+)?)/); if(m) return {pct:+m[1], check:null};
  m=t.match(/(\d+(?:\.\d+)?)\s*(?:%|PCT|PERCENT)?\s*MORE\b.*?(?:(\d+(?:\.\d+)?)\s*(?:%|PCT|PERCENT)?\s*)?LESS\b/);
  if(m){ const a=+m[1], b=m[2]!=null?+m[2]:a; return a===b?{pct:a, check:null}:{pct:null, check:'過不足の上下が違う: +'+a+' / -'+b}; }
  m=t.match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/); if(m) return +m[1]===+m[2]?{pct:+m[1], check:null}:{pct:null, check:'過不足の上下が違う: '+m[1]+' / '+m[2]};
  return {pct:null, check:'過不足を数値にできない (原文のまま): '+text};
}
const FREIGHT_RE=/FREIGHT\s+(PREPAID|COLLECT)/i;
/* 日付 → YYYY-MM-DD: A1C.swiftDate (MMM DD, YYYY · YYMMDD · DD/MM/YYYY · YYYY-MM-DD) + タグ値の YYMMDD が語に続く形 (「260327BENEFICIARY …」 · MT710 の 31D) · YY-MM-DD */
export function dateOf(A1, s){ const t=String(s||'').toUpperCase(); let m=t.match(/^\s*(\d{2})(\d{2})(\d{2})(?!\d)/)||t.match(/^\s*(\d{2})-(\d{2})-(\d{2})(?!\d)/);
  if(m&&+m[2]>=1&&+m[2]<=12&&+m[3]>=1&&+m[3]<=31) return '20'+m[1]+'-'+m[2]+'-'+m[3]; return A1.swiftDate(t)||''; }

/* 1 契約 — r2 = {no, image, retried, extract:[read1, read2], checks} · lcText = lc_text/{契約}.txt の中身 */
export function buildRecord(r2, lcText, ctx){
  const {A1, ACL, run, now} = ctx;
  const {view, raw} = splitLcText(lcText), src = sourcesOf(view, raw, A1), image = !!r2.image;
  const rawN = A1.normQuote(raw);
  /* 引用の確認 = A1C.normQuote (空白 · 改行 · HEX→# · 頁表示) で L/C 原文にあるか。原文の 「--- Page n ---」 行は normQuote が消すので、引用の中に混ざった頁表示も消して比べる */
  const PAGE_IN=/-{2,}\s*Page\s+\d+\s*-{2,}/gi;
  const qOk = q => image ? 'image' : (q!=null && String(q).trim() && rawN.indexOf(A1.normQuote(String(q).replace(PAGE_IN,' ')))>=0 ? 'ok' : 'ng');
  const ck = {}; (r2.checks||[]).forEach(c=>{ ck[c.item]=c; });
  const [e1, e2] = [r2.extract&&r2.extract[0]||{}, r2.extract&&r2.extract[1]||{}];
  const fields = {}, checks = [];
  const put = (k, f) => { fields[k]=f; if(f.check) checks.push({field:k, reason:f.check}); return f; };
  ITEMS.forEach(k => {
    const x=e1[k]||{}, y=e2[k]||{}, c=ck[k]||{}, v1=x.value==null?null:String(x.value), v2=y.value==null?null:String(y.value);
    if(v1==null && v2==null) return put(k,{value:null, loc:null, quote:null, agree:true, quote_check:null, check:null, note:x.note||y.note||null});
    const agree = c.read==='一致';
    const q1=v1==null?'none':qOk(x.quote), q2=v2==null?'none':qOk(y.quote);
    const use = (q1==='ok'||q1==='image')?x:(q2==='ok'?y:x), useQ = use===x?q1:q2;
    const f = {value:use.value==null?null:String(use.value), loc:use.loc||null, quote:use.quote==null?null:String(use.quote), agree, agree_basis:c.read_basis||null, quote_check:useQ, check:null, note:use.note||null};
    if(!agree){ f.value=null; f.check='2回判読が違う: '+(v1==null?'(なし)':v1)+' | '+(v2==null?'(なし)':v2); }
    else if(useQ==='ng'){ f.value=null; f.check='引用が L/C 原文にない: '+(use.quote==null?'(引用なし)':use.quote); }
    else if(DATE_FIELDS[k]){ const d=dateOf(A1,f.value); if(d) f.date=d; else f.check='日付を YYYY-MM-DD にできない: '+f.value; }
    put(k, f);
  });
  const V = k => fields[k]&&!fields[k].check ? fields[k].value : null;
  const D = k => fields[k]&&!fields[k].check ? (fields[k].date||null) : null;

  /* 46A 書類 · 47A · 45A 品目 — 1 回目の判読の並び · 2 回の一致は A1 の照合 (docs[i] · 47A-n · goods[i].*) */
  const docs = (e1.docs||[]).map((d,i)=>{ const c=ck['docs['+i+']']||{}, q=qOk(d.quote); const o={doc_type:d.doc_type||null, originals:d.originals==null?null:String(d.originals), copies:d.copies==null?null:String(d.copies), set_fraction:d.set_fraction||null, alt_group:d.alt_group||null, loc:d.loc||null, quote:d.quote||null, agree:c.read==='一致', quote_check:q};
    o.check=!o.agree?'2回判読が違う (46A 書類 '+(i+1)+')':q==='ng'?'引用が L/C 原文にない (46A 書類 '+(i+1)+')':null; return o; });
  const c47 = (e1.conditions_47A||[]).map((c,i)=>{ const key=A1.clauseKey47A(c.no,i), k=Object.keys(ck).find(x=>x===key||x.indexOf(key+'#')===0), cc=ck[k]||{}, q=qOk(c.quote);
    return {no:c.no||null, quote:c.quote||null, agree:cc.read==='一致', quote_check:q, check:cc.read!=='一致'?'2回判読が違う ('+(c.no||key)+')':q==='ng'?'引用が L/C 原文にない ('+(c.no||key)+')':null}; });
  const goods = (e1.goods||[]).map((g,i)=>{ const cs=['grade','quantity','unit_price','amount'].map(f=>ck['goods['+i+'].'+f]).filter(Boolean), ag=cs.every(c=>c.read==='一致'||c.read==='—'), q=qOk(g.quote);
    return {grade:g.grade==null?null:String(g.grade), quantity:g.quantity==null?null:String(g.quantity), unit_price:g.unit_price==null?null:String(g.unit_price), amount:g.amount==null?null:String(g.amount), loc:g.loc||null, quote:g.quote||null, agree:ag, quote_check:q,
      check:!ag?'2回判読が違う (45A 品目 '+(i+1)+')':q==='ng'?'引用が L/C 原文にない (45A 品目 '+(i+1)+')':null}; });
  docs.forEach((d,i)=>{ if(d.check) checks.push({field:'docs_46A['+i+']', reason:d.check}); });
  c47.forEach((c,i)=>{ if(c.check) checks.push({field:'conditions_47A['+i+']', reason:c.check}); });
  goods.forEach((g,i)=>{ if(g.check) checks.push({field:'goods['+i+']', reason:g.check}); });

  /* 原本通数 (エンジン lcOriginalsText と同じ規則) — 46A の文 + B/L Consignee 指示 · 2 回の判読それぞれで出し、違えば 確認要 */
  const origOf = e => ACL.lcOriginalsText([].concat(e.docs||[]).map(d=>String(d.quote||'')).join(' ')+' '+String((e.bl_consignee||{}).quote||(e.bl_consignee||{}).value||''));
  const o1=origOf(e1), o2=origOf(e2);
  put('bl_originals', o1===o2 ? {value:o1, loc:'46A', quote:null, agree:true, derived:'docs_46A + bl_consignee (ACL.lcOriginalsText)', check:null}
                              : {value:null, loc:'46A', quote:null, agree:false, derived:'docs_46A + bl_consignee (ACL.lcOriginalsText)', check:'2回判読で原本通数が違う: '+o1+' | '+o2});
  /* Consignee 銀行 · Notify 会社名 (エンジンの規則) — 2 回の判読 それぞれ から出して比べる (原文の切り出し方 「MADE OUT TO …」 / 「TO …」 だけ違うときは 照合に使う値は同じ)
     元の欄の引用が原文にない判読があれば 確認要 · 出した値が違えば 確認要 (どちらも選ばない) */
  const consText=V('bl_consignee'), notifyText=V('bl_notify'), appName=V('applicant_name');
  const rv=(e,k)=>e[k]&&e[k].value!=null?String(e[k].value):null, rq=(e,k)=>rv(e,k)==null?'none':qOk(e[k].quote);
  const derive=(name, keys, fn, how)=>{ const a=fn(e1), b=fn(e2), ng=keys.find(k=>rq(e1,k)==='ng'||rq(e2,k)==='ng'), sa=JSON.stringify(a), sb=JSON.stringify(b);
    return put(name, ng?{value:null, derived:how, agree:sa===sb, check:'引用が L/C 原文にない ('+ng+')'}:sa!==sb?{value:null, derived:how, agree:false, check:'2回判読で違う: '+sa+' | '+sb}:{value:a, derived:how, agree:true, check:null}); };
  derive('bl_consignee_bank',['bl_consignee'],e=>{ const t=rv(e,'bl_consignee'); return t?ACL.lcConsigneeBank(t):null; },'bl_consignee → ACL.lcConsigneeBank (2 回の判読それぞれ)');
  derive('bl_notify_name',['bl_notify','applicant_name'],e=>{ const n=rv(e,'bl_notify'), a=rv(e,'applicant_name')||''; if(!n) return null; const ia=ACL.lcNotifyIsApplicant(n,a); return {is_applicant:ia, words:ACL.lcNameWords(ia?a:n)}; },'bl_notify (+ applicant_name) → ACL.lcNotifyIsApplicant · lcNameWords (2 回の判読それぞれ)');
  const nn=fields.bl_notify_name.value, nia=nn?nn.is_applicant:null;
  /* 支払 (D3) — :42C · :42P の原文だけ (47A の支払の話は conditions_47A のまま = 情報) */
  const pf=fields.payment_term||{}; let tenor=null, tag=null;
  const lt=String(pf.loc||'').match(/(?:^|[\s:])(42[CP])\b/i);
  if(!pf.check && pf.value && lt){ tenor=pf.value; tag=':'+lt[1].toUpperCase(); }
  else { const t=viewTag(view,'42C')||viewTag(view,'42P'); if(t){ tenor=t.value; tag=/:42P:/.test(t.line)?':42P':':42C'; } }
  const tol=parseTolerance(V('tolerance'));
  if(tol.check && !(fields.tolerance&&fields.tolerance.check)){ fields.tolerance.check_pct=tol.check; checks.push({field:'tolerance.pct', reason:tol.check}); }
  const exp=V('expiry'), expPlace=exp?String(exp).replace(/\b[A-Z]{3}[A-Z]*\.?\s+\d{1,2}(?:ST|ND|RD|TH)?\s*,?\s*\d{4}\b|^\s*\d{6}(?!\d)|^\s*\d{2}-\d{2}-\d{2}(?!\d)|\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/i,' ').replace(/^[\s,.:;]+|[\s,.:;]+$/g,'').replace(/\s+/g,' ').trim()||null:null;
  const amt=viewTag(view,'32B'), am=amt&&amt.value.match(/^([A-Z]{3})\s*([\d,]+(?:\.\d+)?)/);
  /* FREIGHT (情報) — 2 回の判読それぞれの B/L Consignee 指示 + B/L 書類の文から · 同じときだけ */
  const frOf=e=>{ const d=(e.docs||[]).find(x=>/B\/L|BILL/i.test(String(x.doc_type||''))), m=(String(rv(e,'bl_consignee')||'')+' '+String(d&&d.quote||'')).match(FREIGHT_RE); return m?m[1].toUpperCase():null; }, fr1=frOf(e1), frt=fr1===frOf(e2)&&fr1?[null,fr1]:null;
  const polT=V('port_loading'), podT=V('port_discharge');
  return {
    schema:SCHEMA, contract:r2.no, version:1, created_at:now,
    source:{run, reads:2, image, retried:r2.retried||[false,false], lc_pdf:src.lc_pdf, lc_text:'lc_text/'+r2.no+'.txt', amends:src.amends},
    lc_no:V('lc_no'), issue_date:D('issue_date'), expiry_date:D('expiry'), expiry_place:expPlace, latest_shipment:D('latest_shipment'),
    amount:amt?{text:amt.value, currency:am?am[1]:null, number:am?+am[2].replace(/,/g,''):null, from:'view :32B'}:null,
    pol:{text:polT, any_japan:polT?ACL.LC_RULE.ANY_POL.test(polT):null}, pod:{text:podT, list:podT?ACL.lcPodSplit(podT):[]},
    tolerance:{text:V('tolerance'), pct:tol.pct},
    payment:{tenor_text:tenor, source_tag:tag, read_text:V('payment_term'), read_loc:pf.loc||null},
    price_term:V('price_term'), included_costs:V('included_costs'),
    applicant:{name:appName, address:V('applicant_address')}, beneficiary:V('beneficiary'),
    bl:{consignee_text:consText, consignee_bank:fields.bl_consignee_bank.value, notify_text:notifyText, notify_is_applicant:nia, notify_name_words:nn?nn.words:null, originals:fields.bl_originals.value, freight:frt?frt[1].toUpperCase():null},
    po:V('po'), hs:V('hs'), port_45A:V('port_45A'), image,
    goods, docs_46A:docs, conditions_47A:c47, fields, checks
  };
}

/* 判の管理 — 同じ内容 (created_at · version を除く) なら 判 そのまま · 違えば 前の判を _old/{契約}_v{n}.json へ · version + 1 */
export function sameContent(a,b){ const s=o=>JSON.stringify(Object.assign({},o,{created_at:null, version:null})); return s(a)===s(b); }

/* MD (人が読む判) */
export function renderMd(r){
  const f=r.fields||{}, v=x=>x==null||x===''?'—':String(x), esc=s=>v(s).replace(/\|/g,'\\|').replace(/\n/g,' ');
  const amends=(r.source.amends||[]).map(a=>'AMEND'+a.no+(a.date?' ('+a.date+')':'')).join(' · ')||'なし';
  const qty=(r.goods||[]).map(g=>[g.grade,g.quantity].filter(Boolean).join(' ')).filter(Boolean).join(' / ');
  const L=[
    '# L/C 判読 — '+r.contract+' (v'+r.version+')','',
    '> 保管所 '+r.schema+' · 作成 '+r.created_at+' · A1 R2 の 2 回判読 ('+r.source.run+') をコードで整理'+(r.image?' · **イメージ L/C (原文の引用確認なし)**':''),'',
    '| 項目 | 値 |','|---|---|',
    '| 契約 | '+esc(r.contract)+' |',
    '| L/C 番号 | '+esc(r.lc_no)+' |',
    '| 発行日 | '+esc(r.issue_date)+' |',
    '| **船積期限 (44C)** | **'+esc(r.latest_shipment)+'** |',
    '| **有効期限 (31D)** | **'+esc(r.expiry_date)+'**'+(r.expiry_place?' · '+esc(r.expiry_place):'')+' |',
    '| 金額 (32B) | '+esc(r.amount&&r.amount.text)+' |',
    '| 数量 (45A) | '+esc(qty)+' |',
    '| 過不足 (39A) | '+esc(r.tolerance.text)+(r.tolerance.pct!=null?' → '+r.tolerance.pct+'%':'')+' |',
    '| 支払 ('+v(r.payment.source_tag)+') | '+esc(r.payment.tenor_text)+' |',
    '| 価格条件 | '+esc(r.price_term)+' |',
    '| 積地 (44E) | '+esc(r.pol.text)+(r.pol.any_japan?' (日本のどの港でも)':'')+' |',
    '| 揚地 (44F) | '+esc(r.pod.text)+(r.pod.list.length>1?' → '+r.pod.list.map(esc).join(' / '):'')+' |',
    '| Consignee (46A) | '+esc(r.bl.consignee_text)+(r.bl.consignee_bank?' → 銀行 **'+esc(r.bl.consignee_bank)+'**':'')+' |',
    '| Notify (46A) | '+esc(r.bl.notify_text)+(r.bl.notify_is_applicant?' (= Applicant)':'')+' |',
    '| Applicant (50) | '+esc(r.applicant.name)+' · '+esc(r.applicant.address)+' |',
    '| B/L 原本通数 | '+esc(r.bl.originals)+(r.bl.freight?' · FREIGHT '+r.bl.freight:'')+' |',
    '| Amend | '+esc(amends)+' |',
    '','## 46A 書類','','| # | 種類 | 原本 | 写し | 原文 |','|---|---|---|---|---|'];
  (r.docs_46A||[]).forEach((d,i)=>L.push('| '+(i+1)+' | '+esc(d.doc_type)+' | '+esc(d.originals||d.set_fraction)+' | '+esc(d.copies)+' | '+esc(d.quote)+(d.check?' ⚠️':'')+' |'));
  L.push('','## 47A 追加条件','','| 番号 | 原文 |','|---|---|');
  (r.conditions_47A||[]).forEach(c=>L.push('| '+esc(c.no)+' | '+esc(c.quote)+(c.check?' ⚠️':'')+' |'));
  L.push('','## 確認が必要 ('+(r.checks||[]).length+')','');
  if(!(r.checks||[]).length) L.push('なし (全部の欄で 2 回の判読が一致し、引用が原文にある)');
  (r.checks||[]).forEach(c=>L.push('- `'+c.field+'` — '+c.reason));
  L.push('','---',FOOTER,'');
  return L.join('\n');
}
export function indexRow(r){ return {contract:r.contract, lc_no:r.lc_no, version:r.version, created_at:r.created_at, checks:(r.checks||[]).length, image:!!r.image, amends:(r.source.amends||[]).length}; }
