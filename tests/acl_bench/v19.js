/* acl_bench v0.19 시험 (지시서 THOR_17 E-V3 · E-V6 · E-K6 · 형님 V3 · V6 · K6) — 가짜 데이터 · 가짜 거래처 · 네트워크 없음 · AI 0 (가짜 AI · 가짜 그림)
   V6 당사자 칸 (전화 · FAX 숫자만 · 우편번호 한쪽만 · 줄바꿈 · 마침표 = 表記差 · 번호 다르면 相違) · K6 CP-A04 (BL ↔ B/L · DAYS = 表記差 · 일수 · 기준일 다르면 相違) ·
   V3 「読めず」 칸 3 번째 판독 (앞의 2 회 중 하나와 같음 · 체크 칸 잘라낸 그림 2 회 같음 · 「?」 메우기 = 확정 · 그 밖 = 미정 + 잘라낸 그림) · 칸 이름 (사람 말) · 도구 (가짜 AI)
   node v19.js [html] */
const fs=require('fs'), path=require('path'), FX=require('./fixtures');
const HTML_P=process.argv[2]||path.join(__dirname,'../../acl_bench.html'), HTML=fs.readFileSync(HTML_P,'utf8');
const ACL=new Function('module',HTML.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
(async()=>{
/* ── V6 ── */
const PN=ACL.partyNotation;
ok(PN('SAMPLE CO.,LTD.\n1-2-3 SAMPLETOWN3 5FL.\nTOKYO JAPAN\nTEL:+81-3-0000-1111 FAX:+81-3-0000-1112','SAMPLE CO.,LTD. 1-2-3 SAMPLETOWN 3 5FL TOKYO 100-0001 JAPAN\nTEL:(+81)-3-0000-1111 FAX:(+81)-3-0000-1112').ok,'V6 ① 괄호 · 우편번호 한쪽만 · 줄바꿈 · 마침표 = 表記差');
ok(PN('SAMPLE TEL:+81-3-0000-1111','SAMPLE TEL:03-0000-1111').ok,'V6 ② +81-3 = 03 (국번 + 0)');
eq(PN('SAMPLE TEL:+81-3-0000-1111','SAMPLE TEL:+81-3-0000-1119').ok,false,'V6 ③ 번호 자체가 다름 = 相違 (ok:false)');
eq([PN('A ROAD 12345 HANOI','A ROAD 12346 HANOI'), PN('A ROAD HANOI','A STREET HANOI')],[null,null],'V6 ④ 우편번호 둘 다 있는데 다름 · 글자 다름 = 그대로 (null)');
ok(PN('SAMPLE TEL: +84-28-0000-0000','SAMPLE PHONE: 028-0000-0000').ok,'V6 ⑤ TEL = PHONE (라벨) · 국번');
eq(PN('SAMPLE TEL: 0000-1111','SAMPLE FAX: 0000-1111'),null,'V6 ⑥ TEL ↔ FAX 라벨이 다르면 그대로');
/* compareOne 안 (S/I 文面 의 Shipper · Notify) */
{ const cp=FX.compass(71), sp=FX.perfectSpec(ACL,cp), f={};
  Object.keys(sp.fields).forEach(k=>{ f[k]={text:sp.fields[k].join('\n'), page:1, label:ACL.LABELS[k]}; });
  Object.assign(f,{totalContainers:{text:sp.totals.words,page:2}, totalPkgs:{text:sp.totals.bales+' BALES',page:2}, totalWeight:{text:String(sp.totals.weight),page:2}, totalMeasure:{text:String(sp.totals.measure),page:2}});
  const mk=fx=>{ const g=JSON.parse(J(f)); fx(g); const j={layout:'NACCS', pages:2, fields:g, rows:sp.rows.map(r=>Object.assign({kind:'BALES', page:1},r)), note:''}; return ACL.compareOne(ACL.scanMerge(j,j), cp, {meta:{pay:'LC'}}); };
  const base=mk(()=>{}), it=(r,k)=>r.items.find(i=>i.key===k)||{};
  const sh=String(f.shipper.text).split('\n');
  const z=mk(g=>{ const L=sh.slice(); L[1]=(L[1]||'')+' 100-0001'; g.shipper.text=L.join('\n'); });
  eq([it(base,'shipper').status, it(z,'shipper').status, it(z,'shipper').kind],['MATCH','NOTATION','表記:電話・郵便番号:Shipper'],'V6 ⑦ compareOne — Shipper 에 우편번호만 더 = 表記差 (kind 表記:電話・郵便番号)');
  const tl=String(f.notify&&f.notify.text||''), hasTel=/TEL|PHONE|FAX/.test(tl.toUpperCase());
  if(hasTel){ const n=mk(g=>{ g.notify.text=tl.replace(/(TEL|PHONE|FAX)(\W*)\+?(\d)/i,'$1$2(+$3'); }); ok(['MATCH','NOTATION'].indexOf(it(n,'notify').status)>=0,'V6 ⑧ Notify 전화 괄호 = 一致/表記差',[it(n,'notify').status,it(n,'notify').detail]); }
  else ok(true,'V6 ⑧ (가짜 Notify 에 전화 없음 — 건너뜀)');
  eq(base.verdict, mk(()=>{}).verdict,'V6 ⑨ 바꾸지 않으면 같은 결과'); }
/* 最終確認 (itemIn) も 同じ規則 — S/I 「TEL:(+81)-3-…」 = ACL 「TEL : +81-3-…」 */
{ const it={type:'text', src:'shipper', text:'TEL:(+81)-3-0000-1111 FAX:(+81)-3-0000-1112', key:ACL.tKey('TEL:(+81)-3-0000-1111 FAX:(+81)-3-0000-1112')};
  eq([ACL.itemIn(it,'SAMPLE CO.\nTEL : +81-3-0000-1111\nFAX : +81-3-0000-1112'), ACL.itemIn(it,'SAMPLE CO.\nTEL : +81-3-0000-1111\nFAX : +81-3-0000-1119')],[true,false],'V6 ⑩ 最終確認의 항목 찾기 = 전화 · FAX 숫자만 (번호 다르면 없음)'); }
/* ── K6 (CP-A04 si:deadline) ── */
const D=(l,s)=>ACL.CP_CODE['si:deadline']({lc:{payment:{tenor_text:l}}, si:{crcf9_payment_deadline:s}}).st;
eq([D('AT 90 DAYS AFTER BL DATE','90 DAYS AFTER B/L DATE'), D('AT 90 DAYS AFTER BILL OF LADING DATE','90 DAY AFTER B/L DATE'), D('AT 90 DAYS AFTER B/L DATE FOR 100 PCT','AT 90 DAYS AFTER B/L DATE FOR 100 PCT')],['NOTATION','NOTATION','MATCH'],'K6 ① BL = B/L · BILL OF LADING · DAYS 단복수 = 表記差 · 같으면 一致');
eq([D('AT 90 DAYS AFTER B/L DATE','AT 120 DAYS AFTER B/L DATE'), D('AT SIGHT','AT 90 DAYS AFTER B/L DATE'), D('AT 90 DAYS AFTER INVOICE DATE','AT 90 DAYS AFTER B/L DATE'), D('AT 90 DAYS AFTER B/L DATE FOR 100 PCT','AT 90 DAYS AFTER B/L DATE FOR 90 PCT')],['DIFF','DIFF','DIFF','DIFF'],'K6 ② 일수 · AT SIGHT ↔ n DAYS · 기준일 · % 다르면 相違');
ok(/日数|起算日/.test(ACL.CP_CODE['si:deadline']({lc:{payment:{tenor_text:'AT 90 DAYS AFTER INVOICE DATE'}}, si:{crcf9_payment_deadline:'AT 90 DAYS AFTER B/L DATE'}}).d),'K6 ③ 相違 이유 (起算日)');
/* ── V3 ── */
const F=(t,ab)=>ab?{text:null, absent:true, page:1}:{text:t, absent:false, page:1, label:''};
const j1={layout:'OTHER', form:'SAMPLE FORM', containerTable:false, pages:1, fields:{freight:F(''), agentSign:F(''), shipperMail:F('1) ????.???@??MPLE.TEST'), issuePlace:F('TOKYO')}, rows:[]};
const j2={layout:'OTHER', form:'SAMPLE FORM', containerTable:false, pages:1, fields:{freight:F('1'), agentSign:F(null,true), shipperMail:F('1) ?'), issuePlace:F('TOKY0')}, rows:[]};
const m0=ACL.scanMerge(j1,j2,{other:true}); ok(['freight','agentSign','shipperMail','issuePlace'].every(k=>m0.fields[k].conf==='AI_DIFF'),'V3 ① 2 회 다름 = AI_DIFF (読めず) 4 칸',m0.ai.diffFields);
const r3={schema:'acl_scan_r3/1', fields:{freight:{value:'1',value2:'',crop:'c1.png'}, agentSign:{value:'1',value2:'1',crop:'c2.png'}, shipperMail:{value:'1) MAIL.BOX@SAMPLE.TEST',value2:'1) MAIL.B0X@SAMPLE.TEST',crop:'c3.png'}, issuePlace:{value:'OSAKA',value2:'OSAKA',crop:'c4.png'}}, cost_usd:0.01};
const m=ACL.scanMerge(j1,j2,{other:true, r3});
eq([m.fields.freight.conf, m.fields.freight.text, m.fields.freight.r3how],['SURE','1','前の判読と同じ'],'V3 ② 3 번째 = 앞의 한 번과 같음 → 확정 (3 回目で確定)');
eq([m.fields.agentSign.conf, m.fields.agentSign.text, m.fields.agentSign.r3how],['SURE','1','切り抜き 2 回同じ'],'V3 ③ 체크 칸 = 잘라낸 그림 2 회 같음 → 확정');
eq([m.fields.shipperMail.conf, m.fields.shipperMail.text],['SURE','1) MAIL.BOX@SAMPLE.TEST'],'V3 ④ 앞의 「?」 를 메운 모양 (글자 수 같음) → 확정 (3 번째 값)');
eq([m.fields.issuePlace.conf, m.fields.issuePlace.r3.value, m.fields.issuePlace.r3.crop],['AI_DIFF','OSAKA','c4.png'],'V3 ⑤ 글자 칸 = 잘라낸 그림 2 회 같아도 앞의 2 회와 다르면 미정 (잘라낸 그림 + 값)');
eq([m.ai.r3.decided, m.ai.r3.open, m.ai.diffFields],[['freight','agentSign','shipperMail'],['issuePlace'],['issuePlace']],'V3 ⑥ ai.r3 (확정 · 미정) · 남은 読めず');
eq(J(ACL.scanMerge(j1,j2,{other:true})), J(m0),'V3 ⑦ r3 없으면 v0.18 과 같음');
eq([ACL.fieldJa('agentSign'), ACL.fieldJa('freight'), ACL.fieldJa('shipperMail'), ACL.LABELS.agentSign],['NEED AGENT NAME（チェック）','FREIGHT AS ARRANGED（チェック）','B/L ドラフト送付先メール','Agent Signature Request Identifier'],'V3 ⑧ 칸 이름 = 사람 말 (訂正 메일의 NACCS 이름은 그대로)');
ok(/checked/.test(ACL.scanRetryPrompt('freight','FREIGHT AS ARRANGED'))&&/"text"/.test(ACL.scanRetryPrompt('shipperMail','MAIL')),'V3 ⑨ 체크 칸 = ☒/☐ 만 묻기 · 글자 칸 = 글자');
eq([ACL.scanRetryValue('freight',{checked:true}), ACL.scanRetryValue('freight',{checked:false}), ACL.scanRetryValue('freight',{}), ACL.scanBox({found:true,box:[0.2,0.3,0.4,0.5]}).map(x=>+x.toFixed(2)), ACL.scanBox({found:false})],['1','',null,[0.16,0.26,0.44,0.54],null],'V3 ⑩ 답 읽기 · 위치 (여백 4 %)');
/* compareOne 줄에 표시 */
{ const cp=FX.compass(71); const c=ACL.compareOne(m, cp, {meta:{pay:'LC'}}); const fr=c.items.find(i=>i.key==='disp:freight')||{};
  ok(fr.r3&&fr.r3.st==='確定'&&/AI 3 回目で確定/.test(fr.detail),'V3 ⑪ 결과 줄 = 「AI 3 回目で確定」',fr); }
/* 화면 (書類ツール v0.22 — opt.v22 만) */
{ const cp=FX.compass(71); const c=ACL.compareOne(m, cp, {meta:{pay:'LC'}}); const h0=ACL.viewHtml(c,{admin:true}), h=ACL.viewHtml(c,{admin:true, v22:true});
  ok(!/<!--av-list-->|data-key=|av-r3/.test(h0),'V4 ⑮ opt.v22 없음 = v0.18 화면 그대로');
  const it=(o)=>Object.assign({group:'NACCS 表示欄', expected:'', actual:'', detail:'', kind:''},o);
  const res={verdict:'相違あり', items:[it({key:'disp:freight', label:'Freight As Arranged', status:'MATCH', r3:{st:'確定', value:'1'}}), it({key:'disp:agentSign', label:'Agent Signature Request Identifier', status:'READ_CHECK', r3:{st:'未定', value:'', value2:'1', amb:['','(欄なし)'], crop:'c9.png'}}),
    it({group:'S/I 文面', key:'shipper', label:'Shipper', status:'DIFF', expected:'A', actual:'B'}), it({group:'S/I 文面', key:'notify', label:'Notify Party', status:'NOTATION', expected:'A', actual:'a'})]};
  const hv=ACL.viewHtml(res,{admin:true, v22:true}), iL=hv.indexOf('<!--av-list-->'), iR=hv.indexOf('読めないところ 1 か所 —'), iD=hv.indexOf('相違 1 か所'), iN=hv.indexOf('表記差 1 か所');
  ok(iD>0&&iD<iR&&iR<iN&&iN<iL&&/<details class="av-more av-listbox">/.test(hv.slice(iL)),'V4 ⑯ 결론 → 相違 → 読めない → 表記差 → (버튼 자리) → 체크리스트 (맨 아래 · 접기)',[iD,iR,iN,iL]);
  ok(/FREIGHT AS ARRANGED（チェック）/.test(hv)&&/3 回目で確定/.test(hv)&&/data-key="shipper"/.test(hv),'V3 ⑰ 사람 말 칸 이름 · 「3 回目で確定」 · 줄에 data-key');
  ok(/data-crop="c9.png"/.test(hv)&&/決まらない/.test(hv)&&/NEED AGENT NAME（チェック）/.test(hv),'V3 ⑱ 미정 칸 = 잘라낸 그림 (data-crop) + 값'); }
/* 도구 (가짜 AI · 가짜 그림 · 네트워크 0) */
{ const T=await import(require('url').pathToFileURL(path.join(__dirname,'../../tools/acl_scan_r3.mjs')).href); const calls=[];
  const call=async(body,label)=>{ calls.push(label); const t=body.messages[0].content[1].text; return {text:/Find the ONE box/.test(t)?'{"found":true,"box":[0.1,0.1,0.3,0.2]}':/checkbox/.test(t)?'{"checked":true}':'{"text":"1) MAIL.BOX@SAMPLE.TEST"}', usage:{input_tokens:1000, output_tokens:50}}; };
  const render=async()=>Buffer.from('PNG');
  const out=await T.scanRetry(Buffer.from('%PDF-fake'), [j1,j2], {ACL, other:true, call, render});
  eq(Object.keys(out.fields).sort(),['agentSign','freight','issuePlace','shipperMail'],'V3 ⑫ 도구 = 読めず 칸만 다시 읽음');
  ok(calls.length===12&&calls.filter(x=>/位置/.test(x)).length===4,'V3 ⑬ 칸마다 위치 1 회 + 잘라낸 그림 2 회',calls);
  ok(Object.keys(out.crops).length===4&&/\.other\.r3\.freight\.png$/.test(out.fields.freight.crop)&&out.cost_usd>0,'V3 ⑭ 잘라낸 그림 저장 이름 · 비용',out.fields.freight); }
console.log('v19 pass '+pass+' fail '+fail); process.exit(fail?1:0);
})().catch(e=>{ console.log('FAIL', e.stack); process.exit(1); });
