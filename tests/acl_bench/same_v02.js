/* v0.3 회귀 (지시서 시험 10) — 메일 CSV 를 읽지 않은 상태의 결과가 v0.2 (3e1b99f) 와 같은지.
   다른 곳은 둘뿐이어야 한다: ① Step 4 (줄 안 낱말 경계 → 相違) ② 표시 칸 (v0.2 「B/L 種類」 参考 2줄 → v0.3 「NACCS 表示欄」 6줄 · 규칙 없으면 参考).
   node same_v02.js <v0.2.html> [v0.3.html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures'),N=require('./fake_naccs'),R=require('./pdfread');
const load=f=>new Function('module',fs.readFileSync(f,'utf8').match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const OLD=load(process.argv[2]), NEW=load(process.argv[3]||path.join(__dirname,'../../acl_bench.html'));
let pass=0,fail=0; const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':JSON.stringify(info).slice(0,700));} };
/* v0.4: 다른 곳 ③ — 揚地 (Port of Discharge · Place of Delivery) 의 기대값 · 설명이 「ブッキング POD」 → 「S/I 의 값」 (지시서 v0.4 Step 3). 판정 (status · kind) 은 같아야 함 */
const strip=c=>({verdict:c.verdict, items:c.items.filter(i=>i.group!=='B/L 種類'&&i.group!=='NACCS 表示欄').map(i=>{ const o=Object.assign({},i); delete o.wordBreak; o.detail=String(o.detail||'').replace(' (行末の折り返し)','');
    if(o.key==='pod'||o.key==='delivery'){ o.expected=''; o.detail=''; } return o; }),   /* Step 4 의 표시 글자 「(行末の折り返し)」 만 다름 */
  kinds:c.kinds, xx:c.xx});
(async()=>{
  const cases=[];
  for(let n=1;n<=12;n++){ const cp=FX.compass(n,{containers:n===9?20:3}); let spec=FX.perfectSpec(NEW,cp);   // e2e 와 같은 12 경우 (스캔 · 다른 양식은 읽지 않으므로 뺌)
    if(n===2) spec.rows[1].seal='SL999999'; if(n===3){ spec.rows[0].bales=99; FX.retotal(spec); } if(n===4){ spec.rows=spec.rows.slice().reverse(); spec.order='shuffle'; }
    if(n===5){ spec.rows.push({container:'XTRU0000001',seal:'SLX00001',bales:10,cargo:9000,tare:3700,measure:40}); FX.retotal(spec); } if(n===6) spec.fields.booking=['BK7777777'];
    if(n===7){ spec.fields.description=spec.fields.description.filter(l=>!/^L\/C NO/.test(l)); spec.fields.consignee=spec.fields.consignee.concat(['EXTRA LINE ADDED BY FORWARDER']); }
    if(n===8) spec.fields.notify=['SAMPLE PAPER CO., LTD. NO.1 SAMPLE','ROAD, SAMPLE WARD, HO CHI MINH','CITY, VIETNAM','TEL: 84-28-0000-0000 FAX: 84-28-0000-0001'];
    if(n===10) spec.fields.notify=['SAMPLE PAPER CO., LTD.','NO.1 SAMPLE ROAD, SAMPLEWARD,','HO CHI MINH CITY, VIETNAM','TEL: 84-28-0000-0000 FAX: 84-28-0000-0001'];   // 줄 안 공백 빠짐 (Step 4)
    if(n===11) spec.fields.notify=['SAMPLE PAPER CO., LTD.','NO.1 SAMPLE ROAD, SAMPLE WA','RD, HO CHI MINH CITY, VIETNAM','TEL: 84-28-0000-0000 FAX: 84-28-0000-0001'];   // 줄 끝 꺾임
    if(n===12) spec.overflow='THIS IS A VERY LONG LINE OF TEXT THAT RUNS PAST THE DESCRIPTION CELL INTO THE NEXT CELL';
    cases.push({n, cp, pages:await R.readItems(await N.build(spec))}); }
  const out=cases.map(c=>({n:c.n, o:OLD.compareOne(OLD.readNaccs(c.pages),c.cp), w:NEW.compareOne(NEW.readNaccs(c.pages),c.cp)}));
  const same=out.filter(x=>x.n!==10), diffs=same.filter(x=>JSON.stringify(strip(x.o))!==JSON.stringify(strip(x.w)));
  ok(!diffs.length,'규칙 · CSV 없음 → v0.2 와 같은 판정 · 항목 · 차이 종류 (표시 칸 그룹 제외) — '+same.length+' 경우',diffs.map(x=>({n:x.n,o:strip(x.o).verdict,w:strip(x.w).verdict})));
  const c10=out.find(x=>x.n===10), it=c10.w.items.find(i=>i.key==='notify'), o10=c10.o.items.find(i=>i.key==='notify');
  ok(o10.status==='NOTATION'&&c10.o.verdict==='表記差のみ'&&it.status==='DIFF'&&it.wordBreak&&c10.w.kinds['相違:語の切れ目:Notify Party']===1&&c10.w.verdict==='相違あり','다른 곳 ① Step 4 — 줄 안 공백 빠짐: v0.2 表記差 → v0.3 相違:語の切れ目',{o:o10.status,w:it.status,k:c10.w.kinds});
  const c11=out.find(x=>x.n===11); ok(c11.o.items.find(i=>i.key==='notify').status==='NOTATION'&&c11.w.items.find(i=>i.key==='notify').status==='NOTATION','줄 끝 꺾임 (낱말 가운데) 은 v0.2 · v0.3 모두 表記差');
  const d=out[0].w.items.filter(i=>i.group==='NACCS 表示欄');
  /* v0.4: 규칙 없으면 — Way Bill · 원본 = 조합 (가짜 ACL 빈칸·3 = OBL 型) 参考 · Agent Signature = S/I 現地Agent記載 (가짜 S/I 는 비어 있음 → 「S/I 未入力」 参考) · 나머지 「規則未登録」 */
  const dx=k=>d.find(i=>i.key==='disp:'+k);
  ok(d.length===6&&d.every(i=>i.status==='INFO')&&dx('wayBill').expected==='(組合せ)'&&/OBL 型/.test(dx('originals').detail)&&dx('agentSign').expected==='(S/I 未入力)'&&['received','freight','shipperMail'].every(k=>dx(k).expected==='(規則未登録)')&&out[0].o.items.filter(i=>i.group==='B/L 種類').every(i=>i.status==='INFO'),'다른 곳 ② 표시 칸 — 규칙 없으면 6칸 모두 参考 (v0.4: Way Bill·원본 = 組合せ · Agent = S/I 未入力 · 나머지 規則未登録) (판정에 영향 없음 · v0.2 도 参考)',d.map(i=>i.label+'='+i.expected+'/'+i.actual));
  ok(dx('agentSign').actual==='1'&&dx('shipperMail').actual==='DOCS@EXAMPLE.TEST'&&dx('wayBill').actual==='(空欄)','표시 칸 읽기 — Agent Signature (1쪽) · Shipper\'s Mail (2쪽 1)~3) 칸) · 빈칸 = 「(空欄)」 (실제 좌표 자리)');
  const p0=out[0].w.items.find(i=>i.key==='pod'), po=out[0].o.items.find(i=>i.key==='pod');
  ok(p0.status==='MATCH'&&po.status==='MATCH'&&p0.expected==='CAT LAI PORT IN VIETNAM'&&/ブッキング POD: CAT LAI/.test(p0.detail)&&/ブッキング POD: CAT LAI/.test(po.expected),'다른 곳 ③ 揚地 — 기대값 = S/I 값 (v0.2 · v0.3 은 ブッキング POD) · ブッキング POD 는 참고로 detail 에',[p0.expected,p0.detail,po.expected]);
  console.log('same pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
