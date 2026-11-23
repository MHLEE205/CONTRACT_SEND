/* v0.3 전후 비교용 — v0.2 까지의 판정 값 · 칸 이름 (한국어) → v0.3 의 코드. 시험 · 재현 비교에서만 씀 (화면에 나가지 않음) */
const CLASS={'같음':'SAME','表記':'NOTATION','参考':'REF','판단 불가':'UNKNOWN','진짜 차이 의심':'DIFF','S/I 빈칸':'SI_BLANK'};
const FIELD={'본선·항차':'Vessel/Voyage','합계 Bales':'Total Bales','합계 중량':'Total Weight','합계 컨테이너 수':'Total Containers','B/L 종류 (SWB/OBL)':'B/L Type (SWB/OBL)','원본 통수':'Originals','Freight 조건':'Freight Term','T/S (환적) 표시':'T/S','On board 날짜':'On Board Date','현지 Agent':'Local Agent','Deposit 번호':'Deposit No.',
  'Consignee 은행':'Consignee bank','원본 통수 / SWB':'Originals / SWB','선적일 ≤ 44C':'Shipment ≤ 44C','47A 모든 서류 L/C 번호':'47A L/C No. in all docs'};
const RES=[[/^같음 \(44C 안\)/,'SAME_44C'],[/^같음/,'SAME'],[/^차이 \(약어만 다름\)/,'DIFF_ABBR'],[/^차이 \(44C 지남\)/,'DIFF_44C'],[/^차이/,'DIFF'],[/^날짜 없음/,'NO_DATE'],[/^판단 불가 \(46A/,'UNKNOWN_NO46A'],[/^판단 불가/,'UNKNOWN'],
  [/^해당 없음 \(ANY JAPAN PORT\)/,'NA_ANYJP'],[/^해당 없음 \(은행/,'NA_NOTBANK'],[/^해당 없음 \(APPLICANT/,'NA_NOTAPP'],[/^해당 없음 \(46A/,'NA_NO46A'],[/^해당 없음 \(47A/,'NA_NO47A'],[/^확인 필요/,'CHECK_PREPAID'],[/^L\/C 판독 要確認/,'LC_READ_CHECK'],
  [/^参考 \(保管所に未登録\)/,'REF_NOLC'],[/^表記 \(港の別名\)/,'NOTATION_ALIAS'],[/^参考 \(停止中 (.*)\)$/,'STOPPED:$1']];
const field=f=>FIELD[f]||(String(f).indexOf('컨테이너 ')===0?'Container '+String(f).slice(5):f);
function result(r){ for(const [rx,c] of RES){ const m=String(r).match(rx); if(m) return c.replace('$1',m[1]||''); } return r; }
/* 판정 열쇠 — old = v0.2 까지 (한국어) */
function key(res, old){ const f=old?field:(x=>x), cl=old?(x=>CLASS[x]||x):(x=>x), rs=old?result:(x=>x);
  return {verdict:res.verdict, conclusion:res.conclusion, eds:(res.editions||[]).map(e=>e.name), other:!!(res.other&&res.other.other), A:(res.A||[]).map(r=>[f(r.field), cl(r.class)]), B:(res.B||[]).map(r=>[f(r.item), rs(r.result)])}; }
module.exports={CLASS, FIELD, RES, field, result, key};
