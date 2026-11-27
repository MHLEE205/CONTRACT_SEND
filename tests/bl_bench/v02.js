/* bl_bench v0.2 시험 (지시서 D00 B/L Draft 2단계 · CP-A01 보완 Step 2 · 3 · 4 · 5) — 가짜 데이터만 · 네트워크 0
   1 체크포인트 基本 (stage BL_DRAFT · engine_key bl:…) → A · B 항목에 CP 번호 · 停止 (관리자 승인) = 参考 · 직원의 停止 = 그대로
   2 追加 CP-A01 을 Draft 에 (書類の欄 = Draft 의 Consignee) — 끝 쉼표 하나 = 一致 (trim_end_punct) · 약어 풀어 씀 = 相違 · 試験 = 参考 (판정 영향 0) · 有効 = 相違 → 판정 相違
   3 Draft 의 칸 (cpDraftFields — 칸 이름 줄 빼고) · 4 화면 (CP 번호 · 試験 은 관리자만) · 5 쪽 (当社書類 = own → 뺌 · B/L 쪽 없음 = 別に取得)
   6 마스터 없음 = v0.1 (a1aecee) 과 같은 결과 · 화면 (고정값 없는 경우)
   node v02.js [html] */
const fs=require('fs'), path=require('path'), cpr=require('child_process'), vm=require('vm'), T=require('./lib.js'), F=require('./fixtures.js'), {ok, eq}=T;
const BL=T.loadCore(process.argv[2]), ACL=T.loadAcl();
const pdfLines=async pages=>BL.linesOf(await T.readPages(await T.mkPdf(pages)));
const STAFF=[{code:'ADM_A', email:'adm_a@example.com', portal_admin:true},{code:'STF_B', email:'stf_b@example.com', portal_admin:false}];
const B=(id,key,st,stage)=>({id, kind:'基本', stage:stage||'BL_DRAFT', pay:/^bl:lc:/.test(key)?'LC':'ALL', scope_type:'all', scope:'ALL', engine_key:key, title_ja:key, status:st||'有効', approved_by:'ADM_A', approved_at:'2026-11-23'});
const A01=o=>Object.assign({id:'CP-A01', kind:'追加', stage:'ACL,BL_DRAFT,BL', pay:'LC', scope_type:'all', scope:'ALL', left:'lc.bl.consignee_text', op:'same_text_ws:trim_end_punct', right:'acl.consignee', result:'相違', title_ja:'Consignee は L/C 46A の文言どおり', status:'試験', approved_by:'', approved_at:''},o||{});
const BASE=[B('CP-B49','bl:booking'),B('CP-B50','bl:consignee'),B('CP-B51','bl:cntr:*'),B('CP-B52','bl:lc:consignee'),B('CP-B53','bl:lc:47a'),B('CP-B54','bl:other'),B('CP-B55','bl:acl'),B('CP-B01','booking',null,'ACL')];
const allBy=(rows,by)=>rows.reduce((o,r)=>(o[ACL.cpKey(r)]=by,o),{});
const prep=(rows,lb)=>ACL.cpPrepare(rows, [], {admins:ACL.cpAdmins(STAFF), lastBy:lb||allBy(rows,'adm_a@example.com')});
const ctx=(lc)=>({lc:lc===undefined?F.lc():lc, si:null, ex:null, booking:{}, meta:{pay:'LC', country:'VIETNAM'}});
const judge=async(o)=>{ o=o||{}; const L=await pdfLines([F.draftItems(o.d)]);
  return BL.judgeInvoice(Object.assign({iv:F.IV, carrier:'TEST', si:F.si(o.si), lc:o.lc===undefined?F.lc():o.lc, lcWanted:true, files:[{id:'x',name:F.IV+'_DRAFT.pdf',mod:'2026-10-01',L}]}, o.cp?{cp:o.cp, cpCtx:ctx(o.lc)}:{})); };
const L47={extra:[{x:200,y:480,t:'L/C NO.: TLC0001'}]};
(async()=>{
  console.log('1 基本 — CP 번호 · 停止');
  { const J=await judge({d:L47, cp:prep(BASE)});
    eq([J.A.find(r=>r.field==='Booking/B/L No.').cp, J.A.find(r=>r.field==='Consignee').cp, J.A.find(r=>/^Container /.test(r.field)).cp, J.B.find(r=>r.item==='Consignee bank').cp, J.B.find(r=>r.item==='47A L/C No. in all docs').cp],
       ['CP-B49','CP-B50','CP-B51','CP-B52','CP-B53'],'A · B 항목의 CP 번호 (engine_key bl:… · 컨테이너는 bl:cntr:*)');
    ok(J.A.filter(r=>r.cp==='CP-B01').length===0,'ACL 의 基本 (stage ACL) 은 Draft 에 붙지 않음');
    eq(J.verdict,'一致','같은 Draft → 一致 (CP 붙어도 판정 같음)');
    const J0=await judge({d:{}, cp:prep(BASE)}); eq([J0.verdict, J0.B.find(r=>r.item==='47A L/C No. in all docs').result],['相違','DIFF'],'47A 없음 = 相違 (기준)');
    const st=BASE.map(b=>b.id==='CP-B53'?Object.assign({},b,{status:'停止'}):b);
    const J1=await judge({d:{}, cp:prep(st)}); eq([J1.verdict, J1.B.find(r=>r.item==='47A L/C No. in all docs').result],['一致','STOPPED:CP-B53'],'관리자가 停止 → STOPPED (参考) · 판정에서 빠짐'); eq(BL.lcResJa('STOPPED:CP-B53'),'参考 (停止中) CP-B53','화면 = 「参考 (停止中) CP-B53」');
    const J2=await judge({d:{}, cp:prep(st, Object.assign(allBy(st,'adm_a@example.com'),{'id:CP-B53':'stf_b@example.com'}))}); eq([J2.verdict, J2.B.find(r=>r.item==='47A L/C No. in all docs').result],['相違','DIFF'],'직원이 停止 로 바꿈 = 承認待ち → 그대로 실행');
    const Jo=await judge({d:{booking:'XX0000000', consignee:['SOMEONE ELSE'], notify:['ANOTHER CO','X','Y'], extra:[{x:330,y:20,t:'INVOICE NO. NFK2609-77'}]}, cp:prep(BASE)});
    ok(Jo.verdict==='別の件'&&Jo.other.cp==='CP-B54','別の件 → CP 번호 (bl:other)', {v:Jo.verdict, cp:Jo.other&&Jo.other.cp}); }

  console.log('2 追加 CP-A01 을 Draft 에');
  { const it=J=>(J.CP||[]).find(i=>i.cp==='CP-A01')||{};
    let J=await judge({d:L47, cp:prep(BASE.concat([A01()]))}); eq([it(J).status, it(J).trial, it(J).would, it(J).actual, J.verdict],['INFO',true,'MATCH','TO ORDER OF SAMPLE BANK\nNORTH BRANCH','一致'],'試験 = 参考 · Draft 의 Consignee (칸 이름 줄 빼고) 와 L/C 46A 문 → 一致');
    J=await judge({d:Object.assign({consignee:['TO ORDER OF SAMPLE BANK','NORTH BRANCH,']},L47), cp:prep(BASE.concat([A01()]))}); eq(it(J).would,'MATCH','Draft 끝 쉼표 하나 = 一致 (trim_end_punct)');
    J=await judge({d:Object.assign({consignee:['TO ORDER OF SAMPLE BANK','NORTH BRANCH,,']},L47), cp:prep(BASE.concat([A01()]))}); eq(it(J).would,'DIFF','쉼표 둘 = 相違');
    J=await judge({d:Object.assign({consignee:['TO ORDER OF SAMPLE BANK','NORTH BR.']},L47), cp:prep(BASE.concat([A01()]))}); const Jx=await judge({d:Object.assign({consignee:['TO ORDER OF SAMPLE BANK','NORTH BR.']},L47), cp:prep(BASE)});
    eq([it(J).would, J.verdict, J.conclusion],['DIFF',Jx.verdict,Jx.conclusion],'약어 (BRANCH → BR.) = 相違 · 試験 이라 판정 · 결론 영향 0 (CP-A01 없을 때와 같음)');
    const on=A01({status:'有効', approved_by:'ADM_A', approved_at:'2026-11-23'});
    J=await judge({d:Object.assign({consignee:['TO ORDER OF SAMPLE BANK','NORTH BR.']},L47), cp:prep(BASE.concat([on]))}); eq([it(J).status, it(J).trial, J.verdict],['DIFF',false,'相違'],'有効 (관리자 승인) = 相違 → 판정 相違');
    J=await judge({d:L47, cp:prep(BASE.concat([on]), Object.assign(allBy(BASE.concat([on]),'adm_a@example.com'),{'id:CP-A01':'stf_b@example.com'}))}); eq([it(J).trial, it(J).cpState],[true,'承認待ち'],'직원이 有効 으로 = 承認待ち (参考)');
    J=await judge({d:L47, lc:null, cp:prep(BASE.concat([A01()]))}); eq((J.CP||[]).length?it(J).status:'none','INFO','L/C 판독 없음 = 参考');
    J=await judge({d:L47, cp:prep(BASE.concat([A01({pay:'TT'})]))}); eq((J.CP||[]).length,0,'결제 범위 밖 = 실행 안 함');
    J=await judge({d:L47, cp:prep(BASE.concat([A01({stage:'ACL'})]))}); eq((J.CP||[]).length,0,'stage 에 BL_DRAFT 없음 = 실행 안 함');
    J=await judge({d:L47, cp:prep(BASE.concat([A01({op:'same_text_ws'})]))}); eq(it(J).would,'MATCH','옵션 없는 op 도 같은 Draft 는 一致'); }

  console.log('3 Draft 의 칸');
  { const L=await pdfLines([F.draftItems()]); const Fd=BL.cpDraftFields(L);
    eq([Fd.consignee.text, Fd.notify.text.split('\n')[0], Fd.shipper.conf],['TO ORDER OF SAMPLE BANK\nNORTH BRANCH','SAMPLE PAPER INDUSTRY CO., LTD.','SURE'],'칸 이름 줄은 빼고 · 줄바꿈 유지');
    const Ln=await pdfLines([[{x:30,y:60,t:'SAMPLE EXPORT CO., LTD.'},{x:30,y:80,t:'TO ORDER OF SAMPLE BANK'}]]); eq(BL.cpDraftFields(Ln).consignee.conf,'MISSING','칸 이름 4 종류 미만 = 읽지 못함 (読取確認)');
    const Lh=await pdfLines([F.draftItems({consignee:['Insert Name, Address and phone','TO ORDER OF SAMPLE BANK','NORTH BRANCH']})]); eq(BL.cpDraftFields(Lh).consignee.text,'TO ORDER OF SAMPLE BANK\nNORTH BRANCH','양식 안내문 줄 = 「TO ORDER」 줄부터');
    const Lo=await pdfLines([F.draftItems({consignee:['TO ORDER OF SAMPLE BANK','NORTH **']})]); eq(BL.cpDraftFields(Lo).consignee.conf,'OVERFLOW','넘침 표시 (**) = 位置があいまい');
    const Js=await judge({d:Object.assign({consignee:['TO ORDER OF SAMPLE BANK','NORTH **']},L47), cp:prep(BASE.concat([A01()]))}), io=(Js.CP||[])[0]||{};
    ok(io.would==='READ_CHECK'&&/Draft の 「Consignee」 は 続き記号/.test(io.detail),'넘침 → 読取確認 · 「Draft の」 문구',io);
    const Jn=await judge({d:Object.assign({consignee:['TO ORDER OF SAMPLE BANK','NORTH **']},L47), lc:F.lc({bl:{consignee_text:'APPLICANT', notify_text:'APPLICANT', freight:'PREPAID'}}), cp:prep(BASE.concat([A01()]))});
    eq(((Jn.CP||[])[0]||{}).would,'INFO','L/C 에 TO ORDER 문이 없으면 Draft 가 넘쳐도 参考 (값 없음)'); }

  console.log('4 화면');
  { const J=await judge({d:Object.assign({consignee:['TO ORDER OF SAMPLE BANK','NORTH BR.']},L47), cp:prep(BASE.concat([A01()]))});
    const st=BL.viewHtml(J), ad=BL.viewHtml(J,{admin:true});
    ok(/data-cp="CP-B50"/.test(st)&&/class="av-cp"/.test(st),'CP 번호 버튼 (data-cp)');
    ok(!/CP-A01/.test(st)&&/data-cp="CP-A01"/.test(ad)&&/試験中のチェック/.test(ad)&&/試験 \(相違\)/.test(ad),'試験 줄은 관리자 화면만 (직원 0)');
    const J2=await judge({d:Object.assign({consignee:['TO ORDER OF SAMPLE BANK','NORTH BR.']},L47), cp:prep(BASE.concat([A01({status:'有効', approved_by:'ADM_A'})]))}), s2=BL.viewHtml(J2);
    ok(/C\. チェック \(追加\)/.test(s2)&&/相違 \d+ か所/.test(s2)&&/Consignee は L\/C 46A の文言どおり — 相違/.test(s2),'有効 의 相違 는 직원에게도 (相違 칸)');
    const Jn=await judge({si:{notify:'SAMPLE PAPER INDUSTRY CO., LTD.\nADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT\nTEL: 84-28-0000-0000', acl:{notify:'SAMPLE PAPER INDUSTRY CO., LTD.\nADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT\nTEL: 84-28-0000-0000'}}, d:Object.assign({notify:['SAMPLE PAPER INDUSTRY CO., LTD.','ADD: LOT CN5, SAMPLE ZONE, SAMPLE DISTRICT']},L47), cp:prep(BASE)});
    ok(!(Jn.C||[]).length||/ACL では一致 → Draft で変わった/.test(BL.viewHtml(Jn)),'ACL 참고 제목 = 「ACL では一致 → Draft で変わった」'); }

  console.log('5 쪽 — 当社書類 · B/L 쪽 없음');
  { const own=[{x:200,y:30,t:'COMMERCIAL INVOICE',size:12},{x:30,y:60,t:'Seller'},{x:30,y:80,t:'SAMPLE EXPORT CO., LTD.'},{x:30,y:100,t:'WASTE PAPER 66 BALES'}],
      pl=[{x:200,y:30,t:'PACKING LIST',size:12},{x:30,y:60,t:'SAMPLE EXPORT CO., LTD.'},{x:30,y:100,t:'66 BALES 60,600 KGS'}],
      rider=[{x:30,y:30,t:'RIDER - CONTINUED'},{x:30,y:50,t:'DESCRIPTION OF GOODS'},{x:30,y:70,t:'WASTE PAPER OCC'},{x:30,y:300,t:'DOCUMENTS: COMMERCIAL INVOICE, PACKING LIST'}];
    const L=await pdfLines([own,pl,F.draftItems({freight:F.FREIGHT}),rider]); const R=BL.pageRoles(L);
    eq([R[1],R[2],R[3],R[4]],['own','own','bl','keep'],'CI · PL 머리 = own · 품명 이어짐 (본문에 書類名) = keep');
    const P=BL.maskPlan(L,{carrier:'ONE'}); eq([P.ok, P.dropped.join(','), P.droppedOwn.join(',')],[true,'1,2','1,2'],'바이어용에서 当社書類 쪽 뺌 (droppedOwn)');
    const Li=await pdfLines([[{x:200,y:30,t:'FREIGHT MEMO'},{x:30,y:60,t:'PLEASE REMIT TO: SAMPLE LINE AGENCY CO., LTD.'},{x:30,y:80,t:'INVOICE NO.: 0000000001  DATE: 2026-10-15'},{x:30,y:100,t:'VESSEL: SAMPLE STAR 101W  B/L NO.: TSTCBK1000001'},
      {x:30,y:120,t:'PORT OF LOADING: TOKYO  PORT OF DISCHARGE: CAT LAI'},{x:30,y:140,t:'OCEAN FREIGHT 3 X 850.00 USD 2550.00'},{x:30,y:160,t:'DOC FEE JPY 5000'},{x:30,y:180,t:'SEAL FEE 3 X 30.00 USD 90.00'},{x:30,y:200,t:'TOTAL USD 2640.00 JPY 5000'},{x:30,y:220,t:'BANK: SAMPLE BANK TOKYO BRANCH ACCOUNT 0000000'}].concat(Array.from({length:16},(_,i)=>({x:30,y:240+i*12,t:'REMARK LINE '+(i+1)})))]); const Pi=BL.maskPlan(Li,{});
    ok(!Pi.ok&&Pi.noBl&&/B\/L Draft のファイルを別に取得してください/.test(Pi.why[0]),'B/L 쪽 없음 (청구서만) = 手で — 別に取得 (형님 D4)',Pi.why); }

  console.log('6 마스터 없음 = v0.1 (a1aecee) — v0.3: 코드로 맞춰 비교');
  { let h1=null; try{ h1=cpr.execFileSync('git',['show','a1aecee:bl_bench.html'],{cwd:path.join(__dirname,'../..'),encoding:'utf8',maxBuffer:1e8}); }catch(e){}
    if(!h1) ok(false,'v0.1 (a1aecee) 을 git 에서 읽을 수 없음');
    else { const c={module:{exports:{}}, console}; vm.createContext(c); vm.runInContext(h1.match(/<script id="bl-core">([\s\S]*?)<\/script>/)[1]+'\n;module.exports=BL;',c); const B1=c.module.exports;
      const N=require('./v03map.js');
      const cases=[{d:L47},{d:{}},{d:{consignee:['TO THE ORDER OF SAMPLE BANK']}},{lc:null},{d:Object.assign({onboard:'16 NOV 2026'},L47)},{d:{notify:['OTHER NAME CO., LTD.','ADD: LOT CN5, SAMPLE ZONE']}}];
      const strip=h=>h.replace(/ title="[^"]*"/g,'').replace(/<div class="av-sub">[\s\S]*?<\/div>/g,'').replace(/<table class="av-cols">[\s\S]*?<\/table>/g,'<table>').replace('<div class="av-h">ACL と (参考)</div>','<div class="av-h">ACL では一致 → Draft で変わった (参考)</div>');
      const same=[]; for(const o of cases){ const L=await pdfLines([F.draftItems(o.d)]), inp=()=>({iv:F.IV, carrier:'TEST', si:F.si(o.si), lc:o.lc===undefined?F.lc():o.lc, lcWanted:true, files:[{id:'x',name:F.IV+'_DRAFT.pdf',mod:'2026-10-01',L}]});
        const a=B1.judgeInvoice(inp()), b=BL.judgeInvoice(inp());
        const ka=JSON.stringify(N.key(a,true)), kb=JSON.stringify(N.key(b,false)); same.push(ka===kb&&strip(B1.viewHtml(a))===strip(BL.viewHtml(b))); if(ka!==kb) console.log(ka,'\n',kb); }
      eq(same,cases.map(()=>true),'v0.1 엔진과 판정 (코드) · 칸 · 화면의 판정 글자가 같음 (6 경우 · 이유 · 메모는 일본어로 바뀜)'); } }

  console.log('7 버전');
  ok(['0.6','0.7','0.8','0.9'].indexOf(BL.VERSION)>=0,'bl-core VERSION 0.6 이상 (v0.7 = ACL 엔진 고정만 · v0.8 = 「_」 이름 · v0.9 = 44B)');
  T.done('v02');
})().catch(e=>{ console.log('FAIL exception',e.stack); process.exit(1); });
