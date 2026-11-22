/* acl_bench v0.8 시험 (지시서 D00 書類ツール v0.6 수정묶음 · 자체 확인 4 · 5) — 가짜 데이터만 · 네트워크 없음
   ④ コンテナ別記載の指示 ✓ → S/I 의 컨테이너 줄 (「CNTR : …KGS, …BALES」) 은 最終確認 에서 「있음」 / ✗ → 그대로 / 지시 없음 → 그대로 (v0.7 과 같은 결과)
   ⑤ （仮） · (仮) · 【仮】 = S/I 미확정 → siTentative · 乙仲への指示 에서 빠짐 · 판정은 v0.7 과 같음 · 화면 맨 위 「参考」 한 줄 (noTent 면 안 냄)
   node v08.js [html] [v0.7 html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures');
const L=f=>new Function('module',fs.readFileSync(f,'utf8').match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const HTML=process.argv[2]||path.join(__dirname,'../../acl_bench.html'), ACL=L(HTML), A7=process.argv[3]?L(process.argv[3]):null;
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const item=(r,k)=>r.items.find(i=>i.key===k);
const KEYS=['shipper','consignee','notify','alsoNotify','booking','masterBl','vessel','voy','receipt','pol','pod','delivery','finalDest','hsMain','description','marks'];
const JPX=/[ぁ-んァ-ン一-龥]/;
function mkAcl(E, cp, over){
  const ex=E.expected(cp), F={}; KEYS.forEach(k=>{ F[k]={text:'',conf:'SURE'}; });
  Object.assign(F,{shipper:{text:ex.shipper,conf:'SURE'},consignee:{text:ex.consignee,conf:'SURE'},notify:{text:ex.notify,conf:'SURE'},description:{text:ex.description,conf:'SURE'},marks:{text:ex.marks,conf:'SURE'},
    booking:{text:ex.booking,conf:'SURE'},vessel:{text:'SAMPLE STAR',conf:'SURE'},voy:{text:'101W',conf:'SURE'},receipt:{text:'TOKYO, JAPAN',conf:'SURE'},pol:{text:'TOKYO, JAPAN',conf:'SURE'},
    pod:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},delivery:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'}});
  Object.keys(over||{}).forEach(k=>{ F[k]={text:over[k],conf:'SURE'}; });
  const rows=cp.containers.filter(c=>c.crcf9_container_no).map(c=>({container:c.crcf9_container_no, seal:c.crcf9_seal_no, type:'GP', size:'45', bales:c.crcf9_quantity, cargo:c.crcf9_n_w, tare:c.crcf9_t_w, measure:40, conf:'SURE'}));
  return {fields:F, rows, totals:{containers:rows.length, bales:rows.reduce((s,r)=>s+r.bales,0), weight:rows.reduce((s,r)=>s+r.cargo,0)}};
}
const noJp=d=>d.split('\n').map(l=>l.split('#').filter(s=>!JPX.test(s)).join('#')).filter(l=>!JPX.test(l)).join('\n');
console.log('④ コンテナ別記載の指示 ✓ → 컨테이너 줄 있음');
{ /* S/I: 지시 + 컨테이너마다 「CNTR : {N/W}KGS, {BALES}BALES」 줄 (번호 없음 — 실례 F4 와 같은 모양) */
  const mk=(instr)=>{ const cp=FX.compass(3), cl=cp.containers.filter(c=>c.crcf9_container_no);
    cp.sis[0].crcf9_bl_text1='WP#47072000'+(instr?'#各コンテナの重量/BALE数追記':''); cp.sis[0].crcf9_bl_text2=cl.map(c=>'CNTR : '+c.crcf9_n_w+'KGS, '+c.crcf9_quantity+'BALES').join('\n'); return {cp, cl}; };
  const run=(E, instr, aclLines)=>{ const {cp,cl}=mk(instr), ex=E.expected(cp); const keep=noJp(ex.description).split('\n').filter(l=>!/^CNTR :/.test(l));
    return E.compareOne(mkAcl(E,cp,{description:keep.concat(aclLines(cl)).join('\n')}),cp); };
  const perCntr=cl=>cl.map(c=>c.crcf9_container_no+' '+c.crcf9_quantity+'BALE '+c.crcf9_n_w.toLocaleString('en-US')+'KGS');   // ACL 모양 (F4: 「CNTR 24BALE 20,850KGS」)
  const total=cl=>['TOTAL '+cl.reduce((s,c)=>s+c.crcf9_n_w,0)+'KGS '+cl.reduce((s,c)=>s+c.crcf9_quantity,0)+'BALES'];
  const A=run(ACL,true,perCntr), fA=A.final;
  ok(item(A,'instr:cntr').status==='MATCH','지시 ✓ (컨테이너별 번호 · 중량 · BALE 있음)',item(A,'instr:cntr'));
  ok(!fA.missing.length&&fA.byCntr.length>0&&fA.cntrLines.length===3,'✓ → S/I 컨테이너 줄 3 개의 항목 = 있음 · 足りない 0 (byCntr '+fA.byCntr.length+')',[fA.missing,fA.byCntr,fA.cntrLines]);
  ok(/うちコンテナの行 \d+ はコンテナ別記載で確認/.test(ACL.finalView(A).content.text),'最終確認 문구에 「うちコンテナの行 n はコンテナ別記載で確認」',ACL.finalView(A).content);
  if(A7){ const A0=run(A7,true,perCntr); ok(A0.final.missing.length>0&&A0.final.missing.length-fA.missing.length===A0.final.missing.length,'v0.7 은 같은 자료에서 足りない '+A0.final.missing.length+' → v0.8 0',A0.final.missing.map(m=>m.text)); }
  const B=run(ACL,true,total);
  ok(item(B,'instr:cntr').status==='DIFF'&&B.final.missing.length>0&&!B.final.byCntr.length&&!B.final.cntrLines,'지시 ✗ (합계만) → 컨테이너 줄 그대로 足りない',[B.final.missing.length,B.final.byCntr]);
  if(A7){ const B0=run(A7,true,total); ok(J(B0.final.missing.map(m=>m.text))===J(B.final.missing.map(m=>m.text))&&B0.verdict===B.verdict,'✗ 는 v0.7 과 같은 결과',[B0.final.missing.length,B.final.missing.length]); }
  const C=run(ACL,false,perCntr);
  ok(!item(C,'instr:cntr')&&C.final.missing.length>0&&!C.final.byCntr.length,'지시 없음 → 확인 안 함 · 컨테이너 줄 그대로',[C.final.missing.length]);
  if(A7){ const C0=run(A7,false,perCntr); ok(J(C0.final.missing.map(m=>m.text))===J(C.final.missing.map(m=>m.text)),'지시 없음은 v0.7 과 같은 결과'); }
  const {cp:cpN}=mk(true), aN=mkAcl(ACL,cpN,{description:noJp(ACL.expected(cpN).description)}); aN.rows=[]; aN.totals={containers:null,bales:null,weight:null}; const N=ACL.compareOne(aN,cpN);
  ok(item(N,'instr:cntr').status==='READ_CHECK'&&!N.final.byCntr.length,'컨테이너를 못 읽음 (ー) → 그대로',N.final.byCntr);
  ok(ACL.isCntrLine('CNTR : 20850KGS, 24BALES')&&ACL.isCntrLine('TEST1234567 24BALE 20,850KGS')&&ACL.isCntrLine('CONTAINER 1 : 20.85MT, 24 BALES')&&!ACL.isCntrLine('TOTAL 62550KGS 72BALES')&&!ACL.isCntrLine('CNTR : 20850KGS')&&!ACL.isCntrLine('WASTE PAPER 24BALES'),'컨테이너 줄 모양 (컨테이너 말/번호 + 중량 + BALE) 한 곳');
  /* 다른 줄 (컨테이너 줄 아님) 이 ACL 에 없으면 그대로 足りない */
  const D=(()=>{ const {cp}=mk(true), ex=ACL.expected(cp); const keep=noJp(ex.description).split('\n').filter(l=>!/^CNTR :/.test(l)&&!/WP/.test(l)); return ACL.compareOne(mkAcl(ACL,cp,{description:keep.concat(perCntr(cp.containers.filter(c=>c.crcf9_container_no))).join('\n')}),cp); })();
  ok(D.final.missing.some(m=>/WP|47072000/.test(m.text))&&D.final.byCntr.length>0,'✓ 여도 컨테이너 줄이 아닌 항목 (WP 47072000) 이 없으면 足りない',D.final.missing);
}
console.log('⑤ （仮） = 미확정');
{ const mk=v=>{ const cp=FX.compass(3); cp.sis[0].crcf9_bl_text1='WP#47072000#XXKGS #XXBALES'+(v?'#'+v:''); cp.sis[0].crcf9_bl_text2='SAMPLE TEXT LINE\n担当者メモ 確認すること'; return cp; };
  const run=(E,v)=>{ const cp=mk(v); return E.compareOne(mkAcl(E,cp,{description:noJp(E.expected(cp).description)}),cp); };
  const T=run(ACL,'TEST2699-01 3 INVOICE（仮）'), f=T.final;
  ok(T.siTentative===true&&f.siTentative===true,'S/I 에 （仮） → siTentative:true',[T.siTentative,f.siTentative]);
  ok(f.instr.list.length===1&&/担当者/.test(f.instr.list[0].text)&&f.instr.tent.length===1&&/仮/.test(f.instr.tent[0].text),'（仮） 줄은 乙仲への指示 에서 빠짐 (1 → 다른 지시 1 만) · tent 1',f.instr);
  const N=run(ACL,''); ok(N.siTentative===false&&!f.missing.length&&T.verdict===N.verdict&&J(T.kinds)===J(N.kinds),'판정 · 種類는 （仮） 없는 것과 같음 (참고 표시만)',[T.verdict,N.verdict,T.kinds,N.kinds]);
  if(A7){ const T0=run(A7,'TEST2699-01 3 INVOICE（仮）'); ok(T0.verdict===T.verdict&&J(T0.kinds)===J(T.kinds)&&T0.final.missing.length===f.missing.length,'v0.7 과 판정 같음 (v0.7 은 乙仲への指示 2)',[T0.verdict,T.verdict,T0.final.instr.list.length]); }
  ok(run(ACL,'NOTE (仮)').siTentative&&run(ACL,'NOTE【仮】').siTentative&&run(ACL,'NOTE（ 仮 ）').siTentative,'(仮) · 【仮】 · 공백 있는 （ 仮 ） 도');
  ok(!run(ACL,'仮ACL を送付').siTentative&&!run(ACL,'仮に').siTentative,'괄호 없는 「仮」 (仮ACL · 仮に) 는 미확정 아님');
  const cpL=mk(''); cpL.sis[0].cr49f_lc_no='TESTLC0001(仮)'; ok(ACL.compareOne(mkAcl(ACL,cpL,{description:noJp(ACL.expected(cpL).description)}),cpL).siTentative,'S/I 어느 칸이든 (L/C 번호 칸) → 미확정');
  const cpD=mk(''); const sid=cpD.sis[0].cr49f_s_iid; (cpD.details[sid]||[])[0]&&((cpD.details[sid])[0].crcf9_productname=(cpD.details[sid])[0].crcf9_productname+' (仮)');
  ok(!(cpD.details[sid]||[]).length||ACL.compareOne(mkAcl(ACL,cpD,{description:noJp(ACL.expected(cpD).description)}),cpD).siTentative,'S/I 명세 (품명) 에 (仮) → 미확정');
  const h=ACL.viewHtml(T,{}), h2=ACL.viewHtml(T,{noTent:true}), h0=ACL.viewHtml(N,{});
  ok(h.indexOf(ACL.TENT_NOTE)>=0&&h.indexOf(ACL.TENT_NOTE)<h.indexOf('最終確認')&&ACL.TENT_NOTE==='S/I が未確定（仮）のため、照合結果は参考です','화면 맨 위 「S/I が未確定（仮）のため、照合結果は参考です」');
  ok(h2.indexOf(ACL.TENT_NOTE)<0&&h0.indexOf(ACL.TENT_NOTE)<0,'noTent (書類ツール) · （仮） 없음 → 그 줄 없음');
  ok(/（仮）の行 1/.test(h)&&/乙仲への指示 1/.test(h),'화면: 「（仮）の行 1」 · 「乙仲への指示 1」 따로 접음');
  ok(ACL.finalView(T).tentative===true&&ACL.finalView(N).tentative===false,'finalView.tentative');
}
console.log('⑥ 버전');
ok(/version:'0\.[89]'/.test(fs.readFileSync(HTML,'utf8')),"version:'0.8' 이상");
console.log('v08 pass '+pass+' fail '+fail); process.exit(fail?1:0);
