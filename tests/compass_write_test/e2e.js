/* compass_write_test 통합 시험 — jsdom + 가짜 Dataverse (메타데이터 · GET · PATCH 기록) + 가짜 SharePoint. 네트워크 없음 · 실제 COMPASS 쓰기 없음.
   node e2e.js [html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures');
const {JSDOM}=require('jsdom');
const HTML=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../compass_write_test.html'),'utf8');
const DV='https://orgde512c6f.crm7.dynamics.com/api/data/v9.2/';
let pass=0,fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m);} };
const clone=o=>JSON.parse(JSON.stringify(o));

/* 가짜 세계 — store = COMPASS 행 (PATCH 가 바꿈) · sp = SharePoint 파일 */
function world(opt){
  opt=opt||{};
  const s=FX.snapshot(), o=FX.snapshotOther();
  const store={cr49f_s_is:s.s_i.concat(o.s_i), crcf9_s_i_details:s.s_i_detail.concat(o.s_i_detail)};
  const sp={[FX.SNAP_PATH]:JSON.stringify(s), [FX.SNAP_PATH_OTHER]:JSON.stringify(o)};
  return {store, sp, patches:[], puts:[], gets:[], failPatchAt:opt.failPatchAt||0, tick:0};
}
function fakeFetch(W){
  const json=(st,body)=>({ok:st>=200&&st<300, status:st, statusText:String(st), headers:{get:()=>null}, json:async()=>clone(body), text:async()=>JSON.stringify(body)});
  return async (url, init)=>{
    init=init||{}; const method=(init.method||'GET').toUpperCase();
    if(url.indexOf(DV)===0){
      const p=decodeURIComponent(url.slice(DV.length));
      if(method==='PATCH'){
        W.patches.push({p, body:JSON.parse(init.body), ifMatch:init.headers['If-Match']});
        if(W.failPatchAt && W.patches.length===W.failPatchAt) return json(400,{error:{message:'가짜 400 (시험)'}});
        const m=p.match(/^(cr49f_s_is|crcf9_s_i_details)\(([0-9a-f-]{36})\)$/); if(!m) return json(404,{error:{message:'no entity'}});
        const id=m[1]==='cr49f_s_is'?'cr49f_s_iid':'crcf9_s_i_detailid', row=W.store[m[1]].find(r=>r[id]===m[2]); if(!row) return json(404,{error:{message:'no row'}});
        Object.assign(row, JSON.parse(init.body));
        if('crcf9_freight' in row) row.crcf9_freight_base=row.crcf9_freight; if('crcf9_price' in row) row.crcf9_price_base=row.crcf9_price;
        W.tick++; row.modifiedon='2026-11-16T10:00:'+String(W.tick).padStart(2,'0')+'Z'; row.versionnumber=(row.versionnumber||0)+100; row['@odata.etag']='W/"'+row.versionnumber+'"';
        return {ok:true,status:204,statusText:'No Content',headers:{get:()=>null},json:async()=>({})};
      }
      W.gets.push(p);
      if(/^cr49f_sale_contracts\?/.test(p)){ const no=(p.match(/cr49f_sale_contract_no eq '([^']+)'/)||[])[1];
        const id={'LRS-2509CV1':FX.CID,'LRS-2509XX9':FX.CID_OTHER}[no]; return json(200,{value:id?[{cr49f_sale_contractid:id,cr49f_sale_contract_no:no}]:[]}); }
      let m=p.match(/^EntityDefinitions\(LogicalName='([^']+)'\)\/(Attributes|Keys)(\/Microsoft\.Dynamics\.CRM\.(\w+)AttributeMetadata)?/);
      if(m){ const ent=m[1]; if(m[2]==='Keys') return json(200,{value:[{KeyAttributes:FX.KEYS[ent]||[]}]});
        if(m[4]){ const t=m[4], rg=FX.RANGES[ent]||{}; return json(200,{value:FX.META[ent].filter(a=>a.AttributeType===t).map(a=>({LogicalName:a.LogicalName,MinValue:(rg[a.LogicalName]||{}).min,MaxValue:(rg[a.LogicalName]||{}).max}))}); }
        return json(200,{value:FX.META[ent]}); }
      m=p.match(/^cr49f_s_is\?\$filter=_cr49f_sale_contract_id_value eq ([0-9a-f-]{36})/); if(m) return json(200,{value:W.store.cr49f_s_is.filter(r=>r._cr49f_sale_contract_id_value===m[1]).sort((a,b)=>a.crcf9_sino-b.crcf9_sino)});
      m=p.match(/^crcf9_s_i_details\?\$filter=_crcf9_s_i_id_value eq ([0-9a-f-]{36})/); if(m) return json(200,{value:W.store.crcf9_s_i_details.filter(r=>r._crcf9_s_i_id_value===m[1])});
      return json(404,{error:{message:'가짜 DV: 모르는 경로 '+p}});
    }
    if(url.indexOf('https://graph.microsoft.com/v1.0/drives/DRV/root:/')===0){
      const p=decodeURIComponent(url.slice('https://graph.microsoft.com/v1.0/drives/DRV/root:/'.length)).replace(/:\/content$/,'');
      if(method==='PUT'){ const body=init.body&&init.body.text?await init.body.text():String(init.body); W.sp[p]=body; W.puts.push(p); return json(201,{name:p}); }
      return W.sp[p]!=null?{ok:true,status:200,headers:{get:()=>null},json:async()=>JSON.parse(W.sp[p])}:json(404,{});
    }
    return json(599,{error:{message:'네트워크 금지: '+url}});
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
const idle=w=>until(()=>!w.eval('S.busy')&&$(w,'cwAsk').style.display!=='flex');
async function load(w,no,snapPath){ $(w,'cwNo').value=no; $(w,'cwNo').dispatchEvent(new w.Event('change')); if(snapPath) $(w,'cwSnapPath').value=snapPath; $(w,'cwLoad').click(); await sleep(5); await idle(w); }
async function answer(w,typed,btn){ await until(()=>$(w,'cwAsk').style.display==='flex'); const i=$(w,'cwAskIn'); i.value=typed; i.dispatchEvent(new w.Event('input'));
  const b0=$(w,'cwAskBtn0'), dis=b0.disabled; $(w,'cwAskBtn'+btn).click(); return dis; }
async function click(w,id,typed,btn){ $(w,id).click(); if(typed!==undefined){ const d=await answer(w,typed,btn); await sleep(5); await idle(w); return d; } await sleep(5); await idle(w); }
const original=()=>{ const s=FX.snapshot(); return {cr49f_s_is:s.s_i, crcf9_s_i_details:s.s_i_detail}; };
const sameAsOriginal=W=>{ const o=original(), strip=r=>{ const x={}; Object.keys(r).filter(k=>k.indexOf('@')<0&&['modifiedon','versionnumber'].indexOf(k)<0).forEach(k=>x[k]=r[k]); return JSON.stringify(x); };
  return ['cr49f_s_is','crcf9_s_i_details'].every(set=>o[set].every(r=>{ const id=set==='cr49f_s_is'?'cr49f_s_iid':'crcf9_s_i_detailid'; return strip(r)===strip(W.store[set].find(x=>x[id]===r[id])); })); };
const btnState=w=>['cwS1','cwS2','cwS3','cwS4','cwS5','cwS6','cwRestoreOnly'].map(id=>$(w,id).disabled?0:1).join('');

(async()=>{
  console.log('기본');
  { const W=world(), w=await page(W);
    ok(w.document.title==='LEENAI D-00 COMPASS S/I 書込試験 v0.1' && w.__cfg.redirectUri==='https://mhlee205.github.io/CONTRACT_SEND/compass_write_test.html', '제목 v0.1 · 리디렉션 URI = 이 페이지 주소');
    ok(btnState(w)==='0000000', '읽기 전: 단계 버튼 · 되돌리기만 모두 잠김');
  }
  console.log('1. 허용 목록 밖 계약');
  { const W=world(), w=await page(W); await load(w,'LRS-2509XX9',FX.SNAP_PATH_OTHER);
    ok(/허용 목록 밖/.test($(w,'cwLoadSt').textContent) && btnState(w)==='0000000', '읽기는 됨 · 쓰기 버튼 7개 모두 잠김');
    $(w,'cwS1').click(); $(w,'cwS2').click(); $(w,'cwRestoreOnly').click(); await sleep(30);
    ok(W.patches.length===0 && $(w,'cwAsk').style.display!=='flex', '잠긴 버튼 눌러도 확인 상자 · PATCH 0회');
    let err=''; try{ await w.eval(`dvPatch('cr49f_s_is','${FX.HO[0]}',{cr49f_lc_no:'1'})`); }catch(e){ err=e.message; }
    ok(/허용 계약 밖/.test(err) && W.patches.length===0, '함수를 직접 불러도 막힘 (허용 계약 밖) · PATCH 0회');
  }
  console.log('2. 다른 엔터티 PATCH');
  { const W=world(), w=await page(W); await load(w,'LRS-2509CV1');
    for(const set of ['cr49f_sale_contracts','cr49f_bookings','cr49f_s_i']){ let err=''; try{ await w.eval(`dvPatch('${set}','${FX.H[0]}',{cr49f_lc_no:'1'})`); }catch(e){ err=e.message; } ok(/쓰기 금지 엔터티/.test(err), set+' → 막힘'); }
    let err=''; try{ await w.eval(`dvPatch('cr49f_s_is','${FX.HO[0]}',{cr49f_lc_no:'1'})`); }catch(e){ err=e.message; } ok(/저장본에 없는 행/.test(err), '허용 계약 화면에서 다른 계약 행 ID → 막힘');
    ok(W.patches.length===0, 'PATCH 0회');
  }
  console.log('3. 칸 분류 (화면)');
  { const W=world(), w=await page(W); await load(w,'LRS-2509CV1');
    const t=$(w,'cwFields').textContent;
    ok(/cr49f_s_is33/.test(t.replace(/\s/g,'')) || /cr49f_s_is\s*3\s*9/.test(t), '표: S/I 3행 · 쓸 칸 9');
    ok(/crcf9_s_i_details\s*1\s*6/.test(t), '표: 명세 1행 · 쓸 칸 6');
    ok(/쓰기 → "1"/.test(t) && /쓰기 → 1/.test(t) && /건너뜀: Picklist/.test(t) && /건너뜀: Lookup/.test(t) && /건너뜀: DateTime/.test(t) && /건너뜀: 시스템 칸/.test(t), '칸 목록: 글자 "1" · 숫자 1 · Picklist · Lookup · DateTime · 시스템 칸 건너뜀');
    ok(/애매 → 건너뜀/.test(t), '애매한 종류 → 건너뜀 표시');
    ok(btnState(w)==='1000001', '읽기 뒤: 「1. 시작 확인」 · 「되돌리기만 실행」 만 열림');
    ok(W.patches.length===0 && W.puts.length===0, '읽기 단계: PATCH 0 · SharePoint 쓰기 0');
  }
  console.log('4. 시작 확인: 저장본과 다름 → 멈춤');
  { const W=world(), w=await page(W); W.store.cr49f_s_is[1].crcf9_marks='누가 바꿈'; await load(w,'LRS-2509CV1');
    await click(w,'cwS1');
    ok(/다릅니다 — 멈춤/.test($(w,'cwStepSt').textContent) && /crcf9_marks/.test($(w,'cwResult').textContent), '멈춤 · 차이 표 (crcf9_marks)');
    ok(btnState(w)==='1000001' && W.patches.length===0, '「1」 쓰기 잠김 · PATCH 0회');
    ok(W.puts.every(p=>!/before\.json$/.test(p)) && W.puts.some(p=>/log\.json$/.test(p)), 'before.json 저장 안 함 · log.json 에 기록');
  }
  console.log('5. 정상 흐름');
  { const W=world(), w=await page(W); await load(w,'LRS-2509CV1'); const t0=Date.now();
    await click(w,'cwS1'); ok(/저장본과 같음 ✅/.test($(w,'cwStepSt').textContent) && btnState(w)==='1100001', '1. 시작 확인 OK → 「1」 쓰기 열림');
    const run=w.eval('S.run.run_id'), dir=FX.SNAP_PATH.replace(/[^/]+$/,'')+run+'/';
    ok(W.puts.indexOf(dir+'before.json')>=0, 'before.json → compass_write_test/'+run+'/');
    await click(w,'cwS2',' lrs-2509cv1 ',0);
    ok(W.patches.length===4 && W.patches.every(p=>p.ifMatch==='*'), '2. 「1」 쓰기: 4행 PATCH (S/I 3 · 명세 1) · If-Match:* (없는 행 새로 만들지 않음)');
    ok(W.patches.every(p=>Object.values(p.body).every(v=>v==='1'||v===1)) && W.patches.every(p=>!('crcf9_sino' in p.body)&&!('crcf9_payment_classification' in p.body)&&!('modifiedon' in p.body)), 'PATCH 본문: 쓸 칸만 · 값은 "1"/1');
    ok(W.store.cr49f_s_is.slice(0,3).every(r=>r.crcf9_consignee==='1'&&r.crcf9_freight===1&&r.crcf9_etd===FX.snapshot().s_i[0].crcf9_etd) && W.store.cr49f_s_is[3].crcf9_consignee!=='1', '가짜 COMPASS: 대상 3행만 1 · 다른 계약 행 그대로');
    await click(w,'cwS3'); ok(/확인 ①: 쓴 칸 모두/.test($(w,'cwStepSt').textContent) && /따라 바뀐 칸 \(정상\) 4칸/.test($(w,'cwResult').textContent), '3. 확인 ① 통과 (_base 4칸은 따라 바뀜 = 정상)');
    await click(w,'cwS4','LRS-2509CV1',0); ok(W.patches.length===8, '4. 되돌리기: 4행 PATCH');
    const rb=W.patches[4].body; ok(rb.crcf9_notify_party===null && rb.crcf9_remarks===FX.snapshot().s_i[0].crcf9_remarks && rb.cr49f_lc_no==='TT REMITTANCE', '되돌리기 본문: 저장본 값 (null 은 null)');
    await click(w,'cwS5'); ok(/저장본과 완전히 같음 ✅/.test($(w,'cwStepSt').textContent), '5. 확인 ②: 완전히 같음');
    ok(sameAsOriginal(W), '가짜 COMPASS 값이 원래와 글자 단위로 같음 (줄바꿈 · # · *** · 한자 · 빈칸 · 탭 · null · 소수)');
    await click(w,'cwS6'); ok(/바뀐 행 없음/.test($(w,'cwStepSt').textContent), '감지 시험: 바뀜 없음');
    W.store.cr49f_s_is[2].modifiedon='2026-11-17T00:00:00Z'; await click(w,'cwS6');
    ok(/TOOL 밖에서 바뀐 행/.test($(w,'cwStepSt').textContent) && $(w,'cwResult').querySelectorAll('tr.cw-bad').length===1, '감지 시험: 밖에서 바꾼 1행 → 「TOOL 밖에서 바뀜」');
    const log=JSON.parse(W.sp[dir+'log.json']), md=W.sp[dir+'summary.md'];
    ok(log.user==='tester@example.com' && log.steps.map(s=>s.step).join('>')==='시작 확인>「1」 쓰기>확인 ①>되돌리기>확인 ②>밖 수정 감지 시험>밖 수정 감지 시험' && log.steps.slice(0,5).every(s=>s.ok), 'log.json: 실행자 · 단계 7개 · 모두 성공');
    ok(log.steps[1].rows.length===4 && log.steps[1].rows.every(r=>r.status===204), 'log.json: 행마다 HTTP 204');
    ok(/쓴 칸/.test(md) && /확인 ①: ✅/.test(md) && /확인 ②: ✅ 저장본과 완전히 같음/.test(md) && /걸린 시간/.test(md) && /✦ Powered by LEENAI Automation System/.test(md), 'summary.md: 쓴 칸 · 확인 ①② · 걸린 시간 · 푸터');
    console.log('   (정상 흐름 '+(Date.now()-t0)+'ms)');
  }
  console.log('6. 「1」 쓰기 중 2번째 행 실패 → 멈춤 → 되돌리기만 실행');
  { const W=world({failPatchAt:2}), w=await page(W); await load(w,'LRS-2509CV1');
    await click(w,'cwS1'); await click(w,'cwS2','LRS-2509CV1',0);
    ok(W.patches.length===2 && /실패 — 멈췄습니다/.test($(w,'cwStepSt').textContent) && /가짜 400/.test($(w,'cwResult').textContent), '2번째 행 400 → 그 자리에서 멈춤 (3·4번째 안 씀) · 메시지 표시');
    ok(W.store.cr49f_s_is[0].crcf9_consignee==='1' && W.store.cr49f_s_is[1].crcf9_consignee!=='1', '가짜 COMPASS: 1행만 바뀐 상태');
    ok(btnState(w)==='1000001', '「3. 확인 ①」 · 「4. 되돌리기」 잠김 · 「되돌리기만 실행」 열림');
    W.failPatchAt=0; await click(w,'cwRestoreOnly','LRS-2509CV1',0);
    ok(W.patches.length===6 && sameAsOriginal(W), '되돌리기만 실행: 4행 PATCH → 저장본과 같음');
    ok(/저장본과 완전히 같음 ✅/.test($(w,'cwStepSt').textContent), '되돌리기만 뒤 자동 확인 ② 통과');
    const dir=FX.SNAP_PATH.replace(/[^/]+$/,'')+w.eval('S.run.run_id')+'/', log=JSON.parse(W.sp[dir+'log.json']);
    ok(log.steps.map(s=>s.step+(s.ok?'○':'×')).join('>')==='시작 확인○>「1」 쓰기×>되돌리기만 실행○>확인 ② (되돌리기만 뒤)○', 'log.json 단계: 시작 ○ > 「1」 × > 되돌리기만 ○ > 확인 ② ○');
    ok(/HTTP 400/.test(W.sp[dir+'summary.md']), 'summary.md 실패 목록에 HTTP 400');
  }
  console.log('6b. 처음 화면에서 바로 「되돌리기만 실행」 (형님이 직접 쓰는 경우)');
  { const W=world(), w=await page(W); W.store.cr49f_s_is[0].crcf9_marks='1'; W.store.crcf9_s_i_details[0].crcf9_price=1;
    await load(w,'LRS-2509CV1'); await click(w,'cwRestoreOnly','LRS-2509CV1',0);
    ok(W.patches.length===4 && sameAsOriginal(W) && /완전히 같음/.test($(w,'cwStepSt').textContent), '읽기 → 되돌리기만 → 저장본과 같음');
  }
  console.log('7. 확인 상자 취소 · 계약번호 틀림');
  { const W=world(), w=await page(W); await load(w,'LRS-2509CV1'); await click(w,'cwS1');
    await click(w,'cwS2','LRS-2509CV1',1); ok(W.patches.length===0, '「1」 쓰기 → 취소 → PATCH 0');
    $(w,'cwS2').click(); const dis=await answer(w,'LRS-2509CV2',0); await sleep(20);
    ok(dis && $(w,'cwAsk').style.display==='flex' && W.patches.length===0, '틀린 계약번호 → 「실행」 잠김 · 눌러도 상자 그대로 · PATCH 0');
    $(w,'cwAskBtn1').click(); await idle(w);
    $(w,'cwRestoreOnly').click(); const dis2=await answer(w,'',0); await sleep(20); ok(dis2 && $(w,'cwAsk').style.display==='flex' && W.patches.length===0, '되돌리기만 → 빈 입력 → 「실행」 잠김 · PATCH 0');
    $(w,'cwAskBtn1').click(); await idle(w);
    await click(w,'cwRestoreOnly','LRS-2509CV1',1); ok(W.patches.length===0, '되돌리기만 → 취소 → PATCH 0');
  }
  console.log('8. SharePoint 쓰기 경로');
  { const all=[]; for(const f of [0,2]){ const W=world({failPatchAt:f}), w=await page(W); await load(w,'LRS-2509CV1'); await click(w,'cwS1'); await click(w,'cwS2','LRS-2509CV1',0);
      if(f){ W.failPatchAt=0; await click(w,'cwRestoreOnly','LRS-2509CV1',0); } else { await click(w,'cwS3'); await click(w,'cwS4','LRS-2509CV1',0); await click(w,'cwS5'); }
      all.push(...W.puts);
      let err=''; try{ await w.eval("spPut('古紙/-. AI 活用/D-00/A1_bench/x.json','{}','application/json')"); }catch(e){ err=e.message; } ok(/쓰기 금지 경로/.test(err), 'spPut 다른 경로 → 막힘'+(f?' (실패 흐름)':'')); }
    ok(all.length>0 && all.every(p=>/^古紙\/-\. AI 活用\/D-00\/A1_bench\/compass_write_test\/cwt_\d{8}T\d{6}\/(before\.json|log\.json|summary\.md)$/.test(p)), 'SharePoint PUT '+all.length+'회 모두 compass_write_test/{run_id}/ 아래 (before · log · summary)');
    ok(all.some(p=>/log\.json$/.test(p)) && all.some(p=>/summary\.md$/.test(p)), 'log.json · summary.md 저장됨');
  }
  console.log('e2e pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
