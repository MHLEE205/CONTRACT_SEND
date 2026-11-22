/* acl_bench v0.3 시험 — 담당자 메일 실적 맞대기 · NACCS 표시 칸 · 実績表記 · 낱말 경계 공백.  node staff.js [html]
   메일 · 회사 · 번호 · 주소는 모두 가짜 (레포 공개). 실제 메일 CSV 는 쓰지 않는다. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../acl_bench.html'),'utf8');
const ACL=new Function('module',html.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,700));} };
const eq=(got,exp,m)=>ok(J(got)===J(exp),m,{got,exp});
const NL=String.fromCharCode(10), q=s=>'"'+String(s).replace(/"/g,'""')+'"';
const HEAD=['発信者','発信日時(JST)','月','件名','返信/転送','件名規則','宛先(To)ドメイン','CCドメイン','添付有無','添付ファイル名','インライン画像数','Invoice番号','BKG/BL番号','契約番号(LRS)','本文(先頭300字)','internetMessageId'];
/* 가짜 메일 한 줄 */
const mrow=(at,rule,inv,bkg,body,subj)=>[ 'staff@example.test',at,'2026-09',subj||('TEST '+(inv||bkg)),'',rule,'example.test','','無','','0',inv||'',bkg||'','',body,'<id-'+at.replace(/\D/g,'')+'@example.test>'];
const csvOf=rows=>'﻿'+[HEAD].concat(rows).map(r=>r.map(q).join(',')).join('\r\n')+'\r\n';
const SIG=' 株式会社テスト 担当 E-mail : staff@example.test 差出人: 相手 <x@example.test> 送信: 2026 年 9 月 1 日 本登録をお願いします →古い';   // 引用部分 (対も種類も見ない)

console.log('1 CSV 파서');
{ const t=csvOf([mrow('2026-09-01 10:00:00','本登録依頼','NFK2601-01; NFK2601-02','BK1000001','ACL 1行目'+NL+'2行目, "引用" あり')]);   // v0.9: ACL の語がないメールは数えない → 本文に ACL
  const rows=ACL.parseCsv(t); eq([rows.length,rows[0][0],rows[1][14]],[2,'発信者','ACL 1行目'+NL+'2行目, "引用" あり'],'① BOM 제거 · 따옴표 안 줄바꿈 · 쉼표 · "" → " (직접 split 아님)');
  const M=ACL.mailsFromCsv(t); eq([M.mails[0].invoices,M.mails[0].bkgs,M.mails[0].at],[['NFK2601-01','NFK2601-02'],['BK1000001'],'2026-09-01T10:00:00+09:00'],'① 「; 」 여러 값 · JST 시각');
  let err=''; try{ ACL.mailsFromCsv('a,b\r\n1,2\r\n'); }catch(e){ err=e.message; } ok(/列が足りない/.test(err),'① 열이 모자라면 오류 (조용히 넘어가지 않음)');
}
console.log('2 메일 종류');
{ const K=ACL.mailKind;
  eq([K('D/Rを確認致しました。本登録お願いします。'),K('Notify Party欄 SAMPLE CO.,LTD →SAMPLE CO., LTD ご訂正をお願いできますでしょうか。'),K('本件、いかがでしょうか 本日CUT 日なので'),
      K('DRのご訂正ありがとうございます。内容相違ございませんので、こちらで本登録をお願いいたします。')],['本登録','訂正依頼','その他','本登録'],'② 本登録 / 訂正依頼 / その他 / 「ご訂正ありがとうございます…本登録を」 → 本登録 (F4)');
  ok(ACL.MAIL_RULE.hon.length>=9&&ACL.MAIL_RULE.fix.indexOf('→')>=0&&ACL.MAIL_RULE.blStage&&ACL.MAIL_RULE.fixTag,'② 판단 낱말은 코드 한 곳 (MAIL_RULE · v0.9 토르_2 truth.py 낱말)');
  eq(K('ACL Freight As Arranged へ 1 表記をお願いします'),'その他','② 목록에 없는 말 (表記をお願い) → その他 (낱말을 늘리지 않음 · 보고서에)');
}
/* 가짜 결과 (도구 결과 모양) */
const fld=t=>({text:t, conf:'SURE'});
function res(n, o){ o=o||{}; const inv='NFK2601-'+String(n).padStart(2,'0');
  const F=Object.assign({shipper:fld('SAMPLE EXPORT CO., LTD.'), notify:fld('SAMPLE PAPER CO., LTD.'), description:fld('WASTE PAPER OCC'), vessel:fld('SAMPLE STAR'), voy:fld('101W'),
    wayBill:fld(''), received:fld(''), originals:fld('3'), freight:fld('1'), agentSign:fld('1'), shipperMail:fld('DOCS@EXAMPLE.TEST')}, o.F||{});
  const items=(o.items||[]).map(i=>Object.assign({group:'S/I 文面', detail:''},i));
  const kinds={}; items.forEach(i=>{ if(i.kind) kinds[i.kind]=(kinds[i.kind]||0)+1; });
  return {invoice:inv, format:'NACCS', verdict:ACL.verdictOf(items), items, kinds, xx:[], fileModified:o.mod||'2026-09-20T00:00:00Z',
    read:{fields:F, rows:o.rows||[{container:'TSTU0000101', seal:'SL000101'}]}, cp:{booking_no:'BK'+(1000000+n), bl_number:'TESTBL'+String(n).padStart(4,'0')}, meta:Object.assign({buyer:'BUYER-A', pay:'LC', carrier:'CARRIER-X', forwarder:'FWD-1', contract:'SC-'+n, country:'VIETNAM'},o.meta||{})}; }
const diffIt=(key,label,exp,act)=>{ const r=ACL.compareText(exp,act); return {key, label, status:r.status, expected:exp, actual:act, kind:r.status==='MATCH'?'':'相違:'+label}; };
const P={from:'2026-08-14T09:00:00+09:00', to:'2026-11-12T18:00:00+09:00'};

console.log('3 · 4 연결 · 실적');
{ const R=[res(1,{mod:'2026-09-01T00:00:00Z'}),res(2,{mod:'2026-09-01T00:00:00Z'}),res(3,{mod:'2026-09-01T00:00:00Z'}),res(4,{mod:'2026-09-01T00:00:00Z'}),res(5,{mod:'2026-07-01T00:00:00Z'}),res(6,{mod:'2026-09-11T00:00:00Z'})];
  const t=csvOf([mrow('2026-09-01 10:00:00','本登録依頼','NFK2601-01','','D/Rを確認致しました。本登録お願いします。'),
    mrow('2026-09-02 10:00:00','ACL/DR 確認・訂正','','BK1000002','Voy.No. 100W →101W ご訂正をお願いします。'),
    mrow('2026-09-03 10:00:00','ACL/DR 確認・訂正','','BK1000003; TESTBL0004','ACL 本件、いかがでしょうか。'),
    mrow('2026-09-04 10:00:00','ACL/DR 確認・訂正','','ZZ9999999','ACL 本件、いかがでしょうか。'),
    mrow('2026-09-05 10:00:00','本登録依頼','NFK2699-99','','本登録をお願いします。'),
    mrow('2026-09-10 10:00:00','ACL/DR 確認・訂正','NFK2601-06','','Seal No SL000199 →SL000101 ご訂正をお願いします。'),
    mrow('2026-09-11 10:00:00','船積書類送付','NFK2601-04','','本登録をお願いします。')]);
  const M=ACL.mailsFromCsv(t), S=ACL.applyStaff(R,M), rec=n=>R[n-1].staff.record;
  eq([M.mails.length,M.counts],[7,{本登録:3,訂正依頼:2,その他:2}],'③ v0.9: 件名規則 으로 거르지 않음 (船積書類送付 件名이라도 본문 자기 부분에 本登録 → 本登録) · 종류별 통수');
  eq(R[0].staff.mails[0].how+'|'+R[1].staff.mails[0].how,'Invoice|BKG/BL','③ Invoice 번호 있음 → Invoice · 비면 BKG/BL 로 (COMPASS 부킹 번호 글자 그대로)');
  eq([rec(3),rec(4)],['その他のみ','本登録のみ'],'③ BKG 2개 (부킹 번호 · B/L 번호) → 두 Invoice 모두 (04 는 v0.9 에서 船積書類送付 件名의 本登録 도 셈)');
  eq(S.unlinked.map(u=>u.why),['Invoice 番号なし · BKG/BL 一致なし','Invoice が今回の対象にない · BKG/BL も一致なし'],'③ 못 찾음 → 紐付けなし 목록 (버리지 않음)');
  eq([rec(1),rec(2),rec(3),rec(5),rec(6)],['本登録のみ','訂正依頼','その他のみ','期間外','訂正依頼'],'④ 실적: 本登録のみ · 訂正依頼 · その他のみ · 期間外 (ACL 파일이 CSV 기간 밖)');
  const R2=[res(7,{mod:'2026-09-05T00:00:00Z'})]; ACL.applyStaff(R2,M); eq(R2[0].staff.record,'メールなし','④ 기간 안인데 메일 없음 → メールなし');
  eq([R[5].staff.aclAfterFix,R[1].staff.aclAfterFix],['訂正後の ACL の可能性',''],'④ ACL 파일 시각이 마지막 訂正依頼 보다 늦음 → 「訂正後の ACL の可能性」 (라벨만)');
  eq(R[5].staff.pairs.map(p=>[p.field,p.before,p.after,p.state]),[['seal','SL000199','SL000101','訂正後のACL']],'⑤ 씰 訂正 쌍 · 지금 ACL 에 「후」 → 訂正後のACL');
  eq(R[1].staff.pairs.map(p=>[p.field,p.before,p.after,p.state]),[['voy','100W','101W','訂正後のACL']],'⑤ 칸 이름 (Voy.No.) 을 떼고 「전 →후」');
}
console.log('5 訂正 쌍');
{ const X=ACL.extractPairs;
  eq(X('ACL Notify Party欄 SAMPLE CO.,LTD →SAMPLE CO,.LTD ご訂正をお願いします。').map(p=>[p.field,p.before,p.after,p.incomplete]),[['notify','SAMPLE CO.,LTD','SAMPLE CO,.LTD',false]],'⑤ X →Y · 칸 이름 (Notify Party欄)');
  eq(X('Description of Goods欄 TOTAL WEIGHT: XX KGS　→　TOTAL WEIGHT: 100 KGS ご訂正を').map(p=>[p.field,p.before,p.after]),[['description','TOTAL WEIGHT: XX KGS','TOTAL WEIGHT: 100 KGS']],'⑤ 전각 공백 허용');
  const long='ご訂正をお願いします。 Description欄 SAMPLE TEXT LINE →SAMPLE TEXT LINE CORRECTED AND THEN CUT', cut=X(long,true);
  eq([cut[0].incomplete,cut[0].why],[true,'本文 300 字で切れた'],'⑤ 본문 300자에서 잘림 → 不完全 (추측으로 채우지 않음)');
  eq(X('HS CODE: 47072000 →HS CODE: 47071000 ご訂正を').map(p=>[p.field,p.before,p.after]),[['description','HS CODE: 47072000','HS CODE: 47071000']],'⑤ HS CODE 는 값의 일부 (설명 칸)');
  eq(X('Notify Party欄 OLD NAME CO., → NEW NAME CO., TOTAL BALES: XX BALES → TOTAL BALES: 10 BALES ご訂正を').map(p=>[p.before,p.after]),[['OLD NAME CO.,','NEW NAME CO.,'],['TOTAL BALES: XX BALES','TOTAL BALES: 10 BALES']],'⑤ 한 줄에 쌍 2개 → 다음 「후」 와 같은 머리에서 나눔');
  eq(X('Seal No A1 →A2 ご訂正を'+SIG).length,1,'⑤ 인용 부분 (差出人: 아래) 의 → 는 보지 않음');
  eq(ACL.extractDispRequests('ACL Agent Signature Request Identifier欄へ １ のご追加をお願いします。').map(p=>[p.field,p.after]),[['agentSign','1']],'⑤ 표시 칸 요청 (전각 숫자 → 1)');
  eq(ACL.extractDispRequests('Way Bill欄とNumber of Original B(S)/L欄へ 1 記載をお願いします。').map(p=>[p.field,p.after]).sort().reverse(),[['wayBill','1'],['originals','1']],'⑤ 표시 칸 2개에 한 값');
  eq(ACL.extractDispRequests("Agent Signature Request Identifierは空欄のままでお願いします。").map(p=>[p.field,p.after]),[['agentSign','']],'⑤ 「空欄のままで」 → 빈칸이 값');
  eq(ACL.extractDispRequests('ACL Agent Signature Request Identifierは空欄のままで、 Freight As Arrangedに 1 のご入力をお願いできますでしょうか。').map(p=>[p.field,p.after]),[['agentSign',''],['freight','1']],'⑤ 한 문장에 「空欄のまま」 + 다른 칸 값 → 칸마다 따로 (句 「、」 단위)');
  eq(ACL.extractDispRequests('Agent Signature Request Identifier、Freight As Arrangedへ 1 表記をお願いいたします。').map(p=>[p.field,p.after]),[['agentSign','1'],['freight','1']],'⑤ 칸 이름 2개 「、」 + 값 하나 → 둘 다');
  eq(ACL.extractDispRequests('ACL Way Bill欄に1を、 Number of Original B(S)/L欄を 1 へご訂正をお願いいたします。').map(p=>[p.field,p.after]),[['wayBill','1'],['originals','1']],'⑤ 「欄に1を、…欄を 1 へご訂正」 모양');
  const r=res(1,{F:{notify:fld('SAMPLE CO.,LTD')}}), st=p=>ACL.pairState(Object.assign({src:'→'},p),r);
  eq([st({field:'notify',before:'SAMPLE CO.,LTD',after:'SAMPLE CO,.LTD'}),st({field:'notify',before:'SAMPLE CO,.LTD',after:'SAMPLE CO.,LTD'}),st({field:'notify',before:'AAA',after:'BBB'})],['訂正前のACL','訂正後のACL','判定不可'],'⑤ 訂正前のACL / 訂正後のACL / 判定不可');
}
console.log('6 표시 칸 (master_si_rule acl_*)');
{ const items=[{scope_type:'buyer',scope:'BUYER-A',rule:'acl_agent_sign',value:'1'},{scope_type:'contract',scope:'SC-1',rule:'acl_agent_sign',value:''},{scope_type:'country',scope:'VIETNAM',rule:'acl_freight_arranged',value:'1'},
    {scope_type:'buyer_bank',scope:'BUYER-A / BANK',rule:'acl_way_bill',value:'1'},{scope_type:'buyer',scope:'BUYER-A',rule:'po_vo_fixed',value:'PO'}];
  const d=ACL.dispRules(items); eq([d.rules.length,d.warnings.length,/buyer_bank/.test(d.warnings[0])],[3,1,true],'⑥ acl_* 규칙만 · buyer_bank 는 경고 후 무시 (다른 규칙은 a1_bench 용)');
  const F={wayBill:fld(''), received:fld(''), originals:fld('3'), freight:fld('1'), agentSign:fld('1'), shipperMail:fld('DOCS@EXAMPLE.TEST')};
  const by=(m,k)=>ACL.dispItems(F,d.rules,m).find(i=>i.key==='disp:'+k);
  eq([by({contract:'SC-2',buyer:'BUYER-A'},'agentSign').status,by({contract:'SC-1',buyer:'BUYER-A'},'agentSign').status,by({contract:'SC-1',buyer:'BUYER-A'},'agentSign').expected],['MATCH','DIFF','(空欄)'],'⑥ 규칙 있음 → 같음 / 다름 · 빈칸 규칙 · 좁은 범위 (contract) 우선');
  const fr=by({country:'VIETNAM'},'freight'), wb=by({buyer:'BUYER-A'},'wayBill');
  eq([fr.status,wb.status,wb.expected,wb.actual],['MATCH','INFO','(組合せ)','(空欄)'],'⑥ 나라 범위 · (v0.4 바뀜) Way Bill 규칙 없음 → 조합 판정 「(組合せ)」 OBL 型 参考 + 지금 ACL 값 (v0.3 은 「規則未登録」 — 지시서 v0.4 Step 2)');
  const F2=Object.assign({},F,{agentSign:fld('')}), it=ACL.dispItems(F2,d.rules,{buyer:'BUYER-A'}).find(i=>i.key==='disp:agentSign');
  eq([it.status,it.kind],['DIFF','表示欄相違:Agent Signature Request Identifier'],'⑥ 다르면 DIFF · kind 表示欄相違:{칸}');
}
console.log('7 규칙 후보');
{ const R=[1,2,3].map(n=>res(n,{meta:{buyer:'BUYER-A'}})).concat([4,5].map(n=>res(n,{meta:{buyer:'BUYER-B',pay:'TT',carrier:'CARRIER-Y',forwarder:'FWD-2'}})))
    .concat([res(6,{meta:{buyer:'BUYER-C',pay:'DP',carrier:'CARRIER-Z',forwarder:'FWD-3'}}),res(7,{meta:{buyer:'BUYER-C',pay:'DP',carrier:'CARRIER-Z',forwarder:'FWD-3'},F:{agentSign:fld('')}}),res(8,{meta:{buyer:'BUYER-C',pay:'DP',carrier:'CARRIER-Z',forwarder:'FWD-3'}})]);
  const t=csvOf(R.map((r,i)=>mrow('2026-09-0'+(i+1)+' 10:00:00','本登録依頼',r.invoice,'','本登録をお願いします。')));
  const S=ACL.applyStaff(R,ACL.mailsFromCsv(t)), C=S.candidates, ag=C.items.filter(c=>c.rule==='acl_agent_sign'), hold=C.hold.filter(h=>h.rule==='acl_agent_sign');
  eq(ag.map(c=>[c.scope_type,c.scope,c.value]),[['pay','LC','1']],'⑦ 값이 100% 같은 가장 넓은 묶음 · 3건 → 후보 (전체는 섞여서 안 됨)');
  ok(/master_si_rule に未定義/.test(ag[0].note)&&ag[0].decided_by===''&&/根拠 3 件/.test(ag[0].note),'⑦ 후보 모양 = master items · decided_by 비움 · note 에 근거 · 없는 범위 종류는 ⚠ (만들지 않고 보고)',ag[0]);
  eq(hold.map(h=>[h.scope,h.why,h.values.length]).sort(),[['BUYER-B','3 件未満',2],['BUYER-C','値が混在',3]],'⑦ 2건 → 保留 · 섞임 → 保留 + 목록');
  ok(hold.find(h=>h.scope==='BUYER-C').values.indexOf('NFK2601-07=(空)')>=0,'⑦ 섞인 인보이스 목록 (빈칸도 값)');
  const all=C.items.filter(c=>c.rule==='acl_originals'); eq(all.map(c=>[c.scope_type,c.scope,c.value,/未定義/.test(c.note)]),[['all','ALL','3',false]],'⑦ (v0.4 바뀜) 전부 같으면 all/ALL — 마스터 범위 이름 · 「未定義」 경고 없음 (v0.3 은 (全体) · 경고 — 지시서 v0.4 Step 1)');
}
console.log('8 実績表記');
{ /* v0.9: 句読点だけの違いは compareText で 表記 (P1) になるので、実績表記の仕組みは v0.8 までの 相違 の項目をそのまま作って試す */
  const dx=(key,label,exp,act,st)=>({key, label, status:st, expected:exp, actual:act, kind:'相違:'+label});
  const sh='SAMPLE EXPORT CO.,LTD', mk=(n,act,o)=>res(n,Object.assign({items:[dx('shipper','Shipper',sh,act,'DROP')]},o||{}));
  const base=()=>[mk(1,'SAMPLE EXPORT CO, LTD'),mk(2,'SAMPLE EXPORT CO, LTD'),mk(3,'SAMPLE EXPORT CO, LTD'),mk(4,'SAMPLE EXPORT CO, LTD'),
    mk(5,'SAMPLE EXPORT CO.,LTD'.replace('EXPORT','EXPORT  ').replace('CO.,LTD','CO.,LTD')),
    res(6,{items:[dx('notify','Notify Party','SAMPLE PAPER CO.,LTD','SAMPLE PAPER CO.,LTD.','ADD')]}),res(7,{items:[dx('notify','Notify Party','SAMPLE PAPER CO.,LTD','SAMPLE PAPER CO.,LTD.','ADD')]})];
  const hon=R=>csvOf(R.slice(0,4).concat(R.slice(5)).map((r,i)=>mrow('2026-09-0'+(i+1)+' 10:00:00','本登録依頼',r.invoice,'','本登録をお願いします。')));
  let R=base(); const v0=R.map(r=>r.verdict); const S=ACL.applyStaff(R,ACL.mailsFromCsv(hon(R)));
  eq([R[0].items[0].status,R[0].items[0].kind,R[0].verdict],['PRACTICE','表記(実績):Shipper:句読点','表記差のみ'],'⑧ 같은 칸 · 같은 형 본登録のみ 3건 이상 → PRACTICE · 判定 表記差のみ (자동 OK 아님)');
  ok(/実績: 本登録のみ 4 件 \(NFK2601-01 · NFK2601-02 · NFK2601-03 · NFK2601-04\)/.test(R[0].items[0].detail),'⑧ detail 에 근거 인보이스 + 건수',R[0].items[0].detail);
  eq([R[5].items[0].status,R[6].items[0].status],['ADD','ADD'],'⑧ 2건 → DIFF 유지 (PRACTICE 아님 · 이 예는 追加)');
  ok(S.practiceN===4&&S.practiceInv===4&&/表記差のみ のうち 実績表記 4 件/.test(ACL.staffSummaryMd({staff:S,results:R})),'⑧ summary 에 「表記差のみ のうち 実績表記 n 件」',ACL.staffSummaryMd({staff:S,results:R}).split('\n').slice(0,5));
  // 같은 형의 訂正 쌍 → 허용 금지 (F7: 「.,」 순서 · 「,,」 · 낱말 안 공백)
  for(const [body,why] of [['Shipper欄 SAMPLE EXPORT CO, LTD →SAMPLE EXPORT CO.,LTD ご訂正を','句読点 (.,)'],['ACL SAMPLE-GUN,,TESTCITY →SAMPLE-GUN,TESTCITY 赤字部分削除をお願い','句読点 (,,)']]){
    R=base(); const t=hon(R).replace(/\r\n$/,'')+'\r\n'+[mrow('2026-09-20 10:00:00','ACL/DR 確認・訂正','NFK2601-99','',body)].map(r=>r.map(q).join(',')).join('')+'\r\n';
    R.push(res(99)); const S2=ACL.applyStaff(R,ACL.mailsFromCsv(t));
    eq([R[0].items[0].status,S2.practice.table.find(x=>x.key==='shipper').allowed],['DROP',false],'⑧ 같은 형 ('+why+') 의 訂正 쌍이 있으면 DIFF 유지'); }
  R=[1,2,3,4].map(n=>res(n,{items:[dx('notify','Notify Party','TEL : 0-0000-0000 FAX','TEL : 0-0000-000 0FAX','DIFF')]}));
  const tw=csvOf(R.map((r,i)=>mrow('2026-09-0'+(i+1)+' 10:00:00','本登録依頼',r.invoice,'','本登録をお願いします。')).concat([mrow('2026-09-20 10:00:00','ACL/DR 確認・訂正','NFK2601-99','','ACL Notify Party TEL : 0-1111-111 1FAX →TEL : 0-1111-1111 FAX ご訂正をお願い')]));
  R.push(res(99)); const S3=ACL.applyStaff(R,ACL.mailsFromCsv(tw));
  eq([R[0].items[0].status,R[0].items[0].kind,S3.practice.table[0].shape,/訂正の対に同じ形/.test(S3.practice.table[0].why)],['DIFF','相違:Notify Party','語の切れ目',true],'⑧ 가짜 「…000 0FAX」 (낱말 경계) — 같은 형의 訂正 쌍 → DIFF 유지');
  // 訂正依頼 인보이스의 訂正前 ACL 에 같은 형 → 금지 (조건 3)
  R=[1,2,3].map(n=>mk(n,'SAMPLE EXPORT CO, LTD')).concat([mk(4,'SAMPLE EXPORT CO, LTD',{F:{shipper:fld('SAMPLE EXPORT CO, LTD'),notify:fld('OLDNAME')}})]);
  const t4=csvOf(R.slice(0,3).map((r,i)=>mrow('2026-09-0'+(i+1)+' 10:00:00','本登録依頼',r.invoice,'','本登録をお願いします。')).concat([mrow('2026-09-20 10:00:00','ACL/DR 確認・訂正',R[3].invoice,'','Shipper欄 OLDNAME →NEWNAME ご訂正をお願い')]));
  // 訂正前の ACL 판정이 되도록 shipper 칸에 OLDNAME 이 있는 경우
  R=[1,2,3].map(n=>mk(n,'SAMPLE EXPORT CO, LTD')).concat([mk(4,'SAMPLE EXPORT CO, LTD',{F:{shipper:fld('OLDNAME SAMPLE EXPORT CO, LTD')}})]);
  const S5=ACL.applyStaff(R,ACL.mailsFromCsv(t4));
  eq([R[3].staff.pairs[0].state,R[0].items[0].status,/訂正前 ACL に同じ形/.test(S5.practice.table[0].why)],['訂正前のACL','DROP',true],'⑧ 訂正依頼 인보이스의 같은 칸 (訂正前のACL) 에 같은 형 → 허용 금지');
  // CSV 없음 → v0.2 와 같은 결과
  R=base(); eq([R.map(r=>r.verdict),R.every(r=>!r.staff)],[v0,true],'⑧ CSV 를 안 읽으면 PRACTICE 0 (판정 그대로)');
  // 두 번 적용해도 같음 (원래 결과에서 다시 계산)
  R=base(); ACL.applyStaff(R,ACL.mailsFromCsv(hon(R))); const once=J(R.map(r=>[r.verdict,r.items,r.kinds])); ACL.applyStaff(R,ACL.mailsFromCsv(hon(R)));
  ok(once===J(R.map(r=>[r.verdict,r.items,r.kinds])),'⑧ 매 실행마다 자료에서 다시 계산 (두 번 읽어도 같음 · 쌓이지 않음)');
}
console.log('9 공백 — 줄 끝 꺾임 / 줄 안 낱말 경계');
{ const T=ACL.compareText;
  eq([T('TEL : 0-0000-0000 FAX','TEL : 0-0000-000 0FAX').status,T('TEL : 0-0000-0000 FAX','TEL : 0-0000-000 0FAX').kind],['NOTATION','表記:語の切れ目'],'⑨ 줄 안에서 낱말 경계가 바뀜 (가짜 290 7FAX 모양) → v0.9 P1 공백만 = 表記 (v0.3 ~ v0.8 은 DIFF)');
  eq(T('GEDUNG SAMPLE MAS TOWER','GEDUNG SAMPLEMAS TOWER').wordBreak,true,'⑨ 줄 안에서 공백이 빠짐 → 語の切れ目');
  eq(T('NO.1 SAMPLE ROAD, SAMPLE WARD','NO.1 SAMPLE RO'+NL+'AD, SAMPLE WARD').status,'NOTATION','⑨ ACL 줄 끝에서 낱말 가운데 꺾임 → NOTATION');
  eq(T('NO.1 SAMPLE ROAD,'+NL+'SAMPLE WARD','NO.1 SAMPLE ROAD, SAMPLE WARD').status,'NOTATION','⑨ 줄바꿈 ↔ 공백 (낱말은 같음) → NOTATION');
  const m=T('LINE ONE'+NL+'GEDUNG SAMPLE MAS'+NL+'LINE X','LINE ONE'+NL+'GEDUNG SAMPLEMAS'+NL+'LINE Y');
  ok(m.status==='DIFF'&&m.ops.some(o=>o.t==='ws')&&m.ops.some(o=>o.t==='drop'),'⑨ 다른 차이와 섞여도 낱말 경계는 따로 표시 (ws)',m.ops);
}
console.log('저장 파일 (가짜)');
{ const R=[res(1,{items:[diffIt('shipper','Shipper','A B','A  C')]}),res(2)], t=csvOf([mrow('2026-09-01 10:00:00','本登録依頼','NFK2601-01','','本登録をお願いします。'),mrow('2026-09-02 10:00:00','本登録依頼','','NOPE','本登録をお願いします。')]);
  const run={run_id:'ACL_T',version:'0.3',started:'s',results:R}; run.staff=ACL.applyStaff(R,ACL.mailsFromCsv(t));
  const sm=ACL.staffMatchCsv(run), rv=ACL.reviewCsv(run), md=ACL.summaryMd(run), csv=ACL.toCsv(run);
  ok(sm.charCodeAt(0)===0xFEFF&&/^.invoice,staff_record,verdict,mails,last_fix,acl_after_fix,pairs,mails_detail\r\n/.test(sm)&&/NFK2601-01,本登録のみ,相違あり,1/.test(sm),'staff_match.csv: 인보이스 × 실적 × 판정 × 근거');
  ok(/^.Invoice,項目,ACL,COMPASS,理由\r\n/.test(rv)&&/NFK2601-01,Shipper,A  C,A B,本登録のみ/.test(rv)&&/紐付けなし/.test(rv),'review_list.csv (일본어): 相違あり × 本登録のみ · 紐付けなし');
  ok(/## 担当者実績との突き合わせ/.test(md)&&/\| 相違あり \| 0 \| 1 \|/.test(md)&&/見落とし ①/.test(md)&&/✦ Powered by LEENAI Automation System/.test(md),'summary.md: 맞대기 표 · 놓침 목록 · 푸터');
  ok(/,staff_record,aclVersion\r\n/.test(csv)&&/,本登録のみ,\r\n/.test(csv)&&/,期間外,\r\n/.test(csv),'results.csv: staff_record · (v0.4) aclVersion 열 맨 끝');
}
console.log('staff pass',pass,'fail',fail); process.exitCode=fail?1:0;
