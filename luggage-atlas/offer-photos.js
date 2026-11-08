'use strict';
// Resolve by the existing stable offer identity, never by brand or mutable price/date.
function offerPhotoAudit(p){
  const key=offerKey(p);
  return (window.ATLAS_PHOTOS.offerAudits||[]).find(a=>a.offerId===key&&Object.entries(a.offerIdentity).every(([k,v])=>p[k]===v));
}
function offerPhotoRows(p){const a=offerPhotoAudit(p);return a?a.photoIds.map(id=>window.ATLAS_PHOTOS.photos.find(x=>x.id===id&&x.offerId===a.offerId)).filter(Boolean):[];}
function photoIsExact(p){return ['model-size-color-revision-matched','model-size-color-matched'].includes(p?.verificationStatus);}
function photoIsQualified(p){return p?.verificationStatus==='model-size-matched-color-unspecified';}
function matchedOfferPhotos(p){return offerPhotoRows(p).filter(photoIsExact);}
function qualifiedOfferPhotos(p){return offerPhotoRows(p).filter(photoIsQualified);}
function photoStatus(p){return ({'model-size-color-revision-matched':'Model, size, color & revision matched','model-size-color-matched':'Model, size & color matched · revision not stated','model-size-matched-color-unspecified':'Model & size matched · offer color unspecified','collection-alternative':'Collection alternative · size not verified'})[p?.verificationStatus]||'Collection reference · exact offer not verified';}
// Qualified views may be displayed with their warning, but never exported as exact matches.
function offerView(p,view){return [...matchedOfferPhotos(p),...qualifiedOfferPhotos(p)].find(x=>x.view===view);}
function offerPhotoSummary(p){const a=offerPhotoAudit(p);return a?[...new Set(offerPhotoRows(p).map(photoStatus))].join('; '):'Exact offer photography not reviewed. Collection references are separate.';}
function offerPhotoPair(p){return `<div class="desk-photo-pair">${photoFigure(offerView(p,'Exterior'),true,'Exterior')}${photoFigure(offerView(p,'Interior'),true,'Main interior')}</div>`;}
function offerPhotoEvidence(p){const a=offerPhotoAudit(p);return offerPhotoPair(p)+`<p class="caption">${E(offerPhotoSummary(p))}</p>${a?`<button class="btn" data-offer-gallery="${E(offerKey(p))}">All ${a.photoIds.length} photos, sources & gaps →</button><p class="caption">${E(a.gaps.join(' '))}</p>`:`<details><summary>Collection alternatives · exact offer not verified</summary><div class="desk-photo-pair">${offerAlternatives(p).slice(0,2).map(x=>photoFigure(x,true)).join('')}</div></details>`}`;}
function offerPhotoCard(p){const a=offerPhotoAudit(p);return `<article class="offer-photo-card"><h3>${E(p.brand)} · ${E(p.product)}</h3><p class="caption">${money(p)} · saved price ${E(p.date)} · photos checked ${E(a.checked)}</p>${offerPhotoEvidence(p)}</article>`;}
function brandOfferPhotos(b){return D.prices.filter(p=>p.brand===b.name&&offerPhotoAudit(p));}
function showOfferPhotos(id){
  const p=offers().find(p=>p.id===id),a=p&&offerPhotoAudit(p);if(!a)return;
  $('#photoLightboxBody').innerHTML=`<h2>${E(p.brand)} · ${E(p.product)}</h2><p>${money(p)} · original price observation ${E(p.date)}</p><p class="caption">Photo check ${E(a.checked)}. ${E(a.note)}</p><div class="photo-grid">${offerPhotoRows(p).map(x=>photoFigure(x,true,'Interior',true)).join('')}</div><h3>Remaining image gaps</h3><ul>${a.gaps.map(g=>`<li>${E(g)}</li>`).join('')||'<li>No identified gap in the captured views.</li>'}</ul>${link(a.productPage,'Verified product page ↗')} · ${link(p.source,'Original price evidence ↗')}`;
  if(!$('#photoLightbox').open)$('#photoLightbox').showModal();
}
function offerAlternatives(p){const a=offerPhotoAudit(p),b=brandBy(p.brand);return a?offerPhotoRows(p).filter(x=>!photoIsExact(x)&&!photoIsQualified(x)):(b?galleryFor(b).filter(x=>!x.offerId):[]);}
function offerPhotoExport(p){
  const a=offerPhotoAudit(p),rows=a?offerPhotoRows(p):offerAlternatives(p),primary=matchedOfferPhotos(p),qualified=qualifiedOfferPhotos(p),alternatives=offerAlternatives(p);
  const urls=view=>primary.filter(x=>x.view===view).map(x=>x.imageUrl).join(' | ');
  return [urls('Exterior'),urls('Interior'),rows.map(x=>x.caption+' — '+x.scope).join(' | '),[...new Set(rows.map(x=>x.source))].join(' | '),urls('Compartment'),urls('Organization'),urls('Detail'),urls('Dimensions'),offerPhotoSummary(p),a?.checked||'',a?.identity.model||'',a?.identity.size||'',a?.identity.color||'',a?.identity.revision||'Not stated / not verified',a?.identity.sku||'',a?.gaps.join(' | ')||'Exact offer not reviewed',[p.sourcePhoto,...alternatives.map(x=>x.imageUrl)].filter(Boolean).join(' | '),JSON.stringify(rows.map(x=>({view:x.view,url:x.imageUrl,localPath:x.localPath||null,source:x.source,status:x.verificationStatus||'collection-alternative',scope:x.scope,checked:x.checked,model:x.identity?.model||null,size:x.identity?.size||null,color:x.identity?.color||null,revision:x.identity?.revision||null,sku:x.identity?.sku||null,evidence:x.evidence||null}))),qualified.filter(x=>x.view==='Exterior').map(x=>x.imageUrl).join(' | '),qualified.filter(x=>x.view==='Interior').map(x=>x.imageUrl).join(' | '),qualified.map(x=>x.imageUrl).join(' | '),rows.map(x=>x.localPath||'').filter(Boolean).join(' | ')];
}
const offerPhotoExportHeaders=['Exterior photo URL','Interior photo URL','Photo captions / model scope','Photo source URLs','Compartment photo URLs','Organization photo URLs','Detail photo URLs','Dimension photo URLs','Photo verification status','Photo checked date','Photo model','Photo size','Photo color','Photo revision','Photo SKU / item ID','Remaining image gaps','Collection alternative photo URLs','Photo evidence JSON','Color-unverified exterior photo URLs','Color-unverified interior photo URLs','All color-unverified photo URLs','Bundled photo asset paths'];
document.addEventListener('click',e=>{const button=e.target.closest('[data-offer-gallery]');if(button)showOfferPhotos(button.dataset.offerGallery);});
// A failed image stays visibly unavailable; never replace it with a different model.
document.addEventListener('error',e=>{const img=e.target;if(img?.tagName!=='IMG'||!img.closest('.photo-figure,.offer-image,.lightbox-image'))return;const message=document.createElement('span');message.className='photo-load-error';message.textContent='Photo unavailable — use the source link';img.replaceWith(message);},true);

function representativeOffer(b){return D.prices.find(p=>p.brand===b.name&&p.product===b.price?.product&&p.currency===b.price?.currency&&p.source===b.price?.source);}
function representativePhoto(b,view){const p=representativeOffer(b);return p&&offerPhotoAudit(p)?offerView(p,view):galleryFor(b).find(x=>!x.offerId&&x.view.startsWith(view));}

async function exportVisualShortlist(){
 const picked=selectedOffers();if(!picked.length){toast('Select at least one exact offer first.');return;}
 const embed=async photo=>{
  const cached=window.ATLAS_PHOTO_IMAGES?.[photo.id];if(cached?.startsWith('data:image/'))return cached;
  if(!photo.localPath)return '';
  try{const response=await fetch(photo.localPath);if(!response.ok)return '';const blob=await response.blob();return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}catch{return '';}
 };
 toast('Preparing the visual comparison with source photographs…');
 const sections=await Promise.all(picked.map(async p=>{const audit=offerPhotoAudit(p),photos=audit?offerPhotoRows(p):offerAlternatives(p).slice(0,4);const figures=await Promise.all(photos.map(async ph=>{const data=await embed(ph);return `<figure>${data?`<img src="${E(data)}" alt="${E(ph.caption)}">`:'<p>Photograph could not be embedded. Use the original image link.</p>'}<figcaption><b>${E(ph.view)} · ${E(photoStatus(ph))}</b><p>${E(ph.caption)}</p><p>${E(ph.scope)}</p>${link(ph.source,'Photo source')} · ${link(ph.imageUrl,'Original photograph')}</figcaption></figure>`;}));return `<section><h2>${E(p.brand)} · ${E(p.product)}</h2><p><b>${money(p)}</b> · saved ${E(p.date)} · ${E(p.market)}</p><p>${E(p.kind)} ${E(p.note||'')}</p>${link(p.source,'Original price evidence')}<p>${E(offerPhotoSummary(p))}</p><div class="photos">${figures.join('')}</div><h3>Remaining evidence gaps</h3><p>${E(audit?audit.gaps.join(' '):'Exact offer photography has not been audited. Images above are collection references, not verified matches.')}</p></section>`;}));
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Luggage Atlas · Selected visual comparison</title><style>body{max-width:1250px;margin:30px auto;padding:0 24px;background:#f8f7f2;color:#173e32;font:15px/1.6 system-ui}h1,h2{font-family:Georgia,serif}section{padding:25px 0;border-top:1px solid #cbd1c4}.photos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0;background:white;padding:15px}img{width:100%;height:240px;object-fit:contain}figcaption{font-size:11px}a{color:inherit}@media(max-width:700px){.photos{grid-template-columns:1fr}}</style></head><body><h1>Your luggage comparison</h1><p>${picked.length} selected priced offers. Saved research evidence, not live prices. Photographs retain their original model, size, color and revision limitations. Successfully embedded images are available offline; source links require an internet connection.</p>${sections.join('')}</body></html>`;
 const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='Luggage_Atlas_Visual_Comparison.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Visual comparison exported with photographs and sources.');
}
document.addEventListener('click',async e=>{const button=e.target.closest('[data-visual-shortlist]');if(!button)return;button.disabled=true;try{await exportVisualShortlist();}catch{toast('Visual export could not finish. Your selections are saved; try the CSV export.');}finally{button.disabled=false;}});
