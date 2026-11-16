/* 가짜 COMPASS 데이터 (레포 공개 — 실제 값 없음). GUID · 회사명 · 주소 · 번호 전부 가짜.
   일부러 줄바꿈 · # · *** · 한자 · 빈칸(null) 을 넣어 「되돌리기 = 글자 단위로 같음」 을 시험한다. */
const CID='00000000-0000-4000-8000-0000000c0001';                 // 계약 LRS-2509CV1 (가짜 ID)
const CID_OTHER='00000000-0000-4000-8000-0000000c0002';           // 허용 밖 계약 LRS-2509XX9
const H=['00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-00000000a002','00000000-0000-4000-8000-00000000a003'];
const D=['00000000-0000-4000-8000-00000000d001'];
const HO=['00000000-0000-4000-8000-00000000a091'], DO=['00000000-0000-4000-8000-00000000d091'];
const FVK='@OData.Community.Display.V1.FormattedValue';

/* 메타데이터 (EntityDefinitions/Attributes 응답 모양) */
const A=(n,t,o)=>Object.assign({LogicalName:n,AttributeType:t,IsValidForUpdate:true,MaxLength:null,AttributeOf:null,SourceType:0},o||{});
const META={
  cr49f_s_i:[A('cr49f_s_iid','Uniqueidentifier',{IsValidForUpdate:false}), A('cr49f_name','String',{MaxLength:100}), A('crcf9_sino','Integer'),
    A('cr49f_lc_no','String',{MaxLength:200}), A('crcf9_consignee','Memo',{MaxLength:4000}), A('crcf9_notify_party','Memo',{MaxLength:4000}),
    A('crcf9_marks','Memo',{MaxLength:2000}), A('crcf9_remarks','Memo',{MaxLength:2000}), A('crcf9_payment_classification','Picklist'),
    A('cr49f_sale_contract_id','Lookup'), A('cr49f_sale_contract_idname','String',{IsValidForUpdate:false,AttributeOf:'cr49f_sale_contract_id'}),
    A('crcf9_etd','DateTime'), A('crcf9_is_lc','Boolean'), A('crcf9_gross_weight','Decimal'), A('crcf9_freight','Money'), A('crcf9_freight_base','Money',{IsValidForUpdate:false}),
    A('crcf9_bales','Integer'), A('crcf9_level','Integer'), A('crcf9_label_calc','String',{SourceType:1,IsValidForUpdate:true}), A('crcf9_img','Virtual'),
    A('crcf9_notinsnap','String',{MaxLength:100}),
    A('createdon','DateTime',{IsValidForUpdate:false}), A('modifiedon','DateTime',{IsValidForUpdate:false}), A('versionnumber','BigInt',{IsValidForUpdate:false}),
    A('statecode','State'), A('statuscode','Status'), A('ownerid','Owner'), A('utcconversiontimezonecode','Integer'), A('timezoneruleversionnumber','Integer'),
    A('importsequencenumber','Integer',{IsValidForUpdate:false}), A('exchangerate','Decimal'), A('transactioncurrencyid','Lookup')],
  crcf9_s_i_detail:[A('crcf9_s_i_detailid','Uniqueidentifier',{IsValidForUpdate:false}), A('crcf9_name','String',{MaxLength:100}), A('crcf9_s_i_id','Lookup'),
    A('crcf9_description','Memo',{MaxLength:4000}), A('crcf9_hs','String',{MaxLength:50}), A('crcf9_zero','String',{MaxLength:0}), A('crcf9_price','Money'), A('crcf9_price_base','Money',{IsValidForUpdate:false}),
    A('crcf9_weight','Decimal'), A('crcf9_qty','Double'), A('modifiedon','DateTime',{IsValidForUpdate:false}), A('versionnumber','BigInt',{IsValidForUpdate:false})]
};
const RANGES={cr49f_s_i:{crcf9_sino:{min:0,max:2147483647}, crcf9_bales:{min:0,max:100000}, crcf9_level:{min:5,max:9}, crcf9_gross_weight:{min:0,max:1e9}, crcf9_freight:{min:0,max:1e9}},
  crcf9_s_i_detail:{crcf9_price:{min:0,max:1e9}, crcf9_weight:{min:0,max:1e9}, crcf9_qty:{min:0,max:1e9}}};
const KEYS={cr49f_s_i:['crcf9_sino','cr49f_sale_contract_id'], crcf9_s_i_detail:[]};

function head(i,cid,id){ return {'@odata.etag':'W/"1000'+i+'"', cr49f_s_iid:id, cr49f_name:'SI-'+(i+1), crcf9_sino:i+1,
  cr49f_lc_no:i===0?'TT REMITTANCE':null,
  crcf9_consignee:'TO ORDER OF\nSAMPLE TRADING CO., LTD.\n1 SAMPLE ROAD #01-02\nSAMPLE CITY',
  crcf9_notify_party:null,
  crcf9_marks:'***\nN/M\n見本 漢字 マーク',
  crcf9_remarks:'0000000001#999/SAMPLE-LIC#DEPOSIT#SAMPLE CO.***\n  two spaces  \ttab',
  crcf9_payment_classification:2, ['crcf9_payment_classification'+FVK]:'T/T',
  _cr49f_sale_contract_id_value:cid, ['_cr49f_sale_contract_id_value'+FVK]:'LRS-2509CV1',
  crcf9_etd:'2025-10-01T00:00:00Z', crcf9_is_lc:false, crcf9_gross_weight:20.555, crcf9_freight:1234.5, crcf9_freight_base:1234.5,
  crcf9_bales:i*10, crcf9_level:7, crcf9_label_calc:'SI-'+(i+1)+'-LBL',
  createdon:'2025-09-10T01:02:03Z', modifiedon:'2025-09-20T01:02:0'+i+'Z', versionnumber:5000+i, statecode:0, statuscode:1, _ownerid_value:'00000000-0000-4000-8000-0000000000ee',
  utcconversiontimezonecode:null, timezoneruleversionnumber:0, exchangerate:1, _transactioncurrencyid_value:'00000000-0000-4000-8000-0000000000cc', _modifiedby_value:'00000000-0000-4000-8000-0000000000ee' }; }
function detail(id,hid){ return {'@odata.etag':'W/"2000"', crcf9_s_i_detailid:id, crcf9_name:'D-1', _crcf9_s_i_id_value:hid,
  crcf9_description:'WASTE PAPER (OCC)\n#11 GRADE\n古紙 段ボール', crcf9_hs:null, crcf9_price:150, crcf9_price_base:150, crcf9_weight:100.123, crcf9_qty:2.5,
  modifiedon:'2025-09-20T02:00:00Z', versionnumber:6000 }; }

function snapshot(){ return {contract:'LRS-2509CV1', contract_id:CID, taken_at:'2026-11-16T09:39:00Z', s_i:H.map((id,i)=>head(i,CID,id)), s_i_detail:[detail(D[0],H[0])]}; }
function snapshotOther(){ return {contract:'LRS-2509XX9', contract_id:CID_OTHER, taken_at:'2026-11-16T09:40:00Z', s_i:[head(0,CID_OTHER,HO[0])], s_i_detail:[detail(DO[0],HO[0])]}; }
const SNAP_PATH='古紙/-. AI 活用/D-00/A1_bench/compass_write_test/LRS-2509CV1_before_20261116T0939.json';
const SNAP_PATH_OTHER='古紙/-. AI 活用/D-00/A1_bench/compass_write_test/LRS-2509XX9_before_test.json';
/* 기본형 AttributeMetadata 에서 고를 수 있는 속성 (가짜 Dataverse 의 $select 검사용 — MaxLength · MinValue · MaxValue · Format 은 형별에만) */
const BASE_PROPS=['LogicalName','AttributeType','IsValidForUpdate','AttributeOf','SourceType','SchemaName','IsCustomAttribute','IsPrimaryId','IsPrimaryName','IsValidForCreate','IsValidForRead','RequiredLevel','MetadataId'];
module.exports={BASE_PROPS,CID,CID_OTHER,H,D,HO,DO,META,RANGES,KEYS,snapshot,snapshotOther,SNAP_PATH,SNAP_PATH_OTHER,FVK};
