/* a1_bench 시험 전부 — node tests/a1_bench/run_all.js [--old <비교할 이전 버전 html>] [--skip-old]
   ① 문법 · 버전 · 공통 파일 · confirm/alert · 보안  ② 단위 v0.6 · v0.7  ③ 통합 (jsdom · mock — 네트워크 없음)
   ④ 이전 버전과 문자 단위 비교 (--old 없으면 git show 14f25d8:a1_bench.html = v0.6)
   필요: node 18 이상 · 이 폴더에서 npm install (jsdom 30.1.2 고정) */
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const here=__dirname, repo=path.join(here,'../..'), html=path.join(repo,'a1_bench.html');
const args=process.argv.slice(2), opt=k=>{ const i=args.indexOf(k); return i>=0?args[i+1]:null; };
const OLD_COMMIT='14f25d8', out=fs.mkdtempSync(path.join(os.tmpdir(),'a1_bench_tests_'));
const ver=(fs.readFileSync(html,'utf8').match(/version:'(\d+\.\d+)'/)||[])[1];
let fails=0; const results=[];
const node=(script,argv,label)=>{ try{ const s=cp.execFileSync(process.execPath,[path.join(here,script)].concat(argv),{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:1<<26}); results.push(['PASS',label,s.trim().split('\n').pop()]); return s; }
  catch(e){ fails++; results.push(['FAIL',label,String(e.stdout||'').split('\n').filter(l=>/FAIL|DIFF|Error/.test(l)).slice(0,8).join(' / ')+String(e.stderr||'').slice(0,300)]); return null; } };
const assert=(label,cond,info)=>{ if(cond) results.push(['PASS',label,'']); else { fails++; results.push(['FAIL',label,info===undefined?'':JSON.stringify(info).slice(0,300)]); } };
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));

// ①②
node('check.js',[html,ver],'① 문법 · 버전 '+ver+' · 보안');
node('unit_v06.js',[html],'② 단위 v0.6 (42)');
node('unit_v07.js',[html],'② 단위 v0.7');
// ③ 통합 — マスター草案 화면 · 저장 확인 상자
if(node('harness.js',[html,'integ',path.join(out,'integ.json')],'③ 하네스 integ')){
  const o=J(path.join(out,'integ.json'));
  assert('③ 표 줄 수 = 키 수',o.rows===o.keys&&o.keys>0,[o.rows,o.keys]);
  assert('③ 초안 만들기 통신 0회',o.masterCalls.dv===0&&o.masterCalls.graph===0&&o.masterCalls.claude===0,o.masterCalls);
  assert('③ 저장 취소 → 쓰기 0 · 저장 → 3파일',o.writesAfterCancel===0&&o.writesAfterSave.length===3,[o.writesAfterCancel,o.writesAfterSave.length]);
}
// ③ R2 마스터 사용 (켬 · 끔)
const r2on=path.join(out,'r2on.json'), r2off=path.join(out,'r2off.json');
if(node('harness.js',[html,'r2',r2on,'on'],'③ 하네스 r2 (마스터 켬)') && node('harness.js',[html,'r2',r2off,'off'],'③ 하네스 r2 (마스터 끔)')){
  const on=J(r2on), off=J(r2off), blk=t=>{ const i=t.indexOf('【バイヤー × 銀行 マスター'); return i<0?'':t.slice(i,t.indexOf('【関行',i)); };
  const by=(o,lc)=>o.assemblePrompts.filter(p=>p.lcNo===lc).map(p=>blk(p.txt));
  assert('③ 첫 거래(2603SG1) → 마스터 블록 없음',by(on,'ILC0001').every(b=>!b));
  assert('③ 2605SG1 확실 틀 #{APPLICANT_NAME}*** 이 ③ 프롬프트에',by(on,'ILC0003').every(b=>/crcf9_address テンプレ\(確実\): "#\{APPLICANT_NAME\}\*\*\*"/.test(b))&&by(on,'ILC0003').length===2);
  assert('③ 누설 금지 — 2604SG1 블록에 2604 · 2605 없음',by(on,'ILC0002').every(b=>b&&/契約 1 件: LRS-2603SG1\)/.test(b)&&b.indexOf('LRS-2605SG1')<0&&b.indexOf('ILC0003')<0));
  assert('③ 스위치 끔 → 마스터 블록 0',off.assemblePrompts.length===6&&off.assemblePrompts.every(p=>!blk(p.txt)));
  const csv=f=>f.bench.find(b=>b.file==='results.csv').text, mc=csv(on);
  assert('③ MASTER_SAME (틀에 맞는 address) · MASTER_DIFF · NO_MASTER',/MASTER_SAME/.test(mc)&&/MASTER_DIFF/.test(mc)&&/NO_MASTER/.test(mc));
  assert('③ 스위치 끔 → master_check 값 0',!/MASTER_(SAME|DIFF)|NO_MASTER/.test(csv(off)));
  const md=on.bench.find(b=>b.file==='summary.md').text;
  assert('③ summary §12 master_check 표 · MASTER_DIFF 목록',/### master_check/.test(md)&&/\*\*MASTER_DIFF 목록\*\*/.test(md));
  const rc=JSON.parse(on.bench.filter(b=>b.file==='run_config.json').pop().text), rcOff=JSON.parse(off.bench.filter(b=>b.file==='run_config.json').pop().text);
  assert('③ run_config 에 스위치 기록',rc.settings.r2Master===true&&rcOff.settings.r2Master===false);
  assert('③ 예상 비용 — 켬: 마스터 토큰 반영 · 끔: v0.6 과 같은 줄',/\+마스터 약 [\d,]+ 토큰\/회/.test(on.estHtml)&&!/마스터/.test(off.estHtml)&&on.est12.on.total>on.est12.off.total&&on.est12.tok>0,on.est12);
}
// ④ 이전 버전과 비교 (R1 · R0 불변 · 스위치 끈 R2 = 이전 R2)
if(args.indexOf('--skip-old')<0){
  let old=opt('--old');
  if(!old){ old=path.join(out,'a1_bench_'+OLD_COMMIT+'.html'); try{ fs.writeFileSync(old,cp.execFileSync('git',['show',OLD_COMMIT+':a1_bench.html'],{cwd:repo,maxBuffer:1<<26})); }catch(e){ old=null; fails++; results.push(['FAIL','④ 이전 버전 가져오기','git show '+OLD_COMMIT+' 실패 — --old <html> 로 지정']); } }
  if(old){
    const b0=path.join(out,'b_old.json'), bOff=path.join(out,'b_new_off.json'), bOn=path.join(out,'b_new_on.json');
    if(node('harness.js',[old,'bench',b0],'④ bench 이전 버전')&&node('harness.js',[html,'bench',bOff,'off'],'④ bench 새 버전 (마스터 끔)')&&node('harness.js',[html,'bench',bOn,'on'],'④ bench 새 버전 (마스터 켬)')){
      node('cmp.js',[b0,bOff,'all'],'④ 스위치 끔 = 이전 버전 (산출물 전부 + R0)');
      node('cmp.js',[b0,bOn,'r1r0'],'④ 스위치 켬 — R1 행 · R0 불변');
    }
  }
}
console.log(results.map(r=>`${r[0]}  ${r[1]}${r[2]?'  — '+r[2]:''}`).join('\n'));
console.log(`\n${fails?'❌ FAIL '+fails:'✅ ALL PASS'} (${results.length} 항목) · 출력 ${out}`); process.exitCode=fails?1:0;
