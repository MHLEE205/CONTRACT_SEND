/* acl_bench 시험 전부 — node run_all.js [html]   (필요: node 18+ · 이 폴더에서 npm install — jsdom 30.1.2 · pdf-lib 1.17.1 · pdfjs-dist 3.11.174) */
const cp=require('child_process'),path=require('path'),fs=require('fs');
const html=path.resolve(process.argv[2]||path.join(__dirname,'../../acl_bench.html'));
const ver=(fs.readFileSync(html,'utf8').match(/version:'(\d+(?:\.\d+)+)'/)||[])[1]||'?';
const rows=[]; let bad=0;
function node(label, file, args, pat){
  const r=cp.spawnSync(process.execPath,[path.join(__dirname,file)].concat(args),{encoding:'utf8',cwd:__dirname,maxBuffer:1<<26});
  const out=(r.stdout||'')+(r.stderr||''), m=out.match(pat), ok=r.status===0;
  if(!ok){ bad++; console.log(out.split('\n').filter(l=>/FAIL|Error/.test(l)).join('\n')); }
  rows.push([ok?'PASS':'FAIL',label,m?m[0]:'']);
}
node('기본 점검 (문법 · 버전 '+ver+' 1곳 · 공통 파일 1회 · confirm/alert 0 · 보안 grep 0 · 푸터)','check.js',[html,ver],/\{.*\}/);
node('단위 (대상 모으기 · 좌표 셀 · 형식 · D-03 기대 문면 · 문면 비교 · 세트 비교 · 가짜 PDF 읽기 · 저장 문지기 · CSV · summary)','unit.js',[html],/unit pass \d+ fail \d+/);
node('통합 jsdom (ACL 一覧 · 13건 照合 · 차이 종류 · 결과 표 · 保存 · 경로 문지기 · COMPASS 는 GET 만 · v0.3 표시 칸 · ③ 担当者実績 · 끌어다 놓기 · _input 控え)','e2e.js',[html],/e2e pass \d+ fail \d+/);
node('v0.3 담당자 실적 (CSV 파서 · 메일 종류 · 연결 · 실적 · 訂正 쌍 · 표시 칸 · 규칙 후보 · 実績表記 · 공백 둘로 · 저장 파일)','staff.js',[html],/staff pass \d+ fail \d+/);
/* v0.2 회귀: 실제 NACCS 위치 관계의 가짜 PDF — v0.1 (60c2909) 규칙은 실패 · 지금 규칙은 통과 */
{ const os=require('os'); let old=null; try{ old=cp.execFileSync('git',['show','60c2909:acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
  if(old){ const f=path.join(os.tmpdir(),'acl_v0_1_'+process.pid+'.html'); fs.writeFileSync(f,old); node('회귀 — v0.1 (60c2909) 규칙은 실제 모양에서 실패 · v0.2 는 통과','regress.js',[f,html],/regress pass \d+ fail \d+/); }
  else rows.push(['PASS','회귀 — (git 기록 없음 · 생략)','']);
  /* v0.3 회귀: CSV · 규칙 없음 → v0.2 (3e1b99f) 와 같은 결과 (Step 4 · 표시 칸 그룹만 다름) */
  let v2=null; try{ v2=cp.execFileSync('git',['show','3e1b99f:acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
  if(v2){ const f=path.join(os.tmpdir(),'acl_v0_2_'+process.pid+'.html'); fs.writeFileSync(f,v2); node('회귀 — CSV 안 읽음 → v0.2 (3e1b99f) 와 같은 결과 (Step 4 · 표시 칸만 다름)','same_v02.js',[f,html],/same pass \d+ fail \d+/); }
  else rows.push(['PASS','회귀 v0.2 — (git 기록 없음 · 생략)','']);
  /* v0.3.1: readPdf 가 다 읽은 PDF 를 닫음 — 실제 pdf.js 의 pages 는 v0.3 (a8c6199) 과 바이트까지 같아야 함 */
  let v3=null; try{ v3=cp.execFileSync('git',['show','a8c6199:acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
  if(v3){ const f=path.join(os.tmpdir(),'acl_v0_3_'+process.pid+'.html'); fs.writeFileSync(f,v3); node('v0.3.1 PDF 닫기 (정상 · 열기 실패 · 페이지 실패 → destroy 1번 · 400개 mapLimit(4) 열린 문서 끝 0 · 최대 4 · 실제 pdf.js pages = v0.3 (a8c6199))','pdfclose.js',[html,f],/pdfclose pass \d+ fail \d+/); }
  else rows.push(['PASS','v0.3.1 PDF 닫기 — (git 기록 없음 · 생략)','']);
  /* v0.4: 범위 all · forwarder · Agent = S/I · Way Bill/원본 조합 · 揚地 = S/I · 표기 정리 · 유지 확인 · 부킹 옆 칸 (v0.3.1 e0c2199 와 비교) · REV · 본선 라벨 */
  let v31=null; try{ v31=cp.execFileSync('git',['show','e0c2199:acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
  const f31=v31?path.join(os.tmpdir(),'acl_v0_3_1_'+process.pid+'.html'):null; if(v31) fs.writeFileSync(f31,v31);
  node('v0.4 (범위 all·forwarder · Agent=S/I · Way Bill/원본 조합 · 揚地=S/I · 표기 정리 · 유지 확인 · 부킹 옆 칸 · REV 판 · 본선 라벨)','v04.js',f31?[html,f31]:[html],/v04 pass \d+ fail \d+/);
  /* v0.5: 넘침 표시 이어 붙이기 · 컨테이너 형태 (세트) · ACL 이름 = 書類ツール v0.2 (7af227d) 와 같은 결과 · 결과 화면 — v0.4 (243897d) 와 비교 */
  let v4=null; try{ v4=cp.execFileSync('git',['show','243897d:acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
  const f4=v4?path.join(os.tmpdir(),'acl_v0_4_'+process.pid+'.html'):null; if(v4) fs.writeFileSync(f4,v4);
  let d2=null; try{ d2=cp.execFileSync('git',['show','7af227d:index.html'],{cwd:process.env.DOC_REPO||path.join(__dirname,'../../../DOC_TOOL'),encoding:'utf8',maxBuffer:1<<26,stdio:['ignore','pipe','ignore']}); }catch(e){}   /* 書類ツール 클론이 없으면 그 비교만 생략 */
  const fd2=d2?path.join(os.tmpdir(),'doc_v0_2_'+process.pid+'.html'):null; if(d2) fs.writeFileSync(fd2,d2);
  node('v0.5 (넘침 * ~ **** 이어 붙이기 · 컨테이너 형태 세트 · ACL 이름 = 書類ツール v0.2 · 仮 · 결과 화면)'+(d2?'':' — 書類ツール 클론 없음: 이름 비교 생략'),'v05.js',[html,f4||'',fd2||''],/v05 pass \d+ fail \d+/);
  /* v0.6: 최종 분석 (S/I 내용 항목이 ACL 어딘가에) · Description 내용 항목 비교 · 화면 — 컨테이너 세트는 v0.5 (903d923) 와 같은 결과 */
  let v5=null; try{ v5=cp.execFileSync('git',['show','903d923:acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
  const f5=v5?path.join(os.tmpdir(),'acl_v0_5_'+process.pid+'.html'):null; if(v5) fs.writeFileSync(f5,v5);
  node('v0.6 (내용 항목 · 최종 분석 · Description 항목 비교 · 가짜 F3 실례 = 表記差 · 세트 회귀 = v0.5 · 最終確認 화면)','v06.js',[html,f5||''],/v06 pass \d+ fail \d+/); }
/* 가짜 데이터: 시험 파일 GUID 는 모두 00000000-0000-4000-8000-… · 실제 ACL (리나이 F6 · 토르가 읽은 실례) 의 값이 시험 파일 · 도구에 없음 */
{ const files=['fixtures.js','unit.js','e2e.js','fake_naccs.js','pdfread.js','regress.js','same_v02.js','staff.js','pdfclose.js','v04.js','v05.js','v06.js'], txt=files.map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n');
  const guids=txt.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)||[], realG=guids.filter(g=>!/^00000000-0000-4000-8000-/.test(g));
  const REAL=['PCJTYO'+'26115206','AMP0'+'573572','TYOGN'+'6642800','5568'+'1833','HAN'+'KUK','MEGA '+'SURYA','TJIWI'+' KIMIA','KRAFT'+' OF ASIA','HONOR'+' GLORY','CNC'+' SERVAL','MOL '+'ENDOWMENT','RIO'+' KOBE','BSIU'+'8199489','CAIU'+'9653501','FFAU'+'7383199','UACU'+'6057211','PANP'+'805715','JPF'+'371604','J00'+'26358','NAKA'+'SHIMA','80111'+'01092439','MI775'+'26000244'.replace('775','772'),'MI605'+'26000669','EX2611'+'0142','TXGU'+'7339000','HLC'+'1609303','HLXU'+'8376721','HAMU'+'1382263','SAIGON'+' PAPER','3640ILU'+'8001657','3500'+'813231','IRENES'+' SOUTHERN','33291'+'368','N010-'+'2026','MY '+'XUAN','OLS'+'@','KAMI'+'YA','03627'+'89408','68448'+'17551',
    /* v0.3: 실제 담당자 메일 (2026Q3Q4 CSV) 에서 본 값 — 시험 · 도구에 0 */ 'LO'+'TOS','leenear'+'corp','photo'+'_rcp','PHOTO'+'_RCP','SINAR'+'MAS','SINAR'+' MAS','0-2586'+'-290','JPE'+'270697','TCLU'+'9796140','SKHU'+'6344009','THIEN'+' TRI','MAN'+'DIRI','POPU'+'126080001','M0609'+'2608NU','DALSEONG'+'-GUN','IAAJ'+'232801','HASLJ'+'01260','TYOGL'+'7397700','JP0122'+'7218','AJMAN'+', PO BOX','pulppy'+'tissue','sumitomo'+'soko','nippon'+'express',
    /* v0.5: 실례 (리나이 지시서 F2 · F3) 의 값 — 시험 · 도구에 0 */ 'TANJUNG'+' PRIOK','ASP'+'EX','KUM'+'BONG','KOR'+'INDO','HARY'+'ONO','ILC916'+'2600187','TGBU'+'4412228','JPF27'+'1110','TYOGE'+'5149900','BEAR'+' MOUNTAIN','797-'+'5959','6013 '+'8309','NA26'+'09-07','NCL26'+'10',
    /* v0.6: 실례 (리나이 지시서 F3) 품명 — 시험 · 도구에 0 */ 'NEWSPRINT'+' MANUFACTURING','(OM'+'G)','FOR '+'OMG'];
  const all=txt+'\n'+fs.readFileSync(html,'utf8'), hits=REAL.filter(s=>all.indexOf(s)>=0);
  if(realG.length||hits.length) bad++;
  rows.push([realG.length||hits.length?'FAIL':'PASS','가짜 데이터 — GUID 가짜 모양 · 실제 ACL 값 0건 (시험 파일 + acl_bench.html)',`GUID ${guids.length}개 · 가짜 아닌 것 ${realG.length} · 실제 값 ${hits.length}`]); }
rows.forEach(r=>console.log(r[0]+'  '+r[1]+'  — '+r[2]));
console.log(bad?`\n❌ FAIL ${bad} 항목`:`\n✅ ALL PASS (${rows.length} 항목)`); process.exitCode=bad?1:0;
