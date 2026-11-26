/* acl_bench v0.9 시험 (지시서 D00 acl_bench v0.9 · 書類ツール v0.8 정확도 · 자체 확인 1 ~ 5 + 형님 추가 결정 ① ②) — 가짜 데이터만 · 네트워크 없음 · 실제 거래처 · 메일함 이름 0
   1 메일 판단 (태그 없는 本登録 · 인용 안의 本登録 · B/L 단계 제목 · [ACL訂正依頼] 태그 · jsonl)   2 P1 표기 · P2 읽기   3 Shipper's Mail 빈칸 = 参考 · 다른 주소 = 相違 · 本船変更 = 相違 + 문구
   4 하지 않음 (연락처 빠짐 · HS 끝 0 · 한 글자)   5 L/C JSON 대조 ① ~ ⑤ · 없음 → 건너뜀   + ① ACL 이 더 적은 것 = 参考 · ② Description * 줄 이어 붙이기
   node v09.js [html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures');
const HTML=process.argv[2]||path.join(__dirname,'../../acl_bench.html');
const ACL=new Function('module',fs.readFileSync(HTML,'utf8').match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
const item=(r,k)=>r.items.find(i=>i.key===k);
const KEYS=['shipper','consignee','notify','alsoNotify','booking','masterBl','vessel','voy','receipt','pol','pod','delivery','finalDest','hsMain','description','marks','originals','wayBill','received','freight','agentSign','shipperMail'];
function mkAcl(cp, over, miss){
  const ex=ACL.expected(cp), F={}; KEYS.forEach(k=>{ F[k]={text:'',conf:'SURE'}; });
  Object.assign(F,{shipper:{text:ex.shipper,conf:'SURE'},consignee:{text:ex.consignee,conf:'SURE'},notify:{text:ex.notify,conf:'SURE'},description:{text:ex.description,conf:'SURE'},marks:{text:ex.marks,conf:'SURE'},
    booking:{text:ex.booking,conf:'SURE'},vessel:{text:'SAMPLE STAR',conf:'SURE'},voy:{text:'101W',conf:'SURE'},receipt:{text:ex.pol,conf:'SURE'},pol:{text:ex.pol,conf:'SURE'},
    pod:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},delivery:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},originals:{text:'3',conf:'SURE'}});
  Object.keys(over||{}).forEach(k=>{ F[k]={text:over[k],conf:'SURE'}; });
  (miss||[]).forEach(k=>{ F[k]={text:'',conf:'MISSING'}; });
  const rows=cp.containers.filter(c=>c.crcf9_container_no).map(c=>({container:c.crcf9_container_no, seal:c.crcf9_seal_no, type:'GP', size:'45', bales:c.crcf9_quantity, cargo:c.crcf9_n_w, tare:c.crcf9_t_w, measure:40, conf:'SURE'}));
  return {fields:F, rows, totals:{containers:rows.length, bales:rows.reduce((s,r)=>s+r.bales,0), weight:rows.reduce((s,r)=>s+r.cargo,0)}};
}
const run=(cp,over,opts,miss)=>ACL.compareOne(mkAcl(cp,over,miss),cp,opts||{});

console.log('1 메일 판단');
{ const K=ACL.mailKindOf;
  eq(K('Re: 【通関書類送付_TEST2699-01】','ACLを確認致しました。'+'\n'+'本登録お願いします。',''),'本登録','태그 없는 本登録 (제목 「Re: 원 제목」 그대로) → 本登録');
  eq(K('Re: TEST','ありがとうございます。'+'\n'+'差出人: 相手'+'\n'+'本登録をお願いします。',''),null,'인용 (差出人: 아래) 안의 本登録 → 안 셈 (ACL 과 관계없는 메일)');
  eq(K('[LG付き訂正依頼:TESTBL0001]','Notify →SAMPLE ご訂正をお願いします。 ACL',''),null,'B/L 단계 제목 (LG付き) → ACL 정정이 아님 (빼기)');
  eq(K('BILL OF LADING TEST','ACL 修正をお願いします',''),null,'B/L 단계 제목 (BILL OF LADING) → 빼기');
  eq(K('[ACL訂正依頼] Re: TEST','本日の件、よろしくお願いいたします。',''),'訂正依頼(件名のみ)','[ACL訂正依頼] 태그 = 정정 있음 (본문에 낱말 없어도)');
  eq(K('Re: TEST','ACL Notify Party欄 A →B ご訂正をお願いいたします。',''),'訂正依頼','ACL 스레드 + 정정 낱말 → 訂正依頼');
  eq(K('Re: TEST','よろしくお願いします',''),null,'ACL 낱말 · 本登録 · 정정 없음 → 셈하지 않음');
  eq(ACL.mailKind('いつもお世話になっております。'+'\n'+'-----Original Message-----'+'\n'+'本登録お願いします'),'その他','書類ツール 의 mailKind (본문만) 도 인용 안은 안 셈');
  const jl=[{key:'k1', recv_jst:'2026-11-01 10:00', skind:'staff', subj:'Re: 【通関書類送付_TEST2699-01】', body500:'D/Rを確認致しました。本登録お願いします。', ivs:['TEST2699-01']},
    {key:'k2', recv_jst:'2026-11-02 10:00', skind:'otsu', subj:'ACL', body500:'本登録お願いします', ivs:[]},
    {key:'k3', recv_jst:'2026-11-03 10:00', skind:'staff', subj:'[ACL訂正依頼] Re: TEST2699-02 BKG', body500:'ACL Consignee欄 A →B ご訂正を', ivs:[]}].map(x=>J(x)).join('\n');
  const M=ACL.mailsFromJsonl(jl); eq([M.mails.length,M.counts.本登録,M.counts.訂正依頼,M.mails[1].invoices],[2,1,1,['TEST2699-02']],'3개월 jsonl — 회사 사람이 보낸 것만 · 제목의 Invoice 번호');
  const C=ACL.mergeMails({mails:[{id:'k1',at:'2026-11-01T10:00:00+09:00',kind:'本登録',subject:'s',body:'短い',invoices:[],bkgs:[]}],period:{from:'2026-11-01',to:'2026-11-01'},rows:1},M);
  eq([C.mails.length,C.mails.find(m=>m.id==='k1').body.length>2],[2,true],'CSV ∪ jsonl — 같은 메일은 본문이 긴 쪽 (jsonl 500 자)'); }

console.log('2 P1 표기 · P2 읽기');
{ const T=(e,a)=>ACL.compareText(e,a);
  eq([T('11TH FLOOR, SAMPLE BLDG','11TH FL, SAMPLE BLDG').status,T('HANOI, VIET NAM','HANOI, VIETNAM').status,T('NO MARK','N/M').status],['NOTATION','NOTATION','NOTATION'],'P1 FLOOR=FL · VIET NAM=VIETNAM · NO MARK=N/M');
  eq([T('SAMPLE CO.,LTD.','SAMPLE CO., LTD').status,T('SAMPLE\nROAD 1','SAMPLE ROAD 1').status,T('TOKYO, JAPAN','TOKYO. JAPAN').status],['NOTATION','NOTATION','NOTATION'],'P1 구두점 · 줄바꿈 · 공백만 → 表記');
  eq([T('SAMPLE A/B','SAMPLE AB').status,T('A & B','A B').status,T('WASTE PAPER','WESTE PAPER').status,T('TEST (A)','TEST A').status],['DROP','DROP','DIFF','DROP'],'P1 이 아닌 것: / · & · 괄호 · 글자 (v0.7 형님) → 相違 그대로');
  eq(T('TO ORDER OF SAMPLE BANK\nFREIGHT PREPAID AS ARRANGED','TO ORDER OF SAMPLE BANK').kind,'表記:FREIGHT の行','P1 FREIGHT PREPAID AS ARRANGED 줄 위치 (칸 상관없이)');
  eq([ACL.comparePort('NAGOYA, JAPAN','NAGOYA - AICHI').status,ACL.comparePort('CAT LAI PORT, VIETNAM','CAT LAI').status,ACL.comparePort('PUSAN, KOREA','BUSAN PORT, SOUTH KOREA').status,ACL.comparePort('TOKYO, JAPAN','TOKYO 12').status,ACL.comparePort('SENDAI, JAPAN','TOKYO, JAPAN').status],
    ['NOTATION','NOTATION','NOTATION','NOTATION','DIFF'],'P1 · P2 항구: 「도시 - 현」 = 「도시, JAPAN」 · PORT · 나라 · PUSAN=BUSAN · 뒤 숫자 / 다른 항구는 相違');
  const cp=FX.compass(3), ex=ACL.expected(cp);
  const r1=run(cp,{booking:ex.booking+' -'}); eq(item(r1,'booking').status,'MATCH','P2 Booking No. 뒤 「-」 버림');
  const all=Object.fromEntries(KEYS.map(k=>[k,{text:'',conf:'MISSING'}])), cp2=FX.compass(4), rows=cp2.containers.filter(c=>c.crcf9_container_no).map(c=>({container:c.crcf9_container_no, seal:'SLZZZ', bales:1, cargo:1, tare:1, size:'45', type:'GP', conf:'SURE'}));
  const r2=ACL.compareOne({fields:all, rows, totals:{containers:9, bales:1, weight:1}},cp2);
  ok(r2.verdict==='読取確認要'&&!r2.items.some(i=>['DIFF','DROP','ADD'].indexOf(i.status)>=0)&&r2.kinds['読取確認要:ラベルなし']>0,'P2 라벨 0 인 ACL → 読取確認要 (컨테이너 · 합계만으로 相違 안 냄)',[r2.verdict,r2.kinds]);
  eq([ACL.cntrOk('XTRU0000008'),ACL.cntrOk('XTRU0000001'),ACL.cntrOk('TSTK1234567')],[true,false,false],'P2 컨테이너 체크 디지트 (ISO 6346)');
  const a3=mkAcl(cp); a3.rows.push({container:'TSTK1234567', seal:'', bales:null, cargo:null, tare:null, size:'', type:'', conf:'AMBIGUOUS'});
  const r3=ACL.compareOne(a3,cp); ok(!r3.items.some(i=>i.key==='aclOnly:TSTK1234567')&&item(r3,'notCntr')&&item(r3,'notCntr').status==='INFO','P2 체크 디지트 틀리고 COMPASS 에도 없는 번호 (부킹 번호 같은 것) → 컨테이너로 안 셈 (参考)',r3.items.filter(i=>i.group==='コンテナ').map(i=>[i.key,i.status]));
  const a4=mkAcl(cp); a4.totals.containers=a4.rows.length+1; const r4=ACL.compareOne(a4,cp);
  eq([item(r4,'acl:count').status,item(r4,'acl:count').kind],['READ_CHECK','読取確認要:コンテナ行数'],'P2 컨테이너 줄 수 ↔ 기재 본수 다름 → 読取確認'); }

console.log('3 Shipper\'s Mail · 本船変更');
{ const cp=FX.compass(3), rules=ACL.dispRules([{rule:'acl_shipper_mail',scope_type:'all',scope:'ALL',value:'DOCS@EXAMPLE.TEST'}]).rules;
  const r1=run(cp,{shipperMail:''},{rules}), r2=run(cp,{shipperMail:'OTHER@EXAMPLE.TEST'},{rules}), r3=run(cp,{shipperMail:'DOCS@EXAMPLE.TEST'},{rules});
  eq([item(r1,'disp:shipperMail').status,item(r2,'disp:shipperMail').status,item(r3,'disp:shipperMail').status],['INFO','DIFF','MATCH'],"Shipper's Mail 빈칸 → 参考 (D1) · 다른 주소 → 相違 · 같음 → 一致");
  const cp2=FX.compass(5); cp2.booking.modifiedon='2026-11-10T00:00:00Z';
  const r4=ACL.compareOne(mkAcl(cp2,{vessel:'OTHER STAR'}),cp2,{fileModified:'2026-11-01T00:00:00Z'}), v=item(r4,'vessel');
  ok(v.status==='DIFF'&&v.kind==='相違:本船変更'&&v.action==='本船変更依頼'&&/^本船変更依頼/.test(v.detail)&&r4.verdict==='相違あり','本船変更 → 판정은 相違 그대로 (D5) · 할 일 문구 「本船変更依頼」',v); }

console.log('4 하지 않음 (D2 · D5)');
{ const cp=FX.compass(3), ex=ACL.expected(cp);
  const n=ex.notify.split('\n').filter(l=>!/TEL|FAX/.test(l)).join('\n'), r=run(cp,{notify:n});
  ok(['DIFF','DROP'].indexOf(item(r,'notify').status)>=0&&r.final.missing.length>0,'S/I 의 TEL · FAX 가 ACL 어디에도 없음 → 相違 (연락처 참고 P6 하지 않음)',[item(r,'notify').status,r.final.missing.map(m=>m.text)]);
  eq(ACL.compareText('HS CODE: 4707.90.0000','HS CODE: 4707.90.00').status==='NOTATION',false,'HS 4707.90.0000 ↔ 4707.90.00 → 相違 (끝 0 자리 허용 안 함)');
  eq(ACL.compareText('SAMPLE PAPER MILL','SAMPLE PAPER MILK').status,'DIFF','한 글자 다름 → 相違');
  ok(!ACL.MAIL_RULE.siCheck&&!r.items.some(i=>/S\/I 確認/.test(i.kind||'')),'S/I 확인 따로 (P3) 없음'); }

console.log('형님 추가 ① ② (보충 ① 표)');
{ const cp=FX.compass(3), ex=ACL.expected(cp);
  /* Consignee 에 S/I Notify 의 연락처 (같은 회사) 를 더 적음 → 参考 */
  const tel=ex.notify.split('\n').find(l=>/TEL/.test(l)), r1=run(cp,{consignee:ex.consignee+'\n'+tel});
  ok(item(r1,'consignee').status==='NOTATION'&&/^表記:ACL に連絡先/.test(item(r1,'consignee').kind)&&r1.verdict!=='相違あり','① ACL 이 S/I 보다 더 적음 (Consignee 에 Notify 의 TEL · FAX) → 表記差 (v0.22 N28 · 이전 参考)',[item(r1,'consignee').status,item(r1,'consignee').kind,r1.verdict]);
  const cpF=FX.compass(3); cpF.sis[0].crcf9_consignee=cpF.sis[0].crcf9_consignee+'\nFREIGHT PREPAID AS ARRANGED'; const exF=ACL.expected(cpF);
  const rF=ACL.compareOne(mkAcl(cpF,{consignee:exF.consignee.replace('\nFREIGHT PREPAID AS ARRANGED','')+'\n'+tel}),cpF); ok(item(rF,'consignee').status==='NOTATION','① + FREIGHT 줄 위치도 다름 (그 줄을 빼고 보면 더 적은 것뿐) → 表記差 (v0.22 N28 · N29)',[item(rF,'consignee').status,item(rF,'consignee').detail]);
  const r2=run(cp,{consignee:ex.consignee+'\nTEL: 99-99-9999-9999'}); ok(item(r2,'consignee').status==='ADD','① S/I 어디에도 없는 글자를 더 적음 → 相違 그대로',item(r2,'consignee').status);
  const r3=run(cp,{consignee:'TO ORDER OF OTHER BANK\n'+ex.consignee.split('\n')[1]}); ok(['DIFF','DROP','ADD'].indexOf(item(r3,'consignee').status)>=0,'① S/I 내용이 틀림 → 相違',item(r3,'consignee').status);
  /* ② Notify 의 TEL · FAX 가 Description 의 * 넘침 줄에 */
  const lines=ex.notify.split('\n'), keep=lines.filter(l=>!/TEL|FAX/.test(l)).join('\n'), ov=lines.filter(l=>/TEL|FAX/.test(l)).map(l=>'*'+l).join('\n');
  const r4=run(cp,{notify:keep, description:ex.description+'\n'+ov}), it=item(r4,'notify');
  ok(it.status==='NOTATION'&&it.kind==='表記:続き (Description の * 行):Notify Party','② Notify TEL · FAX 가 Description 의 * 줄 → 이어 붙임 (表記)',[it.status,it.kind]);
  const r5=run(cp,{notify:keep}); ok(['DIFF','DROP'].indexOf(item(r5,'notify').status)>=0,'② * 줄에도 없음 → 相違 그대로',item(r5,'notify').status); }

console.log('5 L/C JSON 대조');
/* v0.10: 엔진은 L/C 를 보관소 (lc_read/1) 모양으로 읽음 — v0.9 의 가짜 D-01 모양을 같은 뜻의 lc_read/1 로 바꿔 넣고 기대값은 그대로 */
const toRead=o=>{ if(!o) return null; const docs=[].concat(o.docs46A||[]);
  return {schema:'lc_read/1', contract:'TEST-0000A1', version:1, lc_no:o.lcNo||'', issue_date:ACL.lcDateKey(o.lcDate||''),
    pol:{text:o.pol||'', any_japan:!!o.pol&&ACL.LC_RULE.ANY_POL.test(o.pol)}, pod:{text:o.pod||'', list:ACL.lcPodSplit(o.pod||'')},
    applicant:{name:o.applicant||'', address:''}, bl:{consignee_text:'', consignee_bank:null, notify_text:o.notifyParty46A||'', notify_is_applicant:ACL.LC_RULE.APPLICANT.test(o.notifyParty46A||''), originals:ACL.lcOriginalsText(docs.join(' ')), freight:null},
    fields:{}, checks:[]}; };
{ const mk=()=>{ const cp=FX.compass(6); cp.sis[0].cr49f_lc_no='TLC0006'; cp.sis[0].crcf9_bl_text2=''; return cp; };
  const LC=o=>Object.assign({lcNo:'TLC0006 DATED ON 01/10/2026', lcDate:'01/10/2026', pod:'CAT LAI PORT OR SAMPLE PORT', pol:'ANY JAPANESE PORT', docs46A:['FULL SET OF CLEAN ON BOARD BILLS OF LADING'], notifyParty46A:'SAMPLE PAPER CO., LTD.', applicant:'SAMPLE PAPER CO., LTD.', analyzedAt:'2026-10-02T00:00:00Z'},o||{});
  const R=(lc,over)=>{ const cp=mk(); cp.lc=toRead(lc); const a=mkAcl(cp,over); return ACL.compareOne(a,cp,{meta:{pay:'LC'}}); };
  const ex0=ACL.expected(mk()); const podTxt=ex0.description&&'CAT LAI PORT IN VIETNAM';
  const r=R(LC()); const st=k=>(item(r,'lc:'+k)||{}).status;
  eq([st('no'),st('pol'),st('originals'),st('notify')],['MATCH','INFO','MATCH','MATCH'],'L/C ① 번호 (「DATED ON」 섞인 lcNo 정리) · ③ ANY JAPANESE PORT → 건너뜀 · ④ FULL SET → 3 · ⑤ Notify');
  ok(['MATCH','DIFF'].indexOf(st('pod'))>=0,'② 揚地 항목이 있음 (A OR B 나눔)',st('pod'));
  const p2=R(LC({pod:'OTHER HARBOUR'})); eq((item(p2,'lc:pod')||{}).status,'DIFF','② L/C 揚地 와 S/I 가 다름 → 相違');
  const n2=R(LC({lcNo:'TLC9999'})); ok(item(n2,'lc:no').status==='DIFF'&&n2.verdict==='相違あり','① L/C 번호 다름 → 相違 (판정 相違あり — D5)');
  const t1=R(LC({docs46A:['B/L TELEX RELEASED OR SURRENDERED']})); eq([item(t1,'lc:originals').status,item(t1,'lc:originals').expected],['DIFF','1'],'④ TELEX / SURRENDER → 1 · ACL 3 → 相違 (D4)');
  const t2=R(LC({docs46A:['B/L TELEX RELEASED']}),{originals:'1'}); eq(item(t2,'lc:originals').status,'MATCH','④ TELEX → 1 · ACL 1 → 一致');
  const np=R(LC({notifyParty46A:'NOTIFY APPLICANT', applicant:'OTHER BUYER CO'})); eq(item(np,'lc:notify').status,'DIFF','⑤ NOTIFY APPLICANT → applicant 이름으로 대조 (다르면 相違)');
  const pl=R(LC({pol:'TOKYO PORT, JAPAN'})), pl2=R(LC({pol:'OSAKA PORT'})); eq([item(pl,'lc:pol').status,item(pl2,'lc:pol').status],['MATCH','DIFF'],'③ 특정 항구만 대조');
  const none=R(null); ok(item(none,'lc:none')&&item(none,'lc:none').status==='INFO'&&/未登録/.test(item(none,'lc:none').detail),'L/C 판독 없음 → 「保管所に未登録」 표시 (参考 · v0.10)');
  const tt=(()=>{ const cp=mk(); cp.lc=toRead(LC({lcNo:'X'})); return ACL.compareOne(mkAcl(cp),cp,{meta:{pay:'TT'}}); })(); ok(!tt.items.some(i=>i.group==='L/C'),'T/T 계약 → L/C 대조 안 함');
  eq([ACL.lcOriginalsText('FULL SET'),ACL.lcOriginalsText('TELEX RELEASE'),ACL.lcOriginalsText('COPY')],[3,1,null],'원본 통수 함수 (B/L 발행 의뢰에도 같은 함수)'); }

console.log('5+ 실자료에서 고친 L/C · 넘침 모양 (가짜 값)');
{ const mk=()=>{ const cp=FX.compass(6); cp.sis[0].cr49f_lc_no='TLC0006'; cp.sis[0].crcf9_bl_text2=''; return cp; };
  const R=(lc,over)=>{ const cp=mk(); cp.lc=toRead(Object.assign({lcNo:'TLC0006', lcDate:'01/10/2026', pod:'CAT LAI', pol:'ANY JAPANESE PORT', docs46A:['FULL SET'], notifyParty46A:'SAMPLE PAPER CO., LTD.', applicant:'SAMPLE PAPER CO., LTD.'},lc)); return ACL.compareOne(mkAcl(cp,over),cp,{meta:{pay:'LC'}}); };
  eq(item(R({pol:'ALL PORT OF JAPAN'}),'lc:pol').status,'INFO','「ALL PORT OF JAPAN」 = 일본 아무 항구 → 건너뜀');
  eq(item(R({lcNo:'DATED ON OCT 01, 2026 TLC0006'}),'lc:no').status,'MATCH','lcNo 앞에 「DATED ON …」 → 번호만');
  eq(item(R({notifyParty46A:'NOTIFYING SAMPLE PAPER CO., LTD.'}),'lc:notify').status,'MATCH','「NOTIFYING」 머리 → 떼고 회사 이름');
  eq(item(R({notifyParty46A:'0000000000 HEX 000/GPMT-BTNMT HEX BANK DEPOSIT NO HEX SAMPLE PAPER CO., LTD. HEX TEL 00'}),'lc:notify').status,'MATCH','베트남 형식 (번호 # 허가 # DEPOSIT # 회사) · # 대신 HEX → 회사 조각');
  eq(item(R({notifyParty46A:'MARKED FREIGHT PREPAID AND NOTIFY APPLICANT', applicant:'OTHER TRADING CO'}),'lc:notify').status,'DIFF','문장 안의 NOTIFY APPLICANT → applicant 로 대조');
  const cpc=mk(); cpc.sis[0].crcf9_place_of_delivery_1='SAMPLE INLAND, VIETNAM'; cpc.lc=toRead({lcNo:'TLC0006', pod:'CAT LAI', pol:'ANY JAPANESE PORT', docs46A:['FULL SET'], notifyParty46A:'SAMPLE PAPER CO., LTD.'});
  const rc=ACL.compareOne(mkAcl(cpc,{delivery:'SAMPLE INLAND, VIETNAM'}),cpc,{meta:{pay:'LC'}}); ok(!item(rc,'lc:delivery')||item(rc,'lc:delivery').status!=='DIFF','揚地 가 맞고 引渡地 만 다름 (내륙) → 参考 (L/C 는 揚地 만)',item(rc,'lc:delivery'));
  const cp=FX.compass(3), ex=ACL.expected(cp), keep=ex.notify.split('\n').filter(l=>!/TEL|FAX/.test(l)).join('\n'), tl=ex.notify.split('\n').filter(l=>/TEL|FAX/.test(l));
  const r=run(cp,{notify:keep, description:ex.description+'\n**SAMPLE CITY,\n'+tl.join('\n')+'\n*VIETNAM'}); eq(item(r,'notify').kind,'表記:続き (Description の * 行):Notify Party','넘침 단락 = 「*」 줄부터 여러 줄 (실자료 NA2609-05 모양)'); }
console.log('버전');
{ const v=(fs.readFileSync(HTML,'utf8').match(/version:'(\d+)\.(\d+)'/)||[]).slice(1).map(Number); ok(v.length&&(v[0]>0||v[1]>=9),"version:'0.9' 이상"); }   // v0.11: 0.10 · 0.11 … (숫자로 비교)
console.log('v09 pass '+pass+' fail '+fail); process.exit(fail?1:0);
