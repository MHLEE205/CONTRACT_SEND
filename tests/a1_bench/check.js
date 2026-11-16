/* 문법 · 버전 · 공통 파일 · confirm/alert · 보안 점검 — node check.js <html> <version> */
const fs=require('fs'),cp=require('child_process'),path=require('path'),os=require('os');
const [,,file,ver]=process.argv; const html=fs.readFileSync(file,'utf8');
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m,n=0,fail=0;
while((m=re.exec(html))){ n++; const f=path.join(os.tmpdir(),'a1chk_'+n+'.js'); fs.writeFileSync(f,m[1]); try{ cp.execFileSync(process.execPath,['--check',f],{stdio:'pipe'}); }catch(e){ fail++; console.log('FAIL script',n,String(e.stderr).slice(0,500)); } }
const code=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"`])\/\/[^\n]*/g,'$1');   // 주석 제외
const res={scripts:n, syntaxFail:fail,
  versionTarget:(html.match(new RegExp("version:'"+ver.replace('.','\\.')+"'",'g'))||[]).length,
  versionAny:(html.match(/version:'\d+\.\d+'/g)||[]).length,
  commonJs:(html.match(/leenai-common\.js/g)||[]).length,
  confirmAlertCalls:(code.match(/\b(?:window\.)?(?:confirm|alert)\s*\(/g)||[]).length,
  secrets:(html.match(/ghp_|github_pat_|sk-ant-[a-z0-9]|client_secret|AKIA[0-9A-Z]{12}/g)||[]).length,
  footer:/✦ Powered by LEENAI Automation System/.test(html)};
console.log(JSON.stringify(res));
const ok=!fail&&res.versionTarget===1&&res.versionAny===1&&res.commonJs===1&&!res.confirmAlertCalls&&!res.secrets&&res.footer;
console.log(ok?'CHECK PASS':'CHECK FAIL'); process.exitCode=ok?0:1;
