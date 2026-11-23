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
  /* C3 — Amend の 「ALL OTHER TERMS … REMAIN UNCHANGED」 だけの文は 47A 条件にしない (Amend の記録 amend_history にだけ) */
  const hist = c47.filter(c=>isUnchangedOnly(c.quote)).map(c=>({tag:'47A', no:c.no, quote:c.quote, why:'UNCHANGED のみ (47A 条件にしない)'}));
  const c47k = c47.filter(c=>!isUnchangedOnly(c.quote));

  /* 原本通数 (エンジン lcOriginalsText と同じ規則) — 46A の文 + B/L Consignee 指示 · 2 回の判読それぞれで出し、違えば 確認要 */
  const origOf = e => ACL.lcOriginalsText([].concat(e.docs||[]).map(d=>String(d.quote||'')).join(' ')+' '+String((e.bl_consignee||{}).quote||(e.bl_consignee||{}).value||''));
  const o1=origOf(e1), o2=origOf(e2);
  put('bl_originals', o1===o2 ? {value:o1, loc:'46A', quote:null, agree:true, derived:'docs_46A + bl_consignee (ACL.lcOriginalsText)', check:null}
                              : {value:null, loc:'46A', quote:null, agree:false, derived:'docs_46A + bl_consignee (ACL.lcOriginalsText)', check:'2回判読で原本通数が違う: '+o1+' | '+o2});
  /* Consignee 銀行 · Notify 会社名 (エンジンの規則) — 2 回の判読 それぞれ から出して比べる (原文の切り出し方 「MADE OUT TO …」 / 「TO …」 だけ違うときは 照合に使う値は同じ)
     元の欄の引用が原文にない判読があれば 確認要 · 出した値が違えば 確認要 (どちらも選ばない) */
  const rv=(e,k)=>e[k]&&e[k].value!=null?String(e[k].value):null, rq=(e,k)=>rv(e,k)==null?'none':qOk(e[k].quote);
  const derive=(name, keys, fn, how)=>{ const a=fn(e1), b=fn(e2), ng=keys.find(k=>rq(e1,k)==='ng'||rq(e2,k)==='ng'), sa=JSON.stringify(a), sb=JSON.stringify(b);
    return put(name, ng?{value:null, derived:how, agree:sa===sb, check:'引用が L/C 原文にない ('+ng+')'}:sa!==sb?{value:null, derived:how, agree:false, check:'2回判読で違う: '+sa+' | '+sb}:{value:a, derived:how, agree:true, check:null}); };
  derive('bl_consignee_bank',['bl_consignee'],e=>{ const t=rv(e,'bl_consignee'); return t?ACL.lcConsigneeBank(t):null; },'bl_consignee → ACL.lcConsigneeBank (2 回の判読それぞれ)');
  derive('bl_notify_name',['bl_notify','applicant_name'],e=>{ const n=rv(e,'bl_notify'), a=rv(e,'applicant_name')||''; if(!n) return null; const ia=ACL.lcNotifyIsApplicant(n,a); return {is_applicant:ia, words:ACL.lcNameWords(ia?a:n)}; },'bl_notify (+ applicant_name) → ACL.lcNotifyIsApplicant · lcNameWords (2 回の判読それぞれ)');
  /* FREIGHT (情報) — 2 回の判読それぞれの B/L Consignee 指示 + B/L 書類の文から · 同じときだけ */
  const frOf=e=>{ const d=(e.docs||[]).find(x=>/B\/L|BILL/i.test(String(x.doc_type||''))), m=(String(rv(e,'bl_consignee')||'')+' '+String(d&&d.quote||'')).match(FREIGHT_RE); return m?m[1].toUpperCase():null; }, fr1=frOf(e1), freight=fr1===frOf(e2)&&fr1?fr1:null;
  return assembleRecord({contract:r2.no, version:1, created_at:now, source:{run, reads:2, image, retried:r2.retried||[false,false], lc_pdf:src.lc_pdf, lc_text:'lc_text/'+r2.no+'.txt', amends:src.amends},
    view, image, fields, docs, c47:c47k, goods, freight, amend_history:hist}, ACL);
}

/* C3 — 「ALL OTHER TERMS (AND CONDITIONS) (OF THE CREDIT) REMAIN(S) UNCHANGED」 だけ (前後の 「/ADD/」 「.」 「BEST REGARDS …」 は除く) */
const UNCHANGED_RE=/ALL\s+OTHER\s+TERMS(?:\s+AND\s+CONDITIONS)?(?:\s+OF\s+THE\s+(?:L\/C|LC|CREDIT))?\s+REMAINS?\s+UNCHANGED\.?/gi;
export function stripUnchanged(t){ return String(t||'').toUpperCase().replace(/\b(?:BEST\s+)?REGARDS\b[\s\S]*$/,' ').replace(UNCHANGED_RE,' ').replace(/\/(?:ADD|DELETE|REPALL)\//g,' ').replace(/[\s.,:;\-]+/g,' ').trim(); }
export function isUnchangedOnly(q){ const t=String(q||''); UNCHANGED_RE.lastIndex=0; return UNCHANGED_RE.test(t) && !stripUnchanged(t); }

/* 判の組み立て — 欄 (fields) · 46A · 47A · 45A から 上の段 (lc_no · bl · payment …) と checks を作る。buildRecord と 合わせ (mergeRecords) の 両方が使う (規則は 1 か所) */
export function assembleRecord(p, ACL){
  const {view, image, fields, docs, c47, goods, freight} = p;
  const checks = [];
  const V = k => fields[k]&&!fields[k].check ? fields[k].value : null;
  const D = k => fields[k]&&!fields[k].check ? (fields[k].date||null) : null;
  ITEMS.forEach(k=>{ if(fields[k]&&fields[k].check) checks.push({field:k, reason:fields[k].check}); });
  docs.forEach((d,i)=>{ if(d.check) checks.push({field:'docs_46A['+i+']', reason:d.check}); });
  c47.forEach((c,i)=>{ if(c.check) checks.push({field:'conditions_47A['+i+']', reason:c.check}); });
  goods.forEach((g,i)=>{ if(g.check) checks.push({field:'goods['+i+']', reason:g.check}); });
  ['bl_originals','bl_consignee_bank','bl_notify_name'].forEach(k=>{ if(fields[k]&&fields[k].check) checks.push({field:k, reason:fields[k].check}); });
  const consText=V('bl_consignee'), notifyText=V('bl_notify'), appName=V('applicant_name');
  const nn=fields.bl_notify_name&&fields.bl_notify_name.value, nia=nn?nn.is_applicant:null;
  /* 支払 (D3) — :42C · :42P の原文だけ (47A の支払の話は conditions_47A のまま = 情報) */
  const pf=fields.payment_term||{}; let tenor=null, tag=null;
  const lt=String(pf.loc||'').match(/(?:^|[\s:])(42[CP])\b/i);
  if(!pf.check && pf.value && lt){ tenor=pf.value; tag=':'+lt[1].toUpperCase(); }
  else { const t=viewTag(view,'42C')||viewTag(view,'42P'); if(t){ tenor=t.value; tag=/:42P:/.test(t.line)?':42P':':42C'; } }
  const tol=parseTolerance(V('tolerance'));
  if(fields.tolerance) delete fields.tolerance.check_pct;
  if(tol.check && !(fields.tolerance&&fields.tolerance.check)){ fields.tolerance.check_pct=tol.check; checks.push({field:'tolerance.pct', reason:tol.check}); }
  const exp=V('expiry'), expPlace=exp?String(exp).replace(/\b[A-Z]{3}[A-Z]*\.?\s+\d{1,2}(?:ST|ND|RD|TH)?\s*,?\s*\d{4}\b|^\s*\d{6}(?!\d)|^\s*\d{2}-\d{2}-\d{2}(?!\d)|\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/i,' ').replace(/^[\s,.:;]+|[\s,.:;]+$/g,'').replace(/\s+/g,' ').trim()||null:null;
  const amt=viewTag(view,'32B'), am=amt&&amt.value.match(/^([A-Z]{3})\s*([\d,]+(?:\.\d+)?)/);
  const polT=V('port_loading'), podT=V('port_discharge');
  const hist=p.amend_history||[];
  return Object.assign({
    schema:SCHEMA, contract:p.contract, version:p.version, created_at:p.created_at,
    source:p.source,
    lc_no:V('lc_no'), issue_date:D('issue_date'), expiry_date:D('expiry'), expiry_place:expPlace, latest_shipment:D('latest_shipment'),
    amount:amt?{text:amt.value, currency:am?am[1]:null, number:am?+am[2].replace(/,/g,''):null, from:'view :32B'}:null,
    pol:{text:polT, any_japan:polT?ACL.LC_RULE.ANY_POL.test(polT):null}, pod:{text:podT, list:podT?ACL.lcPodSplit(podT):[]},
    tolerance:{text:V('tolerance'), pct:tol.pct},
    payment:{tenor_text:tenor, source_tag:tag, read_text:V('payment_term'), read_loc:pf.loc||null},
    price_term:V('price_term'), included_costs:V('included_costs'),
    applicant:{name:appName, address:V('applicant_address')}, beneficiary:V('beneficiary'),
    bl:{consignee_text:consText, consignee_bank:fields.bl_consignee_bank.value, notify_text:notifyText, notify_is_applicant:nia, notify_name_words:nn?nn.words:null, originals:fields.bl_originals.value, freight:freight?String(freight).toUpperCase():null},
    po:V('po'), hs:V('hs'), port_45A:V('port_45A'), image,
    goods, docs_46A:docs, conditions_47A:c47, fields, checks
  }, hist.length?{amend_history:hist}:{}, p.merge?{merge:p.merge}:{});
}

/* 判の管理 — 同じ内容 (created_at · version を除く) なら 判 そのまま · 違えば 前の判を _old/{契約}_v{n}.json へ · version + 1 */
export function sameContent(a,b){ const s=o=>JSON.stringify(Object.assign({},o,{created_at:null, version:null})); return s(a)===s(b); }

/* ── Amend 칸만 교체 (C1 · 형님 D1) ── lc_read 1.1
   Amend が来て L/C を読み直したとき: Amend が変えた欄 = 新しい判読 (N) · 前の判 (O) が空欄 = N で埋める · そのほか = O のまま。
   Amend が変えた欄は Amend の原文 (lc_text の 「=== … (AMENDn) ===」 の部分) から コードで出す (AI ではない) — 토르_4 fielddiff.mjs の方法:
     MT707 のタグ (:46B → 46A · :47B → 47A · :45B → 45A · :32B · :44C · :31E → 31D · :59 · :50 …) + 文の 「FIELD 47A NO. 23」 「FIELD 46A POINT 1」 「DELETE 46A POINT 4」 「FIELD 45A LINE NO 3」 「FIELD 50」
     番号があれば その番号の欄だけ · 番号がなければ そのタグ全部。:47B: /ADD/ が 「ALL OTHER TERMS … UNCHANGED」 だけなら 47A は変えない (C3)。 */
export const LC_READ_VER = '1.1';
const AMEND_HEAD = new Set(['20','21','23','27','52A','31C','26E','30','22A','71N','79','72Z']);
const AMEND_MT707 = {'45B':'45A','46B':'46A','47B':'47A','32B':'32B','33B':'32B','34B':'32B','31E':'31D','44C':'44C','44D':'44C','39A':'39A','44E':'44E','44F':'44F','44A':'44A','44B':'44B','59':'59','50':'50','42C':'42C','43P':'43P','43T':'43T','48':'48','49':'49','71D':'71D'};
const TAG_B2A = {'45B':'45A','46B':'46A','47B':'47A','31E':'31D','33B':'32B','34B':'32B'};
/* 欄 → タグ (토르_4 fielddiff FIELDS と同じ) */
export const FIELD_TAG = {lc_no:'20', issue_date:'31C', expiry:'31D', latest_shipment:'44C', port_loading:'44E', port_discharge:'44F', tolerance:'39A', payment_term:'42C', applicant_name:'50', applicant_address:'50', beneficiary:'59',
  bl_consignee:'46A', bl_notify:'46A', po:'45A', hs:'45A', price_term:'45A', port_45A:'45A', included_costs:'45A'};
/* 出した欄 → 元の欄 (元が Amend なら 出した欄も N) */
const DERIVED_FROM = {bl_originals:['bl_consignee','#B/L'], bl_consignee_bank:['bl_consignee'], bl_notify_name:['bl_notify','applicant_name']};
const PAGE_MARK = /-{2,}\s*Page\s+\d+\s*-{2,}/gi;

/* Amend の原文 (n > since の Amend だけ) → {text, tags:{'46A':{nums:[1,2]}, '50':{nums:[]}}, ev:[…]} · nums が空 = そのタグ全部 */
export function amendTargets(lcText, since){
  const {raw} = splitLcText(lcText), lines = String(raw||'').split('\n'), secs = [];
  let cur = null;
  lines.forEach(l=>{ const m=l.match(/^===\s+(.+?)\s+===\s*$/); if(m){ const a=m[1].match(/\(AMEND(\d+)\)$/); cur=a&&+a[1]>(+since||0)?{no:+a[1], lines:[]}:null; if(cur) secs.push(cur); return; } if(cur) cur.lines.push(l); });
  const tags = {}, ev = [], skipped = [];
  const add = (t, n) => { const g=TAG_B2A[t]||t; (tags[g]=tags[g]||{nums:new Set()}); if(n!=null) tags[g].nums.add(+n); };
  for(const s of secs){
    const txt = s.lines.join('\n');
    /* MT707 のタグの塊 (次のタグ行 · TRAILER · 頁表示 まで) */
    let blk = null; const blocks = [];
    s.lines.forEach(l=>{ const m=l.match(/^[ A-Z'.,/()-]*:(\d{2}[A-Z]?)(?:\s|$)(.*)$/); if(m){ blk={tag:m[1], body:[m[2]]}; blocks.push(blk); return; } if(/^\s*(TRAILER\b|---\s*Page)/.test(l)){ blk=null; return; } if(blk) blk.body.push(l); });
    for(const b of blocks){ if(AMEND_HEAD.has(b.tag)||!AMEND_MT707[b.tag]) continue; const body=b.body.join('\n');
      if(!stripUnchanged(body)){ skipped.push({amend:s.no, tag:b.tag, text:body.replace(/\s+/g,' ').trim()}); ev.push('AMEND'+s.no+' :'+b.tag+': UNCHANGED のみ → '+AMEND_MT707[b.tag]+' は変えない (C3)'); continue; }
      add(AMEND_MT707[b.tag]); ev.push('AMEND'+s.no+' :'+b.tag+': → '+AMEND_MT707[b.tag]); }
    for(const m of txt.matchAll(/FIELD\s+(\d{2}[A-Z]?)\b([^\n]{0,30})((?:\n[^\n]*){0,1})/g)){
      const n=(m[2].match(/(?:NO\.?|POINT|LINE\s+NO\.?)\s*(\d+)/)||[])[1]||(/READ AS/.test(m[2])&&(m[3].match(/^\s*\n?\s*(\d+)\s*[).]/)||[])[1])||null;
      add(m[1], n); ev.push('AMEND'+s.no+' FIELD '+m[1]+(n?' 番号 '+n:' (番号なし)')); }
    for(const m of txt.matchAll(/DELETE\s+(?:FIELD\s+)?(\d{2}[A-Z])\s+(?:POINT|NO\.?|LINE\s+NO\.?)\s*(\d+)/g)){ add(m[1], m[2]); ev.push('AMEND'+s.no+' DELETE '+m[1]+' '+m[2]); }
  }
  const out = {}; Object.keys(tags).forEach(t=>{ out[t]={nums:[...tags[t].nums].sort((a,b)=>a-b)}; });
  return {amends:secs.map(s=>s.no), text:secs.map(s=>s.lines.join('\n')).join('\n'), tags:out, ev:[...new Set(ev)], skipped};
}

/* 欄 · 要素の タグ と 番号 (AI の loc / no の書き方から — 「46A-3」 「AMEND 1 :46B → 46A-1」 「47A-23 (MT701)」 「45A-3（AMEND …）」) */
function tagNum(s, deflt){ const t=String(s||''); let m=t.match(/(4[5-7][AB])\s*[-‐－]\s*(\d+)/); if(m) return {tag:TAG_B2A[m[1]]||m[1], num:+m[2]};
  m=t.match(/(4[5-7][AB])/); return {tag:m?(TAG_B2A[m[1]]||m[1]):deflt, num:null}; }
function elKey(e, kind){ if(kind==='c47'){ const k=tagNum(e.no,'47A'); if(k.num==null){ const q=String(e.quote||'').match(/^\s*(\d+)\s*[.)]/); if(q) k.num=+q[1]; } return k; }
  return tagNum(e.loc, kind==='docs'?'46A':'45A'); }
const blankV = v => v==null || v==='' || (Array.isArray(v)&&!v.length);
const clone = o => o==null?o:JSON.parse(JSON.stringify(o));

/* O = 前の判 · N = Amend 込みで読み直した判 · lcText = N の lc_text (Amend 原文入り) · opt.since = O が既に入れている Amend の番号 (既定 = O.source.amends の最大) */
export function mergeRecords(O, N, lcText, ctx, opt){
  const {A1, ACL, now} = ctx; opt = opt||{};
  const since = opt.since!=null ? opt.since : Math.max(0, ...((O.source&&O.source.amends)||[]).map(a=>+a.no||0));
  const T = amendTargets(lcText, since), amN = A1.normQuote(T.text);
  const inAm = x => { const q=x&&(x.quote!=null?x.quote:x.value); if(q==null||typeof q!=='string') return false; const n=A1.normQuote(String(q).replace(PAGE_MARK,' ')); return n.length>=4 && amN.indexOf(n)>=0; };
  const tgt = tag => T.tags[tag]||null;
  const log = {amend:[], fill:[], deleted:[], ignored_new:[]};

  /* 46A · 47A · 45A — 要素ごと */
  const nC47 = (N.conditions_47A||[]).filter(c=>!isUnchangedOnly(c.quote)), oC47 = (O.conditions_47A||[]).filter(c=>!isUnchangedOnly(c.quote));
  const SUB = {docs:['doc_type','originals','copies','set_fraction','alt_group'], c47:['quote'], goods:['grade','quantity','unit_price','amount']};
  const LBL = {docs:'docs_46A', c47:'conditions_47A', goods:'goods'};
  function mergeArr(Oa, Na, kind){
    Oa=clone(Oa||[]); Na=clone(Na||[]);
    const ok=Oa.map(e=>Object.assign({e},elKey(e,kind))), nk=Na.map(e=>Object.assign({e},elKey(e,kind)));
    const lbl = k => LBL[kind]+'['+k.tag+(k.num!=null?'-'+k.num:'')+']';
    if(!Oa.length){ Na.forEach(e=>{ e.from='fill'; }); if(Na.length) log.fill.push(LBL[kind]+' (前の判に要素なし → '+Na.length+')'); return Na; }
    /* N の置き換え組 — キー K = タグ (全部) / タグ-番号 */
    const repl = {}, order = [];
    const K = k => { const t=tgt(k.tag); if(!t) return null; if(!t.nums.length) return k.tag; return k.num!=null&&t.nums.includes(k.num)?k.tag+'-'+k.num:null; };
    nk.forEach(x=>{ let key=K(x); if(key==null){ const t=tgt(x.tag); if(t&&t.nums.length&&x.num==null&&inAm(x.e)) key=x.tag+'-?'; } if(key==null) return; (repl[key]=repl[key]||[]).push(x); if(order.indexOf(key)<0) order.push(key); });
    /* 番号つきの組は Amend 原文に引用があるものだけ (訂正前の文を一緒に読んだ判読を落とす) — 1 つもなければ 組 そのまま */
    Object.keys(repl).forEach(key=>{ if(!/-\d+$/.test(key)) return; const a=repl[key].filter(x=>inAm(x.e)); if(a.length) repl[key]=a; });
    /* 番号つき Amend の対象で N に無い番号 = 削除 (DELETE 46A POINT 4 など) */
    Object.keys(T.tags).forEach(tag=>T.tags[tag].nums.forEach(n=>{ const key=tag+'-'+n; if(!repl[key] && ok.some(x=>x.tag===tag&&x.num===n)){ repl[key]=[]; order.push(key); } }));
    const out = [], done = new Set();
    ok.forEach(x=>{ const key=K(x);
      if(key!=null && repl[key]){ if(!done.has(key)){ done.add(key); const g=repl[key]; if(!g.length) log.deleted.push(lbl(x)+' '+String(x.e.quote||'').slice(0,60));
          g.forEach(y=>{ y.e.from='amend'; out.push(y.e); log.amend.push(lbl(y)+' '+String(y.e.quote||'').slice(0,60)); }); } return; }
      const e=x.e; e.from='keep';
      /* 同じキーが O · N に 1 つずつ → O の空欄だけ N で埋める */
      if(x.num!=null){ const so=ok.filter(y=>y.tag===x.tag&&y.num===x.num), sn=nk.filter(y=>y.tag===x.tag&&y.num===x.num);
        if(so.length===1&&sn.length===1){ const filled=SUB[kind].filter(f=>blankV(e[f])&&!blankV(sn[0].e[f])); filled.forEach(f=>{ e[f]=sn[0].e[f]; }); if(filled.length){ e.filled=filled; log.fill.push(lbl(x)+' '+filled.join(',')); } } }
      out.push(e); });
    order.forEach(key=>{ if(done.has(key)) return; repl[key].forEach(y=>{ y.e.from='amend'; out.push(y.e); log.amend.push(lbl(y)+' (追加) '+String(y.e.quote||'').slice(0,60)); }); });
    nk.forEach(x=>{ if(K(x)==null && !(x.num==null&&tgt(x.tag)&&inAm(x.e)) && !ok.some(y=>y.tag===x.tag&&y.num===x.num&&x.num!=null)) log.ignored_new.push(lbl(x)+' '+String(x.e.quote||'').slice(0,60)); });
    return out;
  }
  const docs = mergeArr(O.docs_46A, N.docs_46A, 'docs'), c47 = mergeArr(oC47, nC47, 'c47'), goods = mergeArr(O.goods, N.goods, 'goods');

  /* 欄 */
  const fields = {}, from = {};
  ITEMS.forEach(k=>{ const o=clone(O.fields[k]), n=clone(N.fields[k]); if(!o&&!n) return; const tag=FIELD_TAG[k];
    let num=null; [o,n].forEach(f=>{ if(num==null&&f){ const x=tagNum(f.loc,null); if(x.tag===tag&&x.num!=null) num=x.num; } });
    const t=tgt(tag), am=!!t && n && (!t.nums.length || (num!=null ? t.nums.includes(num) : inAm(n)));
    let f, w;
    if(am){ f=n; w='amend'; } else if(!o || (blankV(o.value) && n && !blankV(n.value))){ f=n; w='fill'; } else { f=o; w='keep'; }
    f.from=w; fields[k]=f; from[k]=w; if(w!=='keep') log[w].push('fields.'+k+' = '+String(JSON.stringify(f.value)).slice(0,80)); });
  const blAm = docs.some(d=>d.from==='amend'&&/B\/L|BILL/i.test(String(d.doc_type||'')));
  Object.keys(DERIVED_FROM).forEach(k=>{ const o=clone(O.fields[k]), n=clone(N.fields[k]); if(!o&&!n) return;
    const am = DERIVED_FROM[k].some(s=>s==='#B/L'?blAm:from[s]==='amend');
    let f, w; if(am&&n){ f=n; w='amend'; } else if(!o || (blankV(o.value) && n && !blankV(n.value))){ f=n; w='fill'; } else { f=o; w='keep'; }
    f.from=w; fields[k]=f; from[k]=w; if(w!=='keep') log[w].push('fields.'+k+' = '+String(JSON.stringify(f.value)).slice(0,80)); });
  Object.keys(O.fields||{}).concat(Object.keys(N.fields||{})).forEach(k=>{ if(!fields[k]){ const f=clone(O.fields[k]||N.fields[k]); f.from=O.fields[k]?'keep':'fill'; fields[k]=f; } });

  const freight = (blAm||from.bl_consignee==='amend') ? (N.bl&&N.bl.freight) : ((O.bl&&O.bl.freight)||(N.bl&&N.bl.freight)||null);
  const hist = [].concat(O.amend_history||[], N.amend_history||[],
    (N.conditions_47A||[]).filter(c=>isUnchangedOnly(c.quote)).map(c=>({tag:'47A', no:c.no, quote:c.quote, why:'UNCHANGED のみ (47A 条件にしない)'})),
    T.skipped.map(s=>({tag:s.tag, amend:s.amend, quote:s.text, why:'UNCHANGED のみ (Amend のタグ · 欄は変えない)'})));
  const seen = new Set(), histU = hist.filter(h=>{ const k=JSON.stringify(h); if(seen.has(k)) return false; seen.add(k); return true; });
  const {view} = splitLcText(lcText);
  const source = Object.assign(clone(N.source), {run:'lc_read '+LC_READ_VER+' 合わせ (v'+O.version+' + v'+N.version+')'});
  const merge = {tool:'lc_read '+LC_READ_VER, at:now, old_version:O.version, new_version:N.version, old_run:O.source&&O.source.run, new_run:N.source&&N.source.run, since_amend:since, amends:T.amends,
    targets:Object.fromEntries(Object.entries(T.tags).map(([t,v])=>[t, v.nums.length?v.nums:'all'])), evidence:T.ev,
    amend:log.amend, fill:log.fill, deleted:log.deleted, ignored_new:log.ignored_new, fields:from};
  return assembleRecord({contract:N.contract, version:Math.max(+O.version||1, +N.version||1)+1, created_at:now, source, view, image:N.image, fields, docs, c47, goods, freight, amend_history:histU, merge}, ACL);
}

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
  if(r.merge){ const g=r.merge;
    L.push('','## Amend で変わった欄 (lc_read '+LC_READ_VER+' · v'+g.old_version+' + v'+g.new_version+' を合わせた判)','',
      '> Amend が変えた欄 = 新しい判読 · 前の判が空欄 = 新しい判読で埋める · そのほか = 前の判 (v'+g.old_version+') のまま','',
      '- 対象: '+(Object.entries(g.targets||{}).map(([t,v])=>t+(Array.isArray(v)?' '+v.join('/'):' 全部')).join(' · ')||'なし'));
    (g.amend||[]).forEach(x=>L.push('- Amend: '+esc(x)));
    (g.deleted||[]).forEach(x=>L.push('- 削除 (Amend): '+esc(x)));
    (g.fill||[]).forEach(x=>L.push('- 空欄を埋めた: '+esc(x))); }
  if((r.amend_history||[]).length){ L.push('','## Amend の記録 (条件にしない文)','');
    r.amend_history.forEach(h=>L.push('- '+esc(h.tag)+(h.no?' '+esc(h.no):'')+(h.amend?' AMEND'+h.amend:'')+' — '+esc(h.quote)+' ('+esc(h.why)+')')); }
  L.push('','## 確認が必要 ('+(r.checks||[]).length+')','');
  if(!(r.checks||[]).length) L.push('なし (全部の欄で 2 回の判読が一致し、引用が原文にある)');
  (r.checks||[]).forEach(c=>L.push('- `'+c.field+'` — '+c.reason));
  L.push('','---',FOOTER,'');
  return L.join('\n');
}
export function indexRow(r){ return {contract:r.contract, lc_no:r.lc_no, version:r.version, created_at:r.created_at, checks:(r.checks||[]).length, image:!!r.image, amends:(r.source.amends||[]).length}; }
