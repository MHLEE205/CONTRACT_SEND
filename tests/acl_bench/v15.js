/* acl_bench v0.15 시험 (지시서 THOR_10 G9 — 乙仲 자체 양식 ACL 도 대조) — 가짜 PDF · 가짜 거래처 · AI 는 가짜 응답 · 네트워크 없음
   1 프롬프트 — 인자 없음 = v0.14 (6d57a01) 와 한 글자도 같음 · 乙仲様式 = 양식 이름 · absent · containerTable · 한글 0
   2 scanMerge (other) — 2 회 다 「欄がない」 = NA · 한쪽만 = AI_DIFF (読取確認) · 2 회 같음 = SURE · 「""」 (빈칸) 은 NA 아님 · 양식 이름 · 컨테이너 표 없음 · other 아니면 v0.14 와 바이트까지 같음
   3 compareOne (other) — 완전 → 完全一致 + 「AI 判読 (乙仲様式)」 · NA 칸 → 対象外 (相違 아님 · 판정에 안 들어감) · 같은 칸을 v0.14 방식으로 = 読取確認要 (차이 확인) ·
     한 번만 欄なし → 読取確認要 · 있는 칸의 진짜 차이 → 相違あり (숨기지 않음) · 본선/항차 한 칸 · 컨테이너 표 없음 → COMPASS のみ = 対象外 · 표 있는데 행 없음 = 相違
   4 NACCS · 스캔 NACCS = v0.14 (6d57a01) — 가짜 NACCS 10 경우 · 가짜 스캔 판독 → compareOne 바이트까지 같음
   5 tools/acl_scan_ai.mjs --other (가짜 AI) — 乙仲様式 프롬프트 · {sha256}.other.json · format OTHER · 같은 PDF 는 저장본 (AI 0) · 스캔 저장본과 따로
   6 화면 (jsdom · e2e 가짜 세계 NFK2601-11 = 글자 있는 OTHER) — 체크 없음 → 読取対象外 (AI 0) / 체크 → AI 2 번 (乙仲様式 프롬프트) · _scan_ai/{sha256}.other.json · 결과 「AI 判読 (乙仲様式)」 + 양식 이름 / 다시 → 저장본 (AI 0) · 한글 0
   node v15.js [html] */
const fs=require('fs'), path=require('path'), os=require('os'), cpr=require('child_process'), crypto=require('crypto'), FX=require('./fixtures'), N=require('./fake_naccs'), R=require('./pdfread');
const HTML_P=process.argv[2]||path.join(__dirname,'../../acl_bench.html'), HTML=fs.readFileSync(HTML_P,'utf8');
const core=h=>new Function('module',h.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const ACL=core(HTML);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
const item=(r,k)=>r.items.find(i=>i.key===k);
const hg=/[가-힣]/;

/* 가짜 AI 응답 — 완전한 ACL (perfectSpec 와 같은 값) · other = 乙仲様式 모양 (form · containerTable · absent) */
function aiJson(cp, over, other){
  const sp=FX.perfectSpec(ACL, cp), f={};
  Object.keys(sp.fields).forEach(k=>{ f[k]={text:sp.fields[k].join('\n'), page:1, label:ACL.LABELS[k]}; if(other) f[k].absent=false; });
  Object.assign(f,{totalContainers:{text:sp.totals.words,page:2}, totalPkgs:{text:sp.totals.bales+' BALES',page:2}, totalWeight:{text:String(sp.totals.weight),page:2}, totalMeasure:{text:String(sp.totals.measure),page:2}, numberOf:{text:String(sp.totals.count),page:2}});
  const j={layout:other?'OTHER':'NACCS', pages:2, fields:f, rows:sp.rows.map(r=>Object.assign({kind:'BALES', page:1},r)), note:''};
  if(other) Object.assign(j,{form:'SAMPLE FORWARDER DOCK RECEIPT', containerTable:true});
  return over?over(JSON.parse(J(j))):j;
}
const META=()=>({pay:'TT'});
const AB=k=>({text:null, absent:true});
/* 乙仲様式에 흔히 없는 칸 (NACCS 전용 표시칸 · Place of Receipt · Ref No. 등) */
const NA_KEYS=['receipt','refNo','masterBl','alsoNotify','wayBill','received','freight','agentSign','shipperMail','issuePlace','hsMain','finalDest'];

(async()=>{
  /* 1 프롬프트 */
  let old=null; try{ old=cpr.execFileSync('git',['show','6d57a01:acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
  const O14=old?core(old):null;
  if(O14) ok(ACL.scanPrompt()===O14.scanPrompt()&&ACL.SCAN_SYSTEM===O14.SCAN_SYSTEM,'1-1 인자 없는 scanPrompt · SCAN_SYSTEM = v0.14 (6d57a01) 와 한 글자도 같음 (스캔 NACCS 판독 그대로)');
  else ok(true,'1-1 (git 기록 없음 · 생략)');
  const PO=ACL.scanPrompt({other:true});
  ok(ACL.HEAD_KEYS.every(k=>PO.indexOf('"'+k+'"')>=0)&&/"absent":true/.test(PO)&&/"form"/.test(PO)&&/"containerTable"/.test(PO)&&/NOT the NACCS standard layout/.test(PO)&&/Do not move text from another box/.test(PO),'1-2 乙仲様式 프롬프트 — 29 칸 · 欄がない = absent · 양식 이름 · 컨테이너 표 · 다른 칸에서 옮기지 않기');
  ok(!hg.test(PO+J(ACL.SCAN_AI)+ACL.NA_NOTE),'1-3 乙仲様式 프롬프트 · 문구 한글 0');

  /* 2 scanMerge (other) */
  const cp=FX.compass(41), j=aiJson(cp,null,true);
  const jA=aiJson(cp, x=>{ NA_KEYS.forEach(k=>{ x.fields[k]=AB(k); }); return x; }, true);
  const mA=ACL.scanMerge(jA, jA, {other:true});
  ok(NA_KEYS.every(k=>mA.fields[k].conf==='NA'&&mA.fields[k].text==='')&&J(mA.ai.naFields.slice().sort())===J(NA_KEYS.slice().sort())&&mA.ai.other&&mA.ai.label==='AI 判読 (乙仲様式)','2-1 2 회 다 「欄がない」 → NA (값 비움) · naFields · 라벨 「AI 判読 (乙仲様式)」',mA.ai);
  const jB=aiJson(cp, x=>{ NA_KEYS.forEach(k=>{ x.fields[k]=AB(k); }); x.fields.receipt={text:'TOKYO, JAPAN', absent:false, page:1}; return x; }, true);
  const mB=ACL.scanMerge(jA, jB, {other:true});
  ok(mB.fields.receipt.conf==='AI_DIFF'&&J(mB.fields.receipt.amb)===J(['(欄なし)','TOKYO, JAPAN'])&&mB.ai.diffFields.indexOf('receipt')>=0,'2-2 한 번만 「欄がない」 → AI_DIFF (読取確認 · 두 값 메모)',mB.fields.receipt);
  const jC=aiJson(cp, x=>{ x.fields.wayBill={text:'', absent:false}; return x; }, true), mC=ACL.scanMerge(jC, jC, {other:true});
  ok(mC.fields.wayBill.conf==='SURE'&&mC.fields.wayBill.text===''&&mC.ai.naFields.indexOf('wayBill')<0,'2-3 칸은 있는데 빈칸 ("") = NA 가 아님 (SURE 빈칸)',mC.fields.wayBill);
  ok(mA.fields.consignee.conf==='SURE'&&mA.fields.consignee.text===j.fields.consignee.text,'2-4 2 회 같은 칸 = SURE · 원문 그대로');
  eq([mA.ai.form, ACL.scanMerge(jA, Object.assign({},jA,{form:'OTHER NAME'}), {other:true}).ai.form, mA.ai.noTable],['SAMPLE FORWARDER DOCK RECEIPT','SAMPLE FORWARDER DOCK RECEIPT / OTHER NAME',false],'2-5 양식 이름 (2 회 같음 · 다르면 둘 다) · 컨테이너 표 있음');
  if(O14){ const j1=aiJson(cp), j2=aiJson(cp, x=>{ x.fields.notify.text+='X'; x.fields.refNo={text:null, absent:true}; return x; }, true);
    ok(J(ACL.scanMerge(j1,j1,{model:'m'}))===J(O14.scanMerge(j1,j1,{model:'m'}))&&J(ACL.scanMerge(j1,j2))===J(O14.scanMerge(j1,j2)),'2-6 other 아님 = v0.14 scanMerge 와 바이트까지 같음 (absent 글자가 있어도)'); }
  else ok(true,'2-6 (생략)');

  /* 3 compareOne (other) */
  const c0=ACL.compareOne(ACL.scanMerge(j, j, {other:true}), cp, {meta:META()});
  ok(c0.verdict==='完全一致'&&item(c0,'ai:other')&&item(c0,'ai:other').status==='INFO'&&/SAMPLE FORWARDER DOCK RECEIPT/.test(item(c0,'ai:other').actual)&&!item(c0,'ai:scan')&&J(c0.na)==='[]','3-1 완전한 乙仲様式 → 完全一致 · 「AI 判読 (乙仲様式)」 참고 줄 (양식 이름) · out.na = []',{v:c0.verdict, k:c0.kinds});
  const cA=ACL.compareOne(mA, cp, {meta:META()});
  const naIt=cA.items.filter(i=>i.na);
  ok(cA.verdict==='完全一致'&&naIt.length>0&&naIt.every(i=>i.status==='INFO'&&/この様式に欄がない/.test(i.detail)&&!i.kind)&&item(cA,'receipt').na&&item(cA,'disp:wayBill').na&&J(cA.na)===J(naIt.map(i=>i.label)),'3-2 NA 칸 → 対象外 (INFO · 相違 아님 · 판정에 안 들어감) · 받는곳 · 표시칸 등',{v:cA.verdict, k:cA.kinds, na:cA.na});
  { const m14=ACL.scanMerge(Object.assign({},jA,{layout:'NACCS'}), Object.assign({},jA,{layout:'NACCS'})), c14=ACL.compareOne(m14, cp, {meta:META()});
    ok(c14.verdict==='読取確認要'&&item(c14,'receipt').status==='READ_CHECK'&&!c14.na,'3-3 같은 판독을 v0.14 방식 (other 아님) 으로 → 読取確認要 (NA 가 없으면 이렇게 됨 — 차이 확인)',{v:c14.verdict}); }
  const cB=ACL.compareOne(mB, cp, {meta:META()});
  ok(cB.verdict==='読取確認要'&&item(cB,'receipt').status==='READ_CHECK'&&!item(cB,'receipt').na&&/AI 2 回の判読が違う/.test(item(cB,'receipt').detail),'3-4 한 번만 欄なし → 読取確認要 (対象外 아님)',item(cB,'receipt'));
  { const jd=aiJson(cp, x=>{ NA_KEYS.forEach(k=>{ x.fields[k]=AB(k); }); x.fields.consignee.text=x.fields.consignee.text.replace(/\n[^\n]*$/,''); return x; }, true), cd=ACL.compareOne(ACL.scanMerge(jd,jd,{other:true}), cp, {meta:META()});
    ok(cd.verdict==='相違あり'&&['DIFF','DROP'].indexOf(item(cd,'consignee').status)>=0&&!item(cd,'consignee').na,'3-5 있는 칸의 진짜 차이 (Consignee 줄 빠짐) → 相違あり (対象外 로 숨기지 않음)',{v:cd.verdict, k:cd.kinds}); }
  { const jv=aiJson(cp, x=>{ x.fields.vessel.text=x.fields.vessel.text+' '+x.fields.voy.text; x.fields.voy=AB(); return x; }, true), cv=ACL.compareOne(ACL.scanMerge(jv,jv,{other:true}), cp, {meta:META()});
    ok(['MATCH','NOTATION'].indexOf(item(cv,'vessel').status)>=0&&cv.verdict!=='相違あり'&&cv.verdict!=='読取確認要','3-6 본선 · 항차가 한 칸 (항차 칸 없음) → 본선 칸만으로 비교 (相違 · 読取確認 아님)',item(cv,'vessel')); }
  { const jn=aiJson(cp, x=>{ x.rows=[]; x.containerTable=false; return x; }, true), cn=ACL.compareOne(ACL.scanMerge(jn,jn,{other:true}), cp, {meta:META()});
    const co=cn.items.filter(i=>/^cpOnly:/.test(i.key));
    ok(co.length===cp.containers.length&&co.every(i=>i.status==='INFO'&&i.na&&/コンテナ表がない/.test(i.detail))&&!cn.kinds['COMPASS のみのコンテナ'],'3-7 컨테이너 표가 없는 양식 → COMPASS のみ 행 = 対象外',{k:cn.kinds});
    const jt=aiJson(cp, x=>{ x.rows=[]; x.containerTable=true; return x; }, true), ct=ACL.compareOne(ACL.scanMerge(jt,jt,{other:true}), cp, {meta:META()});
    ok(ct.verdict==='相違あり'&&ct.kinds['COMPASS のみのコンテナ'],'3-8 표는 있는데 행이 없음 → 相違 그대로 (対象外 아님)',{v:ct.verdict}); }
  ok(!hg.test(J(cA.items.filter(i=>i.na||i.key==='ai:other'))),'3-9 対象外 · 참고 줄 한글 0');
  /* 3b 시범 (실례 모양 · 가짜 값) 에서 고친 것 */
  { const jr=aiJson(cp, x=>{ x.rows.forEach(r=>{ r.tare=null; r.type=''; r.size=''; }); return x; }, true), mr=ACL.scanMerge(jr,jr,{other:true}), cr=ACL.compareOne(mr, cp, {meta:META()});
    const sets=cr.items.filter(i=>/^set:/.test(i.key));
    ok(J(mr.ai.naCols.sort())===J(['size','tare','type'])&&mr.rows.every(r=>r.conf==='SURE')&&sets.every(i=>i.status==='MATCH'&&J(i.naCols)===J(['風袋','形態'].filter(k=>i.naCols.indexOf(k)>=0))&&i.set.cells.find(c=>c.k==='風袋').na)&&!cr.kinds['セット相違:風袋']&&!cr.kinds['セット相違 (セット数)']&&cr.verdict==='完全一致','3-10 컨테이너 표에 風袋 · 형태 열이 없는 양식 → 그 열은 対象外 (セット 一致 · 행 SURE)',{v:cr.verdict, k:cr.kinds, s:sets[0]});
    const jw=aiJson(cp, x=>{ x.rows.forEach(r=>{ r.bales=null; r.cargo=null; r.tare=null; }); return x; }, true), cw=ACL.compareOne(ACL.scanMerge(jw,jw,{other:true}), cp, {meta:META()});
    ok(item(cw,'acl:weight')&&item(cw,'acl:weight').na&&item(cw,'acl:bales').na&&!cw.kinds['ACL 内部不整合']&&cw.verdict==='完全一致','3-11 행에 Bales · 중량 열이 없음 → 「ACL 内 (行の和 ↔ 合計)」 = 対象外 (가짜 内部不整合 없음)',{v:cw.verdict, k:cw.kinds});
    const js=aiJson(cp, x=>{ x.rows[0].tare=null; x.rows[1].seal='SL999999'; return x; }, true), cs=ACL.compareOne(ACL.scanMerge(js,js,{other:true}), cp, {meta:META()});
    ok(cs.verdict==='相違あり'&&cs.kinds['セット相違:シール']&&cs.kinds['セット相違:風袋']&&!(ACL.scanMerge(js,js,{other:true}).ai.naCols||[]).length,'3-12 열은 있는데 한 행만 빈칸 / 씰 다름 → 相違 그대로 (対象外 아님)',cs.kinds); }
  { const jc=aiJson(cp, x=>{ x.fields.vessel.text+=' 3E8662'; return x; }, true), cc=ACL.compareOne(ACL.scanMerge(jc,jc,{other:true}), cp, {meta:META()});
    ok(item(cc,'vessel').status==='MATCH'&&/呼出符号 3E8662 は外して比較/.test(item(cc,'vessel').detail),'3-13 본선 칸 끝의 호출부호 (3E8662) → 떼고 비교',item(cc,'vessel'));
    const jv2=aiJson(cp, x=>{ x.fields.voy.text='V.'+x.fields.voy.text; return x; }, true), cv2=ACL.compareOne(ACL.scanMerge(jv2,jv2,{other:true}), cp, {meta:META()});
    ok(item(cv2,'vessel').status==='MATCH','3-13b 항차 앞 「V.」 는 떼고 비교',item(cv2,'vessel'));
    const jv3=aiJson(cp, x=>{ x.fields.vessel.text='D8CM'; return x; }, true), cv3=ACL.compareOne(ACL.scanMerge(jv3,jv3,{other:true}), cp, {meta:META()});
    const jv4=aiJson(cp, x=>{ x.fields.vessel.text=''; x.fields.voy.text='9999W'; return x; }, true), cv4=ACL.compareOne(ACL.scanMerge(jv4,jv4,{other:true}), cp, {meta:META()});
    ok(item(cv3,'vessel').status==='NOTATION'&&cv3.kinds['表記:本船名なし (乙仲様式)']&&item(cv4,'vessel').status==='DIFF'&&/航海番号が違う/.test(item(cv4,'vessel').detail),'3-13c 본선명 없이 호출부호만 (D8CM) / 빈칸 → 항차만 비교 (같으면 表記 · 다르면 相違)',[item(cv3,'vessel'),item(cv4,'vessel')]);
    const jn=aiJson(cp, x=>{ x.fields.vessel.text+=' 3E8662'; return x; }), cn=ACL.compareOne(ACL.scanMerge(jn,jn), cp, {meta:META()});
    ok(item(cn,'vessel').status!=='MATCH','3-14 스캔 NACCS (other 아님) 는 그대로 (v0.14 와 같음)'); }
  { const jm=aiJson(cp, x=>{ x.fields.marks.text+='\n'+x.rows.map(r=>r.container+'/'+r.seal).join('\n'); return x; }, true), cm2=ACL.compareOne(ACL.scanMerge(jm,jm,{other:true}), cp, {meta:META()});
    ok(item(cm2,'marks').status==='MATCH'&&/コンテナ行 \d+ 行/.test(item(cm2,'marks').detail),'3-16 「Container No./Seal No. Marks」 한 칸 양식 — Marks 안의 컨테이너 줄 (표와 같은 번호) 은 떼고 비교',item(cm2,'marks'));
    const jx=aiJson(cp, x=>{ x.fields.marks.text+='\nXTRU0000008/SL1'; return x; }, true), cx=ACL.compareOne(ACL.scanMerge(jx,jx,{other:true}), cp, {meta:META()});
    ok(item(cx,'marks').status!=='MATCH','3-17 표에 없는 번호의 줄은 그대로 비교 (追加)',item(cx,'marks').status); }
  { const cpL=FX.compass(42), lc={schema:'lc_read/1', version:1, lc_no:'TLC0042', fields:{}, bl:{originals:3}, pod:{list:[]}, pol:{}};
    const jo=aiJson(cpL, x=>{ x.fields.originals.text='THREE(3)with NON-NEGOTIABLE COPY'; return x; }, true), co=ACL.compareOne(ACL.scanMerge(jo,jo,{other:true}), Object.assign({},cpL,{lc}), {meta:{pay:'LC'}});
    const lo=item(co,'lc:originals'), mo=ACL.scanMerge(jo,jo,{other:true});
    ok(lo&&lo.status==='MATCH'&&/THREE\(3\)with NON-NEGOTIABLE COPY/.test(lo.detail)&&mo.fields.originals.text==='THREE(3)with NON-NEGOTIABLE COPY','3-15 원본 수 「THREE(3)with …」 → (3) 으로 비교 · 판독 원문은 그대로',lo);
    const lc1=Object.assign({},lc,{bl:{originals:1}}), j1=aiJson(cpL, x=>{ x.fields.originals.text='ONE(WAYBILL)'; return x; }, true), c1=ACL.compareOne(ACL.scanMerge(j1,j1,{other:true}), Object.assign({},cpL,{lc:lc1}), {meta:{pay:'LC'}});
    ok(item(c1,'lc:originals').status==='MATCH','3-15b 「ONE(WAYBILL)」 → 1',item(c1,'lc:originals')); }

  /* 4 NACCS · 스캔 NACCS = v0.14 */
  if(O14){ let same=0, n=0, bad=[];
    for(let k=1;k<=13;k++){ const c=FX.compass(k,{containers:k===9?20:3}); let s=FX.perfectSpec(O14,c);
      if(k===2) s.rows[1].seal='SL999999'; if(k===3){ s.rows[0].bales=99; FX.retotal(s); } if(k===4){ s.rows=s.rows.slice().reverse(); s.order='shuffle'; } if(k===5){ s.rows.push({container:'XTRU0000008',seal:'SLX00001',bales:10,cargo:9000,tare:3700,measure:40}); FX.retotal(s); }
      if(k===6) s.fields.booking=['BK7777777']; if(k===7){ s.fields.description=s.fields.description.filter(l=>!/^L\/C NO/.test(l)); s.fields.consignee=s.fields.consignee.concat(['EXTRA LINE ADDED BY FORWARDER']); }
      if(k===12) s.overflow='THIS IS A VERY LONG LINE OF TEXT THAT RUNS PAST THE DESCRIPTION CELL INTO THE NEXT CELL';
      if(k===10||k===11||k===13) continue;
      const pages=await R.readItems(Buffer.from(await N.build(s))); n++;
      const a=O14.readNaccs(pages), b=ACL.readNaccs(pages);
      if(J(a)===J(b)&&J(O14.compareOne(a,c,{meta:{pay:'LC'}}))===J(ACL.compareOne(b,c,{meta:{pay:'LC'}}))&&J(O14.classifyFormat(pages))===J(ACL.classifyFormat(pages))) same++; else bad.push(k); }
    ok(same===n&&n===10,'4-1 가짜 NACCS '+n+' 경우 — classifyFormat · readNaccs · compareOne 이 v0.14 (6d57a01) 와 바이트까지 같음',bad);
    const js=aiJson(cp), js2=aiJson(cp, x=>{ x.fields.notify.text+=' X'; x.rows[0].seal='SL1'; return x; });
    ok(J(ACL.compareOne(ACL.scanMerge(js,js2),cp,{meta:META()}))===J(O14.compareOne(O14.scanMerge(js,js2),cp,{meta:META()}))&&J(ACL.compareOne(ACL.scanMerge(js,js),cp,{meta:META()}))===J(O14.compareOne(O14.scanMerge(js,js),cp,{meta:META()})),'4-2 스캔 NACCS 판독 → compareOne 이 v0.14 와 바이트까지 같음'); }
  else { ok(true,'4-1 (생략)'); ok(true,'4-2 (생략)'); }

  /* 5 tools/acl_scan_ai.mjs --other (가짜 AI) */
  const T=await import(require('url').pathToFileURL(path.join(__dirname,'../../tools/acl_scan_ai.mjs')).href);
  const pdf=Buffer.from(await N.build({kind:'OTHER'})), calls=[];
  const fake=(texts)=>async(body,label)=>{ calls.push({label, doc:body.messages[0].content[0].type, prompt:body.messages[0].content[1].text, model:body.model}); const t=texts.shift(); return {text:t, usage:{input_tokens:1000, output_tokens:500}, stop:'end_turn', model:body.model}; };
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'scanoth_'));
  const r1=await T.scanReadCached(pdf, tmp, {ACL, other:true, call:fake([J(jA), J(jA)])}), h=crypto.createHash('sha256').update(pdf).digest('hex');
  ok(calls.length===2&&calls.every(c=>c.doc==='document'&&c.model==='claude-opus-5-5'&&/NOT the NACCS standard layout/.test(c.prompt))&&r1.format==='OTHER'&&r1.prompt_ver==='o2'&&fs.existsSync(path.join(tmp,h+'.other.json'))&&!fs.existsSync(path.join(tmp,h+'.json')),'5-1 --other — AI 2 번 (乙仲様式 프롬프트 · 같은 모델 · PDF document) · {sha256}.other.json · format OTHER',{n:calls.length, f:r1.format});
  calls.length=0; const r2=await T.scanReadCached(pdf, tmp, {ACL, other:true, call:fake([])});
  ok(r2.cached&&calls.length===0,'5-2 같은 PDF → 저장본 (AI 0 번)');
  calls.length=0; const r3=await T.scanReadCached(pdf, tmp, {ACL, call:fake([J(j),J(j)])});
  ok(!r3.cached&&calls.length===2&&!/NOT the NACCS/.test(calls[0].prompt)&&fs.existsSync(path.join(tmp,h+'.json')),'5-3 스캔 (v0.14) 저장본은 따로 ({sha256}.json · 프롬프트 v0.14)');
  ok(typeof T.apiKey==='function'&&/process\.env\.LEENAI_ANTHROPIC_API_KEY/.test(T.apiKey.toString())&&/darwin/.test(T.apiKey.toString()),'5-4 apiKey (키체인 → 환경변수) 함수가 export 됨 (값은 시험하지 않음)');
  fs.rmSync(tmp,{recursive:true,force:true});

  /* 6 화면 (jsdom) — e2e.js 의 가짜 세계 · NFK2601-11 = 글자 있는 OTHER */
  const src=fs.readFileSync(path.join(__dirname,'e2e.js'),'utf8'), head=src.slice(0, src.indexOf('(async()=>{'));
  const H=new Function('require','process','__dirname', head.replace('w.fetch=fakeFetch(W);','w.fetch=W.wrap?W.wrap(fakeFetch(W)):fakeFetch(W); if(W.prep) W.prep(w);')+';return {world, page, until, $};')(require, {argv:[process.argv[0],'e2e.js',HTML_P]}, __dirname);
  const W=await H.world(), AIc=[], cpO=W.cps['NFK2601-11'], sse=t=>{ const ev=[{type:'message_start',message:{usage:{input_tokens:1000},model:'claude-opus-5-5'}},{type:'content_block_delta',delta:{type:'text_delta',text:t}},{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:400}}];
    const body=ev.map(e=>'data: '+J(e)+'\n\n').join(''); let sent=false; return {ok:true,status:200,headers:{get:()=>null},body:{getReader:()=>({read:async()=>{ if(sent) return {done:true}; sent=true; return {done:false, value:new TextEncoder().encode(body)}; }})}}; };
  const aiO=aiJson(cpO, x=>{ NA_KEYS.forEach(k=>{ x.fields[k]=AB(k); }); return x; }, true);
  W.prep=w=>{ try{ if(!w.crypto||!w.crypto.subtle) Object.defineProperty(w,'crypto',{value:crypto.webcrypto, configurable:true}); }catch(e){} const st={leenai_apikey_v1:'sk-test-fake'}; Object.defineProperty(w,'localStorage',{value:{getItem:k=>st[k]==null?null:st[k], setItem:(k,v)=>{ st[k]=String(v); }, removeItem:k=>{ delete st[k]; }}, configurable:true}); };
  W.wrap=base=>async(url,init)=>{
    if(String(url).indexOf('https://api.anthropic.com/')===0){ const b=JSON.parse(init.body); AIc.push({doc:b.messages[0].content[0].type, prompt:b.messages[0].content[1].text, key:init.headers['x-api-key']}); return sse(J(aiO)); }
    const u=decodeURIComponent(String(url)); const m=u.match(/_scan_ai\/([0-9a-f]{64}(?:\.other)?)\.json:\/content/);
    if(m&&(!init||!init.method||init.method==='GET')){ const k=Object.keys(W.puts).find(p=>p.indexOf('_scan_ai/'+m[1]+'.json')>=0); return k?{ok:true,status:200,headers:{get:()=>null},json:async()=>JSON.parse(W.puts[k])}:{ok:false,status:404,headers:{get:()=>null},json:async()=>({})}; }
    return base(url,init); };
  const w=await H.page(W), $=id=>w.document.getElementById(id);
  $('abList').click(); await H.until(()=>/完了|ab-ng/.test($('abListSt').innerHTML));
  $('abInv').value='NFK2601-11'; $('abInv').dispatchEvent(new w.Event('input'));
  ok(/乙仲様式 1 件 = AI 判読 \(乙仲様式\)/.test($('abRunSt').textContent),'6-1 件数 표시에 乙仲様式 1 件',$('abRunSt').textContent);
  $('abRun').click(); await H.until(()=>/完了|止めました/.test($('abRunSt').textContent)&&!w.eval('S.running'),60000);
  let o=JSON.parse(w.eval('JSON.stringify(S.results)')).find(r=>r.invoice==='NFK2601-11');
  ok(o.verdict==='読取対象外'&&AIc.length===0&&/AI 判読なし/.test(o.why),'6-2 체크 없음 · 저장본 없음 → 読取対象外 (AI 0)',{v:o.verdict, why:o.why});
  $('abScanAi').checked=true; $('abRun').click(); await H.until(()=>/完了|止めました/.test($('abRunSt').textContent)&&!w.eval('S.running'),60000);
  o=JSON.parse(w.eval('JSON.stringify(S.results)')).find(r=>r.invoice==='NFK2601-11');
  const putK=Object.keys(W.puts).filter(p=>/_scan_ai\/[0-9a-f]{64}\.other\.json$/.test(p));
  ok(AIc.length===2&&AIc.every(c=>c.doc==='document'&&c.key==='sk-test-fake'&&/NOT the NACCS standard layout/.test(c.prompt))&&putK.length===1&&JSON.parse(W.puts[putK[0]]).format==='OTHER','6-3 체크 → AI 2 번 (乙仲様式 프롬프트) · _scan_ai/{sha256}.other.json 저장 (format OTHER)',{ai:AIc.length, puts:putK});
  ok(o.verdict==='完全一致'&&o.format==='OTHER'&&o.ai&&o.ai.other&&o.ai.form==='SAMPLE FORWARDER DOCK RECEIPT'&&o.na&&o.na.length>0&&/AI 判読 \(乙仲様式\) · SAMPLE FORWARDER DOCK RECEIPT/.test($('abResults').innerHTML),'6-4 결과 = 같은 照合 (完全一致 · 対象外 칸은 相違 아님) · 화면에 「AI 判読 (乙仲様式) · 양식 이름」',{v:o.verdict, k:o.kinds, na:o.na});
  ok(/AI 判読 \(スキャン · 乙仲様式\) 1 件 \(保存済み 0 · 新しく 1/.test($('abRunSt').textContent)&&w.eval('S.run.scan_ai.other')===1,'6-5 완료 문구 · run.scan_ai.other',$('abRunSt').textContent);
  AIc.length=0; $('abRun').click(); await H.until(()=>/完了|止めました/.test($('abRunSt').textContent)&&!w.eval('S.running'),60000);
  o=JSON.parse(w.eval('JSON.stringify(S.results)')).find(r=>r.invoice==='NFK2601-11');
  ok(AIc.length===0&&o.verdict==='完全一致'&&w.eval('S.run.scan_ai.cached')===1,'6-6 다시 照合 → 저장본 (AI 0 번)',{ai:AIc.length});
  const sm=w.eval('ACL.summaryMd(S.run)');
  ok(/## AI 判読 \(乙仲様式\) \(様式ごと\)/.test(sm)&&/\| SAMPLE FORWARDER DOCK RECEIPT \| 1 \| 完全一致 1 \| \d+ \|/.test(sm),'6-7 summary.md 에 양식별 표 (판정 · 対象外 칸 수)',sm.slice(-600));
  ok(W.dv.every(x=>x.method==='GET'),'6-8 COMPASS 는 GET 만');
  const txt=[$('abScanAi').parentNode.textContent, $('abRunSt').textContent, J(o.items.filter(i=>i.na||i.key==='ai:other')), $('abResults').textContent, sm].join(' ');
  ok(!hg.test(txt),'6-9 v0.15 로 늘어난 화면 문구 · 결과 줄 · summary 한글 0',txt.slice(0,300));
  w.close();

  console.log(`v15 pass ${pass} fail ${fail}`); process.exit(fail?1:0);
})().catch(e=>{ console.log('FAIL 예외',e.stack); console.log('v15 pass '+pass+' fail '+(fail+1)); process.exit(1); });
