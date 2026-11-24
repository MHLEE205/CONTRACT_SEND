/* acl_bench v0.16 시험 (지시서 THOR_11 E-1 ~ E-4) — 가짜 데이터 · 가짜 거래처 · 네트워크 없음 · AI 0
   E-1 형태 — 하이큐브 6 표기 = 45GP (대소문자 · 공백 · ' · - 무시) · 45R 은 다름 · 乙仲様式 세트 = 일치
   E-2 Combined Transport Only — 칸 이름에 붙은 乙仲様式: 빈칸 = 参考 (INFO) · 값이 다르면 相違 · 칸 이름에 없으면 相違 그대로 · CNC Draft B/L 의 「*」 칸 · NACCS 는 그대로
   E-3 「RECIEVED BY CARRIER」 (RECEIVED 도) = Received B/L 칸 아님 → 対象外 · 다른 글자는 相違 그대로 · NACCS 는 그대로
   E-4 乙仲별 과거 오기 — pastMistakes (이름 · 번호 · 양식) · 화면 「この乙仲の過去の誤記 n 件（参考）」 · 誤字の疑い 후보 (summary) · 판정 0 변화
   그 밖 — 다른 것 없으면 v0.15 (a56fabc) 와 결과 바이트까지 같음 · 한글 0
   node v16.js [html] */
const fs=require('fs'), path=require('path'), cpr=require('child_process'), FX=require('./fixtures');
const HTML_P=process.argv[2]||path.join(__dirname,'../../acl_bench.html'), HTML=fs.readFileSync(HTML_P,'utf8');
const core=h=>new Function('module',h.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const ACL=core(HTML);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
const item=(r,k)=>r.items.find(i=>i.key===k);
const hg=/[가-힣]/;
function aiJson(cp, over, other){
  const sp=FX.perfectSpec(ACL, cp), f={};
  Object.keys(sp.fields).forEach(k=>{ f[k]={text:sp.fields[k].join('\n'), page:1, label:ACL.LABELS[k]}; if(other) f[k].absent=false; });
  Object.assign(f,{totalContainers:{text:sp.totals.words,page:2}, totalPkgs:{text:sp.totals.bales+' BALES',page:2}, totalWeight:{text:String(sp.totals.weight),page:2}, totalMeasure:{text:String(sp.totals.measure),page:2}, numberOf:{text:String(sp.totals.count),page:2}});
  const j={layout:other?'OTHER':'NACCS', pages:2, fields:f, rows:sp.rows.map(r=>Object.assign({kind:'BALES', page:1},r)), note:''};
  if(other) Object.assign(j,{form:'SAMPLE FORWARDER DOCK RECEIPT', containerTable:true});
  return over?over(JSON.parse(J(j))):j;
}
const META=()=>({pay:'TT'});
const RULES=ACL.dispRules([{scope_type:'all',scope:'ALL',rule:'acl_received_bl',value:''}]).rules;   // 実際と同じ 「Received B/L = 空欄」 の規則
const cmp=(j,cp,other)=>ACL.compareOne(ACL.scanMerge(j,j,other?{other:true}:{}), cp, {meta:META(), rules:RULES});

let old=null; try{ old=cpr.execFileSync('git',['show','a56fabc:acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
const O15=old?core(old):null;

console.log('E-1 형태');
eq(['40HCD','40drhc','4096SD','40(96)DRY','40HCDRY-ドライ','40 HCD'].map(t=>ACL.sameType(t,'45GP')),[true,true,true,true,true,true],'하이큐브 5 표기 = 45GP (대소문자 · 공백 · - 무시) · v0.17: 40HCR 은 45R 줄로 (S1)');
eq([ACL.sameType("40'HCR",'45R'),ACL.sameType('40hcr','45R'),ACL.sameType('40HCR','45GP')],[true,true,false],'v0.17 (형님 S1): 40HCR = 45R (45GP 아님)');
eq([ACL.sameType('40HCD','45R'),ACL.sameType('40HCR','42GP'),ACL.sameType('45R','45GP'),ACL.sameType('45G1','45GP'),ACL.sameType('40HC','45GP'),ACL.sameType('42GP','45GP')],[false,false,false,true,true,false],'45R 은 대응 안 함 (형님 D1) · 원래 표 그대로');
{ const cp=FX.compass(61), j=aiJson(cp, x=>{ x.rows.forEach(r=>{ r.size='40'; r.type='HCD'; }); return x; }, true), c=cmp(j,cp,true);
  ok(c.sets.sets.every(s=>s.ok&&s.typeSt==='MATCH')&&c.verdict==='完全一致','乙仲様式 「40 HCD」 ↔ COMPASS 45GP → 세트 일치',{v:c.verdict, s:c.sets.sets.map(s=>s.typeSt)});
  if(O15){ const c15=O15.compareOne(O15.scanMerge(j,j,{other:true}), cp, {meta:META()}); ok(c15.verdict==='相違あり','(비교) v0.15 = 相違 (형태)',c15.verdict); } }

console.log('E-2 Combined Transport Only');
{ const cp=FX.compass(62), base=aiJson(cp,null,true);
  const mk=(lab,txt,form)=>aiJson(cp, x=>{ ['receipt','delivery'].forEach(k=>{ x.fields[k]={text:txt, absent:false, page:1, label:lab.replace('{k}',k==='receipt'?'Place of Receipt':'Place of Delivery')}; }); if(form) x.form=form; return x; }, true);
  const c1=cmp(mk('{k} (Combined Transport Only)',''),cp,true);
  ok(['receipt','delivery'].every(k=>item(c1,k).status==='INFO'&&item(c1,k).ref&&/Combined Transport/.test(item(c1,k).detail)&&!item(c1,k).kind)&&c1.verdict!=='相違あり'&&J(c1.ctRef)===J(['Place of Receipt','Place of Delivery']),'칸 이름에 Combined Transport · 빈칸 → 参考 (INFO · 판정에 안 들어감)',{v:c1.verdict, r:item(c1,'receipt')});
  const c2=cmp(mk('{k} (Combined Transport Only)','SOMEWHERE ELSE'),cp,true); ok(item(c2,'receipt').status==='DIFF'&&c2.verdict==='相違あり','값이 있는데 S/I 와 다르면 相違 그대로',item(c2,'receipt'));
  const c3=cmp(mk('{k}',''),cp,true); ok(item(c3,'receipt').status==='DIFF','칸 이름에 Combined Transport 없음 → 相違 그대로',item(c3,'receipt'));
  const c4=cmp(mk('{k}*','','CNC DRAFT BILL OF LADING'),cp,true); ok(item(c4,'receipt').status==='INFO'&&item(c4,'delivery').status==='INFO','CNC Draft B/L 의 「*」 칸 (복합운송 표시) → 参考',item(c4,'receipt'));
  const c5=cmp(mk('{k}*','','OTHER FORM'),cp,true); ok(item(c5,'receipt').status==='DIFF','다른 양식의 「*」 = 相違 그대로',item(c5,'receipt'));
  const j6=mk('{k} (Combined Transport Only)',''); j6.layout='NACCS'; delete j6.form; const c6=ACL.compareOne(ACL.scanMerge(j6,j6), cp, {meta:META()}); ok(item(c6,'receipt').status!=='INFO','NACCS (乙仲様式 아님) 은 그대로',item(c6,'receipt')); }

console.log('E-3 RECIEVED BY CARRIER');
{ const cp=FX.compass(63), mk=t=>aiJson(cp, x=>{ x.fields.received={text:t, absent:false, page:1, label:''}; return x; }, true);
  for(const t of ['RECIEVED BY CARRIER','Received by carrier','RECEIVED  BY CARRIER']){ const c=cmp(mk(t),cp,true), i=item(c,'disp:received'); ok(i.status==='INFO'&&i.na&&/RECIEVED BY CARRIER/.test(i.detail)&&!i.kind&&!(c.kinds['表示欄相違:Received B/L'])&&J(c.printed)===J(['Received B/L']),'「'+t+'」 → 対象外 (表示欄相違 Received B/L 없음)',{i, k:c.kinds}); }
  const c2=cmp(mk('YES'),cp,true); ok(item(c2,'disp:received').status==='DIFF','다른 글자 (YES) = 相違 그대로',item(c2,'disp:received'));
  const j3=mk('RECIEVED BY CARRIER'); j3.layout='NACCS'; delete j3.form; const c3=ACL.compareOne(ACL.scanMerge(j3,j3), cp, {meta:META(), rules:RULES}); ok(item(c3,'disp:received').status==='DIFF','NACCS 는 그대로',item(c3,'disp:received')); }

console.log('E-4 乙仲별 과거 오기');
{ const L=[{otsunaka:'SAMPLE 通運', otsunaka_id:'82', form:'SAMPLE D/R 入力控え', invoice:'NTEST2699-01', field:'Consignee', acl:'SAMPLE PARER', right:'SAMPLE PAPER', kind:'誤字', date:'2026-07-01'},
    {otsunaka:'(乙仲 87 · SAMPLE)', otsunaka_id:'87', form:'SAMPLE DOCK RECEIPT', invoice:'NTEST2699-02', field:'シール', acl:'1234', right:'01234', kind:'脱落', date:'2026-08-01'},
    {otsunaka:'株式会社SAMPLE 通運', otsunaka_id:'82', form:'', invoice:'NTEST2699-03', field:'Notify Party', acl:'X', right:'Y', kind:'誤字', date:'2026-09-01'}];
  eq(ACL.pastMistakes(L,['SAMPLE 通運']).map(m=>m.invoice),['NTEST2699-01','NTEST2699-03'],'乙仲 이름 (「株式会社」 · 공백 무시)');
  eq(ACL.pastMistakes(L,['','82']).length,2,'乙仲 번호 (meta.forwarder)'); eq(ACL.pastMistakes(L,[null,null,'sample dock receipt']).map(m=>m.invoice),['NTEST2699-02'],'양식 이름');
  eq(ACL.pastMistakes(L,['OTHER','99']),[],'다른 乙仲 = 0'); eq(ACL.pastLabel(2),'この乙仲の過去の誤記 2 件（参考）','글자');
  const cp=FX.compass(64), r=cmp(aiJson(cp,null,true),cp,true), h=ACL.viewHtml(r,{past:ACL.pastMistakes(L,['82'])}), h0=ACL.viewHtml(r,{});
  ok(/この乙仲の過去の誤記 2 件（参考）/.test(h)&&/SAMPLE PARER/.test(h)&&!/過去の誤記/.test(h0)&&!hg.test(h),'화면 — 「この乙仲の過去の誤記 n 件（参考）」 + 목록 (없으면 안 보임) · 한글 0');
  const before=J(r), r2=cmp(aiJson(cp,null,true),cp,true); ok(J(r2)===before,'판정 · 결과 변화 0 (화면 표시만)');
  const tc=ACL.typoCands([{invoice:'NTEST2699-09', meta:{forwarderCompany:'SAMPLE 通運'}, ai:{form:'F'}, items:[{label:'Consignee', kind:'相違:誤字の疑い:Consignee', actual:'A', expected:'B'},{label:'Shipper', kind:'相違:Shipper', actual:'C', expected:'D'}]}]);
  eq(tc,[{invoice:'NTEST2699-09', otsunaka:'SAMPLE 通運', form:'F', field:'Consignee', acl:'A', right:'B'}],'誤字の疑い = 후보 (summary · 기록 파일에 자동 추가 0)');
  const md=ACL.summaryMd({run_id:'ACL_T', version:'0.16', started:'2026-11-24T00:00:00Z', results:[{invoice:'NTEST2699-09', format:'NACCS', verdict:'相違あり', kinds:{'相違:誤字の疑い:Consignee':1}, meta:{forwarderCompany:'SAMPLE 通運'}, items:[{label:'Consignee', kind:'相違:誤字の疑い:Consignee', actual:'A', expected:'B'}], xx:[]}]});
  ok(/乙仲の誤記の候補/.test(md)&&/otsunaka_mistakes\.json/.test(md),'summary 에 「乙仲の誤記の候補」 표'); }

console.log('그 밖 — v0.15 와 같음');
if(O15){ let same=0, n=0; for(let k=1;k<=13;k++){ const c=FX.compass(k,{containers:k===9?20:3}); const s=FX.perfectSpec(O15,c); const j=aiJson(c,null,false);
    n++; if(J(ACL.compareOne(ACL.scanMerge(j,j),c,{meta:META()}))===J(O15.compareOne(O15.scanMerge(j,j),c,{meta:META()}))) same++; }
  eq([same,n],[13,13],'스캔 NACCS 13 경우 = v0.15 (a56fabc) 와 결과 바이트까지 같음');
  const cp=FX.compass(65), j=aiJson(cp,null,true), a=ACL.scanMerge(j,j,{other:true}), b=O15.scanMerge(j,j,{other:true}); delete a.ai.labels;
  ok(J(a)===J(b),'乙仲様式 scanMerge = v0.15 + ai.labels 만 (칸 이름)'); }
else ok(true,'(git 기록 없음 · 생략)');
ok(!hg.test(J([ACL.CT_ONLY.note, ACL.PRINTED[0].note, ACL.OTSU_MISTAKES.label])),'새 문구 한글 0');
(async()=>{
  console.log('E-6 Microsoft 토큰 (OS 별 · 한 곳)');
  const {pathToFileURL}=require('url'), TOK=path.join(__dirname,'../../tools/ms_token.mjs');
  process.env.MS_TOK=path.join(require('os').tmpdir(),'no_such_dir_'+process.pid,'tok.py'); process.env.MS_DIR=path.join(require('os').tmpdir(),'no_such_dir_'+process.pid);
  const M=await import(pathToFileURL(TOK).href+'?t='+Date.now());
  const w=M.msTokenPlan('write','win32'), d=M.msTokenPlan('dv','darwin'), g=M.msTokenPlan('graph','darwin');
  ok(w.os==='win'&&w.args.slice(-1)[0]==='write'&&/tok\.py$/.test(w.file)&&d.os==='mac'&&/ms\._tok\(ms\.DV\)/.test(d.args.join(' '))&&/ms\._tok\(ms\.GRAPH\)/.test(g.args.join(' '))&&/ms\.py$/.test(d.file),'Windows = bl_supp/tok.py (graph · dv · write) · Mac = ms.py (GRAPH · DV) · 환경변수로 장소 변경');
  let msg=''; try{ M.msToken('graph'); }catch(e){ msg=e.message; } ok(/Microsoft トークンを読めません — .*no_such_dir_.* がない \((MS_TOK|MS_DIR) で場所を指定\)/.test(msg)&&!/eyJ/.test(msg),'파일이 없으면 분명한 오류 (토큰 값 0)',msg);
  const src=fs.readFileSync(TOK,'utf8')+fs.readFileSync(path.join(__dirname,'../../tools/lc_read_one.mjs'),'utf8')+fs.readFileSync(path.join(__dirname,'../../tools/cp_trial.mjs'),'utf8');
  ok(!/console\.log\([^)]*(tok\(|msToken\()/.test(src)&&/import \{ msToken \} from '\.\/ms_token\.mjs'/.test(fs.readFileSync(path.join(__dirname,'../../tools/lc_read_one.mjs'),'utf8'))&&/import \{ msToken \} from '\.\/ms_token\.mjs'/.test(fs.readFileSync(path.join(__dirname,'../../tools/cp_trial.mjs'),'utf8')),'lc_read_one · cp_trial = ms_token.mjs 하나 · 토큰 출력 0');
  console.log('v16 pass '+pass+' fail '+fail); process.exit(fail?1:0);
})();
