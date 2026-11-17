/* a1_bench v0.11 단위 시험 — 지시서 D00_COMPASS신규입력시험v0.3·A1v0.11 Part 2
   ① 外す港 를 먼저 빼기 (2611SG2) ② po_vo 종류 · 이름표 실적에 2025년 계약 (2601HK2) ③ 누설 금지 (2025 계약이 대상보다 뒤 · 다른 바이어) ④ (보고) 2603TJ1 POD1
   node unit_v011.js [a1_bench.html]   (가짜 데이터만 — 번호 · 회사 · 주소 모두 가짜. 항구명은 공개 지명) */
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const sc=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
const ctx={console}; vm.createContext(ctx);
vm.runInContext(sc('a1-core')+'\n;this.A1C=A1C;',ctx); vm.runInContext(sc('a1-master')+'\n;this.A1M=A1M;',ctx);
const {A1M}=ctx; let pass=0,fail=0;
const J=x=>JSON.stringify(x);
const eq=(name,got,exp)=>{ const g=J(got), e=J(exp); if(g===e){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,'\n   got',g,'\n   exp',e);} };
const ok=(name,c,info)=>{ if(c){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,info===undefined?'':J(info));} };
const item=(no,date,buyer,bank,tags,sis,extra)=>Object.assign({no,date,buyer,bankKey:bank,contractPo:'',country:'VIETNAM',pod:'',lc:{tags,lcNo:(tags['20']||'').split('\n')[0],text:Object.keys(tags).map(k=>':'+k+': '+tags[k]).join('\n')},sis},extra||{});
const hist=(no,date,buyer,sis,extra)=>Object.assign({no,date,buyer,bankKey:'',contractPo:'',country:'',pod:'',lc:{tags:{},lcNo:'',text:''},sis},extra||{});   // 2025 계약 (L/C 없음 · S/I 만)
const pods=(a,b,c)=>({crcf9_place_of_delivery_1:a||'',crcf9_place_of_delivery_2:b||'',crcf9_place_of_delivery_3:c||''});
const APP='DELTA PAPER CORPORATION\nSAMPLE A INDUSTRIAL PARK, SAMPLE WARD';
const P=x=>x+' PORT IN VIETNAM';

/* ── ① 外す港 우선 (2611SG2: 직전 S/I 가 SP-ITC 를 썼어도 뺌) ── */
console.log('① 후보 > 3 — 外す港 를 먼저 빼고 · 직전 S/I 순서 · L/C 순서');
const L5='CAT LAI OR CAI MEP OR SP-ITC OR VUNG TAU OR HO CHI MINH PORT IN VIET NAM';
const v=(no,date,a,b,c,lc)=>item(no,date,'DELTA','BIC:BANKVNVX',{'20':'ILC'+no.slice(-4),'50':APP,'44B':lc||L5},[Object.assign({crcf9_sino:1},pods(a,b,c)),Object.assign({crcf9_sino:2},pods(a,b,c))]);
const pri=[v('LRS-2605SG2','2026-05-05',P('CAT LAI'),P('CAI MEP'),P('SP-ITC')),v('LRS-2608SG2','2026-08-05',P('CAT LAI'),P('CAI MEP'),P('SP-ITC'))];
const mf=A1M.buildMasterFor(v('LRS-2611SG2','2026-11-05','','',''),pri);
eq('① 후보 5개 · 직전 S/I 에 SP-ITC · 外す港 SP-ITC → SP-ITC 빠지고 L/C 순서 다음 항구 (VUNG TAU)',A1M.podPlan(mf,1,[P('CAT LAI'),P('CAI MEP'),P('SP-ITC')]).values,[P('CAT LAI'),P('CAI MEP'),P('VUNG TAU')]);
eq('① sino 2 도 같음',A1M.podPlan(mf,2,[P('CAT LAI'),P('CAI MEP'),P('SP-ITC')]).values,[P('CAT LAI'),P('CAI MEP'),P('VUNG TAU')]);
const r1=A1M.podPlan(mf,1,['','','']);
ok('① 이유 기록: 外す港 를 先に外す · 直前 S/I の SP-ITC も外す',r1.changed&&/外す港 SP-ITC を先に外す/.test(r1.fixes.join())&&/直前 S\/I の SP-ITC も外す/.test(r1.fixes.join()),r1.fixes);
ok('① ③ 블록: 外す港 (先に外す) · 코드의 선택 = CAT LAI / CAI MEP / VUNG TAU',/マスター「外す港」\(先に外す\): SP-ITC/.test(A1M.masterPromptBlock(mf))&&/コードの選択[^\n]*: CAT LAI PORT IN VIETNAM \/ CAI MEP PORT IN VIETNAM \/ VUNG TAU PORT IN VIETNAM/.test(A1M.masterPromptBlock(mf)));
ok('① 규칙 문구 (POD_RULE): 外す港 を先に外し',/マスター「外す港」を先に外し、次に直前 S\/I の港の順、L\/C の順で 3 つ/.test(A1M.POD_RULE));
// 후보 3개 이하 → 그대로 (외す港 은 3개 초과일 때만)
const L3='CAT LAI OR CAI MEP OR SP-ITC PORT IN VIET NAM', mf3=A1M.buildMasterFor(v('LRS-2611SG2','2026-11-05','','','',L3),[v('LRS-2605SG2','2026-05-05',P('CAT LAI'),P('CAI MEP'),P('SP-ITC'),L3)]);
eq('① 후보 3개 → 外す港 적용 안 함 (SP-ITC 그대로)',A1M.podPlan(mf3,1,[P('CAT LAI'),P('CAI MEP'),P('SP-ITC')]).values,[P('CAT LAI'),P('CAI MEP'),P('SP-ITC')]);
// 베트남이 아니면 外す港 없음
const idn=(no,date,a,b,c)=>item(no,date,'ECHO','BIC:BANKIDJX',{'20':'ILC'+no.slice(-4),'50':'ECHO PAPER CO\nSAMPLE ROAD 1','44B':'BELAWAN OR TANJUNG PRIOK OR SP-ITC OR SEMARANG, INDONESIA'},[Object.assign({crcf9_sino:1},pods(a,b,c))],{country:'INDONESIA'});
const mfI=A1M.buildMasterFor(idn('LRS-2611EC1','2026-11-05'),[idn('LRS-2605EC1','2026-05-05','SP-ITC PORT','BELAWAN PORT','SEMARANG PORT')]);
eq('① 인도네시아 → 外す港 없음 · 직전 S/I 순서 그대로',A1M.podPlan(mfI,1,['','','']).values.map(x=>x.replace(/ PORT.*$/,'')),['SP-ITC','BELAWAN','SEMARANG']);
// 직전 S/I 가 外す港 만 쓴 경우 → L/C 순서로 채움
const pri2=[v('LRS-2605SG2','2026-05-05',P('SP-ITC'),'','')];
eq('① 직전 S/I 가 SP-ITC 하나 → 빼고 L/C 순서 앞 3개',A1M.podPlan(A1M.buildMasterFor(v('LRS-2611SG2','2026-11-05','','',''),pri2),1,['','','']).values,[P('CAT LAI'),P('CAI MEP'),P('VUNG TAU')]);

/* ── ② po_vo 종류 · 이름표 — 2025년 계약 실적 포함 (2601HK2) ── */
console.log('② po_vo 종류 실적에 2025년 계약');
const HKT=no=>({'20':'ILC'+no.slice(-4),'50':'HOTEL PAPER LTD\nSAMPLE ROAD 9','44B':'HONG KONG'});
const hk=(no,date,po,cpo,extra)=>item(no,date,'HOTEL','BIC:BANKHKHX',HKT(no),[{crcf9_sino:1,crcf9_po_vo:po,crcf9_remark:extra||''}],{country:'HONG KONG',contractPo:cpo||''});
const FIX='2025LN-HKX';
const y26=[hk('LRS-2601HK1','2026-01-05',FIX,'26LN.HKX01')];
const y25=[hist('LRS-2511HK1','2025-11-05','HOTEL',[{crcf9_sino:1,crcf9_po_vo:FIX}],{contractPo:'25LN.HKX11'}),hist('LRS-2512HK1','2025-12-05','HOTEL',[{crcf9_sino:1,crcf9_po_vo:FIX}],{contractPo:'25LN.HKX12'})];
const tHK=hk('LRS-2601HK2','2026-01-20','', '26LN.HKX02');
const mfNo=A1M.buildMasterFor(tHK,y26), mfYes=A1M.buildMasterFor(tHK,y26,y25);
eq('② 2025 없이 (v0.10): 앞선 실적 1건 → 不明',A1M.poVoTypeOf(mfNo,1).type,'不明');
eq('② 올해 1건 + 2025년 2건이 같은 고정값 → 固定値型 (그 값)',[A1M.poVoTypeOf(mfYes,1).type,A1M.poVoTypeOf(mfYes,1).value,A1M.poVoTypeOf(mfYes,1).n,A1M.poVoTypeOf(mfYes,1).last],['固定値型',FIX,3,'LRS-2601HK1']);
eq('② po_vo 값: 판매계약 번호 대신 고정값',A1M.poVoRule(mfYes,1,'26LN.HKX02','26LN.HKX02',[]).value,FIX);
eq('② 2025 없이는 판매계약 번호 그대로 (v0.10 결과)',A1M.poVoRule(mfNo,1,'26LN.HKX02','26LN.HKX02',[]).changed,false);
ok('② ③ 블록: 固定値型 (2025LN-HKX) · 2025 년 실적 2건 표시',/sino 1 固定値型 \(2025LN-HKX\) \[3件中 3件\]/.test(A1M.masterPromptBlock(mfYes))&&/2025 年の契約 2 件を含む: LRS-2511HK1, LRS-2512HK1/.test(A1M.masterPromptBlock(mfYes)),A1M.masterPromptBlock(mfYes));
eq('② 마스터 출처 (from) 는 그대로 올해 계약만 — 다른 칸 틀은 바뀌지 않음',[mfYes.from,J(mfYes.key.fields)===J(mfNo.key.fields)],[['LRS-2601HK1'],true]);
// 이름표 (판매계약 번호를 쓰는 칸) 도 2025 실적에서
const y25L=[hist('LRS-2512HK1','2025-12-05','HOTEL',[{crcf9_sino:1,crcf9_po_vo:FIX,crcf9_remark:'CONTRACT NO. 25LN.HKX12'}],{contractPo:'25LN.HKX12'})];
const mfL=A1M.buildMasterFor(tHK,y26,y25L);
ok('② 이름표: 올해 실적에 없으면 2025 실적의 「CONTRACT NO. 」',mfL.key.contract_po_places&&mfL.key.contract_po_places.from==='LRS-2512HK1'&&mfL.key.contract_po_places.places[0].label==='CONTRACT NO. ',mfL.key.contract_po_places);
// 첫 거래 (같은 키 없음 · 빌려 쓰기) 에도 2025 실적
const mfB=A1M.buildMasterFor(tHK,[hk('LRS-2601OT1','2026-01-02','X','',''),hk('LRS-2601OT2','2026-01-03','X','','')].map(x=>Object.assign(x,{buyer:'OTHER'})),y25);
ok('② 같은 키가 없어 나라 단계에서 빌려 쓰는 경우도 같은 바이어 2025 실적으로 종류 판단',!!mfB&&!!mfB.borrowed&&A1M.poVoTypeOf(mfB,1)&&A1M.poVoTypeOf(mfB,1).type==='固定値型'&&A1M.poVoTypeOf(mfB,1).n===2,mfB&&[mfB.borrowed,mfB.key.po_vo_type]);

/* ── 앱: masterHistItems — 2025 · 대상 아님 · 대상 바이어 · S/I 있음 (S.siByContract 에 이미 있는 것만) ── */
const app=sc('a1-app'), grab=n=>{ const i=app.indexOf('function '+n+'('); let d=0,j=app.indexOf('{',i); for(;j<app.length;j++){ if(app[j]==='{') d++; else if(app[j]==='}'){ d--; if(!d) break; } } return app.slice(i,j+1); };
const actx={A1C:ctx.A1C, Set, S:{targets:[{no:'LRS-2601HK2',buyer:'HOTEL'}], siByContract:{'LRS-2511HK1':[{crcf9_sino:1}],'LRS-2512HK1':[{crcf9_sino:1}],'LRS-2601HK1':[{crcf9_sino:1}],'LRS-2511ZZ1':[{crcf9_sino:1}],'LRS-2510HK1':[]},
  contracts:[{no:'LRS-2512HK1',date:'2025-12-05',buyer:'HOTEL',poNo:'25LN.HKX12'},{no:'LRS-2511HK1',date:'2025-11-05',buyer:'HOTEL'},{no:'LRS-2601HK1',date:'2026-01-05',buyer:'HOTEL'},{no:'LRS-2601HK2',date:'2026-01-20',buyer:'HOTEL'},
    {no:'LRS-2511ZZ1',date:'2025-11-05',buyer:'ZULU'},{no:'LRS-2510HK1',date:'2025-10-05',buyer:'HOTEL'}]}};
vm.createContext(actx); vm.runInContext(grab('masterHistItems')+';this.f=masterHistItems;',actx);
const mh=actx.f();
eq('앱 masterHistItems: 2025 · 대상 바이어 · S/I 있음 · 계약 순 (올해 · 다른 바이어 · S/I 없음 제외)',mh.map(x=>x.no),['LRS-2511HK1','LRS-2512HK1']);
ok('앱 masterHistItems: L/C 없음 · 판매계약 번호 · S/I',mh[1].contractPo==='25LN.HKX12'&&!Object.keys(mh[1].lc.tags).length&&mh[1].sis.length===1);

/* ── ③ 누설 금지 ── */
console.log('③ 누설 금지 — 대상보다 뒤 · 다른 바이어 · 겹침');
const late=[hist('LRS-2512HK1','2026-02-01','HOTEL',[{crcf9_sino:1,crcf9_po_vo:FIX}]),hist('LRS-2511HK1','2026-01-25','HOTEL',[{crcf9_sino:1,crcf9_po_vo:FIX}])];
eq('③ 2025 계약이지만 계약일이 대상보다 뒤 → 쓰지 않음 (不明 그대로)',[A1M.poVoTypeOf(A1M.buildMasterFor(tHK,y26,late),1).type,A1M.poVoHistFor(tHK,late,y26).length],['不明',0]);
const other=[hist('LRS-2511ZZ1','2025-11-05','ZULU',[{crcf9_sino:1,crcf9_po_vo:FIX}]),hist('LRS-2512ZZ1','2025-12-05','ZULU',[{crcf9_sino:1,crcf9_po_vo:FIX}])];
eq('③ 다른 바이어의 2025 계약 → 쓰지 않음',A1M.poVoTypeOf(A1M.buildMasterFor(tHK,y26,other),1).type,'不明');
eq('③ 대상 자신 · 이미 마스터에 든 계약은 다시 넣지 않음',A1M.poVoHistFor(tHK,[hist('LRS-2601HK2','2025-01-01','HOTEL',[{crcf9_sino:1}]),hist('LRS-2601HK1','2025-01-01','HOTEL',[{crcf9_sino:1}])],y26).length,0);
eq('③ S/I 없는 2025 계약 → 쓰지 않음',A1M.poVoHistFor(tHK,[hist('LRS-2511HK1','2025-11-05','HOTEL',[])],y26).length,0);
eq('③ hist 없이 부르면 v0.10 과 같음 (같은 결과 객체)',J(A1M.buildMasterFor(tHK,y26,[]).key),J(mfNo.key));

/* ── ④ (보고) 2603TJ1 POD1 — 2025 실적은 po_vo 에만 쓰므로 POD 모양은 바뀌지 않음 ── */
console.log('④ (보고) 2603TJ1 POD1');
const tj=(no,date,pod)=>item(no,date,'TANGO','BIC:BANKIDJY',{'20':'ILC'+no.slice(-4),'50':'TANGO PAPER\nSAMPLE ROAD 3','44B':'TANJUNG PERAK, SURABAYA'},[Object.assign({crcf9_sino:1,crcf9_po_vo:'X'},pods(pod))],{country:'INDONESIA'});
const t26=[tj('LRS-2601TJ1','2026-01-05','TANJUNG PERAK PORT')], t25=[hist('LRS-2511TJ1','2025-11-05','TANGO',[Object.assign({crcf9_sino:1},pods('TANJUNG PERAK PORT, SURABAYA'))]),hist('LRS-2512TJ1','2025-12-05','TANGO',[Object.assign({crcf9_sino:1},pods('TANJUNG PERAK PORT, SURABAYA'))])];
const mfT=A1M.buildMasterFor(tj('LRS-2603TJ1','2026-03-05',''),t26,t25);
eq('④ POD1 틀은 올해 같은 키 실적 그대로 ({POD} PORT) — 2번 수정으로는 「, SURABAYA」 가 생기지 않음 (원인 다름 · 보고)',[mfT.key.fields.find(f=>f.field==='place_of_delivery_1').recommended,A1M.podPlan(mfT,1,['TANJUNG PERAK PORT','','']).values[0]],['{POD} PORT','TANJUNG PERAK PORT']);

console.log(`\nunit_v011 pass ${pass} fail ${fail}`); process.exitCode=fail?1:0;
