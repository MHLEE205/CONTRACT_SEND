/* 통합 (jsdom) — bl_bench.html 을 그대로 열고 가짜 COMPASS · SharePoint (Invoice 폴더 · Draft PDF · ACL 없음) · L/C 보관소로 ① 照合 → ② 結果
   통신은 전부 가짜 fetch · GET 만 (그 밖은 기록하고 실패) · ACL 엔진은 같은 레포의 acl_bench.html 을 그대로 읽음 */
const fs=require('fs'), path=require('path'), T=require('./lib.js'), F=require('./fixtures.js'), {ok, eq}=T;
const {JSDOM}=require('jsdom');
const ACLF=require('../acl_bench/fixtures.js');
const html=fs.readFileSync(T.HTML,'utf8'), aclHtml=fs.readFileSync(path.join(__dirname,'../../acl_bench.html'),'utf8');
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
  const calls=[], writes=[];
  const J=(o,st)=>({ok:(st||200)<400, status:st||200, headers:{get:()=>null}, json:async()=>o, text:async()=>JSON.stringify(o), arrayBuffer:async()=>new ArrayBuffer(0)});
  const B=(u8)=>({ok:true, status:200, headers:{get:()=>null}, arrayBuffer:async()=>u8.buffer.slice(u8.byteOffset,u8.byteOffset+u8.byteLength)});
  const WIP=encodeURIComponent('古紙')+'/'+encodeURIComponent('-. 古紙書類')+'/'+encodeURIComponent('▲ 書類作成中');
  async function fakeFetch(url, opt){
    const m=(opt&&opt.method)||'GET'; url=String(url); calls.push(m+' '+url); if(m!=='GET'){ writes.push(m+' '+url); throw new Error('write blocked'); }
    if(url==='acl_bench.html') return {ok:true, status:200, text:async()=>aclHtml};
    const u=decodeURIComponent(url);
    if(/graph\.microsoft\.com/.test(url)){
      if(u.indexOf('/root:/古紙/-. 古紙書類/▲ 書類作成中:/children')>=0) return J({value:[{id:'F1', name:IV, folder:{}}]});
      if(u.indexOf('/root:/古紙/_OLD_DOC/2026:/children')>=0) return J({value:[]});
      if(u.indexOf('/root:/古紙/-. 古紙書類/▲ 書類作成中/'+IV+':/children')>=0) return J({value:[{id:'D1', name:IV+'_DRAFT.pdf', file:{}, size:draft.length, lastModifiedDateTime:'2026-10-14T00:00:00Z', webUrl:'https://example.invalid/d1'},{id:'X1', name:IV+'_SI.pdf', file:{}}]});
      if(u.indexOf('/items/D1/content')>=0) return B(draft);
      if(u.indexOf('/root:/古紙/LC/_READ/LRS-2601FK1.json:/content')>=0) return J(lcStore);
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
    w.fetch=fakeFetch; w.pdfjsLib=pdfjs;
    w.LEENAI={init(cfg){ w.__cfg=cfg; w.document.addEventListener('DOMContentLoaded',()=>{ w.document.getElementById('app').style.display=''; cfg.onReady(); ready(); }); },
      auth:{token:async()=>'FAKE', status:{dataverse:'ok', graph:'ok'}}, SP:{DRIVE_ID:'DRIVE'}, master:{get:async n=>{ calls.push('MASTER '+n); return null; }}}; }});
  const w=dom.window; await readyP;
  eq(w.__cfg.version,'0.1','LEENAI.init 버전'); ok(/bl_bench\.html$/.test(w.__cfg.redirectUri),'redirectUri = bl_bench.html');
  /* ① 照合 */
  w.document.getElementById('bbInv').value=IV+'\nNOT-AN-IV'; w.document.getElementById('bbRun').click();
  for(let i=0;i<200&&!/完了/.test(w.document.getElementById('bbRunSt').textContent);i++) await new Promise(r=>setTimeout(r,50));
  ok(/完了 — 1 件/.test(w.document.getElementById('bbRunSt').textContent),'照合 1 件 완료 — '+w.document.getElementById('bbRunSt').textContent);
  const R=w.BLAPP.S.results[0]||{};
  eq(R.iv,IV,'Invoice'); eq(R.carrier,'ONE','船社 (표에서 이름)'); eq(R.pay,'LC','決済 L/C'); eq(R.src,'DRAFT','Draft'); eq((R.editions||[]).length,1,'版 1');
  ok((R.A||[]).length>10,'A 항목 '+(R.A||[]).length); ok((R.B||[]).length>=7,'B 항목 '+(R.B||[]).length);
  const cls=f=>((R.A||[]).find(r=>r.field===f)||{}).class;
  ['Shipper','Consignee','Notify','Booking/B/L No.'].forEach(f=>eq(cls(f),'같음','A '+f));
  const lcr=it=>((R.B||[]).find(r=>r.item===it)||{}).result||'';
  ok(/^같음/.test(lcr('Consignee 은행')),'B Consignee 은행 '+lcr('Consignee 은행')); ok(/^같음/.test(lcr('47A 모든 서류 L/C 번호')),'B 47A');
  ok(calls.some(c=>/acl_bench\.html$/.test(c)),'ACL 엔진 = acl_bench.html 에서 읽음'); ok(calls.some(c=>c==='MASTER port_alias'),'port_alias 마스터 읽기 (없음 → 고정값)');
  eq(writes,[],'쓰기 0'); ok(calls.every(c=>/^(GET|MASTER) /.test(c)),'GET 만');
  ok(/港の別名: master_port_alias なし/.test(w.document.getElementById('bbLog').textContent),'로그: 고정값 사용');
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
  T.done('e2e');
})().catch(e=>{ console.log('FAIL exception',e.stack); process.exit(1); });
