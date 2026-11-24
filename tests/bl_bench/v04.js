/* bl_bench v0.4 시험 (지시서 THOR_11 E-5 — Draft 에 이 계약과 다른 계약번호) — 가짜 데이터만 · 네트워크 0
   1 otherCtLines — 다른 번호만 · 같은 번호 · 앞뒤 영숫자 (LRS-2699AA12 ≠ LRS-2699AA1) · 번호 1 번만
   2 judgeInvoice — 다른 번호 → 相違 (「別の契約番号」 · 그 줄 글자를 결과에) · 같은 번호 / 계약번호 모름 = v0.3 과 같은 결과
   3 화면 (viewHtml) — 「別の契約番号: …」 · 한글 0
   node v04.js [html] */
const path=require('path'), cpr=require('child_process'), T=require('./lib.js'), F=require('./fixtures.js'), {ok, eq}=T;
const BL=T.loadCore(process.argv[2]);
const pdfLines=async pages=>BL.linesOf(await T.readPages(await T.mkPdf(pages)));
const judge=async(B,o)=>{ o=o||{}; const L=await pdfLines([F.draftItems(o.d)]); return B.judgeInvoice(Object.assign({iv:F.IV, carrier:'TEST', si:F.si(o.si), lc:F.lc(), lcWanted:true, files:[{id:'x',name:F.IV+'_DRAFT.pdf',mod:'2026-10-01',L}]}, o.contract?{contract:o.contract}:{})); };
const X=t=>({extra:[{x:200,y:480,t}]});
(async()=>{
  console.log('1 otherCtLines');
  eq(BL.otherCtLines([{t:'CONTRACT NO. LRS-2699ZZ2', p:1},{t:'REF LRS-2699AA1 / LRS-2699ZZ2', p:1},{t:'LRS-2699AA12', p:2}],'LRS-2699AA1').map(o=>o.no),['LRS-2699ZZ2','LRS-2699AA12'],'다른 번호만 · 1 번씩 · 앞뒤 영숫자 다르면 다른 번호');
  eq(BL.otherCtLines([{t:'LRS-2699AA1', p:1}],'lrs-2699aa1'),[],'같은 번호 (대소문자 무시) = 없음');
  console.log('2 judgeInvoice');
  const J=await judge(BL,{d:X('CONTRACT NUMBER (LRS-2699ZZ2)'), contract:'LRS-2699AA1'});
  ok(J.verdict==='相違'&&J.otherCt.length===1&&J.otherCt[0].no==='LRS-2699ZZ2'&&/LRS-2699ZZ2/.test(J.otherCt[0].text),'다른 계약번호 → 相違 · 줄 글자를 결과에',{v:J.verdict,o:J.otherCt,c:J.conclusion});
  const J2=await judge(BL,{d:X('CONTRACT NUMBER (LRS-2699AA1)'), contract:'LRS-2699AA1'}); ok(!J2.otherCt.length,'같은 계약번호 = 없음',J2.otherCt);
  const J3=await judge(BL,{d:X('CONTRACT NUMBER (LRS-2699ZZ2)')}); ok(!J3.otherCt.length,'계약번호 모름 = 검사 안 함',J3.otherCt);
  let old=null; try{ old=cpr.execFileSync('git',['show','e18253a:bl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26}); }catch(e){}
  if(old){ const fs=require('fs'), os=require('os'), tmp=path.join(os.tmpdir(),'bl03_'+process.pid+'.html'); fs.writeFileSync(tmp,old); const B3=T.loadCore(tmp); fs.unlinkSync(tmp);
    const a=await judge(BL,{d:X('CONTRACT NUMBER (LRS-2699AA1)'), contract:'LRS-2699AA1'}), b=await judge(B3,{d:X('CONTRACT NUMBER (LRS-2699AA1)'), contract:'LRS-2699AA1'}); delete a.otherCt;
    ok(JSON.stringify(a)===JSON.stringify(b),'다른 번호 없음 = v0.3 (e18253a) 과 결과 같음'); }
  else ok(true,'(git 기록 없음 · 생략)');
  console.log('3 화면');
  const h=BL.viewHtml(J,{}); ok(/別の契約番号: LRS-2699ZZ2/.test(h)&&/Draft 1 頁: 「CONTRACT NUMBER \(LRS-2699ZZ2\)」/.test(h)&&!/[가-힣]/.test(h),'「別の契約番号: …」 · 줄 글자 · 한글 0',h.slice(0,300));
  T.done('v04');
})().catch(e=>{ console.log('FAIL 예외',e); T.done('v04'); });
