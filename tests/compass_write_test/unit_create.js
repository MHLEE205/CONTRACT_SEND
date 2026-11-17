/* compass_write_test v0.3 「신규 입력」 단위 시험 — <script id="cw-core"> 만 꺼내 node 로 실행. node unit_create.js [html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures'),FC=require('./fixtures_create');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../compass_write_test.html'),'utf8');
const CW=new Function('module',html.match(/<script id="cw-core">([\s\S]*?)<\/script>/)[1]+';return CW;')(undefined);
let pass=0,fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m);} };
const throws=(f,re)=>{ try{ f(); return false; }catch(e){ return re?re.test(e.message):true; } };
const T=CW.CREATE_ALLOWED.TEST01;

console.log('허용 계약 · 실행 ID');
ok(CW.isCreateAllowed(' test01 ') && !CW.isCreateAllowed('LRS-2509CV1') && !CW.isCreateAllowed('toString') && !CW.isCreateAllowed('__proto__'), 'TEST01 만 (대소문자 · 빈칸 무시 · toString/__proto__ 같은 이름 막힘)');
ok(/^cnew_\d{8}T\d{6}$/.test(CW.cnewRunId(new Date('2026-11-17T01:02:03.456Z'))) && CW.cnewRunId(new Date('2026-11-17T01:02:03.456Z'))==='cnew_20261117T010203', '실행 ID = cnew_yyyymmddThhmmss');

console.log('메타데이터 → 세트 · 탐색 · 컬렉션');
const setsBy=Object.assign({},FC.SETS);
const M=CW.resolveCreateMeta(setsBy, FC.M2O, FC.O2M.cr49f_s_i);
ok(!M.problems.length && !M.notes.length, '정상 → 문제 0 · 경고 0');
ok(M.sets.si==='cr49f_s_is' && M.sets.item==='cr49f_items' && M.nav.item==='crcf9_Item_id' && M.nav.contract==='cr49f_sale_contract_id' && M.collection===CW.NAV_DETAILS_F3, '세트 · 탐색 이름은 읽은 값 그대로 (대소문자 포함)');
ok(CW.resolveCreateMeta(Object.assign({},setsBy,{cr49f_s_i:'cr49f_sis'}),FC.M2O,FC.O2M.cr49f_s_i).problems.some(p=>/cr49f_sis/.test(p)), 'S/I 세트 이름이 cr49f_s_is 가 아님 → 문제');
ok(CW.resolveCreateMeta(Object.assign({},setsBy,{cr49f_item:undefined}),FC.M2O,FC.O2M.cr49f_s_i).problems.some(p=>/cr49f_item 엔터티 세트/.test(p)), '세트 이름 못 읽음 → 문제');
const m2oNoItem=JSON.parse(JSON.stringify(FC.M2O)); m2oNoItem.crcf9_s_i_detail.pop();
ok(CW.resolveCreateMeta(setsBy,m2oNoItem,FC.O2M.cr49f_s_i).problems.some(p=>/crcf9_item_id → cr49f_item 연결 0개/.test(p)), '품목 연결 없음 → 문제');
const m2oTwo=JSON.parse(JSON.stringify(FC.M2O)); m2oTwo.cr49f_s_i.push(Object.assign({},m2oTwo.cr49f_s_i[0],{ReferencingEntityNavigationPropertyName:'x'}));
ok(CW.resolveCreateMeta(setsBy,m2oTwo,FC.O2M.cr49f_s_i).problems.some(p=>/연결 2개/.test(p)), '같은 연결이 2개 → 문제 (고르지 않음)');
const o2m2=JSON.parse(JSON.stringify(FC.O2M)); o2m2.cr49f_s_i[0].ReferencedEntityNavigationPropertyName='crcf9_other';
const M2=CW.resolveCreateMeta(setsBy,FC.M2O,o2m2.cr49f_s_i); ok(!M2.problems.length && M2.collection==='crcf9_other' && /F3/.test(M2.notes[0]||''), '컬렉션 이름이 F3 와 다름 → 경고만 · 읽은 값 씀');

console.log('칸 분류 (만들기)');
const A=(n,t,o)=>Object.assign({LogicalName:n,AttributeType:t,IsValidForUpdate:true,MaxLength:null,AttributeOf:null,SourceType:0},o||{});
const c=CW.classify([A('a','String',{MaxLength:100}),A('b','String',{IsValidForUpdate:false,IsValidForCreate:true,MaxLength:100}),A('c','String',{IsValidForCreate:false,MaxLength:100}),
  A('d','String',{MaxLength:4}),A('e','Integer'),A('f','Lookup'),A('g','String',{IsValidForUpdate:false})],{create:true,textValue:'TEST-A'});
const wn=c.write.map(f=>f.name).join();
ok(wn==='a,b,e', '만들기 쓸 칸: 보통 글자 · 만들 때만 쓰는 칸 · 숫자 (IsValidForCreate=false · MaxLength 4 · Lookup · 업데이트 불가(만들기 정보 없음) 빼고)');
ok(c.write.find(f=>f.name==='a').value==='TEST-A' && c.write.find(f=>f.name==='e').value===1, '글자 = TEST-A · 숫자 = 1');
const cu=CW.classify([A('b','String',{IsValidForUpdate:false,IsValidForCreate:true}),A('d','String',{MaxLength:4})]);
ok(cu.write.map(f=>f.name).join()==='d' && cu.write[0].value==='1', '변경 시험 분류는 그대로 (IsValidForUpdate 기준 · MaxLength 1 이상이면 「1」)');

console.log('본문');
const clsS={write:[{name:'cr49f_name',value:'1'},{name:'crcf9_freight',value:1}]}, clsD={write:[{name:'crcf9_name',value:'1'},{name:'crcf9_qty',value:1}]};
const bS=CW.createBody('si',clsS,'TEST-A',{meta:M,t:T,sino:1});
ok(bS.cr49f_name==='TEST-A' && bS.crcf9_freight===1 && bS.crcf9_sino===1 && bS['cr49f_sale_contract_id@odata.bind']==='/cr49f_sale_contracts('+T.contract+')' && Object.keys(bS).length===4, 'S/I 본문: 글자 · 숫자 · sino · 계약 연결');
const SID='00000000-0000-4000-8000-0000000e0001';
const bD=CW.createBody('detail',clsD,'TEST-A',{meta:M,t:T,siId:SID});
ok(bD['crcf9_s_i_id@odata.bind']==='/cr49f_s_is('+SID+')' && bD['crcf9_sale_detail_id@odata.bind']==='/cr49f_sale_details('+T.saleDetail+')' && bD['crcf9_Item_id@odata.bind']==='/cr49f_items('+T.item+')', '명세 본문: @odata.bind 3개');
const bN=CW.createBody('detail',clsD,'TEST-B',{meta:M,t:T,nested:true}); ok(!('crcf9_s_i_id@odata.bind' in bN) && bN.crcf9_name==='TEST-B', 'deep insert 안 명세: S/I 연결 없음');
const deep=Object.assign(CW.createBody('si',clsS,'TEST-B',{meta:M,t:T,sino:2}),{[M.collection]:[bN]});
const sm=CW.bodySummary(deep,M); ok(sm.fields===3 && sm.sino===2 && sm.text==='TEST-B' && Object.keys(sm.binds).length===1 && sm.details.length===1 && Object.keys(sm.details[0].binds).length===2, '본문 요약: 칸 수 · sino · 글자 · 연결 · 명세 줄');
ok(JSON.stringify(Object.keys(CW.fieldsOf(deep,M)))==='["cr49f_name","crcf9_freight","crcf9_sino"]', '쓴 값 = 연결 · 컬렉션 빼고');

console.log('만들기 문지기');
const ctx={contract:'TEST01', meta:M, write:{cr49f_s_is:['cr49f_name','crcf9_freight'], crcf9_s_i_details:['crcf9_name','crcf9_qty']}, created:{cr49f_s_is:[SID], crcf9_s_i_details:[]}};
ok(CW.guardCreate('cr49f_s_is',bS,ctx)===true && CW.guardCreate('crcf9_s_i_details',bD,ctx)===true && CW.guardCreate('cr49f_s_is',deep,ctx)===true, '허용: 방법 A S/I · 명세 · 방법 B deep insert');
const G=(set,b,c2)=>throws(()=>CW.guardCreate(set,b,c2||ctx));
ok(throws(()=>CW.guardCreate('cr49f_s_is',bS,Object.assign({},ctx,{contract:'LRS-2509CV1'})),/허용 계약 밖/), '허용 계약 밖 → 막힘');
ok(throws(()=>CW.guardCreate('cr49f_sale_contracts',{cr49f_name:'x'},ctx),/만들기 금지 엔터티/) && throws(()=>CW.guardCreate('cr49f_sale_details',{x:1},ctx),/만들기 금지 엔터티/), '판매계약 · 판매 명세 POST → 막힘');
ok(throws(()=>CW.guardCreate('cr49f_s_is',bS,Object.assign({},ctx,{meta:Object.assign({},M,{problems:['x']})})),/메타데이터/), '메타데이터 문제 있으면 → 막힘');
ok(G('cr49f_s_is',Object.assign({},bS,{'cr49f_sale_contract_id@odata.bind':'/cr49f_sale_contracts('+FC.OTHER.contract+')'})), 'S/I → 다른 계약 GUID → 막힘');
ok(G('cr49f_s_is',Object.assign({},bS,{'cr49f_sale_contract_id@odata.bind':'/cr49f_sale_details('+T.contract+')'})), 'S/I → 같은 GUID 다른 세트 → 막힘');
ok(G('crcf9_s_i_details',Object.assign({},bD,{'crcf9_Item_id@odata.bind':'/cr49f_items('+FC.OTHER.item+')'})), '명세 → 다른 품목 → 막힘');
ok(G('crcf9_s_i_details',Object.assign({},bD,{'crcf9_sale_detail_id@odata.bind':'/cr49f_sale_details('+FC.OTHER.saleDetail+')'})), '명세 → 다른 판매 명세 → 막힘');
ok(G('crcf9_s_i_details',Object.assign({},bD,{'crcf9_s_i_id@odata.bind':'/cr49f_s_is('+FX.H[0]+')'})), '명세 → 이번 실행 밖 S/I → 막힘');
const noItem=Object.assign({},bD); delete noItem['crcf9_Item_id@odata.bind']; ok(throws(()=>CW.guardCreate('crcf9_s_i_details',noItem,ctx),/연결 빠짐/), '명세 → 품목 연결 빠짐 → 막힘 (F4: 세 곳 연결이 정상)');
const noSi=Object.assign({},bD); delete noSi['crcf9_s_i_id@odata.bind']; ok(throws(()=>CW.guardCreate('crcf9_s_i_details',noSi,ctx),/S\/I 연결 빠짐/), '명세 단독 POST 에 S/I 연결 빠짐 → 막힘');
ok(G('cr49f_s_is',Object.assign({},bS,{[M.collection]:[bD]})), 'deep insert 안 명세에 S/I 연결 → 막힘');
ok(G('cr49f_s_is',Object.assign({},bS,{[M.collection]:[]})), 'deep insert 빈 컬렉션 → 막힘');
ok(G('cr49f_s_is',Object.assign({},bS,{crcf9_payment_classification:2})) && G('cr49f_s_is',Object.assign({},bS,{cr49f_name:{x:1}})) && G('cr49f_s_is',Object.assign({},bS,{crcf9_freight:2})), '쓸 칸 밖 · 이상한 값 모양 (객체 · 숫자 2) → 막힘');
const noSino=Object.assign({},bS); delete noSino.crcf9_sino; ok(throws(()=>CW.guardCreate('cr49f_s_is',noSino,ctx),/sino 빠짐/) && G('cr49f_s_is',Object.assign({},bS,{crcf9_sino:0})), 'sino 빠짐 · 0 → 막힘');
ok(G('cr49f_s_is',Object.assign({},bS,{'ownerid@odata.bind':'/systemusers('+FC.USER_ID+')'})), '다른 연결 (소유자) → 막힘');

console.log('지우기 문지기');
const dctx={contract:'TEST01', created:{cr49f_s_is:[SID], crcf9_s_i_details:['00000000-0000-4000-8000-0000000e0002']}};
ok(CW.guardDelete('cr49f_s_is',SID.toUpperCase(),dctx)===true && CW.guardDelete('crcf9_s_i_details','00000000-0000-4000-8000-0000000e0002',dctx)===true, '허용: 기록에 있는 S/I · 명세 (대소문자 무시)');
ok(throws(()=>CW.guardDelete('cr49f_s_is',FX.H[0],dctx),/실행 기록에 없는 행/), '기록에 없는 ID → 막힘');
ok(throws(()=>CW.guardDelete('crcf9_s_i_details',SID,dctx),/실행 기록에 없는 행/), 'S/I ID 를 명세 테이블로 → 막힘');
ok(throws(()=>CW.guardDelete('cr49f_sale_contracts',T.contract,dctx),/지우기 금지 엔터티/) && throws(()=>CW.guardDelete('cr49f_sale_details',T.saleDetail,dctx),/지우기 금지 엔터티/), '판매계약 · 판매 명세 세트 → 막힘');
ok(throws(()=>CW.guardDelete('crcf9_s_i_details',T.saleDetail,{contract:'TEST01',created:{crcf9_s_i_details:[T.saleDetail]}}),/지우지 않음/), '기록에 판매 명세 GUID 가 섞여도 → 막힘');
ok(throws(()=>CW.guardDelete('cr49f_s_is',SID,Object.assign({},dctx,{contract:'LRS-2509CV1'})),/허용 계약 밖/) && throws(()=>CW.guardDelete('cr49f_s_is','x',dctx),/GUID/), '허용 계약 밖 · GUID 아님 → 막힘');

console.log('기록 · 확인 · summary');
const rec=CW.createdFromLogs([{created:{cr49f_s_is:[{id:SID},{id:'bad'}],crcf9_s_i_details:[{id:'00000000-0000-4000-8000-0000000e0002'}]}},{created:{cr49f_s_is:[{id:SID.toUpperCase()}]}},null,{}]);
ok(rec.cr49f_s_is.length===1 && rec.crcf9_s_i_details.length===1, '기록 → 만든 ID (겹침 · GUID 아닌 것 · 빈 기록 제외)');
const D1='00000000-0000-4000-8000-0000000e0002', created={cr49f_s_is:[{id:SID,sino:1,method:'A',fields:{cr49f_name:'TEST-A',crcf9_freight:1,crcf9_sino:1}}], crcf9_s_i_details:[{id:D1,si:SID,method:'A',fields:{crcf9_name:'TEST-A',crcf9_qty:1}}]};
const nowOk={si:[{cr49f_s_iid:SID,crcf9_sino:1,cr49f_name:'TEST-A',crcf9_freight:1,_cr49f_sale_contract_id_value:T.contract,_createdby_value:FC.USER_ID}],
  det:[{crcf9_s_i_detailid:D1,_crcf9_s_i_id_value:SID,_crcf9_sale_detail_id_value:T.saleDetail,_crcf9_item_id_value:T.item,crcf9_name:'TEST-A',crcf9_qty:1,_createdby_value:FC.USER_ID}]};
const r1=CW.checkCreated(nowOk,created,T,FC.USER_ID); ok(r1.ok && r1.rows.length>=10, '확인: 모두 맞음 ('+r1.rows.length+'개)');
const bad=JSON.parse(JSON.stringify(nowOk)); bad.det[0]._crcf9_item_id_value=FC.OTHER.item; bad.si[0].crcf9_freight='1';
const r2=CW.checkCreated(bad,created,T,FC.USER_ID); ok(!r2.ok && r2.rows.filter(r=>!r.ok).map(r=>r.what).join('|').match(/품목 연결/) && r2.rows.some(r=>!r.ok&&/쓴 값/.test(r.what)), '확인: 품목 연결 다름 · 숫자 칸이 글자 "1" → 어긋남');
ok(!CW.checkCreated(nowOk,created,T,'00000000-0000-4000-8000-0000000000ff').ok, '확인: 만든이 다름 → 어긋남');
const extra=JSON.parse(JSON.stringify(nowOk)); extra.si.push({cr49f_s_iid:'00000000-0000-4000-8000-0000000e0099'}); ok(!CW.checkCreated(extra,created,T,FC.USER_ID).ok, '확인: TEST01 에 S/I 가 더 있음 → 어긋남');
ok(CW.sameRow({a:1,modifiedon:'x','b@x':1},{a:1,modifiedon:'y'}).length===0 && CW.sameRow({a:1},{a:2}).length===1 && CW.sameRow({a:1},null)[0].field==='(행)', '판매계약 · 판매 명세 그대로 비교 (자동 칸 · 주석 제외 · 없어짐)');
const md=CW.summaryCreateMd({run_id:'cnew_20261117T010203',version:'0.3',contract:'TEST01',contract_id:T.contract,user:'tester@example.com',started:'s',meta:M,created,deleted:{cr49f_s_is:[SID],crcf9_s_i_details:[D1]},
  steps:[{step:'방법 A — 차례로 만들기',ok:true,ms:1200,note:'n',requests:[{method:'POST',set:'cr49f_s_is',status:201,id:SID}]},{step:'지우기',ok:false,ms:300,note:'실패'}]});
ok(/방법 A — 차례로 만들기 \| ✅ 성공 \| 1\.2초/.test(md) && /방법 B — 한 번에 만들기 \| \(안 함\)/.test(md) && /지우기 \| ❌ 실패/.test(md) && /\| POST \| cr49f_s_is \| 201 \|/.test(md) && /crcf9_Item_id/.test(md) && /✦ Powered by LEENAI Automation System/.test(md), 'summary.md: 단계 결과 · 걸린 시간 · 요청 · 메타데이터 · 푸터');

console.log('unit_create pass',pass,'fail',fail); process.exitCode=fail?1:0;
