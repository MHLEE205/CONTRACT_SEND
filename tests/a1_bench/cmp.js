/* 두 버전의 bench 산출물을 문자 단위로 비교 — node cmp.js <old.json> <new.json> [all|r1r0]
   all  : 산출물 전부 + R0 (스위치 끈 v0.7 R2 = v0.6 R2 확인용)
   r1r0 : results.csv 의 R1 행 + R0 만 (스위치 켠 v0.7 에서도 R1 · R0 불변 확인용)
   맞추는 것: 실행 ID · 시각 · 소요 시간 · 버전 표기 · v0.7 에서 생긴 master_check 열 / r2Master 설정 키 (값이 없거나 false 일 때) */
const fs=require('fs');
const [,,fa,fb,modeArg]=process.argv, mode=modeArg||'all';
const [a,b]=[fa,fb].map(f=>JSON.parse(fs.readFileSync(f,'utf8')));
const norm=s=>String(s).replace(/A1_\d{8}-\d{6}_(?:pilot|full)/g,'RUNID').replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g,'TS')
  .replace(/"(ms|_ms)": ?\d+/g,'"$1":0').replace(/,\d+\r?$/gm,',MS').replace(/v0\.\d\b/g,'vX').replace(/"version": ?"0\.\d"/g,'"version":"X"').replace(/\d+초/g,'N초').replace(/\| \d+ms/g,'| ms')
  .replace(/,\s*"r2Master": ?false/g,'');
/* CSV: master_check 열이 모두 빈 값이면 열을 뺀다 (값이 있으면 그대로 두어 차이로 드러나게) */
/* CSV 를 레코드로 (따옴표 안 줄바꿈 포함) */
function parseCsv(text){
  const out=[]; let row=[], cur='', q=false; const t=String(text).replace(/^﻿/,'');
  for(let i=0;i<t.length;i++){ const c=t[i];
    if(q){ if(c==='"'&&t[i+1]==='"'){cur+='"';i++;} else if(c==='"') q=false; else cur+=c; }
    else if(c==='"') q=true; else if(c===','){ row.push(cur); cur=''; } else if(c==='\r'&&t[i+1]==='\n'){ row.push(cur); out.push(row); row=[]; cur=''; i++; } else cur+=c; }
  row.push(cur); out.push(row); return out;
}
const toCsv=rows=>rows.map(r=>r.map(v=>/[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v).join(',')).join('\r\n');
/* rowFilter 로 고른 행에서 master_check 가 모두 비면 그 열을 뺀다 */
function csvDrop(text, rowFilter){
  const rows=parseCsv(text), h=rows[0], body=rows.slice(1).filter(r=>!rowFilter||rowFilter(r,h)), i=h.indexOf('master_check');
  if(i>=0 && !body.some(r=>r[i])){ h.splice(i,1); body.forEach(r=>r.splice(i,1)); }
  return toCsv([h].concat(body));
}
const prep=f=>norm(/\.csv$/.test(f.file)?csvDrop(f.text):f.text);
let same=0,diff=0;
const show=(n,x,y)=>{ if(x===y){ same++; console.log('SAME',n,x.length); return; } diff++; let i=0; while(x[i]===y[i]) i++; console.log('DIFF',n,'@',i,'\n  old:',JSON.stringify(x.slice(Math.max(0,i-80),i+120)),'\n  new:',JSON.stringify(y.slice(Math.max(0,i-80),i+120))); };
if(mode==='all'){
  // v0.8: progress.json (이어서 실행용 형식) · partial/ (계약별 중간 저장) 은 실행 도중 기록이라 비교하지 않음
  const skip=f=>f==='progress.json'||/^partial\//.test(f);
  const names=[...new Set(a.bench.map(x=>x.file).concat(b.bench.map(x=>x.file)))].filter(n=>!skip(n));
  const sk=[...new Set(a.bench.concat(b.bench).map(x=>x.file).filter(skip))]; if(sk.length) console.log('SKIP',sk.join(' '));
  names.forEach(n=>show(n,a.bench.filter(f=>f.file===n).map(prep).join('\n#\n'),b.bench.filter(f=>f.file===n).map(prep).join('\n#\n')));
}else{
  const r1=o=>csvDrop(o.bench.find(f=>f.file==='results.csv').text,(r,h)=>r[h.indexOf('round')]==='R1');
  const x=r1(a), y=r1(b); console.log('R1 rows',parseCsv(x).length-1,parseCsv(y).length-1); show('results.csv R1 rows',norm(x),norm(y));
}
show('R0 rec (rows '+a.r0.rows.length+')',norm(JSON.stringify(a.r0)),norm(JSON.stringify(b.r0)));
console.log(`\ncmp ${mode}: same ${same} · diff ${diff}`); process.exitCode=diff?1:0;
