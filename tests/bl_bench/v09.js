/* bl_bench v0.9 시험 (지시서 THOR_35 · 형님 N69) — 가짜 데이터 · 네트워크 0
   L/C 44B (최종 목적지) 가 있으면 Draft 의 Place of Delivery 칸과 대조 — 빈칸 = 相違 「44B 最終仕向地がない（Place of Delivery 空欄）」 ·
   44B 의 지명 중 하나 = 一致 · 다르면 相違 · 44B 없음 = v0.8 과 같은 결과 (행을 더하지 않음)
   회귀: v0.8 (2cc68da) 의 bl-core 와 같은 입력으로 돌려 44B 행 말고는 결과가 같음 · node v09.js [bl_bench.html] */
const T=require('./lib.js'), F=require('./fixtures.js'), {ok, eq}=T, vm=require('vm');
const BL=T.loadCore(process.argv[2]);
const ITEM='Final destination (44B)', BLANK='44B 最終仕向地がない（Place of Delivery 空欄）';
const V44B='HO CHI MINH CITY, VIETNAM OR BINH DUONG, VIETNAM';
/* v0.8 bl-core (git 기록 · 없으면 회귀 시험만 건너뜀) */
let OLD=null;
try{ const h=require('child_process').execFileSync('git',['show','2cc68da:bl_bench.html'],{cwd:__dirname,encoding:'utf8',maxBuffer:1<<26,stdio:['ignore','pipe','ignore']});
  const ctx={module:{exports:{}}, console}; vm.createContext(ctx); vm.runInContext(h.match(/<script id="bl-core">([\s\S]*?)<\/script>/)[1]+'\n;module.exports=BL;',ctx); OLD=ctx.module.exports; OLD.useEngine(T.loadAcl()); }catch(e){ OLD=null; }
const linesOf=async items=>BL.linesOf(await T.readPages(await T.mkPdf([items])));
const lcStore=over=>F.lc(Object.assign({contract:'LRS-2699TE1', lc_no:'TLC2699'}, over||{}));
function judge(B, L, o){ o=o||{}; return B.judgeInvoice(Object.assign({iv:F.IV9, carrier:'TEST LINE', files:[{id:'D1', name:F.IV9+'_DRAFT REV.pdf', mod:'2026-10-14', L}], lc:lcStore(o.store), lcWanted:true, alias:[]},
  o.si?{si:o.si}:{}, o.lcText!==undefined?{lcText:o.lcText}:{})); }
const row=res=>(res.B||[]).find(r=>r.item===ITEM)||null;
const strip=res=>Object.assign({},res,{B:(res.B||[]).filter(r=>r.item!==ITEM)});
(async()=>{
  /* ① lc44B — L/C 判読構造から 44B */
  eq(BL.lc44B(F.lcText(V44B)),{text:V44B, raw:V44B, src:'44B', refer:false},'① 44B 의 값 (view 「:44B: … = 값」)');
  eq(BL.lc44B(F.lcText(null)),null,'① 44B 없음 = null');
  eq(BL.lc44B(''),null,'① L/C 글자 없음 = null');
  eq(BL.lc44B(F.lcText('CAT LAI PORT, VIETNAM',['  AMEND1 :44B: REPLACE BINH DUONG, VIETNAM'])).text,'BINH DUONG, VIETNAM','① Amend 의 44B (REPLACE) = 마지막 것');
  eq(BL.lc44B(F.lcText('PLS SEE FIELD 47A',['  44B → 47A-7: 7/ FIELD 44B/ PLACE OF FINAL DESTINATION/ PLACE OF DELIVERY: BINH DUONG/HO CHI MINH CITY, VIETNAM'])),
    {text:'BINH DUONG/HO CHI MINH CITY, VIETNAM', raw:'PLS SEE FIELD 47A', src:'47A-7', refer:false},'① 44B → 47A 의 줄 (마지막 「:」 뒤)');
  eq(BL.lc44B(F.lcText('REFER FIELD 47A')).refer,true,'① 44B → 47A 인데 47A 줄 없음 = refer');
  /* ② fdMatch — 44B 의 지명 하나라도 */
  eq(BL.fdMatch(V44B,'BINH DUONG, VIETNAM'),'BINH DUONG, VIETNAM','② 둘째 지명');
  eq(BL.fdMatch(V44B,'HO CHI MINH CITY'),'HO CHI MINH CITY, VIETNAM','② 첫째 지명 (나라 이름 없어도)');
  eq(BL.fdMatch(V44B,'HOCHIMINH, VN'),'HO CHI MINH CITY, VIETNAM','② 붙여 쓴 지명');
  eq(BL.fdMatch(V44B,'HAIPHONG, VIETNAM'),'','② 다른 지명 = 없음');
  eq(BL.fdMatch('LAT KRABANG AND/OR NH SAMPLE TERMINAL, THAILAND','NH SAMPLE, THAILAND'),'NH SAMPLE TERMINAL, THAILAND','② AND/OR · TERMINAL');

  /* ③ 실례의 모양 (가짜 값) — 44B 있음 + Place of Delivery 빈칸 → 相違 (정확한 이유) */
  const Lb=await linesOf(F.draftWaybill());
  eq(BL.deliveryOf(Lb),{label:true, text:'', page:1},'③ Draft 의 Place of Delivery = 칸 이름 있음 · 빈칸 (아래 Weight · Measurement 줄은 안 읽음)');
  const rb=judge(BL,Lb,{lcText:F.lcText(V44B)}), xb=row(rb)||{};
  eq([xb.result,xb.note,xb.draft,xb.lc_quote],['DIFF',BLANK,'(空欄)',V44B],'③ 44B + 빈칸 = 相違 「'+BLANK+'」');
  eq(rb.verdict,'相違','③ 판정 = 相違');
  const vb=BL.viewHtml(rb);
  ok(vb.indexOf('最終仕向地 (44B)')>=0&&vb.indexOf(BLANK)>=0,'③ 화면 — 最終仕向地 (44B) · 이유');
  ok(!/[가-힣]/.test(vb)&&!/[가-힣]/.test(BL.toCsv([rb])),'③ 화면 · CSV 한글 0');
  ok(BL.toCsv([rb]).indexOf(BLANK)>=0,'③ CSV 에 이유');
  /* 44B 가 없는 L/C (같은 Draft) → 행 없음 · 판정 = 44B 행 없는 결과와 같음 */
  const rn=judge(BL,Lb,{lcText:F.lcText(null)});
  eq(row(rn),null,'③ 44B 없음 → 44B 행 없음');
  eq(JSON.stringify(strip(rb).B),JSON.stringify(rn.B),'③ 44B 행 말고 B 항목 같음');

  /* ④ 44B 목록 + PoD = 그중 하나 → 一致 (판정 바뀌지 않음) */
  const Lm=await linesOf(F.draftWaybill({delivery:'BINH DUONG, VIETNAM'}));
  eq(BL.deliveryOf(Lm).text,'BINH DUONG, VIETNAM','④ Place of Delivery 읽음');
  const rm=judge(BL,Lm,{lcText:F.lcText(V44B)}), xm=row(rm)||{}, rm0=judge(BL,Lm,{lcText:F.lcText(null)});
  eq([xm.result,xm.draft],['SAME','BINH DUONG, VIETNAM'],'④ 一致 '+xm.note);
  eq(BL.lcResJa(xm.result),'一致','④ 화면 말 一致');
  eq([rm.verdict,rm.conclusion],[rm0.verdict,rm0.conclusion],'④ 판정 = 44B 없을 때와 같음');

  /* ⑤ 다른 지명 → 相違 (이유에 Draft 값 · 44B 값) */
  const Ld=await linesOf(F.draftWaybill({delivery:'HAIPHONG, VIETNAM'}));
  const rd=judge(BL,Ld,{lcText:F.lcText(V44B)}), xd=row(rd)||{};
  eq([xd.result,xd.note],['DIFF','44B 最終仕向地と違う（Place of Delivery HAIPHONG, VIETNAM · 44B '+V44B+'）'],'⑤ 相違 · 이유');
  eq(rd.verdict,'相違','⑤ 판정 = 相違');

  /* ⑥ 44B 없음 → 아무것도 더하지 않음 (lcText 없음 · 44B 없는 L/C 글자 · lcView 1 인수) */
  const r0=judge(BL,Lb,{}); eq(row(r0),null,'⑥ lcText 없음 → 44B 행 없음');
  eq(BL.lcView(lcStore()).finalDest,null,'⑥ lcView (保管所 만 · 44B 없음) = finalDest null');
  /* 保管所 final_dest 가 있으면 그것 (lc_text 보다 먼저) */
  eq(BL.lcView(lcStore({final_dest:{text:'BINH DUONG, VIETNAM'}}),F.lcText(V44B)).finalDest.text,'BINH DUONG, VIETNAM','⑥ 保管所 final_dest 우선');
  /* 47A 참조 (지명 줄 없음) → 対象外 (판정 영향 0) */
  const rr=judge(BL,Lb,{lcText:F.lcText('REFER FIELD 47A')}), xr=row(rr)||{};
  eq([xr.result,BL.lcResJa(xr.result)],['NA_44B_47A','対象外 (44B は 47A を参照)'],'⑥ 44B → 47A (줄 없음) = 対象外');
  eq(rr.verdict,rn.verdict,'⑥ 47A 참조 = 판정 그대로');
  ok(BL.CP_B_KEYS[ITEM]==='bl:lc:final44b','⑥ CP 키 bl:lc:final44b');
  /* S/I 의 Place of Delivery (있으면 참고 값) */
  const si=F.si({delivery:'BINH DUONG, VIETNAM'}), rs=judge(BL,Lb,{lcText:F.lcText(V44B), si});
  eq([(row(rs)||{}).result,(row(rs)||{}).si,(row(rs)||{}).note],['DIFF','S/I BINH DUONG, VIETNAM',BLANK],'⑥ S/I 값은 참고 (판정 · 이유 그대로)');
  ok(BL.viewHtml(rs).indexOf('S/I BINH DUONG, VIETNAM')>=0,'⑥ 화면에 S/I 값');
  /* 체크포인트 키 */

  /* ⑥-2 다른 양식의 Place of Delivery 칸 (가짜) — 번호 붙은 긴 칸 이름 (값은 칸 이름 왼쪽 끝 아래) · 「Place of delivery:」 오른쪽 값 (별지) · 같은 줄에 POD 칸 이름 */
  const L1=await linesOf(F.draftItems({delivery:'SAMPLE CITY CY', extra:[{x:200,y:320,t:'9.Combined Transport* Place of Delivery',size:7}]}).filter(i=>i.t!=='PLACE OF DELIVERY'));
  eq(BL.deliveryOf(L1).text,'SAMPLE CITY CY','⑥-2 번호 붙은 칸 이름');
  const L2=await linesOf(F.draftItems({delivery:''}).filter(i=>i.t!=='PLACE OF DELIVERY').concat([{x:23,y:700,t:'Place of delivery:',size:8},{x:138,y:700,t:'BINH DUONG, VIETNAM',size:8},{x:29,y:740,t:'*** B/L Attached List ***',size:8}]));
  eq(BL.deliveryOf(L2).text,'BINH DUONG, VIETNAM','⑥-2 「Place of delivery:」 오른쪽 (같은 줄)');
  const L3=await linesOf([{x:30,y:60,t:'SHIPPER',size:7},{x:30,y:120,t:'CONSIGNEE',size:7},{x:30,y:190,t:'NOTIFY PARTY',size:7},{x:30,y:290,t:'PORT OF LOADING',size:7},{x:30,y:320,t:'PORT OF DISCHARGE  PLACE OF DELIVERY',size:7},{x:30,y:332,t:'CAT LAI PORT, VIETNAM'},{x:30,y:355,t:'DESCRIPTION OF GOODS',size:7}]);
  eq(BL.deliveryOf(L3),{label:true, text:'', page:1},'⑥-2 POD 칸 이름과 한 줄 → 그 아래 왼쪽 값은 POD (Delivery 빈칸)');

  /* ⑦ 회귀 — v0.8 bl-core 와 같은 입력: 44B 행 말고 결과 같음 (기존 가짜 Draft · 실례 모양 · 44B 있음/없음) */
  if(!OLD) ok(true,'⑦ git 기록 없음 — 건너뜀');
  else {
    eq(OLD.VERSION,'0.8','⑦ 옛 판 = 0.8');
    const Lbase=await linesOf(F.draftItems()), Lpod=await linesOf(F.draftItems({delivery:''}));
    const cases=[['기존 Draft · S/I · 44B 있음',Lbase,{si:F.si(),lcText:F.lcText('CAT LAI PORT, VIETNAM')}],['기존 Draft · 44B 없음',Lbase,{si:F.si()}],['기존 Draft · Delivery 빈칸 · 44B',Lpod,{si:F.si(),lcText:F.lcText(V44B)}],
      ['실례 모양 · 44B',Lb,{lcText:F.lcText(V44B)}],['실례 모양 · 44B 일치',Lm,{lcText:F.lcText(V44B)}],['실례 모양 · S/I',Lb,{si:F.si(),lcText:F.lcText(V44B)}]];
    for(const [nm,L,o] of cases){
      const a=judge(BL,L,o), b=judge(OLD,L,o), A=strip(a);
      const extra=(a.B||[]).length-(b.B||[]).length;
      eq(JSON.stringify([A.A,A.B,A.C,A.other,A.otherCt,A.editions,A.file]),JSON.stringify([b.A,b.B,b.C,b.other,b.otherCt,b.editions,b.file]),'⑦ '+nm+' — 44B 행 말고 같음');
      ok(extra===(o.lcText&&BL.lc44B(o.lcText)?1:0),'⑦ '+nm+' — 더한 행 '+extra);
      if(!row(a)||!/^DIFF/.test(row(a).result)) eq([a.verdict,a.conclusion],[b.verdict,b.conclusion],'⑦ '+nm+' — 판정 같음');
      else ok(a.verdict==='相違','⑦ '+nm+' — 44B 相違 → 相違 (옛 판 '+b.verdict+' · 허용 변화)');
    }
  }
  eq(BL.VERSION,'0.9','bl-core VERSION 0.9');
  T.done('v09');
})().catch(e=>{ console.log('FAIL', e.stack); process.exit(1); });
