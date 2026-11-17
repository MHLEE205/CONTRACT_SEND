/* v0.3 신규 입력 시험용 가짜 COMPASS 메타데이터 (레포 공개 — 실제 값 없음).
   TEST01 의 계약 · 판매 명세 · 품목 GUID 는 시험 파일에 적지 않고, 도구의 CW.CREATE_ALLOWED 에서 읽는다 (가짜 데이터 확인 규칙). */
const FX=require('./fixtures');
const A=(n,t,o)=>Object.assign({LogicalName:n,AttributeType:t,IsValidForUpdate:true,MaxLength:null,AttributeOf:null,SourceType:0},o||{});
/* 변경 시험 메타데이터 + 신규 입력에 필요한 것: 명세의 판매 명세 · 품목 조회 칸 · 만들 때만 쓰는 칸 · 만들 때 못 쓰는 칸 · 짧은 글자 칸 */
const META_CREATE={
  cr49f_s_i:FX.META.cr49f_s_i.concat([A('crcf9_createonly','String',{MaxLength:100,IsValidForUpdate:false,IsValidForCreate:true}),
    A('crcf9_noncreate','String',{MaxLength:100,IsValidForCreate:false}), A('crcf9_short','String',{MaxLength:4})]),
  crcf9_s_i_detail:FX.META.crcf9_s_i_detail.filter(a=>a.LogicalName!=='crcf9_zero').concat([A('crcf9_sale_detail_id','Lookup'), A('crcf9_item_id','Lookup'),
    A('createdon','DateTime',{IsValidForUpdate:false}), A('ownerid','Owner')])
};
const SETS={cr49f_s_i:'cr49f_s_is', crcf9_s_i_detail:'crcf9_s_i_details', cr49f_sale_contract:'cr49f_sale_contracts', cr49f_sale_detail:'cr49f_sale_details', cr49f_item:'cr49f_items',
  transactioncurrency:'transactioncurrencies'};
/* 관계 — 탐색 이름은 일부러 대소문자를 섞음 (crcf9_Item_id): 도구가 추측하지 않고 읽은 값을 쓰는지 확인 */
const M2O={
  cr49f_s_i:[{ReferencingAttribute:'cr49f_sale_contract_id',ReferencedEntity:'cr49f_sale_contract',ReferencingEntityNavigationPropertyName:'cr49f_sale_contract_id'},
    {ReferencingAttribute:'transactioncurrencyid',ReferencedEntity:'transactioncurrency',ReferencingEntityNavigationPropertyName:'transactioncurrencyid'}],
  crcf9_s_i_detail:[{ReferencingAttribute:'crcf9_s_i_id',ReferencedEntity:'cr49f_s_i',ReferencingEntityNavigationPropertyName:'crcf9_s_i_id'},
    {ReferencingAttribute:'crcf9_sale_detail_id',ReferencedEntity:'cr49f_sale_detail',ReferencingEntityNavigationPropertyName:'crcf9_sale_detail_id'},
    {ReferencingAttribute:'crcf9_item_id',ReferencedEntity:'cr49f_item',ReferencingEntityNavigationPropertyName:'crcf9_Item_id'}]
};
const O2M={cr49f_s_i:[{ReferencingEntity:'crcf9_s_i_detail',ReferencingAttribute:'crcf9_s_i_id',ReferencedEntityNavigationPropertyName:'crcf9_s_i_detail_s_i_id_cr49f_s_i'},
  {ReferencingEntity:'crcf9_s_i_attach',ReferencingAttribute:'crcf9_s_i_id',ReferencedEntityNavigationPropertyName:'crcf9_s_i_attach_s_i_id_cr49f_s_i'}]};
const USER_ID='00000000-0000-4000-8000-0000000000ee';
const OTHER={contract:'00000000-0000-4000-8000-0000000c0009', saleDetail:'00000000-0000-4000-8000-0000000f0009', item:'00000000-0000-4000-8000-0000000f0019'};
module.exports={META_CREATE,SETS,M2O,O2M,USER_ID,OTHER};
