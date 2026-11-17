/* v0.2 회귀 확인 — 실제 NACCS 위치 관계를 흉내 낸 가짜 PDF 를 v0.1 규칙 (이전 html) 과 v0.2 규칙 (지금 html) 으로 읽는다.
   v0.1 은 실제에서 실패한 그대로 실패해야 하고 (씰 빈칸 · 총 중량 못 읽음 · 「-」 · LOCODE 섞임 · JAPAN 지움), v0.2 는 다 읽어야 한다.
   node regress.js <old.html> [new.html] */
const fs=require('fs'),path=require('path'),FX=require('./fixtures'),N=require('./fake_naccs'),R=require('./pdfread');
const load=f=>new Function('module',fs.readFileSync(f,'utf8').match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
const OLD=load(process.argv[2]), NEW=load(process.argv[3]||path.join(__dirname,'../../acl_bench.html'));
let pass=0,fail=0; const ok=(c,m,info)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m,info===undefined?'':JSON.stringify(info).slice(0,500));} };
/* 읽기 상태 — 실제 5건 실행 결과에서 본 실패를 항목으로 */
function state(ACL, pages, cp){
  const a=ACL.readNaccs(pages), F=a.fields, c=ACL.compareOne(a,cp);
  return {sealsRead:a.rows.every(r=>r.seal&&!/\)/.test(r.seal)), rowsSure:a.rows.every(r=>r.conf==='SURE'), weight:a.totals.weight,
    clean:['shipper','consignee','notify','booking','vessel','pol','receipt'].every(k=>F[k]&&F[k].text&&!/(^|\n| )-( |\n|$)|^-/.test(F[k].text)&&!/9TST|VNTST|JPTYO|\b51\b/.test(F[k].text)),
    verdict:c.verdict, kinds:Object.keys(c.kinds)};
}
(async()=>{
  for(const [n,k,o] of [[1,3,'valuesFirst'],[9,20,'shuffle']]){
    const cp=FX.compass(n,{containers:k}), pages=await R.readItems(await N.build(Object.assign(FX.perfectSpec(NEW,cp),{order:o})));
    const so=state(OLD,pages,cp), sn=state(NEW,pages,cp);
    ok(!so.sealsRead&&!so.rowsSure&&so.weight==null&&!so.clean&&so.verdict==='相違あり','v0.1 규칙: 실제와 같은 실패 재현 ('+k+' 컨테이너 · '+o+') — 씰 · 총 중량 · 「-」/코드 섞임 → 相違あり',so);
    ok(sn.sealsRead&&sn.rowsSure&&sn.weight!=null&&sn.clean&&sn.verdict==='完全一致'&&sn.kinds.join()==='XX残存:Description of Goods','v0.2 규칙: 같은 PDF 를 다 읽음 → 完全一致 (XX 残存만 따로)',sn);
  }
  console.log('regress pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
