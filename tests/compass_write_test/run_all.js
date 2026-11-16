/* compass_write_test 시험 전부 — node run_all.js [html]  (tests/a1_bench/run_all.js 와 별도) */
const cp=require('child_process'),path=require('path'),fs=require('fs');
const html=path.resolve(process.argv[2]||path.join(__dirname,'../../compass_write_test.html'));
const ver=(fs.readFileSync(html,'utf8').match(/version:'(\d+\.\d+)'/)||[])[1]||'?';
const rows=[]; let bad=0;
function node(label, file, args, pat){
  const r=cp.spawnSync(process.execPath,[path.join(__dirname,file)].concat(args),{encoding:'utf8',cwd:__dirname});
  const out=(r.stdout||'')+(r.stderr||''), m=out.match(pat), ok=r.status===0;
  if(!ok){ bad++; console.log(out.split('\n').filter(l=>/FAIL|Error/.test(l)).join('\n')); }
  rows.push([ok?'PASS':'FAIL',label,m?m[0]:'']);
}
node('기본 점검 (문법 · 버전 '+ver+' 1곳 · 공통 파일 1회 · confirm/alert 0 · 보안 grep 0 · 푸터)','check.js',[html,ver],/\{.*\}/);
node('단위 (칸 분류 · 문지기 · 비교 · 확인 ① · 감지 · summary)','unit.js',[html],/unit pass \d+ fail \d+/);
node('통합 jsdom (허용 밖 · 다른 엔터티 · 시작 확인 멈춤 · 정상 흐름 · 실패→되돌리기만 · 취소 · 저장 경로)','e2e.js',[html],/e2e pass \d+ fail \d+/);
/* 가짜 데이터 확인 — 시험 파일의 GUID 는 모두 00000000-0000-4000-8000-… 모양 */
const guids=['fixtures.js','unit.js','e2e.js'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)||[];
const real=guids.filter(g=>!/^00000000-0000-4000-8000-/.test(g)); if(real.length) bad++;
rows.push([real.length?'FAIL':'PASS','가짜 데이터 — 시험 파일 GUID 가 모두 가짜 모양',`GUID ${guids.length}개 · 가짜 아닌 것 ${real.length}`]);
rows.forEach(r=>console.log(r[0]+'  '+r[1]+'  — '+r[2]));
console.log(bad?`\n❌ FAIL ${bad} 항목`:`\n✅ ALL PASS (${rows.length} 항목)`); process.exitCode=bad?1:0;
