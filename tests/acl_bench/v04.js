/* v0.4 시험 (지시서 v0.4 자체 확인 1~9) — 가짜 데이터만 (레포 공개).
   node v04.js <acl_bench.html> [v0.3.1 html (e0c2199) — 있으면 부킹 옆 칸 회귀 확인] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures'),N=require('./fake_naccs'),R=require('./pdfread');
const load=f=>new Function('module',fs.readFileSync(f,'utf8').match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const ACL=load(process.argv[2]||path.join(__dirname,'../../acl_bench.html')), OLD=process.argv[3]?load(process.argv[3]):null;
let pass=0,fail=0; const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':JSON.stringify(info).slice(0,700));} };
const eq=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m,{got:a,exp:b});
const fld=t=>({text:t, conf:'SURE'});
const KEYS=['shipper','consignee','notify','alsoNotify','booking','masterBl','vessel','voy','receipt','pol','pod','delivery','description','marks','wayBill','received','originals','freight','agentSign','shipperMail'];
/* 가짜 ACL (읽은 결과 모양) — 지정 안 한 칸은 ラベルなし */
const mkAcl=(f,rows)=>{ const F={}; KEYS.forEach(k=>{ F[k]=f[k]!=null?fld(f[k]):{text:'',conf:'MISSING'}; }); return {fields:F, rows:rows||[], totals:{containers:null,bales:null,weight:null}}; };
const item=(c,k)=>c.items.find(i=>i.key===k);
const FV='@OData.Community.Display.V1.FormattedValue';

(async()=>{
console.log('1 범위 all · forwarder');
{ const items=[{scope_type:'all',scope:'ALL',rule:'acl_freight_arranged',value:'1'},{scope_type:'forwarder',scope:'2',rule:'acl_shipper_mail',value:'DOCS@EXAMPLE.TEST'},
    {scope_type:'all',scope:'ALL',rule:'acl_shipper_mail',value:'DOCS@EXAMPLE.TEST'},{scope_type:'contract',scope:'SC-9',rule:'acl_freight_arranged',value:''},{scope_type:'all',scope:'',rule:'acl_received_bl',value:''}];
  const d=ACL.dispRules(items);
  eq([d.rules.length,d.warnings.length],[5,0],'① all · forwarder 범위를 읽음 (all 은 범위 값이 비어도 됨) · 경고 0');
  eq(ACL.SCOPE_ORDER,['contract','buyer_bank','buyer','forwarder','country','all'],'① 순서 contract → buyer_bank → buyer → forwarder → country → all');
  const P=(rule,m)=>ACL.pickDispRule(d.rules,rule,m)||{};
  eq([P('acl_freight_arranged',{}).scope_type,P('acl_freight_arranged',{country:'VIETNAM',buyer:'X'}).scope_type,P('acl_received_bl',{}).scope_type],['all','all','all'],'① all = 늘 맞음 (범위 값은 보지 않음)');
  eq([P('acl_freight_arranged',{contract:'SC-9'}).scope_type,P('acl_freight_arranged',{contract:'SC-9'}).value],['contract',''],'① contract 가 all 보다 먼저');
  eq([P('acl_shipper_mail',{forwarder:'2'}).scope_type,P('acl_shipper_mail',{forwarder:'37'}).scope_type,P('acl_shipper_mail',{}).scope_type],['forwarder','all','all'],'① forwarder = 乙仲 번호가 같을 때만 · 아니면 all');
  const F={shipperMail:fld('DOCS@EXAMPLE.TEST')}, it=m=>ACL.dispItems(F,d.rules,m).find(i=>i.key==='disp:shipperMail');
  eq([it({forwarder:'2'}).status,/forwarder 2/.test(it({forwarder:'2'}).detail),it({forwarder:'37'}).status,/all ALL/.test(it({forwarder:'37'}).detail)],['MATCH',true,'MATCH',true],'① 겹친 규칙 (forwarder 2 와 all 이 같은 값) → 어느 쪽이든 一致 · 근거는 좁은 범위 (forwarder)');
  const pe=ACL.podExcludeRules([{scope_type:'country',scope:'VIETNAM',rule:'pod_exclude',value:'SP-TEST, SAMPLE-X'},{scope_type:'all',scope:'ALL',rule:'acl_freight_arranged',value:'1'}]);
  eq(pe.map(r=>[r.scope,r.ports]),[['VIETNAM',['SP-TEST','SAMPLE-X']]],'① (Step 3 용) pod_exclude 만 · 항구 나누기');
}
console.log('2 Agent Signature = S/I 現地Agent記載');
{ const si=(v,fv)=>Object.assign({crcf9_sino:1, crcf9_local_agent_note:v},fv?{['crcf9_local_agent_note'+FV]:fv}:{});
  const A=(acl,s,rules)=>ACL.dispItems({agentSign:fld(acl)},rules||[],{},{si:s}).find(i=>i.key==='disp:agentSign');
  const a1=A('1',si(true,'Yes')), a2=A('',si(true,'Yes')), a3=A('1',si(false,'No')), a4=A('',si(false,'No')), a5=A('1',si(null));
  eq([a1.status,a1.expected],['MATCH','1'],'② Yes → 1 一致');
  eq([a2.status,a2.kind],['DIFF','表示欄相違:Agent Signature Request Identifier'],'② Yes → 빈칸 = 相違');
  eq([a3.status,a3.expected,a4.status],['DIFF','(空欄)','MATCH'],'② No → 1 = 相違 · No → 빈칸 = 一致');
  eq([a5.status,a5.expected,a5.kind],['INFO','(S/I 未入力)',''],'② S/I 未入力 → 参考 「S/I 未入力」');
  const r=ACL.dispRules([{scope_type:'buyer',scope:'BUYER-A',rule:'acl_agent_sign',value:''}]).rules, a6=ACL.dispItems({agentSign:fld('')},r,{buyer:'BUYER-A'},{si:si(true,'Yes')}).find(i=>i.key==='disp:agentSign');
  eq([a6.status,/規則 buyer BUYER-A/.test(a6.detail)],['MATCH',true],'② 마스터 acl_agent_sign 규칙이 있으면 마스터 먼저 (예외용 — S/I Yes 라도 규칙의 빈칸)');
}
console.log('3 Way Bill · 원본 조합');
{ const C=(wb,og)=>{ const its=ACL.dispItems({wayBill:fld(wb),originals:fld(og)},[],{}); return [its.find(i=>i.key==='disp:wayBill'),its.find(i=>i.key==='disp:originals')]; };
  const t=[['1','1','SWB 型'],['','3','OBL 型'],['','1','Surrender 型']].map(([w,o,n])=>{ const [a,b]=C(w,o); return a.status==='INFO'&&b.status==='INFO'&&a.detail.indexOf(n)>=0&&b.detail.indexOf(n)>=0; });
  eq(t,[true,true,true],'③ 1·1 = SWB 型 · 빈칸·3 = OBL 型 · 빈칸·1 = Surrender 型 → 参考 (B/L 종류 기대값은 보류 — D2)');
  const [x,y]=C('1','3'), [p,q]=C('1','');
  eq([x.status,x.kind,y.status,p.status,p.kind],['READ_CHECK','表示欄の組合せ','READ_CHECK','READ_CHECK','表示欄の組合せ'],'③ 그 밖의 조합 (1·3 · 1·빈칸) → 読取確認要 kind 表示欄の組合せ (한 번만 셈)');
  const r=ACL.dispRules([{scope_type:'all',scope:'ALL',rule:'acl_way_bill',value:'1'}]).rules, w=ACL.dispItems({wayBill:fld(''),originals:fld('3')},r,{}).find(i=>i.key==='disp:wayBill');
  eq([w.status,w.kind],['DIFF','表示欄相違:Way Bill'],'③ 마스터에 acl_way_bill 규칙이 생기면 그쪽');
}
console.log('4 양륙항 · 인도지 = S/I 값');
{ const cp=FX.compass(1); Object.assign(cp.sis[0],{crcf9_pod_bl1:'BUSAN, KOREA', crcf9_place_of_delivery_1:'BUSAN, KOREA'}); cp.pod='PUSAN';
  const c=ACL.compareOne(mkAcl({pod:'BUSAN, KOREA',delivery:'BUSAN, KOREA'}),cp), p=item(c,'pod'), d=item(c,'delivery');
  eq([p.status,p.expected,d.status],['MATCH','BUSAN, KOREA','MATCH'],'④ S/I BUSAN, KOREA · 부킹 PUSAN · ACL BUSAN, KOREA → 一致 (기대값 = S/I)');
  ok(/ブッキング POD: PUSAN/.test(p.detail)&&/ブッキングと S\/I の港名が違う/.test(p.detail),'④ 부킹 POD 는 참고로 detail 에 · 港名違い',p.detail);
  const n=item(ACL.compareOne(mkAcl({pod:'BUSAN,KOREA',delivery:'BUSAN, KOREA'}),cp),'pod');
  eq([n.status,n.kind],['NOTATION','表記:記号の前後の空白:Port of Discharge'],'④ 쉼표 뒤 공백만 → 表記 (Step 4)');
  const cv=FX.compass(2); Object.assign(cv.sis[0],{crcf9_pod_bl1:'SAMPLE PORT A, VIETNAM', crcf9_place_of_delivery_1:'SAMPLE PORT A, VIETNAM', crcf9_place_of_delivery_2:'SP-TEST PORT, VIETNAM'}); cv.meta={country:'VIETNAM'};
  const pe=[{scope:'VIETNAM', ports:['SP-TEST']}], P=(v,ex)=>item(ACL.compareOne(mkAcl({pod:v,delivery:v}),cv,{meta:cv.meta,podExclude:ex}),'pod');
  const p1=P('SAMPLE PORT A, VIETNAM',pe), p2=P('SP-TEST PORT, VIETNAM',[]), p3=P('SP-TEST PORT, VIETNAM',pe), p4=P('OTHER PORT, VIETNAM',pe);
  eq([p1.status,p2.status,/2 番目/.test(p2.detail),p3.status,p3.kind,/pod_exclude で外す港/.test(p3.detail),p4.status,p4.kind],
    ['MATCH','MATCH',true,'DIFF','揚地 相違 (S/I):Port of Discharge',true,'DIFF','揚地 相違 (S/I):Port of Discharge'],'④ 후보 2개: 1번째 一致 · 2번째 (D-03 에서 고를 수 있음) 一致 · pod_exclude 의 항구 → 相違 · 없는 항구 → 相違');
  const cc=FX.compass(3); cc.booking.cr49f_invoice_no='NCA2601-03'; Object.assign(cc.sis[0],{crcf9_pod_bl1:'SAMPLE INLAND, THAILAND', crcf9_place_of_delivery_1:'SAMPLE INLAND, THAILAND'});
  const pc=ACL.podPlan(cc,[]); eq([pc.discharge,pc.delivery],[ACL.CAS_DISCHARGE,'SAMPLE INLAND, THAILAND'],'④ CAS (NCA) — D-03 과 같이 PORT OF DISCHARGE 고정 · 인도지는 S/I');
  const e=FX.compass(4); ['crcf9_pod_bl1','crcf9_place_of_delivery_1'].forEach(k=>{ e.sis[0][k]=null; }); const pe0=item(ACL.compareOne(mkAcl({pod:'X',delivery:'X'}),e),'pod');
  eq([pe0.status,pe0.expected],['INFO','(S/I に港なし)'],'④ S/I 에 항구 없음 → 参考');
}
console.log('5 표기 정리');
{ const T=(e,a,o)=>ACL.compareText(e,a,o);
  const a=T('NAGOYA, JAPAN','NAGOYA,JAPAN'), b=T('SAMPLE MFG. CO., LTD.','SAMPLE MFG.CO.,LTD.'), c=T('TOKYO, JAPAN','TOKYO. JAPAN'), d=T('Same As Consignee','SAME AS CONSIGNEE');
  eq([a.status,a.kind,b.status,b.kind],['NOTATION','表記:記号の前後の空白','NOTATION','表記:記号の前後の空白'],'⑤ 쉼표 · 마침표 뒤 공백만 → 表記:記号の前後の空白');
  eq([c.status,c.sub],['DIFF','記号'],'⑤ , ↔ . (부호 바뀜) → 相違:記号 (D5)');
  eq([d.status,d.kind],['NOTATION','表記:大文字小文字'],'⑤ 대소문자만 → 表記:大文字小文字');
  const cp=FX.compass(5); cp.containers=cp.containers.slice(0,1); cp.containers[0].crcf9_seal_no='TSAB 000123'; const c0=cp.containers[0];
  const rows=[{container:c0.crcf9_container_no, seal:'TSAB000123', size:'45', type:'GP', bales:c0.crcf9_quantity, cargo:c0.crcf9_n_w, tare:c0.crcf9_t_w, conf:'SURE'}];
  const s=ACL.compareOne(mkAcl({},rows),cp), si=s.items.find(i=>/^set:/.test(i.key));
  eq([si.status,si.kind,!!s.kinds['セット相違:シール']],['NOTATION','表記:シール番号の空白',false],'⑤ 씰 번호 공백 (COMPASS 입력 공백) → 表記 (compareSets 는 그대로)');
  rows[0].seal='TSAB000124'; const s2=ACL.compareOne(mkAcl({},rows),cp).items.find(i=>/^set:/.test(i.key)); eq(s2.status,'DIFF','⑤ 씰 번호 글자가 다르면 그대로 相違');
  const others=[{label:'Notify Party',text:'SAMPLE PAPER COMPANY LTD.\nNO.1 SAMPLE ROAD'}];
  const o1=T('WASTE PAPER OCC\nHS CODE 4707.10','WASTE PAPER OCC ** COMPANY\nHS CODE 4707.10',others), o2=T('WASTE PAPER OCC\nHS CODE 4707.10','WASTE PAPER OCC ** ZZQXW\nHS CODE 4707.10',others);
  eq([o1.status,o1.kind,/Notify Party/.test(o1.note),o2.status],['NOTATION','表記:はみ出し移動',true,'ADD'],'⑤ 넘침 ** 이동 (다른 칸 S/I 글자 그대로) → 表記 · 어디에도 없는 글자 → 相違 (追加)');
  /* 넘침이 「나간 쪽」 — 이 칸 끝 ** · 빠진 줄이 다른 칸 ACL 의 ** 뒤에 있음 → 表記 / 다른 칸에 없으면 脱落 */
  const ao=[{label:'Notify Party',text:'SAMPLE PAPER CO., LTD. **\nNO.9 SAMPLE STREET'}];
  const b1=ACL.compareText('TO ORDER OF SAMPLE BANK\nNO.9 SAMPLE STREET','TO ORDER OF SAMPLE BANK **',null,ao), b2=ACL.compareText('TO ORDER OF SAMPLE BANK\nNO.7 OTHER ROAD','TO ORDER OF SAMPLE BANK **',null,ao), b3=ACL.compareText('TO ORDER OF SAMPLE BANK\nNO.9 SAMPLE STREET','TO ORDER OF SAMPLE BANK',null,ao);
  eq([b1.status,b1.kind,b2.status,b3.status],['NOTATION','表記:はみ出し移動','DIFF','DROP'],'⑤ 넘침 「나간 쪽」 (이 칸 ** · 빠진 글자가 다른 칸 ACL ** 뒤) → 表記 · 다른 칸에 없음 → 相違 · ** 없음 → 脱落');
  const cq=FX.compass(6), ex=ACL.expected(cq), dl=ex.description.split('\n').filter(Boolean); dl[0]=dl[0]+' ** SAMPLE PAPER';   // S/I Notify 「SAMPLE PAPER CO., LTD.」
  const od=item(ACL.compareOne(mkAcl({description:dl.join('\n')}),cq),'description'); eq([od.status,od.kind],['NOTATION','表記:はみ出し移動:Description of Goods'],'⑤ compareOne: 품명 끝의 「** {Notify 글자}」 → 表記:はみ出し移動');
}
console.log('6 유지 확인 (모두 相違)');
{ const T=(e,a)=>ACL.compareText(e,a);
  const r=[T('TEL 000 0FAX','TEL 0000 FAX'),T('PT SAMPLE MAS','PT SAMPLEMAS'),T('SAMPLE CO.,LTD','SAMPLE CO,.LTD'),T('SAMPLE CO.,, LTD','SAMPLE CO., LTD'),T('WASTE PAPER','WESTE PAPER')];
  eq(r.map(x=>x.status==='MATCH'||x.status==='NOTATION'),[false,false,false,false,false],'⑥ 000 0FAX · SAMPLE MAS (낱말 안 공백) · CO.,LTD↔CO,.LTD (순서) · ,, (겹침) · WASTE↔WESTE → 모두 相違',r.map(x=>x.status));
  eq([r[0].wordBreak,r[1].wordBreak,r[2].sub,r[4].sub],[true,true,'記号','誤字の疑い'],'⑥ 낱말 안 공백 = 語の切れ目 · 부호 순서 = 記号 · 1~2 글자 = 誤字の疑い');
  const cq=FX.compass(7), ex=ACL.expected(cq), w=ex.description.replace('WASTE','WESTE');
  const it=item(ACL.compareOne(mkAcl({description:w}),cq),'description'); eq([it.status,it.kind],['DIFF','相違:誤字の疑い:Description of Goods'],'⑥ compareOne: 품명 WASTE → WESTE = 相違:誤字の疑い (표기 정리가 삼키지 않음)');
  const up=T('SAMPLE MAS TOWER','SAMPLEMAS tower'); eq(up.status,'DIFF','⑥ 대소문자 + 낱말 안 공백 → 相違 (대소문자 표기가 삼키지 않음)');
}
console.log('7 부킹 번호 옆 칸');
{ const cp=FX.compass(8), spec=FX.perfectSpec(ACL,cp); spec.bookingSide=[['- 01',435.5],['1',462.6]];
  const pages=await R.readItems(await N.build(spec)), F=ACL.readNaccs(pages).fields.booking;
  eq([F.text,F.conf,F.codes.indexOf('- 01')>=0&&F.codes.indexOf('1')>=0],[cp.booking.cr49f_booking_no,'SURE',true],'⑦ Booking 칸 = 라벨 + '+ACL.BOOKING_W+'pt 안에서 시작하는 값만 · 옆 칸 「- 01」「1」 은 본문에 안 넣음');
  eq(item(ACL.compareOne(ACL.readNaccs(pages),cp),'booking').status,'MATCH','⑦ → BOOKING 一致');
  const p0=await R.readItems(await N.build(FX.perfectSpec(ACL,cp))); eq(ACL.readNaccs(p0).fields.booking.text,cp.booking.cr49f_booking_no,'⑦ 보통 모양 (「-」 만) 은 전과 같음');
  if(OLD) ok(/- 01/.test(OLD.readNaccs(pages).fields.booking.text),'⑦ 회귀: v0.3.1 은 같은 PDF 에서 「- 01 1」 까지 읽음 (고친 것 확인)',OLD.readNaccs(pages).fields.booking.text);
}
console.log('8 REV 판');
{ const W='/drives/DRV/root:/古紙/-. 古紙書類/▲ 書類作成中/', it=(id,name,inv,mod)=>({id,name,inv,lastModifiedDateTime:mod,size:1});
  /* v0.5: groupTargets 는 Invoice 폴더 단위 (폴더 걷기) — 같은 파일들을 폴더로 묶어 넣는다 */
  const byFolder=fs=>{ const o={}; fs.forEach(f=>{ (o[f.inv]=o[f.inv]||{invoice:f.inv, path:W+f.inv, files:[]}).files.push(f); }); return Object.values(o); };
  const names=['NFK2601-01_ACL.pdf','NFK2601-01_ACL REV.pdf','NFK2601-01_ACL_REV.pdf','NFK2601-01_ACL REV2.pdf','NFK2601-01_ACL-REV3.pdf','NFK2601-01_ACL(REV2).pdf','NFK2601-01_再輸入ACL.pdf','NFK2601-01_ACL_再輸入.pdf','NFK2601-01_ACL (1).pdf'];
  eq(names.map(n=>{ const a=ACL.aclName(n); return a?a.label:null; }),['初版','REV','REV','REV2','REV3','REV2',null,null,null],'⑧ 이름 모양 (공백 · _ · - · 괄호) → 版 · 再輸入 · (1) 은 제외');
  const g=ACL.groupTargets(byFolder([it('a','NFK2601-01_ACL.pdf','NFK2601-01','2026-11-01T00:00:00Z'),it('b','NFK2601-01_ACL REV.pdf','NFK2601-01','2026-11-03T00:00:00Z'),it('c','NFK2601-01_ACL REV2.pdf','NFK2601-01','2026-11-02T00:00:00Z'),
    it('d','NFK2601-02_ACL REV.pdf','NFK2601-02','2026-11-01T00:00:00Z'),it('e','NFK2601-02_ACL_REV.pdf','NFK2601-02','2026-11-05T00:00:00Z'),it('f','NFK2601-03_再輸入ACL.pdf','NFK2601-03','2026-11-01T00:00:00Z')]));
  const t1=g.targets.find(t=>t.invoice==='NFK2601-01'), t2=g.targets.find(t=>t.invoice==='NFK2601-02');
  eq([t1.file.id,t1.aclVersion,t1.others.map(o=>o.id).join()],['c','REV2','b,a'],'⑧ _ACL + REV + REV2 → REV2 (시각이 REV 보다 앞서도 번호 우선) · 처음 판은 others');
  eq([t2.file.id,t2.aclVersion],['e','REV'],'⑧ 같은 REV 번호 → 늦은 수정 시각');
  eq([g.targets.length,g.skipped.map(s=>s.name)],[2,[]],'⑧ 再輸入ACL (다른 신고) 은 제외 (v0.5: 폴더 걷기 — ACL 모양이 아닌 이름은 목록에도 넣지 않음)');
  const csv=ACL.toCsv({run_id:'R',results:[{invoice:'NFK2601-01',format:'NACCS',verdict:'完全一致',aclVersion:'REV2',items:[{group:'g',label:'l',status:'MATCH',kind:'',expected:'',actual:'',detail:''}]}]});
  ok(/,aclVersion\r\n/.test(csv)&&/,REV2\r\n/.test(csv),'⑧ results.csv 맨 끝 aclVersion');
}
console.log('9 본선 변경 라벨');
{ const cp=FX.compass(9); cp.booking.modifiedon='2026-11-10T00:00:00Z';
  const V=(v,fm)=>item(ACL.compareOne(mkAcl({vessel:v,voy:'101W'}),cp,{fileModified:fm}),'vessel');
  const a=V('OTHER STAR','2026-11-05T00:00:00Z'), b=V('OTHER STAR','2026-11-12T00:00:00Z'), c=V('SAMPLE STAR','2026-11-05T00:00:00Z');
  eq([a.status,/本船変更の可能性/.test(a.detail),b.status,/本船変更/.test(b.detail),c.status],['DIFF',true,'DIFF',false,'MATCH'],'⑨ 본선 다름 · 부킹 수정이 ACL 뒤 → 「ACL のあとにブッキング変更」 라벨 (판정은 相違 그대로) · 앞이면 라벨 없음');
}
console.log('v04 pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
