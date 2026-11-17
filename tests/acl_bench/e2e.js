/* acl_bench 통합 시험 — jsdom + 가짜 Graph (검색 · PDF · 저장) + 가짜 Dataverse (읽기만) + node pdf.js. 네트워크 없음 · 가짜 데이터만.
   node e2e.js [html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures'),N=require('./fake_naccs'),R=require('./pdfread');
const {JSDOM}=require('jsdom');
const HTML=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../acl_bench.html'),'utf8');
const ACL=new Function('module',HTML.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const DV='https://orgde512c6f.crm7.dynamics.com/api/data/v9.2/', GR='https://graph.microsoft.com/v1.0/drives/DRV/';
let pass=0,fail=0; const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':JSON.stringify(info).slice(0,600));} };
const clone=o=>JSON.parse(JSON.stringify(o));
const WIP='/drives/DRV/root:/古紙/-. 古紙書類/▲ 書類作成中/', OLD='/drives/DRV/root:/古紙/_OLD_DOC/2026/';

/* 가짜 세계: Invoice 13건 (각각 시험 경우) */
async function world(){
  const cps={}, files=[], bytes={};
  const put=(id,name,p,mod,b)=>{ files.push({id,name,size:b?b.length:0,lastModifiedDateTime:mod,parentReference:p===null?{driveId:'DRV'}:{driveId:'DRV',path:p},file:{}}); if(b) bytes[id]=b; };
  for(let n=1;n<=13;n++){
    const cp=FX.compass(n,{containers:n===9?20:3}); cps[cp.invoice]=cp; let spec=FX.perfectSpec(ACL,cp);
    if(n===2) spec.rows[1].seal='SL999999';
    if(n===3){ spec.rows[0].bales=99; FX.retotal(spec); }
    if(n===4){ spec.rows=spec.rows.slice().reverse(); spec.order='shuffle'; }
    if(n===5){ spec.rows.push({container:'XTRU0000001',seal:'SLX00001',bales:10,cargo:9000,tare:3700,measure:40}); FX.retotal(spec); }
    if(n===6) spec.fields.booking=['BK7777777'];
    if(n===7){ spec.fields.description=spec.fields.description.filter(l=>!/^L\/C NO/.test(l)); spec.fields.consignee=spec.fields.consignee.concat(['EXTRA LINE ADDED BY FORWARDER']); }
    if(n===8) spec.fields.notify=['SAMPLE PAPER CO., LTD. NO.1 SAMPLE','ROAD, SAMPLE WARD, HO CHI MINH','CITY, VIETNAM','TEL: 84-28-0000-0000 FAX: 84-28-0000-0001'];
    if(n===10) spec={kind:'SCAN'};
    if(n===11) spec={kind:'OTHER'};
    if(n===12) spec.overflow='THIS IS A VERY LONG LINE OF TEXT THAT RUNS PAST THE DESCRIPTION CELL INTO THE NEXT CELL';
    const b=Buffer.from(await N.build(spec));
    put('f'+n, cp.invoice+'_ACL.pdf', n===4?null:WIP+cp.invoice, '2026-11-1'+(n%10)+'T00:00:00Z', b);   // 4 = 검색 결과에 path 없음 → 항목을 읽어 보충
    if(n===13) cp.noCompass=true;
  }
  put('old1','NFK2601-01_ACL.pdf',OLD+'NFK2601-01','2026-10-01T00:00:00Z',Buffer.from(await N.build({kind:'OTHER'})));   // 같은 Invoice 의 옛 파일
  put('x1','NFK2601-01_ACL.pdf','/drives/DRV/root:/古紙/-. AI 活用/D-01-LC_FD_CHECKER/履歴','2026-11-20T00:00:00Z',null);   // 대상 폴더 밖
  put('x2','NFK2601-99_ACL (1).pdf',WIP+'NFK2601-99','2026-11-20T00:00:00Z',null);   // 이름 모양 다름
  put('x3','NFK2601-01_ACL_2026-11-05.json',WIP+'NFK2601-01','2026-11-20T00:00:00Z',null);
  return {cps, files, bytes, dv:[], gr:[], puts:{}, pathLookups:0};
}
function fakeFetch(W){
  const json=(st,body,h)=>({ok:st>=200&&st<300, status:st, statusText:String(st), headers:{get:k=>(h||{})[k]||null}, json:async()=>clone(body), arrayBuffer:async()=>{ throw new Error('no'); }});
  const byInv=inv=>Object.values(W.cps).find(c=>c.invoice===inv);
  const all=()=>Object.values(W.cps);
  return async (url, init)=>{
    init=init||{}; const method=(init.method||'GET').toUpperCase();
    if(url.indexOf(DV)===0){
      const p=decodeURIComponent(url.slice(DV.length)); W.dv.push({method,p});
      if(method!=='GET') return json(405,{error:{message:'쓰기 금지 (시험)'}});
      let m=p.match(/^cr49f_bookings\?\$filter=cr49f_invoice_no eq '([^']+)'/); if(m){ const c=byInv(m[1]); return json(200,{value:c&&!c.noCompass?[c.booking]:[]}); }
      m=p.match(/^crcf9_region_japans\(([0-9a-f-]+)\)/); if(m) return json(200,{crcf9_pol:'TOKYO'});
      m=p.match(/^cr49f_regions\(([0-9a-f-]+)\)/); if(m) return json(200,{cr49f_pod:'CAT LAI'});
      m=p.match(/^crcf9_container_informations\?\$filter=_crcf9_booking_id_value eq ([0-9a-f-]+)/); if(m){ const c=all().find(c=>c.booking.cr49f_bookingid===m[1]); return json(200,{value:c?c.containers:[]}); }
      m=p.match(/^cr49f_s_is\?\$filter=_cr49f_sale_contract_id_value eq ([0-9a-f-]+)/); if(m){ const c=all().find(c=>c.booking._cr49f_sale_contract_id_value===m[1]); return json(200,{value:c?c.sis:[]}); }
      m=p.match(/^crcf9_s_i_details\?\$filter=_crcf9_s_i_id_value eq ([0-9a-f-]+)/); if(m){ const c=all().find(c=>c.details[m[1]]); return json(200,{value:c?c.details[m[1]]:[]}); }
      return json(400,{error:{message:'가짜 DV: 모르는 경로 '+p}});
    }
    if(url.indexOf(GR)===0){
      const p=decodeURIComponent(url.slice(GR.length)); W.gr.push({method,p});
      if(method==='PUT'){ const m=p.match(/^root:\/(.+):\/content$/); const body=init.body&&init.body.arrayBuffer?new TextDecoder('utf-8',{ignoreBOM:true}).decode(await init.body.arrayBuffer()):String(init.body); /* BOM 그대로 (Blob.text 는 BOM 을 지움) */ W.puts[m[1]]=body; return json(201,{name:m[1]}); }
      if(/^root\/search\(q='_ACL'\)/.test(p)){ const page2=/skiptoken=2/.test(p), list=W.files.slice(page2?8:0,page2?undefined:8);
        return json(200,{value:list.map(f=>clone(f)), '@odata.nextLink':page2?undefined:GR+"root/search(q='_ACL')?$skiptoken=2"}); }
      let m=p.match(/^items\/([^/?]+)\/content$/); if(m){ const b=W.bytes[m[1]]; if(!b) return json(404,{}); return {ok:true,status:200,headers:{get:()=>null},arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.length)}; }
      m=p.match(/^items\/([^/?]+)\?\$select=id,parentReference$/); if(m){ W.pathLookups++; const f=W.files.find(f=>f.id===m[1]); return json(200,{id:f.id,parentReference:{path:WIP+'NFK2601-04'}}); }
      return json(404,{error:{message:'가짜 Graph: 모르는 경로 '+p}});
    }
    return json(599,{error:{message:'네트워크 금지: '+url}});
  };
}
async function page(W){
  const FAKE='<script>window.LEENAI={auth:{token:async t=>"TOK-"+t,status:{dataverse:"ok",graph:"ok"}},user:{email:"tester@example.com"},SP:{DRIVE_ID:"DRV"},'+
    'init:function(o){ window.__cfg=o; document.title="LEENAI "+o.sys+" "+o.name+" v"+o.version; setTimeout(function(){ document.getElementById("app").style.display=""; o.onReady(); },0); }};</script>';
  const h=HTML.replace(/<script src="https:\/\/mhlee205\.github\.io\/LEENAI_COMMON\/v1\/leenai-common\.js"><\/script>/,FAKE).replace(/<link rel="stylesheet"[^>]*>/,'');
  const dom=new JSDOM(h,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){ w.fetch=fakeFetch(W); w.pdfjsLib=R.pdfjsForWindow(); w.confirm=w.alert=()=>{ throw new Error('confirm/alert 호출됨'); }; }});
  const w=dom.window; await until(()=>w.document.getElementById('abMain').style.display==='');
  return w;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms){ const t=Date.now(); while(!f()){ if(Date.now()-t>(ms||30000)) throw new Error('시간 초과'); await sleep(10); } }
const $=(w,id)=>w.document.getElementById(id);

(async()=>{
  const W=await world(), w=await page(W);
  const VER=(HTML.match(/version:'(\d+\.\d+)'/)||[])[1];
  ok(w.document.title==='LEENAI D-00 ACL 照合試験 v'+VER&&w.__cfg.redirectUri==='https://mhlee205.github.io/CONTRACT_SEND/acl_bench.html','제목 v'+VER+' · 리디렉션 URI = 이 페이지');
  ok($(w,'abRun').disabled&&$(w,'abSave').disabled,'처음: 照合 · 保存 잠김');
  console.log('Step 1 ACL 一覧');
  $(w,'abList').click(); await until(()=>/完了|ab-ng/.test($(w,'abListSt').innerHTML));
  const L=w.eval('JSON.stringify(S.list)'), list=JSON.parse(L);
  ok(list.targets.length===13&&list.found===16,'검색 2쪽 (다음 링크) · PDF 16개 → 대상 Invoice 13',{n:list.targets.length,found:list.found});
  const t1=list.targets.find(t=>t.invoice==='NFK2601-01');
  ok(t1.file.id==='f1'&&t1.others.map(o=>o.id).join()==='old1','같은 Invoice 2개 → 최근 1개 (옛 파일 _OLD_DOC 는 목록에만)',t1);
  ok(list.skipped.map(s=>s.why).sort().join('|')==='名前が {Invoice}_ACL.pdf でない|対象フォルダ外','대상 폴더 밖 · 이름 모양 다름 → 대상 밖 목록 (json 은 무시)',list.skipped);
  ok(W.pathLookups===1&&list.targets.find(t=>t.invoice==='NFK2601-04').file.path.indexOf('▲ 書類作成中/NFK2601-04')>0,'검색 결과에 경로 없음 → 항목을 읽어 보충');
  const fm=f=>list.targets.filter(t=>t.format===f).length;
  ok(fm('NACCS')===11&&fm('SCAN')===1&&fm('OTHER')===1,'⑧ 형식: NACCS 11 · 스캔 1 · 그 밖 1',{N:fm('NACCS'),S:fm('SCAN'),O:fm('OTHER')});
  ok(!$(w,'abRun').disabled&&/照合 11 件 \(NACCS\) · 対象外 2 件 · 予想 約 1 分/.test($(w,'abRunSt').textContent),'건수 · 예상 시간 표시 (확인 상자 없음)',$(w,'abRunSt').textContent);
  $(w,'abInv').value='nfk2601-02\nNFK2601-10'; $(w,'abInv').dispatchEvent(new w.Event('input'));
  ok(/照合 1 件 \(NACCS\) · 対象外 1 件/.test($(w,'abRunSt').textContent),'Invoice 지정 → 그 건만 (대소문자 무시)');
  $(w,'abInv').value=''; $(w,'abInv').dispatchEvent(new w.Event('input'));
  ok(W.dv.length===0&&Object.keys(W.puts).length===0,'목록 단계: COMPASS 0 · 쓰기 0');
  console.log('Step 3·4 照合');
  $(w,'abRun').click(); await until(()=>/完了|止めました/.test($(w,'abRunSt').textContent),60000);
  const R0=JSON.parse(w.eval('JSON.stringify(S.results.map(r=>({inv:r.invoice,v:r.verdict,k:r.kinds,xx:r.xx,items:r.items})))')), V=inv=>R0.find(r=>r.inv===inv);
  const exp={'NFK2601-01':'完全一致','NFK2601-02':'相違あり','NFK2601-03':'相違あり','NFK2601-04':'完全一致','NFK2601-05':'相違あり','NFK2601-06':'相違あり','NFK2601-07':'相違あり','NFK2601-08':'表記差のみ','NFK2601-09':'完全一致','NFK2601-10':'読取対象外','NFK2601-11':'読取対象外','NFK2601-12':'読取確認要','NFK2601-13':'COMPASS照会不可'};
  ok(Object.keys(exp).every(k=>V(k)&&V(k).v===exp[k]),'판정 13건 (完全一致 3 · 表記差のみ 1 · 相違あり 5 · 読取確認要 1 · 読取対象外 2 · COMPASS照会不可 1)',R0.map(r=>r.inv+':'+r.v));
  ok(V('NFK2601-01').xx.join()==='Description of Goods'&&V('NFK2601-01').k['XX残存:Description of Goods']===1,'⑦ XX 残存 별도 표시 (완전일치여도)');
  ok(V('NFK2601-02').k['セット相違:シール']===1&&!V('NFK2601-02').k['セット相違:Bales'],'② 씰만 다름 → セット相違:シール',V('NFK2601-02').k);
  ok(V('NFK2601-03').k['セット相違:Bales']===1&&V('NFK2601-03').k['合計相違:総 Bales']===1,'② Bales 만 다름 → セット相違:Bales · 합계도',V('NFK2601-03').k);
  ok(V('NFK2601-04').items.filter(i=>i.group==='コンテナ').every(i=>i.status==='MATCH'),'② 컨테이너 순서만 다름 (그리는 순서도 섞음) → 一致');
  ok(V('NFK2601-05').k['ACL のみのコンテナ']===1&&V('NFK2601-05').k['合計相違:コンテナ本数']===1,'② ACL 에만 있는 컨테이너',V('NFK2601-05').k);
  ok(V('NFK2601-06').k['BOOKING No. 相違']===1&&V('NFK2601-06').items.find(i=>i.key==='booking').actual==='BK7777777','③ 부킹 번호 다름',V('NFK2601-06').k);
  const d7=V('NFK2601-07').items.find(i=>i.key==='description'), c7=V('NFK2601-07').items.find(i=>i.key==='consignee');
  ok(d7.status==='DROP'&&/脱落行: L\/C NO\.: TLC0007 DATED ON OCT 01/.test(d7.detail)&&c7.status==='ADD'&&/追加「EXTRA LINE ADDED BY FORWARDER」/.test(c7.detail),'④ S/I 한 줄 빠짐 → 脱落 · ACL 한 줄 더 → 追加',[d7.detail,c7.detail]);
  ok(V('NFK2601-08').items.find(i=>i.key==='notify').status==='NOTATION'&&V('NFK2601-08').k['表記差:Notify Party']===1,'⑤ 줄바꿈만 다름 → 表記差');
  ok(V('NFK2601-09').items.filter(i=>/^set:/.test(i.key)).length===20,'⑦ Attached Sheet 의 컨테이너까지 20 세트');
  ok(V('NFK2601-12').k['読取確認要:Description of Goods']===1,'셀을 넘친 값 → 読取確認要');
  ok(W.dv.every(x=>x.method==='GET')&&W.dv.length>0,'COMPASS 는 GET 만 ('+W.dv.length+'회)');
  ok(!W.dv.some(x=>/NFK2601-1[01]'/.test(x.p)),'読取対象外 Invoice 는 COMPASS 를 읽지 않음');
  ok(Object.keys(W.puts).length===0,'照合 단계: 쓰기 0 (저장은 버튼 따로)');
  const kt=$(w,'abKinds').textContent;
  ok(/BOOKING No\. 相違\s*1\s*1/.test(kt)&&/セット相違:シール/.test(kt)&&/脱落:Description of Goods/.test(kt),'차이 종류 집계표',kt.slice(0,300));
  const idx=R0.findIndex(r=>r.inv==='NFK2601-07'); $(w,'abResults').querySelector('button[data-i="'+idx+'"]').click();
  ok(/ab-drop/.test($(w,'abD'+idx).innerHTML)&&/ab-add/.test($(w,'abD'+idx).innerHTML)&&$(w,'abD'+idx).style.display==='','결과 표: 항목 펼침 · 脱落/追加 색 표시');
  console.log('Step 5 保存');
  $(w,'abSaveCoords').checked=true; $(w,'abSave').click(); await until(()=>/保存:|保存失敗/.test($(w,'abSaveSt').textContent));
  const rid=w.eval('S.run.run_id'), dir=ACL.SP_OUT+'/'+rid+'/', keys=Object.keys(W.puts);
  ok(/^ACL_\d{8}-\d{6}$/.test(rid)&&keys.every(k=>k.indexOf(dir)===0),'⑨ 저장 = ACL_bench/{run_id}/ 아래만',keys);
  ok(['results.json','results.csv','summary.md'].every(f=>keys.indexOf(dir+f)>=0)&&keys.filter(k=>/\/coords\//.test(k)).length===13,'results.json · results.csv · summary.md · 좌표 13건');
  const csv=W.puts[dir+'results.csv'], md=W.puts[dir+'summary.md'], js=JSON.parse(W.puts[dir+'results.json']);
  ok(/^﻿run_id,invoice,format,verdict,group,item,status,kind,expected,actual,detail,xx\r\n/.test(csv)&&csv.split('NFK2601-10').length===2&&/BOOKING No\. 相違/.test(csv),'results.csv: Invoice × 항목 한 줄 (대상 밖은 1줄)');
  ok(/\| 完全一致 \| 3 \|/.test(md)&&/\| 相違あり \| 5 \|/.test(md)&&/\| BOOKING No\. 相違 \| 1 \| 1 \|/.test(md)&&/✦ Powered by LEENAI Automation System/.test(md),'summary.md: 판정 · 차이 종류 · 푸터');
  ok(js.results.length===13&&js.user==='tester@example.com'&&js.version===VER,'results.json: 13건 · 실행자 · 버전');
  let err=''; try{ await w.eval("spPut('古紙/-. 古紙書類/▲ 書類作成中/NFK2601-01/x.pdf','x','text/plain')"); }catch(e){ err=e.message; }
  ok(/書き込み禁止/.test(err)&&!Object.keys(W.puts).some(k=>k.indexOf('書類作成中')>=0),'⑨ 원본 폴더에 쓰기 → 막힘');
  ok(W.gr.filter(x=>x.method!=='GET').every(x=>x.method==='PUT'&&x.p.indexOf('root:/'+ACL.SP_OUT+'/')===0),'Graph 쓰기는 ACL_bench 아래 PUT 만');
  console.log('e2e pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
