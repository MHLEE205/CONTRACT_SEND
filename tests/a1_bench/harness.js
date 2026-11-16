/* a1_bench jsdom 하네스 — LEENAI 공통 · Dataverse · Graph · Anthropic 을 모두 mock (네트워크 없음 · 가짜 데이터만)
   node harness.js <html> <mode: integ|bench|r2|resume> <out.json> [R2 마스터 스위치: on|off (v0.7~, 기본 on)]
   integ = マスター草案 화면 · 저장 확인 상자 / bench = 파일럿 R1+R2 2건 + R0 / r2 = R2만 3건 (v0.7 마스터 사용)
   resume (v0.8~) = 전체 실행 6건: 끊김 없는 기준 실행 · 2건 뒤 강제 중단 → 새 페이지에서 「이어서 실행」 (가짜 SharePoint 저장소를 페이지끼리 공유) */
const fs=require('fs'), path=require('path');
let JSDOM; try{ ({JSDOM}=require('jsdom')); }catch(e){ ({JSDOM}=require(path.join(process.env.APPDATA||'','npm/node_modules/jsdom'))); }   // 이 폴더의 npm install 우선 · 없으면 전역(Windows)
const [,,htmlPath,mode,outPath,masterSw]=process.argv;
const prompts=[];   // Anthropic 호출 입력 (system 종류 · 사용자 텍스트)
let html=fs.readFileSync(htmlPath,'utf8');
const FAKE=`<script>window.LEENAI={auth:{token:async()=>'tok',status:{dataverse:'ok',graph:'ok'}},SP:{DRIVE_ID:'drv'},
  master:{get:async n=>n==='hscode'?[{item:'OCC',hs:'4707.10'}]:{AT_SIGHT:'AT SIGHT'}},
  init:function(o){ document.title='LEENAI '+o.sys+' '+o.name+' v'+o.version; setTimeout(function(){ document.getElementById('app').style.display=''; o.onReady(); },0); }};</script>`;
const before=html.length;
html=html.replace(/<script src="https:\/\/mhlee205\.github\.io\/LEENAI_COMMON\/v1\/leenai-common\.js"><\/script>/,FAKE).replace(/<link rel="stylesheet"[^>]*>/,'');
if(html.length===before) throw new Error('공통 파일 script 태그를 못 찾음');

/* ── 시험 데이터 ── */
const LCS={
  'LRS-2603SG1':{lcNo:'ILC0001',d:'260306',po:'PO11111',lic:'156/GPMT-BTNMT'},
  'LRS-2604SG1':{lcNo:'ILC0002',d:'260406',po:'PO22222',lic:'156/GPMT-BTNMT'},
  'LRS-2605SG1':{lcNo:'ILC0003',d:'260506',po:'PO33333',lic:'157/GPMT-BTNMT'},
  'LRS-2603CA1':{lcNo:'KB0001',d:'260310',po:'CAS111',app:'A.B.C. PAPER MILL CO., LTD.\n     99/9 MOO 9, SAMPLE HIGHWAY ROAD,\n     SAMPLEPROV 16000 THAILAND',bank:'BANKTHBKXXX'},
  'LRS-2605CA1':{lcNo:'KB0002',d:'260510',po:'CAS222',app:'A.B.C.PAPER CO.,LTD.\n     10 EXAMPLE RD.\n     BANGKOK 10600 THAILAND',bank:'BANKTHBKXXX'},
  'LRS-2606CA1':{lcNo:'KB0003',d:'260610',po:'CAS333',app:'A.B.C. PAPER MILL CO., LTD.\n     99/9 MOO 9, SAMPLE HIGHWAY ROAD,\n     SAMPLEPROV 16000 THAILAND',bank:'BANKTHBKXXX'}
};
function lcText(no){ const x=LCS[no], sg=/SG/.test(no);
  return ['700  ISSUE OF A DOCUMENTARY CREDIT',
  ' SEQUENCE OF TOTAL :27 1/1',' DOCUMENTARY CREDIT NUMBER :20 '+x.lcNo,' DATE OF ISSUE :31C '+x.d,
  ' APPLICANT :50 '+(sg?'DELTA PAPER CORPORATION\n     SAMPLE A INDUSTRIAL PARK\n     SAMPLE WARD, HO CHI MINH CITY, VIET NAM':x.app),
  ' ISSUING BANK :52A '+(sg?'BANKVNVXXXX':x.bank),' CURRENCY CODE AMOUNT :32B USD100000,00',
  ' PORT OF DISCHARGE :44F '+(sg?'HO CHI MINH CITY, VIET NAM':'BANGKOK, THAILAND'),
  ' DESCRIPTION OF GOODS :45A WASTE PAPER OCC 500 MT\n     HS CODE: 4707.10.00\n     PO NO.: '+x.po,
  ' DOCUMENTS REQUIRED :46A 1. SIGNED COMMERCIAL INVOICE IN 3 COPIES\n     2. FULL SET OF CLEAN ON BOARD OCEAN BILLS OF LADING MADE OUT TO ORDER OF '+(sg?'SAMPLE BANK TOKYO':'APPLICANT')+' MARKED FREIGHT PREPAID AND NOTIFY APPLICANT',
  ' ADDITIONAL CONDITIONS :47A 1. ALL DOCUMENTS MUST SHOW LC NUMBER'+(sg?'\n     2. IMPORT LICENSE NO: '+x.lic+' MUST BE SHOWN ON B/L':'')].join('\n');
}
const fmtD=d=>{ const M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']; return M[+d.slice(2,4)-1]+' '+d.slice(4,6)+', 20'+d.slice(0,2); };
function siOf(no){ const x=LCS[no], sg=/SG/.test(no), mill=/MILL/.test(x.app||'');
  const s1={crcf9_sino:1, cr49f_lc_no:x.lcNo+' DATED ON '+fmtD(x.d), crcf9_po_vo:x.po, crcf9_payment_classification:'LC',
    crcf9_consignee:sg?'0300000002#156/GPMT-BTNMT#DEPOSIT#DELTA PAPER CORPORATION***':'TO ORDER OF '+(mill?'A.B.C. PAPER MILL CO., LTD.':'A.B.C.PAPER CO.,LTD.'),
    crcf9_notify_party:sg?'0300000002#156/GPMT-BTNMT#DEPOSIT':(mill?'A.B.C. PAPER MILL CO., LTD.':'A.B.C.PAPER CO.,LTD.'),
    crcf9_address:sg?'#DELTA PAPER CORPORATION***':(mill?'99/9 MOO 9, SAMPLE HIGHWAY ROAD,\nSAMPLEPROV 16000 THAILAND':'10 EXAMPLE RD.\nBANGKOK 10600 THAILAND'),
    crcf9_bl_text1:sg?'WASTE PAPER#47071000#XXKGS#XXBALES\nDEPOSIT NUMBER : XXX':(no==='LRS-2606CA1'?'PO NUMBER: '+x.po:''), crcf9_remark:'',
    crcf9_place_of_delivery_1:sg?'HO CHI MINH CITY, VIET NAM':'BANGKOK, THAILAND'};
  const out=[s1]; if(sg) out.push({crcf9_sino:2, cr49f_lc_no:s1.cr49f_lc_no, crcf9_notify_party:'DELTA PAPER CORPORATION', crcf9_address:'SAMPLE A INDUSTRIAL PARK, SAMPLE WARD, HO CHI MINH CITY, VIET NAM', crcf9_tel:'TEL +84 200 1234567'});
  return out.map(h=>Object.assign({cr49f_s_iid:'si-'+no+'-'+h.crcf9_sino, createdon:'2026-0'+no.slice(7,8)+'-15T00:00:00Z', modifiedon:'2026-0'+no.slice(7,8)+'-16T00:00:00Z'},h));
}
const NOS=Object.keys(LCS);
const BUYERS=[{cr49f_buyerid:'b-sg',cr49f_buyer:'DELTA',cr49f_buyer_name:'DELTA PAPER CORPORATION',cr49f_buyer_code:'SG',crcf9_country:'VIETNAM'},{cr49f_buyerid:'b-ca',cr49f_buyer:'CAS',cr49f_buyer_name:'A.B.C. PAPER MILL CO., LTD.',cr49f_buyer_code:'CA',crcf9_country:'THAILAND'}];
const SC=NOS.map(no=>({cr49f_sale_contractid:'c-'+no, cr49f_sale_contract_no:no, cr49f_sale_contract_date:'2026-0'+no.slice(7,8)+'-01', cr49f_pay_cls:'LC', cr49f_pay_days:'AT SIGHT', cr49f_terms_conditions:'CIF', cr49f_po_no:LCS[no].po, _cr49f_buyer_id_value:/SG/.test(no)?'b-sg':'b-ca'}));

/* ── fetch mock ── */
const writes=[], calls={dv:0,graph:0,claude:0};
const store={};   // v0.8: 가짜 SharePoint — PUT 은 저장, GET :/content 는 읽기, :/children 은 목록
const pathOf=u=>u.replace(/^.*root:\//,'').replace(/:\/(content|children).*$/,'');
const J=(o,st)=>new Response(JSON.stringify(o),{status:st||200,headers:{'Content-Type':'application/json'}});
function sse(text){ const ev=[{type:'message_start',message:{model:'mock',usage:{input_tokens:100}}},{type:'content_block_delta',delta:{type:'text_delta',text}},{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:50}}];
  return new Response(ev.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''),{status:200,headers:{'Content-Type':'text/event-stream'}}); }
function claudeReply(body){
  const sys=String(body.system||''), msg=body.messages[body.messages.length-1], txt=typeof msg.content==='string'?msg.content:msg.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');
  const lcNo=(txt.match(/ILC\d{4}|KB\d{4}/)||['ILC0001'])[0];
  prompts.push({kind:/判読担当/.test(sys)?'r2_extract':/ベテラン/.test(sys)?'r2_assemble':/正解/.test(txt)?'judge':'other',lcNo,txt});
  if(/判読担当/.test(sys)){ const q=v=>({value:v,loc:'x',quote:v,note:null});
    return {lc_no:q(lcNo),applicant_name:q(/KB/.test(lcNo)?'A.B.C. PAPER MILL CO., LTD.':'DELTA PAPER CORPORATION'),port_discharge:q(/KB/.test(lcNo)?'BANGKOK, THAILAND':'HO CHI MINH CITY, VIET NAM'),hs:q('4707.10.00'),po:{value:'PO-NA',loc:'45A',quote:'NOT IN LC',note:null},goods:[{grade:'OCC',quantity:'500 MT',unit_price:null,amount:null,loc:'45A',quote:'WASTE PAPER OCC 500 MT'}],docs:[],conditions_47A:[{no:'47A-1',quote:'ALL DOCUMENTS MUST SHOW LC NUMBER'}]}; }
  if(/ベテラン/.test(sys)) return {sinos:[{sino:1,fields:{crcf9_consignee:{value:'TO ORDER OF APPLICANT',source:'LC(46A-2)',note:''},cr49f_lc_no:{value:lcNo+' DATED ON XX',source:'LC(20)'},crcf9_notify_party:{value:'DELTA PAPER CORPORATION',source:'LC(50)'},crcf9_vo_no:{value:'XX',source:'PLACEHOLDER'},crcf9_bl_text1:{value:'WASTE PAPER#4707.10.00#XXKGS 999999',source:'PRIOR'},
    ...(/バイヤー × 銀行 マスター/.test(txt)?{crcf9_address:{value:'#DELTA PAPER CORPORATION***',source:'MASTER'}}:{})}}],details:[{crcf9_productname:{value:'OCC',source:'CONTRACT'},crcf9_hs_code:{value:'HS CODE: 47071000',source:'LC(45A)'}}],notes:'n'};
  if(/正解/.test(txt)){ const ids=[...txt.matchAll(/^\[(\d+)\]/gm)].map(m=>+m[1]); return {results:ids.map(i=>({id:i,verdict:i%2?'表記差':'内容差',reason:'r'+i,evidence:i%2?'e'+i:''}))}; }
  if(/S\/I|sinos/.test(txt) && /直前|販売契約/.test(txt)) return {sinos:[{sino:1,fields:{crcf9_consignee:{value:'TO ORDER OF '+(/KB/.test(lcNo)?'A.B.C. PAPER MILL CO., LTD.':'DELTA PAPER CORPORATION'),basis:'46A',confidence:'high'},cr49f_lc_no:{value:lcNo+' DATED ON MAR 06, 2026',basis:'20'},crcf9_address:{value:'10 EXAMPLE RD. 12345678',basis:'50'}}},{sino:2,fields:{crcf9_notify_party:{value:'DELTA PAPER CORP',basis:'50'}}}],details:[{crcf9_productname:{value:'OCC',basis:'c'},crcf9_hs_code:{value:'HS CODE: 4707.10',basis:'45A'}}],notes:'x'};
  return {lcNo,applicant:'DELTA PAPER CORPORATION',applicantAddress:'SAMPLE A INDUSTRIAL PARK',country:'VIETNAM',notifyParty46A:'APPLICANT',consignee46A:'TO ORDER OF SAMPLE BANK TOKYO',commodity45A:'WASTE PAPER OCC HS CODE: 4707.10.00',term42C:'AT SIGHT',pod:'HO CHI MINH CITY, VIET NAM',lcDate:'2026-03-06',docs46A:['1. SIGNED COMMERCIAL INVOICE'],addCond47A:'1. ALL DOCUMENTS MUST SHOW LC NUMBER',consignee:'TO ORDER OF SAMPLE BANK TOKYO',blText1:'WASTE PAPER'};
}
async function mockFetch(url, opts){
  if(this&&this.dead) return new Promise(()=>{});   // v0.8: 탭이 닫힌 것처럼 — 이 페이지의 통신은 끝나지 않음
  url=String(url); opts=opts||{}; const u=decodeURIComponent(url);
  if(url.startsWith('https://api.anthropic.com/')){ calls.claude++; const body=JSON.parse(opts.body); if(this&&this.onClaude) this.onClaude(body); return sse(JSON.stringify(claudeReply(body))); }
  if(url.includes('dynamics.com')){ calls.dv++;
    if(/EntityDefinitions\(LogicalName='cr49f_s_i'\)/.test(u)) return J({value:['crcf9_consignee','crcf9_notify_party','crcf9_address','crcf9_tel','crcf9_fax','crcf9_all','crcf9_invoicetext','crcf9_bl_text1','crcf9_bl_text2','crcf9_bencert_text','crcf9_po_vo','crcf9_vo_no','crcf9_remark','cr49f_payment_terms','crcf9_payment_deadline','crcf9_payment_classification','crcf9_place_of_delivery_1','crcf9_place_of_delivery_2','crcf9_place_of_delivery_3','crcf9_port_of_discharge','crcf9_shipping_mark','cr49f_lc_no','crcf9_sino','cr49f_s_iid'].map(x=>({LogicalName:x}))});
    if(/EntityDefinitions\(LogicalName='crcf9_s_i_detail'\)/.test(u)) return J({value:['crcf9_productname','crcf9_hs_code','crcf9_s_i_detailid','crcf9_price','crcf9_weight'].map(x=>({LogicalName:x}))});
    if(/\/cr49f_buyers\?/.test(u)) return J({value:BUYERS});
    if(/\/cr49f_sale_contracts\?/.test(u)) return J({value:SC});
    let m=u.match(/\/cr49f_s_is\?\$filter=_cr49f_sale_contract_id_value eq c-([A-Z0-9-]+)/); if(m) return J({value:siOf(m[1])});
    if(/\/crcf9_s_i_details\?/.test(u)) return J({value:[{crcf9_productname:'OCC',crcf9_hs_code:'HS CODE: 47071000',modifiedon:'2026-03-16T00:00:00Z'}]});
    if(/\/cr49f_sale_details\?/.test(u)) return J({value:[{cr49f_price:200,cr49f_quantity:500,'_cr49f_item_id_value@OData.Community.Display.V1.FormattedValue':'OCC'}]});
    if(/\/cr49f_bookings\?/.test(u)) return J({value:[]});
    return J({error:{message:'unmocked '+u}},404);
  }
  if(url.includes('graph.microsoft.com')){ calls.graph++;
    if((opts.method||'GET')==='PUT'){ const b=opts.body; const text=b&&b.text?await b.text():String(b); const pth=pathOf(u); writes.push({path:pth,text}); store[pth]=text; if(this&&this.onPut) this.onPut(pth,text); return J({id:'x'}); }
    if(/LC\/2026:\/children/.test(u)) return J({value:NOS.map(no=>({name:no+'_'+LCS[no].lcNo+'.pdf',size:1000,file:{}}))});
    if(/:\/children/.test(u)){ const pre=pathOf(u)+'/', seen={}, v=[];   // v0.8: 저장소에서 목록 (폴더 = file 없음)
      Object.keys(store).filter(k=>k.startsWith(pre)).forEach(k=>{ const rest=k.slice(pre.length), nm=rest.split('/')[0]; if(seen[nm]) return; seen[nm]=1; v.push(rest.indexOf('/')<0?{name:nm,size:store[k].length,file:{}}:{name:nm}); });
      return J({value:v}); }
    if(/:\/content$/.test(u) && store[pathOf(u)]!=null) return new Response(store[pathOf(u)],{status:200,headers:{'Content-Type':/\.json$/.test(pathOf(u))?'application/json':'text/plain'}});
    return J({error:{message:'nf'}},404);
  }
  return J({error:{message:'unmocked '+url}},404);
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms,label){ const t0=Date.now(); while(!fn()){ if(Date.now()-t0>(ms||20000)) throw new Error('timeout: '+label); await sleep(20); } }

/* 페이지 1개 열기 → 대상 목록까지. pg.dead = true 면 그 페이지의 통신이 멈춘다 (v0.8 이어서 실행 시험) */
async function openPage(){
  const pg={dead:false};
  const dom=new JSDOM(html,{url:'https://mhlee205.github.io/CONTRACT_SEND/a1_bench.html',runScripts:'dangerously',pretendToBeVisual:true,
    beforeParse(w){ w.fetch=mockFetch.bind(pg); w.TextDecoder=TextDecoder; w.TextEncoder=TextEncoder; w.confirm=()=>{throw new Error('confirm 호출');}; w.alert=()=>{throw new Error('alert 호출');}; w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{}; }});
  const w=dom.window, $=id=>w.document.getElementById(id), ev=s=>w.eval(s);
  Object.assign(pg,{dom,w,$,ev});
  await until(()=>$('a1Main').style.display==='',5000,'onReady');
  // LC 판독: PDF 대신 텍스트 (readLcFile 만 교체 — 그 뒤 판독 경로는 그대로)
  ev(`readLcFile=async function(name){ var no=name.split('_')[0]; var t=window.__lc(no); return {name:name,file:null,size:t.length,restore:{ok:true,text:t,textLen:t.length},text:t,image:false,zeros:0,failed:0,pages:1}; }`);
  w.__lc=lcText;
  pg.masterBtnBefore=$('a1BtnMaster')?$('a1BtnMaster').disabled:null;
  $('a1BtnTargets').click();
  await until(()=>/완료|오류/.test($('a1TargetStatus').textContent),30000,'targets');
  return pg;
}
/* 저장소에서 run 폴더의 최종 산출물 (partial/ · progress.json 제외) — cmp.js 입력 모양 */
function runFiles(id){ const pre=Object.keys(store).find(k=>k.endsWith('/'+id+'/run_config.json')).replace(/run_config\.json$/,'');
  return Object.keys(store).filter(k=>k.startsWith(pre)).map(k=>({file:k.slice(pre.length),text:store[k]})).filter(f=>!/^partial\//.test(f.file)&&f.file!=='progress.json').sort((a,b)=>a.file.localeCompare(b.file)); }
const runIds=()=>[...new Set(Object.keys(store).map(k=>(k.match(/A1_bench\/(A1_\d{8}-\d{6}_(?:pilot|full))\//)||[])[1]).filter(Boolean))].sort();
const clickAsk=async(pg,matchFn,label)=>{ await until(()=>pg.$('a1Ask').style.display==='flex',8000,'ask '+label); const html=pg.$('a1AskBody').innerHTML; const btns=[...pg.w.document.querySelectorAll('#a1AskBtns button')]; const b=btns.find(matchFn); if(!b) throw new Error('버튼 없음: '+label+' / '+btns.map(x=>x.textContent).join(',')); b.click(); await sleep(30); return html; };

(async()=>{
  const pg0=await openPage(), w=pg0.w, $=pg0.$, ev=pg0.ev;
  const out={title:w.document.title, mode};
  out.masterBtnBefore=pg0.masterBtnBefore;
  out.targetStatus=$('a1TargetStatus').textContent; out.targets=ev('S.targets.length');
  if(mode==='integ'){
    out.masterBtnAfter=$('a1BtnMaster').disabled; out.saveBtnBefore=$('a1BtnMasterSave').disabled;
    const c0={...calls};
    $('a1BtnMaster').click();
    out.masterCalls={dv:calls.dv-c0.dv,graph:calls.graph-c0.graph,claude:calls.claude-c0.claude};
    out.keys=ev('S.master.keys.length'); out.rows=w.document.querySelectorAll('#a1MasterTable tr.a1-mk').length;
    out.keyList=ev('S.master.keys.map(k=>[k.buyer,k.bank,k.applicant,k.contracts.join(" "),k.counts.確実,k.counts.確認要,k.counts.単発,k.lc_diff.length].join(" | "))');
    w.document.querySelector('#a1MasterTable tr.a1-mk').click(); out.detailShown=$('a1MkD0').style.display===''; out.detailHasPh=/a1-ph/.test($('a1MkD0').innerHTML);
    out.master=JSON.parse(ev('JSON.stringify(S.master)'));
    const w0=writes.length;
    $('a1BtnMasterSave').click(); await until(()=>$('a1Ask').style.display==='flex',3000,'ask1');
    out.askText=$('a1AskBody').textContent; $('a1AskBtn1').click(); await sleep(200);
    out.writesAfterCancel=writes.length-w0;
    $('a1BtnMasterSave').click(); await until(()=>$('a1Ask').style.display==='flex',3000,'ask2');
    $('a1AskBtn0').click(); await until(()=>/저장 완료|저장 실패/.test($('a1MasterStatus').textContent),5000,'save');
    const nw=writes.slice(w0); out.writesAfterSave=nw.map(x=>({path:x.path,bytes:Buffer.byteLength(x.text)}));
    out.files=Object.fromEntries(nw.map(x=>[x.path.split('/').pop(),x.text]));
  }
  if(mode==='bench'){
    // 파일럿 (R1+R2) — 고정 2건
    try{ w.localStorage.setItem('leenai_apikey_v1','sk-test'); }catch(e){}
    $('a1PilotList').value='LRS-2605SG1\nLRS-2606CA1'; $('a1Rounds').value='R1R2';
    if($('a1R2Master')) $('a1R2Master').checked=masterSw!=='off';
    $('a1RunPilot').click(); await until(()=>$('a1Ask').style.display==='flex',5000,'askRun'); out.estHtml=$('a1AskBody').innerHTML; $('a1AskBtn0').click();
    await until(()=>ev('S.lastOut')&&!ev('S.running'),60000,'run');
    out.bench=writes.filter(x=>/A1_bench\/A1_/.test(x.path)).map(x=>({file:x.path.replace(/^.*A1_bench\/A1_[^/]+\//,''),text:x.text}));
    // R0 (UI 에서는 withR0:false) — 함수 직접 호출로 같은 mock 비교
    out.r0=JSON.parse(await ev(`(async()=>{ const t=S.targets.find(x=>x.no==='LRS-2605SG1'); const lcp=await parseContractLc(t.no); await ensureBuyerSis(t); const rec=await runR0(t,lcp,{r0Source:'new',maxTokens:32000}); rec.rows=compareRun(t,S.siByContract[t.no],rec); return JSON.stringify(rec); })()`));
  }
  if(mode==='r2'){
    // v0.7: 「R2만」 3건 — 2603SG1 (첫 거래 · 마스터 없음) · 2604SG1 (앞 1건) · 2605SG1 (앞 2건 → 확실 틀)
    try{ w.localStorage.setItem('leenai_apikey_v1','sk-test'); }catch(e){}
    $('a1PilotList').value='LRS-2603SG1\nLRS-2604SG1\nLRS-2605SG1'; $('a1Rounds').value='R2';
    if($('a1R2Master')) $('a1R2Master').checked=masterSw!=='off';
    $('a1RunPilot').click(); await until(()=>$('a1Ask').style.display==='flex',5000,'askRun'); out.estHtml=$('a1AskBody').innerHTML; $('a1AskBtn0').click();
    await until(()=>ev('S.lastOut')&&!ev('S.running'),60000,'run');
    out.bench=writes.filter(x=>/A1_bench\/A1_/.test(x.path)).map(x=>({file:x.path.replace(/^.*A1_bench\/A1_[^/]+\//,''),text:x.text}));
    out.assemblePrompts=prompts.filter(p=>p.kind==='r2_assemble').map(p=>({lcNo:p.lcNo,txt:p.txt}));
    out.est12=JSON.parse(ev(`(()=>{ const o=readOpts(); o.useR2=true; o.models=[]; const tok=r2MasterTokens(S.targets,o); const off=Object.assign({},o,{r2Master:false}); return JSON.stringify({tok, on:planOf(12,o,tok), off:planOf(12,off,r2MasterTokens(S.targets,off))}); })()`));
  }
  if(mode==='resume'){
    // v0.8 Step 4 — 전체 실행 6건 (동시 1건 · R1+R2). 기준(끊김 없음) A → 강제 중단 B → 새 페이지 C 에서 이어서 실행
    const prep=pg=>{ try{ pg.w.localStorage.setItem('leenai_apikey_v1','sk-test'); }catch(e){} pg.$('a1Rounds').value='R1R2'; pg.$('a1Conc').value='1'; if(pg.$('a1R2Master')) pg.$('a1R2Master').checked=masterSw!=='off'; };
    const NO_OF={}; NOS.forEach(no=>{ NO_OF[LCS[no].lcNo]=no; });
    const who=body=>{ const m=body.messages[body.messages.length-1], t=typeof m.content==='string'?m.content:m.content.filter(c=>c.type==='text').map(c=>c.text).join('\n'); const c=t.match(/契約番号: (LRS-[A-Z0-9]+)/); if(c) return c[1]; const l=t.match(/ILC\d{4}|KB\d{4}/); return l?NO_OF[l[0]]:'?'; };
    const tally=pg=>{ pg.byNo={}; pg.onClaude=b=>{ const k=who(b); pg.byNo[k]=(pg.byNo[k]||0)+1; }; };
    out.order=ev('S.targets.map(t=>t.no)'); out.fullBtnDisabled=$('a1RunFull').disabled; out.fullBtnText=$('a1RunFull').textContent;
    // A — 취소 → 호출 0 · 쓰기 0 / 실행 → 끝까지
    prep(pg0); tally(pg0);
    const c0=calls.claude, w0=writes.length;
    $('a1RunFull').click(); out.estFull=await clickAsk(pg0,b=>b.textContent==='취소','cancel'); await sleep(300);
    out.cancel={claude:calls.claude-c0, writes:writes.length-w0};
    $('a1RunFull').click(); await clickAsk(pg0,b=>b.textContent==='실행','runA');
    await until(()=>ev('S.lastOut')&&!ev('S.running'),120000,'runA');
    const idA=runIds().slice(-1)[0]; out.idA=idA; out.byNoA=pg0.byNo; out.logA=[...w.document.querySelectorAll('#a1Log div')].map(d=>d.textContent).reverse();
    out.progressA=JSON.parse(store[Object.keys(store).find(k=>k.endsWith(idA+'/progress.json'))]);
    await sleep(1100);   // run_id 는 초 단위
    // B — 2건 partial 저장 뒤 통신 멈춤 (3건째 도중)
    const pgB=await openPage(); prep(pgB);
    pgB.onPut=(pth,text)=>{ const m=pth.match(/(A1_\d{8}-\d{6}_full)\/progress\.json$/); if(m&&m[1]!==idA){ pgB.idB=m[1]; try{ if(JSON.parse(text).done.length>=2) pgB.dead=true; }catch(e){} } };   // 2건이 「끝남」 으로 저장된 직후 → 3건째 도중에 멈춤
    pgB.$('a1RunFull').click(); await clickAsk(pgB,b=>b.textContent==='실행','runB');
    await until(()=>pgB.dead,60000,'killB'); await sleep(500);
    const idB=pgB.idB; out.idB=idB; out.killedProgress=JSON.parse(store[Object.keys(store).find(k=>k.endsWith(idB+'/progress.json'))]);
    out.killedHasResults=Object.keys(store).some(k=>k.endsWith(idB+'/results.json'));
    // C — 설정이 다르면 막힘 (회차 R1) → 맞추면 이어서 실행
    const pgC=await openPage(); prep(pgC); tally(pgC);
    pgC.$('a1Rounds').value='R1';
    const c1=calls.claude; pgC.$('a1Resume').click();
    out.resumeList=await clickAsk(pgC,b=>b.textContent===idB,'pick1');
    out.blockedText=await clickAsk(pgC,b=>b.textContent==='確認','blocked');
    out.blockedCalls=calls.claude-c1;
    pgC.$('a1Rounds').value='R1R2';
    pgC.$('a1Resume').click(); await clickAsk(pgC,b=>b.textContent===idB,'pick2');
    out.resumeEst=await clickAsk(pgC,b=>b.textContent==='실행','resume');
    await until(()=>pgC.ev('S.lastOut')&&!pgC.ev('S.running'),120000,'runC');
    out.byNoC=pgC.byNo; out.logC=[...pgC.w.document.querySelectorAll('#a1Log div')].map(d=>d.textContent).reverse();
    out.progressC=JSON.parse(store[Object.keys(store).find(k=>k.endsWith(idB+'/progress.json'))]);
    out.partialsLeft=Object.keys(store).filter(k=>k.includes(idB+'/partial/')).length;
    // 기준 A 와 이어서 실행한 B 의 최종 산출물 (cmp.js 입력)
    fs.writeFileSync(outPath.replace(/\.json$/,'')+'.ref.json',JSON.stringify({bench:runFiles(idA),r0:{rows:[]}}));
    fs.writeFileSync(outPath.replace(/\.json$/,'')+'.resumed.json',JSON.stringify({bench:runFiles(idB),r0:{rows:[]}}));
  }
  out.calls=calls;
  fs.writeFileSync(outPath,JSON.stringify(out,null,1)); console.log('ok',mode,outPath); process.exit(0);
})().catch(e=>{ console.error('HARNESS ERROR',e&&e.stack||e); process.exit(1); });
