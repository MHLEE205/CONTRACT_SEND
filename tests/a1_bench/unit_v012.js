/* a1_bench v0.12 단위 시험 — 지시서 D00_SI規則マスター_master_si_rule·A1v0.12 Part 3 · 4
   S/I ルールマスター (pod_exclude · po_vo_fixed · contract_po_label · exception) · 못 읽음 → 내장값 · 자동 판단보다 우선 · マスター草案 「ルールマスターと違う」
   node unit_v012.js [a1_bench.html]   (가짜 데이터만 — 번호 · 회사 · 주소 모두 가짜. 항구명은 공개 지명) */
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const sc=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
const ctx={console}; vm.createContext(ctx);
vm.runInContext(sc('a1-core')+'\n;this.A1C=A1C;',ctx); vm.runInContext(sc('a1-master')+'\n;this.A1M=A1M;',ctx);
const {A1M,A1C}=ctx; let pass=0,fail=0;
const J=x=>JSON.stringify(x);
const eq=(name,got,exp)=>{ const g=J(got), e=J(exp); if(g===e){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,'\n   got',g,'\n   exp',e);} };
const ok=(name,c,info)=>{ if(c){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,info===undefined?'':J(info));} };
const item=(no,date,buyer,bank,tags,sis,extra)=>Object.assign({no,date,buyer,bankKey:bank,contractPo:'',country:'VIETNAM',pod:'',lc:{tags,lcNo:(tags['20']||'').split('\n')[0],text:Object.keys(tags).map(k=>':'+k+': '+tags[k]).join('\n')},sis},extra||{});
const pods=(a,b,c)=>({crcf9_place_of_delivery_1:a||'',crcf9_place_of_delivery_2:b||'',crcf9_place_of_delivery_3:c||''});
const APP='DELTA PAPER CORPORATION\nSAMPLE A INDUSTRIAL PARK, SAMPLE WARD';
const P=x=>x+' PORT IN VIETNAM';
const R=(scope_type,scope,rule,value,target)=>({scope_type,scope,rule,value,target:target||'',note:'',decided_by:'TEST',decided_at:'2026-11-17'});
/* 지시서 첫 데이터와 같은 모양 · 가짜 바이어 (HKX) */
const SAME=[R('country','VIETNAM','pod_exclude','SP-ITC','place_of_delivery_1-3'),R('contract','LRS-2606MG1','exception','PO 2件','po_vo')];
const L5='CAT LAI OR CAI MEP OR SP-ITC OR VUNG TAU OR HO CHI MINH PORT IN VIET NAM';
const v=(no,date,a,b,c)=>item(no,date,'DELTA','BIC:BANKVNVX',{'20':'ILC'+no.slice(-4),'50':APP,'44B':L5},[Object.assign({crcf9_sino:1},pods(a,b,c))]);
const pri=[v('LRS-2605SG2','2026-05-05',P('CAT LAI'),P('CAI MEP'),P('SP-ITC')),v('LRS-2608SG2','2026-08-05',P('CAT LAI'),P('CAI MEP'),P('SP-ITC'))];
const tgt=v('LRS-2611SG2','2026-11-05','','','');
const podOf=()=>A1M.podPlan(A1M.buildMasterFor(tgt,pri),1,['','','']).values;

console.log('0 못 읽음 · 내장값');
A1M.setSiRules(null);
const builtinPod=podOf(), builtinEx=A1C.exceptionOf('LRS-2606MG1');
eq('0 못 읽음 → 外す港 = 내장 SP-ITC',builtinPod,[P('CAT LAI'),P('CAI MEP'),P('VUNG TAU')]);
ok('0 못 읽음 → 예외 = 내장 A1_EXCEPTIONS',/^PO 2件/.test(builtinEx));
eq('0 못 읽음 → mf.rules 없음 · 상태 loaded false',[A1M.buildMasterFor(tgt,pri).rules,A1M.siRulesState().loaded],[[],false]);

console.log('1 마스터 = 내장값과 같은 값 → 같은 결과');
const st1=A1M.setSiRules(SAME);
eq('1 읽음 2건 · 경고 0',[st1.loaded,st1.used,st1.warnings],[true,2,[]]);
eq('1 pod_exclude VIETNAM SP-ITC → v0.11 과 같은 3항구',podOf(),builtinPod);
ok('1 exception (contract) → 예외 계약 표시 · 다른 계약은 빈칸',A1C.exceptionOf('lrs-2606mg1')==='PO 2件'&&A1C.exceptionOf('LRS-2604SG1')==='');
const mf1=A1M.buildMasterFor(tgt,pri);
eq('1 적용 규칙 기록 (pod_exclude · 3칸)',mf1.rules.map(r=>[r.rule,r.scope,r.value,r.cols.length]),[['pod_exclude','VIETNAM','SP-ITC',3]]);
ok('1 ③ 블록 「ルールマスター … 1 件 適用」 한 줄',/\nルールマスター \(人が決めた規則 · 自動より優先\): 1 件 適用 \(pod_exclude VIETNAM="SP-ITC"\)\n/.test(A1M.masterPromptBlock(mf1)));
// 나라 표기 — v0.11 내장 정규식 (VIET\s*NAM|ベトナム|^VN$) 과 같은 범위
const RE=/VIET\s*NAM|ベトナム|^VN$/i;
const cases=[['VIETNAM',''],['VIET NAM',''],['ベトナム',''],['VN',''],['',P('CAT LAI')],['','HO CHI MINH CITY, VIET NAM'],['THAILAND','BANGKOK'],['INDONESIA',''],['VNX',''],['','SURABAYA']];
eq('1 나라 판정 = v0.11 정규식과 같음 (10가지)',cases.map(([c,p])=>A1M.countryHit('VIETNAM',c,p)),cases.map(([c,p])=>RE.test(c)||RE.test(p)));
// 후보 3개 이하 → 적용 기록 없음
const L3='CAT LAI OR CAI MEP OR SP-ITC PORT IN VIET NAM', t3=item('LRS-2611SG2','2026-11-05','DELTA','BIC:BANKVNVX',{'20':'ILC1','50':APP,'44B':L3},[]);
eq('1 후보 3개 → 外す港 적용 없음 (기록도 없음)',A1M.buildMasterFor(t3,[item('LRS-2605SG2','2026-05-05','DELTA','BIC:BANKVNVX',{'20':'ILC2','50':APP,'44B':L3},[Object.assign({crcf9_sino:1},pods(P('CAT LAI')))])]).rules,[]);

console.log('2 마스터 값을 바꾸면 결과가 따라 바뀜');
A1M.setSiRules([R('country','VIETNAM','pod_exclude','HO CHI MINH')]);
eq('2 뺄 항구 HO CHI MINH → SP-ITC 는 남고 HO CHI MINH 빠짐',podOf(),[P('CAT LAI'),P('CAI MEP'),P('SP-ITC')]);
A1M.setSiRules([R('country','VIETNAM','pod_exclude','SP-ITC, VUNG TAU')]);
eq('2 뺄 항구 2개 (쉼표) → SP-ITC · VUNG TAU 빠짐',podOf(),[P('CAT LAI'),P('CAI MEP'),P('HO CHI MINH')]);
A1M.setSiRules([R('country','THAILAND','pod_exclude','SP-ITC')]);
eq('2 다른 나라 규칙만 → 베트남은 뺄 항구 없음 (직전 S/I 그대로)',podOf(),[P('CAT LAI'),P('CAI MEP'),P('SP-ITC')]);
A1M.setSiRules([]);
eq('2 빈 마스터 (읽음 · 0건) → 내장값 아님 · 뺄 항구 없음 · 예외 없음',[podOf(),A1C.exceptionOf('LRS-2606MG1')],[[P('CAT LAI'),P('CAI MEP'),P('SP-ITC')],'']);

console.log('4 po_vo_fixed — 자동 不明 보다 우선');
const HKT=no=>({'20':'ILC'+no.slice(-4),'50':'HOTEL PAPER LTD\nSAMPLE ROAD 9','44B':'HONG KONG'});
const hk=(no,date,po,cpo,sis2)=>item(no,date,'HOTEL','BIC:BANKHKHX',HKT(no),[{crcf9_sino:1,crcf9_po_vo:po},Object.assign({crcf9_sino:2,crcf9_po_vo:po},sis2||{})],{country:'HONG KONG',contractPo:cpo||'',buyerCode:'HKX'});
const y26=[hk('LRS-2601HK1','2026-01-05','FIXED-HKX','26LN.HKX01')], tHK=hk('LRS-2601HK2','2026-01-20','','26LN.HKX02');
A1M.setSiRules(null);
eq('4 마스터 없음 → 앞선 실적 1건 → 不明 (v0.11)',A1M.poVoTypeOf(A1M.buildMasterFor(tHK,y26),1).type,'不明');
A1M.setSiRules([R('buyer','HKX','po_vo_fixed','2025LN-HKX','po_vo (sino 1・2)')]);
const mf4=A1M.buildMasterFor(tHK,y26), t41=A1M.poVoTypeOf(mf4,1), t42=A1M.poVoTypeOf(mf4,2);
eq('4 po_vo_fixed (바이어 코드 HKX) → sino 1 · 2 固定値型 2025LN-HKX',[t41.type,t41.value,t42.type,t42.value,t41.rule,t41.auto.type],['固定値型','2025LN-HKX','固定値型','2025LN-HKX',true,'不明']);
eq('4 sino 3 · 4 는 대상 밖 (target 의 sino 1・2)',[A1M.poVoTypeOf(mf4,3),A1M.poVoTypeOf(mf4,4)],[null,null]);
eq('4 po_vo 값: 판매계약 번호 → 규칙 값',A1M.poVoRule(mf4,1,'26LN.HKX02','26LN.HKX02',[]).value,'2025LN-HKX');
ok('4 ③ 블록: [ルールマスター · 自動判断は 不明] · 적용 한 줄',/sino 1 固定値型 \(2025LN-HKX\) \[ルールマスター · 自動判断は 不明\]/.test(A1M.masterPromptBlock(mf4))&&/1 件 適用 \(po_vo_fixed HKX="2025LN-HKX"\)/.test(A1M.masterPromptBlock(mf4)),A1M.masterPromptBlock(mf4));
A1M.setSiRules([R('buyer','HOTEL','po_vo_fixed','2025LN-HKX')]);
ok('4 범위 = 바이어 이름 (cr49f_buyer) 으로도 · target 없으면 sino 1~4',A1M.poVoTypeOf(A1M.buildMasterFor(tHK,y26),3).value==='2025LN-HKX');
A1M.setSiRules([R('buyer','OTHER','po_vo_fixed','X')]);
eq('4 다른 바이어 규칙 → 적용 없음 (不明 그대로)',A1M.poVoTypeOf(A1M.buildMasterFor(tHK,y26),1).type,'不明');
A1M.setSiRules([R('buyer','HKX','po_vo_fixed','B-ONLY'),R('buyer_bank','HKX / BANKHKHX','po_vo_fixed','BANK-SPEC')]);
eq('4 buyer_bank 가 buyer 보다 우선 (은행 BIC 키)',A1M.poVoTypeOf(A1M.buildMasterFor(tHK,y26),1).value,'BANK-SPEC');
A1M.setSiRules([R('buyer','HKX','po_vo_fixed','B-ONLY'),R('buyer_bank','HKX / OTHERBANK','po_vo_fixed','BANK-SPEC')]);
eq('4 은행이 다르면 buyer 규칙',A1M.poVoTypeOf(A1M.buildMasterFor(tHK,y26),1).value,'B-ONLY');

console.log('contract_po_label — 자동 이름표보다 우선');
const y26L=[hk('LRS-2601HK1','2026-01-05','FIXED-HKX','26LN.HKX01',{crcf9_all:'PO Number : 26LN.HKX01'})];
A1M.setSiRules(null);
const auto=A1M.buildMasterFor(tHK,y26L).key.contract_po_places;
eq('L 마스터 없음 → 자동: sino 2 all 「PO Number : 」',auto&&auto.places.map(p=>[p.sino,p.field,p.label]),[[2,'all','PO Number : ']]);
A1M.setSiRules([R('buyer','HKX','contract_po_label','Annex No: ','sino 2 invoicetext・remark')]);
const mfL=A1M.buildMasterFor(tHK,y26L), cpp=mfL.key.contract_po_places;
eq('L 규칙 → sino 2 invoicetext · remark 「Annex No: 」 (값 끝 빈칸 그대로)',cpp.places.map(p=>[p.sino,p.field,p.col,p.label]),[[2,'invoicetext','crcf9_invoicetext','Annex No: '],[2,'remark','crcf9_remark','Annex No: ']]);
ok('L 자동 결과는 contract_po_places_auto 에 남김 · from = ルールマスター',mfL.key.contract_po_places_auto.places[0].field==='all'&&cpp.from==='ルールマスター'&&cpp.rule===true);
ok('L ③ 블록: 「Annex No: {CONTRACT_PO}」(ルールマスター の名札',/「Annex No: \{CONTRACT_PO\}」\(ルールマスター の名札/.test(A1M.masterPromptBlock(mfL)),A1M.masterPromptBlock(mfL));
eq('L 적용 규칙 칸',mfL.rules.map(r=>[r.rule,r.cols,r.sinos]),[['contract_po_label',['crcf9_invoicetext','crcf9_remark'],[2]]]);
const stW=A1M.setSiRules([R('buyer','HKX','contract_po_label','Annex No: ','invoicetext'),R('buyer','HKX','po_vo_fix','X'),R('country','HKX','po_vo_fixed','X'),R('buyer','','po_vo_fixed','X')]);
ok('L 대상 칸을 못 읽음 · 모르는 규칙 · 범위 종류 틀림 · 범위 빈칸 → 무시 + 경고 4개',stW.used===0&&stW.warnings.length===4&&/対象欄 "invoicetext" を読めず/.test(stW.warnings[0]),stW.warnings);
eq('L 못 읽은 규칙 → 자동 판단 그대로',A1M.buildMasterFor(tHK,y26L).key.contract_po_places.places.map(p=>p.field),['all']);

console.log('マスター草案 — ルールマスターと違う');
A1M.setSiRules([R('buyer','HKX','po_vo_fixed','2025LN-HKX','po_vo (sino 1・2)'),R('buyer','HKX','contract_po_label','Annex No: ','sino 2 invoicetext・remark')]);
const dk=A1M.buildMasterDraft([hk('LRS-2601HK1','2026-01-05','26LN.HKX01','26LN.HKX01',{crcf9_all:'PO Number : 26LN.HKX01'})]).keys[0];
const dd=A1M.ruleDiffForKey(dk);
ok('D 자동 (契約PO型 · all 「PO Number : 」) ≠ 규칙 → 3줄 (po_vo sino 1 · 2 · 번호 칸)',dd.length===3&&/po_vo sino 1: 自動 契約PO型 \/ ルール 固定値型 2025LN-HKX/.test(dd[0])&&/販売契約番号の欄: 自動 sino 2 all 「PO Number : 」 \/ ルール sino 2 invoicetext・remark 「Annex No: 」/.test(dd[2]),dd);
const dk2=A1M.buildMasterDraft([hk('LRS-2601HK1','2026-01-05','2025LN-HKX','26LN.HKX01',{crcf9_invoicetext:'Annex No: 26LN.HKX01',crcf9_remark:'Annex No: 26LN.HKX01'}),hk('LRS-2602HK1','2026-02-05','2025LN-HKX','26LN.HKX03',{crcf9_invoicetext:'Annex No: 26LN.HKX03',crcf9_remark:'Annex No: 26LN.HKX03'})]).keys[0];
eq('D 자동이 규칙과 같으면 표시 없음',A1M.ruleDiffForKey(dk2),[]);
A1M.setSiRules(null); eq('D 마스터 못 읽음 → 표시 없음',A1M.ruleDiffForKey(dk),[]);

console.log(`\nunit_v012 pass ${pass} fail ${fail}`); process.exitCode=fail?1:0;
