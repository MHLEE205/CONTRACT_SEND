/* a1_bench v0.8 단위 시험 — 지시서 D00_A1_시험도구v0.8 Step 5 #2 (지급 조건 마스터) · #3 ({HS} 前回値) · 예상 시간 · 이어서 실행 설정 비교
   node unit_v08.js [a1_bench.html]   (가짜 데이터만) */
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const sc=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
const ctx={console}; vm.createContext(ctx);
vm.runInContext(sc('a1-core')+'\n;this.A1C=A1C;',ctx); vm.runInContext(sc('a1-master')+'\n;this.A1M=A1M;',ctx);
const {A1M}=ctx; let pass=0,fail=0;
const J=x=>JSON.stringify(x);
const eq=(name,got,exp)=>{ const g=J(got), e=J(exp); if(g===e){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,'\n   got',g,'\n   exp',e);} };
const ok=(name,c,info)=>{ if(c){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,info===undefined?'':J(info));} };
const item=(no,date,buyer,bank,tags,sis)=>({no,date,buyer,bankKey:bank,contractPo:'',lc:{tags,lcNo:(tags['20']||'').split('\n')[0],text:''},sis});

/* ── #2 지급 조건 3칸 ── */
const PT='CIF HO CHI MINH PORT IN VIETNAM INCLUDED DTHC, SEAL FEE, CLEANING FEE (AS PER INCOTERMS 2020).';
const SGt={'20':'LC-SG','50':'DELTA PAPER CORPORATION\nSAMPLE A INDUSTRIAL PARK, SAMPLE WARD','42C':'AT 90 DAYS AFTER B/L DATE'};
const sg=(no,date,extra)=>item(no,date,'DELTA','BIC:BANKVNVX',SGt,[Object.assign({crcf9_sino:1,cr49f_payment_terms:PT,crcf9_payment_deadline:'AT 90 DAYS DAYS AFTER BILL OF LADING DATE',crcf9_payment_classification:'LC'},extra||{})]);
ok('2 마스터 칸 목록에 지급 조건 3칸',['cr49f_payment_terms','crcf9_payment_deadline','crcf9_payment_classification'].every(c=>A1M.FIELDS.some(f=>f[1]===c)),A1M.FIELDS.map(f=>f[1]));
const k2=A1M.buildMasterDraft([sg('LRS-2601SG1','2026-01-05'),sg('LRS-2602SG1','2026-02-05')]).keys[0];
const f2=c=>k2.fields.find(f=>f.col===c);
eq('2 payment_terms 確実 · 문구 그대로',[f2('cr49f_payment_terms').status,f2('cr49f_payment_terms').recommended],['確実',PT]);
eq('2 payment_deadline · classification 確実',[f2('crcf9_payment_deadline').status,f2('crcf9_payment_deadline').recommended,f2('crcf9_payment_classification').recommended],['確実','AT 90 DAYS DAYS AFTER BILL OF LADING DATE','LC']);
const mf2=A1M.buildMasterFor(sg('LRS-2603SG1','2026-03-05'),[sg('LRS-2601SG1','2026-01-05'),sg('LRS-2602SG1','2026-02-05')]), b2=A1M.masterPromptBlock(mf2);
ok('2 ③ 블록에 payment_terms 확실 틀',b2.indexOf('sino 1 cr49f_payment_terms テンプレ(確実): '+J(PT))>=0,b2);
ok('2 ③ 블록에 규칙 문구 (숫자는 L/C)',/支払条件の欄.*日数・パーセント等の数字だけは今回の L\/C\(42C 等\)と照合.*数字は L\/C/.test(b2));
eq('2 master_check 지급 조건',[A1M.masterCheck(mf2,1,'cr49f_payment_terms',PT),A1M.masterCheck(mf2,1,'cr49f_payment_terms','CIF HO CHI MINH PORT IN VIETNAM (INCOTERMS 2020) INCLUDED DTHC, SEAL FEE, CLEANING FEE.')],['MASTER_SAME','MASTER_DIFF']);
// 섞임 → 確認要
const k2b=A1M.buildMasterDraft([sg('LRS-2601SG1','2026-01-05'),sg('LRS-2602SG1','2026-02-05',{crcf9_payment_deadline:'AT 60 DAYS AFTER B/L DATE'})]).keys[0];
eq('2b 문구가 다르면 確認要 · 추천 = 최근',[k2b.fields.find(f=>f.col==='crcf9_payment_deadline').status,k2b.fields.find(f=>f.col==='crcf9_payment_deadline').recommended],['確認要','AT 60 DAYS AFTER B/L DATE']);

/* ── #3 {HS} 前回値 ── */
const withHs={'20':'LC-H','50':'DELTA PAPER CORPORATION\nSAMPLE A INDUSTRIAL PARK, SAMPLE WARD','45A':'WASTE PAPER\nHS CODE: 4707.20'};
const noHs={'20':'LC-H','50':'DELTA PAPER CORPORATION\nSAMPLE A INDUSTRIAL PARK, SAMPLE WARD','45A':'WASTE PAPER OCC 500 MT'};
const h=(no,date,tags)=>item(no,date,'DELTA','BIC:BANKVNVX',tags,[{crcf9_sino:1,crcf9_bl_text1:'WASTE PAPER#47072000#XXKGS',crcf9_notify_party:'DELTA PAPER CORPORATION',crcf9_address:'SAMPLE A INDUSTRIAL PARK, SAMPLE WARD'}]);
const src=[h('LRS-2601SG1','2026-01-05',withHs),h('LRS-2602SG1','2026-02-05',withHs)];
const mf3=A1M.buildMasterFor(h('LRS-2609SG1','2026-09-05',noHs),src), b3=A1M.masterPromptBlock(mf3);
eq('3 확실 틀 {HS} · 前回値 저장',[mf3.key.fields.find(f=>f.col==='crcf9_bl_text1').recommended,mf3.key.fields.find(f=>f.col==='crcf9_bl_text1').hs_prev,mf3.hsMissing],['WASTE PAPER#{HS}#XXKGS','47072000',true]);
ok('3 이번 LC HS 없음 → 블록에 前回値 47072000',b3.indexOf('crcf9_bl_text1 テンプレ(確実): "WASTE PAPER#{HS}#XXKGS" (前回値: 47072000 — 今回 L/C に HS なし)')>=0,b3);
ok('3 규칙 문구 (前回値 · 없으면 XX)',/前回値が示されている場合は前回値を使い、note に「前回値」と書く。前回値も無ければ XX。/.test(b3));
ok('3 이름 · 주소 자리에는 前回値 없음',b3.split('前回値: ').length-1===1 && !/crcf9_notify_party[^\n]*前回値/.test(b3) && !/crcf9_address[^\n]*前回値/.test(b3));
const mf3b=A1M.buildMasterFor(h('LRS-2609SG1','2026-09-05',withHs),src), b3b=A1M.masterPromptBlock(mf3b);
ok('3 이번 LC 에 HS 있으면 前回値 없음',mf3b.hsMissing===false && b3b.indexOf('(前回値:')<0);
eq('3 master_check — 前回値 를 {HS} 로 봄',[A1M.masterCheck(mf3,1,'crcf9_bl_text1','WASTE PAPER#47072000#XXKGS'),A1M.masterCheck(mf3,1,'crcf9_bl_text1','WASTE PAPER#XX#XXKGS')],['MASTER_SAME','MASTER_DIFF']);
eq('3 HS 있는 계약은 그 LC HS 로',A1M.masterCheck(mf3b,1,'crcf9_bl_text1','WASTE PAPER#47072000#XXKGS'),'MASTER_SAME');
// 출처 계약의 HS 가 바뀌었으면 가장 최근 계약 값
const src2=[h('LRS-2601SG1','2026-01-05',{'20':'L','50':withHs['50'],'45A':'HS CODE: 4707.10'}),h('LRS-2602SG1','2026-02-05',withHs)];
src2[0].sis[0].crcf9_bl_text1='WASTE PAPER#47071000#XXKGS';
eq('3 前回値 = 출처 중 가장 최근 계약',A1M.buildMasterFor(h('LRS-2609SG1','2026-09-05',noHs),src2).key.fields.find(f=>f.col==='crcf9_bl_text1').hs_prev,'47072000');

/* ── 앱 함수 (예상 시간 · 이어서 실행 설정 비교) — a1-app 에서 순수 함수만 꺼내 시험 ── */
const app=sc('a1-app'), grab=name=>{ const i=app.indexOf('function '+name+'('); let d=0,j=app.indexOf('{',i); for(;j<app.length;j++){ if(app[j]==='{') d++; else if(app[j]==='}'){ d--; if(!d) break; } } return app.slice(i,j+1); };
const actx={JSON,Math}; vm.createContext(actx);
vm.runInContext('const A1_SEC_PER_RUN={R1:40,R2:130}; const a1Version=()=>"0.8";\n'+grab('timeOf')+'\n'+grab('resumeMismatch')+'\nthis.timeOf=timeOf; this.resumeMismatch=resumeMismatch;',actx);
const o={models:['m'],reps:2,useR2:true,conc:3,rounds:'R1R2',r2Model:'m',effort:'high',maxTokens:32000,judgeModel:'j',priorN:2,r0Source:'new',r2Master:true};
eq('T 예상 시간 134건 · 동시 3 · R1+R2',actx.timeOf(134,o).sec,Math.ceil(134/3)*260);
eq('T R1만 · 동시 1',actx.timeOf(10,Object.assign({},o,{useR2:false,conc:1})).sec,10*80);
const cfg={version:'0.8',settings:Object.assign({},o),targets:[{no:'A'},{no:'B'}]};
eq('R 같으면 막지 않음',actx.resumeMismatch(cfg,o,['A','B']).length,0);
eq('R 동시 실행 수는 달라도 됨',actx.resumeMismatch(cfg,Object.assign({},o,{conc:1}),['A','B']).length,0);
ok('R 회차 · 마스터 스위치 · 모델 · 대상 · 버전 다르면 이유',(()=>{ const w=actx.resumeMismatch(Object.assign({},cfg,{version:'0.7'}),Object.assign({},o,{rounds:'R2',r2Master:false,r2Model:'x'}),['A','C']).join(' / '); return /도구 버전/.test(w)&&/회차/.test(w)&&/R2 마스터 사용/.test(w)&&/R2 모델/.test(w)&&/대상 목록.*추가 C.*빠짐 B/.test(w); })());
console.log(`\nunit_v08 pass ${pass} fail ${fail}`); process.exitCode=fail?1:0;
