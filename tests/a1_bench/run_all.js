/* a1_bench 시험 전부 — node tests/a1_bench/run_all.js [--old <비교할 이전 버전 html>] [--skip-old]
   ① 문법 · 버전 · 공통 파일 · confirm/alert · 보안  ② 단위 v0.6 · v0.7  ③ 통합 (jsdom · mock — 네트워크 없음)
   ④ 이전 버전과 문자 단위 비교 (--old 없으면 git show 8704035:a1_bench.html = v0.10 · v0.11 에서 바꿈)
   필요: node 18 이상 · 이 폴더에서 npm install (jsdom 30.1.2 고정) */
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const here=__dirname, repo=path.join(here,'../..'), html=path.join(repo,'a1_bench.html');
const args=process.argv.slice(2), opt=k=>{ const i=args.indexOf(k); return i>=0?args[i+1]:null; };
const OLD_COMMIT='8704035', out=fs.mkdtempSync(path.join(os.tmpdir(),'a1_bench_tests_'));   // v0.11: 비교 기준 = v0.10 (이전: 09ce7df = v0.9 · 188ba74 = v0.8 · 1191185 = v0.7)
const ver=(fs.readFileSync(html,'utf8').match(/version:'(\d+\.\d+)'/)||[])[1];
let fails=0; const results=[];
const node=(script,argv,label)=>{ try{ const s=cp.execFileSync(process.execPath,[path.join(here,script)].concat(argv),{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:1<<26}); results.push(['PASS',label,s.trim().split('\n').pop()]); return s; }
  catch(e){ fails++; results.push(['FAIL',label,String(e.stdout||'').split('\n').filter(l=>/FAIL|DIFF|Error/.test(l)).slice(0,8).join(' / ')+String(e.stderr||'').slice(0,300)]); return null; } };
const assert=(label,cond,info)=>{ if(cond) results.push(['PASS',label,'']); else { fails++; results.push(['FAIL',label,info===undefined?'':JSON.stringify(info).slice(0,300)]); } };
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
/* v0.10: CSV → 줄 (따옴표 안 쉼표 · 줄바꿈) */
const parseCsv=text=>{ const out=[]; let row=[], cur='', q=false; const t=String(text).replace(/^\ufeff/,'');
  for(let i=0;i<t.length;i++){ const c=t[i]; if(q){ if(c==='"'&&t[i+1]==='"'){cur+='"';i++;} else if(c==='"') q=false; else cur+=c; }
    else if(c==='"') q=true; else if(c===','){ row.push(cur); cur=''; } else if(c==='\r'&&t[i+1]==='\n'){ row.push(cur); out.push(row); row=[]; cur=''; i++; } else cur+=c; }
  row.push(cur); out.push(row); return out; };

// ①②
node('check.js',[html,ver],'① 문법 · 버전 '+ver+' · 보안');
node('unit_v06.js',[html],'② 단위 v0.6 (42)');
node('unit_v07.js',[html],'② 단위 v0.7');
node('unit_v08.js',[html],'② 단위 v0.8 (지급 조건 · HS 前回値 · 예상 시간 · 설정 비교)');
node('unit_v09.js',[html],'② 단위 v0.9 (LC 지정 문구 · 나라 기본 · 새 업체 빌려 쓰기 · Step 1·2 는 v0.10 규칙으로 기대값 고침)');
node('unit_v010.js',[html],'② 단위 v0.10 (POD 1~3 나눠 쓰기 · po_vo 종류 · 판매계약 번호 칸 · 2606MG1 예외 · v0.11 에서 POD 규칙 문구 2곳 새 문구도 받게)');
node('unit_v011.js',[html],'② 단위 v0.11 (外す港 먼저 · po_vo 실적에 2025년 · 누설 금지 · 2603TJ1 보고)');
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
  assert('③ v0.9 マスター草案 — 키마다 나라 · 国の基本と違う 계산 · CSV 열',o.master.keys.every(k=>k.country&&k.country_diff)&&/,country,country_diff\r?\n/.test(o.files[Object.keys(o.files).find(n=>/\.csv$/.test(n))]||''),o.master.keys.map(k=>[k.country,k.country_diff]));
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
  // v0.9: ③ 입력 — 실제 항구 · バイヤー契約番号 · L/C 지정 문구 (켬 · 끔 모두) / 初回取引 줄 (켬만)
  const allA=o=>o.assemblePrompts.map(p=>p.txt);
  assert('③ v0.10 ③ 입력에 【L/C 仕向港候補】 HO CHI MINH · 새 규칙 · 계약/부킹 POD 는 참고 (2605SG1 부킹 CAT LAI) · 【バイヤー契約番号】 · 【L/C 指定文言】 (켬 · 끔) · 「実際の仕向港」 없음',[on,off].every(o=>allA(o).every(t=>/【L\/C 仕向港候補 \(44B\/44F · コードで 1 港ずつに分解\) — place_of_delivery 用】\nHO CHI MINH\n規則: place_of_delivery_1〜3 には/.test(t)&&/参考 — ブッキング時の選択候補に入っているべき港: 契約 POD CAT LAI \//.test(t)&&t.indexOf('実際の仕向港')<0&&/【バイヤー契約番号 \(販売契約 cr49f_po_no\)】\nPO\d+/.test(t)&&/【L\/C 指定文言 \(46A B\/L 条項 · コードで検出\)】/.test(t)))&&on.assemblePrompts.filter(p=>p.lcNo==='ILC0003').every(p=>/ブッキング POD CAT LAI/.test(p.txt)));
  // v0.10: 코드 보정 — 마스터 켬에서 OR 한 칸 → 두 칸 · po_vo 契約PO型 → 판매계약 번호 / 끔에서는 보정 0
  const recOf=(o,no,col)=>{ const rows=parseCsv(o.bench.find(b=>b.file==='results.csv').text), h=rows[0]; return rows.slice(1).filter(r=>r[h.indexOf('contract')]===no&&r[h.indexOf('round')]==='R2'&&r[h.indexOf('col')]===col&&r[h.indexOf('sino')]==='1').map(r=>r[h.indexOf('rec')]); };
  assert('③ v0.10 켬 — place_of_delivery 「HO CHI MINH OR CAT LAI, VIET NAM」 → 1: HO CHI MINH CITY, VIET NAM (틀) · 2: CAT LAI, VIET NAM',['LRS-2604SG1','LRS-2605SG1'].every(n=>recOf(on,n,'crcf9_place_of_delivery_1').join('|')==='HO CHI MINH CITY, VIET NAM|HO CHI MINH CITY, VIET NAM'&&recOf(on,n,'crcf9_place_of_delivery_2').join('|')==='CAT LAI, VIET NAM|CAT LAI, VIET NAM'),['LRS-2604SG1','LRS-2605SG1'].map(n=>[recOf(on,n,'crcf9_place_of_delivery_1'),recOf(on,n,'crcf9_place_of_delivery_2')]));
  assert('③ v0.10 켬 — po_vo 契約PO型 → 판매계약 번호 (PO22222 · PO33333)',recOf(on,'LRS-2604SG1','crcf9_po_vo').every(v=>v==='PO22222')&&recOf(on,'LRS-2605SG1','crcf9_po_vo').every(v=>v==='PO33333')&&recOf(on,'LRS-2605SG1','crcf9_po_vo').length===2,[recOf(on,'LRS-2604SG1','crcf9_po_vo'),recOf(on,'LRS-2605SG1','crcf9_po_vo')]);
  assert('③ v0.10 summary 「v0.10 코드 보정」 표 (켬: 8줄 · 끔: 없음)',/\*\*v0\.10 코드 보정\*\* \(pod_fix · po_vo 종류 · 販売契約番号欄\) \(8\)/.test(md)&&/OR 分割/.test(md)&&/po_vo 種類 契約PO型/.test(md)&&!/v0\.10 코드 보정/.test(off.bench.find(b=>b.file==='summary.md').text),(md.match(/\*\*v0\.10 코드 보정[^\n]*/)||[''])[0]);
  const mdOff=off.bench.find(b=>b.file==='summary.md').text;
  assert('③ v0.9 初回取引 — 全体確認 한 줄 (켬: 2603SG1 · 끔: 없음)',/\n- 初回取引 — 全体確認: LRS-2603SG1\n/.test(md)&&!/初回取引/.test(mdOff));
  assert('③ run_config 에 스위치 기록',rc.settings.r2Master===true&&rcOff.settings.r2Master===false);
  assert('③ 예상 비용 — 켬: 마스터 토큰 반영 · 끔: v0.6 과 같은 줄',/\+마스터 약 [\d,]+ 토큰\/회/.test(on.estHtml)&&!/마스터/.test(off.estHtml)&&on.est12.on.total>on.est12.off.total&&on.est12.tok>0,on.est12);
}
// ③ v0.10 Step 3 — 예외 계약 (시험용으로 LRS-2605SG1 을 예외에 더함) → CSV exception 열 · summary 예외 포함 / 제외 두 줄
const r2ex=path.join(out,'r2ex.json');
if(node('harness.js',[html,'r2',r2ex,'on','LRS-2605SG1'],'③ 하네스 r2 (예외 계약 1건)')){
  const o=J(r2ex), csvT=o.bench.find(b=>b.file==='results.csv').text, md=o.bench.find(b=>b.file==='summary.md').text;
  const rows=parseCsv(csvT), h=rows[0], iC=h.indexOf('contract'), iE=h.indexOf('exception');
  const ex=rows.slice(1).filter(r=>r[iC]==='LRS-2605SG1'), nonEx=rows.slice(1).filter(r=>/^LRS-260[34]SG1$/.test(r[iC]));
  assert('③ v0.10 CSV exception 열 — 예외 계약 행만 표시',h[h.length-1]==='exception'&&ex.length>0&&ex.every(r=>r[iE]==='TEST 例外')&&nonEx.length>0&&nonEx.every(r=>r[iE]===''),[h.slice(-2),ex.length,nonEx.length]);
  assert('③ v0.10 summary — 칸별 예외 제외 표 · §12 R1/R2 예외 제외 두 줄',/### 칸별 \(전 회차 합계 · 예외 제외\)/.test(md)&&/※ 예외 계약 \(집계 표시 · 제외\): LRS-2605SG1 — TEST 例外/.test(md)&&/\| R2 \(예외 제외\) \| 2 \|/.test(md)&&/\| R1 \(예외 제외\) \|/.test(md),(md.match(/## 12\.[\s\S]{0,600}/)||[''])[0]);
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
      node('cmp.js',[b0,bOff,'all'],'④ 스위치 끔 = v0.10 (산출물 전부 + R0 — 문자 단위)');
      node('cmp.js',[b0,bOn,'r1r0'],'④ 스위치 켬 — R1 행 · R0 불변');
      { const P=f=>J(f).otherPrompts||[], p0=P(b0), pOff=P(bOff), pOn=P(bOn);   // v0.9 Step 6-2: R1 · R0 입력 문자 단위
        assert('④ R1 · R0 입력(프롬프트) v0.10 과 문자 단위로 같음 (끔 · 켬) — '+p0.length+'개',p0.length>0&&JSON.stringify(p0)===JSON.stringify(pOff)&&JSON.stringify(p0)===JSON.stringify(pOn),[p0.length,pOff.length,pOn.length]); }
    }
  }
}
console.log(results.map(r=>`${r[0]}  ${r[1]}${r[2]?'  — '+r[2]:''}`).join('\n'));
console.log(`\n${fails?'❌ FAIL '+fails:'✅ ALL PASS'} (${results.length} 항목) · 출력 ${out}`); process.exitCode=fails?1:0;
