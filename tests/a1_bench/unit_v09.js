/* a1_bench v0.9 단위 시험 — 지시서 D00_A1_시험도구v0.9 Step 1 (인도 장소 = 실제 항구) · 2 (po_vo 종류) · 3 (LC 지정 문구) · 4 (나라 기본과 다름) · 5 (새 업체 빌려 쓰기)
   node unit_v09.js [a1_bench.html]   (가짜 데이터만 — 번호 · 회사 · 주소 모두 가짜) */
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const sc=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
const ctx={console}; vm.createContext(ctx);
vm.runInContext(sc('a1-core')+'\n;this.A1C=A1C;',ctx); vm.runInContext(sc('a1-master')+'\n;this.A1M=A1M;',ctx);
const app=sc('a1-app'), fnSrc=n=>{ const i=app.indexOf('function '+n+'('); const j=app.indexOf('\nfunction ',i+1); return app.slice(i,j); };
vm.runInContext(fnSrc('r2ExtraText')+'\n;this.r2ExtraText=r2ExtraText;',ctx);
const {A1M,A1C}=ctx; let pass=0,fail=0;
const J=x=>JSON.stringify(x);
const eq=(name,got,exp)=>{ const g=J(got), e=J(exp); if(g===e){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,'\n   got',g,'\n   exp',e);} };
const ok=(name,c,info)=>{ if(c){pass++;console.log('PASS',name);} else {fail++;console.log('FAIL',name,info===undefined?'':J(info));} };
const item=(no,date,buyer,bank,tags,sis,extra)=>Object.assign({no,date,buyer,bankKey:bank,contractPo:'',country:'VIETNAM',pod:'',lc:{tags,lcNo:(tags['20']||'').split('\n')[0],text:Object.keys(tags).map(k=>':'+k+': '+tags[k]).join('\n')},sis},extra||{});

/* ── Step 1 인도 장소 = 실제 항구 ── */
console.log('Step 1 — place_of_delivery 는 실제 항구');
const T1={'20':'ILC0000201','50':'DELTA PAPER CORPORATION\nSAMPLE A INDUSTRIAL PARK, SAMPLE WARD','45A':'WASTE PAPER\nCIF CAI MEP OR CAT LAI OR SP-ITC PORT IN VIETNAM'};
const p1=(no,date)=>item(no,date,'DELTA','BIC:BANKVNVX',T1,[{crcf9_sino:1,crcf9_place_of_delivery_1:'CAT LAI PORT IN VIETNAM',crcf9_port_of_discharge:'CAT LAI, VIETNAM'}],{pod:'CAT LAI'});
const k1=A1M.buildMasterDraft([p1('LRS-2601SG1','2026-01-05'),p1('LRS-2602SG1','2026-02-05')]).keys[0], f1=c=>k1.fields.find(f=>f.col===c);
eq('1 직전 S/I 「CAT LAI PORT IN VIETNAM」 + 계약 POD CAT LAI → 틀 {POD} PORT IN VIETNAM (確実)',[f1('crcf9_place_of_delivery_1').status,f1('crcf9_place_of_delivery_1').recommended],['確実','{POD} PORT IN VIETNAM']);
eq('1 {POD} 는 place_of_delivery 칸에만 (port_of_discharge 는 그대로)',f1('crcf9_port_of_discharge').recommended,'CAT LAI, VIETNAM');
const mf1=A1M.buildMasterFor(p1('LRS-2603SG1','2026-03-05'),[p1('LRS-2601SG1','2026-01-05'),p1('LRS-2602SG1','2026-02-05')]), b1=A1M.masterPromptBlock(mf1);
ok('1 ③ 블록 {POD} 줄 (v0.10: L/C 仕向港候補の 1 港 — v0.9 「実際の仕向港」 규칙은 지움)',b1.indexOf('{POD}=L/C 仕向港候補の 1 港 (place_of_delivery 欄だけ · 1 欄に 1 港)。')>=0&&b1.indexOf('実際の仕向港')<0,b1);
ok('1 ③ 블록 틀 sino 1 crcf9_place_of_delivery_1 「{POD} PORT IN VIETNAM」',b1.indexOf('sino 1 crcf9_place_of_delivery_1 テンプレ(確実): "{POD} PORT IN VIETNAM"')>=0);
eq('1 master_check: 실제 항구 → SAME · LC 후보 나열 → DIFF',[A1M.masterCheck(mf1,1,'crcf9_place_of_delivery_1','CAT LAI PORT IN VIETNAM'),A1M.masterCheck(mf1,1,'crcf9_place_of_delivery_1','CAI MEP OR CAT LAI OR SP-ITC PORT IN VIETNAM')],['MASTER_SAME','MASTER_DIFF']);
const x1=ctx.r2ExtraText({podContract:'CAT LAI',podBookings:['CAT LAI'],poNo:'',wording:null});
ok('1 ③ 입력 — 계약 · 부킹 POD 는 참고 (v0.10: 「ブッキング時の選択候補に入っているべき港」 · 実際の仕向港 규칙 없음)',/参考 — ブッキング時の選択候補に入っているべき港: 契約 POD CAT LAI \/ ブッキング POD CAT LAI/.test(x1)&&x1.indexOf('実際の仕向港')<0,x1);

/* ── Step 2 po_vo 종류 ── */
console.log('Step 2 — po_vo 는 마스터의 종류');
const T2={'20':'ILC0000301','50':'DELTA PAPER CORPORATION\nSAMPLE A INDUSTRIAL PARK, SAMPLE WARD','45A':'WASTE PAPER\nPO NO. OCC20250001'};
const p2=(no,date,po,cpo)=>item(no,date,'DELTA','BIC:BANKVNVX',T2,[{crcf9_sino:1,crcf9_po_vo:po}],{contractPo:cpo||''});
const pri2=[p2('LRS-2601SG1','2026-01-05','1111/2222','1111/2222'),p2('LRS-2602SG1','2026-02-05','3333/4444','3333/4444')];   // v0.10: po_vo = 각 계약 po_no → 契約PO型 (v0.9 의 その他 규칙은 契約PO型 일 때만)
const mf2=A1M.buildMasterFor(p2('LRS-2603SG1','2026-03-05','','5555/6666'),pri2), b2=A1M.masterPromptBlock(mf2);
eq('2 마스터 po_vo 종류 その他 · 형 9999/9999',[A1M.poVoKindOf(mf2).kind,A1M.poVoKindOf(mf2).shape],['その他','9999/9999']);
ok('2 ③ 블록에 종류 · 규칙 문구 (v0.10: 契約PO型)',b2.indexOf('- po_vo 欄: マスター種類 sino 1 契約PO型 [2件中 2件]。')>=0&&b2.indexOf('固定値型 → 固定値をそのまま。契約PO型 → 販売契約の番号。L/C の PO は種類が L/C PO型 のときだけ。')>=0,b2);
eq('2 LC PO OCC20250001 추천 + 판매계약 po_no 5555/6666 → 5555/6666 (LC PO 아님)',A1M.poVoRule(mf2,1,'OCC20250001','5555/6666',mf2.ctx.pos).value,'5555/6666');
eq('2 po_no 없음 → 빈칸 (未完成)',[A1M.poVoRule(mf2,1,'OCC20250001','',mf2.ctx.pos).value,A1M.poVoRule(mf2,1,'OCC20250001','',mf2.ctx.pos).changed],['',true]);
eq('2 빈 추천 + po_no 있음 → 계약 번호',A1M.poVoRule(mf2,1,'','5555/6666',mf2.ctx.pos).value,'5555/6666');
eq('2 이미 계약 번호면 그대로',A1M.poVoRule(mf2,1,'5555/6666','5555/6666',mf2.ctx.pos).changed,false);
const pri2b=[p2('LRS-2601SG1','2026-01-05','OCC20250001'),p2('LRS-2602SG1','2026-02-05','OCC20250001')], mf2b=A1M.buildMasterFor(p2('LRS-2603SG1','2026-03-05','','5555/6666'),pri2b);
eq('2 종류 バイヤーPO 면 손대지 않음',[A1M.poVoKindOf(mf2b).kind,A1M.poVoRule(mf2b,1,'OCC20250001','5555/6666',mf2b.ctx.pos).changed],['バイヤーPO',false]);
ok('2 ③ 입력 【バイヤー契約番号】',/【バイヤー契約番号 \(販売契約 cr49f_po_no\)】\n5555\/6666/.test(ctx.r2ExtraText({podContract:'',podBookings:[],poNo:'5555/6666',wording:null})));

/* ── Step 3 LC 지정 문구 ── */
console.log('Step 3 — LC 지정 문구 읽기 · 값 이름 = 자리');
const F46='1/ SIGNED COMMERCIAL INVOICE IN 03 ORIGINALS.\n2/ THREE PHOTOCOPIES OF TELEX RELEASED BILL OF LADING MARKED FREIGHT PREPAID, SHOWING CONSIGNEE AND NOTIFY APPLICANT AS FOLLOWING FORMAT: 0300000002 # 999/GPMT-BTNMT # SECURITY DEPOSIT NUMBER # SAMPLE PAPER CORPORATION # SAMPLE A INDUSTRIAL PARK, SAMPLE WARD, HO CHI MINH CITY, VIETNAM # TEL +84 200 0000000, SHOWING THE NAME AND ADDRESS OF SHIPPING AGENT.';
const T3={'20':'ILC0000401','50':'SAMPLE PAPER CORPORATION\nSAMPLE A INDUSTRIAL PARK, SAMPLE WARD,\nHO CHI MINH CITY, VIETNAM','46A':F46};
const c3=A1M.lcContext({tags:T3,lcNo:'ILC0000401',text:''},''), w3=A1M.lcWording(T3,c3);
eq('3 FORMAT 지시 인식',w3&&w3.kind,'FORMAT');
ok('3 틀 = {TAX_ID} # {PERMIT} # {DEPOSIT} # {APPLICANT_NAME} # … (값 이름 SECURITY DEPOSIT NUMBER = 자리)',w3&&/^\{TAX_ID\} # \{PERMIT\} # \{DEPOSIT\} # \{APPLICANT_NAME\} # /.test(w3.template),w3);
ok('3 지시 문구 끝 = 「, SHOWING THE NAME …」 앞 · 300자 이내',w3&&!/SHIPPING AGENT/.test(w3.text)&&w3.text.length<=300&&/^SHOWING CONSIGNEE AND NOTIFY APPLICANT AS FOLLOWING FORMAT: 0300000002/.test(w3.text),w3&&w3.text);
ok('3 S/I 「0300000002#999/GPMT-BTNMT#DEPOSIT#SAMPLE PAPER CORPORATION***」 = LC 지정과 같음',A1M.siMatchesWording('0300000002#999/GPMT-BTNMT#DEPOSIT#SAMPLE PAPER CORPORATION***',w3.template,c3));
ok('3 「#DEPOSIT : XX#」 표기도 같음 (D12 — 관행 표기)',A1M.siMatchesWording('0300000002#999/GPMT-BTNMT#DEPOSIT : XX#SAMPLE PAPER CORPORATION***',w3.template,c3));
ok('3 허가번호 빠짐 → 다름',!A1M.siMatchesWording('0300000002#DEPOSIT#SAMPLE PAPER CORPORATION***',w3.template,c3));
ok('3 TO ORDER OF 은행 → 다름',!A1M.siMatchesWording('TO ORDER OF SAMPLE BANK',w3.template,c3));
const kinds=[['FULL SET OF CLEAN ON BOARD OCEAN BILLS OF LADING MADE OUT TO ORDER OF SAMPLE BANK, HANOI MARKED FREIGHT PREPAID','ORDER_OF','TO ORDER OF SAMPLE BANK'],
  ['FULL SET OF B/L SHOWING CONSIGNEE AND NOTIFY APPLICANT WITH FULL ADDRESS, MARKED FREIGHT PREPAID','SHOWING','SHOWING CONSIGNEE AND NOTIFY APPLICANT WITH FULL ADDRESS'],
  ['NON-NEGOTIABLE SEA WAYBILL CONSIGNED TO SAMPLE BANK, NOTIFY APPLICANT','CONSIGNED_TO','CONSIGNED TO SAMPLE BANK']];
kinds.forEach(([t,k,txt])=>{ const w=A1M.lcWording({'46A':'1/ '+t+'.'}); eq('3 '+k+' 인식',[w&&w.kind,w&&w.text],[k,txt]); });
eq('3 B/L 조항에 지시 없음 → null · consigneeWording 빈칸',[A1M.lcWording({'46A':'1/ SIGNED COMMERCIAL INVOICE.'}),A1M.consigneeWording({'46A':'1/ SIGNED COMMERCIAL INVOICE.'})],[null,'']);
const FC=A1C.formatCheck, LW={found:true,match:true};
eq('3 note 「L/C指定文言」 만 → LC_REQUIRED_WORDING 아님',FC('NEW TEXT','OLD TEXT',true,[],'L/C指定文言',null),'FORMAT_CHANGED');
eq('3 지시 찾음 + 값이 L/C 틀과 같음 → LC_REQUIRED_WORDING',FC('NEW TEXT','OLD TEXT',true,[],'',LW),'LC_REQUIRED_WORDING');
eq('3 지시 찾음 + note → LC_REQUIRED_WORDING',FC('NEW TEXT','OLD TEXT',true,[],'L/C指定文言',{found:true,match:false}),'LC_REQUIRED_WORDING');
eq('3 직전 S/I 와 같으면 SAME_AS_PRIOR 가 먼저',FC('SAME','SAME',true,[],'L/C指定文言',LW),'SAME_AS_PRIOR');
eq('3 직전 없음 · 지시 찾음 · 같음 → LC_REQUIRED_WORDING',FC('X','',false,[],'',LW),'LC_REQUIRED_WORDING');
const p3=(no,date)=>item(no,date,'SAMPLEP','BIC:BANKVNVX',T3,[{crcf9_sino:1,crcf9_consignee:'0300000002#999/GPMT-BTNMT#DEPOSIT#SAMPLE PAPER CORPORATION***'}]);
const k3=A1M.buildMasterDraft([p3('LRS-2601SP1','2026-01-05'),p3('LRS-2602SP1','2026-02-05')]).keys[0];
eq('3 마스터 지시문 짝: 종류 FORMAT · 「LC 지정과 같음」',[k3.consignee_wording[0].lc_kind,k3.consignee_wording[0].same_as_lc,k3.consignee_wording[0].contracts.length],['FORMAT',true,2]);
const mf3=A1M.buildMasterFor(p3('LRS-2603SP1','2026-03-05'),[p3('LRS-2601SP1','2026-01-05'),p3('LRS-2602SP1','2026-02-05')]);
ok('3 ③ 블록: L/C 지정 형 · (LC 指定と同じ)',/consignee 指示文の対応 \(sino 1\):\n  L\/C 46A「SHOWING CONSIGNEE[^\n]*\(L\/C 指定の形 "\{TAX_ID\} # \{PERMIT\} # \{DEPOSIT\} # \{APPLICANT_NAME\}[^\n]*\(LC 指定と同じ\)/.test(A1M.masterPromptBlock(mf3)),A1M.masterPromptBlock(mf3));
const x3=ctx.r2ExtraText({podContract:'',podBookings:[],poNo:'',wording:w3});
ok('3 ③ 입력 【L/C 指定文言】 종류 · 형 · D12 규칙',/【L\/C 指定文言 \(46A B\/L 条項 · コードで検出\)】\nFORMAT: 「SHOWING CONSIGNEE/.test(x3)&&/→ 形: "\{TAX_ID\} # \{PERMIT\} # \{DEPOSIT\}/.test(x3)&&/S\/I の DEPOSIT・XX はその場所を埋める慣行表記で、L\/C 違反ではない/.test(x3),x3);

/* ── Step 4 나라 기본과 다름 ── */
console.log('Step 4 — 나라 기본과 다름 (マスター草案)');
const bankT=no=>({'20':'ILC'+no,'50':'BUYER '+no+' CO., LTD\nSAMPLE STREET '+no+', SAMPLE CITY','46A':'1/ FULL SET OF CLEAN ON BOARD OCEAN BILLS OF LADING MADE OUT TO ORDER OF SAMPLE BANK MARKED FREIGHT PREPAID.'});
const ord=(no,date,buyer)=>item(no,date,buyer,'BIC:BANKVNVX',bankT(no.slice(-3)),[{crcf9_sino:1,crcf9_consignee:'TO ORDER OF SAMPLE BANK',crcf9_notify_party:'BUYER '+no.slice(-3)+' CO., LTD'}]);
const fmt=(no,date)=>item(no,date,'SAMPLEP','BIC:BANKVNVY',T3,[{crcf9_sino:1,crcf9_consignee:'0300000002#999/GPMT-BTNMT#DEPOSIT#SAMPLE PAPER CORPORATION***',crcf9_notify_party:'SAMPLE PAPER CORPORATION'},{crcf9_sino:2,crcf9_notify_party:'SAMPLE PAPER CORPORATION'}]);
const th=(no,date)=>Object.assign(ord(no,date,'THB1'),{country:'THAILAND'});
const d4=A1M.buildMasterDraft([ord('LRS-2601AA1','2026-01-05','AAA'),ord('LRS-2602AA1','2026-02-05','AAA'),ord('LRS-2601BB1','2026-01-06','BBB'),fmt('LRS-2601SP1','2026-01-07'),fmt('LRS-2602SP1','2026-02-07'),th('LRS-2601TH1','2026-01-08')]);
const kb=b=>d4.keys.find(k=>k.buyer===b);
eq('4 키 모양: consignee 종류',[kb('AAA').shape.consignee,kb('SAMPLEP').shape.consignee],['TO ORDER OF 銀行','税#許可#DEPOSIT型']);
ok('4 다수와 같은 키 → 표시 없음',!kb('AAA').country_diff.differs&&!kb('BBB').country_diff.differs);
ok('4 다른 키 → 「国の基本と違う」 + consignee · sino 한 줄 · LC 指定',kb('SAMPLEP').country_diff.differs&&/^国の基本と違う: consignee 税#許可#DEPOSIT型 \(国の基本 TO ORDER OF 銀行\) — LC 指定 \/ sino 1\+2 \(国の基本 1\)/.test(kb('SAMPLEP').country_diff.text)&&kb('SAMPLEP').country_diff.lc,kb('SAMPLEP').country_diff);
ok('4 나라에 키 1개 (THAILAND) → 비교 안 함',!kb('THB1').country_diff.differs);
const rows4=A1M.toCsvRows(d4); ok('4 CSV 열 country · country_diff',A1M.CSV_HEAD.slice(-2).join()==='country,country_diff'&&rows4.some(r=>r.buyer==='SAMPLEP'&&/国の基本と違う/.test(r.country_diff)));
ok('4 summary 키 표에 国 · 国の基本と違う 열',/\| LCと違い \| 国 \| 国の基本と違う \|/.test(A1M.toSummaryMd(d4,{}))&&/\| VIETNAM \| consignee 税#許可#DEPOSIT型/.test(A1M.toSummaryMd(d4,{})));

/* ── Step 5 새 업체 빌려 쓰기 ── */
console.log('Step 5 — 새 업체 빌려 쓰기 (R2 마스터)');
const vn=(buyer,no,date,tax,permit,app,bank,em)=>item(no,date,buyer,bank||'BIC:BANKVNVX',{'20':'ILC'+no.slice(-4),'50':app+'\nSAMPLE INDUSTRIAL ZONE '+no.slice(-3)+', SAMPLE PROVINCE'},
  [{crcf9_sino:1,crcf9_consignee:tax+'#'+permit+'#DEPOSIT#'+app+'***',crcf9_address:'SAMPLE INDUSTRIAL ZONE '+no.slice(-3)+', SAMPLE PROVINCE EMAIL: '+em}]);
const pri5=[vn('XXX','LRS-2601XA1','2026-01-05','0300000002','999/GPMT-BTNMT','XRAY PAPER CO','BIC:BANKVNVX','X1@EXAMPLE.COM'),
  vn('XXX','LRS-2602XA1','2026-02-05','0300000002','999/GPMT-BTNMT','XRAY PAPER CO','BIC:BANKVNVX','X1@EXAMPLE.COM'),
  vn('YYY','LRS-2601YA1','2026-01-06','0300000003','888/GPMT-BTNMT','YANKEE PAPER CO','BIC:BANKVNVY','Y1@EXAMPLE.COM'),
  vn('YYY','LRS-2602YA1','2026-02-06','0300000003','888/GPMT-BTNMT','YANKEE PAPER CO','BIC:BANKVNVY','Y1@EXAMPLE.COM'),
  vn('YYY','LRS-2609YA1','2026-09-06','0300000009','777/GPMT-BTNMT','YANKEE PAPER CO','BIC:BANKVNVY','Y9@EXAMPLE.COM')];   // 뒤 계약 (누설 시험)
const tgt5=vn('ZZZ','LRS-2603ZA1','2026-03-05','','','ZULU PAPER CO','BIC:BANKVNVZ','');
const mf5=A1M.buildMasterFor(tgt5,pri5.concat([tgt5])), b5=mf5?A1M.masterPromptBlock(mf5):'';
eq('5 첫 거래 베트남 바이어 → 같은 나라 다수 틀 빌림',mf5&&[mf5.borrowed.level,mf5.firstDeal],['country',true]);
ok('5 블록: 借用元: 同じ国 VIETNAM の多数形 · 初回取引 — 全体確認',/借用元: 同じ国 VIETNAM の多数形/.test(b5)&&/\n初回取引 — 全体確認\n/.test(b5),b5);
ok('5 consignee 틀 {TAX_ID}#{PERMIT}#DEPOSIT#{APPLICANT_NAME}*** · テンプレ(参考・借用)',b5.indexOf('sino 1 crcf9_consignee テンプレ(参考・借用): "{TAX_ID}#{PERMIT}#DEPOSIT#{APPLICANT_NAME}***" [4件中 4件]')>=0,b5);
ok('5 세금번호 · 허가번호 · EMAIL → 未完成(問い合わせ要) 규칙',/\{TAX_ID\}・\{PERMIT\}・\{EMAIL\}・\{TEL\} はこのバイヤー固有の値。L\/C にあれば L\/C の値、無ければ空欄のまま入れ、note に「未完成\(問い合わせ要\)」/.test(b5));
ok('5 다른 바이어의 번호 · EMAIL 이 들어가지 않음',['0300000002','0300000003','0300000009','999/GPMT','888/GPMT','777/GPMT','X1@','Y1@','Y9@'].every(v=>b5.indexOf(v)<0),b5);
ok('5 누설 금지 — 뒤 계약 · 자기 자신 0회',mf5.from.indexOf('LRS-2609YA1')<0&&mf5.from.indexOf('LRS-2603ZA1')<0&&b5.indexOf('LRS-2609YA1')<0&&mf5.from.length===4,mf5.from);
eq('5 빌린 틀은 確実 아님 — sure 없음 · master_check NO_MASTER · 허용 낱말에 고유값 없음',[J(A1M.sureTemplates(mf5)),A1M.masterCheck(mf5,1,'crcf9_consignee','X'),A1M.masterAllowWords(mf5).some(v=>/0300000|GPMT|@/.test(v))],['{}','NO_MASTER',false]);
const tgt5b=vn('XXX','LRS-2603XB1','2026-03-05','','','XRAY NEW BRANCH CO','BIC:BANKVNVX',''), mf5b=A1M.buildMasterFor(tgt5b,pri5);
eq('5 같은 바이어 × 은행의 다른 신청 회사 → 첫 단계 (buyer_bank) · 초회 아님',mf5b&&[mf5b.borrowed.level,mf5b.firstDeal],['buyer_bank',false]);
const tgt5c=vn('ZZZ','LRS-2603ZB1','2026-03-05','','','ZULU PAPER CO','BIC:BANKVNVY',''), mf5c=A1M.buildMasterFor(tgt5c,pri5);
eq('5 같은 나라 × 같은 은행 이 있으면 그쪽 먼저 (country_bank)',mf5c&&mf5c.borrowed.level,'country_bank');
const tgt5d=Object.assign(vn('QQQ','LRS-2603QA1','2026-03-05','','','QUEBEC CO','BIC:BANKTHBK',''),{country:'THAILAND'});
eq('5 같은 나라 앞선 계약 없음 → 마스터 없음',A1M.buildMasterFor(tgt5d,pri5),null);
eq('5 isFirstDeal',[A1M.isFirstDeal(tgt5,pri5),A1M.isFirstDeal(tgt5b,pri5)],[true,false]);
const same5=A1M.buildMasterFor(vn('XXX','LRS-2603XA1','2026-03-05','','','XRAY PAPER CO','BIC:BANKVNVX',''),pri5);
ok('5 같은 키가 있으면 빌리지 않음 (v0.8 그대로 · 確実)',same5&&!same5.borrowed&&same5.key.fields.some(f=>f.status==='確実'));
console.log('unit_v09 pass',pass,'fail',fail); process.exitCode=fail?1:0;
