/* bl_bench 시험 전부 — node run_all.js [html]   (필요: node 18+ · 이 폴더에서 npm install — jsdom 30.1.2 · pdf-lib 1.17.1 · pdfjs-dist 3.11.174)
   mask_browser.js 는 playwright 가 있을 때만 (BL_PLAYWRIGHT=… · BL_CHANNEL=chrome) — 없으면 건너뜀 */
const cp=require('child_process'), path=require('path'), fs=require('fs');
const html=path.resolve(process.argv[2]||path.join(__dirname,'../../bl_bench.html'));
const rows=[]; let bad=0;
function node(label, file, pat){
  const r=cp.spawnSync(process.execPath,[path.join(__dirname,file),html],{encoding:'utf8',cwd:__dirname,maxBuffer:1<<26,env:Object.assign({},process.env,{BL_HTML:html})});
  const out=(r.stdout||'')+(r.stderr||''), m=out.match(pat), okk=r.status===0;
  if(!okk){ bad++; console.log(out.split('\n').filter(l=>/FAIL|Error/.test(l)).join('\n')); }
  rows.push([okk?'PASS':'FAIL',label,m?m[0]:'']);
}
node('기본 점검 (문법 · 버전 1곳 · 공통 1회 · confirm/alert 0 · 쓰기 0 · CDN 고정판 · 보안 0 · 실명 0 · 푸터)','check.js',/check pass \d+ fail \d+/);
node('단위 (이름 · 판 · B/L 쪽 · 판정 5가지 · R1~R11 · 다른 건 Draft · L/C 7항목 · 항구 별칭 · 판 사이 · 가리기 좌표 · 쪽 빼기)','unit.js',/unit pass \d+ fail \d+/);
node('통합 jsdom (가짜 COMPASS · SharePoint · L/C 보관소 → 照合 · 結果 · 확인 문구 · GET 만)','e2e.js',/e2e pass \d+ fail \d+/);
node('v0.2 (체크포인트 BL_DRAFT — 基本 CP 번호 · 停止 · CP-A01 을 Draft 에 · 끝 쉼표 · 試験 = 参考 · Draft 칸 · 화면 · 当社書類 쪽 · B/L 쪽 없음 · 마스터 없음 = v0.1)','v02.js',/v02 pass \d+ fail \d+/);
node('v0.4 (E-5 — Draft 의 別の契約番号 · 그 줄 글자 · 같은 번호 = v0.3 과 같음)','v04.js',/v04 pass \d+ fail \d+/);
node('한글 0 (bl_bench · acl_bench 화면에 나갈 수 있는 문자열 · v0.3)','hangul.js',/hangul pass \d+ fail \d+/);
node('가리기 브라우저 (Chrome · 글자 층 0 · 화소 · 쪽 빼기) — playwright 없으면 건너뜀','mask_browser.js',/mask_browser pass \d+ fail \d+|skip/);
rows.forEach(r=>console.log(r.join('  ')));
console.log(bad?'FAILED '+bad:'ALL PASS '+rows.length);
process.exit(bad?1:0);
