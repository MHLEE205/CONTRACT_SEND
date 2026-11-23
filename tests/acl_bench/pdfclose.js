/* (v0.3.1) readPdf 가 다 읽은 PDF 를 닫는지 — node pdfclose.js [html] [v0.3 html]   (가짜 데이터만)
   (v0.12: cmaps 주소 AB_CMAPS 도 넘김)
   도구의 readPdf · mapLimit · ① 一覧 의 mapLimit 콜백을 원문 그대로 꺼내, 가짜 pdf.js / 실제 pdf.js (pdfread.js 와 같은 방식) 로 돌린다 */
const fs=require('fs'),path=require('path'),FX=require('./fixtures'),N=require('./fake_naccs'),R=require('./pdfread');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../acl_bench.html'),'utf8');
const oldHtml=process.argv[3]?fs.readFileSync(process.argv[3],'utf8'):null;
const ACL=new Function('module',html.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
let pass=0,fail=0; const J=JSON.stringify;
const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':J(info).slice(0,600));} };
const fnSrc=(h,re)=>{ const m=h.match(re); if(!m) throw new Error('원문 없음 '+re); return m[0]; };
const READ=/async function readPdf\(file\)\{[\s\S]*?\n\}\n/, MAPL=/async function mapLimit\([\s\S]*?\n/;
/* 원문 그대로 · 주변 (graphFetch · drv · ensurePdfJs · logLine · window) 만 가짜 */
function load(h, env){
  return new Function('window','graphFetch','drv','ensurePdfJs','AB_PDFJS','logLine','AB_CMAPS', fnSrc(h,READ)+fnSrc(h,MAPL)+';return {readPdf, mapLimit};')(
    env.window, async()=>({ok:true, arrayBuffer:async()=>env.bytes(env.cur)}), ()=>'/drv', async()=>{}, '/pdfjs/', env.log, '/cmaps/');
}
/* ① 一覧 의 콜백 (runList 902행) 원문 — t.format='ERROR' 경로 확인용 */
const CB=html.match(/await mapLimit\(g\.targets,4,(async t=>\{[\s\S]*?\}\);)\n\s*S\.list=/)[1].replace(/\);$/,'');
const tick=()=>new Promise(r=>setTimeout(r,Math.floor(Math.random()*3)));

/* 가짜 pdf.js — 열기 (getDocument) · 문서 · 페이지. destroy 를 센다 (문서 쪽 · loading task 쪽 합계) */
function fakePdfjs(o){
  const st={created:0, destroyed:0, open:0, max:0, calls:[]};
  const lib={GlobalWorkerOptions:{}, getDocument(opt){
    st.created++; st.open++; st.max=Math.max(st.max,st.open); const name=o.nameOf?o.nameOf(opt):'x'; let done=false;
    const close=who=>{ st.calls.push(who); st.destroyed++; if(!done){ done=true; st.open--; } if(o.destroyThrows) throw new Error('destroy boom'); return Promise.resolve(); };
    const doc={numPages:o.pages||2, getPage:async i=>{ await tick(); return {getViewport:()=>({width:595.3}), getTextContent:async()=>{ if(o.pageFail===i) throw new Error('page '+i+' boom'); return {items:[{str:name+' P'+i, transform:[1,0,0,1,10.04,20.06], width:30.01},{str:'  ',transform:[1,0,0,1,0,0],width:1}]}; }}; }, destroy:()=>close('doc')};
    return {promise:(async()=>{ await tick(); if(o.openFail) throw new Error('open boom'); return doc; })(), destroy:()=>close('task')};
  }};
  return {lib, st};
}
const env=(lib,bytes)=>({window:{pdfjsLib:lib}, bytes:bytes||(()=>new ArrayBuffer(8)), cur:null, log:[]});
function mk(lib,bytes){ const e=env(lib,bytes), logs=[]; e.log=(m,c)=>logs.push([m,c]); const F=load(html,e); return {F, e, logs}; }

(async()=>{
console.log('1) 세 경우 모두 destroy 정확히 1번 · 오류는 그대로 위로');
{ const {lib,st}=fakePdfjs({pages:2}), {F,logs}=mk(lib);
  const pages=await F.readPdf({id:'A',name:'A_ACL.pdf'});
  ok(st.destroyed===1&&J(st.calls)===J(['doc'])&&st.open===0&&!logs.length,'① 정상 — 문서 쪽 destroy 1번 · 경고 없음',st);
  ok(J(pages)===J([1,2].map(i=>({page:i,w:595.3,items:[{s:'x P'+i,x:10,y:20.1,w:30}]}))),'① 정상 — pages 모양 그대로 (빈 글자 빼기 · 0.1 반올림)',pages); }
{ const {lib,st}=fakePdfjs({openFail:true}), {F}=mk(lib); let err=null;
  try{ await F.readPdf({id:'B',name:'B_ACL.pdf'}); }catch(e){ err=e; }
  ok(err&&err.message==='open boom'&&st.destroyed===1&&J(st.calls)===J(['task'])&&st.open===0,'② 열기 실패 — loading task 쪽 destroy 1번 · 원래 오류 그대로',{err:err&&err.message,st}); }
{ const {lib,st}=fakePdfjs({pages:3,pageFail:2}), {F}=mk(lib); let err=null;
  try{ await F.readPdf({id:'C',name:'C_ACL.pdf'}); }catch(e){ err=e; }
  ok(err&&err.message==='page 2 boom'&&st.destroyed===1&&J(st.calls)===J(['doc'])&&st.open===0,'③ 페이지 읽기 실패 — 문서 쪽 destroy 1번 · 원래 오류 그대로',{err:err&&err.message,st}); }
{ const {lib,st}=fakePdfjs({pages:1,destroyThrows:true}), {F,logs}=mk(lib);
  const pages=await F.readPdf({id:'D',name:'D_ACL.pdf'});
  ok(pages.length===1&&st.destroyed===1&&logs.length===1&&logs[0][1]==='warn'&&/D_ACL\.pdf/.test(logs[0][0]),'닫기 오류 — 삼키고 로그 1줄 · 결과 그대로',{logs,st}); }
{ const {lib,st}=fakePdfjs({openFail:true,destroyThrows:true}), {F,logs}=mk(lib); let err=null;
  try{ await F.readPdf({id:'E',name:'E_ACL.pdf'}); }catch(e){ err=e; }
  ok(err&&err.message==='open boom'&&st.destroyed===1&&logs.length===1,'열기 실패 + 닫기 오류 — 원래 오류 (open) 가 그대로 · 로그 1줄',{err:err&&err.message,logs}); }
{ /* ① 一覧 콜백 원문으로 — ②③ 은 t.format='ERROR' · 정상은 classifyFormat */
  const S={pdf:{}}, g={targets:[{invoice:'OK1',file:{id:'1',name:'OK1_ACL.pdf'}},{invoice:'NG2',file:{id:'2',name:'NG2_ACL.pdf'}},{invoice:'NG3',file:{id:'3',name:'NG3_ACL.pdf'}}]};
  const mode={'1':{pages:1},'2':{openFail:true},'3':{pages:2,pageFail:2}}, st={destroyed:0};
  const window={pdfjsLib:{GlobalWorkerOptions:{}, getDocument:opt=>{ const f=fakePdfjs(mode[opt.__id]), t=f.lib.getDocument(opt), wrap=x=>{ const d=x.destroy; x.destroy=()=>{ st.destroyed++; return d(); }; return x; };
    return {promise:t.promise.then(wrap), destroy:wrap(t).destroy}; }}};
  let cur=null; const logs=[];
  const F=new Function('window','graphFetch','drv','ensurePdfJs','AB_PDFJS','logLine','AB_CMAPS', fnSrc(html,READ)+fnSrc(html,MAPL)+';return {readPdf, mapLimit};')(
    window, async u=>{ cur=u.split('/')[2]; return {ok:true, arrayBuffer:async()=>new ArrayBuffer(8)}; }, ()=>'', async()=>{}, '', (m,c)=>logs.push(c), '');
  const realGD=window.pdfjsLib.getDocument; window.pdfjsLib.getDocument=opt=>realGD(Object.assign(opt,{__id:cur}));
  const $=()=>({}); const cb=new Function('readPdf','S','ACL','logLine','$','g','let k=0; return '+CB+';')(F.readPdf,S,ACL,(m,c)=>logs.push(c),$,g);
  for(const t of g.targets) await cb(t);
  const by=Object.fromEntries(g.targets.map(t=>[t.invoice,t.format]));
  ok(by.OK1&&by.OK1!=='ERROR'&&by.NG2==='ERROR'&&by.NG3==='ERROR'&&/open boom/.test(g.targets[1].why)&&/page 2 boom/.test(g.targets[2].why)&&st.destroyed===3&&S.pdf.OK1&&!S.pdf.NG2,
    '① 一覧 콜백 (원문) — 열기 · 페이지 실패는 t.format=ERROR (「PDF を読めず: 원래 오류」) · 3건 모두 닫음',{by,why:g.targets.map(t=>t.why),st}); }

console.log('2) 많이 읽기 — 가짜 PDF 400개를 mapLimit(4) 로');
{ const {lib,st}=fakePdfjs({pages:3, nameOf:o=>'N'}), {F}=mk(lib), list=Array.from({length:400},(_,i)=>({id:String(i),name:i+'_ACL.pdf'}));
  let n=0, maxBusy=0, busy=0; const res=[];
  await F.mapLimit(list,4,async f=>{ busy++; maxBusy=Math.max(maxBusy,busy); try{ res.push((await F.readPdf(f)).length); n++; } finally{ busy--; } });
  ok(n===400&&res.every(x=>x===3),'400개 모두 읽음',{n});
  ok(st.created===400&&st.destroyed===400&&st.open===0,'끝에 열린 문서 0 (생성 400 − destroy 400)',st);
  ok(st.max<=4&&maxBusy<=4,'도중 열린 문서 최대 '+st.max+' (4 이하)',{max:st.max,maxBusy}); }
{ /* 같은 시험을 v0.3 원문으로 — 닫지 않아 400개가 그대로 남음 (고치기 전 상태를 재현) */
  if(oldHtml){ const {lib,st}=fakePdfjs({pages:1}), e=env(lib); e.log=()=>{}; const F=load(oldHtml,e), list=Array.from({length:400},(_,i)=>({id:String(i)}));
    await F.mapLimit(list,4,async f=>{ await F.readPdf(f); });
    ok(st.destroyed===0&&st.open===400,'(대조) v0.3 원문은 destroy 0 — 400개가 열린 채 남음',st); } }

console.log('3) 실제 pdf.js — 가짜 NACCS PDF 의 pages 가 v0.3 readPdf 와 바이트까지 같음');
if(oldHtml){
  const specs=[FX.perfectSpec(ACL,FX.compass(1)), FX.perfectSpec(ACL,FX.compass(2,{containers:20})), FX.perfectSpec(ACL,FX.compass(3)), {kind:'SCAN'}, {kind:'OTHER'}];
  const bufs=[]; for(const s of specs) bufs.push(await N.build(s));
  const byId=i=>{ const b=bufs[i]; return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength); };
  const run=async h=>{ const e={window:{pdfjsLib:R.pdfjsForWindow()}, bytes:byId, cur:null}, logs=[]; e.log=(m,c)=>logs.push(m);
    const F=new Function('window','graphFetch','drv','ensurePdfJs','AB_PDFJS','logLine','AB_CMAPS', fnSrc(h,READ)+fnSrc(h,MAPL)+';return {readPdf, mapLimit};')(
      e.window, async u=>({ok:true, arrayBuffer:async()=>byId(+u.split('/')[2])}), ()=>'', async()=>{}, '', e.log, '');
    const out=[]; for(let i=0;i<bufs.length;i++) out.push(J(await F.readPdf({id:String(i)}))); return {out, logs}; };
  const a=await run(oldHtml), b=await run(html);
  ok(a.out.length===5&&a.out.every((s,i)=>s===b.out[i])&&b.out[1].length>a.out[0].length,'5개 (완전 · 컨테이너 20개 2쪽 이상 · 스캔 · 다른 양식) — v0.3 과 JSON 바이트 같음',a.out.map((s,i)=>[s.length,b.out[i].length]));
  ok(!b.logs.length,'실제 pdf.js 의 destroy — 경고 없음',b.logs);
  const direct=[]; for(let i=0;i<bufs.length;i++) direct.push(J(await R.readItems(bufs[i])));
  ok(direct.every((s,i)=>s===b.out[i]),'pdfread.js (시험용 읽기) 와도 같음');
  ok(ACL.classifyFormat(JSON.parse(b.out[0])).format==='NACCS'&&ACL.classifyFormat(JSON.parse(b.out[3])).format!=='NACCS','읽은 결과로 様式判定 그대로 (NACCS · 스캔)');
} else ok(false,'v0.3 원문 (인자 2) 없음');

console.log(`\npdfclose pass ${pass} fail ${fail}`); process.exitCode=fail?1:0;
})().catch(e=>{ console.log('FAIL',e.stack); console.log(`\npdfclose pass ${pass} fail ${fail+1}`); process.exitCode=1; });
