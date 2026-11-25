/* acl_bench v0.21 시험 (지시서 THOR_22 N11 · 형님 「"90 DAYS DAYS AFTER BILL OF LADING DATE" 로 충분해」) — 가짜 데이터 · 네트워크 없음 · AI 0
   42C 의 결제 조건 부분만 (payTerm) — 앞 「… WILL BE PAID AT」 · 뒤 「AGAINST THE PRESENTATION …」 · 「DRAFTS DRAWN ON …」 를 떼고 안은 L/C 글자 그대로 (DAYS DAYS 오타도)
   node v21.js [html] */
const fs=require('fs'), path=require('path');
const HTML=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../acl_bench.html'),'utf8');
const ACL=new Function('module',HTML.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify; const ok=(c,m,i)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,i===undefined?'':J(i).slice(0,600));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
const D=(l,s)=>ACL.CP_CODE['si:deadline']({lc:{payment:{tenor_text:l}}, si:{crcf9_payment_deadline:s}});
const KC='100PCT OF INVOICE VALUE WILL BE PAID AT 90 DAYS DAYS AFTER BILL OF LADING DATE AGAINST THE PRESENTATION OF THE FOLLOWING DOCUMENTS IN ENGLISH UNLESS OTHERWISE STATED:';
const DC='100PCT OF INVOICE VALUE WILL BE PAID AT 90 DAYS AFTER SHIPMENT DATE';
eq([ACL.payTerm(KC), ACL.payTerm(DC)],['90 DAYS DAYS AFTER BILL OF LADING DATE','90 DAYS AFTER SHIPMENT DATE'],'① 실례 모양 (KC1 · DC1) = 결제 조건 부분만 · DAYS DAYS 그대로');
eq([ACL.payTerm('AT 90 DAYS AFTER B/L DATE'), ACL.payTerm('AT SIGHT'), ACL.payTerm('DRAFTS AT 180 DAYS AFTER SIGHT DRAFTS DRAWN ON ISSUING BANK'), ACL.payTerm('90 days after Bill of Lading  date')],
   ['AT 90 DAYS AFTER B/L DATE','AT SIGHT','DRAFTS AT 180 DAYS AFTER SIGHT','90 days after Bill of Lading date'],'② 쓰는 값 = L/C 그대로 (앞의 AT · 대소문자 유지 · 공백만 1 개 · DRAWN ON 뗌)');
eq([D(KC,'90 DAYS DAYS AFTER BILL OF LADING DATE').st, D(DC,'AT 90 DAYS AFTER SHIPMENT DATE').st, D(DC,'90 DAYS AFTER SHIPMENT DATE').st],['MATCH','MATCH','MATCH'],'③ 안내 문장이 붙은 42C ↔ 결제 조건만 쓴 S/I = 一致');
ok(D(KC,'90 DAYS AFTER BILL OF LADING DATE').st==='DIFF','④ 안은 그대로 비교 — S/I 가 DAYS DAYS 를 고쳐 쓰면 相違 (L/C 글자 그대로가 기준)');
eq(['AT 90 DAYS AFTER B/L DATE','AT 90 DAY AFTER B/L DATE','AT 90 DAYS AFTER B/L DATE.'].map(s=>D('AT 90 DAYS AFTER B/L DATE',s).st),['MATCH','DIFF','DIFF'],'⑤ v0.20 의 규칙 그대로 (단수 · 마침표 = 相違)');
ok(/version:'0\.21'/.test(HTML),'⑥ version 0.21');
console.log('v21 pass '+pass+' fail '+fail); process.exit(fail?1:0);
