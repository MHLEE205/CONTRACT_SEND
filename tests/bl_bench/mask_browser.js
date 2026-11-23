/* 가리기 — 실제 Chrome (Playwright) 에서 bl_bench.html 의 buildBuyerPdf 를 그대로 (가짜 Draft) — 필요: playwright (BL_PLAYWRIGHT=경로 또는 설치) · cdnjs (pdf.js · jsPDF) 접속
   확인: 새 PDF 의 글자 층 0 · 검은 칸 화소 · 운임 목록 쪽 뺌 · 쪽 수 · 수동 판정 (청구서만) */
const fs=require('fs'), path=require('path'), T=require('./lib.js'), F=require('./fixtures.js'), {ok, eq}=T;
let pw=null; try{ pw=require(process.env.BL_PLAYWRIGHT||'playwright'); }catch(e){ console.log('mask_browser skip (playwright 없음)'); console.log('mask_browser pass 0 fail 0'); process.exit(0); }
(async()=>{
  const html=fs.readFileSync(T.HTML,'utf8').replace(/<script src="https:\/\/mhlee205\.github\.io\/LEENAI_COMMON\/v1\/leenai-common\.js"><\/script>/,
    '<script>window.LEENAI={init(c){document.addEventListener("DOMContentLoaded",()=>{document.getElementById("app").style.display="";c.onReady();});},auth:{token:async()=>"X",status:{dataverse:"-",graph:"-"}},SP:{DRIVE_ID:"D"},master:{get:async()=>null}};</script>');
  const att=[{x:24,y:80,t:'*** B/L Attached List ***'},{x:30,y:100,t:'<<Charge>>'},{x:30,y:130,t:'ALL'},{x:200,y:130,t:'USD250.00'},{x:310,y:130,t:'USD2500.00'},{x:30,y:145,t:'TOTAL'},{x:310,y:145,t:'JPY999990.00'}];
  const cases=[['운임표 + 목록 쪽', await T.mkPdf([F.draftItems({freight:F.FREIGHT}),att]), {ok:true, pages:1, dropped:'2', targets:8}],
    ['운임 없음', await T.mkPdf([F.draftItems()]), {ok:true, pages:1, dropped:'', targets:0}],
    ['표 밖 금액 (手で)', await T.mkPdf([F.draftItems({freight:F.FREIGHT.concat([{x:30,y:700,t:'B/L AMENDMENT FEE 6100 JPY'}])})]), {ok:false}]];
  const browser=await pw.chromium.launch(process.env.BL_CHANNEL?{channel:process.env.BL_CHANNEL}:{}), ctx=await browser.newContext(), page=await ctx.newPage(); const errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  await ctx.route('https://mhlee205.github.io/CONTRACT_SEND/bl_bench.html', r=>r.fulfill({status:200, contentType:'text/html; charset=utf-8', body:html}));
  await ctx.route(/graph\.microsoft\.com|dynamics\.com|login\.microsoftonline\.com/, r=>{ errs.push('network '+r.request().url()); return r.abort(); });
  await page.goto('https://mhlee205.github.io/CONTRACT_SEND/bl_bench.html'); await page.waitForFunction(()=>window.BLAPP);
  for(const [name,bytes,want] of cases){
    const r=await page.evaluate(async b64=>{ const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); const pages=await BLAPP.readPages(bytes), L=BL.linesOf(pages);
      const x=await BLAPP.buildBuyerPdf(bytes,L,{carrier:'ONE'}); let n=0; if(x.ok){ const back=await BLAPP.readPages(x.bytes); n=back.length; }
      return {ok:x.ok, why:x.why||[], check:x.check||null, n, targets:(x.plan&&x.plan.targets||[]).length}; }, Buffer.from(bytes).toString('base64'));
    eq(r.ok,want.ok,name+' 자동 여부 '+(r.why||[]).join(';'));
    if(want.ok){ eq(r.check.textItems,0,name+' 글자 층 0'); eq(r.check.pixelBad,0,name+' 검은 칸 화소'); eq(r.n,want.pages,name+' 쪽 수'); eq(r.check.dropped.join(','),want.dropped,name+' 뺀 쪽'); eq(r.targets,want.targets,name+' 가린 숫자'); }
  }
  eq(errs,[],'페이지 오류 · 외부 통신 0');
  await browser.close(); T.done('mask_browser');
})().catch(e=>{ console.log('FAIL exception',e.stack); process.exit(1); });
