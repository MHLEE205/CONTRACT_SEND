/* compass_write_test v0.3 「신규 입력」 통합 시험 — jsdom + 엄격한 가짜 Dataverse (POST · DELETE · deep insert · 관계 메타데이터) + 가짜 SharePoint.
   네트워크 없음 · 실제 COMPASS 쓰기 없음.   node e2e_create.js [html]
   가짜 Dataverse 는 실제처럼 엄격: 모르는 엔터티 세트 · 모르는 탐색 이름(대소문자 구분) · 없는 행 연결 · 만들 수 없는 칸 → 400 / 명세가 붙은 S/I DELETE → 400 */
const fs=require('fs'),path=require('path'),FX=require('./fixtures'),FC=require('./fixtures_create');
const {JSDOM}=require('jsdom');
const HTML=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../compass_write_test.html'),'utf8');
const CW=new Function('module',HTML.match(/<script id="cw-core">([\s\S]*?)<\/script>/)[1]+';return CW;')(undefined);
const T=CW.CREATE_ALLOWED.TEST01;   // 도구에 적힌 TEST01 GUID (시험 파일에는 적지 않음)
const DV='https://orgde512c6f.crm7.dynamics.com/api/data/v9.2/', GR='https://graph.microsoft.com/v1.0/drives/DRV/root:/';
const SPD=CW.SP_DIR;
let pass=0,fail=0; const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':JSON.stringify(info).slice(0,400));} };
const clone=o=>JSON.parse(JSON.stringify(o));
const lc=s=>String(s).toLowerCase();

function world(opt){
  opt=opt||{};
  const sets=Object.assign({},FC.SETS,opt.sets||{}), bySet={}; Object.keys(sets).forEach(l=>{ bySet[sets[l]]=l; });
  const o2m=clone(FC.O2M); if(opt.collection) o2m.cr49f_s_i[0].ReferencedEntityNavigationPropertyName=opt.collection;
  const W={sets, bySet, o2m, posts:[], deletes:[], puts:[], gets:[], seq:0, failPostAt:opt.failPostAt||0, noRep:!!opt.noRep, tick:0,
    rows:{cr49f_sale_contracts:[{cr49f_sale_contractid:T.contract, cr49f_sale_contract_no:'TEST01', cr49f_name:'TEST01', crcf9_port:'CAT LAI', modifiedon:'2026-11-17T01:00:00Z', versionnumber:1}],
      cr49f_sale_details:[{cr49f_sale_detailid:T.saleDetail, cr49f_sale_detail_no:2491, cr49f_quantity:1, cr49f_price:1, cr49f_remarks:'test', _cr49f_item_id_value:T.item, modifiedon:'2026-11-17T01:00:00Z'}],
      cr49f_items:[{cr49f_itemid:T.item, cr49f_name:'JOCC'}],
      cr49f_s_is:[], crcf9_s_i_details:[]},
    sp:{}};
  W.rows.cr49f_sale_contracts.push({cr49f_sale_contractid:FC.OTHER.contract, cr49f_sale_contract_no:'LRS-2509XX9'});
  W.rows.cr49f_sale_details.push({cr49f_sale_detailid:FC.OTHER.saleDetail}); W.rows.cr49f_items.push({cr49f_itemid:FC.OTHER.item, cr49f_name:'OCC'});
  return W;
}
const idCol=set=>({cr49f_s_is:'cr49f_s_iid',crcf9_s_i_details:'crcf9_s_i_detailid',cr49f_sale_contracts:'cr49f_sale_contractid',cr49f_sale_details:'cr49f_sale_detailid',cr49f_items:'cr49f_itemid'})[set];
const newId=W=>'00000000-0000-4000-8000-0000000e'+String(++W.seq).padStart(4,'0');
/* 미리 남아 있는 시험 행 (이전 실행) */
function addRow(W, set, extra){ const id=newId(W), r=Object.assign({[idCol(set)]:id, _createdby_value:FC.USER_ID, createdon:'2026-11-16T00:00:00Z'}, extra); W.rows[set].push(r); return id; }

function fakeFetch(W){
  const json=(st,body,hdr)=>({ok:st>=200&&st<300, status:st, statusText:String(st), headers:{get:k=>(hdr||{})[k]||null}, json:async()=>clone(body), text:async()=>JSON.stringify(body)});
  const err=(st,msg)=>json(st,{error:{message:msg}});
  /* 본문 검사 + 행 만들기 (deep insert 는 안에서 다시 부름) */
  function build(logical, body, parent){
    const attrs=FC.META_CREATE[logical]||[], m2o=FC.M2O[logical]||[], coll=(W.o2m[logical]||[]), row={}, kids=[];
    for(const k of Object.keys(body)){
      const v=body[k];
      if(/@odata\.bind$/.test(k)){ const nav=k.replace(/@odata\.bind$/,''), rel=m2o.find(r=>r.ReferencingEntityNavigationPropertyName===nav);
        if(!rel) throw [400,"An undeclared property '"+nav+"' which only has property annotations in the payload but no property value was found in the payload."];
        const m=String(v).match(/^\/([A-Za-z0-9_]+)\(([0-9a-f-]{36})\)$/); if(!m) throw [400,'Bad bind '+v];
        if(m[1]!==W.sets[rel.ReferencedEntity]) throw [400,"Resource not found for the segment '"+m[1]+"'."];
        if(!W.rows[m[1]]||!W.rows[m[1]].some(r=>r[idCol(m[1])]===m[2])) throw [400,rel.ReferencedEntity+' With Id = '+m[2]+' Does Not Exist'];
        row['_'+rel.ReferencingAttribute+'_value']=m[2]; continue; }
      const c=coll.find(r=>r.ReferencedEntityNavigationPropertyName===k);
      if(c){ if(!Array.isArray(v)) throw [400,'collection must be array']; v.forEach(d=>kids.push([c,d])); continue; }
      const a=attrs.find(x=>x.LogicalName===k); if(!a) throw [400,"The property '"+k+"' does not exist on type 'Microsoft.Dynamics.CRM."+logical+"'."];
      if(a.IsValidForCreate===false||(a.IsValidForCreate===undefined&&a.IsValidForUpdate===false)) throw [400,'not valid for create: '+k];
      if(/Lookup|Owner|Picklist|DateTime|Uniqueidentifier/.test(a.AttributeType)) throw [400,'type '+a.AttributeType+' not expected: '+k];
      if(a.MaxLength!=null&&typeof v==='string'&&v.length>a.MaxLength) throw [400,'too long: '+k];
      row[k]=v;
    }
    if(parent) row['_'+parent.attr+'_value']=parent.id;
    return {row, kids};
  }
  function insert(logical, body, parent){
    const set=W.sets[logical], b=build(logical, body, parent), id=newId(W);
    W.tick++; Object.assign(b.row,{[idCol(set)]:id, _createdby_value:FC.USER_ID, createdon:'2026-11-17T02:00:'+String(W.tick).padStart(2,'0')+'Z', modifiedon:'2026-11-17T02:00:00Z', versionnumber:9000+W.tick});
    const made=[[set,b.row]];
    b.kids.forEach(([c,d])=>{ made.push(...insert(c.ReferencingEntity, d, {attr:c.ReferencingAttribute, id}).made); });
    return {id, row:b.row, made};
  }
  return async (url, init)=>{
    init=init||{}; const method=(init.method||'GET').toUpperCase();
    if(url.indexOf(DV)===0){
      const p=decodeURIComponent(url.slice(DV.length));
      if(method==='POST'){
        const body=JSON.parse(init.body); W.posts.push({set:p, body, prefer:(init.headers||{}).Prefer});
        if(W.failPostAt&&W.posts.length===W.failPostAt) return err(400,'가짜 400 (만들기 시험)');
        const logical=W.bySet[p]; if(!logical||!/^(cr49f_s_is|crcf9_s_i_details)$/.test(p)) return err(400,"Resource not found for the segment '"+p+"'.");
        let r; try{ r=insert(logical, body, null); }catch(e){ if(Array.isArray(e)) return err(e[0],e[1]); throw e; }
        r.made.forEach(([set,row])=>W.rows[set].push(row));
        const loc=DV.replace(/\/$/,'')+'/'+p+'('+r.id+')';
        if(!W.noRep && /return=representation/.test((init.headers||{}).Prefer||'')) return json(201,r.row,{'OData-EntityId':loc});
        return {ok:true,status:204,statusText:'No Content',headers:{get:k=>k==='OData-EntityId'?loc:null},json:async()=>{ throw new Error('no body'); }};
      }
      if(method==='DELETE'){
        W.deletes.push(p); const m=p.match(/^([A-Za-z0-9_]+)\(([0-9a-f-]{36})\)$/); if(!m||!W.rows[m[1]]) return err(400,"Resource not found for the segment '"+p+"'.");
        const i=W.rows[m[1]].findIndex(r=>r[idCol(m[1])]===m[2]); if(i<0) return err(404,'Does Not Exist');
        if(m[1]==='cr49f_s_is' && W.rows.crcf9_s_i_details.some(d=>d._crcf9_s_i_id_value===m[2])) return err(400,'The record cannot be deleted because it is associated with another record (가짜 — 명세가 붙어 있음)');
        W.rows[m[1]].splice(i,1); return {ok:true,status:204,statusText:'No Content',headers:{get:()=>null},json:async()=>({})};
      }
      if(method!=='GET') return err(405,'no');
      W.gets.push(p);
      if(p==='WhoAmI()') return json(200,{UserId:FC.USER_ID});
      let m=p.match(/^EntityDefinitions\(LogicalName='([^']+)'\)\?\$select=(.+)$/);
      if(m){ const sel=m[2].split(','), bad=sel.find(x=>['LogicalName','EntitySetName','SchemaName','MetadataId'].indexOf(x)<0); if(bad) return err(400,"Could not find a property named '"+bad+"' on type 'Microsoft.Dynamics.CRM.EntityMetadata'.");
        if(!W.sets[m[1]]) return err(404,'Could not find entity '+m[1]); return json(200,{LogicalName:m[1], EntitySetName:W.sets[m[1]]}); }
      m=p.match(/^EntityDefinitions\(LogicalName='([^']+)'\)\/(ManyToOne|OneToMany)Relationships\?\$select=(.+)$/);
      if(m){ const sel=m[3].split(','), own=['ReferencingAttribute','ReferencedEntity','ReferencingEntity','ReferencedAttribute','ReferencingEntityNavigationPropertyName','ReferencedEntityNavigationPropertyName','SchemaName','MetadataId'];
        const bad=sel.find(x=>own.indexOf(x)<0); if(bad) return err(400,"Could not find a property named '"+bad+"' on type 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata'.");
        const src=(m[2]==='ManyToOne'?FC.M2O:W.o2m)[m[1]]||[]; return json(200,{value:src.map(r=>sel.reduce((o,k)=>(o[k]=r[k]===undefined?null:r[k],o),{}))}); }
      m=p.match(/^EntityDefinitions\(LogicalName='([^']+)'\)\/(Attributes|Keys)(\/Microsoft\.Dynamics\.CRM\.(\w+)AttributeMetadata)?/);
      if(m){ const ent=m[1]; if(m[2]==='Keys') return json(200,{value:[{KeyAttributes:FX.KEYS[ent]||[]}]});
        const sel=((p.match(/\$select=([^&]+)/)||[])[1]||'').split(',').filter(Boolean), t=m[4]||'';
        const own=!t?FX.BASE_PROPS:/^(String|Memo)$/.test(t)?['LogicalName','MaxLength']:['LogicalName','MinValue','MaxValue'];
        const badp=sel.find(x=>own.indexOf(x)<0); if(badp) return err(400,"Could not find a property named '"+badp+"' on type 'Microsoft.Dynamics.CRM.AttributeMetadata'.");
        const rg=FX.RANGES[ent]||{}, full=FC.META_CREATE[ent].filter(a=>!t||a.AttributeType===t).map(a=>Object.assign({},a,{MinValue:(rg[a.LogicalName]||{}).min,MaxValue:(rg[a.LogicalName]||{}).max}));
        return json(200,{value:full.map(a=>sel.reduce((o,k)=>(o[k]=a[k]===undefined?null:a[k],o),{}))}); }
      m=p.match(/^([A-Za-z0-9_]+)\(([0-9a-f-]{36})\)$/);
      if(m){ if(!W.rows[m[1]]) return err(400,"Resource not found for the segment '"+m[1]+"'."); const r=W.rows[m[1]].find(x=>x[idCol(m[1])]===m[2]); return r?json(200,r):err(404,'Does Not Exist'); }
      m=p.match(/^([A-Za-z0-9_]+)\?\$filter=(_\w+_value) eq ([0-9a-f-]{36})/);
      if(m){ if(!W.rows[m[1]]) return err(400,"Resource not found for the segment '"+m[1]+"'.");
        return json(200,{value:W.rows[m[1]].filter(r=>r[m[2]]===m[3]).sort((a,b)=>(a.crcf9_sino||0)-(b.crcf9_sino||0))}); }
      return err(400,'가짜 DV: 모르는 경로 '+p);
    }
    if(url.indexOf(GR)===0){
      const raw=decodeURIComponent(url.slice(GR.length));
      if(/:\/children/.test(raw)){ const dir=raw.replace(/:\/children.*$/,''), names=[...new Set(Object.keys(W.sp).filter(k=>k.indexOf(dir+'/')===0).map(k=>k.slice(dir.length+1).split('/')[0]))];
        return json(200,{value:names.map(n=>({name:n, folder:{}}))}); }
      const p=raw.replace(/:\/content$/,'');
      if(method==='PUT'){ const body=init.body&&init.body.text?await init.body.text():String(init.body); W.sp[p]=body; W.puts.push(p); return json(201,{name:p}); }
      return W.sp[p]!=null?{ok:true,status:200,headers:{get:()=>null},json:async()=>JSON.parse(W.sp[p])}:json(404,{});
    }
    return err(599,'네트워크 금지: '+url);
  };
}
async function page(W){
  const FAKE='<script>window.LEENAI={auth:{token:async t=>"TOK-"+t,status:{dataverse:"ok",graph:"ok"}},user:{email:"tester@example.com"},SP:{DRIVE_ID:"DRV"},'+
    'init:function(o){ window.__cfg=o; document.title="LEENAI "+o.sys+" "+o.name+" v"+o.version; setTimeout(function(){ document.getElementById("app").style.display=""; o.onReady(); },0); }};</script>';
  const h=HTML.replace(/<script src="https:\/\/mhlee205\.github\.io\/LEENAI_COMMON\/v1\/leenai-common\.js"><\/script>/,FAKE).replace(/<link rel="stylesheet"[^>]*>/,'');
  const dom=new JSDOM(h,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){ w.fetch=fakeFetch(W); w.confirm=w.alert=()=>{ throw new Error('confirm/alert 호출됨'); }; }});
  const w=dom.window; await until(()=>w.document.getElementById('cwMain').style.display==='');
  return w;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms){ const t=Date.now(); while(!f()){ if(Date.now()-t>(ms||5000)) throw new Error('시간 초과'); await sleep(5); } }
const $=(w,id)=>w.document.getElementById(id);
const idle=w=>until(()=>!w.eval('N.busy')&&$(w,'cwAsk').style.display!=='flex');
async function answer(w,typed,btn){ await until(()=>$(w,'cwAsk').style.display==='flex'); const i=$(w,'cwAskIn'); i.value=typed; i.dispatchEvent(new w.Event('input'));
  const dis=$(w,'cwAskBtn0').disabled; $(w,'cwAskBtn'+btn).click(); return dis; }
async function click(w,id,typed,btn){ $(w,id).click(); if(typed!==undefined){ const d=await answer(w,typed,btn); await sleep(5); await idle(w); return d; } await sleep(5); await idle(w); }
const st=w=>$(w,'cnStepSt').textContent, res=w=>$(w,'cnResult').textContent;
const btns=w=>['cnS1','cnS2','cnS3','cnS4','cnS5','cnS6','cnClean'].map(id=>$(w,id).disabled?0:1).join('');
const tryEval=async(w,code)=>{ try{ await w.eval(code); return ''; }catch(e){ return e.message; } };
const logOf=(W,w)=>{ const rid=w.eval('N.run.run_id'); return {rid, log:JSON.parse(W.sp[SPD+'/'+rid+'/log.json']||'null'), md:W.sp[SPD+'/'+rid+'/summary.md']||''}; };
async function fullRun(W,w){ await click(w,'cnS1'); await click(w,'cnS2','TEST01',0); await click(w,'cnS3','TEST01',0); }

(async()=>{
  console.log('0. 기본 · 화면');
  { const W=world(), w=await page(W);
    ok(Object.keys(CW.CREATE_ALLOWED).join()==='TEST01' && [T.contract,T.saleDetail,T.item].every(CW.isGuid), 'CREATE_ALLOWED = TEST01 하나 · GUID 3개 (계약 · 판매 명세 · 품목)');
    ok($(w,'cnNo').value==='TEST01' && btns(w)==='1000000', '처음: 계약번호 TEST01 · 「1. 시작 확인」 만 열림', btns(w));
    ok(!!$(w,'cwS1') && $(w,'cwS1').disabled && !!$(w,'cwRestoreOnly'), 'v0.2 변경 시험 구역 그대로 (버튼 잠김 · 읽기 전)');
  }
  console.log('1. TEST01 밖 계약 → 잠김');
  { const W=world(), w=await page(W);
    $(w,'cnNo').value='LRS-2509CV1'; $(w,'cnNo').dispatchEvent(new w.Event('input'));
    ok(btns(w)==='0000000' && /허용 계약/.test($(w,'cnLockNote').textContent), '버튼 7개 모두 잠김 · 잠김 안내');
    ['cnS1','cnS2','cnS3','cnS5','cnClean'].forEach(id=>$(w,id).click()); await sleep(30);
    ok(W.posts.length===0 && W.deletes.length===0 && $(w,'cwAsk').style.display!=='flex', '잠긴 버튼 눌러도 확인 상자 · POST · DELETE 0');
    const e1=await tryEval(w,"dvPost('cr49f_s_is',{crcf9_sino:1})"), e2=await tryEval(w,"dvDelete('cr49f_s_is','"+FX.H[0]+"',{contract:'LRS-2509CV1',created:{cr49f_s_is:['"+FX.H[0]+"']}})");
    ok(/허용 계약 밖/.test(e1) && /허용 계약 밖/.test(e2) && W.posts.length===0 && W.deletes.length===0, '함수를 직접 불러도 막힘 (만들기 · 지우기) · 통신 0', [e1,e2]);
  }
  console.log('2. 문지기 — 다른 엔터티 · 다른 GUID · 기록에 없는 ID');
  { const W=world(), w=await page(W); await click(w,'cnS1');
    ok(/S\/I 0건 · 명세 0건 ✅/.test(st(w)), '시작 확인 통과', st(w));
    const base="Object.assign(CW.createBody('si',N.cls.cr49f_s_is,'TEST-A',{meta:N.meta,t:N.t,sino:1}),";
    const cases=[
      ['cr49f_bookings', "dvPost('cr49f_bookings',{crcf9_sino:1})", /만들기 금지 엔터티/],
      ['cr49f_sale_contracts', "dvPost('cr49f_sale_contracts',{cr49f_name:'X'})", /만들기 금지 엔터티/],
      ['cr49f_sale_details', "dvPost('cr49f_sale_details',{cr49f_remarks:'X'})", /만들기 금지 엔터티/],
      ['S/I → 다른 계약 GUID', "dvPost('cr49f_s_is',"+base+"{'cr49f_sale_contract_id@odata.bind':'/cr49f_sale_contracts("+FC.OTHER.contract+")'}))", /허용 밖 GUID 연결/],
      ['S/I → 계약 연결 빠짐', "(()=>{ const b=CW.createBody('si',N.cls.cr49f_s_is,'TEST-A',{meta:N.meta,t:N.t,sino:1}); delete b['cr49f_sale_contract_id@odata.bind']; return dvPost('cr49f_s_is',b); })()", /연결 빠짐/],
      ['S/I → 다른 연결 (통화)', "dvPost('cr49f_s_is',"+base+"{'transactioncurrencyid@odata.bind':'/transactioncurrencies("+FC.OTHER.item+")'}))", /허용 밖 연결/],
      ['S/I → 건너뛴 칸 (Picklist)', "dvPost('cr49f_s_is',"+base+"{crcf9_payment_classification:1}))", /만들 수 없는 칸/],
      ['명세 → 다른 판매 명세 GUID', "dvPost('crcf9_s_i_details',Object.assign(CW.createBody('detail',N.cls.crcf9_s_i_details,'TEST-A',{meta:N.meta,t:N.t,siId:'"+FX.H[0]+"'}),{'crcf9_sale_detail_id@odata.bind':'/cr49f_sale_details("+FC.OTHER.saleDetail+")'}))", /허용 밖 GUID 연결|이번 실행에서 만든 S\/I 가 아님/],
      ['명세 → 이번 실행 밖 S/I', "dvPost('crcf9_s_i_details',CW.createBody('detail',N.cls.crcf9_s_i_details,'TEST-A',{meta:N.meta,t:N.t,siId:'"+FX.H[0]+"'}))", /이번 실행에서 만든 S\/I 가 아님/],
      ['명세 → 다른 품목 GUID (deep insert 안)', "dvPost('cr49f_s_is',"+base+"{[N.meta.collection]:[Object.assign(CW.createBody('detail',N.cls.crcf9_s_i_details,'TEST-B',{meta:N.meta,t:N.t,nested:true}),{[N.meta.nav.item+'@odata.bind']:'/cr49f_items("+FC.OTHER.item+")'})]}))", /허용 밖 GUID 연결/],
      ['DELETE 기록에 없는 S/I', "dvDelete('cr49f_s_is','"+FX.H[0]+"',N.ctx)", /실행 기록에 없는 행/],
      ['DELETE 판매계약', "dvDelete('cr49f_sale_contracts',N.t.contract,N.ctx)", /지우기 금지 엔터티/],
      ['DELETE 판매 명세', "dvDelete('cr49f_sale_details',N.t.saleDetail,N.ctx)", /지우기 금지 엔터티/],
      ['DELETE 판매 명세 ID 를 명세 테이블로', "dvDelete('crcf9_s_i_details',N.t.saleDetail,{contract:'TEST01',created:{crcf9_s_i_details:[N.t.saleDetail]}})", /지우지 않음/]];
    for(const c of cases){ const e=await tryEval(w,c[1]); ok(c[2].test(e), c[0]+' → 막힘', e); }
    ok(W.posts.length===0 && W.deletes.length===0, 'POST 0 · DELETE 0 (모두 fetch 전에 막힘)');
  }
  console.log('3. 시작 확인: S/I 가 이미 있음 → 멈춤 · 남은 시험 행 지우기');
  { const W=world(); const s1=addRow(W,'cr49f_s_is',{crcf9_sino:1,_cr49f_sale_contract_id_value:T.contract}), d1=addRow(W,'crcf9_s_i_details',{_crcf9_s_i_id_value:s1,_crcf9_sale_detail_id_value:T.saleDetail,_crcf9_item_id_value:T.item});
    const s9=addRow(W,'cr49f_s_is',{crcf9_sino:9,_cr49f_sale_contract_id_value:T.contract});   // 기록에 없는 행 (형님이 손으로 만든 것 가정)
    W.sp[SPD+'/cnew_20261116T090000/log.json']=JSON.stringify({run_id:'cnew_20261116T090000',created:{cr49f_s_is:[{id:s1}],crcf9_s_i_details:[{id:d1}]}});
    W.sp[SPD+'/cwt_20261116T093900/log.json']=JSON.stringify({run_id:'cwt_x',created:{cr49f_s_is:[{id:s9}]}});   // 변경 시험 폴더 — 읽지 않음
    const w=await page(W); await click(w,'cnS1');
    ok(/S\/I 2건 · 명세 1건이 있습니다 — 멈춤/.test(st(w)) && W.posts.length===0, '멈춤 · POST 0', st(w));
    ok(btns(w)==='1000001', '「남은 시험 행 지우기」 만 열림 (방법 A · B · 지우기 잠김)', btns(w));
    await click(w,'cnClean','TEST01',1);
    ok(W.deletes.length===0 && /기록에 없는 행 — 지우지 않음/.test(res(w)) && res(w).indexOf(s9)>=0, '취소 → DELETE 0 · 기록에 없는 행 표시', res(w));
    await click(w,'cnClean','TEST01',0);
    ok(W.deletes.join()==='crcf9_s_i_details('+d1+'),cr49f_s_is('+s1+')', '이전 기록의 ID 만 · 명세 → S/I 순서', W.deletes);
    ok(W.rows.cr49f_s_is.length===1 && W.rows.cr49f_s_is[0].cr49f_s_iid===s9, '기록에 없는 S/I(sino 9)는 남김');
    const {log}=logOf(W,w); const cl=log.steps.find(s=>s.step==='남은 시험 행 지우기');
    ok(cl && cl.ok && cl.from_logs.join()==='cnew_20261116T090000' && cl.kept.length===1, 'log.json: 읽은 기록 cnew_ 1개 · 남긴 행 1', cl);
    await click(w,'cnS1'); ok(/S\/I 1건/.test(st(w)) && W.posts.length===0, '다시 시작 확인 → 아직 1건 (기록 밖) → 멈춤 · POST 0');
  }
  console.log('4·6·7. 정상 흐름 — 방법 A → 방법 B → 확인 → 지우기 → 최종 확인');
  { const W=world(), w=await page(W); const t0=Date.now();
    await click(w,'cnS1'); ok(btns(w)==='1100000', '시작 확인 뒤 「2. 방법 A」 열림', btns(w));
    ok(/crcf9_Item_id/.test(res(w)) && /crcf9_s_i_detail_s_i_id_cr49f_s_i/.test(res(w)) && /cr49f_items/.test(res(w)), '화면: 읽은 세트 이름 · 탐색 이름 (대소문자 그대로) · 컬렉션');
    await click(w,'cnS2','TEST01',0);
    const pa=W.posts[0], pd=W.posts[1], sA=W.rows.cr49f_s_is[0];
    ok(W.posts.length===2 && pa.set==='cr49f_s_is' && pd.set==='crcf9_s_i_details' && /return=representation/.test(pa.prefer), '방법 A: S/I POST → 명세 POST (Prefer return=representation)');
    ok(pa.body.crcf9_sino===1 && pa.body['cr49f_sale_contract_id@odata.bind']==='/cr49f_sale_contracts('+T.contract+')' && pa.body.cr49f_name==='TEST-A' && pa.body.crcf9_freight===1, 'S/I 본문: sino 1 · 계약 연결 · 글자 TEST-A · 숫자 1', pa.body);
    ok(Object.keys(pd.body).filter(k=>/@odata\.bind$/.test(k)).sort().join()==='crcf9_Item_id@odata.bind,crcf9_s_i_id@odata.bind,crcf9_sale_detail_id@odata.bind'
      && pd.body['crcf9_s_i_id@odata.bind']==='/cr49f_s_is('+sA.cr49f_s_iid+')' && pd.body['crcf9_sale_detail_id@odata.bind']==='/cr49f_sale_details('+T.saleDetail+')' && pd.body['crcf9_Item_id@odata.bind']==='/cr49f_items('+T.item+')', '명세 본문: @odata.bind 3개 (응답 S/I ID · 판매 명세 · 품목)', pd.body);
    ok(!('crcf9_noncreate' in pa.body) && pa.body.crcf9_createonly==='TEST-A' && !('crcf9_short' in pa.body) && !('crcf9_payment_classification' in pa.body) && !('createdon' in pd.body), '쓸 칸: 만들 때만 쓰는 칸 O · IsValidForCreate=false X · 짧은 칸(MaxLength 4) X · Picklist · 시스템 칸 X');
    ok(btns(w)==='1010100', '방법 A 뒤: 「3. 방법 B」 · 「5. 지우기」 열림', btns(w));
    await click(w,'cnS3','TEST01',0);
    const pb=W.posts[2], kids=pb.body['crcf9_s_i_detail_s_i_id_cr49f_s_i'];
    ok(W.posts.length===3 && pb.set==='cr49f_s_is' && pb.body.crcf9_sino===2 && pb.body.cr49f_name==='TEST-B' && Array.isArray(kids) && kids.length===1, '방법 B: POST 1번 · sino 2 · 컬렉션(F3 이름)에 명세 1줄');
    ok(kids && kids[0]['crcf9_sale_detail_id@odata.bind'] && kids[0]['crcf9_Item_id@odata.bind'] && !kids[0]['crcf9_s_i_id@odata.bind'] && kids[0].crcf9_name==='TEST-B', 'deep insert 안 명세: 판매 명세 · 품목 연결 · S/I 연결 없음 · TEST-B', kids);
    ok(W.rows.cr49f_s_is.length===2 && W.rows.crcf9_s_i_details.length===2 && W.rows.crcf9_s_i_details[1]._crcf9_s_i_id_value===W.rows.cr49f_s_is[1].cr49f_s_iid, '가짜 DV 가 명세를 같이 만듦 (S/I 2 · 명세 2)');
    const cr=w.eval('JSON.stringify(N.run.created)'); ok(JSON.parse(cr).crcf9_s_i_details.length===2 && cr.indexOf(W.rows.crcf9_s_i_details[1].crcf9_s_i_detailid)>=0, '다시 읽어 명세 ID 기록');
    await click(w,'cnS4');
    ok(/4\. 확인 ✅/.test(st(w)) && $(w,'cnResult').querySelectorAll('tr.cw-bad').length===0, '4. 확인: 모두 ✅', res(w).slice(0,400));
    ok(/판매 명세 연결/.test(res(w)) && /품목 연결/.test(res(w)) && /만든이/.test(res(w)) && /sino 2/.test(res(w)), '확인 표: 판매 명세 · 품목 연결 · 만든이 · sino');
    ok(W.deletes.length===0 && btns(w)==='1001100', '확인 뒤 멈춤 · DELETE 0 (다시 확인 · 지우기 열림)', btns(w));
    await click(w,'cnS5','TEST01',0);
    ok(W.deletes.length===4 && W.deletes.slice(0,2).every(d=>/^crcf9_s_i_details\(/.test(d)) && W.deletes.slice(2).every(d=>/^cr49f_s_is\(/.test(d)), '5. 지우기: 명세 2 → S/I 2 순서', W.deletes);
    ok(W.rows.cr49f_s_is.length===0 && W.rows.crcf9_s_i_details.length===0 && W.rows.cr49f_sale_contracts.length===2 && W.rows.cr49f_sale_details.length===2, '지운 뒤 S/I 0 · 명세 0 · 판매계약 · 판매 명세 그대로');
    ok(W.deletes.every(d=>!/sale_contract|sale_detail/.test(d)), '판매계약 · 판매 명세 DELETE 0');
    await click(w,'cnS6'); ok(/6\. 최종 확인 ✅/.test(st(w)), '6. 최종 확인 ✅', st(w));
    const {rid,log,md}=logOf(W,w);
    ok(/^cnew_\d{8}T\d{6}$/.test(rid) && W.puts.every(p=>p.indexOf(SPD+'/'+rid+'/')===0), 'SharePoint 쓰기 = compass_write_test/'+rid+'/ 아래만', W.puts);
    ok(log.steps.map(s=>s.step+(s.ok?'○':'×')).join('>')==='시작 확인○>방법 A — 차례로 만들기○>방법 B — 한 번에 만들기○>확인○>지우기○>최종 확인○', 'log.json: 단계 6개 모두 성공', log.steps.map(s=>s.step));
    ok(log.user==='tester@example.com' && log.user_id===FC.USER_ID && log.created.cr49f_s_is.length===2 && log.deleted.cr49f_s_is.length===2 && log.deleted.crcf9_s_i_details.length===2 && !!log.finished, 'log.json: 실행자 · 만든 ID · 지운 ID · 끝 시각');
    const qa=log.steps[1].requests; ok(qa.length===2 && qa[0].method==='POST' && qa[0].status===201 && CW.isGuid(qa[0].id) && qa[0].body.text==='TEST-A' && qa[0].body.binds['cr49f_sale_contract_id@odata.bind'], 'log.json 요청: 엔터티 · 본문 요약 · 응답 상태 · 만든 ID', qa[0]);
    ok(/방법 A — 차례로 만들기 \| ✅ 성공/.test(md) && /방법 B — 한 번에 만들기 \| ✅ 성공/.test(md) && /지우기 \| ✅ 성공/.test(md) && /초 \|/.test(md) && /✦ Powered by LEENAI Automation System/.test(md), 'summary.md: 방법 A · B · 지우기 결과 · 걸린 시간 · 푸터');
    console.log('   (정상 흐름 '+(Date.now()-t0)+'ms)');
  }
  console.log('5. 방법 A 명세 실패 (가짜 400) → 멈춤 · 남은 행 기록 → 지우기에서 정리');
  { const W=world({failPostAt:2}), w=await page(W); await click(w,'cnS1'); await click(w,'cnS2','TEST01',0);
    ok(W.posts.length===2 && W.rows.cr49f_s_is.length===1 && W.rows.crcf9_s_i_details.length===0 && /명세 만들기 실패 — 멈춤/.test(st(w)) && /가짜 400/.test(res(w)), 'S/I 만 만들어진 반쪽 상태 · 멈춤 · 메시지');
    const {log}=logOf(W,w); ok(log.leftover && log.leftover[0].id===W.rows.cr49f_s_is[0].cr49f_s_iid && log.created.cr49f_s_is.length===1, 'log.json: 남은 시험 행 (S/I ID) 기록');
    ok(btns(w)==='1000100', '방법 B · 확인 잠김 · 「5. 지우기」 열림', btns(w));
    await click(w,'cnS5','TEST01',0);
    ok(W.deletes.length===1 && /^cr49f_s_is\(/.test(W.deletes[0]) && W.rows.cr49f_s_is.length===0, '지우기: 남은 S/I 1행만 DELETE');
    await click(w,'cnS6'); ok(/최종 확인 ✅/.test(st(w)), '최종 확인 ✅ (S/I 0 · 명세 0 · 판매계약 · 판매 명세 그대로)');
  }
  console.log('5b. 방법 A S/I 실패 · 방법 B 실패');
  { const W=world({failPostAt:1}), w=await page(W); await click(w,'cnS1'); await click(w,'cnS2','TEST01',0);
    ok(W.posts.length===1 && W.rows.cr49f_s_is.length===0 && btns(w)==='1000000', 'S/I 만들기 400 → 멈춤 · 만든 것 없음 · 지우기도 잠김', btns(w));
    const W2=world({failPostAt:3}), w2=await page(W2); await fullRun(W2,w2);
    ok(W2.posts.length===3 && /방법 B: 만들기 실패/.test(st(w2)) && btns(w2)==='1000100', '방법 B 400 → 멈춤 · 확인 잠김 · 지우기(방법 A 행) 열림', btns(w2));
    await click(w2,'cnS5','TEST01',0); ok(W2.deletes.length===2 && W2.rows.cr49f_s_is.length===0 && W2.rows.crcf9_s_i_details.length===0, '방법 A 행만 지움 (명세 → S/I)');
  }
  console.log('7b. 확인 상자 취소 · 계약번호 틀림');
  { const W=world(), w=await page(W); await click(w,'cnS1');
    await click(w,'cnS2','TEST01',1); ok(W.posts.length===0, '방법 A → 취소 → POST 0');
    $(w,'cnS2').click(); const dis=await answer(w,'TEST02',0); await sleep(20);
    ok(dis && $(w,'cwAsk').style.display==='flex' && W.posts.length===0, '틀린 계약번호 → 「실행」 잠김 · POST 0');
    $(w,'cwAskBtn1').click(); await idle(w);
    await click(w,'cnS2',' test01 ',0); await click(w,'cnS3','TEST01',0); await click(w,'cnS5','TEST01',1);
    ok(W.deletes.length===0 && W.rows.cr49f_s_is.length===2, '지우기 → 취소 → DELETE 0');
  }
  console.log('8. 가짜 DV 엄격함 · 메타데이터');
  { const W=world(), f=fakeFetch(W);
    const r1=await f(DV+'cr49f_s_is',{method:'POST',headers:{},body:JSON.stringify({crcf9_sino:1,'crcf9_item_id@odata.bind':'/cr49f_items('+T.item+')'})});
    const r2=await f(DV+'cr49f_sis',{method:'POST',headers:{},body:JSON.stringify({crcf9_sino:1})});
    const r3=await f(DV+'crcf9_s_i_details',{method:'POST',headers:{},body:JSON.stringify({'crcf9_item_id@odata.bind':'/cr49f_items('+T.item+')'})});
    const r4=await f(DV+'cr49f_s_is',{method:'POST',headers:{},body:JSON.stringify({crcf9_sino:1,'crcf9_s_i_details':[{}]})});
    ok(r1.status===400 && r2.status===400 && r3.status===400 && r4.status===400 && W.rows.cr49f_s_is.length===0, '가짜 DV: 모르는 탐색 이름 · 모르는 세트 · 대소문자 틀린 탐색 이름 · 모르는 컬렉션 → 400');
  }
  { const W=world({sets:{cr49f_s_i:'cr49f_sis'}}), w=await page(W); await click(w,'cnS1');
    ok(/메타데이터 문제 — 만들지 않음/.test(st(w)) && /cr49f_sis/.test(st(w)) && W.posts.length===0 && btns(w)==='1000000', 'S/I 세트 이름이 다르면 시작 확인에서 멈춤 · POST 0', st(w));
  }
  { const W=world({collection:'crcf9_S_I_Detail_s_i_id'}), w=await page(W); await fullRun(W,w);
    ok(/리나이 F3/.test($(w,'cwLog').textContent) && W.posts.length===3, '컬렉션 이름이 F3 와 다름 → 경고');
    ok(W.posts[2] && Array.isArray(W.posts[2].body['crcf9_S_I_Detail_s_i_id']) && W.rows.crcf9_s_i_details.length===2, '읽은 컬렉션 이름으로 deep insert (추측 안 함)');
  }
  { const W=world({noRep:true}), w=await page(W); await fullRun(W,w); await click(w,'cnS4');
    ok(W.rows.cr49f_s_is.length===2 && /4\. 확인 ✅/.test(st(w)), '응답 본문 없음(204) → OData-EntityId 머리말에서 새 ID');
  }
  console.log('e2e_create pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
