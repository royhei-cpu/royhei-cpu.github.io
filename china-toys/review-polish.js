/* ATLAS_PLAIN_EVIDENCE */
(() => {
'use strict';
const d=window.TOY_ATLAS;if(!d)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=(u,t)=>{try{const url=new URL(u);return /^https?:$/.test(url.protocol)?`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(t)} ↗</a>`:''}catch{return ''}};
const sty=document.createElement('style');sty.textContent='.review-appeal{font-size:12px;line-height:1.6;border-top:1px solid #d1e1d6;margin-top:9px;padding-top:8px}.review-appeal strong{font-size:12px}.review-field-source{font-size:11px;display:block;margin-top:3px}.photo-scope-note{font-size:11px;line-height:1.6;color:#5a655e;margin:8px 0}@media(max-width:480px){.product-grid{grid-template-columns:minmax(0,1fr)!important}.product-card .photo-button{aspect-ratio:4/3}.product-card .photo-button img{height:100%;object-fit:contain}.review-reason,.review-spec{font-size:13px}.review-reason small{font-size:12px}.product-card .price-caption{font-size:12px}}';document.head.append(sty);
function decorate(){
 for(const card of document.querySelectorAll('.product-card[data-product-id]')){
  if(card.dataset.plainEvidence)continue;const p=d.products.find(p=>p.id===card.dataset.productId);if(!p)continue;
  const reason=card.querySelector('.review-reason');if(reason&&p.trend?.possible_appeal&&!reason.querySelector('.review-appeal')){const x=document.createElement('div');x.className='review-appeal';x.innerHTML='<strong>Possible appeal — interpretation</strong>'+esc(p.trend.possible_appeal);reason.append(x)}
  if(card.querySelector('.review-spec')||reason)card.dataset.plainEvidence='1';
 }
 const root=document.getElementById('productDetail');if(!root||!root.querySelector('.review-details'))return;
 const title=root.querySelector('#detailTitle')?.textContent;const p=d.products.find(p=>p.name===title);if(!p)return;
 const panel=root.querySelector('.review-details');if(panel.dataset.plainEvidence)return;panel.dataset.plainEvidence='1';
 const mapping={'Material':'material','Dimensions':'size','Age stated by source':'age','Scale':'scale'};
 for(const dt of panel.querySelectorAll('dl dt')){const field=mapping[dt.textContent],e=p.details?.field_sources?.[field];if(e){const small=document.createElement('small');small.className='review-field-source';small.innerHTML=source(e.url,'Field source');dt.nextElementSibling?.append(small)}}
 if(p.image_gallery_note){const note=document.createElement('p');note.className='photo-scope-note';note.textContent=p.image_gallery_note;panel.querySelector('.review-photos')?.before(note)}
 if(p.trend?.possible_appeal){const x=document.createElement('section');x.className='review-context';x.innerHTML='<strong>Possible appeal — interpretation, not proven sales causation</strong><p>'+esc(p.trend.possible_appeal)+'</p>';panel.append(x)}
}
let queued=false;const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})};
for(const id of ['catalogGrid','productDetail']){const root=document.getElementById(id);if(root)new MutationObserver(queue).observe(root,{childList:true,subtree:true})}
decorate();
})();
