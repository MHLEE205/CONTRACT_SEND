/* a1_bench v0.14 단위 시험 — 지시서 THOR_38 (N76 Notify = 46A · 37-Q1 45A 줄 위치 · 37-Q3 번호 = 같은 바이어 · N78 수익자 증명 · L4 過去の修正 · 37-Q6 画像 L/C 転記)
   node unit_v014.js [a1_bench.html]   (가짜 데이터만 · AI 호출 = 가짜) */
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../a1_bench.html'),'utf8');
let pass=0,fail=0; const ok=(n,c)=>{ if(c){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n);} };
const sys=(html.match(/const R2_ASSEMBLE_SYSTEM=`([\s\S]*?)`;/)||[])[1]||'';
ok('N76 Notify = 46A 의 Notify 문 · NOTIFY APPLICANT 만 :50 · 지시 없음 = 직전 S/I',/46A の B\/L 条項の Notify の文/.test(sys)&&/「NOTIFY \(THE\) APPLICANT」だけのときだけ :50/.test(sys)&&/:50 の住所を 46A の Notify の代わりに使わない/.test(sys)&&!/L\/C :50 \(Applicant\) の住所を そのまま。空にしない/.test(sys));
ok('37-Q3 번호 = 같은 바이어 직전 S/I 만 · 첫 거래 = 空 + note',/同じバイヤーの直前 S\/I の値だけ/.test(sys)&&/初めてのバイヤー · 番号なし/.test(sys));
ok('37-Q1 45A 줄 위치 = 같은 바이어 S/I 의 칸 · 없으면 invoicetext · 첫 거래 note',/同じバイヤーの最近の S\/I/.test(sys)&&/初めてのバイヤー \(同じバイヤーの S\/I なし\) = crcf9_invoicetext/.test(sys));
ok('N78 수익자 증명 = CONTRACT NUMBER (계약번호) · 문 전체 안 넣음 · FREE TIME 바이어 = 그 문언',/「CONTRACT NUMBER \(今回の契約番号\)」 だけ/.test(sys)&&/FREE TIME \(DEMURRAGE · DETENTION\) の文言を 受益者証明に書くバイヤー/.test(sys));
ok('L4 過去の修正 블록 (L/C 원문이 우선)',/【過去の修正 \(担当が推薦を直して登録した値/.test(html)&&/L\/C 原文が優先/.test(html));
/* 37-Q6 transcribeImageLc — 가짜 callClaude 로 실행 */
const fn=html.match(/async function transcribeImageLc\([\s\S]*?\n}\n/); ok('transcribeImageLc 있음',!!fn);
if(fn){ const ctx={console, A1_DEFAULT_MODEL:'m', SYS:'s', b64:async()=> 'AAA', d01TranscribePromptText:()=> 'T', cleanLcRawText:s=>s.trim(), callClaude:async(body)=>{ ctx.body=body; return {text:'xx LC_TEXT_START\n :20: TESTLC9 \nLC_TEXT_END yy', usage:{input_tokens:1,output_tokens:1}, ms:5, stop:'end_turn'}; }};
  vm.createContext(ctx); vm.runInContext(fn[0]+';this.f=transcribeImageLc;',ctx);
  (async()=>{ const r=await ctx.f({no:'TEST01'},{_base:[{image:true,file:{}}],_amends:[]},{r2Model:'m'},1); ok('画像 L/C → 転記 글자 (LC_TEXT_START … END) · PDF 를 document 로',r.text===':20: TESTLC9'&&ctx.body.messages[0].content[0].type==='document'&&r.calls[0].step==='transcribe');
    const r0=await ctx.f({no:'TEST01'},{_base:[{image:false}],_amends:[]},{},1); ok('글자 있는 L/C = 호출 0',r0.text===''&&!r0.calls.length);
    ok('버전 0.14',/version:'0\.14'/.test(html)); console.log(`\nunit_v014 pass ${pass} fail ${fail}`); process.exitCode=fail?1:0; })(); }
