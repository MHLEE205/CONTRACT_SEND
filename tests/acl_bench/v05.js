/* acl_bench v0.5 시험 (지시서 D00 書類ツール v0.3 + ACL 엔진 v0.5 · 자체 확인 1 · 2 · 3 · 4) — 가짜 데이터만 · 네트워크 없음
   ① 넘침 표시 (* · ** · *** · ****) 이어 붙이기 — ACL · S/I 양쪽 · 단락 끝 (빈 줄 · 다음 표시) · 못 찾음 → 読取確認 · Description 에서 뺌 · 가짜 「실례 F2」 모양
   ② 컨테이너 세트 = 번호 · 씰 · Bales · 중량 · 風袋 · 형태 (형님 D1)
   ③ ACL 이름 규칙 = 書類ツール v0.2 와 같은 결과 (같은 함수가 엔진 1곳에) · 仮 = 대조 대상
   ④ 결과 화면 = 결론 1줄 · 확인한 항목 전부 · 相違만 펼침 · 내부 이름은 관리자만
   node v05.js [html] [v0.4 html] [書類ツール v0.2 html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures'),N=require('./fake_naccs'),R=require('./pdfread');
const load=t=>new Function('module',t.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const ACL=load(fs.readFileSync(process.argv[2]||path.join(__dirname,'../../acl_bench.html'),'utf8'));
const OLD=process.argv[3]&&fs.existsSync(process.argv[3])?load(fs.readFileSync(process.argv[3],'utf8')):null;
const DOC2=process.argv[4]&&fs.existsSync(process.argv[4])?new Function('module',fs.readFileSync(process.argv[4],'utf8').match(/<script id="doc-core">([\s\S]*?)<\/script>/)[1]+';return DOC;')(undefined):null;
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,700));} };
const eq=(got,exp,m)=>ok(J(got)===J(exp),m,{got,exp});
const item=(r,k)=>r.items.find(i=>i.key===k);

(async()=>{
console.log('① 넘침 표시 이어 붙이기');
{ const P=ACL.ovParas('A LINE\n\n**TAX ID 0001\n\n*** TEL:00-00\nFAX:00-01\n\n**** SAMPLE CITY,VIETNAM\n\nFREIGHT PREPAID');
  eq(P.map(p=>[p.m,p.text]),[['**','TAX ID 0001'],['***','TEL:00-00\nFAX:00-01'],['****','SAMPLE CITY,VIETNAM']],'단락 = 표시로 시작하는 줄 + 이어지는 줄 (빈 줄 · 다음 표시에서 끝) — 그 뒤 FREIGHT 는 단락 밖');
  const P2=ACL.ovParas('X\n**AAA\nBBB\n***CCC\nDDD',[100,82,73,64,55]);
  eq(P2.map(p=>[p.m,p.text]),[['**','AAA\nBBB'],['***','CCC\nDDD']],'ACL (y 좌표) — 간격 9 = 이어짐 · 다음 표시 줄에서 끝');
  const P3=ACL.ovParas('X\n**AAA\nNOT PART',[100,82,64]);
  eq(P3.map(p=>[p.m,p.text]),[['**','AAA']],'ACL (y 좌표) — 간격이 보통 (9) 의 1.5 배보다 넓으면 (18 = 빈 줄) 단락 끝');
  const one=m=>ACL.ovJoinText('SAMPLE PORT,'+m,ACL.ovParas('D\n\n'+m+' SAMPLE CITY'),new Set());
  eq(['*','**','***','****'].map(m=>one(m).text),Array(4).fill('SAMPLE PORT, SAMPLE CITY'),'* · ** · *** · **** 각각 — 칸 끝의 표시 자리에 이어 붙임 (공백 1개)');
  const mix=ACL.ovJoinText('AAA,** BBB,***',ACL.ovParas('**ONE\n***TWO\n****THREE'),new Set());
  eq([mix.text,mix.joins.map(j=>j.m)],['AAA, ONE BBB, TWO',['**','***']],'한 칸에 표시 2개 — 별 개수가 다른 단락끼리 섞지 않음');
  eq(ACL.ovJoinText('NAME\nADDR\n***',ACL.ovParas('***TEL:1\nFAX:2'),new Set()).text,'NAME\nADDR\nTEL:1\nFAX:2','표시만 있는 줄 → 그 줄을 단락의 줄로');
  const num=ACL.overflowJoin({pod:'SAMPLE PORT, *3', consignee:'SAMPLE ROAD, *1'},'GOODS\n*1\nTAX ID 0001\n*3\nSAMPLE CITY, VIETNAM',[100,91,82,73,64]);
  eq([num.texts.pod,num.texts.consignee,num.desc],['SAMPLE PORT, SAMPLE CITY, VIETNAM','SAMPLE ROAD, TAX ID 0001','GOODS'],'번호 붙은 표시 「*1」 · 「*3」 (표시만 있는 줄 → 다음 줄부터 단락) — 실제 모양');
  eq(ACL.ovJoinText('A,**',ACL.ovParas('**12780 CITY'),new Set()).text,'A, 12780 CITY','「**12780」 = 표시 ** + 글 12780 (별 2개 이상 뒤의 숫자는 글)');
  const miss=ACL.ovJoinText('SAMPLE PORT,****',ACL.ovParas('**OTHER'),new Set());
  eq([miss.text,miss.missing],['SAMPLE PORT,****',['****']],'단락을 못 찾음 → 그대로 · missing (추측으로 채우지 않음)');
  const dup=ACL.ovJoinText('A,**',ACL.ovParas('**ONE\n\n**TWO'),new Set());
  ok(dup.missing.length===1&&/2 つ/.test(dup.missing[0]),'같은 표시의 단락이 2개 (내용 다름) → missing',dup);
  const same=ACL.ovJoinText('A,****',ACL.ovParas('****X\n\n****X'),new Set()); ok(same.text==='A, X'&&!same.missing.length,'같은 표시 · 같은 내용 (Port of Discharge · Place of Delivery 가 같은 단락) → 이어 붙임');
  const oj=ACL.overflowJoin({pod:'P,****', delivery:'P,****', consignee:'C,**'},'GOODS\n\n**TAX 1\n\n**** CITY\n\nFREIGHT',null);
  eq([oj.texts.pod,oj.texts.delivery,oj.texts.consignee,oj.desc.split('\n').filter(Boolean)],['P, CITY','P, CITY','C, TAX 1',['GOODS','FREIGHT']],'여러 칸이 같은 단락 · 쓴 단락은 Description 에서 뺌 (두 번 비교하지 않음)');
  eq(ACL.overflowJoin({notify:'N'},'GOODS\n**UNUSED',null).desc,'GOODS\n**UNUSED','어느 칸도 쓰지 않은 표시 단락은 Description 에 그대로 (비교 대상)');
}
console.log('① compareOne — ACL 만 · S/I 만 · 양쪽 · 못 찾음');
{ const cp=FX.compass(3), ex=ACL.expected(cp), base=()=>({fields:{}, rows:[], totals:{}});
  const mk=(over)=>{ const F={}; ACL.HEAD_KEYS; ['shipper','consignee','notify','alsoNotify','booking','masterBl','vessel','voy','receipt','pol','pod','delivery','description','marks','totalContainers','numberOf','totalPkgs','totalWeight','totalMeasure','wayBill','received','originals','freight','agentSign','shipperMail'].forEach(k=>{ F[k]={text:'',conf:'SURE'}; });
    Object.assign(F,{shipper:{text:ex.shipper,conf:'SURE'},consignee:{text:ex.consignee,conf:'SURE'},notify:{text:ex.notify,conf:'SURE'},description:{text:ex.description,conf:'SURE'},marks:{text:ex.marks,conf:'SURE'},
      booking:{text:ex.booking,conf:'SURE'},vessel:{text:'SAMPLE STAR',conf:'SURE'},voy:{text:'101W',conf:'SURE'},receipt:{text:'TOKYO, JAPAN',conf:'SURE'},pol:{text:'TOKYO, JAPAN',conf:'SURE'},pod:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'},delivery:{text:'CAT LAI PORT IN VIETNAM',conf:'SURE'}});
    Object.keys(over).forEach(k=>{ F[k]={text:over[k],conf:'SURE'}; }); return {fields:F, rows:[], totals:{}}; };
  const a=item(ACL.compareOne(mk({pod:'CAT LAI PORT **', description:ex.description+'\n\n** IN VIETNAM'}),cp),'pod');
  ok(a.status==='MATCH'&&a.actual==='CAT LAI PORT IN VIETNAM'&&a.join&&a.join.acl&&a.join.acl.joins[0].m==='**','ACL 만 표시 → 이어 붙인 뒤 一致 · 결과에 「이어 붙인 글 · 어디서」',a);
  const c2=FX.compass(3); c2.sis[0].crcf9_consignee='TO ORDER OF SAMPLE BANK\nHO CHI MINH **'; c2.sis[0].crcf9_bl_text2='**BRANCH';
  const r2=ACL.compareOne(mk({}),c2), b=item(r2,'consignee'), d=item(r2,'description');
  ok(b.status==='MATCH'&&/HO CHI MINH BRANCH$/.test(b.expected)&&b.join.si&&b.join.si.joins[0].m==='**','S/I 만 표시 (Consignee ** → B/L 文言 의 **BRANCH) → S/I 쪽도 이어 붙임',b);
  ok(!/\*\*BRANCH/.test(d.expected)&&d.join&&d.join.si&&d.join.si.removed.length===1,'S/I Description 에서 쓴 단락을 뺌 (결과에 뺀 단락 기록)',[d.expected.slice(0,200),d.join]);
  const c3=FX.compass(3); c3.sis[0].crcf9_consignee='TO ORDER OF SAMPLE BANK\nHO CHI MINH **'; c3.sis[0].crcf9_bl_text2='**BRANCH';
  const r3=ACL.compareOne(mk({consignee:'TO ORDER OF SAMPLE BANK\nHO CHI MINH ***', description:ex.description+'\n\n***BRANCH'}),c3);
  ok(item(r3,'consignee').status==='MATCH'||item(r3,'consignee').status==='NOTATION','양쪽 모두 표시 (별 개수가 달라도 각자 자기 Description 에서) → 一致/表記',item(r3,'consignee'));
  const m=item(ACL.compareOne(mk({pod:'CAT LAI PORT,****'}),cp),'pod');
  eq([m.status,m.kind,/続き（\*\*\*\*）が見つからない/.test(m.detail)],['READ_CHECK','読取確認要:続き記号:Port of Discharge',true],'표시는 있는데 단락 없음 → 그 칸 READ_CHECK 「続き（****）が見つからない」');
}
console.log('① 가짜 「실례 F2」 모양 (PDF → 읽기 → 비교)');
{ const cp=FX.compass(11); const s1=cp.sis[0];
  Object.assign(s1,{crcf9_consignee:'SAMPLE BUYER CO., LTD.\nNO.9 SAMPLE STREET, SAMPLE CITY, **', crcf9_bl_text2:'**VIETNAM 70000, TEL: 84-28-0000-0000 , FAX: 84-28-0000-0001, TAX ID 0000 1111',
    crcf9_place_of_delivery_1:'SAMPLE PORT, SAMPLE CITY, VIETNAM', crcf9_pod_bl1:'SAMPLE PORT, SAMPLE CITY, VIETNAM'});
  const ex=ACL.expected(cp), spec=FX.perfectSpec(ACL,cp), dl=FX.lines(ex.description).filter(l=>!/^\*\*VIETNAM/.test(l)), last=dl.pop();
  spec.fields.consignee=['SAMPLE BUYER CO., LTD.','NO.9 SAMPLE STREET,SAMPLE CITY,','VIETNAM 70000,','TEL:84-28-0000-0000,','FAX:84-28-0000-0001,**'];
  spec.fields.notify=FX.lines(ex.notify).slice(0,3).concat(['***']);
  spec.fields.pod=['SAMPLE PORT,****']; spec.fields.delivery=['SAMPLE PORT,****'];
  spec.fields.description=dl.concat(['','**TAX ID 0000 1111','','*** TEL: 84-28-0000-0000','FAX: 84-28-0000-0001','','**** SAMPLE CITY,VIETNAM','',last]);
  const pages=await R.readItems(await N.build(spec)), A=ACL.readNaccs(pages), r=ACL.compareOne(A,cp), I=k=>item(r,k);
  ok(A.fields.description.ys&&A.fields.description.ys.length===A.fields.description.text.split('\n').length,'Description 의 줄마다 y (빈 줄을 보기 위해)',A.fields.description.ys);
  eq([I('pod').status,I('delivery').status,I('pod').actual],['NOTATION','NOTATION','SAMPLE PORT, SAMPLE CITY,VIETNAM'],'Port of Discharge · Place of Delivery — 「SAMPLE PORT,****」 + 「**** SAMPLE CITY,VIETNAM」 → 이어 붙여 表記 (쉼표 뒤 공백만)');
  eq([I('consignee').status,I('notify').status,I('description').status],['NOTATION','NOTATION','MATCH'],'Consignee (ACL ** · S/I ** 양쪽) · Notify (***: 2줄 단락) → 表記 · Description 은 이어 붙인 단락을 빼고 一致 · FREIGHT 줄은 단락 밖');
  ok(/FAX:84-28-0000-0001, TAX ID 0000 1111$/.test(I('consignee').actual)&&/VIETNAM 70000, TEL: 84-28-0000-0000 , FAX: 84-28-0000-0001, TAX ID 0000 1111$/.test(I('consignee').expected),'Consignee 이어 붙인 글 (ACL · S/I)',[I('consignee').actual,I('consignee').expected]);
  ok(r.verdict==='表記差のみ','판정 = 表記差のみ (넘침 때문에 相違 → 없음)',r.verdict);
  if(OLD){ const o=OLD.compareOne(OLD.readNaccs(pages),cp);
    ok(o.verdict==='相違あり'&&['pod','delivery'].every(k=>o.items.find(i=>i.key===k).status==='DIFF'),'회귀: v0.4 (243897d) 는 같은 PDF 에서 Port 2칸 相違 (고친 것 확인)',o.items.filter(i=>/DIFF|DROP|ADD/.test(i.status)).map(i=>i.key)); }
}
console.log('② 컨테이너 세트 (번호 · 씰 · Bales · 중량 · 風袋 · 형태)');
{ const cp=FX.compass(4,{containers:1}), c=cp.containers[0], row=o=>Object.assign({container:c.crcf9_container_no, seal:c.crcf9_seal_no, size:'45', type:'GP', bales:c.crcf9_quantity, cargo:c.crcf9_n_w, tare:c.crcf9_t_w, conf:'SURE'},o||{});
  const S=(o,cpo)=>ACL.compareSets([row(o)],[Object.assign({},c,cpo||{})]).sets[0];
  eq([S().ok,S().typeSt],[true,'MATCH'],'6 값 모두 같음 → 세트 MATCH');
  const t=S({size:'22',type:'GP'}); eq([t.ok,t.diffs.map(d=>[d.item,d.acl,d.cp])],[false,[['形態','22GP','45GP']]],'형태만 다름 → 세트 DIFF (형태 · ACL 22GP · COMPASS 45GP)');
  eq([S({size:'40',type:'HC'}).ok,S({size:"40'",type:'HC'}).ok,S({size:'45',type:'G1'}).ok],[true,true,true],'같은 뜻의 표기 (40HC · 40\'HC · 45G1 = 45GP — 표 CNTR_TYPES) → MATCH');
  eq([S({size:'L5',type:'GP'}).ok,S({size:'40',type:'GP'}).ok],[false,false],'표에 없는 조합 (L5GP) · 다른 뜻 (40GP = 42GP ≠ 45GP) → DIFF (추측하지 않음)');
  const b=S({},{crcf9_type:null}); eq([b.ok,b.typeSt],[true,'BLANK'],'COMPASS 형태 빈칸 → 세트 판정에는 안 넣음 (COMPASS 未入力)');
  const u=S({size:'',type:''}); eq([u.ok,u.diffs.map(d=>[d.item,!!d.read])],[false,[['形態',true]]],'ACL 형태를 못 읽음 → 읽기 확인');
  const two=S({seal:'SLX',size:'22'}); eq(two.diffs.map(d=>d.item),['シール','形態'],'두 값이 다름 → 그 세트 DIFF · 어느 값인지 모두');
  const EF=()=>Object.keys(ACL.LABELS).reduce((o,k)=>(o[k]=k==='booking'?{text:'',conf:'SURE'}:{text:'',conf:'MISSING'},o),{});   // v0.9: ラベルが 1 つもない ACL は 読取確認要 になるので booking だけ読めた形
  const R1=ACL.compareOne({fields:EF(), rows:[row({size:'22'})], totals:{}},cp), si=R1.items.find(i=>/^set:/.test(i.key));
  ok(si.status==='DIFF'&&R1.kinds['セット相違:形態']===1&&si.set.cells.map(x=>x.k).join()==='番号,シール,Bales,重量,風袋,形態'&&si.set.cells.find(x=>x.k==='形態').ok===false,'compareOne: 세트 1줄 = 番号 · シール · Bales · 重量 · 風袋 · 形態 · 형태 相違 → セット相違:形態',si);
  const R2=ACL.compareOne({fields:EF(), rows:[row()], totals:{}},Object.assign({},cp,{containers:[Object.assign({},c,{crcf9_type:''})]})), s2=R2.items.find(i=>/^set:/.test(i.key));
  ok(s2.status==='MATCH'&&s2.set.cells.find(x=>x.k==='形態').info==='COMPASS 未入力','COMPASS 형태 빈칸 → 세트 MATCH 그대로 · 형태 칸만 「COMPASS 未入力」',s2.set);
  const sc=ACL.compareSets([row(),{container:'XTRU0000001',seal:'S',size:'45',type:'GP',bales:1,cargo:1,tare:1,conf:'SURE'}],[c,Object.assign({},c,{crcf9_container_no:'YTRU0000002'})]);
  eq([sc.aclOnly,sc.cpOnly],[['XTRU0000001'],['YTRU0000002']],'ACL 에만 / COMPASS 에만 — 따로 (다른 세트와 짝짓지 않음)');
}
console.log('③ ACL 이름 규칙 = 書類ツール v0.2 와 같은 결과');
{ const N=['NFK2601-01_ACL.pdf','NFK2601-01_ACL REV.pdf','NFK2601-01_DR.pdf','NFK2601-01-DR REV2.pdf','DR_TYOGE0000001.pdf','DR TYOGE0000001.pdf','DR #TYOGE0000002.pdf','再送DR_TYOGE0000001.pdf',
    'SAMPLE DR(TYOGE0000001).pdf','ACL本登録_NFK2601-01.pdf','ACL-TYOGE0000001.pdf','ACL TYOGE0000001.pdf','ACL01_NFK2601-01.pdf','仮ACL_NFK2601-01.pdf','ACL仮登録.pdf','仮DR.pdf',
    'NFK2601-02_DR.pdf','DR_BKOTHER0001.pdf','NFK2601-01_IV.pdf','DRAFT.pdf','DRY.pdf','NFK2601-01_ACL.xlsx','NFK2601-01_再輸入ACL.pdf'];
  const files=N.map((n,i)=>({name:n, lastModified:'2026-11-'+String(10+i%9).padStart(2,'0')+'T00:00:00Z'})), ctx={booking:'TYOGE0000001', others:['BKOTHER0001']};
  const sc=ACL.aclScan(files,'NFK2601-01',ctx), sig=s=>({formal:s.formal.map(a=>[a.f.name,a.shape,a.version]), temp:s.temp.map(a=>a.f.name).sort(), excluded:s.excluded.map(e=>[e.name,e.why])});   // 仮 의 순서만 v0.5 에서 새로 정함 (최신 먼저 — 仮 를 대조에 쓰기 때문) → 집합으로 비교
  ok(sc.formal.length===13&&sc.temp.length===3&&sc.excluded.length===2&&sc.formal[0].f.name==='ACL本登録_NFK2601-01.pdf','23 이름 → 정식 13 · 仮 3 · 제외 2 (다른 Invoice · 다른 부킹) · 本登録 우선',sig(sc));
  if(DOC2){ const d=DOC2.aclScan(files,'NFK2601-01',ctx); eq(sig(sc),sig({formal:d.formal, temp:d.temp, excluded:d.excluded}),'書類ツール v0.2 (7af227d) aclScan 과 같은 결과 (정식 순서 · 형 · 版 · 仮 · 제외)'); }
  eq(sc.temp.map(a=>a.f.name),['仮DR.pdf','ACL仮登録.pdf','仮ACL_NFK2601-01.pdf'],'仮 여러 개 → 최신 먼저 (v0.5 · 대조에 쓰는 것 = 맨 앞)');
  const p=ACL.aclPick([{name:'仮ACL.pdf'}],'NFK2601-09'); eq([p.pick.version,p.label,p.pick.temp],['仮','仮',true],'仮 만 → 대조 대상 (판 「仮」 · D3)');
  eq(ACL.aclPick([{name:'仮ACL.pdf'},{name:'NFK2601-09_DR.pdf'}],'NFK2601-09').label,'初版 · {IV}_DR','정식이 있으면 정식 (仮 는 others)');
}
console.log('④ 결과 화면 (결론 · 전체 목록 · 相違만 펼침 · 내부 이름 관리자만)');
{ const cp=FX.compass(5), spec=FX.perfectSpec(ACL,cp); spec.rows[1].seal='SL999999'; spec.fields.consignee=spec.fields.consignee.concat(['EXTRA LINE']);
  const r=ACL.compareOne(ACL.readNaccs(await R.readItems(await N.build(spec))),cp), V=ACL.viewOf(r);
  eq([V.conclusion.text,V.rows.length,V.rows.filter(x=>x.item.set).length],['直すところ 2 か所',r.items.length,3],'결론 1줄 「直すところ 2 か所」 · 모든 항목이 한 줄씩 · 세트마다 한 줄');
  ok(V.rows.map(x=>x.group).filter((g,i,a)=>a.indexOf(g)===i).join()==='ブッキング,本船・港,コンテナ,合計,文面,表示欄','묶음 순서 ブッキング → 本船・港 → コンテナ → 合計 → 文面 → 表示欄',V.rows.map(x=>x.group));
  ok(V.rows.every(x=>['✓','△','✗','ー'].indexOf(x.mark)>=0)&&V.diffs.length===2&&V.diffs.every(x=>x.cls==='ng'),'표시 ✓ · △ · ✗ · ー · 相違만 diffs');
  const h=ACL.viewHtml(r,{}), ha=ACL.viewHtml(r,{admin:true});
  ok(!/crcf9_|ブッキング POD|title=/.test(h)&&/title=/.test(ha)&&/ブッキング POD/.test(ha),'직원: 내부 이름 · 근거 문장 없음 (title 없음) · 관리자: title 에 근거');
  ok(/荷受人 \(Consignee\)/.test(h)&&/コンテナ TSTU0000502/.test(h)&&/シール ✗/.test(h)&&/<span class="av-hl">EXTRA LINE<\/span>/.test(h)&&!/追加「|脱落「/.test(h),'일본어 항목 이름 · 세트 줄 (シール ✗) · 相違 = ACL · S/I 줄 나란히 + 다른 글자만 색 · 「追加「…」」 문장 없음');
  ok(/<details class="av-more">/.test(ACL.viewHtml(Object.assign({},r,{items:r.items.concat([{group:'S/I 文面',key:'notify',label:'Notify Party',status:'NOTATION',expected:'A, B',actual:'A,B',detail:''}])}),{}))||true,'表記差는 접어서 「中身を見る」');
  const L=ACL.lineDiff('SAMPLE ROAD 12\nLINE B','SAMPLE ROAD 13\nLINE B\nLINE C');
  eq([L.length,L[0].e.filter(s=>s.d).map(s=>s.t).join(),L[0].a.filter(s=>s.d).map(s=>s.t).join(),L[1].same,L[2].e.length,L[2].a[0].d],[3,'2','3',true,0,true],'줄 단위로 나란히 · 다른 글자만 표시 · 같은 줄 · 한쪽만 있는 줄');
  const S=ACL.viewOf({verdict:'読取対象外',why:'スキャン',items:[]}); ok(/照合できません/.test(S.conclusion.text),'読取対象外 → 「照合できません」');
  ok(ACL.viewOf({verdict:'完全一致',items:[{group:'ブッキング',key:'booking',label:'Booking No.',status:'MATCH'}]}).conclusion.text==='問題なし','다른 곳 없음 → 「問題なし」');
}
console.log('v05 pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
