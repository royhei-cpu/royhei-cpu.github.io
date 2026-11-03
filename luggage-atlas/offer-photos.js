'use strict';
// Resolve by the existing stable offer identity, never by brand or mutable price/date.
function offerPhotoAudit(p){
  const key=offerKey(p);
  return (window.ATLAS_PHOTOS.offerAudits||[]).find(a=>a.offerId===key&&Object.entries(a.offerIdentity).every(([k,v])=>p[k]===v));
}
function offerPhotoRows(p){const a=offerPhotoAudit(p);return a?a.photoIds.map(id=>window.ATLAS_PHOTOS.photos.find(x=>x.id===id)).filter(Boolean):[];}
function matchedOfferPhotos(p){return offerPhotoRows(p).filter(x=>x.verificationStatus!=='collection-alternative');}
function photoStatus(p){return ({'model-size-color-revision-matched':'Model, size, color & revision matched','model-size-color-matched':'Model, size & color matched · revision not stated','model-size-matched-color-unspecified':'Model & size matched · offer color unspecified','collection-alternative':'Collection alternative · size not verified'})[p?.verificationStatus]||'Collection reference · exact offer not verified';}
function offerView(p,view){return matchedOfferPhotos(p).find(x=>x.view===view);}
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
function offerAlternatives(p){const a=offerPhotoAudit(p),b=brandBy(p.brand);return a?offerPhotoRows(p).filter(x=>x.verificationStatus==='collection-alternative'):(b?galleryFor(b).filter(x=>!x.offerId):[]);}
function offerPhotoExport(p){
  const a=offerPhotoAudit(p),rows=offerPhotoAudit(p)?offerPhotoRows(p):offerAlternatives(p),primary=matchedOfferPhotos(p),alternatives=offerAlternatives(p);
  const urls=view=>primary.filter(x=>x.view===view).map(x=>x.imageUrl).join(' | ');
  return [urls('Exterior'),urls('Interior'),rows.map(x=>x.caption+' — '+x.scope).join(' | '),[...new Set(rows.map(x=>x.source))].join(' | '),urls('Compartment'),urls('Organization'),urls('Detail'),urls('Dimensions'),offerPhotoSummary(p),a?.checked||'',a?.identity.model||'',a?.identity.size||'',a?.identity.color||'',a?.identity.revision||'Not stated / not verified',a?.identity.sku||'',a?.gaps.join(' | ')||'Exact offer not reviewed',alternatives.map(x=>x.imageUrl).join(' | '),JSON.stringify(rows.map(x=>({view:x.view,url:x.imageUrl,source:x.source,status:x.verificationStatus||'collection-alternative',scope:x.scope,checked:x.checked,model:x.identity?.model||null,size:x.identity?.size||null,color:x.identity?.color||null,revision:x.identity?.revision||null,sku:x.identity?.sku||null})))];
}
const offerPhotoExportHeaders=['Exterior photo URL','Interior photo URL','Photo captions / model scope','Photo source URLs','Compartment photo URLs','Organization photo URLs','Detail photo URLs','Dimension photo URLs','Photo verification status','Photo checked date','Photo model','Photo size','Photo color','Photo revision','Photo SKU / item ID','Remaining image gaps','Collection alternative photo URLs','Photo evidence JSON'];
document.addEventListener('click',e=>{const button=e.target.closest('[data-offer-gallery]');if(button)showOfferPhotos(button.dataset.offerGallery);});
// A failed image stays visibly unavailable; never replace it with a different model.
document.addEventListener('error',e=>{const img=e.target;if(img?.tagName!=='IMG'||!img.closest('.photo-figure,.offer-image'))return;const message=document.createElement('span');message.className='photo-load-error';message.textContent='Photo unavailable — use the source link';img.replaceWith(message);},true);

function representativeOffer(b){return D.prices.find(p=>p.brand===b.name&&p.product===b.price?.product&&p.currency===b.price?.currency&&p.source===b.price?.source);}
function representativePhoto(b,view){const p=representativeOffer(b);return p&&offerPhotoAudit(p)?offerView(p,view):galleryFor(b).find(x=>!x.offerId&&x.view.startsWith(view));}
