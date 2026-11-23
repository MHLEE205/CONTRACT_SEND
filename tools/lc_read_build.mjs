/* L/C 保管所 v1 を作る — A1 R2 判読 (r2_lc_extract.json · lc_text/) → 契約ごとに {契約}.json (lc_read/1) + {契約}.md + _index.json
   node tools/lc_read_build.mjs --extract <r2_lc_extract.json> --lctext <lc_text dir> --run <A1 run id> --out <出力 dir> [--prev <今の保管所の写し dir>] [--lctext-sp <SharePoint の lc_text の場所>]
   - AI は呼ばない · ネットワークなし (SharePoint への置き方は 呼ぶ側で · 書く先は 古紙/LC/_READ/ だけ)
   - --prev に同じ契約の判があって内容が違えば: 前の判を <out>/_old/{契約}_v{n}.json · 新しい判の version = n + 1 (同じなら判そのまま)
   指示書: (2026-11-23)THOR_指示書_D00_LC보관소_ACL전환_v1_0 Step 1 */
import fs from 'node:fs';
import path from 'node:path';
import { loadA1, loadAcl, buildRecord, renderMd, indexRow, sameContent, FOOTER } from './lc_read_lib.mjs';

const arg = k => { const i=process.argv.indexOf('--'+k); return i>0?process.argv[i+1]:null; };
const EX=arg('extract'), LT=arg('lctext'), RUN=arg('run')||'', OUT=arg('out'), PREV=arg('prev');
if(!EX||!LT||!OUT){ console.error('使い方: --extract <r2_lc_extract.json> --lctext <dir> --run <id> --out <dir> [--prev <dir>]'); process.exit(2); }
const A1=loadA1(arg('a1')), ACL=loadAcl(arg('engine')), now=new Date().toISOString();
const list=JSON.parse(fs.readFileSync(EX,'utf8'));
fs.mkdirSync(OUT,{recursive:true});
const idx=[], stat={contracts:0, checks:0, byField:{}, quoteNg:0, disagree:0, dateNg:0, image:0, moved:0, kept:0, noText:[]};
for(const r2 of list){
  const tf=path.join(LT, r2.no+'.txt');
  if(!fs.existsSync(tf)){ stat.noText.push(r2.no); continue; }
  let rec=buildRecord(r2, fs.readFileSync(tf,'utf8'), {A1, ACL, run:RUN, now});
  rec.source.lc_text=(arg('lctext-sp')||'古紙/-. AI 活用/D-00/A1_bench/'+RUN+'/lc_text')+'/'+r2.no+'.txt';   // 判読原文 (A1 run の保存場所)
  const pf=PREV&&path.join(PREV, r2.no+'.json');
  if(pf&&fs.existsSync(pf)){ const old=JSON.parse(fs.readFileSync(pf,'utf8'));
    if(sameContent(old,rec)){ rec=old; stat.kept++; }
    else { fs.mkdirSync(path.join(OUT,'_old'),{recursive:true}); fs.writeFileSync(path.join(OUT,'_old',r2.no+'_v'+old.version+'.json'), JSON.stringify(old,null,1)); rec.version=(+old.version||1)+1; stat.moved++; } }
  fs.writeFileSync(path.join(OUT, r2.no+'.json'), JSON.stringify(rec,null,1));
  fs.writeFileSync(path.join(OUT, r2.no+'.md'), renderMd(rec));
  idx.push(indexRow(rec)); stat.contracts++; if(rec.image) stat.image++;
  rec.checks.forEach(c=>{ const k=c.field.replace(/\[\d+\]/,'[]'); stat.byField[k]=(stat.byField[k]||0)+1; stat.checks++;
    if(/^引用が/.test(c.reason)) stat.quoteNg++; else if(/^2回判読/.test(c.reason)) stat.disagree++; else if(/^日付/.test(c.reason)) stat.dateNg++; });
}
idx.sort((a,b)=>a.contract.localeCompare(b.contract));
fs.writeFileSync(path.join(OUT,'_index.json'), JSON.stringify({schema:'lc_read_index/1', created_at:now, source_run:RUN, contracts:idx.length, items:idx, footer:FOOTER},null,1));
console.log(JSON.stringify(stat,null,1));
