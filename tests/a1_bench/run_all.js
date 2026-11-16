/* a1_bench 시험 전부 — node tests/a1_bench/run_all.js [--old <비교할 이전 버전 html>] [--skip-old]
   ① 문법 · 버전 · 공통 파일 · confirm/alert · 보안  ② 단위 v0.6 · v0.7  ③ 통합 (jsdom · mock — 네트워크 없음)
   ④ 이전 버전과 문자 단위 비교 (--old 없으면 git show 1191185:a1_bench.html = v0.7)
   필요: node 18 이상 · 이 폴더에서 npm install (jsdom 30.1.2 고정) */
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const here=__dirname, repo=path.join(here,'../..'), html=path.join(repo,'a1_bench.html');
const args=process.argv.slice(2), opt=k=>{ const i=args.indexOf(k); return i>=0?args[i+1]:null; };
const OLD_COMMIT='1191185', out=fs.mkdtempSync(path.join(os.tmpdir(),'a1_bench_tests_'));
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
node('unit_v08.js',[html],'② 단위 v0.8 (지급 조건 · HS 前回値 · 예상 시간 · 설정 비교)');
// legacy (v0.3 ~ v0.5, 집 Mac 에서 옮김 · 가짜 데이터) — 2026-11-16
node('legacy_v03_v05_unit.js',[html],'② legacy 단위 v0.3~v0.5 (154)');
node('legacy_v03_v05_pdf.js',[html],'② legacy PDF 0 복원 · NET/SET (합성 PDF)');
node('legacy_v03_v05_e2e.js',[html,'pilot'],'③ legacy 통합 v0.3~v0.5 — 파일럿 R1+R2');
node('legacy_v03_v05_e2e.js',[html,'full'],'③ legacy 통합 v0.3~v0.5 — 전체 실행');
// v0.8 Step 3: 공개 레포 시험 파일에 실제 NPWP 없음 (리나이 지시서 v0.7 의 예 번호)
{ const bad=['00100056'+'68092000','00110942'+'16092000'], hits=fs.readdirSync(here).filter(f=>/\.(js|md|json)$/.test(f)).filter(f=>{ const t=fs.readFileSync(path.join(here,f),'utf8'); return bad.some(b=>t.indexOf(b)>=0); });
  assert('① tests/ 에 실제 NPWP 0건',!hits.length,hits);
  // legacy 이관 때 바꾼 실제 값 (나눠 적어 이 파일 자신은 걸리지 않게) — 0건이어야 함
  const real=['35008'+'13231','ILC26'+'03819','ILC91626'+'00063','SOP2026'+'0305','IP-PO00000'+'22020','MY X'+'UAN','PHU M'+'Y WARD','SAIGON P'+'APER','C.A'+'.S.','SINGB'+'URI','PHOKR'+'UAM','CHAROE'+'NRAT','PHAHOLY'+'OTHIN','OSO'+'NG','ASPEX K'+'UMBONG','OLS'+'@SAIGON'];
  const hit2=fs.readdirSync(here).filter(f=>/\.(js|md|json)$/.test(f)&&f!=='package-lock.json').filter(f=>{ const t=fs.readFileSync(path.join(here,f),'utf8'); return real.some(b=>t.indexOf(b)>=0); }).map(f=>f+': '+real.filter(b=>fs.readFileSync(path.join(here,f),'utf8').indexOf(b)>=0).join(','));
  assert('① tests/ 에 legacy 이관 전 실제 값 0건 ('+real.length+'종)',!hit2.length,hit2); }
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
// ③ v0.8 전체 실행 · 이어서 실행 (6건 · 2건 뒤 강제 중단 → 새 페이지에서 이어서)
const rsm=path.join(out,'resume.json');
if(node('harness.js',[html,'resume',rsm,'on'],'③ 하네스 resume (전체 실행 · 이어서 실행)')){
  const o=J(rsm), first=o.order.slice(0,2), rest=o.order.slice(2);
  assert('③ 전체 실행 버튼 잠금 해제 · 🔒 없음',o.fullBtnDisabled===false&&!/🔒/.test(o.fullBtnText),[o.fullBtnDisabled,o.fullBtnText]);
  assert('③ 확인 상자 — 예상 호출 · US$ · 예상 시간 · 중단 안내',/예상 호출/.test(o.estFull)&&/추정 US\$/.test(o.estFull)&&/예상 시간 약/.test(o.estFull)&&/이어서 실행/.test(o.estFull));
  assert('③ 확인 상자 「취소」 → 호출 0 · 쓰기 0',o.cancel.claude===0&&o.cancel.writes===0,o.cancel);
  assert('③ 강제 중단 — 2건 끝남 · 결과 파일 없음',o.killedProgress.done.join()===first.join()&&!o.killedProgress.finished&&!o.killedHasResults,o.killedProgress);
  assert('③ 설정이 다르면 막힘 (이유 표시 · 호출 0)',/이어서 실행할 수 없습니다/.test(o.blockedText)&&/회차/.test(o.blockedText)&&o.blockedCalls===0,o.blockedCalls);
  assert('③ 이어서 실행 — 1·2건 호출 0',first.every(n=>!o.byNoC[n]),o.byNoC);
  assert('③ 이어서 실행 — 3~6건만 호출 (끊김 없는 실행과 같은 수)',rest.every(n=>o.byNoC[n]>0&&o.byNoC[n]===o.byNoA[n])&&Object.keys(o.byNoC).length===rest.length,[o.byNoA,o.byNoC]);
  assert('③ 끝 표시 · partial 남김',o.progressC.finished===true&&o.progressC.done.length===o.order.length&&o.partialsLeft===o.order.length&&o.progressC.resumed.length===1&&o.progressC.resumed[0].skipped===2,o.progressC);
  assert('③ 중간 요약 줄 (n/전체 · 실패 · 一致率)',o.logA.some(l=>/중간 요약 6\/6 · 실패 0 · 지금까지 一致率 R1 [\d.]+% · R2 [\d.]+%/.test(l)));
  node('cmp.js',[rsm.replace(/\.json$/,'.ref.json'),rsm.replace(/\.json$/,'.resumed.json'),'all'],'③ 이어서 실행 최종 결과 = 끊김 없는 실행 (실행 ID · 시각 제외)');
}
// ④ 이전 버전과 비교 (R1 · R0 불변 · 스위치 끈 R2 = 이전 R2)
if(args.indexOf('--skip-old')<0){
  let old=opt('--old');
  if(!old){ old=path.join(out,'a1_bench_'+OLD_COMMIT+'.html'); try{ fs.writeFileSync(old,cp.execFileSync('git',['show',OLD_COMMIT+':a1_bench.html'],{cwd:repo,maxBuffer:1<<26})); }catch(e){ old=null; fails++; results.push(['FAIL','④ 이전 버전 가져오기','git show '+OLD_COMMIT+' 실패 — --old <html> 로 지정']); } }
  if(old){
    const b0=path.join(out,'b_old.json'), bOff=path.join(out,'b_new_off.json'), bOn=path.join(out,'b_new_on.json');
    if(node('harness.js',[old,'bench',b0,'off'],'④ bench 이전 버전 (마스터 스위치가 있으면 끔)')&&node('harness.js',[html,'bench',bOff,'off'],'④ bench 새 버전 (마스터 끔)')&&node('harness.js',[html,'bench',bOn,'on'],'④ bench 새 버전 (마스터 켬)')){
      node('cmp.js',[b0,bOff,'all'],'④ 스위치 끔 = 이전 버전 (산출물 전부 + R0)');
      node('cmp.js',[b0,bOn,'r1r0'],'④ 스위치 켬 — R1 행 · R0 불변');
    }
  }
}
console.log(results.map(r=>`${r[0]}  ${r[1]}${r[2]?'  — '+r[2]:''}`).join('\n'));
console.log(`\n${fails?'❌ FAIL '+fails:'✅ ALL PASS'} (${results.length} 항목) · 출력 ${out}`); process.exitCode=fails?1:0;
