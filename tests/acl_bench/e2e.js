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
    if(n===5){ spec.rows.push({container:'XTRU0000008',seal:'SLX00001',bales:10,cargo:9000,tare:3700,measure:40}); FX.retotal(spec); }
    if(n===6) spec.fields.booking=['BK7777777'];
    if(n===7){ spec.fields.description=spec.fields.description.filter(l=>!/^L\/C NO/.test(l)); spec.fields.consignee=spec.fields.consignee.concat(['EXTRA LINE ADDED BY FORWARDER']); }
    if(n===8) spec.fields.notify=['SAMPLE PAPER CO., LTD. NO.1 SAMPLE','ROAD, SAMPLE WARD, HO CHI MINH','CITY, VIETNAM','TEL: 84-28-0000-0000 FAX: 84-28-0000-0001'];
    if(n===10) spec={kind:'SCAN'};
    if(n===11) spec={kind:'OTHER'};
    if(n===12) spec.overflow='THIS IS A VERY LONG LINE OF TEXT THAT RUNS PAST THE DESCRIPTION CELL INTO THE NEXT CELL';
    const b=Buffer.from(await N.build(spec));
    put('f'+n, cp.invoice+'_ACL.pdf', WIP+cp.invoice, '2026-11-1'+(n%10)+'T00:00:00Z', b);   // v0.5: 목록 = 폴더 걷기 (v0.4 의 「검색 결과에 path 없음」 경우는 없어짐)
    if(n===13) cp.noCompass=true;
  }
  /* v0.4: 03 の訂正後の版 (同じ中身 · 後の時刻) → REV を照合 · 01 のブッキングに乙仲 (レコード番号 2) */
  put('r3','NFK2601-03_ACL REV.pdf',WIP+'NFK2601-03','2026-11-14T00:00:00Z',bytes.f3);
  Object.assign(cps['NFK2601-01'].booking,{_cr49f_fowarder_id_value:FX.g('d000',2),'_cr49f_fowarder_id_value@OData.Community.Display.V1.FormattedValue':'2'});
  put('old1','NFK2601-01_ACL.pdf',OLD+'NFK2601-01','2026-10-01T00:00:00Z',Buffer.from(await N.build({kind:'OTHER'})));   // 같은 Invoice 의 옛 파일
  put('x1','NFK2601-01_ACL.pdf','/drives/DRV/root:/古紙/-. AI 活用/D-01-LC_FD_CHECKER/履歴','2026-11-20T00:00:00Z',null);   // 대상 폴더 밖
  put('x2','NFK2601-99_再輸入ACL.pdf',WIP+'NFK2601-99','2026-11-20T00:00:00Z',null);   // ACL 모양이 아닌 이름 (다른 신고) — v0.5: 무시
  put('x3','NFK2601-01_ACL_2026-11-05.json',WIP+'NFK2601-01','2026-11-20T00:00:00Z',null);
  /* v0.3 가짜 담당자 메일 CSV (가짜 회사 · 번호) — 01 本登録 · 02 訂正依頼 (씰 · 訂正前 ACL) · 06 BKG 만 · 08 訂正依頼 (도구는 表記差 → 놓침 ①) · 紐付けなし 1 */
  const q=s=>'"'+String(s).replace(/"/g,'""')+'"', H=['発信者','発信日時(JST)','月','件名','返信/転送','件名規則','宛先(To)ドメイン','CCドメイン','添付有無','添付ファイル名','インライン画像数','Invoice番号','BKG/BL番号','契約番号(LRS)','本文(先頭300字)','internetMessageId'];
  const mr=(at,rule,inv,bkg,body)=>['staff@example.test',at,'','TEST '+(inv||bkg),'',rule,'','','','','0',inv,bkg,'',body,'<x@example.test>'];
  const csv='﻿'+[H,mr('2026-11-01 10:00:00','本登録依頼','NFK2601-01','','D/Rを確認致しました。本登録お願いします。'),
    mr('2026-11-02 10:00:00','ACL/DR 確認・訂正','NFK2601-02','','Container No. TSTU0000202 Seal No SL999999 →SL000202 ご訂正をお願いします。'),
    mr('2026-11-03 10:00:00','本登録依頼','','BK1000006','本登録をお願いします。'),
    mr('2026-11-04 10:00:00','ACL/DR 確認・訂正','NFK2601-08','','Notify Party欄 SAMPLE PAPER CO., LTD →SAMPLE PAPER CO.,LTD ご訂正をお願いします。'),
    mr('2026-11-05 10:00:00','ACL/DR 確認・訂正','','ZZ0000000','ACL 本件、いかがでしょうか。')].map(r=>r.map(q).join(',')).join('\r\n')+'\r\n';
  const cb=Buffer.from(csv,'utf8'); bytes.sf1=cb;
  return {cps, files, bytes, dv:[], gr:[], puts:{}, pathLookups:0, csv, csvBytes:cb.length, noOverwrite:[],
    staffFiles:[{id:'sf1',name:'mail_docstaff_2026Q3Q4.csv',size:cb.length,lastModifiedDateTime:'2026-11-14T00:00:00Z',parentReference:{driveId:'DRV',path:'/drives/DRV/root:/古紙/-. AI 活用/D-00/ACL_bench/_input'}},
      {id:'sf0',name:'mail_docstaff_old.csv',size:1,lastModifiedDateTime:'2026-11-20T00:00:00Z',parentReference:{driveId:'DRV',path:'/drives/DRV/root:/古紙/その他'}}],
    siRule:[{scope_type:'buyer',scope:'BUYER-A',rule:'acl_freight_arranged',value:'1'},{scope_type:'country',scope:'VIETNAM',rule:'acl_agent_sign',value:'1'},{scope_type:'buyer',scope:'BUYER-A',rule:'po_vo_fixed',value:'PO'},
      /* v0.4 */ {scope_type:'all',scope:'ALL',rule:'acl_received_bl',value:''},{scope_type:'forwarder',scope:'2',rule:'acl_shipper_mail',value:'DOCS@EXAMPLE.TEST'},{scope_type:'country',scope:'VIETNAM',rule:'pod_exclude',value:'SP-TEST'}]};
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
      m=p.match(/^cr49f_sale_contracts\(([0-9a-f-]+)\)\?\$select=/); if(m){ const c=all().find(c=>c.booking._cr49f_sale_contract_id_value===m[1]); return json(200,{cr49f_sale_contract_no:'SC-'+(c?c.invoice:'?'), cr49f_pay_cls:'LC', _cr49f_buyer_id_value:FX.g('bb00',1)}); }   // v0.3 meta
      m=p.match(/^crcf9_customses\(([0-9a-f-]+)\)\?\$select=crcf9_forwarder_company,crcf9_pol$/); if(m) return json(200,{crcf9_forwarder_company:'SAMPLE FWD', crcf9_pol:'TOKYO'});   // v0.4 乙仲
      m=p.match(/^cr49f_buyers\(([0-9a-f-]+)\)\?\$select=/); if(m) return json(200,{cr49f_buyer:'BUYER-A', cr49f_buyer_code:'BA', crcf9_country:'VIETNAM'});
      return json(400,{error:{message:'가짜 DV: 모르는 경로 '+p}});
    }
    if(url.indexOf(GR)===0){
      const p=decodeURIComponent(url.slice(GR.length)); W.gr.push({method,p});
      /* v0.5: 폴더 걷기 — root:/{경로}:/children (파일의 parentReference.path 로 나무를 만든다) */
      { const m=method==='GET'&&p.match(/^root:\/(.+):\/children\?/); if(m){ W.kids=(W.kids||0)+1; const P=m[1], dirOf=f=>String(f.parentReference&&f.parentReference.path||'').replace('/drives/DRV/root:/','');
        const fs=W.files.filter(f=>dirOf(f)===P).map(f=>({id:f.id,name:f.name,size:f.size,lastModifiedDateTime:f.lastModifiedDateTime,file:{}}));
        const subs=[...new Set(W.files.map(dirOf).filter(d=>d.indexOf(P+'/')===0).map(d=>d.slice(P.length+1).split('/')[0]))].map(n=>({id:'d:'+P+'/'+n,name:n,folder:{}}));
        if(!fs.length&&!subs.length) return json(404,{error:{message:'not found'}});
        return json(200,{value:subs.concat(fs)}); } }
      if(/^root\/search\(q='mail_docstaff'\)/.test(p)) return json(200,{value:W.staffFiles.map(f=>clone(f))});   // v0.3
      if(method==='PUT'){ const m=p.match(/^root:\/(.+):\/content(\?@microsoft\.graph\.conflictBehavior=fail)?$/); if(m[2]) W.noOverwrite.push(m[1]);
        if(m[2]&&W.puts[m[1]]!=null) return json(409,{error:{message:'nameAlreadyExists'}}); const body=init.body&&init.body.arrayBuffer?new TextDecoder('utf-8',{ignoreBOM:true}).decode(await init.body.arrayBuffer()):String(init.body); /* BOM 그대로 (Blob.text 는 BOM 을 지움) */ W.puts[m[1]]=body; return json(201,{name:m[1], size:init.body&&init.body.size}); }
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
  const FAKE='<script>window.LEENAI={auth:{token:async t=>"TOK-"+t,status:{dataverse:"ok",graph:"ok"}},user:{email:"tester@example.com"},SP:{DRIVE_ID:"DRV"},master:{get:async function(n){ window.__masterGets=(window.__masterGets||[]).concat([n]); return n==="si_rule"?JSON.parse(JSON.stringify(window.__siRule)):[]; }},'+
    'init:function(o){ window.__cfg=o; document.title="LEENAI "+o.sys+" "+o.name+" v"+o.version; setTimeout(function(){ document.getElementById("app").style.display=""; o.onReady(); },0); }};</script>';
  const h=HTML.replace(/<script src="https:\/\/mhlee205\.github\.io\/LEENAI_COMMON\/v1\/leenai-common\.js"><\/script>/,FAKE).replace(/<link rel="stylesheet"[^>]*>/,'');
  const dom=new JSDOM(h,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){ w.fetch=fakeFetch(W); w.__siRule=W.siRule; w.pdfjsLib=R.pdfjsForWindow(); w.confirm=w.alert=()=>{ throw new Error('confirm/alert 호출됨'); }; }});
  const w=dom.window; await until(()=>w.document.getElementById('abMain').style.display==='');
  return w;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms){ const t=Date.now(); while(!f()){ if(Date.now()-t>(ms||30000)) throw new Error('시간 초과'); await sleep(10); } }
const $=(w,id)=>w.document.getElementById(id);

(async()=>{
  const W=await world(), w=await page(W);
  const VER=(HTML.match(/version:'(\d+(?:\.\d+)+)'/)||[])[1];
  ok(w.document.title==='LEENAI D-00 ACL 照合試験 v'+VER&&w.__cfg.redirectUri==='https://mhlee205.github.io/CONTRACT_SEND/acl_bench.html','제목 v'+VER+' · 리디렉션 URI = 이 페이지');
  ok($(w,'abRun').disabled&&$(w,'abSave').disabled,'처음: 照合 · 保存 잠김');
  console.log('Step 1 ACL 一覧');
  $(w,'abList').click(); await until(()=>/完了|ab-ng/.test($(w,'abListSt').innerHTML));
  const L=w.eval('JSON.stringify(S.list)'), list=JSON.parse(L);
  ok(list.targets.length===13&&list.folders===15&&!W.gr.some(x=>/search\(q='_ACL'\)/.test(x.p)),'v0.5 폴더 걷기: 書類作成中 14 + _OLD_DOC/2026 1 = 폴더 15 → 대상 Invoice 13 (Graph 검색 「_ACL」 안 씀)',{n:list.targets.length,folders:list.folders});
  const t1=list.targets.find(t=>t.invoice==='NFK2601-01');
  ok(t1.file.id==='f1'&&!t1.others.length&&list.skipped.some(s=>/同じ Invoice のフォルダが 2 つ/.test(s.why)&&/_OLD_DOC\/2026\/NFK2601-01/.test(s.path)),'v0.5: 같은 Invoice 폴더 2개 (書類作成中 · _OLD_DOC) → 書類作成中 것 (書類ツールと同じ) · 다른 폴더는 외한 목록에',[t1,list.skipped]);
  const t3=list.targets.find(t=>t.invoice==='NFK2601-03');
  ok(t3.file.id==='r3'&&t3.aclVersion==='REV'&&t3.others.map(o=>o.id).join()==='f3'&&/<td>REV<\/td>/.test($(w,'abListOut').innerHTML),'v0.4 Step 6: _ACL.pdf + _ACL REV.pdf → REV 를 照合 · 처음 판은 others · 一覧에 版',t3);
  ok(list.skipped.length===1&&!list.targets.some(t=>/NFK2601-99/.test(t.invoice))&&list.targets.find(t=>t.invoice==='NFK2601-04').file.path==='古紙/-. 古紙書類/▲ 書類作成中/NFK2601-04','v0.5: 대상 폴더 밖 (D-01 履歴) 은 걷지 않음 · 再輸入ACL · json 은 무시 · 경로 = 상대 경로',list.skipped);
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
  /* v0.6: Description は 内容項目で比べる → 「L/C NO.: TLC0007」 (番号の項目) が ACL に無い = 相違:Description:L/C (v0.5 までは 脱落行) */
  ok(d7.status==='DIFF'&&d7.kind==='相違:Description:L/C'&&/脱落「L\/C NO\.: TLC0007」/.test(d7.detail)&&c7.status==='ADD'&&/追加「EXTRA LINE ADDED BY FORWARDER」/.test(c7.detail),'④ S/I 한 줄 빠짐 → 脱落 · ACL 한 줄 더 → 追加',[d7.detail,c7.detail]);
  ok(V('NFK2601-08').items.find(i=>i.key==='notify').status==='NOTATION'&&V('NFK2601-08').k['表記差:Notify Party']===1,'⑤ 줄바꿈만 다름 → 表記差');
  ok(V('NFK2601-09').items.filter(i=>/^set:/.test(i.key)).length===20,'⑦ Attached Sheet 의 컨테이너까지 20 세트');
  ok(V('NFK2601-12').k['読取確認要:Description of Goods']===1,'셀을 넘친 값 → 読取確認要');
  ok(W.dv.every(x=>x.method==='GET')&&W.dv.length>0,'COMPASS 는 GET 만 ('+W.dv.length+'회)');
  ok(!W.dv.some(x=>/NFK2601-1[01]'/.test(x.p)),'読取対象外 Invoice 는 COMPASS 를 읽지 않음');
  ok(Object.keys(W.puts).length===0,'照合 단계: 쓰기 0 (저장은 버튼 따로)');
  const kt=$(w,'abKinds').textContent;
  ok(/BOOKING No\. 相違\s*1\s*1/.test(kt)&&/セット相違:シール/.test(kt)&&/相違:Description:L\/C/.test(kt),'차이 종류 집계표 (v0.6: Description = 相違:Description:{항목})',kt.slice(0,300));
  console.log('v0.4 범위 all · forwarder · 乙仲 · pod_exclude · 版');
  { const d=k=>V('NFK2601-01').items.find(i=>i.key==='disp:'+k), d2=k=>V('NFK2601-02').items.find(i=>i.key==='disp:'+k);
    ok(d('received').status==='MATCH'&&/all ALL/.test(d('received').detail)&&d2('received').status==='MATCH','v0.4 Step 1: all/ALL 규칙 → 모든 Invoice 에 맞음 (Received B/L 空欄)',[d('received'),d2('received')]);
    ok(d('shipperMail').status==='MATCH'&&/forwarder 2/.test(d('shipperMail').detail)&&d2('shipperMail').status==='INFO','v0.4 Step 1: forwarder 2 규칙 → 乙仲 2 인 Invoice 만 (다른 乙仲 → 規則未登録)',[d('shipperMail'),d2('shipperMail')]);
    const m1=JSON.parse(w.eval('JSON.stringify(S.results.find(r=>r.invoice==="NFK2601-01").meta)'));
    ok(m1.forwarder==='2'&&m1.forwarderCompany==='SAMPLE FWD'&&m1.forwarderPort==='TOKYO'&&W.dv.filter(x=>/^crcf9_customses\(/.test(x.p)).length===1,'v0.4 Step 1: 乙仲 번호 · 회사 · 항구 = meta (crcf9_customses 1회)',m1);
    ok(/揚地から外す港 \(pod_exclude\) 1 件/.test($(w,'abLog').textContent)&&V('NFK2601-01').items.find(i=>i.key==='pod').status==='MATCH','v0.4 Step 3: pod_exclude 1건 읽음 · 揚地 = S/I 값 → 一致');
    ok(w.eval('S.results.find(r=>r.invoice==="NFK2601-03").aclVersion')==='REV'&&w.eval('S.results.find(r=>r.invoice==="NFK2601-01").aclVersion')==='初版','v0.4 Step 6: 결과에 aclVersion');
    const i1=R0.findIndex(r=>r.inv==='NFK2601-01'); $(w,'abResults').querySelector('button[data-i="'+i1+'"]').click();
    ok(/乙仲 2 · SAMPLE FWD · TOKYO/.test($(w,'abD'+i1).textContent)&&/\(初版\)/.test($(w,'abD'+i1).textContent),'v0.4: 항목 펼침에 ACL 版 · 乙仲 표시',$(w,'abD'+i1).textContent.slice(0,200)); }
  const idx=R0.findIndex(r=>r.inv==='NFK2601-07'); $(w,'abResults').querySelector('button[data-i="'+idx+'"]').click();
  ok(/ab-drop/.test($(w,'abD'+idx).innerHTML)&&/ab-add/.test($(w,'abD'+idx).innerHTML)&&$(w,'abD'+idx).style.display==='','결과 표: 항목 펼침 · 脱落/追加 색 표시 (v0.5: 시험용 생데이터 안)');
  { const D=$(w,'abD'+idx), c=D.querySelector('.av-concl');   /* v0.5 Step 4: 결론 → 확인한 항목 전부 → 相違만 펼침 */
    ok(c&&/^直すところ 2 か所/.test(c.textContent)&&D.querySelectorAll('.av-list tr:not(.av-g)').length===R0.find(r=>r.inv==='NFK2601-07').items.length&&D.querySelectorAll('.av-diff .av-hl').length>0&&/荷受人 \(Consignee\)/.test(D.textContent),'v0.5 결과 화면: 결론 「直すところ 2 か所」 · 항목 전부 1줄씩 · 相違 칸 다른 글자 색 · 일본어 항목 이름',c&&c.textContent); }
  console.log('v0.3 표시 칸 · ③ 担当者実績');
  { const ids=[...w.document.querySelectorAll('button')].map(b=>b.id).filter(x=>['abList','abRun','abStaff','abSave'].indexOf(x)>=0);
    ok(ids.join()==='abList,abRun,abStaff,abSave'&&/① ACL 一覧/.test(w.document.body.textContent)&&/③ 担当者実績/.test(w.document.body.textContent)&&/④ 保存/.test(w.document.body.textContent),'화면 버튼 순서 ① 一覧 → ② 照合 → ③ 担当者実績 → ④ 保存',ids);
    ok((w.__masterGets||[]).join()==='si_rule','S/I ルールマスター = LEENAI.master.get(\'si_rule\') (a1_bench v0.12 와 같은 방법) 1회',w.__masterGets);
    const d1=V('NFK2601-01').items.filter(i=>i.group==='NACCS 表示欄');
    ok(d1.length===6&&d1.find(i=>i.key==='disp:freight').status==='MATCH'&&d1.find(i=>i.key==='disp:agentSign').status==='MATCH'&&d1.find(i=>i.key==='disp:wayBill').status==='INFO','표시 칸 6개 — 규칙 (바이어 · 나라) → 一致 · 규칙 없음 → 参考',d1.map(i=>i.label+':'+i.status));
    ok(!$(w,'abStaff').disabled,'照合 후 ③ 버튼 열림');
    const putsBefore=Object.keys(W.puts).length, dvBefore=W.dv.length;
    $(w,'abStaff').click(); await until(()=>/読んだ|ab-ng|ab-warn/.test($(w,'abStaffSt').innerHTML));
    ok(/_input\/mail_docstaff_2026Q3Q4\.csv/.test($(w,'abStaffSt').textContent)&&/対象メール 5 通 \(本登録 2 · 訂正依頼 2 · その他 1\) · 紐付けなし 1 通/.test($(w,'abStaffSt').textContent),'Graph 검색 mail_docstaff → _input 폴더 것 우선 · 종류별 통수',$(w,'abStaffSt').textContent);
    const S1=JSON.parse(w.eval('JSON.stringify({r:S.run.results.map(r=>({inv:r.invoice,v:r.verdict,s:r.staff&&r.staff.record,p:r.staff&&r.staff.pairs})),st:{m1:S.run.staff.miss1,m2:S.run.staff.miss2,t:S.run.staff.table}})'));
    const st=inv=>S1.r.find(r=>r.inv===inv);
    ok(st('NFK2601-01').s==='本登録のみ'&&st('NFK2601-02').s==='訂正依頼'&&st('NFK2601-06').s==='本登録のみ'&&st('NFK2601-03').s==='期間外','실적: 本登録のみ · 訂正依頼 · BKG 로 연결 · ACL 파일이 기간 밖 → 期間外',S1.r.map(r=>r.inv+':'+r.s));
    ok(st('NFK2601-02').p[0].state==='訂正前のACL'&&S1.st.m2.map(m=>m.invoice).join()==='NFK2601-08','訂正 쌍 = 訂正前のACL — 씰 (02) 은 도구가 그 세트에서 相違 → 놓침 아님 · Notify (08) 는 도구가 表記差 → 놓침 ②',S1.st.m2);
    ok(S1.st.m1.length===1&&S1.st.m1[0].invoice==='NFK2601-08'&&$(w,'abMiss1').textContent==='1','놓침 ① — 訂正依頼인데 도구가 表記差のみ (가짜 NFK2601-08) → 목록 · 화면 숫자',S1.st.m1);
    ok(S1.st.t['相違あり']['本登録のみ']===1&&S1.st.t['完全一致']['本登録のみ']===1&&S1.st.t['表記差のみ']['訂正依頼']===1,'맞대기 표 (판정 × 실적)',S1.st.t);
    ok(Object.keys(W.puts).length===putsBefore&&W.dv.length===dvBefore,'③ 단계: 쓰기 0 · COMPASS 읽기 0 (照合 결과에 다시 계산)');
    ok(/本登録のみ/.test($(w,'abResults').textContent)&&/見落とし ①/.test($(w,'abStaffOut').textContent)&&/紐付けなし/.test($(w,'abStaffOut').textContent),'결과 표에 실적 · ③ 표 (놓침 · 紐付けなし)');
    ok($(w,'abStaffUp').disabled,'SharePoint 에서 읽었으면 「_input に控え」 잠김 (이미 SharePoint 에 있음)');
  }
  console.log('Step 5 保存');
  $(w,'abSaveCoords').checked=true; $(w,'abSave').click(); await until(()=>/保存:|保存失敗/.test($(w,'abSaveSt').textContent));
  const rid=w.eval('S.run.run_id'), dir=ACL.SP_OUT+'/'+rid+'/', keys=Object.keys(W.puts);
  ok(/^ACL_\d{8}-\d{6}$/.test(rid)&&keys.every(k=>k.indexOf(dir)===0),'⑨ 저장 = ACL_bench/{run_id}/ 아래만',keys);
  ok(['results.json','results.csv','summary.md'].every(f=>keys.indexOf(dir+f)>=0)&&keys.filter(k=>/\/coords\//.test(k)).length===13,'results.json · results.csv · summary.md · 좌표 13건');
  const csv=W.puts[dir+'results.csv'], md=W.puts[dir+'summary.md'], js=JSON.parse(W.puts[dir+'results.json']);
  ok(/^﻿run_id,invoice,format,verdict,group,item,status,kind,expected,actual,detail,xx,staff_record,aclVersion\r\n/.test(csv)&&csv.split('NFK2601-10').length===2&&/BOOKING No\. 相違/.test(csv),'results.csv: Invoice × 항목 한 줄 (대상 밖은 1줄) · (v0.4) 맨 끝 aclVersion');
  ok(/\| 完全一致 \| 3 \|/.test(md)&&/\| 相違あり \| 5 \|/.test(md)&&/\| BOOKING No\. 相違 \| 1 \| 1 \|/.test(md)&&/✦ Powered by LEENAI Automation System/.test(md),'summary.md: 판정 · 차이 종류 · 푸터');
  ok(/NFK2601-03,NACCS,相違あり,[^\r]*,REV\r\n/.test(csv)&&/\| NFK2601-03 \| REV \|/.test(md),'v0.4: results.csv · summary.md 에 ACL 版 (REV)');
  ok(js.results.length===13&&js.user==='tester@example.com'&&js.version===VER,'results.json: 13건 · 실행자 · 버전');
  let err=''; try{ await w.eval("spPut('古紙/-. 古紙書類/▲ 書類作成中/NFK2601-01/x.pdf','x','text/plain')"); }catch(e){ err=e.message; }
  ok(/書き込み禁止/.test(err)&&!Object.keys(W.puts).some(k=>k.indexOf('書類作成中')>=0),'⑨ 원본 폴더에 쓰기 → 막힘');
  ok(['staff_match.csv','rule_candidates.json','review_list.csv'].every(f=>keys.indexOf(dir+f)>=0)&&/staff_record/.test(csv)&&/担当者実績との突き合わせ/.test(md),'v0.3 저장: staff_match.csv · rule_candidates.json · review_list.csv · results.csv staff_record · summary 맞대기');
  const rc=JSON.parse(W.puts[dir+'rule_candidates.json']); ok(rc.master==='si_rule'&&Array.isArray(rc.items)&&Array.isArray(rc.hold)&&/MASTER には書いていない/.test(rc.note),'rule_candidates.json = master items 모양 · MASTER 에 쓰지 않음');
  ok(!keys.some(k=>/MASTER|master_si_rule/.test(k))&&!js.results.some(r=>r._base),'MASTER 쓰기 0 · 내부 사본 (_base) 은 저장 안 함');
  ok(/^﻿Invoice,項目,ACL,COMPASS,理由\r\n/.test(W.puts[dir+'review_list.csv'])&&/NFK2601-08/.test(W.puts[dir+'review_list.csv'])&&/紐付けなし/.test(W.puts[dir+'review_list.csv']),'review_list.csv (일본어) — 表記差のみ × 訂正依頼 · 紐付けなし');
  console.log('v0.3 CSV 끌어다 놓기 예비 길 · _input 控え');
  { const f=new w.File([W.csv],'mail_docstaff_2026Q3Q4.csv',{type:'text/csv'}), dt={files:[f]}, ev=new w.Event('drop',{bubbles:true}); ev.dataTransfer=dt; ev.preventDefault=()=>{};
    $(w,'abStaffSt').textContent=''; $(w,'abDrop').dispatchEvent(ev); await until(()=>/読んだ/.test($(w,'abStaffSt').textContent)&&!$(w,'abStaffUp').disabled);
    ok(/読んだ: mail_docstaff_2026Q3Q4\.csv/.test($(w,'abStaffSt').textContent)&&w.eval('S.run.staff.miss1.length')===1,'CSV 를 끌어다 놓아도 같은 결과 (다음 분기 CSV 대비)');
    $(w,'abStaffUp').click(); await until(()=>/控え/.test($(w,'abStaffSt').textContent));
    const ip=ACL.SP_OUT+'/_input/mail_docstaff_2026Q3Q4.csv';
    ok(W.puts[ip]!=null&&W.noOverwrite.indexOf(ip)>=0&&new RegExp('送った '+W.csvBytes+' bytes · SharePoint '+W.csvBytes+' bytes · 一致').test($(w,'abStaffSt').textContent),'_input 控え = ACL_bench/_input/ (guardOut 안) · 덮어쓰기 금지 · 크기 대조 (BOM 포함 원래 바이트)',$(w,'abStaffSt').textContent);
    $(w,'abStaffSt').textContent=''; $(w,'abStaffUp').disabled=false; $(w,'abStaffUp').click(); await until(()=>/控え 失敗|控え:/.test($(w,'abStaffSt').textContent));
    ok(/上書きしない/.test($(w,'abStaffSt').textContent),'같은 이름이 있으면 덮어쓰지 않음 (실패로 표시)'); }
  ok(W.gr.filter(x=>x.method!=='GET').every(x=>x.method==='PUT'&&x.p.indexOf('root:/'+ACL.SP_OUT+'/')===0),'Graph 쓰기는 ACL_bench 아래 PUT 만');
  console.log('e2e pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
