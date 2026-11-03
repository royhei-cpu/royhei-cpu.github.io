(function(){
  'use strict';
  const byId=new Map(),picks=new Set(),data=window.HCTargetInspirationData;
  // Preserve the cited accessory comparisons without importing the Home Care catalogue.
  for(const idea of data.recommendations)for(const ref of idea.comparisons||[]){
    if(!ref.id.startsWith('TRAVEL-')&&!byId.has(ref.id))byId.set(ref.id,{id:ref.id,name:ref.title,retailer:ref.retailer||'',url:ref.url,listingSource:ref.url,checkedDate:ref.checkedAt,category:'Travel-care accessory reference',features:[ref.featureToLearn].filter(Boolean),verificationNote:ref.limitation||'',image:ref.image||'',displayPrice:ref.displayPrice||'',photoVerification:'Photo not supplied in the saved comparison reference.'});
  }
  const context={byId,picks,cached:new Map()};
  window.HCTargetInspiration.mount(context);
  try{for(const id of JSON.parse(localStorage.getItem('luggage-openstory-picks-v1')||'[]'))if(byId.has(id))picks.add(id);}catch(_){}
  window.HCProductCompare.mount({...context,onBrowse:()=>window.HCTargetInspiration.show(),onShow:()=>window.HCTargetInspiration.hide()});
  const quote=value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
  document.getElementById('export').addEventListener('click',()=>{
    const fields=['targetInspirationRole','targetInspirationIdeas','targetFeatureToLearn','targetProposedConcept','targetValidationSteps','targetInspirationSources'];
    const rows=[['Product','Brand','Retailer','Saved price','Price basis','Source checked','Product URL','Photo URL','Photo source',...fields]];
    for(const id of picks){const p=byId.get(id);if(!p)continue;rows.push([p.name,p.brand,p.retailer,p.displayPrice,p.priceBasis,p.checkedDate,p.url,p.image?new URL(p.image,location.href).href:'',p.photoSource,...fields.map(f=>window.HCTargetInspiration.exportValue(p,f))]);}
    const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='Luggage_Atlas_Open_Story_Comparison.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.HCTargetInspiration.show();
})();
