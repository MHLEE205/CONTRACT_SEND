/* bl_bench v0.5 시험 (지시서 THOR_15 ①-6) — 가짜 데이터 · 네트워크 0
   B/L Draft 새 試験 줄 3 (bl:pod44f · bl:id_hsil · bl:fcl) = ACL 엔진 v0.18 의 CP_CODE · Draft 전체 글자 (text) 로 판정 · 試験 = 参考 (判定 영향 0)
   node v05.js [bl_bench.html] [acl_bench.html] */
const fs=require('fs'), path=require('path');
const BLH=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../bl_bench.html'),'utf8'), ACLH=fs.readFileSync(process.argv[3]||path.join(__dirname,'../../acl_bench.html'),'utf8');
const BL=new Function('module',BLH.match(/<script id="bl-core">([\s\S]*?)<\/script>/)[1]+';return BL;')(undefined);
const ACL=new Function('module',ACLH.match(/<script id="acl-core">([\s\S]*?)<\/script>/)[1]+';return ACL;')(undefined);
BL.useEngine(ACL);
let pass=0,fail=0; const J=JSON.stringify; const ok=(c,m,i)=>{ if(c) pass++; else { fail++; console.log('FAIL',m,i===undefined?'':J(i).slice(0,600)); } };
const rows=[['CP-A80','bl:pod44f','試験'],['CP-A81','bl:fcl','試験'],['CP-A82','bl:id_hsil','試験'],['CP-A83','acl:45ft','試験']].map(([id,ek,st])=>({id,kind:'追加',stage:ek.indexOf('bl:')===0?'BL_DRAFT':'ACL',pay:'ALL',scope_type:'all',scope:'ALL',left:'',op:'',right:'',result:'相違',engine_key:ek,title_ja:'TEST '+id,status:st}));
const CPX=ACL.cpPrepare(rows,[],{trustAll:true});
const lc={schema:'lc_read/1', pod:{text:'SAMPLE PORT IN SAMPLELAND'}};
const res={A:[{field:'POD', class:'SAME'}], B:[], C:[]}, before=J(res);
BL.applyCp(res, CPX, {lc, meta:{pay:'LC', country:'SAMPLELAND'}, F:{pod:{conf:'SURE', text:'SAMPLE PORT, SAMPLELAND'}}, text:'SAMPLE PORT FCL/FCL CY/CY'});
const by=k=>res.CP.find(i=>i.cp===k)||{};
ok(res.CP.length===3,'BL_DRAFT 줄 3 (ACL 줄은 Draft 에 안 나옴)',res.CP.map(i=>i.cp));
ok(by('CP-A80').would==='MATCH'&&by('CP-A81').would==='MATCH'&&by('CP-A82').would==='INFO','揚地 = 44F 一致 · FCL 一致 · 인니 아님 = 対象外',res.CP.map(i=>[i.cp,i.would]));
ok(res.CP.every(i=>i.trial&&i.status==='INFO'),'試験 = INFO (trial)');
ok(J(res.A)===J(JSON.parse(before).A),'A (照合 項目) 변화 0');
const r2={A:[],B:[],C:[]}; BL.applyCp(r2, CPX, {lc, meta:{pay:'LC'}, F:{pod:{conf:'SURE', text:'OTHER HARBOUR'}}, text:'LCL CFS/CFS'});
ok(r2.CP.find(i=>i.cp==='CP-A80').would==='DIFF'&&r2.CP.find(i=>i.cp==='CP-A81').would==='DIFF','揚地 다름 · LCL = 相違 (試験)');
ok(/fd_bench|text:L\.map/.test(BLH)&&BL.VERSION>='0.5','bl-core v0.5+ · Draft 전체 글자를 cpCtx 에');
console.log('v05 pass '+pass+' fail '+fail); process.exit(fail?1:0);
