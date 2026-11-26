/* acl_bench v0.22 시험 (지시서 THOR_25 · 묶음 v0.17 N28 · N29) — 가짜 데이터만 · 네트워크 없음. node v22.js [html] [Shipping_Document/index.html]
   N28 S/I 「**」 이어쓰기 = 그 칸 안에서만 (다음 칸 · D-03 고정 문언을 끌어오지 않음) · ACL 에만 있는 연락처 줄 (S/I 다른 당사자 칸에 있는 것) = 表記差 · 주요 칸 (荷受人 · 通知先 · 品名) 을 못 비교 = 読取確認 (対象外 아님) · 「すべて」 아님
   N29 D-03 기본값 = D-03 원문과 같은 글자 · 기본값에서 온 글 (당사 칸 줄바꿈 · NO MARK = N/M · FREIGHT 줄) = 一致 · 「場所が違う」 0 · D-03 의 Description 조립 = 같은 입력 → 같은 글 */
const fs=require('fs'),path=require('path'),FX=require('./fixtures');
const HTML=process.argv[2]||path.join(__dirname,'../../acl_bench.html'), SRC=fs.readFileSync(HTML,'utf8');
const D03P=process.argv[3]||path.join(__dirname,'../../../Shipping_Document/index.html');
const ACL=new Function('module',SRC.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const item=(r,k)=>r.items.find(i=>i.key===k);
const KEYS=['shipper','consignee','notify','alsoNotify','booking','masterBl','vessel','voy','receipt','pol','pod','delivery','finalDest','hsMain','description','marks','originals','wayBill','received','freight','agentSign','shipperMail'];
function mkAcl(cp, over){
  const ex=ACL.expected(cp), F={}; KEYS.forEach(k=>{ F[k]={text:'',conf:'SURE'}; });
  Object.assign(F,{shipper:{text:ex.shipper,conf:'SURE'},consignee:{text:ex.consignee,conf:'SURE'},notify:{text:ex.notify,conf:'SURE'},description:{text:ex.description,conf:'SURE'},marks:{text:ex.marks,conf:'SURE'},
    booking:{text:ex.booking,conf:'SURE'},vessel:{text:'SAMPLE STAR',conf:'SURE'},voy:{text:'101W',conf:'SURE'},receipt:{text:ex.pol,conf:'SURE'},pol:{text:ex.pol,conf:'SURE'},
    pod:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},delivery:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},originals:{text:'3',conf:'SURE'}});
  Object.keys(over||{}).forEach(k=>{ F[k]=typeof over[k]==='object'?over[k]:{text:over[k],conf:'SURE'}; });
  const rows=cp.containers.filter(c=>c.crcf9_container_no).map(c=>({container:c.crcf9_container_no, seal:c.crcf9_seal_no, type:'GP', size:'45', bales:c.crcf9_quantity, cargo:c.crcf9_n_w, tare:c.crcf9_t_w, measure:40, conf:'SURE'}));
  return {fields:F, rows, totals:{containers:rows.length, bales:rows.reduce((s,r)=>s+r.bales,0), weight:rows.reduce((s,r)=>s+r.cargo,0)}};
}
const run=(cp,over,opts)=>ACL.compareOne(mkAcl(cp,over),cp,opts||{});

console.log('버전');
ok(/version:'0\.22'/.test(SRC),'version 0.22');

console.log('N29 D-03 기본값 = D-03 원문');
const D03S=fs.existsSync(D03P)?fs.readFileSync(D03P,'utf8'):null;
const D03=SRC.match(/const D03 = \{([\s\S]*?)\};/)[1], val=k=>(D03.match(new RegExp(k+":'([^']*)'"))||[])[1];
if(!D03S) ok(true,'(Shipping_Document 클론 없음 — D-03 대조 생략)');
else {
  ok(D03S.indexOf("si.crcf9_shipper||'"+val('shipperName')+"'")>=0,'Shipper 이름 = D-03',val('shipperName'));
  ok(D03S.indexOf("si.crcf9_shipper_address||'"+val('shipperAddr')+"'")>=0,'Shipper 주소 = D-03 (글자 그대로)',val('shipperAddr'));
  ok(D03S.indexOf("si.crcf9_shipper_tel || '"+val('shipperTel')+"'")>=0&&D03S.indexOf("si.crcf9_shipper_fax || '"+val('shipperFax')+"'")>=0,'TEL · FAX = D-03');
  ok(D03S.indexOf("si.crcf9_shipping_mark || '"+val('noMark')+"'")>=0,'NO MARK = D-03');
  ok(D03S.indexOf("descBlock += '"+val('freight')+"';")>=0,'FREIGHT PREPAID AS ARRANGED = D-03 (S/I 끝에 늘)');
  /* D-03 의 Description 조립 코드를 그대로 떼어 같은 입력 → 같은 글 */
  const a=D03S.indexOf("  let descBlock = '';"), b=D03S.indexOf("descBlock += 'FREIGHT PREPAID AS ARRANGED';", a), body=D03S.slice(a, b)+"descBlock += 'FREIGHT PREPAID AS ARRANGED'; return descBlock;";
  const subFn=(D03S.match(/function substituteBlText1\([\s\S]*?\n\}/)||[''])[0];
  const cases=[FX.compass(1), (()=>{ const c=FX.compass(2); c.sis[0].crcf9_bl_text1='SAMPLE WASTE PAPER\n** DO, SAMPLE COUNTRY'; c.sis[0].crcf9_bl_text2='LINE TWO'; return c; })(), (()=>{ const c=FX.compass(3); c.sis[0].crcf9_bl_text1=''; c.sis[0].crcf9_bl_text2=''; return c; })()];
  cases.forEach((cp,n)=>{ const si=ACL.pickBlSi(cp.sis), items=ACL.aggregateItems?ACL.aggregateItems(si.cr49f_s_iid, cp):[];
    let got=null; try{ got=new Function('si','items','S','t','buildProductNameMap','substituteBlText1',body)(si, items.map(i=>({productName:i.productName, hsCode:i.hsCode})), {siDetailCache:cp.details||{}, containers:cp.containers},
      {totalBales:items.reduce((s,i)=>s+(i.bales||0),0), totalWeightMt:Math.round((items.reduce((s,i)=>s+i.weightMt,0))*100)/100}, ()=>({}), subFn?new Function('S',subFn+';return substituteBlText1;')({siDetailCache:cp.details||{}, containers:cp.containers}):ACL.substituteBlText1); }catch(e){ got='ERR '+e.message; }
    const want=ACL.expected(cp).description;
    ok(got===want,'Description 조립 = D-03 (예 '+(n+1)+')',{d03:got, engine:want}); });
}

console.log('N28 「**」 이어쓰기 = 그 칸 안에서만');
const cpN=FX.compass(4); const s0=cpN.sis[0];
s0.crcf9_consignee='SAMPLE PAPER\n256 SAMPLE-RO, SAMPLE-EUP ,\nSAMPLE-GU, SAMPLE-SI, SAMPLEBUK-**'; s0.crcf9_bl_text1='** DO, SAMPLE COUNTRY'; s0.crcf9_bl_text2='';
s0.crcf9_notify_party='SAMPLE PAPER'; s0.crcf9_address='256 SAMPLE-RO, SAMPLE-EUP , SAMPLE-GU, SAMPLE-SI, SAMPLEBUK-DO, SAMPLE COUNTRY\nE-MAIL：SAMPLE@EXAMPLE.TEST'; s0.crcf9_tel='TEL : 00-0000-0001'; s0.crcf9_fax='FAX：00-0000-0002';
const exN=ACL.expected(cpN);
ok(/\nFREIGHT PREPAID AS ARRANGED$/.test(exN.description),'S/I Description (D-03 모양) 끝 = FREIGHT 줄',exN.description);
const aclCons='SAMPLE PAPER\n256 SAMPLE-RO, SAMPLE-\nEUP , SAMPLE-GU, SAMPLE-SI,\nSAMPLEBUK-DO, SAMPLE COUNTRY\nE-MAIL:SAMPLE@EXAMPLE.TEST\nTEL:00-0000-0001 FAX:00-0000-0002';
const aclDesc=exN.description.replace(/\n?\*\* DO, SAMPLE COUNTRY/,'');
const rN=run(cpN,{consignee:aclCons, description:aclDesc});
const ic=item(rN,'consignee'), idd=item(rN,'description');
ok(ic.status==='NOTATION'&&/表記:ACL に連絡先/.test(ic.kind),'Consignee = 이어쓰기 붙여 비교 · ACL 의 연락처 줄 = 表記差 (対象外 아님)',[ic.status,ic.kind,ic.detail,ic.expected]);
ok(!/FREIGHT/.test(ic.expected),'Consignee 에 FREIGHT 줄이 끌려오지 않음',ic.expected);
ok(idd.status==='MATCH','Description = 一致 (FREIGHT 줄은 Description 에)',[idd.status,idd.detail,idd.expected]);
ok(rN.final.moved.length===0,'「場所が違う」 0',rN.final.moved);
const ACLX=ACL.compareOne(mkAcl(cpN,{consignee:aclCons.replace('E-MAIL:SAMPLE@EXAMPLE.TEST','E-MAIL:OTHER@EXAMPLE.TEST'), description:aclDesc}),cpN,{});
ok(['DIFF','DROP','ADD'].indexOf(item(ACLX,'consignee').status)>=0,'S/I 에 없는 연락처를 더 적음 = 相違 그대로',item(ACLX,'consignee').status);

console.log('N28 주요 칸 비교 못 함 = 読取確認');
const cpM=FX.compass(5);
const rM=ACL.compareOne(Object.assign(mkAcl(cpM,{}),{ai:{other:true, form:'SAMPLE FORM', reads:2, diffFields:[], diffRows:[]}}),cpM,{});
const naOne=(()=>{ const a=mkAcl(cpM,{consignee:{text:null,conf:'NA'}}); a.ai={other:true, form:'SAMPLE FORM', reads:2, diffFields:[], diffRows:[]}; return ACL.compareOne(a,cpM,{}); })();
const ci=item(naOne,'consignee');
ok(ci&&ci.status==='READ_CHECK'&&!ci.na&&/主要な欄/.test(ci.detail),'乙仲様式에 Consignee 칸 없음 (NA) = 読取確認 (対象外 아님)',ci&&[ci.status,ci.na,ci.detail]);
ok(naOne.verdict!=='完全一致'&&naOne.verdict!=='表記差のみ','판정 = 「問題なし」 아님',naOne.verdict);
const fv=ACL.finalView?ACL.finalView(naOne):null; ok(!fv||(!fv.content.ok&&/主要な欄/.test(fv.content.text)),'最終確認 = 「すべて」 아님',fv&&fv.content);
ok(item(rM,'consignee').status!=='READ_CHECK','칸이 있으면 그대로',item(rM,'consignee').status);

console.log('N29 기본값에서 온 글 = 一致');
const cpD=FX.compass(6); cpD.sis[0].crcf9_shipper=''; cpD.sis[0].crcf9_shipper_address=''; cpD.sis[0].crcf9_shipper_tel=''; cpD.sis[0].crcf9_shipper_fax=''; cpD.sis[0].crcf9_shipping_mark='';
const exD=ACL.expected(cpD);
ok(exD.shipper.indexOf(val('shipperAddr'))>=0&&exD.marks==='NO MARK','빈 칸 = D-03 기본값',exD.shipper);
const rD=run(cpD,{shipper:exD.shipper.replace(' FAX','\nFAX').replace(', KANDA',',\nKANDA'), marks:'N/M', description:exD.description.replace('\nFREIGHT PREPAID AS ARRANGED','')+'\n\nFREIGHT PREPAID AS ARRANGED\n'});
ok(item(rD,'shipper').status==='MATCH','당사 (Shipper) 칸 줄바꿈만 다름 = 一致 (D-03 은 TEL · FAX 한 줄)',[item(rD,'shipper').status,item(rD,'shipper').detail]);
ok(item(rD,'marks').status==='MATCH','荷印 기본값 NO MARK ↔ N/M = 一致',[item(rD,'marks').status,item(rD,'marks').detail]);
ok(item(rD,'description').status==='MATCH','FREIGHT 줄 위치만 다름 = 一致',[item(rD,'description').status,item(rD,'description').detail]);
const cpE=FX.compass(7); cpE.sis[0].crcf9_shipping_mark='SAMPLE MARK'; const rE=run(cpE,{marks:'Sample Mark'});
ok(item(rE,'marks').status==='NOTATION','COMPASS 에 쓴 荷印의 표기차 = 表記差 그대로',item(rE,'marks').status);
const rS=run(cpE,{shipper:'SAMPLE OTHER CO\n'+ACL.expected(cpE).shipper.split('\n').slice(1).join('\n')});
ok(['DIFF','DROP','ADD'].indexOf(item(rS,'shipper').status)>=0,'당사 칸이 진짜 다르면 相違 그대로',item(rS,'shipper').status);

console.log('표시 — 参考 ≠ 対象外');
const vh=ACL.viewHtml?ACL.viewHtml({verdict:'表記差のみ', items:[{group:'S/I 文面',key:'notify',label:'Notify Party',status:'INFO',kind:'参考:ACL に追記:Notify Party',expected:'A',actual:'A B',detail:'参考'}], final:{total:1,found:1,missing:[],aclOnly:[],moved:[],sets:{total:0,diff:[],read:[],aclOnly:[],cpOnly:[]},unread:[],byCntr:[],instr:{list:[],cntr:null,tent:[]}}, meta:{}, read:{fields:{}}, cp:{}},{}):'';
ok(/<td class="av-note">参考<\/td>/.test(vh),'INFO 参考 = 「参考」 표시',vh.slice(0,300));

console.log((fail?'FAIL':'PASS')+' v22 — pass '+pass+' fail '+fail); process.exitCode=fail?1:0;
