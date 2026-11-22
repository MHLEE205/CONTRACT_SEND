/* acl_bench v0.7 시험 (지시서 D00 書類ツール v0.5 · 자체 확인 2 · 3 · 4) — 가짜 데이터만 · 네트워크 없음
   ① B1 하이픈만 다름 = 表記差 (우편번호 · 글 항목 · 칸별 비교) / 번호 항목은 그대로 (하이픈은 v0.6 부터 구분 기호로 무시 — 확인만) / 괄호 · / · & 는 그대로
   ② B2 S/I 의 일본어 줄 = 乙仲への指示 (足りない 0 · 칸별 비교 제외 · # 로 나뉜 줄도)
   ③ B3 컨테이너별 기재 지시 — 있음 (값 일치) ✓ / 합계만 ✗ 相違 / 값 다름 ✗ / 일부만 ✗ / 지시 없음 → 확인 안 함 / 컨테이너 못 읽음 → ー
   node v07.js [html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures');
const ACL=new Function('module',fs.readFileSync(process.argv[2]||path.join(__dirname,'../../acl_bench.html'),'utf8').match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const item=(r,k)=>r.items.find(i=>i.key===k);
const KEYS=['shipper','consignee','notify','alsoNotify','booking','masterBl','vessel','voy','receipt','pol','pod','delivery','finalDest','hsMain','description','marks'];
function mkAcl(cp, over, ex0){
  const ex=ex0||ACL.expected(cp), F={}; KEYS.forEach(k=>{ F[k]={text:'',conf:'SURE'}; });
  Object.assign(F,{shipper:{text:ex.shipper,conf:'SURE'},consignee:{text:ex.consignee,conf:'SURE'},notify:{text:ex.notify,conf:'SURE'},description:{text:ex.description,conf:'SURE'},marks:{text:ex.marks,conf:'SURE'},
    booking:{text:ex.booking,conf:'SURE'},vessel:{text:'SAMPLE STAR',conf:'SURE'},voy:{text:'101W',conf:'SURE'},receipt:{text:'TOKYO, JAPAN',conf:'SURE'},pol:{text:'TOKYO, JAPAN',conf:'SURE'},
    pod:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},delivery:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'}});
  Object.keys(over||{}).forEach(k=>{ F[k]={text:over[k],conf:'SURE'}; });
  const rows=cp.containers.filter(c=>c.crcf9_container_no).map(c=>({container:c.crcf9_container_no, seal:c.crcf9_seal_no, type:'GP', size:'45', bales:c.crcf9_quantity, cargo:c.crcf9_n_w, tare:c.crcf9_t_w, measure:40, conf:'SURE'}));
  return {fields:F, rows, totals:{containers:rows.length, bales:rows.reduce((s,r)=>s+r.bales,0), weight:rows.reduce((s,r)=>s+r.cargo,0)}};
}
console.log('① B1 하이픈');
{ const cp=FX.compass(3), si=cp.sis[0]; si.crcf9_shipper_address='1-2-3 SAMPLE-CHO, TOKYO, JAPAN, 100-0001';
  const ex=ACL.expected(cp);
  const r=ACL.compareOne(mkAcl(cp,{shipper:ex.shipper.replace('100-0001','1000001')}),cp), it=item(r,'shipper');
  ok(it.status==='NOTATION'&&it.kind==='表記:ハイフン:Shipper'&&!r.final.missing.length&&!r.final.aclOnly.length,'우편번호 100-0001 ↔ 1000001 → 칸별 表記:ハイフン · 最終確認 足りない 0',[it.status,it.kind,r.final.missing,r.final.aclOnly]);
  const r2=ACL.compareOne(mkAcl(cp,{shipper:ex.shipper.replace('SAMPLE-CHO','SAMPLE CHO')}),cp);
  ok(item(r2,'shipper').status==='NOTATION'&&!r2.final.missing.length,'「SAMPLE-CHO」 ↔ 「SAMPLE CHO」 (하이픈 ↔ 띄어쓰기) → 表記差',[item(r2,'shipper'),r2.final.missing]);
  ok(ACL.tKey('100-0001')===ACL.tKey('1000001')&&ACL.tKey('A-B')===ACL.tKey('AB'),'글 항목 키에서 - 를 보지 않음');
  ok(ACL.hasNum(ACL.anKey('84-28-0000-0000'),'TEL 842800000000')&&ACL.anKey('03-3528-0000')===ACL.anKey('0335280000'),'번호 항목 (TEL 등) 의 하이픈은 v0.6 부터 구분 기호로 무시 — 그대로 (확인만)');
  const r3=ACL.compareOne(mkAcl(cp,{notify:ex.notify.replace('84-28-0000-0001','84-28-0000-0007')}),cp);
  ok(r3.final.missing.some(m=>m.kind==='FAX')&&item(r3,'notify').status==='DIFF','번호가 다르면 (하이픈 아님) 그대로 없음 · 相違',[r3.final.missing,item(r3,'notify').status]);
  const r4=ACL.compareOne(mkAcl(cp,{shipper:ex.shipper.replace('SAMPLE-CHO','SAMPLE/CHO')}),cp), r5=ACL.compareOne(mkAcl(cp,{shipper:ex.shipper.replace('SAMPLE-CHO','SAMPLE&CHO')}),cp);
  ok(item(r4,'shipper').status!=='NOTATION'&&item(r5,'shipper').status!=='NOTATION','하이픈 → / · & 로 바뀜 = 그대로 相違 (괄호 · / · & 는 형님 말씀 없음)',[item(r4,'shipper').status,item(r5,'shipper').status]);
  ok(ACL.compareText('ABC-123','ABC 124').status!=='NOTATION','하이픈 말고 글자도 다르면 表記差 아님');
}
console.log('② B2 乙仲への指示');
{ const cp=FX.compass(3), si=cp.sis[0]; si.crcf9_bl_text1='WP#47072000#XXKGS #XXBALES#テスト用の指示です'; si.crcf9_bl_text2='SAMPLE TEXT LINE\n担当者メモ 確認すること';
  const ex=ACL.expected(cp), clean=ex.description.split('\n').map(l=>l.split('#').filter(s=>!/[ぁ-んァ-ン一-龥]/.test(s)).join('#')).filter(l=>!/[ぁ-んァ-ン一-龥]/.test(l)).join('\n');
  const r=ACL.compareOne(mkAcl(cp,{description:clean}),cp), f=r.final;
  ok(f.instr&&f.instr.list.length===2&&f.instr.list.every(x=>/[ぁ-んァ-ン一-龥]/.test(x.text)),'일본어 줄 2개 (# 로 나뉜 것 · 줄 하나) → 乙仲への指示 2',f.instr);
  ok(!f.missing.length,'足りない 0 (일본어 줄은 S/I 항목에서 뺌)',f.missing);
  ok(item(r,'description').status==='MATCH'||item(r,'description').status==='NOTATION','칸별 비교에서도 S/I 쪽 일본어 줄을 뺌 → Description 一致',item(r,'description'));
  ok(f.instr.list.find(x=>/テスト/.test(x.text)).srcLabel==='B/L 文言 1'&&f.instr.list.find(x=>/担当者/.test(x.text)).srcLabel==='B/L 文言 2','지시의 S/I 칸 (B/L 文言 1 · 2)',f.instr.list);
  ok(!item(r,'instr:cntr')&&f.instr.cntr===null,'컨테이너별 지시가 아니면 B3 확인 안 함');
  const h=ACL.viewHtml(r,{});
  ok(/<details class="av-more"><summary>乙仲への指示 2/.test(h)&&h.indexOf('最終確認')<h.indexOf('乙仲への指示'),'화면: 最終確認 아래에 접어서 「乙仲への指示 2」');
  const r0=ACL.compareOne(mkAcl(FX.compass(3)),FX.compass(3));
  ok(r0.final.instr&&!r0.final.instr.list.length&&!/乙仲への指示/.test(ACL.viewHtml(r0,{})),'일본어 줄이 없으면 목록 0 · 화면에 안 나옴');
}
console.log('③ B3 コンテナ別記載の指示');
{ const base=()=>{ const cp=FX.compass(3); cp.sis[0].crcf9_bl_text1='WP#47072000#XXKGS #XXBALES#各コンテナの重量/BALE数追記'; return cp; };
  const cp0=base(), ex=ACL.expected(cp0), cl=cp0.containers.filter(c=>c.crcf9_container_no);
  const desc0=ex.description.split('\n').map(l=>l.split('#').filter(s=>!/[ぁ-んァ-ン一-龥]/.test(s)).join('#')).filter(l=>!/[ぁ-んァ-ン一-龥]/.test(l)).join('\n');
  const run=lines=>{ const cp=base(); return ACL.compareOne(mkAcl(cp,{description:desc0+'\n'+lines.join('\n')}),cp); };
  const A=run(cl.map(c=>c.crcf9_container_no+' : '+c.crcf9_n_w+'KGS, '+c.crcf9_quantity+'BALES'));
  ok(item(A,'instr:cntr').status==='MATCH'&&A.final.instr.cntr.ok===true&&A.final.instr.list[0].cntr,'지시 + 컨테이너별 기재 (세트 값 일치) → ✓',[item(A,'instr:cntr'),A.final.instr]);
  const fv=ACL.finalView(A); ok(fv.cntr.ok&&fv.cntr.text==='✓ 指示どおり（コンテナ別の重量・BALE 数あり）'&&/✓ 指示どおり/.test(ACL.viewHtml(A,{})),'✓ 문구 · 화면',fv.cntr);
  const B=run(cl.map(c=>c.crcf9_container_no+' '+c.crcf9_quantity+'BALE '+c.crcf9_n_w.toLocaleString('en-US')+'KGS'));
  ok(item(B,'instr:cntr').status==='MATCH','다른 모양 (번호 BALE 앞 · 1,000 쉼표) 도 ✓',item(B,'instr:cntr'));
  const C=run(['TOTAL '+cl.reduce((s,c)=>s+c.crcf9_n_w,0)+'KGS '+cl.reduce((s,c)=>s+c.crcf9_quantity,0)+'BALES']);
  const ic=item(C,'instr:cntr'), fc=ACL.finalView(C);
  ok(ic.status==='DIFF'&&ic.kind==='相違:コンテナ別記載の指示'&&C.verdict==='相違あり'&&fc.cntr.text==='✗ 指示どおりではない（コンテナ別の重量・BALE 数がない）'&&/✗/.test(fc.short),'합계만 → ✗ 指示どおりではない · 相違 · 最終確認 ✗',[ic,fc]);
  const D=run(cl.map((c,i)=>c.crcf9_container_no+' : '+(i===1?c.crcf9_n_w+10:c.crcf9_n_w)+'KGS, '+c.crcf9_quantity+'BALES'));
  ok(item(D,'instr:cntr').status==='DIFF'&&D.final.instr.cntr.rows.filter(r=>!r.ok).length===1&&/重量/.test(D.final.instr.cntr.rows[1].why),'값 다름 (중량 1개) → ✗ · 어느 컨테이너 무엇',D.final.instr.cntr);
  const E2=run(cl.map((c,i)=>c.crcf9_container_no+' : '+c.crcf9_n_w+'KGS, '+c.crcf9_quantity+(i===2?'BASES':'BALES')));
  ok(item(E2,'instr:cntr').status==='DIFF'&&/BALES がない/.test(E2.final.instr.cntr.rows[2].why),'BALES 글자 틀림 (BASES) → ✗',E2.final.instr.cntr);
  const F2=run(cl.slice(0,2).map(c=>c.crcf9_container_no+' : '+c.crcf9_n_w+'KGS, '+c.crcf9_quantity+'BALES'));
  ok(item(F2,'instr:cntr').status==='DIFF'&&F2.final.instr.cntr.found===2&&F2.final.instr.cntr.n===3,'일부 컨테이너만 → ✗ (2 / 3)',F2.final.instr.cntr);
  const G=run([cl[0].crcf9_container_no+' : '+(cl[0].crcf9_n_w/1000)+'MT, '+cl[0].crcf9_quantity+'BALES'].concat(cl.slice(1).map(c=>c.crcf9_container_no+' : '+c.crcf9_n_w+'KGS, '+c.crcf9_quantity+'BALES')));
  ok(item(G,'instr:cntr').status==='MATCH','중량을 MT 로 적어도 같은 값이면 ✓',G.final.instr.cntr);
  const cpN=base(), aN=mkAcl(cpN,{description:desc0}); aN.rows=[]; aN.totals={containers:null,bales:null,weight:null}; const N=ACL.compareOne(aN,cpN);
  ok(item(N,'instr:cntr').status==='READ_CHECK'&&ACL.finalView(N).cntr.read,'컨테이너 표를 못 읽음 → ー (相違로 세지 않음)',[item(N,'instr:cntr'),ACL.finalView(N).cntr]);
  ok(ACL.isCntrInstr('各コンテナの重量/BALE数追記')&&ACL.isCntrInstr('コンテナ別にベール数を記載')&&ACL.isCntrInstr('コンテナ毎の重量')&&!ACL.isCntrInstr('重量を記載')&&!ACL.isCntrInstr('各コンテナ番号'),'지시 말 표 (コンテナ語 + 重量/BALE語) 한 곳');
  const cpX=FX.compass(3), X=ACL.compareOne(mkAcl(cpX,{description:ACL.expected(cpX).description+'\nTOTAL ONLY'}),cpX);
  ok(!item(X,'instr:cntr'),'지시 없음 → 확인 안 함');
}
console.log('④ 버전');
ok(/version:'0\.7'/.test(fs.readFileSync(process.argv[2]||path.join(__dirname,'../../acl_bench.html'),'utf8')),"version:'0.7'");
console.log('v07 pass '+pass+' fail '+fail); process.exit(fail?1:0);
