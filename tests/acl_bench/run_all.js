/* acl_bench 시험 전부 — node run_all.js [html]   (필요: node 18+ · 이 폴더에서 npm install — jsdom 30.1.2 · pdf-lib 1.17.1 · pdfjs-dist 3.11.174) */
const cp=require('child_process'),path=require('path'),fs=require('fs');
const html=path.resolve(process.argv[2]||path.join(__dirname,'../../acl_bench.html'));
const ver=(fs.readFileSync(html,'utf8').match(/version:'(\d+\.\d+)'/)||[])[1]||'?';
const rows=[]; let bad=0;
function node(label, file, args, pat){
  const r=cp.spawnSync(process.execPath,[path.join(__dirname,file)].concat(args),{encoding:'utf8',cwd:__dirname,maxBuffer:1<<26});
  const out=(r.stdout||'')+(r.stderr||''), m=out.match(pat), ok=r.status===0;
  if(!ok){ bad++; console.log(out.split('\n').filter(l=>/FAIL|Error/.test(l)).join('\n')); }
  rows.push([ok?'PASS':'FAIL',label,m?m[0]:'']);
}
node('기본 점검 (문법 · 버전 '+ver+' 1곳 · 공통 파일 1회 · confirm/alert 0 · 보안 grep 0 · 푸터)','check.js',[html,ver],/\{.*\}/);
node('단위 (대상 모으기 · 좌표 셀 · 형식 · D-03 기대 문면 · 문면 비교 · 세트 비교 · 가짜 PDF 읽기 · 저장 문지기 · CSV · summary)','unit.js',[html],/unit pass \d+ fail \d+/);
node('통합 jsdom (ACL 一覧 · 13건 照合 · 차이 종류 · 결과 표 · 保存 · 경로 문지기 · COMPASS 는 GET 만)','e2e.js',[html],/e2e pass \d+ fail \d+/);
/* 가짜 데이터: 시험 파일 GUID 는 모두 00000000-0000-4000-8000-… · 실제 ACL (리나이 F6 · 토르가 읽은 실례) 의 값이 시험 파일 · 도구에 없음 */
{ const files=['fixtures.js','unit.js','e2e.js','fake_naccs.js','pdfread.js'], txt=files.map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n');
  const guids=txt.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)||[], realG=guids.filter(g=>!/^00000000-0000-4000-8000-/.test(g));
  const REAL=['TXGU'+'7339000','HLC'+'1609303','HLXU'+'8376721','HAMU'+'1382263','SAIGON'+' PAPER','3640ILU'+'8001657','3500'+'813231','IRENES'+' SOUTHERN','33291'+'368','N010-'+'2026','MY '+'XUAN','OLS'+'@','KAMI'+'YA','03627'+'89408','68448'+'17551'];
  const all=txt+'\n'+fs.readFileSync(html,'utf8'), hits=REAL.filter(s=>all.indexOf(s)>=0);
  if(realG.length||hits.length) bad++;
  rows.push([realG.length||hits.length?'FAIL':'PASS','가짜 데이터 — GUID 가짜 모양 · 실제 ACL 값 0건 (시험 파일 + acl_bench.html)',`GUID ${guids.length}개 · 가짜 아닌 것 ${realG.length} · 실제 값 ${hits.length}`]); }
rows.forEach(r=>console.log(r[0]+'  '+r[1]+'  — '+r[2]));
console.log(bad?`\n❌ FAIL ${bad} 항목`:`\n✅ ALL PASS (${rows.length} 항목)`); process.exitCode=bad?1:0;
