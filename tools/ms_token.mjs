/* Microsoft トークン (Graph · COMPASS) を OS ごとに読む — 1 か所 (v0.16 · 指示書 THOR_11 E-6)
   Mac     = ~/thor_work/venv/bin/python + ~/thor_work/d00_acl_survey/ms.py (今まで)
   Windows = 会社 PC の ~/thor_work/bl_supp/tok.py (MSAL キャッシュ · graph / dv / write)
   環境変数で場所を変えられる: MS_PY (python) · MS_DIR (Mac ms.py のフォルダ) · MS_TOK (Windows tok.py の場所)
   トークンの値は 画面 · ファイル · エラーに出さない (このプロセスのメモリだけ · 40 分で取り直し) */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const MS_CONF = {
  mac:{py:process.env.MS_PY||path.join(os.homedir(),'thor_work/venv/bin/python'), dir:process.env.MS_DIR||path.join(os.homedir(),'thor_work/d00_acl_survey')},
  win:{py:process.env.MS_PY||'python', tok:process.env.MS_TOK||path.join(os.homedir(),'thor_work','bl_supp','tok.py')}
};
/* kind = 'graph' (読む) · 'write' (SharePoint に書く) · 'dv' (COMPASS) */
export function msTokenPlan(kind, platform){
  const k=kind==='dv'?'dv':kind==='write'?'write':'graph', win=(platform||process.platform)==='win32';
  if(win){ const c=MS_CONF.win; return {os:'win', file:c.tok, cmd:c.py, args:['-W','ignore',c.tok,k], cwd:path.dirname(c.tok)}; }
  const c=MS_CONF.mac, attr=k==='dv'?'ms.DV':'ms.GRAPH';
  return {os:'mac', file:path.join(c.dir,'ms.py'), cmd:c.py, args:['-W','ignore','-c','import ms,sys;sys.stdout.write(ms._tok('+attr+'))'], cwd:c.dir};
}
const TK={};
export function msToken(kind){
  const p=msTokenPlan(kind), key=p.args.join(' '), t=TK[key];
  if(t&&Date.now()-t.at<40*60e3) return t.v;
  if(!fs.existsSync(p.file)) throw new Error('Microsoft トークンを読めません — '+p.file+' がない ('+(p.os==='win'?'MS_TOK':'MS_DIR')+' で場所を指定)');
  let v='';
  try{ v=execFileSync(p.cmd,p.args,{cwd:p.cwd,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(); }catch(e){ throw new Error('Microsoft トークンを読めません ('+p.os+' · '+path.basename(p.file)+' が失敗 — ログインし直してください)'); }
  if(!v) throw new Error('Microsoft トークンが空です ('+p.os+' · ログインし直してください)');
  TK[key]={v,at:Date.now()}; return v;
}
