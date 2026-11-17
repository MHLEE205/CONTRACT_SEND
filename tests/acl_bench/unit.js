/* acl_bench 단위 시험 — <script id="acl-core"> 만 꺼내 node 로. node unit.js [html]   (가짜 데이터만) */
const fs=require('fs'),path=require('path'),FX=require('./fixtures'),N=require('./fake_naccs'),R=require('./pdfread');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../acl_bench.html'),'utf8');
const ACL=new Function('module',html.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,600));} };
const eq=(got,exp,m)=>ok(J(got)===J(exp),m,{got,exp});
const throws=(f,re)=>{ try{ f(); return false; }catch(e){ return re?re.test(e.message):true; } };
const I=(s,x,y,w)=>({s,x,y,w:w==null?s.length*4.4:w});

(async()=>{
console.log('Step 1 대상 모으기');
{ const P=d=>'/drives/DRV/root:/'+encodeURIComponent('古紙')+'/'+d;
  const items=[{id:'1',name:'NFK2601-01_ACL.pdf',path:'/drives/DRV/root:/古紙/-. 古紙書類/▲ 書類作成中/NFK2601-01',lastModifiedDateTime:'2026-11-10T00:00:00Z'},
    {id:'2',name:'NFK2601-01_ACL.pdf',path:'/drives/DRV/root:/古紙/_OLD_DOC/2026/NFK2601-01',lastModifiedDateTime:'2026-11-01T00:00:00Z'},
    {id:'3',name:'nfk2601-02_acl.PDF',path:P('_OLD_DOC/2025/NFK2601-02'),lastModifiedDateTime:'2026-01-01T00:00:00Z'},
    {id:'4',name:'NFK2601-03_ACL.pdf',path:'/drives/DRV/root:/古紙/-. AI 活用/D-01-LC_FD_CHECKER/履歴',lastModifiedDateTime:'2026-01-01T00:00:00Z'},
    {id:'5',name:'NFK2601-04_ACL (1).pdf',path:'/drives/DRV/root:/古紙/-. 古紙書類/▲ 書類作成中/NFK2601-04',lastModifiedDateTime:'2026-01-01T00:00:00Z'},
    {id:'6',name:'NFK2601-05_ACL_2026-11-05.json',path:'/drives/DRV/root:/古紙/-. 古紙書類/▲ 書類作成中/NFK2601-05'}];
  const g=ACL.groupTargets(items);
  eq(g.targets.map(t=>[t.invoice,t.file.id,t.others.map(o=>o.id)]),[['NFK2601-01','1',['2']],['nfk2601-02','3',[]]],'① 두 폴더 아래 {Invoice}_ACL.pdf · 같은 Invoice 는 가장 최근 1개 + 나머지 목록 · 퍼센트 인코딩 경로');
  eq(g.skipped.map(s=>[s.name,s.why]),[['NFK2601-03_ACL.pdf','対象フォルダ外'],['NFK2601-04_ACL (1).pdf','名前が {Invoice}_ACL.pdf でない']],'① 폴더 밖 · 이름 모양 다름 → 목록에만 (pdf 아닌 것은 무시)');
}
console.log('Step 2 좌표 읽기 (합성 항목)');
{ // 값이 라벨보다 먼저 나오는 순서 · 오른쪽 이웃 라벨 · 아래 라벨
  const items=[I('SAMPLE A',32,700),I('LINE 2',32,690),I('BK123',332,700),I('Shipper',30,712,22),I('Booking No.',330,712,30),I('Consignee',30,660,28),I('TO ORDER',32,648)];
  const pg=ACL.layout(items,595), L=pg.labels.find(l=>l.label==='shipper'), c=ACL.cellOf(pg,L);
  eq([c.text,c.conf],['SAMPLE A\nLINE 2','SURE'],'② 셀 = 라벨 아래 · 오른쪽 라벨(Booking No.) 앞까지 · 아래 라벨(Consignee) 위까지');
  eq(ACL.cellOf(pg,pg.labels.find(l=>l.label==='booking')).text,'BK123','② 오른쪽 셀');
  const items2=items.concat([I('VERY LONG VALUE THAT RUNS INTO THE NEXT CELL',32,680,330)]), pg2=ACL.layout(items2,595);
  eq(ACL.cellOf(pg2,pg2.labels.find(l=>l.label==='shipper')).conf,'AMBIGUOUS','② 오른쪽 셀로 넘친 값 → 位置あいまい');
  const pg3=ACL.layout([I('Voy.No.',180,615,22),I('101W',206,615),I('Ocean Vessel',30,615,36)],595);
  eq(ACL.cellOf(pg3,pg3.labels.find(l=>l.label==='voy')).text,'101W','② 라벨과 같은 줄 오른쪽 값도 셀 안');
  eq(ACL.classifyFormat([{items:[]}]).format,'SCAN','⑧ 글자 없음 → SCAN');
  eq(ACL.classifyFormat([{items:[I('BILL OF LADING',30,700)].concat(Array.from({length:5},(_,i)=>I('TEXT LINE '+i,30,680-i*10)))}]).format,'OTHER','⑧ NACCS 문구 없음 → OTHER');
}
console.log('v0.2 실제 NACCS 좌표 관계 (값은 가짜 · 위치 관계만 실제)');
{ const items=[I('Shipper',37.7,776.6,28.7),I('-',179.9,776.2,4.5),I('Carrier/Shipping Agent',257.5,776.6,90.7),I('Booking No.',355.8,776.6,45.2),I('SAMPLE EXPORT',40.8,764.9,60.2),I('BK0001',355.9,766.4,27.8),I('-',435.5,766.6,4.5),
    I('Received B/L',383.5,677.6,49.4),I('Consignee',37.7,692.6,37),I('CY/CFS Code',257.5,694.1,45.2),I('TO ORDER',40.8,679.3,37),
    I('Ref No.',257.5,622.8,28.7),I('REF-0001',294.4,622.3,37),I('Notify Party',37.7,606.4,49.4),I('Also Notify Party',257.5,606.4,70),
    I('Pre-Carriage By',37.7,523.1,61.7),I('Place of Receipt',306.2,523.1,65.9),I('JPTST',394.2,522.6,23.1),I('TOKYO, JAPAN',306.4,512.8,55.5),I('51',454.9,512.8,9.2),
    I('Ocean Vessel',37.7,499.1,49.4),I('9TST',119.6,498.6,18.5),I('Voy.No.',224.5,499.1,28.7),I('Port of Loading',306.2,499.1,61.7),I('SAMPLE STAR',37.8,488.8,50.9),I('101W',224.6,488.8,18.5),
    I('Port of Discharge',37.7,476.5,70),I('VNTST',138.4,476,23.1),I('Place of Delivery',197.5,476.5,70),I('Final Destination',412.8,476.5,70),I('CAT LAI PORT',40.8,466.3,55.5),
    I('Number of',37.7,453.2,37),I('Total Number and Kind of Packages',108.2,453.2,136),I('HS Code(Main)',271.8,453.2,53.5),I('Total Weight',333.2,453.2,49.4),I('Gross',333.2,443.5,20.6),I('Net',333.2,433.8,12.3),
    I('12,345.000',373.2,443,46.3),I('KGM',431.8,443,13.8),I('Total Measurement',460.1,453.2,70),I('Containers',37.7,443.5,41.1),I('Marks & No.',37.7,421,45.3),I('Description of Goods',214.7,421,82.4),
    I('HS Code',389.5,421,28.7),I('Number and Kind of Packages',389.5,397.8,111.3),I('THREE',171.4,177.5,23.2),I('(3)',199.2,177.5,13.9),I('CONTAINERS',217.7,177.5,46.3),I('ONLY.-',268.7,177.5,27.8),I('Total Number of Containers',37.7,182.4,107.1),I('Place of B(S)/L Issue',264.2,162.1,86.4)];
  const a=ACL.readNaccs([{page:1,w:595.32,items}]), F=a.fields;
  eq([F.shipper.text,F.booking.text],['SAMPLE EXPORT','BK0001'],'v0.2 라벨 줄의 「-」 · 값 줄의 「-」 (작은 칸의 빈 표시) 는 값에 넣지 않음');
  eq([F.receipt.text,F.receipt.inline,F.receipt.codes],['TOKYO, JAPAN',['JPTST'],['51']],'v0.2 라벨 줄 오른쪽 UN/LOCODE → inline · 값 줄 오른쪽 끝 멀리 떨어진 「51」 → codes (값에서 뺌)');
  eq([F.vessel.text,F.voy.text,F.pod.text],['SAMPLE STAR','101W','CAT LAI PORT'],'v0.2 본선의 호출 부호 · 항구의 LOCODE (라벨 줄) 는 값이 아님');
  eq(F.refNo.text,'REF-0001','v0.2 아래 줄이 비고 라벨 오른쪽에만 값 (Ref No.) → 그 값');
  eq([F.totalWeight.text,a.totals.weight],['12,345.000 KGM',12345],'v0.2 합계 칸 안 작은 머리 Gross / Net 은 칸 경계가 아님 → 총 중량 읽힘');
  eq([F.description.text,F.totalContainers.text,a.totals.containers],['','THREE (3) CONTAINERS ONLY.-',3],'v0.2 낱말마다 나뉜 항목도 한 묶음 · 「CONTAINERS」 (값 · 대문자) 를 머리 「Containers」 와 혼동하지 않음 → 설명 칸에 끼어들지 않음');
  const hdr=[I('Container No.',48.1,119.4,53.5),I('Seal No.',147.2,119.4,32.8),I('Size',219.2,119.4,16.4),I('Type',250,119.4,16.4),I('Number and kind',283,125.4,61.8),I('of Packages',283,113.4,45.3),
    I('Cargo Weight',368.5,119.4,49.4),I('Measurement',442.1,119.4,45.2),I('Tare',502.8,125.4,16.4),I('Weight',502.8,113.4,24.7),I('Temp',540.4,119.4,16.4)];
  const row=y=>[I('1',43,y,4.5),I('TSTU0000001',53.6,y,50.9),I('SL000001',136.9,y,37),I('1)',121,y+0.5,8.1),I('45',223.9,y,9.1),I('GP',253.9,y,9.1),I('22',314.4,y,9.2),I('BL',333.5,y,9.1),I('21,000.000',379.3,y,46.3),I('40.000',466.2,y,27.6),I('3,700',507.6,y,23)];
  const r=ACL.readNaccs([{page:1,w:595.32,items:hdr.concat(row(86.6))}]).rows[0];
  eq([r.container,r.seal,r.size,r.type,r.bales,r.cargo,r.measure,r.tare,r.conf],['TSTU0000001','SL000001','45','GP',22,21000,40,3700,'SURE'],'v0.2 컨테이너 머리는 열 가운데 위 (씰 값이 머리보다 왼쪽에서 시작) → 가장 가까운 머리 열 · 행 표시 「1)」 제외');
}
console.log('Step 3 기대값 — D-03 v4.11 renderSI 규칙');
{ const cp=FX.compass(1), ex=ACL.expected(cp);
  eq(ex.sino,1,'⑥ B/L 용 = sino 1');
  eq(ex.description,'WP#47072000#60600KGS #66BALES\n\nWASTE PAPER OCC\n\n4707.10\n\nL/C NO.: TLC0001 DATED ON OCT 01\n\nSAMPLE DEPOSIT NO.: XX\n\nFREIGHT PREPAID AS ARRANGED',
    '⑥ bl_text1 에 XX → 치환(XXKGS · XXBALES) · 품명 · HS · L/C NO.: · bl_text2 · FREIGHT PREPAID AS ARRANGED (빈 줄 사이) — 「#」 는 그대로');
  const cp2=FX.compass(2); cp2.sis[0].crcf9_bl_text1='WASTE PAPER#47072000'; const d2=ACL.expected(cp2).description;
  eq(d2,'WASTE PAPER OCC\n4707.10\nL/C NO.: TLC0002 DATED ON OCT 01\nWASTE PAPER#47072000\nSAMPLE DEPOSIT NO.: XX\nFREIGHT PREPAID AS ARRANGED','⑥ XX 없음 → 품명 · HS · L/C · bl_text1 · bl_text2 · FREIGHT (빈 줄 없음)');
  ok(ex.description.indexOf('(OLD NAME)')<0,'⑥ 품명 = S/I 명세 중 가장 최근 수정 (D-03 v4.11)');
  const cp3=FX.compass(3); cp3.sis[0].crcf9_consignee='3500000000#000/TEST-LIC#DEPOSIT\n#SAMPLE PAPER CORPORATION***'; const e3=ACL.expected(cp3).consignee;
  eq(e3,'3500000000#000/TEST-LIC#DEPOSIT\n#SAMPLE PAPER CORPORATION***','⑥ consignee 의 「#」 · 「***」 는 D-03 이 바꾸지 않고 그대로 (기대 문면 = S/I 글자 그대로)');
  eq(ACL.compareText(e3,'3500000000#000/TEST-LIC#DEPOSIT #SAMPLE PAPER\nCORPORATION***').status,'NOTATION','⑥ ACL 이 같은 글자를 다른 줄바꿈으로 → 表記差');
  eq(ACL.compareText(e3,'3500000000\n000/TEST-LIC\nDEPOSIT\nSAMPLE PAPER CORPORATION').status,'DROP','⑥ 「#」 를 줄바꿈으로 바꾸고 「***」 를 뺌 → 脱落 (글자가 다름)');
  const cp4=FX.compass(4); Object.assign(cp4.sis[0],{crcf9_shipper:null,crcf9_shipper_address:null,crcf9_shipper_tel:null,crcf9_shipper_fax:null,crcf9_shipping_mark:null});
  eq(ACL.expected(cp4).shipper,[ACL.D03.shipperName,ACL.D03.shipperAddr,ACL.D03.shipperTel+' '+ACL.D03.shipperFax].join('\n'),'⑥ S/I shipper 칸이 비면 D-03 기본값 (이름 · 주소 · TEL FAX 한 줄)');
  eq([ACL.expected(cp4).marks,ACL.expected(cp4).alsoNotify],['NO MARK',''],'⑥ shipping_mark 없음 → NO MARK · ALSO NOTIFY 는 D-03 이 비워 둠');
  eq(ACL.expected(cp).notify,'SAMPLE PAPER CO., LTD.\nNO.1 SAMPLE ROAD, SAMPLE WARD,\nHO CHI MINH CITY, VIETNAM\nTEL: 84-28-0000-0000 FAX: 84-28-0000-0001','⑥ Notify = notify_party · address · TEL FAX (D-03 NOTIFY 칸)');
  eq([ACL.polText(cp),ACL.polText({booking:{crcf9_delivery_location:'OHI CY'}})],['TOKYO, JAPAN','OHI, JAPAN'],'⑥ POL = region_japans + 「, JAPAN」 (없으면 搬入先 CY)');
  eq(ACL.substituteBlText1('TOTAL NET WEIGHT (MT): XX\nTOTAL NUMBER OF BALES: XX',66,60600,60600),'TOTAL NET WEIGHT (MT): 60.600\nTOTAL NUMBER OF BALES: 66 BALES','⑥ substituteBlText1 (DDT · NTJ 문구) 그대로 이식');
}
console.log('Step 4 비교');
{ const T=ACL.compareText;
  eq(T('A B\nC','A  B\nC').status,'MATCH','⑤ 같은 줄 · 같은 낱말 → 完全一致 (줄 안 공백 수는 PDF 에서 알 수 없음)');
  eq(T('NO.1 SAMPLE ROAD, SAMPLE WARD,\nHO CHI MINH CITY','NO.1 SAMPLE ROAD,\nSAMPLE WARD, HO CHI MINH CITY').status,'NOTATION','⑤ 줄바꿈만 다름 → 表記差');
  eq(T('SUIDOBASHI 3 5FL','SUIDOBASHI3 5FL').status,'NOTATION','⑤ 공백만 다름 → 表記差 (자동 OK 아님)');
  const d=T('LINE ONE\nL/C NO.: TEST1\nLINE THREE','LINE ONE\nLINE THREE');
  ok(d.status==='DROP'&&d.droppedLines[0]==='L/C NO.: TEST1'&&/脱落|L\/C/.test(d.ops[0].text),'④ 한 줄 빠짐 → 脱落 · 脱落行 표시',d);
  const a=T('TO ORDER OF SAMPLE BANK','TO ORDER OF SAMPLE BANK\nEXTRA LINE'); ok(a.status==='ADD'&&a.ops[0].text==='EXTRALINE'.replace('EXTRALINE','EXTRA LINE').replace(' ','')||a.ops[0].text.replace(/\s/g,'')==='EXTRALINE','④ ACL 에 한 줄 더 → 追加',a);
  const x=T('SL000101','SL000107'); eq([x.status,x.ops.map(o=>o.t+':'+o.text)],['DIFF',['drop:1','add:7']],'④ 글자 바뀜 → 相違 (脱落 + 追加)');
  const sc=ACL.compareSets([{container:'TSTU0000102',seal:'SL000102',bales:22,cargo:20200,tare:3700,conf:'SURE'},{container:'TSTU0000101',seal:'SLXXXXXX',bales:21,cargo:20100,tare:3700,conf:'SURE'},{container:'TSTU0000199',seal:'S',bales:1,cargo:1,tare:1,conf:'SURE'}],
    FX.compass(1,{blankRow:true}).containers);
  eq(sc.sets.map(s=>[s.container,s.diffs.map(x=>x.item)]),[['TSTU0000101',['シール']],['TSTU0000102',[]]],'② 컨테이너 번호로 짝 · 순서 상관없음 · 씰만 다름');
  eq([sc.aclOnly,sc.cpOnly,sc.blank],[['TSTU0000199'],['TSTU0000103'],1],'② ACL 에만 · COMPASS 에만 · 번호 빈 행 (제외)');
  const sb=ACL.compareSets([{container:'TSTU0000101',seal:'SL000101',bales:99,cargo:20100,tare:3700,conf:'SURE'}],FX.compass(1).containers.slice(0,1));
  eq(sb.sets[0].diffs.map(x=>[x.item,x.acl,x.cp]),[['Bales',99,21]],'② Bales 만 다름 → 그 세트 相違 (Bales)');
  eq([ACL.stripLocode('VUNG TAU PORT IN VIETNAM\nVNTST'),ACL.stripLocode('TOKYO, JAPAN'),ACL.stripLocode('TOKYO, JAPAN\nJPTYO')],['VUNG TAU PORT IN VIETNAM','TOKYO, JAPAN','TOKYO, JAPAN'],'(v0.2) UN/LOCODE 는 마지막 줄에 따로 있을 때만 뗌 — 「TOKYO, JAPAN」 의 JAPAN 은 지우지 않음 (v0.1 의 잘못)');
}
console.log('PDF → 읽기 → 비교 (가짜 NACCS PDF)');
{ const cp=FX.compass(1), base=FX.perfectSpec(ACL,cp);
  const run=async(spec,cpx)=>{ const pages=await R.readItems(await N.build(spec)); return {pages, acl:ACL.readNaccs(pages), c:ACL.compareOne(ACL.readNaccs(pages),cpx||cp)}; };
  let r=await run(base); eq([r.c.verdict,Object.keys(r.c.kinds),r.c.xx],['完全一致',['XX残存:Description of Goods'],['Description of Goods']],'① 값이 라벨보다 먼저 그려진 PDF → 完全一致 · ⑦ XX 残存 별도 표시');
  ok(r.pages[0].items.findIndex(i=>i.s==='Shipper')>r.pages[0].items.findIndex(i=>i.s==='BK1000001'),'① (확인) pdf.js 글자 순서에서 값이 라벨보다 먼저');
  const s2=JSON.parse(J(base)); s2.fields.booking=['BK9999999']; r=await run(s2);
  ok(r.c.verdict==='相違あり'&&r.c.kinds['BOOKING No. 相違']===1,'③ 부킹 번호 다름 → BOOKING No. 相違',r.c.kinds);
  const cp20=FX.compass(9,{containers:20}), s3=FX.perfectSpec(ACL,cp20); r=await run(s3,cp20);
  ok(r.pages.length===4&&r.acl.rows.length===20&&r.acl.rows.filter(x=>x.page===1).length===1&&r.acl.rows.filter(x=>x.page===3).length===12&&r.acl.rows.filter(x=>x.page===4).length===7&&r.c.sets.sets.every(s=>s.ok)&&r.c.verdict==='完全一致','⑦ (실제 모양) 1쪽 1줄 · 2쪽 이어지는 머리 칸 · 3쪽 12줄 · 4쪽 7줄 → 20 세트 대조',{rows:r.acl.rows.map(x=>x.page).join(''),v:r.c.verdict,k:r.c.kinds});
  const s4=JSON.parse(J(base)); s4.overflow='THIS IS A VERY LONG LINE OF TEXT THAT RUNS PAST THE DESCRIPTION CELL INTO THE NEXT CELL'; r=await run(s4);
  ok(r.c.verdict==='読取確認要'&&r.c.kinds['読取確認要:Description of Goods']===1,'② 셀을 넘친 값 → 그 칸은 비교하지 않고 読取確認要',r.c.kinds);
  const s5=JSON.parse(J(base)); s5.fields.hsMain=['-']; delete s5.fields.marks; r=await run(s5);
  eq(r.c.items.find(i=>i.key==='marks').status,'DROP','Marks 값 없음 → NO MARK 脱落');
  const sc=await R.readItems(await N.build({kind:'SCAN'})), ot=await R.readItems(await N.build({kind:'OTHER'}));
  eq([ACL.classifyFormat(sc).format,ACL.classifyFormat(ot).format,ACL.classifyFormat(r.pages).format],['SCAN','OTHER','NACCS'],'⑧ 스캔 · 다른 양식 → 読取対象外 / NACCS');
}
console.log('⑨ 저장 경로 문지기 · CSV · summary');
{ ok(ACL.guardOut(ACL.SP_OUT+'/ACL_x/results.json')===true,'⑨ ACL_bench/ 아래 → 허용');
  ok(throws(()=>ACL.guardOut('古紙/-. AI 活用/D-00/x.json'),/書き込み禁止/)&&throws(()=>ACL.guardOut(ACL.SP_OUT+'/../x.json'))&&throws(()=>ACL.guardOut('古紙/-. 古紙書類/▲ 書類作成中/NFK2601-01/x.pdf'))&&throws(()=>ACL.guardOut(ACL.SP_OUT+'x/y')),'⑨ 다른 경로 · 「..」 · 원본 폴더 · 앞부분만 같은 경로 → 막힘');
  ok(/^ACL_\d{8}-\d{6}$/.test(ACL.runId(new Date('2026-11-17T01:02:03Z'))),'실행 ID ACL_yyyymmdd-hhmmss');
  const run={run_id:'ACL_T',version:'0.1',started:'s',results:[{invoice:'A',format:'NACCS',verdict:'相違あり',kinds:{'BOOKING No. 相違':1},xx:[],items:[{group:'g',label:'l',status:'DIFF',kind:'BOOKING No. 相違',expected:'x,"y"',actual:'z\nw',detail:''}]},{invoice:'B',format:'SCAN',verdict:'読取対象外',why:'スキャン',kinds:{'読取対象外:SCAN':1},items:[]}]};
  const csv=ACL.toCsv(run); ok(csv.charCodeAt(0)===0xFEFF&&/"x,""y"""/.test(csv)&&/"z\nw"/.test(csv)&&csv.split('\r\n').length===4,'CSV: BOM · 따옴표 · 줄바꿈 · Invoice × 항목 한 줄 (읽기 대상 밖은 1줄)');
  const md=ACL.summaryMd(run); ok(/\| 相違あり \| 1 \|/.test(md)&&/\| BOOKING No\. 相違 \| 1 \| 1 \|/.test(md)&&/✦ Powered by LEENAI Automation System/.test(md),'summary.md: 판정 · 차이 종류 · 푸터');
}
console.log('unit pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
