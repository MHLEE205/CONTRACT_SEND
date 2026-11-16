/* legacy 시험 (v0.3 ~ v0.5) — PDF 판독 (0 복원 · NET/SET 줄) · 집 Mac 에서 옮김 (2026-11-16)
   node legacy_v03_v05_pdf.js [a1_bench.html]
   예전에는 실제 SMBC LC PDF 2건으로 시험했으나 공개 레포라 쓸 수 없음 → 같은 그리기 방식의 **합성 PDF** 로 바꿈:
   본문은 Courier 텍스트, 숫자 0 자리는 공백 + 그 위치에 이미지 마스크 (SMBC 통지 PDF 가 0 을 그리는 방식).
   a1_bench.html 안의 D-01 복사 함수(extractLcPdfExact 등)를 그대로 실행한다. 필요: pdfjs-dist 3.11.174 (package.json) */
const fs=require('fs'),path=require('path');
const pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
const File=globalThis.File||require('buffer').File;   // node 18 은 buffer.File
globalThis.window=globalThis; window.pdfjsLib=pdfjs;   // ensurePdfJs() 는 pdfjsLib 가 있으면 CDN 을 읽지 않음
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
const d01=html.match(/<script id="a1-d01">([\s\S]*?)<\/script>/)[1];
const F=new Function('pdfjsLib',d01+';return {extractLcPdfExact,readPdfPageParts,matchZeroImages,assemblePdfPageText};')(pdfjs);
const CMAP=[path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'cmaps')+'/'];
let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('PASS',m); } else { fail++; console.log('FAIL',m); } };

/* 합성 PDF 만들기 — lines: [{y, text}] (0 은 공백으로 쓰고 zeros 위치에 이미지) */
function makePdf(lines, withZeros){
  const FS=10, ADV=6;   // Courier 10pt = 글자 폭 6
  let st='', zeros=0;
  lines.forEach(L=>{
    const raw=L.text, shown=withZeros?raw.replace(/0/g,' '):raw;
    st+=`BT /F1 ${FS} Tf 50 ${L.y} Td (${shown.replace(/[()\\]/g,m=>'\\'+m)}) Tj ET\n`;
    if(withZeros) [...raw].forEach((ch,i)=>{ if(ch!=='0') return; zeros++;
      const x=50+i*ADV, h=20, y=L.y-0.3219*h;   // D-01 matchZeroImages: 이미지 아래 끝 + 0.3219×높이 = 글자 줄 기준선
      st+=`q 20 0 0 ${h} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q\n`; });
  });
  const mask='\xff\x00\xff\x00\xff\x00\xff\x00';   // 8×8 마스크 (1×1 은 pdf.js 가 다른 연산으로 바꿈)
  const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> /XObject << /Im0 6 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(st,'latin1')} >>\nstream\n${st}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
    `<< /Type /XObject /Subtype /Image /Width 8 /Height 8 /ImageMask true /BitsPerComponent 1 /Length ${mask.length} >>\nstream\n${mask}\nendstream`];
  let pdf='%PDF-1.4\n'; const offs=[];
  objs.forEach((o,i)=>{ offs.push(Buffer.byteLength(pdf,'latin1')); pdf+=`${i+1} 0 obj\n${o}\nendobj\n`; });
  const xref=Buffer.byteLength(pdf,'latin1');
  pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return {buf:Buffer.from(pdf,'latin1'), zeros};
}
(async()=>{
  console.log('① 0 복원 — 0 을 이미지로 그린 합성 SMBC 형 통지 (예전: 실제 LC PDF 2건)');
  const L=['DOCUMENTARY CREDIT NUMBER     :20   ILC0000101','CURRENCY CODE, AMOUNT         :32B  USD 80,800.00','DESCRIPTION OF GOODS:45A  PO NO. SOP0000001',
    '1/ SIGNED COMMERCIAL INVOICE IN 03 ORIGINALS.','DRAWEE                        :42A  BFTVVNVX018','SHOWING THE TOTAL GROSS WEIGHT, NET WEIGHT AND BALES',
    'ONE SET OF DOCUMENTS IN DUPLICATE','PACKING LIST SHEET NO. 10'].map((t,i)=>({y:700-i*18,text:t}));
  const want=L.reduce((n,x)=>n+(x.text.match(/0/g)||[]).length,0);
  const p=makePdf(L,true);
  const r=await F.extractLcPdfExact(new File([p.buf],'syn.pdf',{type:'application/pdf'}),{cMapUrls:CMAP});
  console.log(`   0 이미지 ${p.zeros} · 복원 ${r.zeros} · 실패 ${r.failed}`);
  ok(p.zeros===want && r.zeros===want && r.failed===0 && r.ok, '0 이미지 '+want+'개 전부 복원 · 실패 0 · ok');
  ok((r.text.match(/0/g)||[]).length===want, '복원 텍스트의 「0」 개수 = 원문 '+want);
  ['ILC0000101','USD 80,800.00','SOP0000001','IN 03 ORIGINALS','BFTVVNVX018','SHEET NO. 10'].forEach(t=>ok(r.text.indexOf(t)>=0,'0 이 든 토큰 그대로: '+t));
  ok(L.every(x=>r.text.indexOf(x.text.replace(/\s+/g,' '))>=0||r.text.replace(/\s+/g,' ').indexOf(x.text.replace(/\s+/g,' '))>=0), '모든 줄이 원문대로 (공백 정규화)');
  const p0=makePdf(L,false), r0=await F.extractLcPdfExact(new File([p0.buf],'plain.pdf'),{cMapUrls:CMAP});
  ok(r0.zeros===0 && r0.ok===false, '0 이미지가 없는 PDF → ok:false (D-01 규칙: 복원 대상 아님)');

  console.log('② 합성 PDF — BT…ET 안 문자열에 「ET」 「NET」 「SET」 「SHEET」 이 있어도 줄이 빠지지 않음');
  const lines=['NET WEIGHT 1234 KGS','SET OF DOCUMENTS IN DUPLICATE','SHEET (ET) BETWEEN ET AND BT','THE NETWORK SETS ET','LAST LINE OK'];
  const q=makePdf(lines.map((t,i)=>({y:700-i*20,text:t})),false);
  const s=await F.extractLcPdfExact(new File([q.buf],'syn2.pdf'),{cMapUrls:CMAP});
  lines.forEach(l=>ok(s.text.indexOf(l)>=0,'줄 유지: '+l));
  console.log('legacy_pdf pass',pass,'fail',fail); process.exitCode=fail?1:0;
})().catch(e=>{ console.error('FAIL',e); process.exitCode=1; });
