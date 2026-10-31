/* Keep the existing catalog capabilities, with a short browsing path. */
(() => {
 'use strict';
 const nav=document.getElementById('atlasBrandNav');
 if(nav){nav.setAttribute('aria-label','Main navigation');nav.innerHTML='<div class="atlas-links"><a href="#weeklyOverview">This week</a><a href="#browseToys">Products</a><a href="brands.html">Brands & makers</a><a href="#retailChains">Retail chains</a><a href="#chinaIntelligencePanel">Trends & research</a><a href="#tutorial">How to use</a></div>';}
 const browse=document.querySelector('.retailer-section');if(browse)browse.id='browseToys';
 const more=document.querySelector('.secondary-filters');
 if(more){const details=document.createElement('details');details.className='atlas-more-filters';const summary=document.createElement('summary');summary.textContent='More filters & sorting';details.append(summary);more.before(details);details.append(more);}
 // One brand selector in the browsing controls replaces duplicate brand strips.
 const brands=document.querySelector('.brand-section');if(brands)brands.hidden=true;
 const brandControl=document.getElementById('brandControl');if(brandControl){const link=document.createElement('a');link.href='brands.html';link.textContent='All brands & makers →';link.className='atlas-directory-shortcut atlas-directory-link';brandControl.parentElement.after(link);}
 const reset=document.getElementById('resetFilters');if(reset&&more)more.parentElement.after(reset);
 const desk=document.getElementById('chinaIntelligence');
 if(desk&&!document.getElementById('chinaIntelligencePanel')){const details=document.createElement('details');details.id='chinaIntelligencePanel';details.className='atlas-research-fold';const summary=document.createElement('summary');summary.textContent='Trends, rankings & market research';details.append(summary);desk.before(details);details.append(desk);}
 function reveal(id){const el=document.getElementById(id);if(!el)return;for(let x=el;x;x=x.parentElement)if(x.tagName==='DETAILS')x.open=true;el.setAttribute('tabindex','-1');el.focus({preventScroll:true});el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
 nav?.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;e.preventDefault();reveal(a.hash.slice(1));});
 const style=document.createElement('style');style.textContent='.atlas-directory-shortcut{display:inline-block;margin:10px 0 0;font-size:13px;color:#174c3d}#resetFilters{margin-top:8px}.atlas-more-filters,.atlas-research-fold{border:1px solid #d4e1d8;background:#f8fcf9;border-radius:12px;margin:14px 0;scroll-margin-top:100px}.atlas-more-filters>summary,.atlas-research-fold>summary{cursor:pointer;padding:15px 18px;color:#174c3d;font-size:14px;font-weight:700}.atlas-more-filters .secondary-filters{padding:4px 18px 18px}.atlas-research-fold .china-desk{margin:0;border:0}.brand-section[hidden]{display:none!important}#browseToys,#filters,#weeklyOverview,#tutorial{scroll-margin-top:100px}.intro{padding-top:20px!important;padding-bottom:20px!important}.intro h1{font-size:clamp(25px,4vw,38px)!important}.atlas-brand-nav .atlas-links{width:100%;justify-content:center}@media(max-width:600px){.atlas-brand-nav .atlas-links{justify-content:flex-start}.atlas-brand-nav a{font-size:12px}.intro br.desktop{display:none}}';document.head.append(style);
 // Keep the opening path short: weekly brief, shopping controls, products.
 // Research and help remain directly reachable from the main navigation.
 const main=document.querySelector('main'),reading=main?.querySelector('.reading-note');
 for(const id of ['chinaIntelligencePanel','ip-rankings','openIPRankings','brandCoverageReview','tutorial']){
   const el=document.getElementById(id);if(el&&main){if(reading)reading.before(el);else main.append(el);}
 }
 if(location.hash)requestAnimationFrame(()=>reveal(location.hash.slice(1)));
})();
