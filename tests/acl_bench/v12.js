/* acl_bench v0.12 시험 (지시서 D00 B/L Draft 2단계 · CP-A01 보완 Step 1 · 2 · 5) — 가짜 데이터만 · 네트워크 없음 · 실제 거래처 · 은행 값 0
   1 비교 부품 same_text_ws 의 「:trim_end_punct」 (서류 쪽 끝 , ; : 하나 · 경계값) · 2 CP-A01 모양 · 3 bl_bench 와 함께 쓰는 부품 (cpStageRows · cpAliasSame) · 4 v0.11 과 결과 · 화면 같음 · 5 버전
   node v12.js [html] */
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


console.log('1 끝 구두점 옵션 (trim_end_punct · 형님 D1)');
{ const f=(L,R,op)=>{ const o=ACL.cpOp(op); return o.def.fn(L,R,o.p).ok; }, T='TO THE ORDER OF PT SAMPLE BANK (PERSERO) TBK.', W='same_text_ws:trim_end_punct';
  eq([f(T,T+',','same_text_ws'),f(T,T+',',W),f(T,T+';',W),f(T,T+':',W),f(T,T+', ',W),f(T,T+',\n',W),f(T,T+' ,',W)],[false,true,true,true,true,true,true],'끝 , ; : 하나 (뒤 · 앞 공백 포함) = 같음 · 옵션 없으면 다름 (v0.11 그대로)');
  eq([f(T,T+',,',W),f(T,T+'.',W),f(T.slice(0,-1),T,W),f(T,T.replace('TBK.','TBK.,')+' X',W)],[false,false,false,false],'둘 · 「.」 · 기준 쪽 「.」 없음 · 끝이 아닌 쉼표 = 다름');
  eq([f('X BANK CO., LTD.','X BANK COMPANY LIMITED',W),f('X BANK CO., LTD.','X BANK CO., LTD.,',W),f('X BANK, SEOUL','X BANK SEOUL',W)],[false,true,false],'가운데 구두점은 그대로 다름 (CO., LTD. ≠ COMPANY LIMITED · X BANK, SEOUL ≠ X BANK SEOUL)');
  eq([f(T+',',T,W)],[false],'기준 (L/C) 쪽 끝 쉼표는 빼지 않음 (서류 쪽만 — 기준은 cpConsOrder 가 이미 뺌)');
  eq([ACL.cpOp(W).name,ACL.cpOp(W).p],['same_text_ws','trim_end_punct'],'부품 이름 · 옵션 (마스터 op 칸)');
  eq(ACL.cpEndPunct('A,','x'),'A,','다른 값 (x) 은 옵션 아님');
  eq(ACL.cpEndPunct(null,'trim_end_punct'),null,'값 없음 그대로'); }

console.log('2 CP-A01 (옵션) — 끝 쉼표 모양 · 약어 풀어 씀 모양');
{ const A01b=Object.assign({},A01,{op:'same_text_ws:trim_end_punct', status:'有効', approved_by:'ADM_A', approved_at:'2026-11-23'});
  const L=LCR({bl:{consignee_text:'FULL SET OF CLEAN ON BOARD B/L MADE OUT TO THE ORDER OF PT SAMPLE BANK (PERSERO) TBK., MARKED FREIGHT PREPAID'}});
  const r1=run({lc:L, over:{consignee:'TO THE ORDER OF PT SAMPLE BANK (PERSERO) TBK.,'}, cpx:prep(BASE.concat([A01b]))}), i1=item(r1,'cp:CP-A01');
  eq([i1.status,i1.expected],['MATCH','TO THE ORDER OF PT SAMPLE BANK (PERSERO) TBK.'],'ACL 끝 「,」 하나 → 一致 (기준 = TBK. 그대로)');
  const r2=run({lc:L, over:{consignee:'TO THE ORDER OF PT SAMPLE BANK (PERSERO)TBK.,'}, cpx:prep(BASE.concat([A01b]))});
  eq(item(r2,'cp:CP-A01').status,'MATCH','(PERSERO)TBK., (공백 없음) → 一致');
  const r3=run({lc:LCR({bl:{consignee_text:'TO THE ORDER OF SAMPLE BANK PUBLIC CO., LTD., BANGKOK'}}), over:{consignee:'TO THE ORDER OF SAMPLE BANK PUBLIC COMPANY LIMITED, BANGKOK'}, cpx:prep(BASE.concat([A01b]))});
  eq(item(r3,'cp:CP-A01').status,'DIFF','CO., LTD. → COMPANY LIMITED 는 相違 그대로');
  const r4=run({lc:L, over:{consignee:'TO THE ORDER OF PT SAMPLE BANK (PERSERO) TBK.,'}, cpx:prep(BASE.concat([Object.assign({},A01,{op:'same_text_ws:trim_end_punct'})]))}), i4=item(r4,'cp:CP-A01');
  eq([i4.status,i4.trial,i4.would],['INFO',true,'MATCH'],'試験 그대로면 参考 (판정 영향 0) · 결과는 would'); }

console.log('3 공용 부품 (bl_bench 와 같은 것) — cpStageRows · cpAliasSame');
{ const P=prep(BASE.concat([Object.assign({},A01,{status:'有効', approved_by:'ADM_A'}),{id:'CP-A02', kind:'追加', stage:'ACL', pay:'ALL', scope_type:'all', scope:'ALL', left:'text:X', op:'same_text', right:'acl.booking', result:'相違', title_ja:'x', status:'試験'},
    {id:'CP-A03', kind:'追加', stage:'BL_DRAFT', pay:'TT', scope_type:'all', scope:'ALL', left:'text:X', op:'same_text', right:'acl.booking', result:'相違', title_ja:'x', status:'試験'},
    {id:'CP-A04', kind:'追加', stage:'BL_DRAFT', pay:'ALL', scope_type:'country', scope:'KOREA', left:'text:X', op:'same_text', right:'acl.booking', result:'相違', title_ja:'x', status:'試験'},
    {id:'CP-A05', kind:'追加', stage:'BL_DRAFT', pay:'ALL', scope_type:'all', scope:'ALL', left:'text:X', op:'same_text', right:'acl.booking', result:'相違', title_ja:'x', status:'停止', approved_by:'ADM_A'}]));
  eq(ACL.cpStageRows(P,'ACL',META,null).map(r=>r.id),['CP-A01','CP-A02'],'ACL 의 追加 = stage ACL');
  eq(ACL.cpStageRows(P,'BL_DRAFT',META,null).map(r=>r.id),['CP-A01'],'BL_DRAFT 의 追加 = CP-A01 만 (결제 TT · 나라 다름 · 停止 는 빠짐)');
  eq(ACL.cpStageRows(P,'BL_DRAFT',Object.assign({},META,{pay:'TT', country:'KOREA'}),null).map(r=>r.id),['CP-A03','CP-A04'],'결제 · 나라 범위');
  eq(ACL.cpStageRows(null,'ACL',META,null),[],'마스터 없음 = 없음');
  const AL=[{group:'SAMPLEPORT', name:'SAMPLEPORT', ok:true},{group:'SAMPLEPORT', name:'SAMPLE HARBOR', ok:true},{group:'OTHER', name:'OTHER HARBOR', ok:true},{group:'OTHER', name:'FAR PORT', ok:false}];
  eq([ACL.cpAliasSame(AL,'SAMPLEPORT, VIETNAM','SAMPLE HARBOR PORT'),ACL.cpAliasSame(AL,'SAMPLEPORT','OTHER HARBOR'),ACL.cpAliasSame(AL,'OTHER HARBOR','FAR PORT'),ACL.cpAliasSame([],'A','B')],['SAMPLEPORT',null,null,null],'같은 묶음 = 묶음 이름 · 다른 묶음 · 승인 안 된 별칭 · 별칭 없음 = null'); }

console.log('4 v0.11 (fcb2cc5) 과 같은 결과 (옵션 없는 마스터)');
{ let v11=null; try{ v11=cpr.execFileSync('git',['show','fcb2cc5:acl_bench.html'],{cwd:path.join(__dirname,'../..'),encoding:'utf8',maxBuffer:1e8}); }catch(e){}
  if(!v11) ok(false,'v0.11 (fcb2cc5) 을 git 에서 읽을 수 없음');
  else { const A11=new Function('module',v11.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
    const AL=[{group:'SAMPLEPORT', name:'SAMPLEPORT', approved_by:'ADM_A'},{group:'SAMPLEPORT', name:'SAMPLE HARBOR', approved_by:'ADM_A'}];
    const rowsAll=BASE.concat([A01,Object.assign({},A01,{id:'CP-A09', status:'有効', approved_by:'ADM_A'})]);
    const cases=[{},{over:{consignee:'TO ORDER OF OTHER BANK'}},{lc:null},{meta:{pay:'TT'}},{over:{pod:'OTHER PORT'}},{miss:['consignee','notify']},{over:{consignee:'TO THE ORDER OF SAMPLE BANK HO CHI MINH BRANCH,'}},{lc:LCR({pod:{text:'SAMPLE HARBOR, VIETNAM', list:['SAMPLE HARBOR']}}), over:{pod:'SAMPLEPORT', delivery:'SAMPLEPORT'}}];
    const same=cases.map(o=>{ const run1=E=>{ const cp=mk(); cp.lc=o.lc===undefined?LCR():o.lc; const m=Object.assign({},META,o.meta||{}); const P=E.cpPrepare(rowsAll, AL, {admins:E.cpAdmins(STAFF), lastBy:allBy(rowsAll.concat(AL),'adm_a@example.com')});
        const r=E.compareOne(mkAcl(cp,o.over,o.miss),cp,{meta:m, checkpoints:P}); return J(r)+E.viewHtml(r,{admin:true})+E.viewHtml(r,{}); };
      return run1(A11)===run1(ACL); });
    eq(same,cases.map(()=>true),'v0.11 엔진과 결과 · 화면 HTML 이 글자까지 같음 (8 경우 · 체크포인트 · 별칭 · 끝 쉼표 · 옵션 없는 op)'); } }

console.log('5 버전');
{ const h=fs.readFileSync(HTML,'utf8'); eq((h.match(/version:'([\d.]+)'/)||[])[1],'0.12','LEENAI.init 버전 0.12'); }
console.log('v12 pass '+pass+' fail '+fail); process.exit(fail?1:0);
