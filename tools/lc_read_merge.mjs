/* L/C 保管所 — 前の判 (O) と Amend 込みで読み直した判 (N) を 「Amend 칸만 교체」 で合わせる (AI なし · lc_read 1.1)
   node tools/lc_read_merge.mjs <契約番号> --old <O の版番号> [--out <dir>] [--put]
     O = 古紙/LC/_READ/_old/{契約}_v{n}.json · N = 古紙/LC/_READ/{契約}.json (今の判) · Amend 原文 = 古紙/LC/_READ/_text/{契約}.txt
     --put  合わせた判を 古紙/LC/_READ/ に置く (N は _old/{契約}_v{N の版}.json へ · version = N + 1)。付けなければ 手元 (--out) だけ
   規則は tools/lc_read_lib.mjs mergeRecords (lc_read_one --put と同じ) — Amend が変えた欄 = N · O が空欄 = N · そのほか = O
   指示書: (2026-11-23)MAC-THOR_6_指示書_D00_LC合わせ_スキャンACL Step 1 (C1 · C3) */
import fs from 'node:fs';
import path from 'node:path';
import { loadA1, loadAcl, mergeRecords, renderMd, LC_READ_VER } from './lc_read_lib.mjs';
import { spGet, putRecord } from './lc_read_one.mjs';

const READ_DIR='古紙/LC/_READ';
async function main(){
  const args=process.argv.slice(2), contract=args.find(a=>!a.startsWith('--')&&/^[A-Z]{2,4}-\d{4}[A-Z0-9]{1,4}$/.test(a)), arg=k=>{ const i=args.indexOf('--'+k); return i>=0?args[i+1]:null; };
  const oldV=arg('old');
  if(!contract||!/^\d+$/.test(String(oldV||''))){ console.error('使い方: node tools/lc_read_merge.mjs <契約番号> --old <版番号> [--out dir] [--put]'); process.exit(2); }
  const js=b=>b?JSON.parse(b.toString('utf8')):null;
  const O=js(await spGet(READ_DIR+'/_old/'+contract+'_v'+oldV+'.json')), N=js(await spGet(READ_DIR+'/'+contract+'.json')), tb=await spGet(READ_DIR+'/_text/'+contract+'.txt');
  if(!O||!N||!tb) throw new Error(contract+': O (_old v'+oldV+') · N · _text のどれかがない');
  if(+N.version<=+O.version) throw new Error(contract+': N (v'+N.version+') が O (v'+O.version+') より新しくない');
  const now=new Date().toISOString(), rec=mergeRecords(O, N, tb.toString('utf8'), {A1:loadA1(), ACL:loadAcl(), now});
  const out=arg('out')||'lc_read_out'; fs.mkdirSync(out,{recursive:true});
  let fin=rec; if(args.includes('--put')) fin=await putRecord(contract, rec, null, N);
  fs.writeFileSync(path.join(out,contract+'.json'), JSON.stringify(fin,null,1)); fs.writeFileSync(path.join(out,contract+'.md'), renderMd(fin));
  console.log(JSON.stringify({contract, lc_read:LC_READ_VER, old:+O.version, new:+N.version, version:fin.version, put:args.includes('--put'), targets:fin.merge&&fin.merge.targets, amend:fin.merge?fin.merge.amend.length:0, fill:fin.merge?fin.merge.fill.length:0, deleted:fin.merge?fin.merge.deleted.length:0, checks:fin.checks.length}));
}
main().catch(e=>{ console.error('ERROR', e.message); process.exit(1); });
