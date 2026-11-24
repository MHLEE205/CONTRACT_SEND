/* acl_bench v0.14 시험 (지시서 MAC-THOR_6 C4 · 형님 D2) — 스캔 ACL AI 2 회 판독 — 가짜 PDF · 가짜 거래처 · AI 는 가짜 응답 · 네트워크 없음
   1 scanPrompt · scanJson (```json · 앞뒤 문장 · 못 읽음)
   2 scanMerge — 2 회 같음 (공백 · 대소문자만 다름 = 같음) → SURE · 다름 → AI_DIFF (값 비움 · 두 값 메모) · 둘 다 null → MISSING · null ↔ "" = 같음 · 「-」 = 빈칸 · 컨테이너 행 (같음 · 씰 다름 · 한 번만 · 숫자 「9,000」=9000) · 합계 (naccsTotals)
   3 compareOne — 가짜 스캔 (완전) → 完全一致 + 「AI 判読 (スキャン)」 참고 줄 + out.ai · 칸 AI_DIFF → 読取確認要 (2 회 값 메모) · 행 다름 → セット 読取確認要 · 한 번만 읽힌 행 (COMPASS 없음) → 追加 가 아닌 読取確認要
   4 NACCS 판정 = v0.13 (e18253a) — 가짜 NACCS 13 경우 readNaccs · compareOne 결과가 바이트까지 같음
   5 tools/acl_scan_ai.mjs — 가짜 AI 2 번 · JSON 다시 묻기 · 같은 PDF (sha256) 는 저장본 (AI 0 번)
   6 화면 (jsdom · e2e 의 가짜 세계 NFK2601-10 = 스캔) — 체크 없음 · 저장본 없음 → 読取対象外 (AI 0) / 체크 → AI 2 번 · _scan_ai/{sha256}.json 저장 · 결과 「AI 判読 (スキャン)」 / 다시 照合 → 저장본 (AI 0) · 한글 0
   node v14.js [html] */
const fs=require('fs'), path=require('path'), os=require('os'), cpr=require('child_process'), crypto=require('crypto'), FX=require('./fixtures'), N=require('./fake_naccs'), R=require('./pdfread');
const HTML_P=process.argv[2]||path.join(__dirname,'../../acl_bench.html'), HTML=fs.readFileSync(HTML_P,'utf8');
const core=h=>new Function('module',h.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const ACL=core(HTML);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,900));} };
const eq=(a,b,m)=>ok(J(a)===J(b),m,{got:a,want:b});
const item=(r,k)=>r.items.find(i=>i.key===k);

/* 가짜 AI 응답 — 완전한 ACL (perfectSpec 와 같은 값) */
function aiJson(cp, over){
  const sp=FX.perfectSpec(ACL, cp), f={};
  Object.keys(sp.fields).forEach(k=>{ f[k]={text:sp.fields[k].join('\n'), page:1, label:ACL.LABELS[k]}; });
  Object.assign(f,{totalContainers:{text:sp.totals.words,page:2}, totalPkgs:{text:sp.totals.bales+' BALES',page:2}, totalWeight:{text:String(sp.totals.weight),page:2}, totalMeasure:{text:String(sp.totals.measure),page:2}, numberOf:{text:String(sp.totals.count),page:2}});
  const j={layout:'NACCS', pages:2, fields:f, rows:sp.rows.map(r=>Object.assign({kind:'BALES', page:1},r)), note:''};
  return over?over(JSON.parse(J(j))):j;
}
const META=(cp)=>({pay:'TT'});

(async()=>{
  /* 1 */
  const P=ACL.scanPrompt();
  ok(ACL.HEAD_KEYS.every(k=>P.indexOf('"'+k+'"')>=0)&&/no translation|Do not join, split, translate/i.test(P+ACL.SCAN_SYSTEM)&&/page/.test(P),'1-1 프롬프트 — NACCS 칸 29 개 전부 · 번역/정리 금지 · 쪽 번호');
  eq([ACL.SCAN_AI.model, ACL.SCAN_AI.reads, ACL.SCAN_AI.effort],['claude-opus-5-5',2,'high'],'1-2 모델 = L/C 판독과 같음 (claude-opus-5-5 · effort high) · 2 회');
  eq([ACL.scanJson('```json\n{"a":1}\n```'), ACL.scanJson('Here you go: {"a":{"b":2}} done'), ACL.scanJson('no json'), ACL.scanJson('{bad')],[{a:1},{a:{b:2}},null,null],'1-3 scanJson (```json · 앞뒤 문장 · 없음 · 깨짐)');
  ok(Math.abs(ACL.scanCost({input_tokens:1e6, output_tokens:1e6, cache_read_input_tokens:1e6})-24.4)<1e-9,'1-4 費用 목안 (in 4 · out 20 · cache read 0.4 US$/백만)');

  /* 2 scanMerge */
  const cp=FX.compass(31), j=aiJson(cp);
  const m0=ACL.scanMerge(j, aiJson(cp, x=>{ x.fields.consignee.text=x.fields.consignee.text.toLowerCase().replace(/\n/,'  \n '); return x; }));
  ok(m0.fields.consignee.conf==='SURE'&&m0.fields.consignee.text===j.fields.consignee.text,'2-1 공백 · 대소문자만 다름 = 같음 → SURE · 1 회째 글자 그대로',m0.fields.consignee);
  const mw=ACL.scanMerge({fields:{totalWeight:{text:'66,480.000 KGM'}}},{fields:{totalWeight:{text:'66, 480. 000 KGM'}}});
  ok(mw.fields.totalWeight.conf==='SURE'&&mw.fields.totalWeight.text==='66,480.000 KGM'&&mw.fields.totalWeight.wsOnly&&mw.totals.weight===66480,'2-1b 공백 있음/없음만 다름 (66,480.000 ↔ 66, 480. 000) = 같음 · wsOnly 기록',mw.fields.totalWeight);
  const m1=ACL.scanMerge(j, aiJson(cp, x=>{ x.fields.notify.text=x.fields.notify.text.replace('SAMPLE','SAMPIE'); x.fields.alsoNotify={text:null}; x.fields.refNo=null; return x; }));
  ok(m1.fields.notify.conf==='AI_DIFF'&&m1.fields.notify.text===''&&m1.fields.notify.amb.length===2&&/SAMPIE/.test(m1.fields.notify.amb[1]),'2-2 다름 → AI_DIFF · 값 비움 · 두 값 메모',m1.fields.notify);
  ok(m1.ai.diffFields.join()==='notify,refNo'&&m1.fields.alsoNotify.conf==='SURE'&&m1.fields.alsoNotify.text==='','2-3 다른 칸 목록 (notify · 값 ↔ null) · 「-」 ↔ null = 둘 다 기재 없음 (SURE 빈칸)',m1.ai.diffFields);
  const jn=aiJson(cp, x=>{ x.fields.masterBl={text:null}; x.fields.wayBill={text:''}; delete x.fields.payPlace; return x; }), jn2=aiJson(cp, x=>{ x.fields.masterBl={text:null}; x.fields.wayBill={text:null}; return x; });
  const m2=ACL.scanMerge(jn, jn2);
  eq([m2.fields.masterBl.conf, m2.fields.wayBill.conf, m2.fields.wayBill.text, m2.fields.alsoNotify.text, m2.fields.carrier&&m2.fields.carrier.conf],['MISSING','SURE','','',undefined],'2-4 둘 다 null = MISSING · null ↔ "" = SURE 빈칸 · 「-」 = 빈칸 · HEAD_KEYS 밖 칸은 안 만듦');
  const m3=ACL.scanMerge(j, aiJson(cp, x=>{ x.rows[0].seal='SL999999'; x.rows[1].cargo=String(x.rows[1].cargo).replace(/(\d)(\d{3})$/,'$1,$2'); x.rows.push({container:'XTRU0000008', seal:'S1', bales:1, cargo:1, tare:1}); return x; }));
  const r0=m3.rows.find(r=>r.container===cp.containers[0].crcf9_container_no), r1=m3.rows.find(r=>r.container===cp.containers[1].crcf9_container_no), rx=m3.rows.find(r=>r.container==='XTRU0000008');
  ok(r0.conf==='AMBIGUOUS'&&r0.seal===''&&J(r0.aiDiff.seal)===J([cp.containers[0].crcf9_seal_no,'SL999999']),'2-5 행 씰 다름 → AMBIGUOUS · 씰 비움 · aiDiff',r0);
  ok(r1.conf==='SURE'&&r1.cargo===cp.containers[1].crcf9_n_w&&!r1.aiDiff,'2-6 숫자 「20,200」 = 20200 → 같음',r1);
  ok(rx&&rx.conf==='AMBIGUOUS'&&J(rx.aiDiff.container)===J(['なし','あり']),'2-7 한 번만 읽힌 행 → AMBIGUOUS (container なし/あり)',rx);
  const mk=ACL.scanMerge(j, aiJson(cp, x=>{ x.rows.forEach(r=>{ r.kind='BL'; r.measure=41; }); return x; })), rk=mk.rows[0];
  ok(rk.conf==='SURE'&&!rk.aiDiff&&rk.aiNote&&rk.aiNote.kind&&rk.aiNote.measure&&mk.ai.diffRows.length===0,'2-7b 荷姿 · 容積 만 다름 → 照合에 안 쓰는 열이라 SURE (aiNote 에 기록)',rk);
  const sp=FX.perfectSpec(ACL,cp); eq([m0.totals.containers, m0.totals.bales, m0.totals.weight],[sp.totals.count, sp.totals.bales, sp.totals.weight],'2-8 합계 = naccsTotals (본수 「(n) CONTAINERS ONLY」 · Bales · 중량)');

  /* 3 compareOne */
  const c0=ACL.compareOne(ACL.scanMerge(j, aiJson(cp)), cp, {meta:META(cp)});
  ok(c0.verdict==='完全一致'&&item(c0,'ai:scan')&&item(c0,'ai:scan').status==='INFO'&&c0.ai&&c0.ai.label==='AI 判読 (スキャン)','3-1 가짜 스캔 (완전) → 完全一致 · 「AI 判読 (スキャン)」 참고 줄 · out.ai',{v:c0.verdict, k:c0.kinds});
  const ref=ACL.compareOne({fields:Object.fromEntries(ACL.HEAD_KEYS.map(k=>[k,{text:(sp.fields[k]||['']).join('\n'),conf:'SURE'}])), rows:sp.rows.map(r=>Object.assign({conf:'SURE'},r)), totals:{containers:sp.totals.count, bales:sp.totals.bales, weight:sp.totals.weight}}, cp, {meta:META(cp)});
  eq(c0.items.filter(i=>i.key!=='ai:scan').map(i=>[i.key,i.status]), ref.items.map(i=>[i.key,i.status]),'3-2 AI 판독 = 같은 값의 NACCS 판독과 같은 줄 · 같은 판정 (참고 줄만 더)');
  const c1=ACL.compareOne(m1, cp, {meta:META(cp)}), n1=item(c1,'notify');
  ok(c1.verdict==='読取確認要'&&n1.status==='READ_CHECK'&&/AI 2 回の判読が違う/.test(n1.detail)&&/SAMPIE/.test(n1.detail)&&/2 回で違う 2 か所/.test(item(c1,'ai:scan').detail),'3-3 칸 AI_DIFF → 読取確認要 · 두 값 메모',{v:c1.verdict, d:n1});
  const c3=ACL.compareOne(m3, cp, {meta:META(cp)}), s0=item(c3,'set:'+cp.containers[0].crcf9_container_no), ax=item(c3,'aclOnly:XTRU0000008');
  ok(s0.status==='READ_CHECK'&&/AI 2 回の判読が違う: シール/.test(s0.detail),'3-4 행 다름 → セット 読取確認要 (シール 두 값)',s0);
  ok(ax&&ax.status==='READ_CHECK'&&!c3.kinds['ACL のみのコンテナ'],'3-5 한 번만 읽힌 행 (COMPASS 없음) → 追加 가 아닌 読取確認要',ax);
  ok(ACL.scanLayoutOk(ACL.scanMerge(j,j))&&!ACL.scanLayoutOk(ACL.scanMerge(j,Object.assign({},j,{layout:'OTHER'})))&&!ACL.scanLayoutOk(ACL.scanMerge({layout:'OTHER'},{layout:'OTHER'})),'3-5b 様式 — 2 回とも NACCS だけ 照合 (片方でも OTHER = 照合しない)');
  { const jj=aiJson(cp, x=>{ x.fields.booking.text=x.fields.booking.text.replace(/K/,'K').replace(/1/,'I'); x.rows[0].seal=x.rows[0].seal.replace(/0/g,'O'); x.fields.totalWeight.text=String(x.fields.totalWeight.text).replace(/(\d{3})$/,', $1. 000 KGM').replace(/^(\d+), /,'$1, '); return x; }), mm=ACL.scanMerge(jj,jj), co=ACL.compareOne(mm, cp, {meta:META(cp)});
    ok(item(co,'booking').status==='READ_CHECK'&&/O と 0/.test(item(co,'booking').detail)&&item(co,'set:'+cp.containers[0].crcf9_container_no).status==='READ_CHECK'&&!co.kinds['BOOKING No. 相違']&&!co.kinds['セット相違:シール'],'3-5c AI 판독 번호의 O↔0 · I↔1 만 다름 → 相違 가 아닌 読取確認要 (부킹 · 씰)',co.kinds);
    ok(mm.totals.weight===FX.perfectSpec(ACL,cp).totals.weight,'3-5d 「20, 300. 000 KGM」 처럼 숫자 사이 공백 → 합계 그대로 (공백 없앰)',[jj.fields.totalWeight.text, mm.fields.totalWeight.text, mm.totals.weight]); }
  const cm=ACL.compareOne(ACL.scanMerge({fields:{}},{fields:{}}), cp, {meta:META(cp)});
  ok(cm.verdict==='読取確認要','3-6 AI 가 아무 칸도 못 읽음 → 読取確認要 (相違 아님 · readFail)',cm.verdict);

  /* 4 NACCS = v0.13 */
  let old=null; try{ old=cpr.execFileSync('git',['show','e18253a:acl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
  if(old){ const O=core(old); let same=0, n=0, bad=[];
    for(let k=1;k<=13;k++){ const c=FX.compass(k,{containers:k===9?20:3}); let s=FX.perfectSpec(O,c);
      if(k===2) s.rows[1].seal='SL999999'; if(k===3){ s.rows[0].bales=99; FX.retotal(s); } if(k===4){ s.rows=s.rows.slice().reverse(); s.order='shuffle'; } if(k===5){ s.rows.push({container:'XTRU0000008',seal:'SLX00001',bales:10,cargo:9000,tare:3700,measure:40}); FX.retotal(s); }
      if(k===6) s.fields.booking=['BK7777777']; if(k===7){ s.fields.description=s.fields.description.filter(l=>!/^L\/C NO/.test(l)); s.fields.consignee=s.fields.consignee.concat(['EXTRA LINE ADDED BY FORWARDER']); }
      if(k===12) s.overflow='THIS IS A VERY LONG LINE OF TEXT THAT RUNS PAST THE DESCRIPTION CELL INTO THE NEXT CELL';
      if(k===10||k===11||k===13) continue;
      const pages=await R.readItems(Buffer.from(await N.build(s))); n++;
      const a=O.readNaccs(pages), b=ACL.readNaccs(pages);
      const ca=O.compareOne(a,c,{meta:{pay:'LC'}}), cb=ACL.compareOne(b,c,{meta:{pay:'LC'}});
      if(J(a)===J(b)&&J(ca)===J(cb)&&J(O.classifyFormat(pages))===J(ACL.classifyFormat(pages))) same++; else bad.push(k); }
    ok(same===n&&n===10,'4-1 가짜 NACCS '+n+' 경우 — classifyFormat · readNaccs · compareOne 이 v0.13 (e18253a) 과 바이트까지 같음',bad); }
  else ok(true,'4-1 (git 기록 없음 · 생략)');

  /* 5 tools/acl_scan_ai.mjs (가짜 AI) */
  const T=await import(require('url').pathToFileURL(path.join(__dirname,'../../tools/acl_scan_ai.mjs')).href);
  const pdf=Buffer.from(await N.build({kind:'SCAN'})), calls=[];
  const fake=(texts)=>async(body,label)=>{ calls.push({label, doc:body.messages[0].content[0].type, model:body.model, cc:!!body.messages[0].content[1].cache_control}); const t=texts.shift(); return {text:t, usage:{input_tokens:1000, output_tokens:500}, stop:'end_turn', model:body.model}; };
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'scanai_'));
  const r1x=await T.scanReadCached(pdf, tmp, {ACL, call:fake(['```json\n'+J(j)+'\n```', 'sorry', J(j)])});
  ok(calls.length===3&&calls.every(c=>c.doc==='document'&&c.model==='claude-opus-5-5'&&c.cc)&&r1x.reads.length===2&&!r1x.cached&&/再試行/.test(calls[2].label),'5-1 AI 2 회 (PDF = document · 같은 모델 · 캐시 표시) · JSON 못 읽으면 1 번 다시 묻기',calls);
  ok(r1x.sha256===crypto.createHash('sha256').update(pdf).digest('hex')&&fs.existsSync(path.join(tmp,r1x.sha256+'.json'))&&r1x.cost_usd>0,'5-2 sha256 이름으로 저장 · 費用');
  calls.length=0; const r2x=await T.scanReadCached(pdf, tmp, {ACL, call:fake([])});
  ok(r2x.cached&&calls.length===0&&J(r2x.reads)===J(r1x.reads),'5-3 같은 PDF → 저장본 (AI 0 번)');
  fs.rmSync(tmp,{recursive:true,force:true});

  /* 6 화면 (jsdom) — e2e.js 의 가짜 세계 · 가짜 통신을 그대로 쓰고, AI · _scan_ai 만 더함 */
  const src=fs.readFileSync(path.join(__dirname,'e2e.js'),'utf8'), head=src.slice(0, src.indexOf('(async()=>{'));
  const H=new Function('require','process','__dirname', head.replace('w.fetch=fakeFetch(W);','w.fetch=W.wrap?W.wrap(fakeFetch(W)):fakeFetch(W); if(W.prep) W.prep(w);')+';return {world, page, until, $};')(require, {argv:[process.argv[0],'e2e.js',HTML_P]}, __dirname);
  const W=await H.world(), AIc=[], cpScan=W.cps['NFK2601-10'], sse=t=>{ const ev=[{type:'message_start',message:{usage:{input_tokens:1000},model:'claude-opus-5-5'}},{type:'content_block_delta',delta:{type:'text_delta',text:t}},{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:400}}];
    const body=ev.map(e=>'data: '+J(e)+'\n\n').join(''); let sent=false; return {ok:true,status:200,headers:{get:()=>null},body:{getReader:()=>({read:async()=>{ if(sent) return {done:true}; sent=true; return {done:false, value:new TextEncoder().encode(body)}; }})}}; };
  W.prep=w=>{ try{ if(!w.crypto||!w.crypto.subtle) Object.defineProperty(w,'crypto',{value:crypto.webcrypto, configurable:true}); }catch(e){} const st={leenai_apikey_v1:'sk-test-fake'}; Object.defineProperty(w,'localStorage',{value:{getItem:k=>st[k]==null?null:st[k], setItem:(k,v)=>{ st[k]=String(v); }, removeItem:k=>{ delete st[k]; }}, configurable:true}); };
  W.wrap=base=>async(url,init)=>{
    if(String(url).indexOf('https://api.anthropic.com/')===0){ const b=JSON.parse(init.body); AIc.push({doc:b.messages[0].content[0].type, key:init.headers['x-api-key'], browser:init.headers['anthropic-dangerous-direct-browser-access']}); return sse(J(aiJson(cpScan))); }
    const u=decodeURIComponent(String(url)); const m=u.match(/_scan_ai\/([0-9a-f]{64})\.json:\/content/);
    if(m&&(!init||!init.method||init.method==='GET')){ const k=Object.keys(W.puts).find(p=>p.indexOf('_scan_ai/'+m[1])>=0); return k?{ok:true,status:200,headers:{get:()=>null},json:async()=>JSON.parse(W.puts[k])}:{ok:false,status:404,headers:{get:()=>null},json:async()=>({})}; }
    return base(url,init); };
  const w=await H.page(W), $=id=>w.document.getElementById(id);
  $('abList').click(); await H.until(()=>/完了|ab-ng/.test($('abListSt').innerHTML));
  ok(/うち スキャン 1 件 = AI 判読 \(スキャン\)/.test($('abRunSt').textContent),'6-1 件数 표시에 스캔 1 件',$('abRunSt').textContent);
  $('abInv').value='NFK2601-10\nNFK2601-01'; $('abInv').dispatchEvent(new w.Event('input'));
  $('abRun').click(); await H.until(()=>/完了|止めました/.test($('abRunSt').textContent),60000);
  let RS=JSON.parse(w.eval('JSON.stringify(S.results)')), s10=RS.find(r=>r.invoice==='NFK2601-10');
  ok(s10.verdict==='読取対象外'&&AIc.length===0&&/AI 判読なし/.test(s10.why)&&RS.find(r=>r.invoice==='NFK2601-01').verdict==='完全一致','6-2 체크 없음 · 저장본 없음 → 読取対象外 (AI 0) · NACCS 는 그대로',{v:s10.verdict, why:s10.why, ai:AIc.length});
  $('abScanAi').checked=true; $('abRun').click(); await H.until(()=>/完了|止めました/.test($('abRunSt').textContent)&&!w.eval('S.running'),60000);
  RS=JSON.parse(w.eval('JSON.stringify(S.results)')); s10=RS.find(r=>r.invoice==='NFK2601-10');
  const putK=Object.keys(W.puts).filter(p=>/_scan_ai\/[0-9a-f]{64}\.json$/.test(p));
  ok(AIc.length===2&&AIc.every(c=>c.doc==='document'&&c.key==='sk-test-fake'&&c.browser==='true')&&putK.length===1&&/^古紙\/-\. AI 活用\/D-00\/ACL_bench\/_scan_ai\//.test(putK[0]),'6-3 체크 → AI 2 번 (PDF 그대로 · D-01/A1 과 같은 키) · ACL_bench/_scan_ai/{sha256}.json 저장 1',{ai:AIc.length, puts:putK});
  ok(s10.verdict==='完全一致'&&s10.ai&&s10.ai.label==='AI 判読 (スキャン)'&&s10.format==='SCAN'&&/AI 判読 \(スキャン\)/.test($('abResults').innerHTML),'6-4 결과 = NACCS 와 같은 照合 (完全一致) · 결과 · 화면에 「AI 判読 (スキャン)」',{v:s10.verdict, k:s10.kinds});
  ok(/AI 判読 \(スキャン\) 1 件 \(保存済み 0 · 新しく 1/.test($('abRunSt').textContent)&&w.eval('S.run.scan_ai.read')===1,'6-5 완료 문구 · run.scan_ai (費用 기록)',$('abRunSt').textContent);
  AIc.length=0; $('abRun').click(); await H.until(()=>/完了|止めました/.test($('abRunSt').textContent)&&!w.eval('S.running'),60000);
  RS=JSON.parse(w.eval('JSON.stringify(S.results)')); s10=RS.find(r=>r.invoice==='NFK2601-10');
  ok(AIc.length===0&&s10.verdict==='完全一致'&&w.eval('S.run.scan_ai.cached')===1,'6-6 다시 照合 → 같은 파일은 저장본 (AI 0 번)',{ai:AIc.length});
  { const k=Object.keys(W.puts).find(p=>/_scan_ai\//.test(p)), rec=JSON.parse(W.puts[k]); rec.reads.forEach(x=>{ x.layout='OTHER'; }); W.puts[k]=JSON.stringify(rec);
    /* v0.15 (G9) 로 바뀜: 2 회 다 「その他の様式」 → 乙仲様式 프롬프트로 다시 읽음 (tests/acl_bench/v15.js) · 체크를 끄면 AI 0 · 読取対象外 (AI 判読なし) */
    $('abScanAi').checked=false; AIc.length=0; $('abRun').click(); await H.until(()=>/完了|止めました/.test($('abRunSt').textContent)&&!w.eval('S.running'),60000);
    const o=JSON.parse(w.eval('JSON.stringify(S.results)')).find(r=>r.invoice==='NFK2601-10');
    ok(o.verdict==='読取対象外'&&/AI 判読なし/.test(o.why)&&AIc.length===0,'6-6b AI 가 2 회 다 「その他の様式」 + 체크 없음 → 読取対象外 (이유 표시 · AI 0) — v0.15: 체크하면 乙仲様式 판독 (v15.js)',{v:o.verdict, why:o.why}); $('abScanAi').checked=true; }
  ok(W.dv.every(x=>x.method==='GET'),'6-7 COMPASS 는 GET 만');
  const txt=[$('abScanAi').parentNode.textContent, $('abRunSt').textContent, s10.why||'', J(s10.items.filter(i=>i.key==='ai:scan')), $('abResults').textContent].join(' '), hg=/[\uAC00-\uD7A3]/;
  ok(!hg.test(txt)&&!hg.test(ACL.scanPrompt()+ACL.SCAN_SYSTEM+J(ACL.SCAN_AI)),'6-8 v0.14 로 늘어난 화면 문구 · 결과 줄 · 프롬프트 한글 0',txt.slice(0,300));
  w.close();

  console.log(`v14 pass ${pass} fail ${fail}`); process.exit(fail?1:0);
})().catch(e=>{ console.log('FAIL 예외',e.stack); console.log('v14 pass '+pass+' fail '+(fail+1)); process.exit(1); });
