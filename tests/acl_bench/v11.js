/* acl_bench v0.11 시험 (지시서 D00 체크포인트 마스터 v1 Step 5) — 가짜 데이터만 · 네트워크 없음 · 실제 거래처 · 은행 · 항구 · L/C 값 0
   1 비교 부품 8 개 (경계값 · CO., LTD. ≠ COMPANY LIMITED · 공백 · 줄바꿈 · * 만 다름 = 같음)
   2 값 출처 (L/C 46A 의 「TO (THE) ORDER OF …」 꺼내기 · 2 회 판독 다름 · 판독 확인요 → 読取確認 · ACL 못 읽음)
   3 追加 실행 (有効 = 판정 · 試験 = 参考 (판정 영향 0) · 停止 = 실행 안 함 · 승인 안전장치 — 직원이 有効 으로 바꾼 줄 = 承認待ち) · 범위 · 결제 · 단계
   4 基本 (CP 번호 · 停止 = 参考 「停止中」 · 직원의 停止 = 그대로 실행) · 마지막 변경자 (판 기록)
   5 항구 별칭 (같은 묶음 = 表記差 · 다른 묶음 = 相違) · 6 마스터 없음 = v0.10 (af46667) 과 같은 결과 · 7 화면 (CP 표시 · 試験 줄은 관리자만) · 8 cp_trial.mjs
   node v11.js [html] */
const fs=require('fs'),path=require('path'),os=require('os'),cpr=require('child_process'),FX=require('./fixtures');
const HTML=process.argv[2]||path.join(__dirname,'../../acl_bench.html');
const ACL=new Function('module',fs.readFileSync(HTML,'utf8').match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
const item=(r,k)=>r.items.find(i=>i.key===k);
const KEYS=['shipper','consignee','notify','alsoNotify','booking','masterBl','vessel','voy','receipt','pol','pod','delivery','finalDest','hsMain','description','marks','originals','wayBill','received','freight','agentSign','shipperMail'];
function mkAcl(cp, over, miss){
  const ex=ACL.expected(cp), F={}; KEYS.forEach(k=>{ F[k]={text:'',conf:'SURE'}; });
  Object.assign(F,{shipper:{text:ex.shipper,conf:'SURE'},consignee:{text:ex.consignee,conf:'SURE'},notify:{text:ex.notify,conf:'SURE'},description:{text:ex.description,conf:'SURE'},marks:{text:ex.marks,conf:'SURE'},
    booking:{text:ex.booking,conf:'SURE'},vessel:{text:'SAMPLE STAR',conf:'SURE'},voy:{text:'101W',conf:'SURE'},receipt:{text:ex.pol,conf:'SURE'},pol:{text:ex.pol,conf:'SURE'},
    pod:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},delivery:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},originals:{text:'3',conf:'SURE'}});
  Object.keys(over||{}).forEach(k=>{ F[k]={text:over[k],conf:'SURE'}; });
  (miss||[]).forEach(k=>{ F[k]={text:'',conf:'MISSING'}; });
  const rows=cp.containers.filter(c=>c.crcf9_container_no).map(c=>({container:c.crcf9_container_no, seal:c.crcf9_seal_no, type:'GP', size:'45', bales:c.crcf9_quantity, cargo:c.crcf9_n_w, tare:c.crcf9_t_w, measure:40, conf:'SURE'}));
  return {fields:F, rows, totals:{containers:rows.length, bales:rows.reduce((s,r)=>s+r.bales,0), weight:rows.reduce((s,r)=>s+r.cargo,0)}};
}
/* 가짜 보관소 판독 (lc_read/1) */
const LCR=o=>{ const b=Object.assign({consignee_text:'MADE OUT TO THE ORDER OF SAMPLE BANK HO CHI MINH BRANCH', consignee_bank:'SAMPLE BANK HO CHI MINH BRANCH', notify_text:'NOTIFY APPLICANT', notify_is_applicant:true, notify_name_words:['SAMPLE','PAPER'], originals:3, freight:'PREPAID'},(o&&o.bl)||{});
  return Object.assign({schema:'lc_read/1', contract:'TEST-0000A1', version:1, lc_no:'TLC0006', issue_date:'2026-10-01', expiry_date:'2026-12-31', latest_shipment:'2026-12-15',
    pol:{text:'ANY JAPANESE PORT', any_japan:true}, pod:{text:'CAT LAI PORT, VIETNAM', list:['CAT LAI']}, applicant:{name:'SAMPLE PAPER CO., LTD.', address:''}, fields:{}, checks:[]}, o||{}, {bl:b}); };
const mk=()=>{ const cp=FX.compass(6); cp.sis[0].cr49f_lc_no='TLC0006'; cp.sis[0].crcf9_bl_text2=''; return cp; };
const META={pay:'LC', etd:'2026-11-20', etdSrc:'B/L date', country:'VIETNAM', buyer:'SAMPLE PAPER', buyerCode:'SPX', carrier:'SAMPLE LINE'};
const run=(o)=>{ o=o||{}; const cp=mk(); cp.lc=o.lc===undefined?LCR():o.lc; return ACL.compareOne(mkAcl(cp,o.over,o.miss),cp,Object.assign({meta:Object.assign({},META,o.meta||{})},o.cpx?{checkpoints:o.cpx}:{})); };
/* 가짜 마스터 — 직원 2 (관리자 ADM_A · 직원 STF_B) */
const STAFF=[{code:'ADM_A', name_ja:'管理 太郎', email:'adm_a@example.com', portal_admin:true},{code:'STF_B', name_ja:'職員 花子', email:'stf_b@example.com', portal_admin:false}];
const A01={id:'CP-A01', kind:'追加', stage:'ACL,BL_DRAFT,BL', pay:'LC', scope_type:'all', scope:'ALL', left:'lc.bl.consignee_text', op:'same_text_ws', right:'acl.consignee', result:'相違', title_ja:'Consignee は L/C 46A の文言どおり', status:'試験', approved_by:'', approved_at:''};
const B=(id,key,st)=>({id, kind:'基本', stage:'ACL', pay:key.indexOf('lc:')===0?'LC':'ALL', scope_type:'all', scope:'ALL', engine_key:key, title_ja:key, status:st||'有効', approved_by:'ADM_A', approved_at:'2026-11-23'});
const BASE=[B('CP-B01','booking'),B('CP-B02','set:*'),B('CP-B03','consignee'),B('CP-B04','lc:consignee_acl'),B('CP-B05','lc:pod'),B('CP-B06','final')];
const guard=(lastBy)=>({admins:ACL.cpAdmins(STAFF), lastBy});
const allBy=(rows,by)=>rows.reduce((o,r)=>(o[ACL.cpKey(r)]=by,o),{});
const prep=(rows,alias,lb)=>ACL.cpPrepare(rows, alias||[], guard(lb||allBy(rows.concat(alias||[]),'adm_a@example.com')));

console.log('1 비교 부품 8 개');
{ const O=ACL.CP_OPS, f=(n,L,R,p)=>O[n].fn(L,R,p).ok;
  eq(Object.keys(O),['same_text','same_text_ws','contains_words','not_contains','date_not_after','number_range','count_equal','format'],'부품 8 개 (이름)');
  eq([f('same_text','A B','A B'),f('same_text','A B','A  B'),f('same_text','','A')],[true,false,null],'same_text — 글자 그대로 · 빈 값 = 비교 안 함');
  eq([f('same_text_ws','TO THE ORDER OF SAMPLE BANK CO., LTD.','TO THE ORDER OF SAMPLE BANK\nCO., LTD.'),f('same_text_ws','TO ORDER OF SAMPLE BANK*','TO ORDER OF\n*SAMPLE  BANK'),
      f('same_text_ws','TO THE ORDER OF SAMPLE BANK CO., LTD.','TO THE ORDER OF SAMPLE BANK COMPANY LIMITED'),f('same_text_ws','SAMPLE BANK, SEOUL','SAMPLE BANK SEOUL'),f('same_text_ws','TO ORDER OF X','TO THE ORDER OF X')],
     [true,true,false,false,false],'same_text_ws — 공백 · 줄바꿈 · 「*」 만 무시 · CO., LTD. ≠ COMPANY LIMITED · 쉼표 · THE 는 다름');
  ok(/基準 「\.,LTD\.」/.test(O.same_text_ws.fn('X BANK CO., LTD.','X BANK COMPANY LIMITED').why),'same_text_ws — 어디서부터 다른지 상세',O.same_text_ws.fn('X BANK CO., LTD.','X BANK COMPANY LIMITED'));
  eq([f('contains_words','SAMPLE BANK SEOUL','TO THE ORDER OF SAMPLE\nBANK SEOUL BRANCH'),f('contains_words','SAMPLE BANK SEOUL','TO THE ORDER OF SAMPLE BANK')],[true,false],'contains_words — 낱말 전부 (줄바꿈 넘어) · 하나 빠지면 다름');
  eq(O.contains_words.fn('SAMPLE BANK SEOUL','SAMPLE BANK').why,'足りない語: SEOUL','contains_words — 빠진 낱말');
  eq([f('not_contains','FREIGHT AMOUNT','FREIGHT PREPAID'),f('not_contains','FREIGHT PREPAID','SHIPPED, FREIGHT PREPAID AS ARRANGED'),f('not_contains','','X')],[true,false,null],'not_contains — 없어야 함');
  eq([f('date_not_after','2026-10-15','2026-10-15'),f('date_not_after','2026-10-15','2026-10-16'),f('date_not_after','2026-10-15','2026-10-12','3'),f('date_not_after','2026-10-15','2026-10-11','3'),f('date_not_after','OCT 15, 2026','15/10/2026'),f('date_not_after','2026-10-15','')],
     [true,false,'near',true,true,null],'date_not_after — 같은 날 = 괜찮음 · 하루 뒤 = 다름 · 「:3」 = 3 일 이내 注意 · 4 일 = 一致 · 날짜 모양 · 없음');
  eq([f('number_range','100','105','5%'),f('number_range','100','105.01','5%'),f('number_range','1,000','1,100','100'),f('number_range','10','10'),f('number_range','10','10.5'),f('number_range','10','x')],[true,false,true,true,false,null],'number_range — % · 절대 폭 · 폭 없음 = 같은 수 · 경계');
  eq([f('count_equal','3','THREE (3) ORIGINALS'),f('count_equal','1','ONE ORIGINAL'),f('count_equal','3','1'),f('count_equal','3','FULL SET')],[true,true,false,null],'count_equal — 숫자 · ONE〜TEN · 없음');
  eq([f('format','{A}#{B}#{C}','0101#LIC 2#SAMPLE CO'),f('format','{A}#{B}#{C}','0101##SAMPLE'),f('format','{A}#{B}#{C}','0101#LIC 2'),f('format','/^\\d{10}#/','0101010101#X'),f('format','/^\\d{10}#/','A#X')],[true,false,false,true,false],'format — 「#」 순서 · 빈 칸 · 정규식');
  eq([ACL.cpOp('date_not_after:3').p,ACL.cpOp('number_range:5%').p,ACL.cpOp('nothing'),ACL.cpOp('same_text').p],['3','5%',null,null],'부품 이름 뒤 「:값」'); }

console.log('2 값 출처');
{ const C=ACL.cpConsOrder;
  eq([C('FULL SET OF CLEAN ON BOARD B/L MADE OUT TO THE ORDER OF SAMPLE BANK CO., LTD., SAMPLE CITY MARKED FREIGHT PREPAID AND NOTIFY APPLICANT'),C('MADE OUT OR ENDORSED TO ORDER OF SAMPLE BANK (PERSERO) TBK.'),C('MADE OUT TO THE ORDER OF SAMPLE BANK. MARKED FREIGHT'),
      C('TO ORDER OF SAMPLE BANK TBK., MARKED FREIGHT'),C('MADE OUT TO ORDER OF APPLICANT'),C('CONSIGNED TO SAMPLE PAPER CO., LTD.'),C('MADE OUT TO ORDER, NOTIFY APPLICANT')],
     ['TO THE ORDER OF SAMPLE BANK CO., LTD., SAMPLE CITY','TO ORDER OF SAMPLE BANK (PERSERO) TBK.','TO THE ORDER OF SAMPLE BANK','TO ORDER OF SAMPLE BANK TBK.',null,null,'TO ORDER'],
     'L/C 46A → 「TO (THE) ORDER OF …」 (MADE OUT / ENDORSED 빼기 · MARKED · NOTIFY 앞까지 · 끝 「,」 빼기 · 약어 마침표 남김 · ORDER OF APPLICANT · TO ORDER 없음 = null)');
  eq([ACL.cpConsFromCheck('2回判読が違う: MADE OUT TO THE ORDER OF SAMPLE BANK | TO THE ORDER OF SAMPLE BANK MARKED FREIGHT'),ACL.cpConsFromCheck('2回判読が違う: TO ORDER OF SAMPLE BANK | TO ORDER OF OTHER BANK'),ACL.cpConsFromCheck('2回判読が違う: CONSIGNED TO SAMPLE CO | SAMPLE CO')],
     [{value:'TO THE ORDER OF SAMPLE BANK', check:''},{value:null, check:'2回判読が違う: TO ORDER OF SAMPLE BANK | TO ORDER OF OTHER BANK'},{value:null, check:''}],'2 회 판독 다름 — 인용 범위만 다르면 각각에서 꺼내 같을 때 사용 · 다르면 확인요 · 둘 다 TO ORDER 없음 = 값 없음');
  const lc=LCR({fields:{latest_shipment:{check:'2回判読が違う: 2026-12-15 | 2026-12-16'}}}), V=n=>ACL.cpValue(n,{lc, ex:{consignee:'X'}, si:{cr49f_lc_no:'TLC0006','crcf9_local_agent_note@OData.Community.Display.V1.FormattedValue':'Yes',crcf9_local_agent_note:true}, booking:{cr49f_booking_no:'BK1'}, meta:{etd:'2026-11-20T00:00:00Z'}, F:{consignee:{text:'TO ORDER',conf:'SURE'}, notify:{text:'',conf:'MISSING'}, pol:{text:'X',conf:'AMBIGUOUS'}}});
  eq([V('lc.lc_no').value,V('lc.latest_shipment').value,!!V('lc.latest_shipment').check,V('lc.bl.consignee_text').value,V('si.cr49f_lc_no').value,V('si.crcf9_local_agent_note').value,V('booking.etd').value,V('booking.cr49f_booking_no').value,V('acl.consignee').value,!!V('acl.notify').check,!!V('acl.pol').check,V('text:FREIGHT PREPAID').value,V('sidoc.consignee').value,!!V('nothing.x').unknown],
     ['TLC0006',null,true,'TO THE ORDER OF SAMPLE BANK HO CHI MINH BRANCH','TLC0006','Yes','2026-11-20','BK1','TO ORDER',true,true,'FREIGHT PREPAID','X',true],'cpValue — lc · si (표시값 우선) · booking · acl (못 읽음 / 위치 애매 = 확인요) · text: · sidoc · 없는 이름');
  const cat=ACL.cpCatalog(), names=cat.map(c=>c.name);
  ok(['lc.bl.consignee_text','lc.latest_shipment','acl.consignee','booking.etd','si.cr49f_lc_no','sidoc.notify','text:…'].every(n=>names.indexOf(n)>=0)&&cat.every(c=>c.label&&c.from),'카탈로그 (보고서 · 화면의 「쓸 수 있는 이름」) '+cat.length+' 개',names); }

console.log('3 追加 실행 · 승인 안전장치');
{ const A=st=>Object.assign({},A01,{status:st, approved_by:st==='有効'||st==='停止'?'ADM_A':'', approved_at:'2026-11-23'});
  const DIF={consignee:'TO THE ORDER OF SAMPLE BANK\nHO CHI MINH CITY BRANCH'}, SAME={consignee:'TO THE ORDER OF SAMPLE BANK\nHO CHI MINH BRANCH*'};
  const v0=run({over:DIF}), on=run({over:DIF, cpx:prep([A('有効')])}), onS=run({over:SAME, cpx:prep([A('有効')])}), tr=run({over:DIF, cpx:prep([A('試験')])}), st=run({over:DIF, cpx:prep([A('停止')])});
  eq([item(on,'cp:CP-A01').status,item(on,'cp:CP-A01').kind,item(on,'cp:CP-A01').group,item(on,'cp:CP-A01').cp],['DIFF','相違:チェック:CP-A01','チェック','CP-A01'],'有効 · 다름 → 相違 (group チェック · key cp:CP-A01)');
  eq([item(onS,'cp:CP-A01').status, onS.verdict===run({over:SAME}).verdict],['MATCH',true],'有効 · 줄바꿈 · * 만 다름 → 一致 (판정 그대로)');
  eq([item(tr,'cp:CP-A01').status,item(tr,'cp:CP-A01').trial,item(tr,'cp:CP-A01').would,tr.verdict===v0.verdict,J(tr.kinds)===J(v0.kinds)],['INFO',true,'DIFF',true,true],'試験 → 参考 (trial · would=DIFF) · 판정 · 종류 영향 0');
  ok(!item(st,'cp:CP-A01')&&st.verdict===v0.verdict,'停止 → 실행 안 함');
  const staffOn=run({over:DIF, cpx:prep([A('有効')],[],{'id:CP-A01':'stf_b@example.com'})}), noAdm=run({over:DIF, cpx:prep([Object.assign(A('有効'),{approved_by:'STF_B'})])}), noVer=run({over:DIF, cpx:prep([A('有効')],[],{})});
  eq([item(staffOn,'cp:CP-A01').status,item(staffOn,'cp:CP-A01').cpState,/最後に変えた人 stf_b@example.com/.test(item(staffOn,'cp:CP-A01').detail),staffOn.verdict===v0.verdict],['INFO','承認待ち',true,true],'직원이 有効 으로 바꾼 줄 (마지막 변경자 = 직원) → 承認待ち · 판정 영향 0');
  eq([item(noAdm,'cp:CP-A01').cpState,item(noVer,'cp:CP-A01').cpState],['承認待ち','承認待ち'],'승인자가 관리자 아님 · 판 기록 없음 → 承認待ち');
  eq(ACL.cpPrepare([A('有効')],[],{trustAll:true}).rows[0].state,'有効','trustAll (cp_trial 의 미리 돌려 보기) → 有効 그대로');
  const pref=s=>run({over:DIF, meta:s, cpx:prep([Object.assign(A('有効'),s.row||{})])});
  eq([!!item(pref({pay:'TT'}),'cp:CP-A01'), !!item(pref({row:{stage:'BL_DRAFT'}}),'cp:CP-A01'), !!item(pref({row:{scope_type:'country', scope:'THAILAND'}}),'cp:CP-A01'), !!item(pref({row:{scope_type:'country', scope:'vietnam'}}),'cp:CP-A01'),
      !!item(pref({row:{scope_type:'buyer', scope:'SPX'}}),'cp:CP-A01'), !!item(pref({row:{scope_type:'carrier', scope:'OTHER LINE'}}),'cp:CP-A01'), !!item(pref({row:{scope_type:'bank', scope:'SAMPLE BANK'}}),'cp:CP-A01')],
     [false,false,false,true,true,false,true],'결제 (TT 아님) · 단계 (ACL 없음) · 범위 (국가 · 바이어 코드 · 선사 · 은행) 고르기');
  const rc=run({over:DIF, lc:LCR({bl:{consignee_text:null}, fields:{bl_consignee:{check:'2回判読が違う: TO ORDER OF SAMPLE BANK | TO ORDER OF OTHER BANK'}}}), cpx:prep([A('有効')])});
  eq([item(rc,'cp:CP-A01').status,item(rc,'cp:CP-A01').kind],['READ_CHECK','読取確認要:チェック:CP-A01'],'기준 값이 판독 확인요 → 読取確認要');
  const am=run({over:DIF, miss:['consignee'], cpx:prep([A('有効')])}), nl=run({over:DIF, lc:null, cpx:prep([A('有効')])}), na=run({over:DIF, lc:LCR({bl:{consignee_text:'CONSIGNED TO SAMPLE PAPER CO., LTD.'}}), cpx:prep([A('有効')])});
  eq([item(am,'cp:CP-A01').status,item(nl,'cp:CP-A01').status,item(na,'cp:CP-A01').status],['READ_CHECK','INFO','INFO'],'ACL 못 읽음 = 読取確認要 · L/C 판독 없음 · TO ORDER 문장 없음 = 参考 (비교 안 함)');
  const near=run({cpx:prep([{id:'CP-A09', kind:'追加', stage:'ACL', pay:'LC', scope_type:'all', left:'lc.latest_shipment', op:'date_not_after:30', right:'booking.etd', result:'相違', title_ja:'t', status:'有効', approved_by:'ADM_A'}])});
  eq([item(near,'cp:CP-A09').status,item(near,'cp:CP-A09').kind],['NOTATION','注意:チェック:CP-A09'],'date_not_after:30 — 기한 25 일 전 → 注意 (表記差 단계)');
  const bad=run({cpx:prep([Object.assign(A('有効'),{op:'no_such'}),Object.assign(A('有効'),{id:'CP-A02',left:'lc.nothing_here'}),{id:'',kind:'追加'},{id:'CP-X',kind:'その他'}])});
  eq([item(bad,'cp:CP-A01').status,item(bad,'cp:CP-A02').status,prep([{id:'',kind:'追加'},{id:'CP-X',kind:'その他'},A('試験'),A('試験')]).warnings.length],['INFO','INFO',3],'없는 부품 · 없는 값 이름 → 参考 (실행 안 함) · ID 없음 · 종류 · 중복 → 경고'); }

console.log('4 基本 (CP 번호 · 停止)');
{ const v0=run({over:{consignee:'TO ORDER OF OTHER BANK\nHO CHI MINH BRANCH'}}), r=run({over:{consignee:'TO ORDER OF OTHER BANK\nHO CHI MINH BRANCH'}, cpx:prep(BASE)});
  eq([item(r,'booking').cp,item(r,'consignee').cp,item(r,'lc:consignee_acl').cp,r.items.filter(i=>/^set:/.test(i.key)).every(i=>i.cp==='CP-B02'),item(r,'pol').cp,r.cp.map.final],['CP-B01','CP-B03','CP-B04',true,undefined,'CP-B06'],'engine_key 로 CP 번호 (set:* 앞부분 · 없는 항목 = 없음 · 最終確認 = map)');
  eq([r.verdict,J(r.kinds)],[v0.verdict,J(v0.kinds)],'CP 번호만 — 판정 · 종류 그대로');
  const s=run({over:{consignee:'TO ORDER OF OTHER BANK\nHO CHI MINH BRANCH'}, cpx:prep(BASE.map(b=>b.id==='CP-B04'||b.id==='CP-B03'?Object.assign({},b,{status:'停止'}):b))});
  eq([item(s,'lc:consignee_acl').status,/^停止中 \(CP-B04\)/.test(item(s,'lc:consignee_acl').detail),item(s,'lc:consignee_acl').stopped.status,item(s,'lc:consignee_acl').kind,s.kinds['相違:L/C:Consignee']],['INFO',true,'DIFF','',undefined],'관리자의 停止 → 参考 「停止中」 (원래 결과는 stopped 에)');
  const ss=run({over:{consignee:'TO ORDER OF OTHER BANK\nHO CHI MINH BRANCH'}, cpx:prep(BASE.map(b=>b.id==='CP-B04'?Object.assign({},b,{status:'停止'}):b),[],Object.assign(allBy(BASE,'adm_a@example.com'),{'id:CP-B04':'stf_b@example.com'}))});
  eq([item(ss,'lc:consignee_acl').status],['DIFF'],'직원이 停止 로 바꾼 基本 → 承認待ち · 그대로 실행 (相違)');
  const V=[{by:'adm_a@example.com', items:[{id:'X1',status:'有効'},{id:'X2',status:'試験'},{id:'X3',status:'有効'}]},{by:'stf_b@example.com', items:[{id:'X1',status:'試験'},{id:'X2',status:'試験'},{id:'X3',status:'有効'}]},{by:'adm_a@example.com', items:[{id:'X1',status:'試験'},{id:'X3',status:'有効'}]}];
  eq(ACL.cpLastChangers(V),{'id:X1':'adm_a@example.com','id:X2':'stf_b@example.com','id:X3':'adm_a@example.com'},'판 기록 → 줄마다 마지막 변경자 (바뀐 판의 사람 · 처음부터 같으면 가장 오래된 판)');
  eq(ACL.cpAdmins([{code:'A',email:'A@X.COM',portal_admin:'true'},{code:'B',portal_admin:false}]).has('a@x.com'),true,'관리자 = portal_admin (코드 · 메일 · 이름 — 대소문자 무시)'); }

console.log('5 항구 별칭');
{ const AP=a=>a.map(x=>Object.assign({approved_by:'ADM_A', approved_at:'2026-11-23'},x)), AL=AP([{group:'SAMPLEPORT', name:'SAMPLEPORT'},{group:'SAMPLEPORT', name:'SAMPLE HARBOR'},{group:'OTHERPORT', name:'OTHER HARBOR'}]);
  const L=LCR({pod:{text:'SAMPLE HARBOR, VIETNAM', list:['SAMPLE HARBOR']}}), cpS=()=>{ const cp=mk(); ['crcf9_pod_bl1','crcf9_place_of_delivery_1'].forEach(k=>cp.sis[0][k]='SAMPLEPORT, VIETNAM'); return cp; };
  const go=(alias,lb)=>{ const cp=cpS(); cp.lc=L; return ACL.compareOne(mkAcl(cp,{pod:'SAMPLEPORT, VIETNAM',delivery:'SAMPLEPORT, VIETNAM'}),cp,Object.assign({meta:META},alias?{checkpoints:prep(BASE,alias,lb)}:{})); };
  const v0=go(null), r=go(AL), d=go(AP([{group:'SAMPLEPORT', name:'SAMPLEPORT'},{group:'OTHERPORT', name:'SAMPLE HARBOR'}]));
  eq([item(v0,'lc:pod').status,item(r,'lc:pod').status,item(r,'lc:pod').kind,/港の別名 \(SAMPLEPORT = SAMPLE HARBOR\)/.test(item(r,'lc:pod').detail),item(r,'lc:pod').cp,item(r,'lc:delivery').status],['DIFF','NOTATION','表記差:港の別名',true,'CP-B05','NOTATION'],'같은 묶음 (SAMPLEPORT = SAMPLE HARBOR) → 表記差 「港の別名」');
  eq([item(d,'lc:pod').status],['DIFF'],'다른 묶음 → 相違 그대로');
  eq(item(go(AL.map(x=>Object.assign({},x,{approved_by:'STF_B'}))),'lc:pod').status,'DIFF','승인자가 관리자 아닌 별칭 → 쓰지 않음');
  eq(item(go(AL,Object.assign(allBy(BASE,'adm_a@example.com'),{'alias:SAMPLEPORT|SAMPLE HARBOR':'stf_b@example.com'})),'lc:pod').status,'DIFF','직원이 넣은 별칭 (마지막 변경자 = 직원) → 쓰지 않음');
  const pod=r.items.find(i=>i.key==='pod'); ok(pod&&pod.status===item(v0,'pod').status,'S/I ↔ ACL 揚地 (pod) 는 그대로 (별칭은 L/C 쪽만)'); }

console.log('6 마스터 없음 = v0.10 과 같음');
{ let v10=null; try{ v10=cpr.execFileSync('git',['show','af46667:acl_bench.html'],{cwd:path.join(__dirname,'../..'),encoding:'utf8',maxBuffer:1e8}); }catch(e){}
  if(!v10) ok(false,'v0.10 (af46667) 을 git 에서 읽을 수 없음');
  else { const A10=new Function('module',v10.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
    const cases=[{},{over:{consignee:'TO ORDER OF OTHER BANK'}},{lc:null},{meta:{pay:'TT'}},{over:{pod:'OTHER PORT'}},{miss:['consignee','notify']}];
    const same=cases.map(o=>{ const cp1=mk(), cp2=mk(); cp1.lc=cp2.lc=o.lc===undefined?LCR():o.lc; const m=Object.assign({},META,o.meta||{});
      const a=A10.compareOne(mkAcl(cp1,o.over,o.miss),cp1,{meta:m}), b=ACL.compareOne(mkAcl(cp2,o.over,o.miss),cp2,{meta:m});
      return J(a)===J(b)&&A10.viewHtml(a,{admin:true})===ACL.viewHtml(b,{admin:true})&&A10.viewHtml(a,{})===ACL.viewHtml(b,{}); });
    eq(same,cases.map(()=>true),'v0.10 엔진과 결과 · 화면 HTML 이 글자까지 같음 (6 경우 · checkpoints 없음)'); } }

console.log('7 화면');
{ const tr=run({over:{consignee:'TO THE ORDER OF SAMPLE BANK\nHO CHI MINH CITY BRANCH'}, cpx:prep(BASE.concat([A01]))});
  const ad=ACL.viewHtml(tr,{admin:true}), st=ACL.viewHtml(tr,{});
  ok(/data-cp="CP-B01"/.test(st)&&/class="av-cp"/.test(st),'CP 번호 표시 (누르면 설명 — data-cp)');
  ok(/試験 \(相違\)/.test(ad)&&/Consignee は L\/C 46A/.test(ad),'관리자 화면 = 試験 줄 「試験 (相違)」 보임');
  ok(!/Consignee は L\/C 46A/.test(st)&&!/試験/.test(st),'직원 화면 = 試験 줄 안 보임');
  ok(/最終確認 <button type="button" class="av-cp" data-cp="CP-B06"/.test(st),'最終確認 머리에 CP 번호'); }

console.log('8 cp_trial.mjs');
{ const T=path.join(__dirname,'../../tools/cp_trial.mjs'); let ck=''; try{ cpr.execFileSync(process.execPath,['--check',T]); ck='ok'; }catch(e){ ck=String(e.stderr||e); } eq(ck,'ok','문법');
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'cpt-')); ['pdf','cp','lc'].forEach(x=>fs.mkdirSync(path.join(d,x))); fs.writeFileSync(path.join(d,'list.json'),'{"targets":[]}'); fs.writeFileSync(path.join(d,'rules.json'),'[]');
  fs.writeFileSync(path.join(d,'rows.json'),J([A01]));
  let out=''; try{ out=cpr.execFileSync(process.execPath,[T,'CP-A01','--file',path.join(d,'rows.json'),'--cache',d,'--out',d],{encoding:'utf8'}); }catch(e){ out='ERR '+(e.stderr||e); }
  ok(/"line": "\d{4}-\d{2}-\d{2} ACL 0 中 0 件/.test(out)&&fs.readdirSync(d).some(f=>/^trial_CP-A01_.*\.csv$/.test(f)),'빈 자료로 실행 → 0 건 · CSV (네트워크 없음 · --file)',out.slice(0,300));
  let e2=''; try{ cpr.execFileSync(process.execPath,[T,'CP-B01','--file',path.join(d,'rows.json'),'--cache',d],{encoding:'utf8',stdio:['ignore','pipe','pipe']}); }catch(e){ e2=String(e.stderr||''); } ok(/CP-B01 がない/.test(e2),'없는 ID → 멈춤',e2);
  fs.rmSync(d,{recursive:true,force:true}); }
console.log('v11 pass '+pass+' fail '+fail); process.exitCode=fail?1:0;
