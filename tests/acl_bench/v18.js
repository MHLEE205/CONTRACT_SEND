/* acl_bench v0.18 시험 (지시서 THOR_15 ①-6 · 형님 F2) — 가짜 데이터 · 가짜 거래처 · 네트워크 없음 · AI 0
   새 체크포인트의 코드 판정 CP_CODE (S/I 5 · ACL 7 · B/L Draft 3) · S/I 단계 siCheck · 試験 = trial (판정에 안 들어감)
   마스터 없음 → v0.17 (4b2d99c) 와 결과 바이트까지 같음 · 試験 줄을 넣어도 verdict · kinds 같음 (새 項目 은 INFO · trial 뿐)
   node v18.js [html] */
const fs=require('fs'), path=require('path'), cpr=require('child_process'), FX=require('./fixtures');
const HTML_P=process.argv[2]||path.join(__dirname,'../../acl_bench.html'), HTML=fs.readFileSync(HTML_P,'utf8');
const core=h=>new Function('module',h.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const ACL=core(HTML);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
const C=ACL.CP_CODE, st=(k,c)=>C[k](c).st;
/* 가짜 L/C (lc_read/1 모양) */
const LC=o=>Object.assign({schema:'lc_read/1', lc_no:'TESTLC2699001', issue_date:'2026-10-09', price_term:'CIF SAMPLE PORT, SAMPLELAND', hs:null, pod:{text:'SAMPLE PORT IN SAMPLELAND'},
  payment:{tenor_text:'AT 090 DAYS AFTER B/L DATE FOR 100 PERCENT INVOICE VALUE'}, bl:{consignee_text:'MADE OUT TO THE ORDER OF SAMPLE BANK, SAMPLE CITY MARKED FREIGHT PREPAID'},
  docs_46A:[{doc_type:'B/L', quote:'FULL SET OF CLEAN ON BOARD OCEAN BILLS OF LADING'}], conditions_47A:[]}, o||{});
const SI=o=>Object.assign({cr49f_payment_terms:'CIF SAMPLE PORT INCLUDED DTHC', crcf9_payment_deadline:'AT 090 DAYS AFTER B/L DATE FOR 100 PERCENT INVOICE VALUE', crcf9_consignee:'TO THE ORDER OF SAMPLE BANK, SAMPLE CITY',
  crcf9_notify_party:'2699000001#999/SAMPLE-TEST#DEPOSIT', crcf9_address:'#SAMPLE PAPER CORPORATION***', crcf9_bl_text1:'WASTE PAPER#47072000#XXKGS#XXBALES\nSECURITY DEPOSIT NUMBER:XX'}, o||{});
const VN={country:'VIETNAM'}, ID={country:'INDONESIA'};

console.log('S/I 5');
eq([st('si:price_term',{lc:LC(),si:SI()}), st('si:price_term',{lc:LC(),si:SI({cr49f_payment_terms:'CFR SAMPLE PORT'})}), st('si:price_term',{lc:LC({price_term:'C&F SAMPLE'}),si:SI({cr49f_payment_terms:'CFR SAMPLE'})})],['MATCH','DIFF','MATCH'],'価格条件: 같음 · CFR≠CIF · C&F = CFR');
eq([st('si:deadline',{lc:LC(),si:SI()}), st('si:deadline',{lc:LC({payment:{tenor_text:'DRAFTS AT 090 DAYS AFTER B/L DATE FOR 100 PERCENT INVOICE VALUE'}}),si:SI()}), st('si:deadline',{lc:LC(),si:SI({crcf9_payment_deadline:'AT 90 DAYS AFTER B/L DATE'})}), st('si:deadline',{lc:LC(),si:SI({crcf9_payment_deadline:''})})],
  ['MATCH','MATCH','DIFF','DIFF'],'payment_deadline: 원문 · DRAFTS AT 앞말 무시 · 다름 · 빈칸');
eq([st('si:to_order',{lc:LC(),si:SI()}), st('si:to_order',{lc:LC(),si:SI({crcf9_consignee:'SAMPLE BANK, SAMPLE CITY'})}), st('si:to_order',{lc:LC({bl:{consignee_text:'CONSIGNED TO SAMPLE BUYER'}}),si:SI()})],['MATCH','DIFF','NA'],'TO ORDER 형식 · 아님 · L/C 가 TO ORDER 아님 = 対象外');
eq([st('si:vn_notify',{si:SI(),meta:VN}), st('si:vn_notify',{si:SI({crcf9_notify_party:'SAMPLE PAPER CORPORATION'}),meta:VN}), st('si:vn_notify',{si:SI(),meta:{country:'SAMPLELAND'}})],['MATCH','DIFF','NA'],'베트남 Notify # 형식 · 아님 · 다른 나라 = 対象外');
eq([st('si:vn_bltext',{si:SI(),meta:VN}), st('si:vn_bltext',{si:SI({crcf9_bl_text1:'WASTE PAPER 47072000'}),meta:VN})],['MATCH','DIFF'],'베트남 bl_text1 형식');

console.log('ACL 7');
const acl=t=>({fullText:t});
eq([st('acl:lc_dated',{lc:LC(),acl:acl('L/C NO.: TESTLC2699001 DATED ON OCT 09, 2026')}), st('acl:lc_dated',{lc:LC(),acl:acl('L/C NO.: TESTLC2699001 DATED ON OCT 19, 2026')}), st('acl:lc_dated',{lc:LC(),acl:acl('L/C NO.: TESTLC2699001')}), st('acl:lc_dated',{lc:LC(),acl:acl('NO L/C HERE')})],
  ['MATCH','DIFF','NOTATION','INFO'],'L/C 번호 DATED ON: 같음 · 날짜 다름 · DATED ON 없음 · 번호 없음 (CP-B36 몫)');
eq([st('acl:id_hs',{lc:LC({hs:'4707.10'}),acl:acl('HS CODE 4707.10'),meta:ID}), st('acl:id_hs',{lc:LC({hs:'4707.10'}),acl:acl('WASTE PAPER'),meta:ID}), st('acl:id_hs',{lc:LC({hs:'4707.10'}),acl:acl(''),meta:VN})],['MATCH','DIFF','NA'],'인니 HS');
const IL=LC({conditions_47A:[{quote:"ALL DOCUMENTS MUST MENTION 'IMPORT LICENCE' NO.04.TEST-2699 DATED ON DECEMBER 18, 2025."}]});
eq([st('acl:id_il',{lc:IL,acl:acl('IMPORT LICENCE NO.04.TEST-2699'),meta:ID}), st('acl:id_il',{lc:IL,acl:acl('WASTE PAPER'),meta:ID}), st('acl:id_il',{lc:LC(),acl:acl(''),meta:ID})],['MATCH','DIFF','NA'],'輸入許可 번호');
eq([st('acl:partial_ts',{lcText:':43P: PARTIAL SHIPMENTS = ALLOWED\n:43T: TRANSHIPMENT = NOT ALLOWED',acl:acl('VIA SAMPLE HUB')}), st('acl:partial_ts',{lcText:':43T: TRANSHIPMENT = ALLOWED',acl:acl('VIA SAMPLE HUB')}), st('acl:partial_ts',{acl:acl('')})],['DIFF','MATCH','INFO'],'43T 不可 + VIA = 相違 · 可 · 본문 없음 = 参考');
const AG=LC({docs_46A:[{doc_type:'B/L',quote:'BILL OF LADING MUST INDICATE NAME, ADDRESS AND TELEPHONE NUMBER OF SHIPPING AGENT IN SAMPLELAND'}]});
eq([st('acl:agent',{lc:AG,acl:acl('SHIPPING AGENT: SAMPLE AGENCY TEL 2699')}), st('acl:agent',{lc:AG,acl:acl('NOTHING')}), st('acl:agent',{lc:LC(),acl:acl('')})],['MATCH','NOTATION','NA'],'현지 Agent (ACL 단계는 注意)');
eq([st('acl:measure',{F:{totalMeasure:{text:'40.000 M3'}}}), st('acl:measure',{F:{totalMeasure:{text:'40.000 CBM'}}}), st('acl:measure',{F:{totalMeasure:{text:'1400 CFT'}}}), st('acl:measure',{F:{totalMeasure:{text:'40.000'}}})],['MATCH','MATCH','DIFF','NOTATION'],'容積 단위 M3 = CBM · CFT = 相違 · 단위 없음 = 注意');
const F45=LC({conditions_47A:[{quote:'4. SHIPPED IN 45FT. CONTAINER IS UNACCEPTABLE.'}]});
eq([st('acl:45ft',{lc:F45,acl:acl('1 X 45GP')}), st('acl:45ft',{lc:F45,acl:acl('1 X 40HC')}), st('acl:45ft',{lc:LC(),acl:acl('45GP')})],['NOTATION','MATCH','NA'],'45FT 금지 × 45GP = 注意 · 40HC 표기 = 一致 · 금지 없음 = 対象外');

console.log('B/L Draft 3');
eq([st('bl:pod44f',{lc:LC(),F:{pod:{text:'SAMPLE PORT, SAMPLELAND'}}}), st('bl:pod44f',{lc:LC(),F:{pod:{text:'OTHER HARBOUR'}}}), st('bl:pod44f',{lc:LC(),F:{pod:{text:''}}})],['MATCH','DIFF','READ_CHECK'],'揚地 = 44F');
eq([st('bl:id_hsil',{lc:Object.assign(IL,{hs:'4707.10'}),text:'HS 4707.10 IMPORT LICENCE NO.04.TEST-2699',meta:ID}), st('bl:id_hsil',{lc:IL,text:'HS 4707.10',meta:ID})],['MATCH','DIFF'],'인니 Draft HS · IL');
eq([st('bl:fcl',{text:'FCL/FCL CY/CY'}), st('bl:fcl',{text:'LCL CFS/CFS'}), st('bl:fcl',{text:'WASTE PAPER'})],['MATCH','DIFF','NOTATION'],'FCL/CY');

console.log('행 실행 (cpRunRow) — 試験 = trial · 코드 우선 · 対象外');
const rows=[{id:'CP-A90',kind:'追加',stage:'S/I',pay:'LC',scope_type:'all',scope:'ALL',left:'lc.price_term',op:'',right:'si',result:'相違',engine_key:'si:price_term',title_ja:'TEST',status:'試験'},
  {id:'CP-A91',kind:'追加',stage:'S/I',pay:'LC',scope_type:'country',scope:'VIETNAM',left:'',op:'',right:'',result:'相違',engine_key:'si:vn_notify',title_ja:'TEST VN',status:'試験'},
  {id:'CP-A92',kind:'追加',stage:'ACL',pay:'ALL',scope_type:'all',scope:'ALL',left:'',op:'',right:'',result:'注意',engine_key:'acl:45ft',title_ja:'TEST 45',status:'試験'}];
const CPX=ACL.cpPrepare(rows,[],{trustAll:true});
const si1=ACL.siCheck(CPX,{lc:LC(),si:SI({cr49f_payment_terms:'CFR X'}),meta:{pay:'LC',country:'SAMPLELAND'}});
eq(si1.map(i=>[i.cp,i.status,i.would,i.trial]),[['CP-A90','INFO','DIFF',true]],'S/I 단계: 試験 = INFO + would DIFF · 범위 (VIETNAM) 밖 행은 안 나옴');
const si2=ACL.siCheck(CPX,{lc:LC(),si:SI(),meta:{pay:'TT'}}); eq(si2.length,0,'決済 LC 행은 TT 에서 안 나옴');
const on=ACL.cpPrepare(rows.map(r=>Object.assign({},r,{status:'有効',approved_by:'TESTADMIN'})),[],{trustAll:true}), si3=ACL.siCheck(on,{lc:LC(),si:SI({cr49f_payment_terms:'CFR X'}),meta:{pay:'LC'}});
eq([si3[0].status,si3[0].trial,/チェック:CP-A90/.test(si3[0].kind)],['DIFF',false,true],'有効 이면 판정에 들어감 (kind 相違:チェック:CP-A90)');
const r45=ACL.cpRunRow(CPX.rows[2],{lc:LC()}); eq([r45.status,r45.would,r45.na,/対象外/.test(r45.detail)],['INFO','INFO',true,true],'対象外 = 参考 (na)');

console.log('ACL 照合 — 마스터 없음 = v0.17 · 試験 줄 = verdict 같음');
let old=null; try{ old=cpr.execFileSync('git',['show','4b2d99c:acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
const O17=old?core(old):null;
for(const n of [71,72,73]){ const cp=FX.compass(n), sp=FX.perfectSpec(ACL,cp), f={};
  Object.keys(sp.fields).forEach(k=>{ f[k]={text:sp.fields[k].join('\n'), page:1, label:ACL.LABELS[k]}; });
  Object.assign(f,{totalContainers:{text:sp.totals.words,page:2}, totalPkgs:{text:sp.totals.bales+' BALES',page:2}, totalWeight:{text:String(sp.totals.weight),page:2}, totalMeasure:{text:String(sp.totals.measure),page:2}});
  const j={layout:'NACCS', pages:2, fields:f, rows:sp.rows.map(r=>Object.assign({kind:'BALES', page:1},r)), note:''};
  const a=ACL.compareOne(ACL.scanMerge(j,j), cp, {meta:{pay:'LC'}});
  if(O17){ const b=O17.compareOne(O17.scanMerge(j,j), cp, {meta:{pay:'LC'}}); eq(J(a),J(b),'마스터 없음 — v0.17 과 바이트까지 같음 ('+n+')'); }
  const all=ACL.cpPrepare(rows.concat([{id:'CP-A93',kind:'追加',stage:'ACL',pay:'ALL',scope_type:'all',scope:'ALL',left:'',op:'',right:'',result:'相違',engine_key:'acl:measure',title_ja:'TEST M',status:'試験'}]),[],{trustAll:true});
  const c=ACL.compareOne(ACL.scanMerge(j,j), cp, {meta:{pay:'LC'}, checkpoints:all, lcText:':43T: TRANSHIPMENT = ALLOWED'});
  const extra=c.items.filter(i=>/^cp:CP-A9/.test(i.key));
  eq([c.verdict, J(c.kinds)],[a.verdict, J(a.kinds)],'試験 줄 넣음 — verdict · kinds 같음 ('+n+')');
  ok(extra.length===2&&extra.every(i=>i.trial&&i.status==='INFO'),'試験 項目 2 (ACL 단계만 · S/I 행은 ACL 에 안 나옴)',extra.map(i=>[i.cp,i.status,i.would]));
}
ok(!Object.values(ACL.CP_CODE).some(f=>/[가-힣]/.test(String(f))),'CP_CODE 문자열 한글 0');
eq(Object.keys(ACL.CP_CODE).length,15,'CP_CODE 15 (S/I 5 · ACL 7 · B/L Draft 3)');
console.log('v18 pass '+pass+' fail '+fail); process.exit(fail?1:0);
