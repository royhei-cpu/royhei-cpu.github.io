(()=>{'use strict';
const audit=window.ATLAS_SOURCE_AUDIT,data=window.TOY_ATLAS;if(!audit||!data)return;
const style=document.createElement('style');style.textContent='.source-audit-banner{padding:18px 22px;margin:20px 0;border:1px solid #d4dfd3;border-radius:10px;background:#f3f6ed;line-height:1.6}.source-audit-banner h2{font-size:18px;margin:0 0 6px}.source-audit-banner p{font-size:13px;margin:6px 0}.source-audit-banner a,.source-audit-note a{color:#165344;text-decoration:underline}.source-audit-note{font-size:12px;line-height:1.6;color:#79511e;background:#fff7e7;padding:10px 12px;border-radius:6px;margin:10px 0}.source-audit-card-note{font-size:11px;line-height:1.5;color:#80521d;margin:9px 0 0}.header-links>a.audit-link{font-size:12px;color:#165344;max-width:100px;line-height:1.3}@media(max-width:600px){.source-audit-banner{padding:15px}.header-links>a.audit-link{display:none}}';document.head.append(style);
const banner=document.createElement('section');banner.id='externalSourceAudit';banner.className='source-audit-banner';banner.setAttribute('aria-label','External source audit');banner.innerHTML='<h2>Sources, assortment & popularity — checked 31 October</h2><p>18 store / evidence destinations checked · 15 broken product links identified · 83 variant differences found. Read the exact coverage gaps and separate revenue, growth and platform-visibility rankings.</p><a href="research.html">Read the comprehensive source audit & market analysis →</a><p>Audit snapshot: 31 October 2026. Later collection dates may supersede individual findings.</p>';
const anchor=document.getElementById('stats');if(anchor)anchor.after(banner);else document.querySelector('main')?.prepend(banner);
const header=document.querySelector('.header-links');if(header&&!header.querySelector('.audit-link')){const a=document.createElement('a');a.className='audit-link';a.href='research.html';a.textContent='Source audit & rankings';header.prepend(a);}
const storeNote=document.createElement('p');storeNote.className='source-audit-note';storeNote.hidden=true;document.getElementById('retailerStatus')?.after(storeNote);
function refresh(){
 const id=document.getElementById('retailer')?.value;const s=audit.stores.find(s=>s.id===id);const text=s?'External audit · '+audit.checked+' — '+s.finding:'';if(storeNote.textContent!==text)storeNote.textContent=text;storeNote.hidden=!text;
 for(const card of document.querySelectorAll('.product-card[data-product-id]')){
  if(card.querySelector('.source-audit-card-note'))continue;
  const p=data.products.find(p=>p.id===card.dataset.productId);const links=[...card.querySelectorAll('.card-footer a')];
  if(p?.listings.some(l=>l.link_status===404&&links.some(a=>a.href===l.url))){const n=document.createElement('p');n.className='source-audit-card-note';n.textContent='Historical offer: source link returned 404 on '+audit.checked+'. Current stock unknown.';card.querySelector('.card-body')?.append(n);for(const a of links)if(p.listings.some(l=>l.link_status===404&&l.url===a.href))a.textContent='Historical link (404) ↗';}
 }
 for(const offer of document.querySelectorAll('#productDetail .offer')){
  if(offer.querySelector('.source-audit-note'))continue;
  const url=offer.querySelector('a')?.href;const p=data.products.find(p=>p.listings.some(l=>l.url===url));const l=p?.listings.find(l=>l.url===url);
  let note=l?.audit_note||'';
  if(l?.source_id==='kouhigh'&&(l.checked||'')<audit.checked)note='Store maintenance page observed '+audit.checked+'. This retained offer has not been revalidated.';
  if(note){const n=document.createElement('p');n.className='source-audit-note';n.textContent=note;offer.append(n);}
 }
}
let scheduled=false;function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh();});}
for(const id of ['catalogGrid','productDetail','retailerStatus']){const el=document.getElementById(id);if(el)new MutationObserver(queue).observe(el,{childList:true,subtree:true});}
refresh();
})();
