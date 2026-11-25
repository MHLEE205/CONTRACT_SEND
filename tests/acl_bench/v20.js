/* acl_bench v0.20 시험 (지시서 THOR_19 ①-1 · ①-4 · 형님 P1 · 리나이 Q4) — 가짜 데이터 · 네트워크 없음 · AI 0
   CP-A04 = L/C 42C 원문 그대로 (공백 · 대소문자만 表記差 · BL ↔ B/L ↔ BILL OF LADING · 덧붙임 · 빠짐 = 相違 · 이유) · B/L ドラフト送付先メール 「?」 판독 = 규칙 값과 「?」 밖 전부 같으면 一致
   node v20.js [html] */
const fs=require('fs'), path=require('path');
const HTML=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../acl_bench.html'),'utf8');
const ACL=new Function('module',HTML.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify; const ok=(c,m,i)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,i===undefined?'':J(i).slice(0,600));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
const D=(l,s)=>ACL.CP_CODE['si:deadline']({lc:{payment:{tenor_text:l}}, si:{crcf9_payment_deadline:s}});
eq(['AT 90 DAYS AFTER B/L DATE','DRAFTS AT 90 DAYS AFTER B/L DATE'].map(l=>D(l,'AT 90 DAYS AFTER B/L DATE').st),['MATCH','MATCH'],'① 원문 그대로 = 一致 (앞의 DRAFTS AT 는 빼고 비교)');
eq(D('AT 90 DAYS AFTER B/L DATE','at 90  days after b/l date').st,'NOTATION','② 공백 · 대소문자만 = 表記差');
const r=D('90 DAYS AFTER BILL OF LADING DATE','90 DAYS AFTER B/L DATE FOR 100PCT OF INVOICE VALUE');
ok(r.st==='DIFF'&&/書き換え: BILL OF LADING → B\/L/.test(r.d)&&/足した: FOR 100PCT OF INVOICE VALUE/.test(r.d),'③ (형님 P1 실례 모양) BILL OF LADING → B/L · 덧붙임 = 相違 · 이유',r.d);
eq(['AT 90 DAYS AFTER BL DATE','AT 90 DAY AFTER B/L DATE','AT 90 DAYS AFTER B/L DATE.'].map(s=>D('AT 90 DAYS AFTER B/L DATE',s).st),['DIFF','DIFF','DIFF'],'④ BL · DAY 단수 · 마침표 = 相違 (v0.19 의 表記差 되돌림)');
ok(/抜けた: FOR 100 PCT/.test(D('AT 90 DAYS AFTER B/L DATE FOR 100 PCT','AT 90 DAYS AFTER B/L DATE').d),'⑤ 빠짐 = 「抜けた」');
/* ①-4 메일 칸 */
const E='PHOTO.TEST@EXAMPLE.TEST';
eq([ACL.mailWild({amb:['1) ?HOTO.TEST@EXA?PLE.TEST\n2)','1) ?']}, '1) '+E), ACL.mailWild({amb:['1) PHOTO.TEXT@EXAMPLE.TEST','?'] }, E), ACL.mailWild({amb:['??','?']}, E), ACL.mailWild({amb:['a','b'], r3:{value:'photo.test@example.te?t', value2:null}}, E)],
   ['1) ?HOTO.TEST@EXA?PLE.TEST\n2)','','','photo.test@example.te?t'],'⑥ 「?」 밖 전부 같음 = 그 판독 · 한 글자 다름 / 읽힌 글자 없음 = 없음 · 3 번째 판독도');
const F={shipperMail:{text:'', conf:'AI_DIFF', amb:['1) ?HOTO.TEST@EXA?PLE.TEST','1) ?'], ai:true}};
const it=ACL.dispItems(F, [{rule:'acl_shipper_mail', scope_type:'all', scope:'ALL', value:E, note:''}], {}, {}).find(i=>i.key==='disp:shipperMail');
ok(it&&it.status==='MATCH'&&/一部読めず/.test(it.detail),'⑦ 표시 칸 결과 = 一致 「AI 判読 · 一部読めず」',it);
const it2=ACL.dispItems({shipperMail:{text:'', conf:'AI_DIFF', amb:['1) ?HOTO.TEXT@EXA?PLE.TEST','?'], ai:true}}, [{rule:'acl_shipper_mail', scope_type:'all', scope:'ALL', value:E, note:''}], {}, {}).find(i=>i.key==='disp:shipperMail');
ok(it2&&it2.status==='READ_CHECK','⑧ 하나라도 다르면 지금처럼 読取確認 (그림 + 값)',it2);
ok(/version:'0\.20'/.test(HTML),'⑨ version 0.20');
console.log('v20 pass '+pass+' fail '+fail); process.exit(fail?1:0);
