/* 기본 점검 — 문법 · 버전 · 공통 파일 1회 · confirm/alert 0 · 쓰기 0 · CDN 고정판 · 보안 grep 0 · 실명 0 · 푸터 */
const fs=require('fs'), path=require('path'), T=require('./lib.js'), {ok}=T;
const html=fs.readFileSync(T.HTML,'utf8'), core=T.script('bl-core'), app=T.script('bl-app');
try{ new Function(core); ok(true,''); }catch(e){ ok(false,'bl-core 문법 '+e.message); }
try{ new Function(app); ok(true,''); }catch(e){ ok(false,'bl-app 문법 '+e.message); }
const v1=(core.match(/const VERSION = '([\d.]+)'/)||[])[1], v2=(app.match(/version:'([\d.]+)'/)||[])[1];
ok(v1&&v1===v2,'버전 core '+v1+' = 화면 '+v2);
ok((html.match(/leenai-common\.js/g)||[]).length===1,'공통 JS 1회');
ok(!/\b(window\.)?(confirm|alert|prompt)\s*\(/.test(core+app),'confirm/alert/prompt 0');
ok(!/method:\s*'(PUT|POST|PATCH|DELETE)'/.test(app)&&/書き込み禁止/.test(app),'쓰기 0 (GET 만 · 문지기)');
ok(/pdf\.js\/3\.11\.174\//.test(app)&&/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js/.test(app),'CDN 고정판 (pdf.js 3.11.174 · jsPDF 2.5.1)');
ok(/✦ Powered by LEENAI Automation System/.test(html),'푸터');
ok(/<script id="bl-core">/.test(html)&&/<script id="bl-app">/.test(html),'bl-core / bl-app 나눔');
/* 보안 · 실명 — 레포에 올릴 새 파일 전부 */
const root=path.join(__dirname,'../..'), files=['bl_bench.html','tools/bl_repro.mjs'].concat(fs.readdirSync(__dirname).filter(f=>/\.(js|json|md)$/.test(f)&&f!=='package-lock.json').map(f=>'tests/bl_bench/'+f));
const txt=files.map(f=>[f,fs.readFileSync(path.join(root,f),'utf8')]);
const SEC=['ghp'+'_','github'+'_pat_','sk'+'-ant','client'+'_secret'];
txt.forEach(([f,t])=>SEC.forEach(k=>ok(t.indexOf(k)<0,'보안 '+k+' in '+f)));
/* 실제 바이어 · 은행 · L/C · 운임 값 (전수 조사 · 시범의 실례) — 이어 붙여 적음 (이 파일에도 그대로 쓰지 않음) */
const REAL=['DAE'+'HAN','SHIN'+'HAN','KASI'+'KORN','ASP'+'EX','KUM'+'BONG','VAN '+'DIEM','YU'+'CHANG','SAIGON'+' PAPER','KRAFT'+' OF ASIA','BANGKOK'+' BANK','C.A.S'+'.PAPER','THIEN'+' TRI','STA'+'VIAN','MAN'+'DIRI','HAN'+'KUK','LO'+'TOS','leenear'+'corp','KOR'+'INDO','HARY'+'ONO','DONG'+' TIEN','CHENG'+' LOONG','YAMA'+'HATSU','RAK'+'RAFT','HONOR'+' GLORY','ILC916'+'26','M4258'+'26','SGD07'+'26','POPU1'+'26','TCNU20'+'37405','HLCUTYO'+'26','YMJAI2'+'72','ONEYTYO'+'G6','850.'+'00 USD 6800','6800'+'.00','194'+'710','163'+'556.00','420'+'430.00'];
txt.forEach(([f,t])=>{ const U=t.toUpperCase(); REAL.forEach(k=>ok(U.indexOf(k.toUpperCase())<0,'실명 '+k.slice(0,3)+'… in '+f)); });
/* v0.2: 港の別名の試験用固定値 (형님 지시) 은 시험 코드 (lib.js PORT_ALIAS_TEST) 에만 — 레포 본문 (bl_bench.html) 실명 0 */
const TP='TAN'+'JUNG', tp=html.split('\n').filter(l=>l.toUpperCase().indexOf(TP)>=0); ok(tp.length===0,'bl_bench.html 에 실제 항구 별칭 0 (고정값은 시험 코드로)');
ok(/PORT_ALIAS_TEST = /.test(fs.readFileSync(path.join(__dirname,'lib.js'),'utf8')),'시험용 고정값 = tests/bl_bench/lib.js PORT_ALIAS_TEST');
/* v0.2: ACL エンジン = コミット固定 + sha256 (書類ツール と同じ) · cmaps = jsdelivr 同じ版 */
ok(/const ACL_ENGINE = \{commit:'[0-9a-f]{40}', sha256:'[0-9a-f]{64}'/.test(html)&&/raw\.githubusercontent\.com\/MHLEE205\/CONTRACT_SEND\/'\+ACL_ENGINE\.commit/.test(html)&&!/fetch\('acl_bench\.html'/.test(html),'ACL エンジン = コミット + sha256 固定');
ok(/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@3\.11\.174\/cmaps\//.test(html)&&!/cMapUrl:BB_PDFJS/.test(html),'pdf.js cmaps = jsdelivr 3.11.174');
ok(txt.filter(([f])=>f!=='bl_bench.html').every(([f,t])=>t.indexOf('TAN'+'JUNG')<0),'시험 · 도구에는 실제 항구 별칭 없음 (가짜 SAMPLEPORT)');
console.log(JSON.stringify({version:v1, files:files.length}));
T.done('check');
