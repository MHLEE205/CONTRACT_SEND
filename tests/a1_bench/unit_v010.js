/* a1_bench v0.10 단위 시험 — 지시서 D00_A1_시험도구v0.10 Step 1 (POD 1~3 나눠 쓰기) · 2 (po_vo 종류 = 과거 실적) · 3 (2606MG1 예외)
   node unit_v010.js [a1_bench.html]   (가짜 데이터만 — 번호 · 회사 · 주소 모두 가짜. 항구명은 공개 지명) */
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const sc=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
const ctx={console}; vm.createContext(ctx);
vm.runInContext(sc('a1-core')+'\n;this.A1C=A1C;',ctx); vm.runInContext(sc('a1-master')+'\n;this.A1M=A1M;',ctx);
const app=sc('a1-app'), fnSrc=n=>{ const i=app.indexOf('function '+n+'('); const j=app.indexOf('\nfunction ',i+1); return app.slice(i,j); };
vm.runInContext(fnSrc('r2ExtraText')+'\n;this.r2ExtraText=r2ExtraText;',ctx);
const {A1M,A1C}=ctx; let pass=0,fail=0;
const J=x=>JSON.stringify(x);
const eq=(name,got,exp)=>{ const g=J(got), e=J(exp); if(g===e){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,'\n   got',g,'\n   exp',e);} };
const ok=(name,c,info)=>{ if(c){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,info===undefined?'':J(info));} };
const item=(no,date,buyer,bank,tags,sis,extra)=>Object.assign({no,date,buyer,bankKey:bank,contractPo:'',country:'VIETNAM',pod:'',lc:{tags,lcNo:(tags['20']||'').split('\n')[0],text:Object.keys(tags).map(k=>':'+k+': '+tags[k]).join('\n')},sis},extra||{});
const APP='DELTA PAPER CORPORATION\nSAMPLE A INDUSTRIAL PARK, SAMPLE WARD';
const pods=(a,b,c)=>({crcf9_place_of_delivery_1:a||'',crcf9_place_of_delivery_2:b||'',crcf9_place_of_delivery_3:c||''});

/* ── Step 1 — POD 1~3 ── */
console.log('Step 1 — place_of_delivery 1〜3 (L/C 후보 1칸 1항구 · OR 금지 · 3개 초과 빼기)');
const L5='CAI MEP OR CAT LAI OR SP-ITC OR HO CHI MINH OR VUNG TAU PORT IN VIET NAM';
eq('1 L/C 후보 나누기 (OR · PORT · 나라 이름 제거)',A1M.lcPodCands({'44B':L5}),['CAI MEP','CAT LAI','SP-ITC','HO CHI MINH','VUNG TAU']);
eq('1 「/」 · 「,」 도 나눔 · 나라만 남은 조각은 버림',A1M.lcPodCands({'44F':'CAT LAI PORT OR SP-ITC PORT, VIETNAM'}),['CAT LAI','SP-ITC']);
eq('1 「TANJUNG PERAK, SURABAYA」',A1M.lcPodCands({'44F':'TANJUNG PERAK, SURABAYA'}),['TANJUNG PERAK','SURABAYA']);
eq('1 portIn — 값 안에서 가장 앞의 후보',A1M.portIn('TANJUNG PERAK PORT, SURABAYA',['TANJUNG PERAK','SURABAYA']),'TANJUNG PERAK');
const T5=no=>({'20':'ILC'+no,'50':APP,'44B':L5});
const v5=(no,date,a,b,c)=>item(no,date,'DELTA','BIC:BANKVNVX',T5(no.slice(-4)),[Object.assign({crcf9_sino:1},pods(a,b,c))]);
const pri5=[v5('LRS-2601SG1','2026-01-05','CAT LAI PORT IN VIETNAM','CAI MEP PORT IN VIETNAM','VUNG TAU PORT IN VIETNAM'),v5('LRS-2602SG1','2026-02-05','CAT LAI PORT IN VIETNAM','CAI MEP PORT IN VIETNAM','VUNG TAU PORT IN VIETNAM')];
const tgt5=v5('LRS-2611SG1','2026-11-05','','','');
const mf5=A1M.buildMasterFor(tgt5,pri5);
eq('1 틀 {POD} PORT IN VIETNAM (칸마다 그 칸의 항구 하나)',['1','2','3'].map(i=>mf5.key.fields.find(f=>f.field==='place_of_delivery_'+i).recommended),['{POD} PORT IN VIETNAM','{POD} PORT IN VIETNAM','{POD} PORT IN VIETNAM']);
const r5=A1M.podPlan(mf5,1,['CAT LAI PORT IN VIETNAM','CAI MEP PORT IN VIETNAM','SP-ITC PORT IN VIETNAM']);
eq('1 [지시서 예 1] 후보 5개 · 직전 S/I CAT LAI / CAI MEP / VUNG TAU → 같은 3개 · 같은 순서',r5.values,['CAT LAI PORT IN VIETNAM','CAI MEP PORT IN VIETNAM','VUNG TAU PORT IN VIETNAM']);
ok('1 pod_fix 이유 기록 (직전 S/I 우선)',r5.changed&&/候補 5 港 > 3/.test(r5.fixes.join())&&/直前 S\/I の港を優先/.test(r5.fixes.join()),r5);
eq('1 R2 가 OR 로 한 칸에 몰아도 같은 결과',A1M.podPlan(mf5,1,[L5,'','']).values,r5.values);
// 직전 S/I 없음 — 같은 나라 다른 바이어 2건 (다수 틀) 에서 빌림
const o5=(buyer,no,date,app,port)=>item(no,date,buyer,'BIC:BANKVNVY',{'20':'ILC'+no.slice(-4),'50':app+'\nSAMPLE ROAD '+no.slice(-3),'44B':port+' PORT IN VIET NAM'},[Object.assign({crcf9_sino:1},pods(port+' PORT IN VIETNAM'))]);
const priO=[o5('ECHO','LRS-2601EC1','2026-01-06','ECHO PAPER CO','CAT LAI'),o5('ECHO','LRS-2602EC1','2026-02-06','ECHO PAPER CO','CAT LAI'),o5('FOX','LRS-2601FX1','2026-01-07','FOX PAPER CO','CAI MEP')];
const tgtN=item('LRS-2611NW1','2026-11-06','NEWB','BIC:BANKVNVZ',{'20':'ILC9001','50':'NEWB PAPER CO\nSAMPLE ROAD 001','44B':L5},[]);
const mfN=A1M.buildMasterFor(tgtN,priO), rN=A1M.podPlan(mfN,1,[L5,'','']);
eq('1 [지시서 예 2] 직전 S/I 없음 → SP-ITC 빼고 L/C 순서 앞 3개 · 모양은 나라 다수 틀',[mfN.borrowed.level,rN.values],['country',['CAI MEP PORT IN VIETNAM','CAT LAI PORT IN VIETNAM','HO CHI MINH PORT IN VIETNAM']]);
eq('1 마스터 「뺄 항구」 처음 값: 베트남 SP-ITC · 다른 나라 없음',[A1M.podExcludeFor('VIETNAM',''),A1M.podExcludeFor('',L5),A1M.podExcludeFor('INDONESIA','TANJUNG PERAK, SURABAYA')],[['SP-ITC'],['SP-ITC'],[]]);
// OR 한 칸 → 두 칸
const T2={'20':'ILC0201','50':APP,'44B':'CAT LAI PORT OR SP-ITC PORT, VIETNAM'};
const d2=(no,date)=>item(no,date,'DELTA2','BIC:BANKVNVX',T2,[Object.assign({crcf9_sino:1},pods('CAT LAI PORT, VIETNAM','SP-ITC PORT, VIETNAM'))]);
const mf2=A1M.buildMasterFor(d2('LRS-2603DC1','2026-03-05'),[d2('LRS-2601DC1','2026-01-05'),d2('LRS-2602DC1','2026-02-05')]);
const r2=A1M.podPlan(mf2,1,['CAT LAI PORT OR SP-ITC PORT, VIETNAM','','']);
eq('1 [지시서 예 3] 「CAT LAI PORT OR SP-ITC PORT, VIETNAM」 한 칸 → 두 칸',r2.values,['CAT LAI PORT, VIETNAM','SP-ITC PORT, VIETNAM','']);
ok('1 OR 분할 기록',r2.changed&&/OR 分割/.test(r2.fixes.join()),r2);
eq('1 마스터 틀이 없어도 나눔 (뒤의 「, VIETNAM」 을 앞 조각에도)',A1M.podPlan({ctx:{podCands:['CAT LAI','SP-ITC']},key:{fields:[],pod_history:[]}},1,['CAT LAI PORT OR SP-ITC PORT, VIETNAM','','']).values,['CAT LAI PORT, VIETNAM','SP-ITC PORT, VIETNAM','']);
// 모양 (TJIWI 형)
const TT={'20':'ILC0301','50':'TANGO PAPER CO\nSAMPLE ROAD 3, SURABAYA','44F':'TANJUNG PERAK, SURABAYA'};
const tj=(no,date)=>Object.assign(item(no,date,'TANGO','BIC:BANKIDJA',TT,[Object.assign({crcf9_sino:1},pods('TANJUNG PERAK PORT, SURABAYA'))]),{country:'INDONESIA'});
const mfT=A1M.buildMasterFor(tj('LRS-2610TJ1','2026-10-05'),[tj('LRS-2601TJ1','2026-01-05'),tj('LRS-2603TJ1','2026-03-05')]);
eq('1 [지시서 예 4] 틀 {POD} PORT, SURABAYA',mfT.key.fields.find(f=>f.field==='place_of_delivery_1').recommended,'{POD} PORT, SURABAYA');
eq('1 [지시서 예 4] R2 「TANJUNG PERAK/SURABAYA」 → 「TANJUNG PERAK PORT, SURABAYA」',A1M.podPlan(mfT,1,['TANJUNG PERAK/SURABAYA','','']).values,['TANJUNG PERAK PORT, SURABAYA','','']);
eq('1 이미 맞으면 그대로 (changed false)',A1M.podPlan(mfT,1,['TANJUNG PERAK PORT, SURABAYA','','']).changed,false);
// 순서 (후보 3개 이하)
const T3={'20':'ILC0401','50':APP,'44B':'CAI MEP OR CAT LAI OR SP-ITC PORT IN VIETNAM'};
const s3=(no,date)=>item(no,date,'DELTA3','BIC:BANKVNVX',T3,[Object.assign({crcf9_sino:1},pods('CAT LAI PORT IN VIETNAM','CAI MEP PORT IN VIETNAM','SP-ITC PORT IN VIETNAM'))]);
const mf3=A1M.buildMasterFor(s3('LRS-2601SG3','2026-01-20'),[s3('LRS-2511SG3','2025-11-20'),s3('LRS-2512SG3','2025-12-20')]);
eq('1 후보 3개 · R2 순서 CAI MEP / CAT LAI → 직전 S/I 순서 CAT LAI / CAI MEP',A1M.podPlan(mf3,1,['CAI MEP PORT IN VIETNAM','CAT LAI PORT IN VIETNAM','SP-ITC PORT IN VIETNAM']).values,['CAT LAI PORT IN VIETNAM','CAI MEP PORT IN VIETNAM','SP-ITC PORT IN VIETNAM']);
eq('1 L/C 후보 없음 · OR 없음 → 손대지 않음',A1M.podPlan({ctx:{podCands:[]},key:{fields:[],pod_history:[]}},1,['ANY PORT','','']).changed,false);
const tplHo=A1M.toTemplate('HO CHI MINH CITY, VIET NAM',A1M.podCtx({podCands:['HO CHI MINH'],pod:'CAT LAI',addrLines:[],pos:[],hs:[]},'place_of_delivery_1')).template;
eq('1 {POD} 는 place_of_delivery 칸에만 · 값 안의 항구 하나만',[tplHo,A1M.toTemplate('HO CHI MINH CITY, VIET NAM',A1M.podCtx({podCands:['HO CHI MINH'],addrLines:[],pos:[],hs:[]},'port_of_discharge')).template],['{POD} CITY, VIET NAM','HO CHI MINH CITY, VIET NAM']);
const b5=A1M.masterPromptBlock(mf5);
ok('1 ③ 블록: 후보 5개 · 직전 S/I 순서 · 뺄 항구 · 코드의 선택',/- 仕向港: L\/C 候補 5 港 \(CAI MEP \/ CAT LAI \/ SP-ITC \/ HO CHI MINH \/ VUNG TAU\) · 直前 S\/I の港 \(並び順\): CAT LAI \/ CAI MEP \/ VUNG TAU · マスター「外す港」: SP-ITC/.test(b5)&&/コードの選択[^\n]*: CAT LAI PORT IN VIETNAM \/ CAI MEP PORT IN VIETNAM \/ VUNG TAU PORT IN VIETNAM/.test(b5)&&b5.indexOf('実際の仕向港')<0,b5);
const x1=ctx.r2ExtraText({podContract:'CAT LAI',podBookings:['CAT LAI'],podCands:['CAI MEP','CAT LAI'],poNo:'',wording:null});
ok('1 ③ 입력: 【L/C 仕向港候補】 + 새 규칙 문구 (1 欄に 1 港 · OR で 1 欄にまとめない · 3 つを超えるとき外す) · 계약/부킹 POD 는 참고',/【L\/C 仕向港候補 \(44B\/44F · コードで 1 港ずつに分解\) — place_of_delivery 用】\nCAI MEP \/ CAT LAI\n/.test(x1)&&x1.indexOf('place_of_delivery_1〜3 には L/C(44B/44F 等)の仕向港候補を 1 欄に 1 港ずつ入れる。OR で 1 欄にまとめない(ブッキング時に選ぶため)。候補が 3 つを超えるときは使わない港を外す。外す港・並び順・書き方(例 `CAT LAI PORT IN VIETNAM`・`TANJUNG PERAK PORT, SURABAYA`)は直前 S/I(同じ買い手×銀行)に従う。')>=0&&/参考 — ブッキング時の選択候補に入っているべき港/.test(x1)&&x1.indexOf('実際の仕向港')<0,x1);

/* ── Step 2 — po_vo 종류 ── */
console.log('Step 2 — po_vo 종류 (契約PO型 · 固定値型 …) · 판매계약 번호 칸 · 이름표');
const TH={'20':'ILC0501','50':'HOTEL TRADING LIMITED\nSAMPLE TOWER 5, SAMPLE ROAD','45A':'WASTE PAPER\nPO NO. OCC00000001'};
// 01 · 02: sino 2 all 에 「PO Number : 」 → 03: invoicetext 「Annex No: 」 + remark 「Annex No. 」 (이름표가 바뀜)
const hk=(no,date,cpo,place,po)=>item(no,date,'HOTEL','BIC:BANKHKHH',TH,[{crcf9_sino:1,crcf9_po_vo:po||'1111LN-XXX'},Object.assign({crcf9_sino:2,crcf9_po_vo:po||'1111LN-XXX'},place)],{contractPo:cpo,country:'HONG KONG'});
const priH=[hk('LRS-2601HK2','2026-01-10','22LN.XXX01',{crcf9_all:'SAMPLE GOODS\nPO Number : 22LN.XXX01'}),hk('LRS-2603HK1','2026-03-10','22LN.XXX02',{crcf9_all:'SAMPLE GOODS\nPO Number : 22LN.XXX02'}),
  hk('LRS-2608HK1','2026-08-10','22LN.XXX03',{crcf9_invoicetext:'SAMPLE GOODS\nAnnex No: 22LN.XXX03',crcf9_remark:'Annex No. 22LN.XXX03'})];
const tgtH=hk('LRS-2611HK1','2026-11-10','22LN.XXX04',{crcf9_invoicetext:'ANSWER Annex No: 22LN.XXX04'},'1111LN-XXX');   // 자기 자신의 S/I (정답) 는 쓰지 않음
const laterH=hk('LRS-2612HK1','2026-12-10','22LN.XXX05',{crcf9_bl_text2:'Contract Ref: 22LN.XXX05'},'7777LN-ZZZ');   // 뒤 계약 (누설 시험)
const mfH=A1M.buildMasterFor(tgtH,priH.concat([tgtH,laterH]));
eq('2 固定値型 (sino 1 · 2) · 값 1111LN-XXX · 3건 중 3건',[1,2].map(s=>{ const t=mfH.key.po_vo_type[s]; return [t.type,t.value,t.same,t.n]; }),[['固定値型','1111LN-XXX',3,3],['固定値型','1111LN-XXX',3,3]]);
eq('2 [지시서 예 1] po_vo 추천 22LN.XXX04 → 1111LN-XXX (sino 1)',A1M.poVoRule(mfH,1,'22LN.XXX04','22LN.XXX04',mfH.ctx.pos).value,'1111LN-XXX');
eq('2 L/C PO 추천 → 1111LN-XXX (sino 2)',A1M.poVoRule(mfH,2,'OCC00000001','22LN.XXX04',mfH.ctx.pos).value,'1111LN-XXX');
eq('2 이미 고정값이면 그대로',A1M.poVoRule(mfH,1,'1111LN-XXX','22LN.XXX04',mfH.ctx.pos).changed,false);
eq('2 [지시서 예 3] 판매계약 번호 칸 = 가장 최근 계약 (이름표가 바뀐 뒤) — sino 2 invoicetext 「Annex No: 」 · remark 「Annex No. 」',[mfH.key.contract_po_places.from,mfH.key.contract_po_places.places],['LRS-2608HK1',[{sino:2,field:'invoicetext',col:'crcf9_invoicetext',label:'Annex No: '},{sino:2,field:'remark',col:'crcf9_remark',label:'Annex No. '}]]);
eq('2 이름표 이력: 01 · 02 는 「PO Number : 」 (all)',mfH.key.contract_po_places.history.slice(0,2).map(h=>h.places.map(p=>p.field+'|'+p.label).join()),['all|PO Number : ','all|PO Number : ']);
eq('2 [지시서 예 1] invoicetext — 이름표 뒤 번호를 이번 계약 번호로',A1M.contractPoPlaceFix('SAMPLE GOODS\nAnnex No: 22LN.XXX03','Annex No: ','22LN.XXX04').value,'SAMPLE GOODS\nAnnex No: 22LN.XXX04');
eq('2 이름표가 없으면 끝에 한 줄',A1M.contractPoPlaceFix('SAMPLE GOODS','Annex No: ','22LN.XXX04').value,'SAMPLE GOODS\nAnnex No: 22LN.XXX04');
eq('2 이미 이번 번호가 있으면 그대로',A1M.contractPoPlaceFix('X Annex No: 22LN.XXX04','Annex No: ','22LN.XXX04').changed,false);
const bH=A1M.masterPromptBlock(mfH);
ok('2 ③ 블록: po_vo 종류 · 규칙 · 판매계약 번호 칸 (이름표)',bH.indexOf('- po_vo 欄: マスター種類 sino 1 固定値型 (1111LN-XXX) [3件中 3件] · sino 2 固定値型 (1111LN-XXX) [3件中 3件]。')>=0&&bH.indexOf('  固定値型 → 固定値をそのまま。契約PO型 → 販売契約の番号。L/C の PO は種類が L/C PO型 のときだけ。')>=0&&bH.indexOf('- 販売契約番号の記入欄: sino 2 invoicetext・sino 2 remark に「Annex No: {CONTRACT_PO}」(直近 S/I LRS-2608HK1 の名札')>=0,bH);
ok('2 po_vo 가 22LN… 이 되지 않음 (추천 · 블록의 po_vo 줄)',!/22LN/.test(A1M.poVoRule(mfH,1,'22LN.XXX04','22LN.XXX04',mfH.ctx.pos).value)&&!/po_vo 欄[^\n]*22LN/.test(bH));
ok('2 누설 금지 — 뒤 계약 (7777LN-ZZZ · Contract Ref) · 자기 자신 (ANSWER) 0회',mfH.from.join()==='LRS-2601HK2,LRS-2603HK1,LRS-2608HK1'&&['7777LN','Contract Ref','ANSWER','22LN.XXX05'].every(v=>bH.indexOf(v)<0&&J(mfH.key.contract_po_places).indexOf(v)<0&&J(mfH.key.po_vo_type).indexOf(v)<0),[mfH.from,bH]);
// 契約PO型
const TS={'20':'ILC0601','50':APP,'45A':'WASTE PAPER\nPO NO. OCC20250009'};
const sg=(no,date,cpo,po)=>item(no,date,'DELTA4','BIC:BANKVNVX',TS,[{crcf9_sino:1,crcf9_po_vo:po===undefined?cpo:po}],{contractPo:cpo});
const mfS=A1M.buildMasterFor(sg('LRS-2611SG2','2026-11-11','9999/0004',''),[sg('LRS-2601SG2','2026-01-11','9999/0001'),sg('LRS-2603SG2','2026-03-11','9999/0002'),sg('LRS-2605SG2','2026-05-11','9999/0003')]);
eq('2 契約PO型 (po_vo = 각 계약 po_no)',[mfS.key.po_vo_type[1].type,mfS.key.po_vo_type[1].same],['契約PO型',3]);
eq('2 [지시서 예 2] L/C PO OCC… 추천 → 9999/0004',A1M.poVoRule(mfS,1,'OCC20250009','9999/0004',mfS.ctx.pos).value,'9999/0004');
eq('2 다른 계약의 번호 (9999/0003) 추천 → 9999/0004',A1M.poVoRule(mfS,1,'9999/0003','9999/0004',mfS.ctx.pos).value,'9999/0004');
// 그 밖의 종류
eq('2 종류 판정 — LRS番号型 · L/C PO型 · 1건뿐인 다른 값 = 不明',[A1M.poVoClass('LRS-2601A1','',[],'').cls,A1M.poVoClass('OCC20250009','',['OCC20250009'],'').cls,A1M.poVoTypeFrom([{no:'A',cls:'other',value:'ZZ-1'}]).type],['LRS番号型','L/C PO型','不明']);
const mfL=A1M.buildMasterFor(sg('LRS-2611SG5','2026-11-11','9999/0004',''),[sg('LRS-2601SG5','2026-01-11','','OCC20250009'),sg('LRS-2603SG5','2026-03-11','','OCC20250009')]);
eq('2 L/C PO型 · 不明 이면 손대지 않음',[mfL.key.po_vo_type[1].type,A1M.poVoRule(mfL,1,'OCC20250009','9999/0004',mfL.ctx.pos).changed],['L/C PO型',false]);
ok('2 마스터 없음 → 손대지 않음',A1M.poVoRule(null,1,'X','Y',[]).changed===false);

/* ── Step 3 — 2606MG1 예외 ── */
console.log('Step 3 — 2606MG1 예외');
eq('3 A1_EXCEPTIONS (형님 D16)',J(A1C.A1_EXCEPTIONS),J({'LRS-2606MG1':'PO 2件(15年で初めての特殊ケース — 형님 D16)'}));
eq('3 exceptionOf — 대소문자 · 다른 계약',[A1C.exceptionOf('lrs-2606mg1')!=='',A1C.exceptionOf('LRS-2606SG1')],[true,'']);
console.log('unit_v010 pass',pass,'fail',fail); process.exitCode=fail?1:0;
