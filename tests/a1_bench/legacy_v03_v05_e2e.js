/* legacy 시험 (v0.3 ~ v0.5) — 통합 · 집 Mac 에서 옮김 (2026-11-16, 리나이 지시서 D00_A1_예전시험파일이관 v1.0)
   node legacy_v03_v05_e2e.js [a1_bench.html] [pilot|full]
   jsdom + fetch mock — 페이지를 그대로 열어 「대상 목록 → 파일럿(또는 전체) 실행 → SharePoint 저장」 을 끝까지. 네트워크 없음.
   예전에는 실제 SMBC LC PDF 2건을 pdf.js 로 읽었으나 공개 레포라 → 가짜 LC 텍스트(legacy_fixtures.js)로 바꾸고, harness.js 처럼 readLcFile 만 텍스트로 교체.
   회사명 · 주소 · 세금번호 · 허가번호 · LC 번호 · PO 는 전부 가짜. */
const fs=require('fs'),path=require('path'),assert=require('assert');
let JSDOM; try{ ({JSDOM}=require('jsdom')); }catch(e){ ({JSDOM}=require(path.join(process.env.APPDATA||'','npm/node_modules/jsdom'))); }
const FX=require('./legacy_fixtures.js');
let html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const VER=(html.match(/version:'(\d+\.\d+)'/)||[])[1];   // 지금 버전 (v0.8~ 버전 표기는 시험 대상 html 에서 읽음)
const R1DUMP=process.env.R1DUMP||'';   // v0.4 자체 확인 #7: 같은 mock 으로 R1 rows 만 꺼내 v0.3 ↔ v0.4 비교
const FULL=process.argv[3]==='full'||!!process.env.FULL; const UNLOCKED=/const A1_FULL_RUN_UNLOCKED = true;/.test(html);
if(FULL && !UNLOCKED) html=html.replace('const A1_FULL_RUN_UNLOCKED = false;','const A1_FULL_RUN_UNLOCKED = true;');   // v0.8~ 은 이미 잠금 해제
// 공통 파일 대신 가짜 LEENAI (init → onReady 즉시)
html=html.replace(/<script src="https:\/\/mhlee205\.github\.io\/LEENAI_COMMON\/v1\/leenai-common\.js"><\/script>/,'<script>window.LEENAI={init:function(c){window.__cfg=c;document.title="LEENAI "+c.sys+" "+c.name+" v"+c.version;document.getElementById("app").style.display="";setTimeout(c.onReady,0);},auth:{status:{dataverse:"ok",graph:"ok"},token:async function(t){return "TOK-"+t;}},master:{get:async function(n){ if(n==="hscode") return [{item:"JOCC",hs:"4707.10"}]; if(n==="payment") return [{code:"LC90",label:"90 DAYS"}]; throw new Error("none"); }},SP:{DRIVE_ID:"DRV"}};</script>')
           .replace('<link rel="stylesheet" href="https://mhlee205.github.io/LEENAI_COMMON/v1/leenai-common.css">','');
const KEY='TESTKEY-should-never-appear-0000';   // 가짜 키 (보안 grep 에 걸리지 않게 접두어 없음)
const S1=FX.SG_LC, S2=FX.A_LC;   // 가짜 LC 원문 (0 복원 후 텍스트 모양)

/* ── 가짜 데이터 ── */
const BUY={SG:'b-sg',A:'b-a',Z:'b-z'};
const contracts=[
  ['LRS-2604SG1','2026-04-01','LC',BUY.SG],['LRS-2602SG3','2026-02-05','LC',BUY.SG],['LRS-2605SG1','2026-05-02','LC',BUY.SG],['LRS-2510SG1','2025-10-01','LC',BUY.SG],
  ['LRS-2603A1','2026-03-01','LC',BUY.A],['LRS-2601A1','2026-01-05','LC',BUY.A],['LRS-2611A1','2026-11-01','LC',BUY.A],['LRS-2610XX1','2026-10-01','TT',BUY.A],['LRS-2610ZZ1','2026-10-03','LC',BUY.Z]
].map(([no,d,pc,b],i)=>({cr49f_sale_contractid:'sc-'+i,cr49f_sale_contract_no:no,cr49f_sale_contract_date:d+'T00:00:00Z',cr49f_pay_cls:pc,_cr49f_buyer_id_value:b,cr49f_pay_days:'90 DAYS',cr49f_terms_conditions:'CIF',cr49f_po_no:'',cr49f_latest_shipment:null,cr49f_tolerance:10,_cr49f_pod1_value:'p'}));
const idOf=no=>contracts.find(c=>c.cr49f_sale_contract_no===no).cr49f_sale_contractid;
const LCNO={'LRS-2604SG1':'ILC0000101 DATED ON APR 07, 2026','LRS-2602SG3':'ILC2601111 DATED ON FEB 03, 2026','LRS-2605SG1':'ILC2604444 DATED ON MAY 01, 2026','LRS-2510SG1':'ILC2509999 DATED ON OCT 01, 2025',
  'LRS-2603A1':'ILC9160000001 DATED ON MAR 06, 2026','LRS-2601A1':'ILC9160000009 DATED ON JAN 06, 2026','LRS-2611A1':'ILC9160000333 DATED ON NOV 01, 2026','LRS-2610ZZ1':'ILC9160000999 DATED ON OCT 02, 2026'};
const sis={};
Object.keys(LCNO).forEach(no=>{ const id=idOf(no); const vn=/SG/.test(no);
  sis[id]=[{cr49f_s_iid:'si-'+no+'-1',crcf9_sino:1,cr49f_lc_no:LCNO[no],crcf9_consignee:vn?'0300000002#999/GPMT-BTNMT#SECURITY DEPOSIT NUMBER#DELTA PAPER CORPORATION':'TO ORDER OF SAMPLE BANK SINGAPORE',crcf9_notify_party:'DELTA PAPER CORPORATION',
    crcf9_address:'SAMPLE A INDUSTRIAL PARK, SAMPLE WARD, HO CHI MINH CITY, VIET NAM',crcf9_po_vo:'PO '+no.slice(4),crcf9_payment_deadline:'90 DAYS FROM BILL OF LADING DATE',cr49f_payment_terms:'CIF CAI MEP PORT IN VIETNAM',
    crcf9_payment_classification:'LC',crcf9_place_of_delivery_1:'CAI MEP PORT IN VIETNAM',crcf9_bl_text1:'WASTE PAPER#XXKGS',crcf9_remark:null,createdon:'2026-04-09T01:00:00Z',modifiedon:no==='LRS-2604SG1'?'2026-06-01T01:00:00Z':'2026-04-10T01:00:00Z'}]
    .concat(vn?[{cr49f_s_iid:'si-'+no+'-2',crcf9_sino:2,cr49f_lc_no:LCNO[no],crcf9_consignee:'DELTA PAPER CORPORATION',crcf9_notify_party:'DELTA PAPER CORPORATION',crcf9_payment_classification:'LC',crcf9_all:'IMPORT LICENCE 999/GPMT-BTNMT',createdon:'2026-04-09T01:00:00Z',modifiedon:'2026-04-10T01:00:00Z'}]:[]); });
const FIELDS=['cr49f_s_iid','crcf9_sino','crcf9_consignee','crcf9_notify_party','crcf9_address','crcf9_tel','crcf9_fax','crcf9_all','crcf9_invoicetext','crcf9_bl_text1','crcf9_bl_text2','crcf9_bencert_text','crcf9_po_vo','crcf9_vo_no','crcf9_remark','cr49f_payment_terms','crcf9_payment_deadline','crcf9_payment_classification','crcf9_place_of_delivery_1','crcf9_place_of_delivery_2','crcf9_place_of_delivery_3','crcf9_port_of_discharge','crcf9_shipping_mark','cr49f_lc_no'];
const spFiles={'LRS-2602SG3_ILC2601111.pdf':S1,'LRS-2604SG1_ILC0000101.pdf':S1,'LRS-2603A1_ILC9160000001.pdf':S2,'LRS-2611A1_ILC9160000333.pdf':S2,'LRS-2603A1_ILC9160000001_AMEND1.pdf':S2,'LRS-2610ZZ1_ILC9160000999.pdf':S2,'memo.pdf':S2};
const d01Json={'LRS-2604SG1_ILC0000101.json':FX.D01_SG};
const puts=[], aiCalls=[]; let dvWrites=0; const extractN={}, asmN={}, r1A=[0];
function sse(text,model){ const ev=[{type:'message_start',message:{model,usage:{input_tokens:1200,cache_read_input_tokens:0,output_tokens:1}}},{type:'content_block_delta',index:0,delta:{type:'text_delta',text}},{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:345}},{type:'message_stop'}];
  return new Response(ev.map(e=>'event: '+e.type+'\ndata: '+JSON.stringify(e)+'\n\n').join(''),{status:200,headers:{'content-type':'text/event-stream'}}); }
const J=(o,st)=>new Response(JSON.stringify(o),{status:st||200,headers:{'content-type':'application/json'}});
async function fakeFetch(url,opts){
  url=String(url); opts=opts||{}; const method=(opts.method||'GET').toUpperCase();
  if(url.startsWith('https://orgde512c6f.crm7.dynamics.com/')){
    if(method!=='GET') { dvWrites++; return J({},405); }
    const u=decodeURIComponent(url);
    if(/EntityDefinitions\(LogicalName='cr49f_s_i'\)/.test(u)) return J({value:FIELDS.map(f=>({LogicalName:f}))});
    if(/EntityDefinitions\(LogicalName='crcf9_s_i_detail'\)/.test(u)) return J({value:['crcf9_productname','crcf9_hs_code','crcf9_s_i_detailid','crcf9_price','crcf9_weight'].map(f=>({LogicalName:f}))});
    if(/cr49f_buyers\?/.test(u)) return J({value:[{cr49f_buyerid:BUY.SG,cr49f_buyer:'SAIGON',cr49f_buyer_name:'DELTA PAPER CORPORATION',crcf9_country:'VIETNAM'},{cr49f_buyerid:BUY.A,cr49f_buyer:'ASPEX',cr49f_buyer_name:'PT SAMPLE KERTAS',crcf9_country:'INDONESIA'},{cr49f_buyerid:BUY.Z,cr49f_buyer:'ZETA',cr49f_buyer_name:'ZETA PAPER',crcf9_country:'INDONESIA'}]});
    if(/cr49f_sale_contracts\?/.test(u)) return J({value:contracts});
    let m=u.match(/cr49f_s_is\?\$filter=_cr49f_sale_contract_id_value eq (\S+?)&/); if(m) return J({value:sis[m[1]]||[]});
    m=u.match(/crcf9_s_i_details\?\$filter=_crcf9_s_i_id_value eq (\S+?)&/); if(m) return J({value:[{crcf9_productname:'WASTE PAPER (SOP)',crcf9_hs_code:'HS CODE: 4707 30 00',modifiedon:'2026-04-10T00:00:00Z'}]});
    if(/cr49f_sale_details\?/.test(u)) return J({value:[{cr49f_price:202,cr49f_quantity:400,'_cr49f_item_id_value@OData.Community.Display.V1.FormattedValue':'JOCC'}]});
    if(/cr49f_bookings\?/.test(u)) return J({value:[{cr49f_invoice_no:'NSG2604-01',cr49f_etd:'2026-05-10',crcf9_bl_etd:'2026-05-12'}]});
    throw new Error('unmocked DV '+u);
  }
  if(url.startsWith('https://graph.microsoft.com/')){
    const u=decodeURIComponent(url);
    if(method==='PUT'){ const b=opts.body; const txt=b&&b.arrayBuffer?new TextDecoder('utf-8',{ignoreBOM:true}).decode(await b.arrayBuffer()):String(b); puts.push({path:u.replace(/^.*root:\//,'').replace(/:\/content$/,''),body:txt}); return J({id:'x'}); }
    if(method!=='GET') throw new Error('unexpected '+method+' '+u);
    if(/root:\/古紙\/LC\/2026:\/children/.test(u)) return J({value:Object.keys(spFiles).map(n=>({name:n,size:spFiles[n].length,file:{}}))});
    let m=u.match(/root:\/古紙\/LC\/2026\/(.+):\/content$/); if(m) return new Response(spFiles[m[1]],{status:200});
    if(/D-01-LC_FD_CHECKER:\/children/.test(u)) return J({value:Object.keys(d01Json).map(n=>({name:n,file:{}})).concat([{name:'LRS-2604SG1_TT_BASE.json',file:{}}])});
    m=u.match(/D-01-LC_FD_CHECKER\/(.+):\/content$/); if(m) return J(d01Json[m[1]]||{},d01Json[m[1]]?200:404);
    throw new Error('unmocked Graph '+u);
  }
  if(url==='https://api.anthropic.com/v1/messages'){
    const body=JSON.parse(opts.body); aiCalls.push({body,headers:opts.headers});
    const txt=JSON.stringify(body.messages); const sys=String(body.system||'');
    if(body.model==='claude-fable-5-2') return J({type:'error',error:{type:'not_found_error',message:'model: claude-fable-5-2'}},404);
    const vnC=/ILC0000101|契約番号: LRS-2604SG1/.test(txt);   // 계약 식별 (관행 목록에 SAIGON · ASPEX 낱말이 있어 이름으로는 못 가름)
    if(/判読担当/.test(sys)){   // R2 ①
      const k='x'+(vnC?'SG':'A'); extractN[k]=(extractN[k]||0)+1; const n=extractN[k];
      const f=(v,loc,q)=>({value:v,loc,quote:q===undefined?v:q});
      const e=vnC?{lc_no:f('ILC0000101',':20'),issue_date:n%2?f('APR 7, 2026',':31C','APR  7, 2026'):f('2026-04-07',':31C',null),applicant_name:f('DELTA PAPER CORPORATION',':50'),applicant_address:f('SAMPLE A INDUSTRIAL PARK, SAMPLE WARD, HO CHI MINH CITY, VIET NAM',':50'),
          bl_notify:f('0300000002#999/GPMT-BTNMT#SECURITY DEPOSIT NUMBER#DELTA PAPER CORPORATION','46A-2'),po:f('SOP0000001','45A-8','PURCHASE ORDER NO. SOP0000001'),
          tolerance:n%2?f('10% MORE OR 10% LESS',':39A'):f('+/-5%',':39A','5% MORE OR 5% LESS'),hs:f('4707.30','45A','HS CODE 4707.30'),
          goods:[{grade:'SOP3',quantity:n%2?'400 MT':'550 MT',unit_price:'USD202/MT',amount:'USD80,800.00',loc:'45A-3',quote:'QUANTITY: 400 MT'}],docs:[{doc_type:'IV',originals:'3',copies:null,set_fraction:null,alt_group:null,loc:'46A-1',quote:'SIGNED COMMERCIAL INVOICE IN 03 ORIGINALS.'}],conditions_47A:[{no:'47A-1',quote:'ALL DOCUMENTS MUST BE PRESENTED TO THE ISSUING BANK'}]}
        :{lc_no:f('ILC9160000001',':20'),applicant_name:f('PT SAMPLE KERTAS',':50'),port_discharge:f('TANJUNG PRIOK PORT, JAKARTA, INDONESIA',':44F')};
      return sse(JSON.stringify(e),body.model);
    }
    if(/組み立てます/.test(sys)){   // R2 ③
      const isZ=/LRS-2610ZZ1/.test(txt); const k='a'+(isZ?'Z':(vnC?'SG':'A')); asmN[k]=(asmN[k]||0)+1;
      if(k==='aA' && asmN[k]>=2) return sse('ごめんなさい、JSON ではありません',body.model);   // 2603A1 조립 2회째: 재시도까지 실패
      const hasIssue=/"item": "issue_date"/.test(String(body.messages[0].content[0].text||'').split('【未確定')[0]);
      const f=(v,src,note)=>({value:v,source:src,note:note||''});
      const s1=vnC?{crcf9_consignee:f('0300000002#999/GPMT-BTNMT#SECURITY DEPOSIT NUMBER#DELTA PAPER CORPORATION','LC(46A-2)'),crcf9_notify_party:f('DELTA PAPER CORPORATION','LC(:50)'),
          crcf9_address:f('1 EXAMPLE ROAD BANGKOK','LC(:50)'),crcf9_po_vo:f('XX','PLACEHOLDER'),crcf9_vo_no:f('XX','PLACEHOLDER'),cr49f_lc_no:f('ILC0000101 DATED ON '+(hasIssue?'APR 07, 2026':'XX'),'LC(:20 :31C)'),crcf9_payment_deadline:f('90 DAYS FROM BILL OF LADING DATE','LC(:42C)'),cr49f_payment_terms:f('CIF CAI MEP PORT IN VIETNAM','LC(45A-7)'),crcf9_payment_classification:f('LC','CONTRACT')}
        :isZ?{crcf9_consignee:f('TO ORDER OF SAMPLE BANK SINGAPORE','LC(46A)'),crcf9_vo_no:f('XX','PLACEHOLDER'),crcf9_notify_party:f('PT SAMPLE KERTAS','LC(:50)')}
        :{crcf9_consignee:f('TO ORDER OF SAMPLE BANK SINGAPORE','PRIOR(LRS-2601A1)'),cr49f_lc_no:f('ILC9160000001 DATED ON MAR 06, 2026','LC(:20)'),crcf9_payment_classification:f('LC','CONTRACT')};
      return sse(JSON.stringify({sinos:[{sino:1,fields:s1}].concat(vnC?[{sino:2,fields:{crcf9_consignee:f('DELTA PAPER CORPORATION','LC(:50)')}}]:[]),details:[{crcf9_productname:f('WASTE PAPER (SOP)','PRIOR'),crcf9_hs_code:f('HS CODE: 47073000','PRIOR')}],notes:'r2'}),body.model);
    }
    if(/詳細分析し、JSONのみ出力/.test(txt)) return sse(JSON.stringify({lcNo:'ILC0000101',lcDate:'07/04/2026',country:'VIETNAM',applicant:'DELTA PAPER CORPORATION',applicantAddress:'SAMPLE A INDUSTRIAL PARK, SAMPLE WARD, HO CHI MINH CITY, VIET NAM',pod:'CAI MEP PORT IN VIETNAM',term42C:'90 DAYS FROM BILL OF LADING DATE',commodity45A:'+ COMMODITY: WASTE PAPER\n+ TRADE TERMS: CIF CAI MEP PORT IN VIETNAM (INCOTERMS 2020)',consignee46A:'',notifyParty46A:'0300000002#999/GPMT-BTNMT#SECURITY DEPOSIT NUMBER#DELTA PAPER CORPORATION',docs46A:['1/ SIGNED COMMERCIAL INVOICE'],addCond47A:'1/ ALL DOCUMENTS',localAgentRequired:true}),body.model);
    if(/過去SIの実績と新しいLC条件/.test(txt)) return sse(JSON.stringify({consignee:'',notifyParty:'DELTA PAPER CORPORATION',address:'SAMPLE A',blText1:'WASTE PAPER#XXKGS',all:'',invoiceText:'',beneText:''}),body.model);
    if(/正解（実際の S\/I）/.test(txt)){ const ids=[...txt.matchAll(/\[(\d+)\] 欄=/g)].map(m=>+m[1]); return sse(JSON.stringify({results:ids.map(id=>({id,verdict:id%2?'内容差':'表記差',reason:'test',evidence:id%2?'':'正解『A』/推奨『B』'}))}),body.model); }
    if(/S\/I（sino 1・2 の各欄と明細）/.test(sys)){
      const vn=vnC;
      if(/契約番号: LRS-2603A1/.test(txt) && body.model==='claude-opus-5-5'){ r1A[0]++; if(r1A[0]===1) return sse('JSON を出力します…（途中で終わり',body.model); }   // 2603A1 R1 1회째: 첫 응답만 JSON 아님 → 재시도 성공
      const f=(v,b)=>({value:v,basis:b||'test',confidence:'high'});
      const s1={crcf9_consignee:f(vn?'0300000002#999/GPMT-BTNMT#SECURITY DEPOSIT NUMBER#DELTA PAPER CORPORATION':'TO ORDER OF SAMPLE BANK SINGAPORE'),crcf9_notify_party:f('DELTA PAPER CORPORATION'),crcf9_address:f('SAMPLE A INDUSTRIAL PARK, SAMPLE WARD, HO CHI MINH CITY, VIETNAM'),
        crcf9_po_vo:f('PO 99999999'),cr49f_lc_no:f(vn?'ILC0000101 DATED ON APR 07, 2026':'ILC9160000001 DATED ON MAR 06, 2026'),crcf9_payment_deadline:f('90 DAYS FROM B/L DATE'),cr49f_payment_terms:f('CIF CAI MEP PORT IN VIETNAM'),crcf9_payment_classification:f('LC')};
      return sse(JSON.stringify({sinos:[{sino:1,fields:s1}].concat(vn?[{sino:2,fields:{crcf9_consignee:f('DELTA PAPER CORPORATION')}}]:[]),details:[{crcf9_productname:f('WASTE PAPER (SOP)'),crcf9_hs_code:f('HS CODE: 47073000')}],notes:'ok'}),body.model);
    }
    throw new Error('unmocked AI prompt');
  }
  throw new Error('unmocked '+url);
}
async function waitAsk(){ for(let i=0;i<100;i++){ if(globalThis.__w && globalThis.__w.document.getElementById('a1Ask').style.display==='flex') return; await new Promise(r=>setTimeout(r,50)); } throw new Error('확인 상자가 안 열림'); }
(async()=>{
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://mhlee205.github.io/CONTRACT_SEND/a1_bench.html',pretendToBeVisual:true,
    beforeParse(w){ w.fetch=fakeFetch; w.Response=Response; w.Blob=Blob; w.TextDecoder=TextDecoder; w.TextEncoder=TextEncoder; w.performance=performance;
      w.localStorage.setItem('leenai_apikey_v1',KEY); w.confirm=()=>{ throw new Error('confirm() 사용됨'); }; w.alert=m=>{ throw new Error('alert: '+m); };
      w.URL.createObjectURL=()=>'blob:x'; w.ReadableStream=ReadableStream;
      const errs=w.__errs=[]; w.addEventListener('error',e=>errs.push(String(e.message)));
      w.console.error=(...a)=>errs.push(a.join(' ')); } });
  const w=dom.window, $=id=>w.document.getElementById(id); globalThis.__w=w;
  await new Promise(r=>setTimeout(r,200));
  // LC 판독: PDF 대신 가짜 텍스트 (readLcFile 만 교체 — 그 뒤 판독 경로는 그대로, harness.js 와 같은 방법)
  w.__lcText=n=>spFiles[n];
  w.eval(`readLcFile=async function(name){ var t=window.__lcText(name); return {name:name,file:null,size:t.length,restore:{ok:true,text:t,textLen:t.length,zeros:0,failed:0,pages:1},text:t,image:false,zeros:0,failed:0,pages:1}; }`);
  let pass=0, failN=0; const ok=(c,m)=>{ let r=false; try{ r=!!c; }catch(e){} if(r){ pass++; console.log('PASS',m); } else { failN++; console.log('FAIL',m); } };
  if(!R1DUMP) ok(w.document.title==='LEENAI D-00 A1 SI推奨精度試験 v'+VER, '버전은 LEENAI.init 1곳 → 탭 제목 '+w.document.title);
  ok(w.__cfg.redirectUri==='https://mhlee205.github.io/CONTRACT_SEND/a1_bench.html' && w.__cfg.graphScopes.join()==='Sites.ReadWrite.All', 'redirectUri · graphScopes');
  ok($('a1Main').style.display==='', 'onReady → 본문 표시');
  if(!R1DUMP) ok($('a1M1').value==='claude-opus-5-5' && $('a1M2').value==='' && $('a1M3').value==='' && $('a1R2Model').value==='claude-opus-5-5' && $('a1Rounds').value==='R1R2' && $('a1FullModel').value==='claude-opus-5-5', '기본값: R1 · R2 = Opus 5.5 하나, 모델 2·3 빈칸, 회차 R1+R2');
  if(!R1DUMP) { const pr=JSON.parse($('a1Price').value); ok(JSON.stringify(pr)==='{"claude-opus-5-5":[4,20],"claude-fable-5-2":[8,40],"claude-sonnet-4-6":[3,15],"claude-sonnet-5-5":[2,10]}' && /2026-11-09/.test($('a1PriceNote').textContent) && /콘솔/.test($('a1PriceNote').textContent), '단가표 · 「가격표 기준일 2026-11-09 · 실제 청구는 콘솔」'); }
  if(!FULL) ok($('a1RunFull').disabled===!UNLOCKED, '전체 실행 버튼 = A1_FULL_RUN_UNLOCKED ('+(UNLOCKED?'v0.8~ 잠금 해제':'잠금')+')');
  // 대상 목록
  $('a1BtnTargets').click();
  for(let i=0;i<300 && !/완료|오류/.test($('a1TargetStatus').textContent);i++) await new Promise(r=>setTimeout(r,100));
  console.log('   상태:',$('a1TargetStatus').textContent);
  ok(/완료/.test($('a1TargetStatus').textContent),'대상 목록 완료');
  if(R1DUMP){
    $('a1Rounds').value='R1'; $('a1RunPilot').click(); await waitAsk(); $('a1AskBtn0').click();
    for(let i=0;i<600 && !/저장 완료|결과 저장 실패/.test($('a1Log').textContent);i++) await new Promise(r=>setTimeout(r,100));
    const res=JSON.parse(puts.filter(p=>p.path.endsWith('/results.json')).pop().body);
    const r1=res.contracts.slice().sort((a,b)=>a.no.localeCompare(b.no)).map(c=>({no:c.no,runs:c.runs.filter(r=>r.round==='R1').sort((a,b)=>a.rep-b.rep).map(r=>({model:r.model,rep:r.rep,sinos:r.sinos,details:r.details,rows:r.rows}))}));
    fs.writeFileSync(R1DUMP,JSON.stringify(r1,null,1)); console.log('R1DUMP',R1DUMP,r1.length); process.exit(0);
  }
  const tt=$('a1TargetTable').textContent, ex=$('a1ExclTable').textContent;
  ok(/LRS-2604SG1/.test(tt) && /LRS-2603A1/.test(tt) && /LRS-2611A1/.test(tt), '대상: 2604SG1 · 2603A1 · 2611A1');
  ok(/LRS-2605SG1/.test(ex) && /LC 원본 없음/.test(ex), '제외: 2605SG1 (LC 원본 없음)');
  ok(/memo\.pdf/.test(ex) && /파일명 해석 불가/.test(ex), '제외: memo.pdf 파일명 해석 불가');
  ok(/BIC:BFTVVNVX/.test(tt) && /BIC:HVBKSGSG/.test(tt), '은행 키: BIC:BFTVVNVX · BIC:HVBKSGSG (INPUT HEADER)');
  ok(/SMBC_MT700/.test(tt) && /AMEND있음/.test(tt), '층 태그 SMBC_MT700 · AMEND있음 (2603A1)');
  ok($('a1PilotList').value.split('\n').join()==='LRS-2604SG1,LRS-2603A1', '파일럿 자동 선택 = 검증 그룹만 (2611A1 제외): '+$('a1PilotList').value.split('\n').join());
  const pt=$('a1PilotTable').textContent;
  ok(/LRS-2602SG3/.test(pt) && /LRS-2601A1/.test(pt), '직전 S/I 미리보기: 2604SG1←2602SG3 · 2603A1←2601A1');
  if(FULL){
    $('a1FullModel').value='claude-opus-5-5'; ok($('a1RunFull').disabled===false,'전체 실행 버튼 활성 (v0.8~ 잠금 해제 · 그 전 버전은 시험용으로 해제)');
    $('a1RunFull').click(); await waitAsk(); $('a1AskBtn0').click();
    for(let i=0;i<600 && !/저장 완료|결과 저장 실패/.test($('a1Log').textContent);i++) await new Promise(r=>setTimeout(r,100));
    const r1=aiCalls.filter(c=>/S\/I（sino/.test(String(c.body.system||''))&&!/組み立てます/.test(String(c.body.system||'')));
    const r0=aiCalls.filter(c=>/あなたはLEENEAR CORPORATIONの貿易書類専門家/.test(String(c.body.system||'')));
    const nos=[...new Set(r1.map(c=>(JSON.stringify(c.body.messages).match(/契約番号: (LRS-\w+)/)||[])[1]))].sort();
    ok(nos.join()==='LRS-2602SG3,LRS-2603A1,LRS-2604SG1,LRS-2610ZZ1,LRS-2611A1', '전체 = 대상 전부 (검증 전 · Amend 포함): '+nos.join(', '));
    const r2x=aiCalls.filter(c=>/判読担当/.test(String(c.body.system||''))), r2a=aiCalls.filter(c=>/組み立てます/.test(String(c.body.system||'')));
    ok(r1.length>=10 && r1.every(c=>c.body.model==='claude-opus-5-5'), 'R1 × 2회 × 5건 (+JSON 재시도), 모델 = 지정 1종: '+r1.length+'회');
    ok(r2x.length===10 && r2a.length>=10, 'R2 ① 2회 × 5건 = 10회 · ③ 2회 × 5건 (+재시도): '+r2x.length+' / '+r2a.length);
    ok(r0.length===0, '전체 실행에는 R0 없음');
    console.log('legacy_e2e full pass',pass,'fail',failN); process.exit(failN?1:0);
  }
  { const tt2=$('a1TargetTable').textContent; ok(/NAME:SAMPLE JOINT STOCK BANK OF VIETNAM HANOI HO/.test(tt2) && /NAME:SAMPLE BANK SINGAPORE BRANCH/.test(tt2), '대상 표에 지점 키 (1쪽 ISSUING BANK 이름)'); }
  ok((($('a1PilotTable').textContent.match(/支店不明/g))||[]).length===2, '파일럿 미리보기 지점: 2604SG1 · 2603A1 모두 支店不明 (직전 2510SG1 · 2601A1 은 LC 원본 없음)');
  // 배선 시험: 2604SG1 만 支店違い 로 강제 → 행 표시 · 집계 확인
  const realBC=w.A1C.branchCompare; w.A1C.branchCompare=(t,pr)=>{ const r=realBC(t,pr); if(pr.some(p=>p.no==='LRS-2602SG3')) return {flag:'支店違い',detail:r.detail.map(d=>d.no==='LRS-2602SG3'?Object.assign({},d,{state:'違い'}):d)}; return r; };
  // 확인 상자: 「취소」 → API 호출 0
  $('a1RunPilot').click(); await waitAsk();
  ok(/예상 호출/.test($('a1AskBody').textContent) && /추정 US\$/.test($('a1AskBody').textContent) && /합계/.test($('a1AskBody').textContent), '페이지 안 확인 상자: 예상 호출 수 · 추정 비용 표 ('+$('a1AskBody').textContent.replace(/\s+/g,' ').slice(0,160)+'…)');
  $('a1AskBtn1').click(); await new Promise(r=>setTimeout(r,300));
  ok(aiCalls.length===0 && $('a1Ask').style.display==='none', '「취소」 → 상자 닫힘 · API 호출 0');
  // v0.4 #9: 「R2만」 비용 상자
  $('a1Rounds').value='R2'; $('a1RunPilot').click(); await waitAsk();
  { const t=$('a1AskBody').textContent; ok(/R2① LC 판독/.test(t) && /R2③ S\/I 조립/.test(t) && !/R1 claude/.test(t) && /추정 US\$/.test(t), '「R2만」 확인 상자: R2① · R2③ · AI 판정 호출 수 · 추정 US$ (R1 줄 없음) — '+t.replace(/\s+/g,' ').slice(0,200)); }
  $('a1AskBtn1').click(); await new Promise(r=>setTimeout(r,200)); ok(aiCalls.length===0,'「취소」 → 호출 0'); $('a1Rounds').value='R1R2';
  // 파일럿 (모델 2 칸에 fable 을 넣어 not_found 처리도 함께 시험) + 직전 S/I 없는 계약 LRS-2610ZZ1 추가 (NO_PRIOR 시험)
  $('a1PilotList').value+='\nLRS-2610ZZ1';
  $('a1M2').value='claude-fable-5-2';
  $('a1RunPilot').click(); await waitAsk(); $('a1AskBtn0').click();
  for(let i=0;i<600 && !/저장 완료|결과 저장 실패/.test($('a1Log').textContent);i++) await new Promise(r=>setTimeout(r,100));
  console.log('   로그(최근):\n     '+[...$('a1Log').children].slice(0,8).map(d=>d.textContent).join('\n     '));
  ok(/저장 완료/.test($('a1Log').textContent),'파일럿 끝까지 실행 · 저장 완료');
  // 쓰기 위치
  const bad=puts.filter(p=>!p.path.startsWith('古紙/-. AI 活用/D-00/A1_bench/'));
  ok(puts.length>0 && bad.length===0, 'SharePoint 쓰기 '+puts.length+'건 전부 古紙/-. AI 活用/D-00/A1_bench/ 아래 (그 밖 0건)');
  ok(dvWrites===0, 'COMPASS 쓰기 0건 (GET 만)');
  const names=[...new Set(puts.map(p=>p.path.replace(/^.*A1_bench\/[^/]+\//,'')))].sort();
  console.log('   저장 파일:',names.join(', '));
  ['results.json','results.csv','summary.md','si_changes.csv','lcjson_diff.csv','r2_lc_extract.json','r2_reconcile.csv','run_config.json','lc_text/LRS-2604SG1.txt','lc_text/LRS-2603A1.txt'].forEach(n=>ok(names.includes(n),'저장: '+n));
  const get=n=>puts.filter(p=>p.path.endsWith('/'+n)).pop().body;
  ok(get('results.csv').charCodeAt(0)===0xFEFF && get('si_changes.csv').charCodeAt(0)===0xFEFF && get('lcjson_diff.csv').charCodeAt(0)===0xFEFF, 'CSV 3종 UTF-8 BOM');
  // 키 노출
  const allOut=puts.map(p=>p.body).join('\n')+w.document.body.textContent;
  ok(allOut.indexOf(KEY)<0 && allOut.indexOf('sk-'+'ant')<0, 'API 키가 결과 파일 · 화면에 없음');
  ok(aiCalls.every(c=>c.headers['x-api-key']===KEY && c.headers['anthropic-dangerous-direct-browser-access']==='true'), 'API 키는 요청 헤더에만');
  // 모델 · 설정
  const r1=aiCalls.filter(c=>/S\/I（sino/.test(String(c.body.system||''))&&!/組み立てます/.test(String(c.body.system||'')));
  const models=[...new Set(r1.map(c=>c.body.model))].sort();
  ok(models.join()==='claude-fable-5-2,claude-opus-5-5', 'R1 모델 = Opus 5.5 (+시험으로 넣은 fable): '+models.join(', '));
  ok(r1.every(c=>c.body.thinking.type==='adaptive' && c.body.output_config.effort==='high' && c.body.max_tokens===32000 && c.body.temperature===undefined && c.body.stream===true), 'R1 설정 동일 (adaptive · effort high · max_tokens 32000 · temperature 없음 · stream)');
  ok(r1.filter(c=>c.body.model==='claude-fable-5-2').length===3, 'not_found 모델은 계약마다 1회 시도 후 2회째 건너뜀 (3건 × 1회)');
  ok(aiCalls.filter(c=>/あなたはLEENEAR CORPORATIONの貿易書類専門家/.test(String(c.body.system||''))).length===0, '파일럿에 R0 없음 (v0.3 Step 4-8)');
  // ⑧ JSON 재시도
  { const a1r1=r1.filter(c=>c.body.model==='claude-opus-5-5'&&JSON.stringify(c.body.messages).indexOf('契約番号: LRS-2603A1')>=0);
    ok(a1r1.length===3 && /再指示/.test(JSON.stringify(a1r1[1].body.messages)) && !/再指示/.test(JSON.stringify(a1r1[0].body.messages)), '⑧ 2603A1 R1 #1: JSON 아님 → 「再指示」 붙여 1회 재시도 → 성공 (호출 3 = 1회차 2 + 2회차 1)'); }
  // ① R2-① 입력에 COMPASS 없음
  { const x=aiCalls.filter(c=>/判読担当/.test(String(c.body.system||''))); const bodies=x.map(c=>JSON.stringify(c.body));
    ok(x.length===6 && x.every(c=>c.body.model==='claude-opus-5-5'), 'R2① = Opus 5.5 · 계약마다 독립 2회 (3건 × 2 = 6회)');
    ok(bodies.every(b=>b.indexOf('販売契約')<0 && b.indexOf('直前 S/I')<0 && b.indexOf('マスター')<0 && b.indexOf('JOCC')<0 && b.indexOf('PO 2602SG3')<0 && b.indexOf('PO 2601A1')<0 && !/LRS-26\d\d/.test(b)), '① 실제 요청 본문에 판매계약 · 직전 S/I · 마스터 · 계약번호(파일명) 없음'); }
  // 누설 금지: 2604SG1 의 R1 입력에 자신·이후 계약(2605SG1) S/I 없음 / 2603A1 입력에 2611A1 없음
  const inp=no=>r1.filter(c=>JSON.stringify(c.body.messages).indexOf('契約番号: '+no)>=0).map(c=>JSON.stringify(c.body.messages));
  const sg=inp('LRS-2604SG1')[0], a1=inp('LRS-2603A1')[0];
  ok(sg && /直前 S\/I — 同じバイヤー × 同じ銀行[^】]*LRS-2602SG3/.test(sg) && sg.indexOf('LRS-2605SG1')<0 && sg.indexOf('PO 2604SG1')<0, '2604SG1 입력: 직전 = 2602SG3, 자신 S/I · 이후 2605SG1 없음');
  ok(a1 && a1.indexOf('LRS-2611A1')<0 && a1.indexOf('ILC9160000333')<0 && a1.indexOf('PO 2603A1')<0, '2603A1 입력: 자신 · 이후 2611A1 S/I 없음');
  // 결과 내용
  const res=JSON.parse(get('results.json'));
  const rows=res.contracts.flatMap(c=>c.runs.flatMap(r=>r.rows));
  ok(rows.some(r=>r.verdict==='完全一致') && rows.some(r=>r.verdict==='表記差') && rows.some(r=>r.verdict==='内容差'), '판정 3종이 나옴');
  ok(rows.some(r=>r.field==='address'&&r.verdict==='表記差'&&/P1/.test(r.rules)), 'address VIET NAM ↔ VIETNAM → 表記差 (P1)');
  ok(rows.some(r=>r.field==='payment_deadline'&&r.verdict==='表記差'&&/P8a/.test(r.rules)), 'BILL OF LADING ↔ B/L → 表記差 (P8a)');
  ok(res.contracts.flatMap(c=>c.runs).some(r=>(r.rejected||[]).some(x=>x.col==='crcf9_po_vo'&&x.numbers.includes('99999999'))), '근거 없는 숫자(PO 99999999) → 채택 안 함 (rejected)');
  { const st=res.contracts.flatMap(c=>c.runs.filter(r=>r.round==='R1'&&r.rep===1&&r.model!=='claude-fable-5-2').flatMap(r=>r.rows.map(x=>x.stable))); ok(st.length>0 && st.every(x=>x==='安定'||x==='不安定') && st.includes('安定'), '2회 실행 安定/不安定 표시 ('+st.length+'칸)'); }
  { const csv=get('results.csv'); ok(/,R1,claude-opus-5-5,1,1,consignee,/.test(csv) && /,R2,claude-opus-5-5,1,1,consignee,/.test(csv) && /,auto_cat,source,source_check,paired,/.test(csv), 'results.csv 에 회차(R1 · R2) · auto_cat · source · source_check · paired 열'); }
  ok(res.failures.filter(f=>f.model==='claude-fable-5-2').length===6, 'fable 실패 기록 = 계약 3 × 2회 (1회 실패 + 1회 건너뜀)');
  ok(res.failures.some(f=>f.contract==='LRS-2603A1'&&f.round==='R2'&&f.rep===2&&/재시도 후/.test(f.error)), '⑧ 재시도해도 JSON 이 아니면 실패로 기록 (2603A1 R2 조립 #2)');
  const sh=res.siHistory.find(x=>x.no==='LRS-2604SG1').siHistory;
  ok(sh.lcIssue==='2026-04-07' && sh.etdFirst==='2026-05-12' && sh.sinos.find(x=>x.sino===1).afterEtd===true, 'S/I 수정 이력: LC 발행 04-07 · ETD 05-12 · sino1 06-01 수정 → ETD 이후');
  ok(rows.some(r=>r.after_etd==='ETD後に修正'), '행에 「ETD後に修正」 표시');
  const md=get('summary.md');
  ['## 2-2. 층별','結論保留 (표본 1건)','SMBC_MT700','AMEND있음','## 7. S/I 수정 이력','## 8. 계약 간 S/I 변화','## 9. D-01 기존 LC JSON','## 3. 토큰','## 4. 内容差 목록','## 10. R0 재현 메모','✦ Powered by LEENAI Automation System'].forEach(s=>ok(md.indexOf(s)>=0,'summary.md: '+s));
  const sc=get('si_changes.csv'); ok(/SAIGON × BIC:BFTVVNVX,LRS-2602SG3,LRS-2604SG1,1,po_vo,番号のみ/.test(sc), 'si_changes.csv: 2602SG3→2604SG1 po_vo 番号のみ');
  const lj=get('lcjson_diff.csv'); ok(/LRS-2604SG1,.*lc_no,.*一致/.test(lj) && /docs_46A_count.*差異/.test(lj) && /LRS-2603A1.*D-01 JSON なし/.test(lj), 'lcjson_diff.csv: 2604SG1 비교 · 2603A1 「D-01 JSON なし」 · TT_BASE 제외');
  { const br=rows.filter(r=>r.branch_flag==='支店違い'); ok(br.length>0 && br.every(r=>r.contract==='LRS-2604SG1' && ['consignee','notify_party'].includes(r.field)), '支店違い 표시 = 2604SG1 의 consignee · notify_party 행만 ('+br.length+'행)'); }
  ok(/LRS-2602SG3 NAME:SAMPLE JOINT STOCK BANK OF VIETNAM HANOI HO → 違い/.test(md) && /LRS-2510SG1 \? → 不明/.test(md), '지점 표: 직전 2602SG3 = 대상과 같은 지점명(강제 違い 시험) · 2510SG1 = 不明');
  ok(/## 2-3\. 支店違い/.test(md) && /R1 claude-opus-5-5 · consignee/.test(md) && /LRS-2603A1 \|[^\n]*支店不明/.test(md), 'summary.md §2-3 支店違い 집계 + 계약별 지점 표 (2603A1 支店不明)');
  ok(/,branch_flag,/.test(get('results.csv')) && /,支店違い,/.test(get('results.csv')), 'results.csv 에 branch_flag 열');
  ok(/## 11\. HEX → # 변환 목록 \(3곳/.test(md) && /LRS-2603A1 \| LRS-2603A1_ILC9160000001\.pdf \| [^\n]*HEX13-05/.test(md) && /_AMEND1\.pdf \| [^\n]*HEX13-05/.test(md) && md.indexOf('## 11.')>md.indexOf('## 10.'), 'summary.md §11 HEX 변환 목록 — 본 LC · AMEND1 파일별 「HEX13-05」 (+2610ZZ1 1곳 = 3곳), §10 뒤');
  ok(res.version==='a1_bench v'+VER && JSON.parse(get('run_config.json')).version===VER, '결과 파일의 버전 = v'+VER);
  { const ex=JSON.parse(get('r2_lc_extract.json')); const sg=ex.find(x=>x.no==='LRS-2604SG1'); const g=k=>sg.checks.find(c=>c.item===k);
    ok(g('lc_no').pass && g('applicant_address').pass && g('bl_notify').pass && g('po').pass, '② 원문 검사 통과: lc_no · :50 주소(줄바꿈 넘어) · 46A Notify(HEX 없음/쪽 넘어) · PO');
    ok(g('tolerance').read==='判読不一致' && !g('tolerance').pass, '② 두 번 다름 → 判読不一致');
    ok(g('hs').quote1==='原文なし' && !g('hs').pass, '② LC 에 없는 인용 → 原文なし'); }
  { const rc=get('r2_reconcile.csv'); ok(rc.charCodeAt(0)===0xFEFF && /LRS-2604SG1,applicant_name,DELTA PAPER CORPORATION,:50,販売契約 buyer_name,DELTA PAPER CORPORATION,一致/.test(rc) && /LRS-2604SG1,goods\[0\]\.quantity,,,販売契約 明細1 数量 \(JOCC\),400,片方のみ/.test(rc), '③ 대조표 r2_reconcile.csv (BOM · :50 ↔ 바이어명 一致 · v0.5: 判読不一致 수량은 LC 값 없이 片方のみ)');
  { const asm=aiCalls.filter(c=>/組み立てます/.test(String(c.body.system||''))&&/ILC0000101/.test(JSON.stringify(c.body))); const passedPart=asm.map(c=>String(c.body.messages[0].content[0].text).split('【未確定')[0]);
    ok(asm.length>=2 && passedPart.every(t=>t.indexOf('"item": "goods[0].quantity"')<0 && t.indexOf('550 MT')<0), 'v0.5 #5: S/I 조립의 「検証済みの値」 에 판독 불일치 수량(goods[0].quantity · 550 MT)이 들어가지 않음'); } }
  { const r2=res.contracts.find(c=>c.no==='LRS-2604SG1').runs.find(r=>r.round==='R2'&&r.rep===1); const b=r2.basis[1];
    ok(b.crcf9_address.source_check==='出典不一致' && b.crcf9_notify_party.source_check==='OK' && b.cr49f_lc_no.source_check==='OK' && b.crcf9_consignee.source_check==='OK' && b.crcf9_po_vo.source_check==='', '③ 출처 검사: LC 에 없는 방콕 주소 → 出典不一致 / notify · lc_no(DATED ON) · consignee → OK / PLACEHOLDER → 검사 안 함');
    ok(r2.calls.filter(c=>/r2_extract/.test(c.step)).length===2, 'R2① 호출 비용은 1회차 실행에 합산 (토큰 · 시간 표)'); }
  ['## 12. R1 vs R2','### R2 검사 — 判読不一致 2 · 原文なし 1 · 出典不一致 9','| LRS-2604SG1 | tolerance |','| LRS-2604SG1 | hs | 4707.30 |','1 EXAMPLE ROAD BANGKOK','### CAS 2608CA1','이번 실행 대상에 LRS-2608CA1 이 없음','## 2-4. 内容差 자동 분류'].forEach(x=>ok(md.indexOf(x)>=0,'summary.md: '+x));
  // v0.4 통합 (Step 6 #6)
  { const ex=JSON.parse(get('r2_lc_extract.json')).find(x=>x.no==='LRS-2604SG1'); const g=k=>ex.checks.find(c=>c.item===k);
    ok(g('issue_date').read==='一致' && g('issue_date').read_basis==='normalized' && g('issue_date').pass, '① 응답 날짜 형식만 다름(「APR 7, 2026」/「2026-04-07」) → 一致 (normalized) · 통과');
    ok(g('lc_no').read_basis==='same', 'v0.5: 값이 같음 → read_basis=same (quote 겹침은 一致 근거가 아님)');
    ok(g('goods[0].quantity').read==='判読不一致' && !g('goods[0].quantity').pass && g('goods[0].unit_price').read==='一致', 'v0.5 #5: 2회 수량 400 MT / 550 MT (같은 goods quote) → 判読不一致 · 통과 안 함, 단가는 一致');
    ok(g('tolerance').read==='判読不一致' && g('tolerance').read_basis==='value', '10/10 ↔ 5/5 → 判読不一致 (value)'); }
  { const sg=res.contracts.find(c=>c.no==='LRS-2604SG1').runs.filter(r=>r.round==='R2');
    ok(sg.every(r=>!/DATED ON XX/.test(r.sinos[1].cr49f_lc_no)) && sg.every(r=>/DATED ON APR 07, 2026/.test(r.sinos[1].cr49f_lc_no)), 'R2 lc_no 에 「DATED ON XX」 없음 (발행일 통과)');
    ok(sg.every(r=>r.basis[1].crcf9_consignee.format_check==='SAME_AS_PRIOR'), '직전 S/I 형태 그대로인 consignee → format_check SAME_AS_PRIOR');
    ok(sg.every(r=>r.sinos[1].crcf9_vo_no==='' && r.placeholderRemoved.some(x=>x.col==='crcf9_vo_no'&&/空/.test(x.reason))), 'VO 안 쓰는 바이어(직전 vo_no 빈칸) → vo_no 빈칸 · placeholder_removed 기록'); }
  { const zz=res.contracts.find(c=>c.no==='LRS-2610ZZ1'); const r2=zz.runs.filter(r=>r.round==='R2');
    ok(zz.priors.same.length===0 && r2.length===2 && r2.every(r=>Object.values(r.basis[1]).every(b=>b.format_check==='NO_PRIOR') && r.sinos[1].crcf9_vo_no===''), '직전 S/I 없는 계약(2610ZZ1) → format_check NO_PRIOR · vo_no XX 넣지 않음'); }
  { const csv=get('results.csv'); ok(/,format_check,placeholder_removed,(?:master_check,)?lc_check,lc_extra,lc_missing,/.test(csv), 'results.csv 에 format_check · placeholder_removed · lc_check · lc_extra · lc_missing 열'); }
  { const a=res.contracts.find(c=>c.no==='LRS-2604SG1'); const sgr2=a.runs.find(r=>r.round==='R2'&&r.rep===1).rows.find(r=>r.field==='address'&&r.sino===1);
    ok(sgr2.lc_check==='LC確認' && /EXAMPLE/.test(sgr2.lc_extra) && a.answerLcCheck.find(x=>x.field==='address'&&x.sino===1).result==='OK', 'fieldLcCheck: R2 방콕 주소 → LC確認 (extra EXAMPLE…) / 정답 주소 → OK'); }
  ['### 判読 내역 (v0.4)','| 一致 · normalized |','| 一致 · same |','| value_in_quote NG (통과 값이 자기 quote 안에 없음 · 표시만) |','| 判読不一致 — docs 배치 차이 (따로 셈) |','### format_check (R2 · 칸 수)','**placeholder_removed**','直前S/Iなし・vo_no','### fieldLcCheck — 칸별 LC確認 건수','| 칸 | 正解 (COMPASS) | R1 | R2 |','**LC確認 목록**'].forEach(x=>ok(md.indexOf(x)>=0,'summary.md: '+x));
  ok(md.trim().endsWith('✦ Powered by LEENAI Automation System'), 'summary.md 맨 끝 Powered 유지');
  ok(rows.some(r=>/E4_前回維持/.test(r.auto_cat||'')) || rows.some(r=>/ETD後修正/.test(r.auto_cat||'')), 'auto_cat 이 실제 행에 붙음');
  ok(w.__errs.length===0, '페이지 오류 0건'+(w.__errs.length?(': '+w.__errs.join(' | ')):''));
  console.log('legacy_e2e pilot pass',pass,'fail',failN,'· AI 호출',aiCalls.length,'· SP 쓰기',puts.length);
  process.exit(failN?1:0);
})().catch(e=>{ console.error('FAIL',e); process.exit(1); });
