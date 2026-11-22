/* acl_bench v0.6 시험 (지시서 D00 ACL 최종분석 · 자체 확인 1 · 2 · 3 · 4 · 5) — 가짜 데이터만 · 네트워크 없음
   ① 내용 항목 나누기 (당사자 줄 · 번호 항목 따로 · HS 표기 3가지 · 날짜 표기 · 중복 = 1항목 · NO MARK = N/M)
   ② 최종 분석 (다 있음 ✓ · 하나 빠짐 ✗ 1 · 번호 한 자리 다름 = 없음 · 위치만 다름 = 있음 + 場所が違う · ACL 에만 있는 줄 △ · NACCS 코드 · 라벨 · 숫자 줄 제외)
   ③ Description = 내용 항목 비교 (순서 · 같은 줄 · HS 두 번 = 表記差 · L/C 번호 다름 · 항목 빠짐 = 相違 · 가짜 F3 실례 = 表記差)
   ④ 컨테이너 세트 = v0.5 와 같은 결과 (회귀)
   ⑤ 화면 (最終確認 맨 위 · 항목 목록 · 相違만 펼침 · 내부 이름 관리자만)
   node v06.js [html] [v0.5 html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures'),N=require('./fake_naccs'),R=require('./pdfread');
const load=t=>new Function('module',t.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const ACL=load(fs.readFileSync(process.argv[2]||path.join(__dirname,'../../acl_bench.html'),'utf8'));
const OLD=process.argv[3]&&fs.existsSync(process.argv[3])?load(fs.readFileSync(process.argv[3],'utf8')):null;
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const eq=(got,exp,m)=>ok(J(got)===J(exp),m,{got,exp});
const item=(r,k)=>r.items.find(i=>i.key===k);
const LI=t=>ACL.lineItems(t).map(i=>[i.type,i.kind,i.key]);
/* 완전한 ACL 칸 (COMPASS 와 같은 글) + 덮어쓰기 */
const KEYS=['shipper','consignee','notify','alsoNotify','booking','masterBl','vessel','voy','receipt','pol','pod','delivery','finalDest','hsMain','description','marks','totalContainers','numberOf','totalPkgs','totalWeight','totalMeasure','wayBill','received','originals','freight','agentSign','shipperMail'];
function mkAcl(cp, over){
  const ex=ACL.expected(cp), F={}; KEYS.forEach(k=>{ F[k]={text:'',conf:'SURE'}; });
  Object.assign(F,{shipper:{text:ex.shipper,conf:'SURE'},consignee:{text:ex.consignee,conf:'SURE'},notify:{text:ex.notify,conf:'SURE'},description:{text:ex.description,conf:'SURE'},marks:{text:ex.marks,conf:'SURE'},
    booking:{text:ex.booking,conf:'SURE'},vessel:{text:'SAMPLE STAR',conf:'SURE'},voy:{text:'101W',conf:'SURE'},receipt:{text:'TOKYO, JAPAN',conf:'SURE'},pol:{text:'TOKYO, JAPAN',conf:'SURE'},
    pod:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},delivery:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'}});
  Object.keys(over||{}).forEach(k=>{ F[k]={text:over[k],conf:'SURE'}; });
  const rows=cp.containers.filter(c=>c.crcf9_container_no).map(c=>({container:c.crcf9_container_no, seal:c.crcf9_seal_no, type:'GP', size:'45', bales:c.crcf9_quantity, cargo:c.crcf9_n_w, tare:c.crcf9_t_w, measure:40, conf:'SURE'}));
  return {fields:F, rows, totals:{containers:rows.length, bales:rows.reduce((s,r)=>s+r.bales,0), weight:rows.reduce((s,r)=>s+r.cargo,0)}};
}
/* 가짜 F3 실례 모양 (리나이 F3 · F4) — 품명 칸에 HS 가 붙어 있고 명세 HS 칸에도 HS → D-03 S/I 에는 HS 가 두 번 · ACL 은 한 번 (실제 값 아님) */
function fakeNa(){
  const cp=FX.compass(31), si=cp.sis[0], d=cp.details[si.cr49f_s_iid][0];
  d.crcf9_productname='SAMPLEPAPER FOR TEST MANUFACTURING (TST)HS CODE 4707 30 00 FOR TST'; d.crcf9_hs_code='HS CODE 4707 30 00 FOR TST';
  cp.details[cp.sis[1].cr49f_s_iid][0].crcf9_productname='OLD';
  si.cr49f_lc_no='TLC0031 DATED ON SEP 04, 2026'; si.crcf9_bl_text1='IMPORT LICENCE NO. 0000-TEST-31 DATED 2026/9/1'; si.crcf9_bl_text2='**SAMPLE CITY 12780, TEL: 62-21-0000-0031, TAX ID NUMBER: 00.000.000.0-031.000\n';   // 끝의 빈 줄 = 단락 끝 (FREIGHT 줄은 단락 밖 — v0.5 보고서)
  si.crcf9_consignee='TO ORDER OF SAMPLE BANK\nSAMPLE ROAD, **'; si.crcf9_pod_bl1='SAMPLE PRIOK PORT, SAMPLE, INDONESIA'; si.crcf9_place_of_delivery_1=si.crcf9_pod_bl1;
  return cp;
}

(async()=>{
console.log('① 내용 항목 나누기');
{ eq(LI('SAMPLE PAPER CO., LTD. TEL: 84-28-0000-0000 FAX: 84-28-0000-0001'),[['text','文','SAMPLEPAPERCOLTD'],['num','TEL','842800000000'],['num','FAX','842800000001']],'당사자 줄 — 이름 = 글 항목 · TEL · FAX = 번호 항목 (따로)');
  eq(LI('TAX ID NUMBER: 00.000.000.0-031.000 NPWP 12.345 EMAIL: DOCS@EXAMPLE.TEST').map(x=>x[1]),['TAX ID','TAX ID','EMAIL'],'TAX ID · NPWP · EMAIL = 번호 항목');
  const hs=['HS CODE 4707 30 00','HS CODE: 4707.30.00','H.S. CODE 47073000'].map(t=>ACL.lineItems(t)[0]);
  ok(hs.every(h=>h.type==='num'&&h.kind==='HS'&&h.key==='47073000'),'HS 표기 3가지 (4707 30 00 · 4707.30.00 · 47073000) = 같은 번호',hs);
  ok(ACL.hasNum('47073000','HS CODE 4707.30.00')&&ACL.hasNum('47073000','HS\nCODE 4707 30\n00')&&!ACL.hasNum('47073000','HS CODE 4707.30.01')&&!ACL.hasNum('47073000','HS CODE 4707.30.00.10'),'번호 찾기 — 구분 기호 · 띄어쓰기 · 줄바꿈 무시 / 한 자리 다름 · 뒤에 숫자가 더 붙음 = 없음');
  const ds=['DATED ON SEP 04, 2026','2026/9/4','04/09/2026','04-SEP-26','4TH SEPTEMBER 2026','2026-09-04'].map(t=>(ACL.findDates(t)[0]||{}).iso);
  eq(ds,Array(6).fill('2026-09-04'),'날짜 표기 6가지 = 같은 날짜 (표 1곳 · 04/09/2026 = 일/월/년)');
  eq(LI('L/C NO.: TLC0001 DATED ON SEP 04, 2026'),[['num','L/C','TLC0001'],['date','日付','2026-09-04']],'L/C 줄 = 번호 + 날짜 (「DATED ON」 은 날짜에 포함)');
  const cp=fakeNa(), ex=ACL.expected(cp), its=ACL.siItems({shipper:ex.shipper, consignee:ex.consignee, notify:ex.notify, marks:ex.marks, description:ex.description},{pol:ex.pol, pod:'P', delivery:'P'},ACL.descParts(ex.si,cp));
  const h=its.filter(i=>i.type==='num'&&i.kind==='HS');
  ok(h.length===1&&h[0].srcs.join()==='product,hs','같은 항목이 S/I 에 두 번 (품명 옆 HS + HS 칸) → 1 항목 · 출처 2곳 (D3)',h);
  ok(its.filter(i=>i.key==='FORTST').length===1,'「FOR TST」 (두 번) → 1 항목');
  const mk=it=>ACL.itemIn(it,'N/M');
  ok(mk({type:'text', src:'marks', key:ACL.tKey('NO MARK'), text:'NO MARK'})&&ACL.itemIn({type:'text', src:'marks', key:ACL.tKey('NO MARK'), text:'NO MARK'},'NO MARKS'),'Marks 「NO MARK」 = 「N/M」 = 「NO MARKS」');
  const lc=its.find(i=>i.kind==='L/C'), il=its.find(i=>i.kind==='IMPORT LICENCE'), fr=its.find(i=>i.src==='freight');
  ok(lc&&lc.src==='lc'&&il&&il.src==='bl1'&&fr&&fr.group==='固定','출처 기록 — L/C = cr49f_lc_no · IMPORT LICENCE = B/L 文言 1 · FREIGHT = 고정',[lc,il,fr]);
}
console.log('② 최종 분석');
{ const cp=FX.compass(3), ex=ACL.expected(cp);
  const r0=ACL.compareOne(mkAcl(cp),cp), f0=r0.final;
  ok(f0&&f0.total>10&&f0.found===f0.total&&!f0.missing.length&&!f0.aclOnly.length&&!f0.moved.length&&f0.sets.allOk,'다 있음 → ✓ (항목 '+(f0&&f0.total)+') · 세트 일치',f0);
  const r1=ACL.compareOne(mkAcl(cp,{notify:ex.notify.replace('HO CHI MINH CITY, VIETNAM','')}),cp);
  eq(r1.final.missing.map(m=>[m.text,m.srcLabel]),[['HO CHI MINH CITY, VIETNAM','通知先']],'하나 빠짐 → ✗ 1 (항목 · S/I 칸)');
  const r2=ACL.compareOne(mkAcl(cp,{notify:ex.notify.replace('84-28-0000-0001','84-28-0000-0007')}),cp), m2=r2.final.missing;
  ok(m2.length===1&&m2[0].kind==='FAX'&&/0001/.test(m2[0].text)&&/0007/.test(m2[0].similar||''),'번호 한 자리 다름 → 없음 (D5) · 비슷한 ACL 글 보여 줌',m2);
  ok(r2.final.aclOnly.some(a=>/0007/.test(a.text)),'틀린 번호 줄 → ACL にだけある 에도',r2.final.aclOnly);
  const tel='TEL: 84-28-0000-0000', r3=ACL.compareOne(mkAcl(cp,{notify:ex.notify.replace(tel,''), consignee:ex.consignee+'\n'+tel}),cp);
  ok(!r3.final.missing.length&&r3.final.moved.length===1&&r3.final.moved[0].kind==='TEL'&&r3.final.moved[0].fields[0]==='consignee'&&item(r3,'notify').status!=='MATCH','위치만 다름 (Notify 의 TEL 이 ACL Consignee 에) → 있음 + 場所が違う · 칸별 결과는 그대로 相違',[r3.final,item(r3,'notify').status]);
  const r4=ACL.compareOne(mkAcl(cp,{consignee:ex.consignee+'\nEXTRA LINE ADDED BY FORWARDER'}),cp);
  eq(r4.final.aclOnly.map(a=>[a.field,a.text]),[['consignee','EXTRA LINE ADDED BY FORWARDER']],'ACL 에만 있는 줄 → △ ACL にだけある');
  const r5=ACL.compareOne(mkAcl(cp,{consignee:ex.consignee+'\nVNSGN\nConsignee\n12345\n-', description:ex.description+'\nTHREE (3) CONTAINERS ONLY\n63 BALES\nTOTAL 60,600 KGS'}),cp);
  eq([r5.final.aclOnly,r5.final.missing.length],[[],0],'NACCS 코드 (VNSGN) · 라벨 · 숫자만 · 「-」 · 합계 줄 (CONTAINERS ONLY · BALES · KGS) 은 ACL にだけある 에서 제외');
  const r6=ACL.compareOne(mkAcl(cp,{notify:ex.notify.split('\n').join(' '), consignee:ex.consignee.toLowerCase().replace(/ /g,'  ')}),cp);
  ok(!r6.final.missing.length&&!r6.final.aclOnly.length,'줄바꿈 · 대소문자 · 띄어쓰기는 무시 (위치 무관)',r6.final);
  const r7=ACL.compareOne(mkAcl(cp,{pod:'CAT LAI PORT', delivery:'CAT LAI PORT'}),cp);
  ok(r7.final.missing.some(m=>m.group==='港'&&m.srcs.indexOf('pod')>=0),'항구 = 칸 하나 = 항목 하나 (일부만 있으면 없음)',r7.final.missing);
  ok(r0.final.missing.length===0&&J(Object.keys(r0.final))===J(['total','found','missing','aclOnly','moved','sets','unread','instr']),'결과 객체 final:{total, found, missing, aclOnly, moved, sets} (+ unread = 읽지 못한 칸의 항목 · v0.7 instr = 乙仲への指示)');
  const ua=mkAcl(cp); ua.fields.shipper={text:'',conf:'MISSING'}; const r8=ACL.compareOne(ua,cp);
  ok(!r8.final.missing.some(m=>m.srcs.indexOf('shipper')>=0)&&r8.final.unread.length>=3&&/ー ACL の欄を読めない/.test(ACL.finalView(r8).content.text),'칸 라벨을 못 읽음 (Shipper MISSING) → 그 칸 항목은 「足りない」 가 아니라 「読めない」 (추측 안 함)',r8.final);
  const sh=ACL.compareOne(mkAcl(FX.compass(8),{}),(c=>{ c.sis[0].crcf9_bl_text1='WP#47072000#XXKGS#XXBALES'; return c; })(FX.compass(8)));
  const hs=FX.compass(9); hs.sis[0].crcf9_notify_party='SAMPLE PAPER CO., LTD.#TEL: 84-28-0000-0009'; const rh=ACL.compareOne(mkAcl(hs,{notify:'SAMPLE PAPER CO., LTD.\nTEL: 84-28-0000-0009\nNO.1 SAMPLE ROAD, SAMPLE WARD,\nHO CHI MINH CITY, VIETNAM\nTEL: 84-28-0000-0000 FAX: 84-28-0000-0001'}),hs);
  ok(!rh.final.missing.length&&!sh.final.missing.length,'S/I 의 「#」 = 줄바꿈 표시 → 줄로 나눔 (「…#TEL: …」 · 「…KGS#…BALES」)',[rh.final.missing,sh.final.missing]);
}
console.log('③ Description = 내용 항목 비교');
{ const cp=FX.compass(4), ex=ACL.expected(cp), dl=ex.description.split('\n');
  const d0=item(ACL.compareOne(mkAcl(cp),cp),'description'); ok(d0.status==='MATCH','같은 글 → 一致 (v0.5 그대로)',d0);
  const rev=dl.filter(Boolean).reverse().join('\n'), d1=item(ACL.compareOne(mkAcl(cp,{description:rev}),cp),'description');
  eq([d1.status,d1.kind],['NOTATION','表記:並び・重複'],'같은 항목 · 다른 순서 → 表記差 (表記:並び・重複)');
  const one=dl.filter(Boolean).join(' '), d2=item(ACL.compareOne(mkAcl(cp,{description:one}),cp),'description');
  ok(d2.status==='NOTATION','모든 항목을 한 줄에 (같은 줄 vs 다음 줄) → 表記差 (줄바꿈만 다름 = v0.5 의 表記差 그대로)',[d2.status,d2.kind]);
  const sw=dl.filter(Boolean), d2b=item(ACL.compareOne(mkAcl(cp,{description:[sw[2]+' '+sw[1]].concat(sw.filter((_,i)=>i!==1&&i!==2)).join('\n')}),cp),'description');
  eq([d2b.status,d2b.kind],['NOTATION','表記:並び・重複'],'품명 옆에 HS (같은 줄 · 순서도 바뀜) vs 다음 줄 → 表記:並び・重複');
  const lcBad=ex.description.replace('TLC0004','TLC0005'), r3=ACL.compareOne(mkAcl(cp,{description:lcBad}),cp), d3=item(r3,'description');
  ok(d3.status==='DIFF'&&d3.kind==='相違:Description:L/C'&&d3.desc.missing[0].text.indexOf('TLC0004')>=0&&d3.desc.extra.some(x=>/TLC0005/.test(x)),'L/C 번호 다름 → 相違:Description:L/C (S/I 번호 없음 · ACL 의 다른 번호 = ACL にだけ)',d3);
  const drop=dl.filter(l=>!/^WASTE PAPER OCC/.test(l)).join('\n'), d4=item(ACL.compareOne(mkAcl(cp,{description:drop}),cp),'description');
  eq([d4.status,d4.kind],['DIFF','相違:Description:品名'],'항목 빠짐 (품명) → 相違:Description:品名');
  const add=ex.description+'\nSHIPPED ON BOARD EXTRA CLAUSE', d5=item(ACL.compareOne(mkAcl(cp,{description:add}),cp),'description');
  eq([d5.status,d5.kind,d5.desc.extra],['DIFF','相違:Description:ACLだけ',['SHIPPED ON BOARD EXTRA CLAUSE']],'ACL 에만 있는 항목 → 相違:Description:ACLだけ');
  const na=fakeNa(), nx=ACL.expected(na);
  ok((nx.description.match(/HS CODE 4707 30 00/g)||[]).length===2,'가짜 F3 실례: S/I (D-03 조립) 에는 HS CODE 가 두 번',nx.description);
  const aclDesc=['SAMPLEPAPER FOR TEST MANUFACTURING (TST)','HS CODE 4707 30 00 FOR TST','L/C NO.: TLC0031 DATED ON SEP 04, 2026','IMPORT LICENCE NO. 0000-TEST-31 DATED 2026/9/1','','**SAMPLE CITY 12780, TEL: 62-21-0000-0031, TAX ID NUMBER: 00.000.000.0-031.000','','FREIGHT PREPAID AS ARRANGED'].join('\n');
  const rn=ACL.compareOne(mkAcl(na,{description:aclDesc, consignee:'TO ORDER OF SAMPLE BANK\nSAMPLE ROAD, **', pod:'SAMPLE PRIOK PORT, SAMPLE, INDONESIA', delivery:'SAMPLE PRIOK PORT, SAMPLE, INDONESIA'}),na), dn=item(rn,'description');
  ok(dn.status==='NOTATION'&&dn.kind==='表記:並び・重複','가짜 F3 실례 → Description 表記差 (HS 두 번 · 품명 옆 HS — D3)',[dn.status,dn.kind,dn.detail]);
  ok(!rn.final.missing.length&&rn.final.sets.allOk&&item(rn,'consignee').status==='MATCH','가짜 F3 실례 → 最終確認 ✓ (넘침 이어 붙인 Consignee 포함)',[rn.final.missing,item(rn,'consignee').status]);
  if(OLD){ const o=item(OLD.compareOne(mkAcl(na,{description:aclDesc, consignee:'TO ORDER OF SAMPLE BANK\nSAMPLE ROAD, **', pod:'SAMPLE PRIOK PORT, SAMPLE, INDONESIA', delivery:'SAMPLE PRIOK PORT, SAMPLE, INDONESIA'}),na),'description');
    ok(o.status==='DROP','(대조) v0.5 엔진은 같은 가짜 F3 실례 에서 Description 脱落 — 리나이 F3 과 같은 모양',o.status); }
}
console.log('④ 컨테이너 세트 회귀 (v0.5 와 같은 결과)');
{ const cases=[]; for(let n=1;n<=6;n++){ const cp=FX.compass(n), spec=FX.perfectSpec(ACL,cp);
    if(n===2) spec.rows[1].seal='SL999999'; if(n===3){ spec.rows[0].bales=99; FX.retotal(spec); } if(n===4) spec.rows[2].tare=3800;
    if(n===5){ spec.rows.push({container:'XTRU0000001',seal:'SLX00001',bales:10,cargo:9000,tare:3700,measure:40}); FX.retotal(spec); } if(n===6) spec.rows[0].seal='SL 000601'.replace('SL ','SL 0').slice(0,9);
    cases.push({n, cp, pages:await R.readItems(await N.build(spec))}); }
  const res=cases.map(c=>({n:c.n, w:ACL.compareOne(ACL.readNaccs(c.pages),c.cp), o:OLD?OLD.compareOne(OLD.readNaccs(c.pages),c.cp):null}));
  if(OLD){ const strip=r=>r.items.filter(i=>i.group==='コンテナ'||i.group==='合計').map(i=>[i.key,i.status,i.kind,J(i.set||null)]);
    ok(res.every(x=>J(strip(x.w))===J(strip(x.o))&&J(x.w.sets)===J(x.o.sets)),'컨테이너 · 합계 항목 · compareSets = v0.5 (903d923) 와 같음 (6 경우)',res.filter(x=>J(strip(x.w))!==J(strip(x.o))).map(x=>x.n)); }
  else console.log('SKIP v0.5 비교 (v0.5 html 없음)');
  const f=n=>res.find(x=>x.n===n).w.final.sets;
  ok(f(1).allOk&&f(1).total===3,'완전 → コンテナ 3 セット一致 (PDF → 읽기 → 대조)');
  ok(!f(2).allOk&&f(2).diff.length===1&&f(2).diff[0].items[0].k==='シール','씰 다름 → ✗ 1 セット違う (어느 값)',f(2));
  ok(!f(3).allOk&&f(3).diff[0].items.some(c=>c.k==='Bales'),'Bales 다름 → ✗',f(3));
  ok(!f(5).allOk&&f(5).aclOnly.length===1,'ACL 에만 있는 컨테이너 → ✗',f(5));
  ok(!res.find(x=>x.n===1).w.final.missing.length,'가짜 PDF 완전한 경우 → 足りない内容 0');
}
console.log('⑤ 화면');
{ const cp=FX.compass(5), ex=ACL.expected(cp), V=ACL.viewHtml;
  const r=ACL.compareOne(mkAcl(cp),cp), h=V(r,{admin:false, hon:'本登録: まだ'});
  ok(h.indexOf('av-final')===12&&h.indexOf('最終確認')<h.indexOf('項目ごとの確認')&&/✓ S\/I の内容はすべて ACL にあります（\d+ 項目）/.test(h)&&/✓ コンテナ 3 セット一致/.test(h)&&/本登録: まだ/.test(h.slice(0,h.indexOf('項目ごとの確認'))),'最終確認 블록이 맨 위 · ✓ 내용 · ✓ 세트 · 本登録 줄 → 그 아래 項目ごとの確認',h.slice(0,600));
  const r2=ACL.compareOne(mkAcl(cp,{notify:ex.notify.replace('HO CHI MINH CITY, VIETNAM',''), consignee:ex.consignee+'\nEXTRA LINE'}),cp), h2=V(r2,{admin:false}), h3=V(r2,{admin:true});
  ok(/✗ 足りない内容 1 項目/.test(h2)&&/HO CHI MINH CITY, VIETNAM/.test(h2)&&/S\/I 通知先/.test(h2)&&/△ ACL にだけある内容 1/.test(h2),'✗ 足りない内容 1 項目 + 목록 (항목 · S/I 칸) · △ ACL にだけある (접어서)',h2.slice(0,900));
  ok(!/crcf9_/.test(h2)&&/crcf9_notify_party/.test(h3),'내부 이름 (crcf9_…) 은 관리자에게만 (title)');
  ok(/確認した項目/.test(h2)&&/相違 \d+ か所/.test(h2),'항목 목록 · 相違만 펼침 (v0.5 그대로)');
  const fv=ACL.finalView(r2); eq([fv.ok,fv.short],[false,'最終確認 ✗ 1'],'finalView 짧은 글 (현황판 툴팁용)');
  eq(ACL.finalView(r).short,'最終確認 ✓','finalView ✓');
  ok(ACL.finalView({verdict:'読取対象外', items:[]})===null&&V({verdict:'読取対象外', why:'スキャン', items:[]},{}).indexOf('av-final')<0,'최종 분석이 없는 결과 (読取対象外 · v0.5 결과) → 최종 블록 없음 (v0.5 화면)');
  const sm=ACL.summaryMd({run_id:'ACL_TEST', version:'0.6', results:[r,r2].map((x,i)=>Object.assign({invoice:'TEST'+i, format:'NACCS'},x))});
  ok(/## 最終確認/.test(sm)&&/すべてあり \+ セット一致 \| 1 \|/.test(sm)&&/足りない内容あり \| 1 \|/.test(sm),'summary.md 에 最終確認 분포',sm.slice(0,400));
}
console.log('v06 pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
