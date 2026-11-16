/* a1_bench v0.7 단위 시험 — 지시서 D00_A1_시험도구v0.7 Step 1 표 · Step 4 #3 누설 금지 · master_check · 마스터 블록
   node unit_v07.js [a1_bench.html]   (가짜 데이터만. 실례 값은 지시서에 적힌 번호만) */
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const sc=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
const ctx={console}; vm.createContext(ctx);
vm.runInContext(sc('a1-core')+'\n;this.A1C=A1C;',ctx); vm.runInContext(sc('a1-master')+'\n;this.A1M=A1M;',ctx);
const {A1M}=ctx; let pass=0,fail=0;
const J=x=>JSON.stringify(x);
const eq=(name,got,exp)=>{ const g=J(got), e=J(exp); if(g===e){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,'\n   got',g,'\n   exp',e);} };
const ok=(name,c,info)=>{ if(c){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,info===undefined?'':J(info));} };
const item=(no,date,buyer,bank,tags,sis)=>({no,date,buyer,bankKey:bank,contractPo:'',lc:{tags,lcNo:(tags['20']||'').split('\n')[0],text:Object.keys(tags).map(k=>':'+k+': '+tags[k]).join('\n')},sis});
const ctxOf=(tags,no)=>{ const c=A1M.lcContext({tags,lcNo:(tags['20']||''),text:''},''); c.contractNo=no||''; return c; };

/* ── Step 1 표 ── */
// 1 po_vo 에 우리 계약번호 → {CONTRACT_NO} 하나 → 確実
const A1tags={'20':'LC-A1','50':'ASPEX SAMPLE CO\nJL. M.T HARYONO KAV. 62, JAKARTA SELATAN'};
const d1=A1M.buildMasterDraft([item('LRS-2601A1','2026-01-10','ASPEX','BIC:BANKIDJA',A1tags,[{crcf9_sino:1,crcf9_po_vo:'LRS-2601A1'}]),
                               item('LRS-2602A1','2026-02-10','ASPEX','BIC:BANKIDJA',A1tags,[{crcf9_sino:1,crcf9_po_vo:'LRS-2602A1'}])]);
const f1=d1.keys[0].fields.find(f=>f.field==='po_vo');
eq('1 po_vo LRS-… → {CONTRACT_NO} · 確実',[f1.status,f1.templates.length,f1.recommended],['確実',1,'{CONTRACT_NO}']);
eq('1b po_vo 종류 = LRS番号',d1.keys[0].po_vo_kind.map(p=>p.kind+' '+p.contracts.length),['LRS番号 2']);
// 2 「LRS-」 없는 모양
eq('2 po_vo 2601A1 → {CONTRACT_NO}',A1M.toTemplate('2601A1',ctxOf({},'LRS-2601A1')).template,'{CONTRACT_NO}');
eq('2b 문장 안 · 긴 것부터',A1M.toTemplate('CONTRACT NO. LRS-2601A1 / REF 2601A1',ctxOf({},'LRS-2601A1')).template,'CONTRACT NO. {CONTRACT_NO} / REF {CONTRACT_NO}');
eq('2c 다른 계약번호는 그대로',A1M.toTemplate('LRS-2602A1',ctxOf({},'LRS-2601A1')).template,'LRS-2602A1');
eq('2d 바이어 계약번호(HKB 모양)는 그대로',A1M.toTemplate('2025LN-HKB',ctxOf({},'LRS-2601HK1')).template,'2025LN-HKB');
eq('2e 계약번호 모양',A1M.contractNoForms('LRS-2608NT1'),['LRS-2608NT1','2608NT1']);
// 3 S/I SHIPPER TAX ID (당사) ↔ LC NPWP OF APPLICANT (바이어) → LC와 다름 없음
const IKtags={'20':'LC-IK','50':'PT INDAH KIAT SAMPLE\nJL. SAMPLE 1, JAKARTA','47A':'1. ALL DOCUMENTS MUST SHOW NPWP OF APPLICANT 0010000000000001\n2. ALL DOCUMENTS MUST SHOW LC NUMBER'};
const ik=(no,date)=>item(no,date,'INDAH KIAT','BIC:BMRIIDJA',IKtags,[{crcf9_sino:1,crcf9_bl_text1:'WASTE PAPER\nSHIPPER TAX ID: 8011101092439\nNPWP: 0010000000000001'}]);
const k3=A1M.buildMasterDraft([ik('LRS-2601IK1','2026-01-05'),ik('LRS-2602IK1','2026-02-05')]).keys[0];
eq('3 S/I 번호 주인 (당사 · 바이어)',k3.practices.tax.map(e=>e.value+':'+e.owner),['8011101092439:own','0010000000000001:buyer']);
eq('3 LC 번호 주인 = buyer',A1M.lcOwnedPractices(IKtags).tax.map(e=>e.value+':'+e.owner),['0010000000000001:buyer']);
eq('3 LC와 다름 없음',k3.lc_diff.length,0);
ok('3 표에 当社番号 따로',/当社番号 8011101092439/.test(A1M.practiceSummary(k3.practices)) && !/税番号 8011101092439/.test(A1M.practiceSummary(k3.practices)),A1M.practiceSummary(k3.practices));
// 3b 상수 규칙 (표지 없음) · 3c 표지 없는 바이어 번호는 그대로 대조 (참 경고)
const k3b=A1M.buildMasterDraft([item('LRS-2601TJ1','2026-01-05','TJIWI KIMIA','BIC:BMRIIDJA',{'50':'PT TJIWI KIMIA SAMPLE','47A':'1. NPWP OF APPLICANT 0010000000000002'},[{crcf9_sino:1,crcf9_notify_party:'8011101092439#PT TJIWI KIMIA SAMPLE'}])]).keys[0];
eq('3b 당사 상수 = 첫 규칙',[k3b.practices.tax.map(e=>e.owner),k3b.lc_diff.length],[['own'],0]);
const k3c=A1M.buildMasterDraft([item('LRS-2601TJ1','2026-01-05','TJIWI KIMIA','BIC:BMRIIDJA',{'50':'PT TJIWI KIMIA SAMPLE','47A':'1. NPWP OF APPLICANT 0010000000000002'},[{crcf9_sino:1,crcf9_notify_party:'NPWP: 0010000000000001#PT TJIWI KIMIA SAMPLE'}])]).keys[0];
eq('3c 바이어끼리 다르면 LC와 다름 (참)',k3c.lc_diff.map(d=>[d.kind,d.master,d.lc]),[['tax','0010000000000001','0010000000000002']]);
// 3d LC :59 · 수익자 근처 = own / 신청 회사 근처 = buyer / 표지 없음 = unknown
const lo=A1M.lcOwnedPractices({'59':'LEENEAR SAMPLE\nTAX ID 0300000077','47A':"1. BENEFICIARY'S TAX CODE 0300000088 AND APPLICANT'S TAX CODE 0300000099 MUST BE SHOWN\n2. IMPORT PERMIT NO. 156/GPMT-BTNMT"});
eq('3d LC 주인',[lo.tax.map(e=>e.value+':'+e.owner),lo.permit.map(e=>e.value+':'+e.owner)],[['0300000077:own','0300000088:own','0300000099:buyer'],['156/GPMT-BTNMT:unknown']]);
// 3e 2개 이상 키에서 같은 당사 번호 → 当社番号 候補
const all3=A1M.buildMasterDraft([ik('LRS-2601IK1','2026-01-05'),item('LRS-2601TJ1','2026-01-05','TJIWI KIMIA','BIC:BMRIIDJA',{'50':'PT TJIWI KIMIA SAMPLE'},[{crcf9_sino:1,crcf9_bl_text1:'SHIPPER TAX ID: 8011101092439'}])]);
eq('3e 当社番号 候補',all3.own_candidates.map(o=>[o.value,o.keys.length,o.confirmed]),[['8011101092439',2,true]]);
ok('3e summary 에 候補 줄',/## 当社番号 候補[\s\S]*8011101092439[\s\S]*2 キー/.test(A1M.toSummaryMd(all3,{})));
// 4 LC 줄바꿈으로 끊긴 허가번호
const tkc=(no,date,lc47)=>item(no,date,'TKC KRAFT','BIC:BIDVVNVX',{'20':'LC'+no.slice(-3),'50':'TKC KRAFT SAMPLE CORP\nSAMPLE ROAD 1','47A':lc47},[{crcf9_sino:1,crcf9_notify_party:'0300000001#382/GPMT-BTNMT#DEPOSIT'}]);
eq('4 LC 줄바꿈 이어 붙이기',A1M.joinLcBreaks('IMPORT PERMIT NO. 382/GPMT-\n     BTNMT MUST\nBE SHOWN'),'IMPORT PERMIT NO. 382/GPMT-BTNMT MUST BE SHOWN');
const k4=A1M.buildMasterDraft([tkc('LRS-2601KC1','2026-01-05','1. IMPORT PERMIT NO. 382/GPMT-\nBTNMT MUST BE SHOWN ON B/L')]).keys[0];
eq('4 끊긴 번호 → LC와 다름 없음',[A1M.lcOwnedPractices({'47A':'1. IMPORT PERMIT NO. 382/GPMT-\nBTNMT MUST BE SHOWN ON B/L'}).permit.map(e=>e.value),k4.lc_diff.length],[['382/GPMT-BTNMT'],0]);
// 5 같은 주인(buyer)끼리 다르면 그대로 LC와 다름
const k5=A1M.buildMasterDraft([item('LRS-2601KC1','2026-01-05','TKC KRAFT','BIC:BIDVVNVX',{'50':'TKC KRAFT SAMPLE CORP','47A':'1. IMPORT PERMIT OF APPLICANT NO. 382/GPMT-BTNMT'},[{crcf9_sino:1,crcf9_notify_party:'0300000001#156/GPMT-BTNMT#DEPOSIT'}])]).keys[0];
eq('5 LC와 다름 (v0.6 그대로)',k5.lc_diff.map(d=>[d.kind,d.master,d.lc]),[['permit','156/GPMT-BTNMT','382/GPMT-BTNMT']]);

/* ── Step 4 #3 누설 금지 — A(앞) · B(대상) · C(뒤) ── */
const LKtags={'20':'LC-LK','50':'LEAK TEST SAMPLE CO\nSAMPLE STREET 10, SAMPLE CITY'};
const lk=(no,date,mark,bank)=>item(no,date,'LEAKT',bank||'BIC:BANKAAAA',LKtags,[{crcf9_sino:1,crcf9_address:'#LEAK TEST SAMPLE CO***',crcf9_remark:'MEMO '+mark,crcf9_bl_text1:'MARK '+mark}]);
const A=lk('LRS-2601LK1','2026-01-05','AAA-0001'), A2=lk('LRS-2601LK2','2026-01-20','AAA-0002'), B=lk('LRS-2602LK1','2026-02-05','BBB-0002'), C=lk('LRS-2603LK1','2026-03-05','CCC-0003');
const D=lk('LRS-2601LK3','2026-01-07','DDD-0004','BIC:BANKBBBB');   // 다른 은행 (다른 키)
const items=[C,B,D,A2,A];   // 순서 섞음
const mfB=A1M.buildMasterFor(B,items), blockB=A1M.masterPromptBlock(mfB), jsonB=J(mfB.key);
eq('L1 B 의 마스터 출처 = 앞선 같은 키만',mfB.from,['LRS-2601LK1','LRS-2601LK2']);
eq('L2 B 입력에 C 값 0회',(blockB+jsonB).split('CCC-0003').length-1,0);
eq('L3 B 입력에 B 자신 값 0회',(blockB+jsonB).split('BBB-0002').length-1,0);
eq('L4 다른 은행 키 값 0회',(blockB+jsonB).split('DDD-0004').length-1,0);
ok('L5 A 값은 들어감',blockB.indexOf('AAA-0002')>=0);
eq('L6 첫 거래 → 마스터 없음',A1M.buildMasterFor(A,items),null);
ok('L7 B 블록에 C 계약번호 없음',blockB.indexOf('LRS-2603LK1')<0 && blockB.indexOf('今回の契約番号 (CONTRACT_NO): LRS-2602LK1')>=0);

/* ── master_check · 블록 · 허용 낱말 ── */
eq('M1 확실 틀 → 블록',/sino 1 crcf9_address テンプレ\(確実\): "#\{APPLICANT_NAME\}\*\*\*"/.test(blockB),true);
eq('M2 확실 틀에 맞음 = MASTER_SAME',A1M.masterCheck(mfB,1,'crcf9_address','#LEAK TEST SAMPLE CO***'),'MASTER_SAME');
eq('M3 구두점 · 공백만 다름 = MASTER_SAME',A1M.masterCheck(mfB,1,'crcf9_address','# LEAK TEST SAMPLE CO. ***'),'MASTER_SAME');
eq('M4 틀과 다름 = MASTER_DIFF',A1M.masterCheck(mfB,1,'crcf9_address','LEAK TEST SAMPLE CO'),'MASTER_DIFF');
eq('M5 확실 틀 없음(参考) = NO_MASTER',A1M.masterCheck(mfB,1,'crcf9_remark','MEMO X'),'NO_MASTER');
eq('M6 마스터 없음 = NO_MASTER',A1M.masterCheck(null,1,'crcf9_address','X'),'NO_MASTER');
const mfIK=A1M.buildMasterFor(ik('LRS-2603IK1','2026-03-05'),[ik('LRS-2601IK1','2026-01-05'),ik('LRS-2602IK1','2026-02-05')]);
eq('M7 허용 낱말 = 관행값',A1M.masterAllowWords(mfIK),['8011101092439','0010000000000001']);
ok('M8 블록에 当社番号 · バイヤー 구분',/当社番号\(税番号\): 8011101092439/.test(A1M.masterPromptBlock(mfIK)) && /税番号\(バイヤー\): 0010000000000001/.test(A1M.masterPromptBlock(mfIK)));
eq('M9 {CONTRACT_NO} 로 확실 → 그 계약 번호로 MASTER_SAME',(()=>{ const t=n=>item(n,'2026-0'+n.slice(7,8)+'-01','ASPEX','BIC:BANKIDJA',A1tags,[{crcf9_sino:1,crcf9_po_vo:n}]); const mf=A1M.buildMasterFor(t('LRS-2603A1'),[t('LRS-2601A1'),t('LRS-2602A1')]); return [A1M.masterCheck(mf,1,'crcf9_po_vo','LRS-2603A1'),A1M.masterCheck(mf,1,'crcf9_po_vo','LRS-2602A1')]; })(),['MASTER_SAME','MASTER_DIFF']);
console.log(`\nunit_v07 pass ${pass} fail ${fail}`); process.exitCode=fail?1:0;
