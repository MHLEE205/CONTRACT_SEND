/* a1_bench v0.13 단위 시험 — 지시서 THOR_37 (L/C → S/I R1 ~ R8 · N72)
   L/C 原文の欄 (lcSections · lcSectionText) · 組立のシステム文 R1 ~ R8 · 支払期限 · 組立の入力に L/C 原文の欄 (画像 L/C = なし)
   node unit_v013.js [a1_bench.html]   (가짜 데이터만) */
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const sc=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
const ctx={console}; vm.createContext(ctx); vm.runInContext(sc('a1-core')+'\n;this.A1C=A1C;',ctx);
const {A1C}=ctx; let pass=0,fail=0; const J=x=>JSON.stringify(x);
const eq=(n,g,e)=>{ if(J(g)===J(e)){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n,'\n   got',J(g),'\n   exp',J(e));} };
const ok=(n,c)=>{ if(c){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n);} };
const RAW=[' DOCUMENTARY CREDIT NUMBER     :20  TESTLC0001',' APPLICANT                     :50',' SAMPLE BUYER CO., LTD.',' 1 TEST ROAD',' DRAFTS AT ...                 :42C','  90 DAYS AFTER BILL OF LADING DATE',
 ' DESCRIPTION OF GOODS AND/OR SERVICES:45A','  + HS CODE: 4707.10.00','  + SPECIFICATION:',' --- Page 3 ---','  OUTTHROW: 5% MAX',' DOCUMENTS REQUIRED            :46A','  1/ INVOICE IN TRIPLICATE',
 ' AMENDMENT',' DOCUMENTS REQUIRED            :46A','  1/ INVOICE IN DUPLICATE'].join('\n');
const S=A1C.lcSections(RAW);
eq('lcSections 태그 순서',S.map(s=>s.tag),['20','50','42C','45A','46A','46A']);
eq('45A 내용 (쪽 표시 뺌 · 줄 그대로)',S.find(s=>s.tag==='45A').text,'+ HS CODE: 4707.10.00\n+ SPECIFICATION:\nOUTTHROW: 5% MAX');
eq('칸 아닌 줄 (AMENDMENT) = 앞 칸 (첫 46A) 끝',S[4].text,'1/ INVOICE IN TRIPLICATE\nAMENDMENT');
eq('20 같은 줄 내용',S[0].text,'TESTLC0001');
const T=A1C.lcSectionText(RAW);
ok('lcSectionText = 「:45A: 이름」 + 원문 · 2 번째 46A = (Amend 1)',/:45A: DESCRIPTION OF GOODS AND\/OR SERVICES\n\+ HS CODE: 4707\.10\.00/.test(T)&&/:46A: DOCUMENTS REQUIRED \(Amend 1\)\n1\/ INVOICE IN DUPLICATE/.test(T));
eq('빈 글자 = 없음',A1C.lcSectionText(''),'');
const sys=(html.match(/const R2_ASSEMBLE_SYSTEM=`([\s\S]*?)`;/)||[])[1]||'';
['R1 crcf9_invoicetext','R2 crcf9_bencert_text','R3 crcf9_place_of_delivery_1','R4 cr49f_payment_terms','R5 crcf9_consignee','R6 crcf9_notify_party · crcf9_address','R7 港の文言','R8 銀行名','crcf9_payment_deadline (支払期限'].forEach(k=>ok('組立 규칙 '+k,sys.indexOf('- '+k)>=0));
ok('규칙 = 원문 그대로 (抜かない · 縮めない) · 섞지 않음 · DATE 抜かない · 直前 S/I の形が先',/直前 S\/I の形が先/.test(sys)&&/抜かない · 縮めない/.test(sys)&&/混ぜない/.test(sys)&&/DATE を抜かない/.test(sys));
ok('組立 입력에 L/C 原文の欄 (画像 = なし)',/lcSec:lcp\.image\?'':A1C\.lcSectionText\(r2RawForCheck\(lcp\)\)/.test(html)&&/【L\/C 原文の欄 \(コードで切り出し/.test(html));
ok('버전 0.13 이상',/version:'0\.1[34]'/.test(html));
console.log(`\nunit_v013 pass ${pass} fail ${fail}`); process.exitCode=fail?1:0;
