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
 const supporting=['chinaIntelligencePanel','ip-rankings','openIPRankings','brandCoverageReview','tutorial'];
 function orderSections(){
  const results=document.getElementById('results');if(!main||!results)return;
  for(const id of supporting){const el=document.getElementById(id);if(el?.parentElement===main&&(el.compareDocumentPosition(results)&Node.DOCUMENT_POSITION_FOLLOWING)){if(reading)reading.before(el);else main.append(el);}}
 }
 // Some research modules arrive after the initial catalog render.
 orderSections();if(main)new MutationObserver(orderSections).observe(main,{childList:true});
 if(location.hash)requestAnimationFrame(()=>reveal(location.hash.slice(1)));
})();

/* Task-first landing page: keep detail available without making it the dashboard. */
(() => {
 'use strict';
 const main=document.querySelector('main'); if(!main)return;
 function fold(el,label,id){
  if(!el||el.closest('.atlas-dashboard-fold'))return;
  const box=document.createElement('details');box.className='atlas-dashboard-fold';if(id)box.id=id;
  const title=document.createElement('summary');title.textContent=label;box.append(title);el.before(box);box.append(el);return box;
 }
 const intro=main.querySelector('.intro');if(intro){main.prepend(intro);intro.querySelector('h1').innerHTML='Find your next <span>China toy.</span>';intro.querySelector('p').textContent='Explore Chinese blind boxes, squishies and character toys. Find a favourite, compare shop prices and save your picks.';}
 const stats=document.getElementById('stats');if(stats)stats.hidden=true;
 const weekly=document.getElementById('weeklyOverview');
 function compactWeekly(){
  if(!weekly||weekly.querySelector('.dashboard-weekly-details'))return;
  intro?.after(weekly);
  const heading=weekly.querySelector('h1');if(heading){const h=document.createElement('h2');h.textContent='This week';heading.replaceWith(h);}
  const root=weekly.querySelector('[data-executive-brief]')||weekly;
  const detail=document.createElement('details');detail.className='dashboard-weekly-details';detail.innerHTML='<summary>View weekly changes & sources</summary>';
  const targets=Array.from(root.children).filter(e=>!e.classList.contains('brief-heading'));
  root.append(detail);targets.forEach(e=>detail.append(e));
  const counts=document.createElement('p');counts.className='dashboard-weekly-line';
  const parts=[['added','added to the catalog'],['launch','release dates this week']].map(([key,label])=>{const n=detail.querySelector('[data-weekly="'+key+'"] b');return n?n.textContent+' '+label:'';}).filter(Boolean);
  counts.textContent=parts.join(' · ');detail.before(counts);
  const chainNote=weekly.querySelector('#weeklyChainReview');if(chainNote)detail.append(chainNote);
  const enrichment=window.CHAIN_ASSORTMENTS?.enrichment_review;if(enrichment){const stamp=document.createElement('p');stamp.className='dashboard-weekly-line';stamp.textContent='Latest source update: '+enrichment.checked+' · Photos and prices';counts.after(stamp);}
 }
 compactWeekly();if(weekly)new MutationObserver(compactWeekly).observe(weekly,{childList:true,subtree:true});
 const chain=document.getElementById('retailChains');fold(chain,'Browse retail chains · MINISO, POP MART, TOP TOY & more','chainBrowser');
 const audit=document.getElementById('externalSourceAudit'),results=document.getElementById('results');
 if(audit&&results){results.after(audit);fold(audit,'Source checks & coverage');}
 const tabs=main.querySelector('.view-tabs');
 if(tabs){const advanced=document.createElement('details');advanced.className='atlas-dashboard-fold';advanced.innerHTML='<summary>Launch timeline & coverage</summary>';
 const body=document.createElement('div');advanced.append(body);
 tabs.querySelectorAll('[data-view="timeline"],[data-view="coverage"]').forEach(b=>body.append(b));results?.after(advanced);}
 const nav=document.querySelector('#atlasBrandNav .atlas-links');
 if(nav)nav.innerHTML='<a href="#browseToys">Products</a><a href="brands.html">Brands</a><a href="#retailChains">Retail chains</a><a href="#weeklyOverview">This week</a><a href="#chinaIntelligencePanel">Research</a>';
 const css=document.createElement('style');css.textContent=`
 #stats[hidden]{display:none!important}.intro .update-note{display:none}.intro{display:flex!important;margin:0!important;padding:24px 0 18px!important}.intro h1{font-size:clamp(26px,4vw,40px)!important}.intro p{font-size:15px!important;max-width:720px}
 #weeklyOverview{padding:16px 20px!important;margin:0 0 18px!important;border-radius:16px}
 #weeklyOverview .brief-heading{align-items:center}#weeklyOverview h2{font-size:20px;margin:0 0 5px}#weeklyOverview .brief-kicker,#weeklyOverview .brief-scope,#weeklyOverview .brief-heading>a{display:none}
 #weeklyOverview .brief-period{margin:0;font-size:12px}.dashboard-weekly-line{margin:10px 0;font-weight:600;font-size:14px}.dashboard-weekly-details>summary{font-size:13px;cursor:pointer;color:#174c3d}
 .atlas-dashboard-fold{border:1px solid #d4e1d8;border-radius:12px;background:#fff;margin:12px 0}.atlas-dashboard-fold>summary{padding:14px 18px;cursor:pointer;font-size:14px;font-weight:650;color:#174c3d}.atlas-dashboard-fold>section{margin:0!important;border:0!important}.atlas-dashboard-fold>div{padding:12px}
 #browseToys{padding:16px!important;margin:12px 0!important}.view-tabs{margin:12px 0!important}.filter-section{padding-top:12px!important}.atlas-directory-shortcut{display:none}
 #weeklyChainReview{font-size:13px}.atlas-brand-nav{position:static!important}
 `;document.head.append(css);
 function revealHash(){const id=location.hash.slice(1);const el=document.getElementById(id);if(el)for(let x=el;x;x=x.parentElement)if(x.tagName==='DETAILS')x.open=true;}
 window.addEventListener('hashchange',revealHash);revealHash();
})();

/* Plain-language help for shoppers and collectors. */
(()=>{'use strict';const intro=document.querySelector('.intro');if(!intro)return;const help=document.createElement('details');help.className='collector-help';help.innerHTML='<summary>New here? Start with these 3 steps</summary><ol><li><b>Find a toy.</b> Choose a brand or shop, or search for a character. Use Product type to find blind boxes or squishies.</li><li><b>Explore and compare.</b> Tap a photo for details and shop links. Select 2–6 products to compare. The bookmark saves favourites on this device.</li><li><b>Save your research.</b> Download a CSV for Excel with product details and photo links. CSV files contain image links, not embedded pictures.</li></ol><p><b>Collector basics:</b> A blind box contains a surprise design. A secret is a special design in a series; check the seller for its odds. A wave is a release within a series.</p><p><b>Before buying:</b> Check whether the price is for one box, a full set or a specific character. Prices and availability can change. Follow the shop link to buy; this website is a discovery guide.</p>';intro.after(help);const style=document.createElement('style');style.textContent='.collector-help{background:#fff8e9;border:1px solid #eadcc0;border-radius:12px;padding:14px 18px;margin:0 0 16px;font-size:14px;line-height:1.7}.collector-help summary,.collector-extra summary{cursor:pointer;font-weight:650;color:#174c3d}.collector-help ol{padding-left:22px}.collector-help li{margin:8px 0}.collector-help p{margin:10px 0}.collector-extra{margin-top:10px}.collector-extra summary{font-size:12px;margin-bottom:8px}.product-card .available-description{font-size:13px;line-height:1.6}.product-card .character-name span{font-size:11px}.product-card .card-footer{gap:12px}';document.head.append(style);})();

/* Keep optional research together, away from the shopping path. */
(()=>{'use strict';
 const main=document.querySelector('main'),results=document.getElementById('results');if(!main||!results)return;
 const group=document.createElement('details');group.id='sourcesResearch';group.className='atlas-dashboard-fold';
 group.innerHTML='<summary>Sources & research</summary><p class="research-intro">Optional: explore trends, launch dates, source checks and what the catalog covers.</p>';
 results.after(group);
 const links=document.createElement('div');links.className='research-links';group.append(links);
 document.querySelectorAll('footer a[href="report.json"],footer a[href*="github.com"],.header-links a[href="research.html"]').forEach(a=>links.append(a));
 const reading=main.querySelector('.reading-note');if(reading)group.append(reading);
 function collect(){
  for(const el of Array.from(main.children)){
   const title=el.querySelector(':scope > summary')?.textContent||'';
   if(['chinaIntelligencePanel','brandCoverageReview','ip-rankings','openIPRankings'].includes(el.id)||['Launch timeline & coverage','Source checks & coverage'].includes(title))group.append(el);
  }
  const tutorial=document.getElementById('tutorial');
  if(tutorial){const summary=tutorial.querySelector(':scope > summary');if(summary&&!summary.dataset.simpleHelp){summary.textContent='How to use · video tutorial';summary.dataset.simpleHelp='true';}}
 }
 collect();new MutationObserver(collect).observe(main,{childList:true});
 const link=document.querySelector('#atlasBrandNav a[href="#chinaIntelligencePanel"]');if(link){link.href='#sourcesResearch';link.textContent='Research';}
 const css=document.createElement('style');css.textContent='#sourcesResearch{margin-top:24px}#sourcesResearch>.research-intro{padding:0 18px;font-size:13px;color:#53645d}#sourcesResearch>details{margin:8px 14px;border:0;border-top:1px solid #e2e9e4;border-radius:0;background:transparent}#sourcesResearch>.ip-top-button{display:none}#sourcesResearch>summary{font-size:15px}.research-links{display:flex;flex-wrap:wrap;gap:16px;padding:12px 18px;font-size:13px}';document.head.append(css);
})();
