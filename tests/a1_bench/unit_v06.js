/* a1_bench v0.6 단위 시험 (지시서 v0.6 Step 5 표 10줄 + 추가 32건) — 실례 값은 가짜로 바꿈 (v0.7 에서 레포로 옮김)
   node unit_v06.js [a1_bench.html] */
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const sc=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
const ctx={console}; vm.createContext(ctx);
vm.runInContext(sc('a1-core')+'\n;this.A1C=A1C;',ctx); vm.runInContext(sc('a1-master')+'\n;this.A1M=A1M;',ctx);
const {A1C,A1M}=ctx; let pass=0,fail=0;
const eq=(name,got,exp)=>{ const g=JSON.stringify(got), e=JSON.stringify(exp); if(g===e){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,'\n   got',g,'\n   exp',e);} };
const ok=(name,c,info)=>{ if(c){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,info===undefined?'':JSON.stringify(info));} };
const ctxOf=(o)=>A1M.lcContext({tags:o.tags||{},lcNo:o.lcNo||'',text:o.text||''},o.po||'');
const item=(no,buyer,bank,tags,sis,extra)=>Object.assign({no,date:'',buyer,bankKey:bank,contractPo:'',lc:{tags,lcNo:(tags['20']||'').split('\n')[0],text:Object.keys(tags).map(k=>':'+k+': '+tags[k]).join('\n')},sis},extra||{});

// 1 CAS 5건 → 키 2개
const CAS_BKK='A.B.C.PAPER CO.,LTD.\n10 EXAMPLE RD.\nBANGKOK 10600 THAILAND', CAS_SB='A.B.C. PAPER MILL CO., LTD.\n99/9 MOO 9, SAMPLE HIGHWAY ROAD,\nSAMPLEWARD, MUANG SAMPLEPROV DISTRICT,\nSAMPLEPROV 16000 THAILAND';
const cas=['LRS-2603CA1','LRS-2604CA1','LRS-2605CA1','LRS-2606CA1','LRS-2608CA1'].map(no=>item(no,'CAS','BIC:BANKTHBK',{'20':'LC'+no.slice(4),'50':/2605|2606/.test(no)?CAS_BKK:CAS_SB},[{crcf9_sino:1,crcf9_notify_party:/2605|2606/.test(no)?'A.B.C.PAPER CO.,LTD.':'A.B.C. PAPER MILL CO., LTD.'}]));
const d1=A1M.buildMasterDraft(cas);
eq('1 CAS 키 수',d1.keys.length,2);
eq('1 CAS 키별 계약',d1.keys.map(k=>k.contracts).sort(),[['LRS-2603CA1','LRS-2604CA1','LRS-2608CA1'],['LRS-2605CA1','LRS-2606CA1']]);
eq('1 CAS 키별 notify 상태',d1.keys.map(k=>k.fields.find(f=>f.field==='notify_party')).map(f=>f.status+' '+f.recommended).sort(),['確実 {APPLICANT_NAME}','確実 {APPLICANT_NAME}']);
// 2 notify = :50 첫 줄
eq('2 notify 틀',A1M.toTemplate('A.B.C. PAPER MILL CO., LTD.',ctxOf({tags:{'50':CAS_SB}})).template,'{APPLICANT_NAME}');
// 3 address
const t3=A1M.toTemplate('99/9 MOO 9, SAMPLE HIGHWAY ROAD,\nSAMPLEWARD, MUANG SAMPLEPROV DISTRICT,\nSAMPLEPROV 16000 THAILAND',ctxOf({tags:{'50':'A.B.C. PAPER MILL CO., LTD.\n99/9 MOO 9 SAMPLE HIGHWAY ROAD\nSAMPLEWARD MUANG SAMPLEPROV DISTRICT\nSAMPLEPROV 16000 THAILAND'}}));
eq('3 address 틀',t3.template,'{APPLICANT_ADDR}'); eq('3 addr_lines',t3.addrLines,'all');
const t3b=A1M.toTemplate('99/9 MOO 9, SAMPLE HIGHWAY ROAD,\nSAMPLEWARD, MUANG SAMPLEPROV DISTRICT, EMAIL: A@B.COM',ctxOf({tags:{'50':CAS_SB}}));
eq('3b 일부 줄만',[t3b.template,t3b.addrLines],['{APPLICANT_ADDR} EMAIL: A@B.COM','1,2/3']);
// 4 DELTA
const sgTags={'20':'ILC0001','50':'DELTA PAPER CORPORATION\nSAMPLE A INDUSTRIAL PARK\nSAMPLE WARD, HO CHI MINH CITY, VIET NAM'};
const t4=A1M.toTemplate('0300000002#156/GPMT-BTNMT#DEPOSIT#DELTA PAPER CORPORATION***',ctxOf({tags:sgTags}));
eq('4 DELTA 틀',t4.template,'0300000002#156/GPMT-BTNMT#DEPOSIT#{APPLICANT_NAME}***');
const p4=A1M.findPractices(t4.template);
eq('4 세금코드',p4.tax,['0300000002']); eq('4 허가번호',p4.permit,['156/GPMT-BTNMT']); eq('4 DEPOSIT 모양',p4.deposit,['#DEPOSIT#']);
const d4=A1M.buildMasterDraft([item('LRS-2605SG1','DELTA','BIC:BANKVNVX',sgTags,[{crcf9_sino:1,crcf9_consignee:'0300000002#156/GPMT-BTNMT#DEPOSIT#DELTA PAPER CORPORATION***',crcf9_notify_party:'0300000002#156/GPMT-BTNMT#DEPOSIT',crcf9_address:'#DELTA PAPER CORPORATION***'},{crcf9_sino:2,crcf9_notify_party:'DELTA PAPER CORPORATION',crcf9_address:'SAMPLE A INDUSTRIAL PARK, SAMPLE WARD, HO CHI MINH CITY, VIET NAM',crcf9_tel:'TEL +84 200 1234567'}])]);
const k4=d4.keys[0];
eq('4 관행 세금코드(키)',k4.practices.tax.map(e=>e.value),['0300000002']); eq('4 관행 허가(키)',k4.practices.permit.map(e=>e.value),['156/GPMT-BTNMT']);
ok('4 관행 DEPOSIT #DEPOSIT# 포함',k4.practices.deposit.map(e=>e.value).indexOf('#DEPOSIT#')>=0,k4.practices.deposit);
eq('4 TEL 관행',k4.practices.tel.map(e=>e.value),['TEL +84 200 1234567']);
eq('4 sino2 address 틀',k4.fields.find(f=>f.sino===2&&f.field==='address').recommended,'{APPLICANT_ADDR}');
eq('4 sino 구성',[k4.sinos,Object.keys(k4.sino_composition)],[[1,2],['1+2']]);
// 5 lc_no
const t5=A1M.toTemplate('ABC123 DATED ON AUG 06, 2026',ctxOf({tags:{'20':'ABC123','31C':'260806'}}));
eq('5 lc_no 틀',t5.template,'{LC_NO} DATED ON {LC_DATE}'); eq('5 날짜 형식',t5.formats,['MON DD, YYYY']);
eq('5b 날짜 형식들',[ 'AUG 6, 2026','06/08/2026','2026-08-06','260806','06 AUG 2026','AUGUST 06, 2026','20260806'].map(v=>{const r=A1M.toTemplate('X '+v,ctxOf({tags:{'31C':'260806'}}));return r.template+'|'+r.formats.join(',');}),
  ['X {LC_DATE}|MON D, YYYY','X {LC_DATE}|DD/MM/YYYY','X {LC_DATE}|YYYY-MM-DD','X {LC_DATE}|YYMMDD','X {LC_DATE}|DD MON YYYY','X {LC_DATE}|MONTH DD, YYYY','X {LC_DATE}|YYYYMMDD']);
// 6 HKB 7+2
const hkbTags={'20':'X1','50':'HKB-SAMPLE PAPER JOINT STOCK COMPANY\nLOT X1, SAMPLE INDUSTRIAL GROUP'};
const hkb=[];for(let i=1;i<=9;i++) hkb.push(item('LRS-26'+String(i).padStart(2,'0')+'HK1','HKB','BIC:BNKBVNVX',hkbTags,[{crcf9_sino:1,crcf9_consignee:i<=7?'TO ORDER OF SAMPLEBANK CENTRAL BRANCH':'TO ORDER OF SAMPLEBANK - CENTRAL BRANCH'}]));
const f6=A1M.buildMasterDraft(hkb).keys[0].fields.find(f=>f.field==='consignee');
eq('6 HKB 틀 수 · 상태',[f6.templates.length,f6.status,f6.n],[1,'確実',9]);
// 7 XSD 지시문
const xsTags={'20':'X2','50':'XSD INTERNATIONAL PAPER SDN BHD\nNO 1, BANGUNAN SAMPLE','46A':'1. SIGNED COMMERCIAL INVOICE IN 3 COPIES\n2. FULL SET OF CLEAN ON BOARD OCEAN BILLS OF LADING MADE OUT TO ORDER OF APPLICANT MARKED FREIGHT PREPAID AND NOTIFY APPLICANT'};
eq('7 지시문 추출',A1M.consigneeWording(xsTags),'TO ORDER OF APPLICANT');
const k7=A1M.buildMasterDraft([item('LRS-2604XS1','XSD','BIC:BANKMYKL',xsTags,[{crcf9_sino:1,crcf9_consignee:'TO ORDER OF XSD INTERNATIONAL\nPAPER SDN BHD'}])]).keys[0];
eq('7 짝',k7.consignee_wording.map(w=>[w.lc_wording,w.si_template]),[['TO ORDER OF APPLICANT','TO ORDER OF {APPLICANT_NAME}']]);
eq('7b 은행 지시문',A1M.consigneeWording({'46A':'+FULL SET OF B/L MADE OUT TO THE ORDER OF PT BANK SAMPLE (PERSERO) TBK., NOTIFY APPLICANT'}),'TO THE ORDER OF PT BANK SAMPLE (PERSERO) TBK.');
eq('7d MAY = MON',A1M.toTemplate('X MAY 06, 2026',ctxOf({tags:{'31C':'260506'}})).formats,['MON DD, YYYY']);
eq('7c MM/DD 형식',A1M.toTemplate('X 08/06/2026',ctxOf({tags:{'31C':'260806'}})).formats,['MM/DD/YYYY']);
// 8 MEGA SAMPLE
const t8=A1M.toTemplate('PO NUMBER: POAB126100001\n\nVO NUMBER: X.10.000001',ctxOf({tags:{'45A':'WASTE PAPER\nPO NO.: POAB126100001\nHS CODE: 4707.10.00'}}));
eq('8 bl_text1 틀',t8.template,'PO NUMBER: {PO}\n\nVO NUMBER: {VO}');
eq('8b VO XX 그대로',A1M.toTemplate('VO NUMBER: XX',ctxOf({})).template,'VO NUMBER: XX');
eq('8c HS',A1M.toTemplate('WASTE PAPER#47071000#XXKGS#XXBALES\nDEPOSIT NUMBER : XXX',ctxOf({tags:{'45A':'H.S CODE: 4707.10'}})).template,'WASTE PAPER#{HS}#XXKGS#XXBALES\nDEPOSIT NUMBER : XXX');
eq('8c DEPOSIT 모양',A1M.findPractices('WASTE PAPER#{HS}#XXKGS#XXBALES\nDEPOSIT NUMBER : XXX').deposit,['DEPOSIT NUMBER : XXX']);
eq('8d po_vo 종류',[A1M.poKind('LRS-2604MG1',[],''),A1M.poKind('POAB126100001',['POAB126100001'],'{PO}'),A1M.poKind('2823/1026',[],'2823/1026')].map(x=>x.kind+' '+x.shape),['LRS番号 AAA-9999AA9','バイヤーPO AAAA999999999','その他 9999/9999']);
// 9 허가번호 LC와 다름
const vn=(no,lic,lcLic)=>item(no,'TKC','BIC:BIDVVNVX',{'20':'L'+no,'50':'TKC CORP\nADDR LINE ONE','47A':'1. IMPORT LICENSE NO: '+lcLic+' TO BE SHOWN ON B/L'},[{crcf9_sino:1,crcf9_notify_party:'0300000001#'+lic+'#DEPOSIT'}]);
const k9=A1M.buildMasterDraft([vn('LRS-2603KC1','156/GPMT-BTNMT','156/GPMT-BTNMT'),vn('LRS-2604KC1','156/GPMT-BTNMT','157/GPMT-BTNMT')]).keys[0];
eq('9 LC와 다름',k9.lc_diff.map(d=>[d.kind,d.master,d.lc]),[['permit','156/GPMT-BTNMT','157/GPMT-BTNMT']]);
const k9b=A1M.buildMasterDraft([vn('LRS-2603KC1','156/GPMT-BTNMT','156/GPMT-BTNMT')]).keys[0];
eq('9b 같으면 표시 없음',k9b.lc_diff.length,0);
// 10 계약 1건 → 모두 単発
ok('10 単発',k4.fields.length>0 && k4.fields.every(f=>f.status==='単発'),k4.fields.map(f=>f.status));
// 확인要 · 추천 · 빈칸 생략 · 은행 불명
const cr=A1M.buildMasterDraft([item('LRS-2601AA1','AA','BIC:AAAAAAAA',{'50':'AA CO'},[{crcf9_sino:1,crcf9_remark:'',crcf9_consignee:'TO ORDER OF X BANK'}]),item('LRS-2602AA1','AA','BIC:AAAAAAAA',{'50':'AA CO'},[{crcf9_sino:1,crcf9_remark:'',crcf9_consignee:'TO ORDER OF Y BANK'}])]).keys[0];
const fc=cr.fields.find(f=>f.field==='consignee');
eq('11 確認要 · 추천=최근',[fc.status,fc.recommended,fc.templates.map(t=>t.contracts)],['確認要','TO ORDER OF Y BANK',[['LRS-2601AA1'],['LRS-2602AA1']]]);
ok('11 빈칸 칸 생략',!cr.fields.find(f=>f.field==='remark') && cr.unused_fields.some(u=>u.field==='remark'));
const nu=A1M.buildMasterDraft([item('LRS-2602NT1','NATURA','',{},[{crcf9_sino:1,crcf9_consignee:'X'}])]).keys[0];
eq('12 은행 불명',[nu.bank,nu.bank_unknown,nu.bank_note],['銀行不明',true,'銀行 人入力必要']);
// 13 짧은 주소 줄(나라 이름)은 안 바꿈
eq('13 나라 줄 안 바꿈',A1M.toTemplate('BANGKOK, THAILAND',ctxOf({tags:{'50':'X CO\nTHAILAND'}})).template,'BANGKOK, THAILAND');
// 14 CSV · summary
const all=A1M.buildMasterDraft(cas.concat(hkb));
const rows=A1M.toCsvRows(all); ok('14 CSV 줄 = 키×sino×칸',rows.length===all.keys.reduce((n,k)=>n+k.fields.length,0),rows.length);
const md=A1M.toSummaryMd(all,{version:'0.6'}); ok('14 summary 푸터',/✦ Powered by LEENAI Automation System\n$/.test(md)); ok('14 summary 確認要 목록',/## 確認要/.test(md));
ok('14 키 정렬 = 바이어 순',all.keys.map(k=>k.buyer).join()==='CAS,CAS,HKB');
console.log(`\nunit pass ${pass} fail ${fail}`); process.exitCode=fail?1:0;
