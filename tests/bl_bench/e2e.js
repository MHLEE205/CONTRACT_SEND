/* 통합 (jsdom) — bl_bench.html 을 그대로 열고 가짜 COMPASS · SharePoint (Invoice 폴더 · Draft PDF · ACL 없음) · L/C 보관소로 ① 照合 → ② 結果
   통신은 전부 가짜 fetch · GET 만 (그 밖은 기록하고 실패) · ACL 엔진은 같은 레포의 acl_bench.html 을 그대로 (v0.2: 고정한 커밋 주소 · sha256 확인)
   v0.2: 마스터 (checkpoint · port_alias · staff) — 1 회째 없음 (v0.1 과 같은 판정) · 2 회째 가짜 마스터 + 판 기록 (CP 번호 · CP-A01 試験 · 승인 안전장치) */
const fs=require('fs'), path=require('path'), T=require('./lib.js'), F=require('./fixtures.js'), {ok, eq}=T;
const {JSDOM}=require('jsdom');
const ACLF=require('../acl_bench/fixtures.js');
const html=fs.readFileSync(T.HTML,'utf8');
/* ACL 엔진 = bl_bench 가 고정한 커밋의 acl_bench.html (git show) — acl_bench 가 다음 판으로 바뀌어도 bl_bench 는 고정 커밋을 읽음 (acl_bench v0.14 에서 고침) · git 이 없으면 작업 중 파일 */
const aclPin=(html.match(/const ACL_ENGINE = \{commit:'([0-9a-f]{40})'/)||[])[1];
let aclHtml=null; try{ aclHtml=require('child_process').execFileSync('git',['show',aclPin+':acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26,stdio:['ignore','pipe','ignore']}); }catch(e){}
if(!aclHtml) aclHtml=fs.readFileSync(path.join(__dirname,'../../acl_bench.html'),'utf8');
const pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
(async()=>{
  /* 가짜 COMPASS = acl_bench 시험의 가짜 선적 1 (NFK2601-01) · L/C 결제 */
  const cp=ACLF.compass(1), IV=cp.invoice, g=ACLF.g;
  cp.booking._cr49f_carrier_id_value=g('ca00',1); cp.booking.crcf9_bl_etd='2026-10-15';
  const ACLcore=(()=>{ const vm=require('vm'), c={module:{exports:{}},console}; vm.createContext(c); vm.runInContext(aclHtml.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';module.exports=ACL;',c); return c.module.exports; })();
  const ex=ACLcore.expected(cp), lines=s=>String(s||'').split(/\n|#/).map(x=>x.trim()).filter(Boolean);
  /* Draft = S/I 와 같은 내용 (가짜 양식) */
  const d=F.draftItems({shipper:lines(ex.shipper), consignee:lines(ex.consignee), notify:lines(ex.notify), desc:lines(ex.description).concat(['L/C NO.: TLC0001']), marks:lines(ex.marks),
    booking:cp.booking.cr49f_booking_no, vessel:cp.booking.cr49f_main_ship_name, pol:'TOKYO, JAPAN', receipt:'TOKYO, JAPAN', pod:ex.pod||'CAT LAI', delivery:ex.pod||'CAT LAI'});
  const cn=cp.containers.filter(c=>c.crcf9_container_no); d.splice(d.findIndex(x=>/^TSTU1000011/.test(x.t)),3,...cn.map((c,i)=>({x:30,y:370+i*11,t:c.crcf9_container_no+' / '+c.crcf9_seal_no+' / '+c.crcf9_quantity+' BALES / '+c.crcf9_n_w+' KGS'})));
  const draft=await T.mkPdf([d.concat(F.FREIGHT)]);
  const lcStore=F.lc({lc_no:'TLC0001', bl:{consignee_text:'TO ORDER OF SAMPLE BANK HO CHI MINH BRANCH', consignee_bank:'SAMPLE BANK HO CHI MINH BRANCH', notify_text:'APPLICANT', notify_is_applicant:true, originals:3, freight:'PREPAID'},
    applicant:{name:'SAMPLE PAPER CO., LTD.'}, pod:{text:'CAT LAI PORT, VIETNAM', list:['CAT LAI']}});
  const calls=[], writes=[]; let MASTERS=null;
  const J=(o,st)=>({ok:(st||200)<400, status:st||200, headers:{get:()=>null}, json:async()=>o, text:async()=>JSON.stringify(o), arrayBuffer:async()=>new ArrayBuffer(0)});
  const B=(u8)=>({ok:true, status:200, headers:{get:()=>null}, arrayBuffer:async()=>u8.buffer.slice(u8.byteOffset,u8.byteOffset+u8.byteLength)});
  const WIP=encodeURIComponent('古紙')+'/'+encodeURIComponent('-. 古紙書類')+'/'+encodeURIComponent('▲ 書類作成中');
  async function fakeFetch(url, opt){
    const m=(opt&&opt.method)||'GET'; url=String(url); calls.push(m+' '+url); if(m!=='GET'){ writes.push(m+' '+url); throw new Error('write blocked'); }
    if(/^https:\/\/raw\.githubusercontent\.com\/MHLEE205\/CONTRACT_SEND\/[0-9a-f]{40}\/acl_bench\.html$/.test(url)){ const b=Buffer.from(aclHtml,'utf8'); return {ok:true, status:200, arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}; }
    const u=decodeURIComponent(url);
    if(/graph\.microsoft\.com/.test(url)){
      if(u.indexOf('/root:/古紙/-. 古紙書類/▲ 書類作成中:/children')>=0) return J({value:[{id:'F1', name:IV, folder:{}}]});
      if(u.indexOf('/root:/古紙/_OLD_DOC/2026:/children')>=0) return J({value:[]});
      if(u.indexOf('/root:/古紙/-. 古紙書類/▲ 書類作成中/'+IV+':/children')>=0) return J({value:[{id:'D1', name:IV+'_DRAFT.pdf', file:{}, size:draft.length, lastModifiedDateTime:'2026-10-14T00:00:00Z', webUrl:'https://example.invalid/d1'},{id:'X1', name:IV+'_SI.pdf', file:{}}]});
      if(u.indexOf('/items/D1/content')>=0) return B(draft);
      if(u.indexOf('/root:/古紙/LC/_READ/LRS-2601FK1.json:/content')>=0) return J(lcStore);
      /* v0.2: マスターの版の記録 (承認の安全装置) — 版 1 つ · 保存者 = 管理者 */
      const mm=u.match(/\/root:\/古紙\/-\. AI 活用\/MASTER\/master_(checkpoint|port_alias)\.json\?\$select=id$/); if(mm&&MASTERS) return J({id:'M_'+mm[1]});
      const mv=u.match(/\/items\/M_(checkpoint|port_alias)\/versions\?/); if(mv&&MASTERS) return J({value:[{id:'2.0', lastModifiedBy:{user:{email:'adm_a@example.com'}}}]});
      const mc=u.match(/\/items\/M_(checkpoint|port_alias)\/content$/); if(mc&&MASTERS) return J({items:MASTERS[mc[1]]});
      return J({error:{message:'not found'}},404);
    }
    if(/dynamics\.com/.test(url)){
      const q=u.split('/api/data/v9.2/')[1]||'';
      if(/^cr49f_bookings\?/.test(q)) return J({value:[cp.booking]});
      if(/^crcf9_region_japans\(/.test(q)) return J({crcf9_pol:cp.pol});
      if(/^cr49f_regions\(/.test(q)) return J({cr49f_pod:cp.pod});
      if(/^crcf9_container_informations\?/.test(q)) return J({value:cp.containers});
      if(/^cr49f_s_is\?/.test(q)) return J({value:cp.sis});
      if(/^crcf9_s_i_details\?/.test(q)){ const id=(q.match(/eq ([0-9a-f-]{36})/)||[])[1]; return J({value:cp.details[id]||[]}); }
      if(/^cr49f_sale_contracts\(/.test(q)) return J({cr49f_sale_contract_no:'LRS-2601FK1', cr49f_pay_cls:'LC', _cr49f_buyer_id_value:g('bb00',1)});
      if(/^cr49f_buyers\(/.test(q)) return J({cr49f_buyer:'SAMPLE BUYER', cr49f_buyer_code:'SB', crcf9_country:'VIETNAM'});
      if(/^crcf9_carriers\(/.test(q)) return J({crcf9_carrier:'ONE'});
      if(/^crcf9_customses\(/.test(q)) return J({crcf9_forwarder_company:'SAMPLE FWD', crcf9_pol:'TOKYO'});
      return J({value:[]});
    }
    throw new Error('unexpected fetch '+url);
  }
  const page=html.replace(/<script src="https:\/\/mhlee205\.github\.io\/LEENAI_COMMON\/v1\/leenai-common\.js"><\/script>/,'');
  let ready=null; const readyP=new Promise(r=>{ ready=r; });
  const dom=new JSDOM(page,{runScripts:'dangerously', url:'https://mhlee205.github.io/CONTRACT_SEND/bl_bench.html', beforeParse(w){
    w.fetch=fakeFetch; w.pdfjsLib=pdfjs; Object.defineProperty(w,'crypto',{value:require('crypto').webcrypto, configurable:true}); w.TextDecoder=TextDecoder;
    w.LEENAI={init(cfg){ w.__cfg=cfg; w.document.addEventListener('DOMContentLoaded',()=>{ w.document.getElementById('app').style.display=''; cfg.onReady(); ready(); }); },
      auth:{token:async()=>'FAKE', status:{dataverse:'ok', graph:'ok'}}, SP:{DRIVE_ID:'DRIVE'}, master:{get:async n=>{ calls.push('MASTER '+n); return MASTERS?MASTERS[n]||null:null; }}}; }});
  const w=dom.window; await readyP;
  eq(w.__cfg.version,'0.8','LEENAI.init 버전'); ok(/bl_bench\.html$/.test(w.__cfg.redirectUri),'redirectUri = bl_bench.html');
  /* ① 照合 */
  w.document.getElementById('bbInv').value=IV+'\nNOT-AN-IV'; w.document.getElementById('bbRun').click();
  for(let i=0;i<200&&!/完了/.test(w.document.getElementById('bbRunSt').textContent);i++) await new Promise(r=>setTimeout(r,50));
  ok(/完了 — 1 件/.test(w.document.getElementById('bbRunSt').textContent),'照合 1 件 완료 — '+w.document.getElementById('bbRunSt').textContent);
  const R=w.BLAPP.S.results[0]||{};
  eq(R.iv,IV,'Invoice'); eq(R.carrier,'ONE','船社 (표에서 이름)'); eq(R.pay,'LC','決済 L/C'); eq(R.src,'DRAFT','Draft'); eq((R.editions||[]).length,1,'版 1');
  ok((R.A||[]).length>10,'A 항목 '+(R.A||[]).length); ok((R.B||[]).length>=7,'B 항목 '+(R.B||[]).length);
  const cls=f=>((R.A||[]).find(r=>r.field===f)||{}).class;
  ['Shipper','Consignee','Notify','Booking/B/L No.'].forEach(f=>eq(cls(f),'SAME','A '+f));
  const lcr=it=>((R.B||[]).find(r=>r.item===it)||{}).result||'';
  ok(/^SAME/.test(lcr('Consignee bank')),'B Consignee 은행 '+lcr('Consignee bank')); ok(/^SAME/.test(lcr('47A L/C No. in all docs')),'B 47A');
  ok(calls.some(c=>/raw\.githubusercontent\.com\/MHLEE205\/CONTRACT_SEND\/[0-9a-f]{40}\/acl_bench\.html$/.test(c)),'ACL 엔진 = 고정한 커밋의 acl_bench.html (sha256 일치)');
  ok(['checkpoint','port_alias','staff'].every(n=>calls.indexOf('MASTER '+n)>=0),'마스터 읽기 (checkpoint · port_alias · staff)');
  eq(writes,[],'쓰기 0'); ok(calls.every(c=>/^(GET|MASTER) /.test(c)),'GET 만');
  ok(/チェックポイント なし · 港の別名 なし/.test(w.document.getElementById('bbLog').textContent),'로그: 마스터 없음 (고정값 없음)'); eq(R.CP,undefined,'마스터 없음 → 체크 없음 (v0.1 과 같은 결과)');
  /* ② 結果 화면 */
  w.document.querySelector('#bbOut tr[data-i]').dispatchEvent(new w.Event('click'));
  const det=w.document.getElementById('bbDetail').innerHTML;
  ok(/確認した項目/.test(det)&&/バイヤー用 Draft 作成/.test(det)&&/Draft を開く/.test(det),'結果 화면 (항목 · 버튼)');
  /* 버튼 → 확인 문구 (D4) → やめる */
  w.document.getElementById('bbBuyer').click(); await new Promise(r=>setTimeout(r,10));
  ok(w.document.getElementById('bbModal').style.display==='flex'&&/強い依頼/.test(w.document.getElementById('bbModal').textContent)&&/Deposit/.test(w.document.getElementById('bbModal').textContent),'확인 문구 ① 강한 요청 ② 베트남 Deposit');
  w.document.getElementById('bbModalNo').click(); await new Promise(r=>setTimeout(r,10));
  eq(w.document.getElementById('bbBuyerSt').textContent,'やめました','やめる = 만들지 않음');
  /* CSV */
  const csv=w.eval('BL').toCsv(w.BLAPP.S.results); ok(csv.indexOf(IV)>0&&csv.split('\r\n').length>15,'CSV');
  /* v0.2 — 가짜 마스터 (基本 BL_DRAFT 2 · CP-A01 試験 · 직원 관리자 1) + 판 기록 → CP 번호 · 試験 = 参考 · 판정 같음 */
  const Bk=(id,key)=>({id, kind:'基本', stage:'BL_DRAFT', pay:'ALL', scope_type:'all', scope:'ALL', engine_key:key, title_ja:key, status:'有効', approved_by:'ADM_A', approved_at:'2026-11-23'});
  MASTERS={checkpoint:[Bk('CP-B50','bl:consignee'),Bk('CP-B52','bl:lc:consignee'),{id:'CP-A01', kind:'追加', stage:'ACL,BL_DRAFT,BL', pay:'LC', scope_type:'all', scope:'ALL', left:'lc.bl.consignee_text', op:'same_text_ws:trim_end_punct', right:'acl.consignee', result:'相違', title_ja:'Consignee は L/C 46A の文言どおり', status:'試験'}],
    port_alias:[], staff:[{code:'ADM_A', email:'adm_a@example.com', portal_admin:true}]};
  w.BLAPP.S.alias=null; const v1=R.verdict; w.document.getElementById('bbRun').click();
  for(let i=0;i<200&&!(w.BLAPP.S.results[0]&&w.BLAPP.S.results[0]!==R&&/完了/.test(w.document.getElementById('bbRunSt').textContent));i++) await new Promise(r=>setTimeout(r,50));
  const R2=w.BLAPP.S.results[0]||{}, a01=(R2.CP||[]).find(i=>i.cp==='CP-A01')||{};
  eq([(R2.A||[]).find(r=>r.field==='Consignee').cp,(R2.B||[]).find(r=>r.item==='Consignee bank').cp],['CP-B50','CP-B52'],'마스터 → A · B 항목 CP 번호');
  eq([a01.trial,a01.cpState,R2.verdict],[true,'試験',v1],'CP-A01 試験 = 参考 · 판정 그대로');
  ok(/チェックポイント 3 行 \(B\/L Draft\) · 港の別名 0 行 有効/.test(w.document.getElementById('bbLog').textContent)&&!/版の記録を読めない/.test(w.document.getElementById('bbLog').textContent),'로그: 마스터 · 판 기록 읽음');
  ok(calls.some(c=>/\/items\/M_checkpoint\/versions\?/.test(decodeURIComponent(c))),'판 기록 (versions) 읽음'); eq(writes,[],'쓰기 0 (2 회째)');
  T.done('e2e');
})().catch(e=>{ console.log('FAIL exception',e.stack); process.exit(1); });
