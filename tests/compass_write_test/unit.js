/* compass_write_test 단위 시험 — <script id="cw-core"> (순수 로직) 만 꺼내 node 로 실행. node unit.js [html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../compass_write_test.html'),'utf8');
const CW=new Function('module',html.match(/<script id="cw-core">([\s\S]*?)<\/script>/)[1]+';return CW;')(undefined);
let pass=0,fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m);} };
const throws=(f,re)=>{ try{ f(); return false; }catch(e){ return re?re.test(e.message):true; } };
const snap=FX.snapshot(), rows=CW.snapRows(snap);
const keysOf=set=>Object.keys(rows[set][0]).filter(k=>rows[set].every(r=>k in r));
const cls={cr49f_s_is:CW.classify(FX.META.cr49f_s_i,{ranges:FX.RANGES.cr49f_s_i,keyAttrs:FX.KEYS.cr49f_s_i,snapKeys:keysOf('cr49f_s_is')}),
  crcf9_s_i_details:CW.classify(FX.META.crcf9_s_i_detail,{ranges:FX.RANGES.crcf9_s_i_detail,keyAttrs:[],snapKeys:keysOf('crcf9_s_i_details')})};
const W=set=>cls[set].write.reduce((o,f)=>(o[f.name]=f,o),{}), why=(set,n)=>{ const s=cls[set].skip.concat(cls[set].unclear).find(x=>x.name===n); return s&&s.why; };
const hw=W('cr49f_s_is'), dw=W('crcf9_s_i_details');

console.log('③ 칸 나누기');
ok(hw.cr49f_lc_no&&hw.cr49f_lc_no.value==='1' && hw.crcf9_consignee.value==='1' && hw.cr49f_name.value==='1', '글자 (String · Memo) → "1"');
ok(hw.crcf9_gross_weight.value===1 && hw.crcf9_freight.value===1 && hw.crcf9_bales.value===1 && dw.crcf9_qty.value===1 && dw.crcf9_price.value===1, '숫자 (Integer · Decimal · Money · Double) → 1');
ok(why('cr49f_s_is','crcf9_payment_classification')==='Picklist' && why('cr49f_s_is','cr49f_sale_contract_id')==='Lookup' && why('cr49f_s_is','crcf9_etd')==='DateTime' && why('cr49f_s_is','crcf9_is_lc')==='Boolean', 'Picklist · Lookup · DateTime · Boolean → 건너뜀');
ok(['createdon','modifiedon','versionnumber','statecode','statuscode','ownerid','utcconversiontimezonecode','timezoneruleversionnumber','importsequencenumber','exchangerate','transactioncurrencyid']
  .every(n=>why('cr49f_s_is',n)==='시스템 칸'), '시스템 칸 11개 → 건너뜀 (Integer 이고 IsValidForUpdate=true 인 utcconversiontimezonecode 도)');
ok(why('cr49f_s_is','cr49f_s_iid')==='Uniqueidentifier' && why('cr49f_s_is','crcf9_freight_base')==='IsValidForUpdate=false', 'Uniqueidentifier · IsValidForUpdate=false → 건너뜀');
ok(/^딸린 칸/.test(why('cr49f_s_is','cr49f_sale_contract_idname')||'')||why('cr49f_s_is','cr49f_sale_contract_idname')==='IsValidForUpdate=false', 'AttributeOf 딸린 칸 → 건너뜀');
ok(why('cr49f_s_is','crcf9_label_calc')==='계산 칸', '계산 칸 (SourceType 1) → 건너뜀');
ok(/정하지 않은 종류/.test(why('cr49f_s_is','crcf9_img')) && cls.cr49f_s_is.unclear.some(x=>x.name==='crcf9_img'), '모르는 종류 (Virtual) → 애매 목록 · 건너뜀');
ok(/대체 키/.test(why('cr49f_s_is','crcf9_sino')) && !hw.crcf9_sino, '대체 키 칸 (sino) → 애매 · 건너뜀 (3행이 모두 1 이 되어 겹침 방지)');
ok(/허용 범위 밖/.test(why('cr49f_s_is','crcf9_level')), '숫자 범위 5~9 → 1 못 씀 → 애매 · 건너뜀');
ok(/저장본에 없음/.test(why('cr49f_s_is','crcf9_notinsnap')), '저장본에 없는 칸 → 되돌릴 값 없음 → 건너뜀');
ok(cls.cr49f_s_is.write.length===9 && cls.crcf9_s_i_details.write.length===6, '쓸 칸 수 S/I 9 · 명세 6 (가짜 메타데이터 기준)');
const k=CW.skipByKind(cls.cr49f_s_is); ok(k['시스템 칸']===11 && k['애매 → 건너뜀']===3, '종류별 건너뜀 집계: '+JSON.stringify(k));

console.log('② 쓰기 문지기');
const ctx={contract:'LRS-2509CV1', ids:CW.snapIds(snap), write:{cr49f_s_is:cls.cr49f_s_is.write.map(f=>f.name), crcf9_s_i_details:cls.crcf9_s_i_details.write.map(f=>f.name)}};
ok(CW.guardPatch('cr49f_s_is',FX.H[0],{cr49f_lc_no:'1'},ctx)===true, '허용: S/I 저장본 행 · 쓸 칸');
ok(CW.guardPatch('crcf9_s_i_details',FX.D[0],{crcf9_price:1},ctx)===true, '허용: 명세 저장본 행');
ok(throws(()=>CW.guardPatch('cr49f_sale_contracts',FX.H[0],{cr49f_lc_no:'1'},ctx),/쓰기 금지 엔터티/), '다른 엔터티 (계약) → 막힘');
ok(throws(()=>CW.guardPatch('cr49f_bookings',FX.H[0],{x:'1'},ctx),/쓰기 금지 엔터티/), '다른 엔터티 (부킹) → 막힘');
ok(throws(()=>CW.guardPatch('cr49f_s_is',FX.H[0],{cr49f_lc_no:'1'},{...ctx,contract:'LRS-2509XX9'}),/허용 계약 밖/), '허용 목록 밖 계약 → 막힘');
ok(throws(()=>CW.guardPatch('cr49f_s_is',FX.HO[0],{cr49f_lc_no:'1'},ctx),/저장본에 없는 행/), '저장본에 없는 행 (다른 계약 S/I) → 막힘');
ok(throws(()=>CW.guardPatch('cr49f_s_is',FX.D[0],{cr49f_lc_no:'1'},ctx),/저장본에 없는 행/), '명세 ID 를 S/I 테이블로 → 막힘');
ok(throws(()=>CW.guardPatch('cr49f_s_is',FX.H[0],{crcf9_payment_classification:1},ctx),/쓸 수 없는 칸/), '건너뛴 칸 (Picklist) 쓰기 → 막힘');
ok(throws(()=>CW.guardPatch('cr49f_s_is','abc',{cr49f_lc_no:'1'},ctx),/GUID/), 'GUID 아닌 ID → 막힘');
ok(throws(()=>CW.guardPatch('cr49f_s_is',FX.H[0],{},ctx),/쓸 칸 없음/), '빈 본문 → 막힘');

console.log('⑧ SharePoint 경로 문지기');
ok(CW.guardSpPath(CW.SP_DIR+'/cwt_x/log.json')===true, 'compass_write_test/ 아래 → 허용');
ok(throws(()=>CW.guardSpPath('古紙/-. AI 活用/D-00/A1_bench/cwt_x/log.json')), 'A1_bench 바로 아래 → 막힘');
ok(throws(()=>CW.guardSpPath(CW.SP_DIR+'/../x.json')), '「..」 → 막힘');
ok(throws(()=>CW.guardSpPath('古紙/LC/2026/a.pdf')), 'LC 원본 폴더 → 막힘');

console.log('저장본 검사 · 비교');
ok(CW.checkSnap(snap,'LRS-2509CV1').length===0, '정상 저장본 → 문제 0');
ok(CW.checkSnap(snap,'LRS-2509XX9').length>0, '계약번호 다름 → 문제');
const bad=FX.snapshot(); bad.s_i[1]._cr49f_sale_contract_id_value=FX.CID_OTHER; ok(CW.checkSnap(bad,'LRS-2509CV1').some(x=>/다른 계약/.test(x)), '다른 계약에 붙은 행 → 문제');
const now0={cr49f_s_is:FX.snapshot().s_i, crcf9_s_i_details:FX.snapshot().s_i_detail};
ok(CW.diffAll(snap,now0).length===0, '같은 값 → 차이 0');
const now1=JSON.parse(JSON.stringify(now0)); now1.cr49f_s_is[0].modifiedon='2099-01-01T00:00:00Z'; now1.cr49f_s_is[0].versionnumber=9; now1.cr49f_s_is[0]['@odata.etag']='W/"9"'; now1.cr49f_s_is[0]['crcf9_payment_classification'+FX.FVK]='X';
ok(CW.diffAll(snap,now1).length===0, 'modifiedon · versionnumber · etag · 주석만 다름 → 차이 0');
const now2=JSON.parse(JSON.stringify(now0)); now2.cr49f_s_is[2].crcf9_marks=now2.cr49f_s_is[2].crcf9_marks.replace('漢字','漢学');
ok(CW.diffAll(snap,now2).length===1, '한자 1글자 다름 → 차이 1');
const now3=JSON.parse(JSON.stringify(now0)); now3.cr49f_s_is[0].crcf9_remarks=now3.cr49f_s_is[0].crcf9_remarks.replace('  two','  two ');
ok(CW.diffAll(snap,now3).length===1, '빈칸 1개 다름 → 차이 1');
const now4=JSON.parse(JSON.stringify(now0)); now4.cr49f_s_is.pop(); ok(CW.diffAll(snap,now4).some(d=>d.field==='(행)'), '행 하나 없음 → 차이');
const now5=JSON.parse(JSON.stringify(now0)); now5.crcf9_s_i_details.push({...now5.crcf9_s_i_details[0],crcf9_s_i_detailid:'00000000-0000-4000-8000-00000000d0ff'}); ok(CW.diffAll(snap,now5).some(d=>d.field==='(행)'&&d.now==='있음'), '행 하나 더 있음 → 차이');
const now6=JSON.parse(JSON.stringify(now0)); now6.cr49f_s_is[0].crcf9_notify_party=''; ok(CW.diffAll(snap,now6).length===1, 'null ≠ "" (글자 단위)');

console.log('본문 · 확인 ①');
const b1=CW.bodyOne(cls.cr49f_s_is); ok(b1.crcf9_consignee==='1'&&b1.crcf9_freight===1&&!('crcf9_sino' in b1)&&!('crcf9_freight_base' in b1), '「1」 본문 = 쓸 칸만');
const br=CW.bodyRestore(cls.cr49f_s_is, snap.s_i[0]); ok(br.crcf9_notify_party===null && br.crcf9_marks===snap.s_i[0].crcf9_marks && Object.keys(br).length===9, '되돌리기 본문: 원래 값 · null 은 null · 쓴 칸만');
const nowOne=JSON.parse(JSON.stringify(now0)); ['cr49f_s_is','crcf9_s_i_details'].forEach(set=>nowOne[set].forEach(r=>{ cls[set].write.forEach(f=>{ r[f.name]=f.value; }); if('crcf9_freight_base' in r) r.crcf9_freight_base=1; if('crcf9_price_base' in r) r.crcf9_price_base=1; }));
let c1=CW.check1(snap,nowOne,cls); ok(c1.ok && c1.moved.length===4, '확인 ①: 쓴 칸 모두 1 · _base 칸 따라 바뀜(4칸) = 정상');
nowOne.cr49f_s_is[1].crcf9_etd='2030-01-01T00:00:00Z'; c1=CW.check1(snap,nowOne,cls); ok(!c1.ok && c1.bad.some(d=>d.field==='crcf9_etd'), '확인 ①: 건너뛴 칸이 바뀜 → 실패');
nowOne.cr49f_s_is[1].crcf9_etd=snap.s_i[1].crcf9_etd; nowOne.cr49f_s_is[2].cr49f_lc_no='X'; c1=CW.check1(snap,nowOne,cls); ok(!c1.ok && c1.bad.some(d=>d.field==='cr49f_lc_no'), '확인 ①: 쓴 칸이 1 아님 → 실패');
nowOne.cr49f_s_is[2].cr49f_lc_no='1'; nowOne.cr49f_s_is[2].crcf9_bales='1'; c1=CW.check1(snap,nowOne,cls); ok(!c1.ok, '확인 ①: 숫자 칸이 글자 "1" → 실패 (형까지 비교)');

console.log('밖 수정 감지');
const mm=CW.modifiedMap(now0); let dt=CW.detectOutsideChange(mm, now0); ok(!dt.changed && dt.rows.length===4, '그대로 → 바뀜 없음 (4행)');
const nowX=JSON.parse(JSON.stringify(now0)); nowX.cr49f_s_is[1].modifiedon='2026-11-17T00:00:00Z'; dt=CW.detectOutsideChange(mm, nowX);
ok(dt.changed && dt.rows.filter(r=>r.changed).length===1 && dt.rows.find(r=>r.changed).id===FX.H[1], 'modifiedon 바뀐 행 1개 → 「TOOL 밖에서 바뀜」');

console.log('기타');
ok(CW.isAllowed(' lrs-2509cv1 ') && !CW.isAllowed('LRS-2509CV2') && CW.ALLOWED.length===1, '허용 목록 = LRS-2509CV1 하나 (대소문자 · 앞뒤 빈칸 무시)');
ok(/^cwt_\d{8}T\d{6}$/.test(CW.runId(new Date('2026-11-16T09:39:00.123Z'))), 'run_id 모양 cwt_YYYYMMDDTHHMMSS');
const md=CW.summaryMd({run_id:'cwt_x',version:'0.1',contract:'LRS-2509CV1',user:'u@example.com',started:'s',snapshot_path:FX.SNAP_PATH,
  fields:{cr49f_s_is:{write:cls.cr49f_s_is.write,skip:cls.cr49f_s_is.skip,unclear:cls.cr49f_s_is.unclear}},steps:[{step:'확인 ①',ok:true,at:'a',ms:1200},{step:'확인 ②',ok:true,at:'b',ms:900}]});
ok(/쓴 칸 9/.test(md) && /crcf9_img/.test(md) && /확인 ②: ✅ 저장본과 완전히 같음/.test(md) && /✦ Powered by LEENAI Automation System/.test(md), 'summary.md: 쓴 칸 수 · 건너뛴 칸 목록 · 확인 결과 · 푸터');
console.log('unit pass',pass,'fail',fail); process.exitCode=fail?1:0;
