/* Sourced retailer backgrounds, published updates and clearly separate catalog context. */
(() => {
'use strict';
function init(){
 const D=window.ATLAS_RETAILER_STORIES,root=document.getElementById('workspace-stories');
 if(!D||!root||root.dataset.ready)return;root.dataset.ready='true';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safe=u=>{try{const x=new URL(u);return ['https:','http:'].includes(x.protocol)&&!x.username?x.href:''}catch{return ''}};
 const link=(u,t)=>safe(u)?`<a href="${esc(safe(u))}" target="_blank" rel="noopener noreferrer">${esc(t)}&nbsp;↗</a>`:'';
 const imageSrc=u=>/^(?:images|retail)\//.test(String(u||''))?new URL(u,document.baseURI).href:safe(u);
 const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'}):'Date not captured';
 const profiles=[...D.retailers].sort((a,b)=>a.name.localeCompare(b.name)),byId=new Map(profiles.map(r=>[r.id,r]));
 let tab='news',selected='',search='',period='90',page=0;
 const $=id=>document.getElementById(id);
 const cutoff=()=>{const d=new Date(D.generated+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-Number(period));return d.toISOString().slice(0,10)};
 const recent=n=>n.published<=D.generated&&(period==='all'||n.published>=cutoff());
 const updates=(id='')=>D.updates.filter(n=>(!id||n.retailer_ids.includes(id))&&recent(n));
 const retailerForKey=key=>profiles.find(r=>r.retailer_keys.includes(key));
 const productCache=new Map();
 function products(r){
  if(productCache.has(r.id))return productCache.get(r.id);
  const catalog=(window.TOY_ATLAS?.products||[]).filter(p=>window.ATLAS_PRODUCT_SCOPE?.eligible(p)&&(p.listings||[]).some(l=>r.source_ids.includes(l.source_id)||r.retailer_keys.includes(window.ATLAS_RETAIL_DATA?.listingKey(l))));
  const chain=(window.CHAIN_ASSORTMENTS?.products||[]).filter(p=>window.ATLAS_PRODUCT_SCOPE?.eligible(p)&&(p.chain_ids||[]).some(id=>r.chain_ids.includes(id)));
  const extra=(window.ATLAS_RETAIL_DATA?.benchmarks||[]).filter(p=>(p.listings||[]).some(l=>r.retailer_keys.includes(window.ATLAS_RETAIL_DATA.listingKey(l))));
  const result=[...catalog,...chain,...extra].filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i);productCache.set(r.id,result);return result;
 }
 const photo=r=>{const p=products(r).find(p=>p.image);return p?`<img src="${esc(p.image)}" alt="Catalog example: ${esc(p.name)}" loading="lazy"><span>Catalog example</span>`:''};
 function status(r){const n=updates(r.id).length;return n?`${n} dated ${n===1?'update':'updates'}${period==='all'?' in the archive':' in this period'}`:'No dated update verified in this period'}
 root.innerHTML=`<div class="workspace-page-heading"><span class="stories-eyebrow">PEOPLE, PLACES & WHAT’S NEW</span><h1>The stories behind the shelves.</h1><p>Retailer backgrounds, dated news and ideas for your next aisle.</p></div><div class="stories-overview"><strong>${profiles.length} retailer profiles</strong><span>Backgrounds reviewed ${date(D.background_reviewed)}</span><span>Feed checks ${date(D.feeds_checked)}</span></div><button id="storiesFiltersToggle" class="stories-filters-toggle" aria-controls="storiesFilters" aria-expanded="false">Filter retailer or dates</button><div class="stories-controls" id="storiesFilters"><label>Find a retailer or story<input id="storiesSearch" type="search" placeholder="Try squishy, POP MART or store opening"></label><label>Retailer<select id="storiesRetailer"><option value="">All tracked retailers</option>${profiles.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label><label>News period<select id="storiesPeriod"><option value="90">Last 90 days</option><option value="30">Last 30 days</option><option value="all">Full dated archive</option></select></label><button id="storiesReset" class="text-button">Reset</button></div><div class="stories-view-tabs" role="group" aria-label="Retailer stories view"><button data-stories-tab="news" aria-pressed="true">News & releases</button><button data-stories-tab="profiles" aria-pressed="false">Retailer stories</button><button data-stories-tab="journals" aria-pressed="false">Shop journals</button></div><div id="storiesSelected"></div><div class="stories-results-heading"><h2 id="storiesHeading">Latest sourced updates</h2><span id="storiesCount" role="status"></span></div><p id="storiesNote" class="stories-note"></p><div id="storiesResults"></div><nav class="stories-pagination" aria-label="Retailer story pages"><button id="storiesPrev">Previous</button><span id="storiesPage"></span><button id="storiesNext">Next</button></nav><details class="stories-methods"><summary>Sources, coverage and how updates work</summary><p>${esc(D.scope)}</p><p>${esc(D.methods)}</p><p>“Published” is the source’s post date. “Arrival listed” is a shop’s dated arrival note. An event or release date can be different, and an upcoming opening is still a plan. A store announcement is not a guarantee that a product is in stock today.</p><p>News photographs come from the linked article or named release, with credits beneath each image. If a source photo is unavailable, a retailer catalog example is labeled separately. Profile photos are existing catalog examples, not photographs of the retailer’s founder. Shelf ideas are Atlas editorial suggestions.</p><ul>${D.feed_health.map(f=>`<li>${esc(byId.get(f.retailer_id)?.name)} · ${esc(f.status)} · checked ${date(f.checked)}${f.last_success?' · last read '+date(f.last_success):''} · ${link(f.url,'Public journal feed')}</li>`).join('')}</ul><a href="retailer-stories-data.json" download>Download stories, dates and source links · JSON</a></details>`;
 const dialog=document.createElement('dialog');dialog.id='retailerStoryDialog';dialog.setAttribute('aria-labelledby','retailerStoryTitle');dialog.innerHTML='<button class="dialog-close" aria-label="Close retailer story">×</button><div id="retailerStoryBody"></div>';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();
 function newsImage(n){
  const retailer=n.retailer_ids.map(id=>byId.get(id)).find(r=>r&&products(r).some(p=>p.image));
  const product=retailer&&products(retailer).find(p=>p.image);
  const fallback=product?{src:product.image,alt:`Catalog example: ${product.name}`,credit:retailer.name,kind:'Catalog example',source_page:product.listings?.find(l=>safe(l.url))?.url||product.image_source||retailer.background_sources[0]?.url}:null;
  const image=n.image?.src?n.image:fallback;if(!image||!imageSrc(image.src))return '';
  const credit=`${image.kind||'Article image'} · Photo: ${image.credit||n.publisher}`;
  return `<figure class="stories-news-visual"><a class="stories-news-image-link" href="${esc(safe(n.url))}" target="_blank" rel="noopener noreferrer" aria-label="Read ${esc(n.title)}"><img class="stories-news-image" src="${esc(imageSrc(image.src))}" alt="${esc(image.alt||n.title)}" width="1000" height="625" loading="lazy" decoding="async"${fallback?` data-fallback="${esc(imageSrc(fallback.src))}" data-fallback-alt="${esc(fallback.alt)}" data-fallback-credit="${esc(fallback.credit)}" data-fallback-source="${esc(safe(fallback.source_page))}"`:''}></a><figcaption><span class="stories-photo-credit">${esc(credit)}</span>${link(image.source_page||n.url,'Source')}</figcaption></figure>`;
 }
 // Failed publisher images fall back to a labeled local catalog example, never a broken icon.
 document.addEventListener('load',e=>{
  const img=e.target;if(!img.matches?.('.stories-news-image'))return;
  const detail=img.naturalHeight>img.naturalWidth*3;img.classList.toggle('stories-news-image-detail',detail);
  const credit=img.closest('figure').querySelector('.stories-photo-credit');credit.textContent=credit.textContent.replace(/ · image detail$/,'')+(detail?' · image detail':'');
 },true);
 document.addEventListener('error',e=>{
  const img=e.target;if(!img.matches?.('.stories-news-image'))return;
  const figure=img.closest('figure'),credit=figure.querySelector('.stories-photo-credit');
  if(img.dataset.fallback&&img.src!==img.dataset.fallback&&!img.dataset.fallbackUsed){img.dataset.fallbackUsed='true';img.src=img.dataset.fallback;img.alt=img.dataset.fallbackAlt;credit.textContent=`Catalog example · Photo: ${img.dataset.fallbackCredit}`;const source=figure.querySelector('figcaption a');if(source&&img.dataset.fallbackSource)source.href=img.dataset.fallbackSource}
  else{img.hidden=true;figure.classList.add('stories-photo-unavailable');credit.textContent='Image unavailable · Open the original story'}
 },true);
 function newsCard(n){
  const event=n.event_date?`<span>${n.event_date>D.generated?'Planned event':'Release / event'}: ${date(n.event_date)}</span>`:'';
  return `<article class="stories-news-card">${newsImage(n)}<div class="stories-news-copy"><div class="stories-news-meta"><span>${esc(n.type)}</span><time datetime="${esc(n.published)}">${esc(n.date_kind||'Published')} ${date(n.published)}</time></div><h3>${link(n.url,n.title)}</h3><p>${esc(n.summary)}</p><div class="stories-news-tags">${n.retailer_ids.map(id=>`<button data-retailer-story="${esc(id)}">${esc(byId.get(id)?.name||id)}</button>`).join('')}</div><div class="stories-news-source"><span>${esc(n.publisher)} · ${esc(n.market)}</span>${event}<span>Source checked ${date(n.checked)}</span></div></div></article>`;
 }
 function context(r){return `<div class="stories-selected-context"><div><span class="stories-eyebrow">${esc(r.background_basis)}</span><h2>${esc(r.name)}</h2><p>${esc(r.background)}</p><span class="stories-profile-status">${status(r)}</span></div><button class="button outline" data-retailer-story="${esc(r.id)}">Read story & sources</button></div>`}
 function render(){
  const term=search.trim().toLocaleLowerCase();$('storiesPeriod').disabled=tab==='profiles';$('storiesSelected').innerHTML=selected&&byId.has(selected)?context(byId.get(selected)):'';
  let rows;
  if(tab!=='profiles'){
   rows=updates(selected).filter(n=>(tab==='journals'?n.type==='Retailer journal':n.type!=='Retailer journal')).filter(n=>!term||[n.title,n.summary,n.publisher,...n.retailer_ids.map(id=>byId.get(id)?.name)].join(' ').toLocaleLowerCase().includes(term));
   $('storiesHeading').textContent=tab==='journals'?'From the retailers’ journals':'Latest sourced news & releases';$('storiesNote').textContent=tab==='journals'?'Retailer-authored collecting guides, interviews and blog posts. These are shop perspectives, not independent news reports.':'Company announcements, independent reports and retailer-named releases. Publication dates, arrival notes and product launch dates stay separate.';
  }else{
   rows=profiles.filter(r=>(!selected||r.id===selected)&&(!term||[r.name,r.kind,r.market,r.background].join(' ').toLocaleLowerCase().includes(term)));
   $('storiesHeading').textContent='Meet the retailers';$('storiesNote').textContent='All tracked retailers have a profile. Origin stories follow the linked sources; incomplete histories are labeled. Shelf ideas are our suggestions.';
  }
  const size=tab!=='profiles'?10:9,total=Math.max(1,Math.ceil(rows.length/size));page=Math.min(page,total-1);const slice=rows.slice(page*size,(page+1)*size);$('storiesCount').textContent=`${rows.length} ${tab!=='profiles'?'dated updates':'retailer profiles'}`;
  $('storiesResults').className=tab!=='profiles'?'stories-news-list':'stories-profile-grid';
  $('storiesResults').innerHTML=slice.length?(tab!=='profiles'?slice.map(newsCard).join(''):slice.map(r=>`<article class="stories-profile-card"><div class="stories-profile-top"><div><span class="stories-eyebrow">${esc(r.kind)}</span><h3>${esc(r.name)}</h3><span>${esc(r.market)}</span></div><div class="stories-profile-photo">${photo(r)}</div></div><p>${esc(r.background.slice(0,210))}${r.background.length>210?'…':''}</p><span class="stories-profile-status">${status(r)}</span><button class="text-button" data-retailer-story="${esc(r.id)}" aria-label="Read ${esc(r.name)} story">Read story & sources →</button></article>`).join('')):`<div class="stories-empty"><h3>${tab!=='profiles'?'No dated update verified here.':'No retailer matches this search.'}</h3><p>${tab!=='profiles'?'Try the full dated archive, read the retailer’s background, or open its original channels. This does not mean the retailer has no activity.':'Try a shorter name or reset the filters.'}</p><button class="text-button" data-stories-tab="profiles">Browse retailer stories →</button></div>`;
  $('storiesPrev').disabled=page===0;$('storiesNext').disabled=page>=total-1;$('storiesPage').textContent=`Page ${page+1} of ${total}`;
  root.querySelectorAll('[data-stories-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.storiesTab===tab)));
 }
 function openProfile(id){
  const r=byId.get(id);if(!r)return;const ps=products(r),news=updates(id).slice(0,3),key=r.retailer_keys.find(k=>window.ATLAS_RETAIL?.getProduct&&directoryHas(k));
  $('retailerStoryBody').innerHTML=`<span class="stories-eyebrow">${esc(r.kind)} · ${esc(r.market)}</span><h2 id="retailerStoryTitle">${esc(r.name)}</h2><p class="stories-background-label">${esc(r.background_basis)}</p><p>${esc(r.background)}</p><div class="stories-editorial"><strong>A shelf idea · Atlas editorial</strong><p>${esc(r.aisle_idea)}</p></div><div class="stories-profile-sources">${r.background_sources.map(s=>`<p>${link(s.url,s.label)} · reviewed ${date(s.checked)}</p>`).join('')}</div><div class="stories-profile-actions"><button class="button outline" data-stories-profile-news="${esc(id)}">See this retailer’s updates</button>${key?`<button class="button" data-stories-shop="${esc(key)}">Explore products in the aisle builder</button>`:''}</div><h3>Latest dated updates</h3>${news.length?news.map(newsCard).join(''):'<p>No dated update verified in the selected period. Try the full archive or the linked retailer channels.</p>'}<h3>Catalog context · separate from news</h3><p>${ps.length.toLocaleString()} captured blind-box / squishy references in the current atlas snapshot (${date(D.catalog_updated)}). This is a sample, not the retailer’s inventory total.</p>${ps.some(p=>p.image)?`<div class="stories-catalog-examples">${ps.filter(p=>p.image).slice(0,3).map(p=>`<div><img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}"><span>${esc(p.name)}</span></div>`).join('')}</div>`:''}<p class="stories-note">${link(r.background_sources[0].url,'Open retailer / background channel')}</p>`;
  dialog.showModal();dialog.scrollTop=0;
 }
 function directoryHas(key){return Array.from(document.querySelectorAll('#retailSourceRetailer option')).some(o=>o.value===key)}
 function filterRetailer(id){selected=byId.has(id)?id:'';$('storiesRetailer').value=selected;page=0;tab=selected&&!updates(selected).some(n=>n.type!=='Retailer journal')&&updates(selected).some(n=>n.type==='Retailer journal')?'journals':'news';render()}
 root.addEventListener('click',e=>{
  const t=e.target.closest('[data-stories-tab]');if(t){tab=t.dataset.storiesTab;page=0;render();return}
  const r=e.target.closest('[data-retailer-story]');if(r)openProfile(r.dataset.retailerStory);
 });
 dialog.addEventListener('click',e=>{
  const n=e.target.closest('[data-stories-profile-news]');if(n){dialog.close();filterRetailer(n.dataset.storiesProfileNews);$('storiesRetailer').focus();return}
  const p=e.target.closest('[data-stories-shop]');if(p){dialog.close();window.ATLAS_WORKSPACE.show('retail');const select=$('retailSourceRetailer');select.value=p.dataset.storiesShop;select.dispatchEvent(new Event('change',{bubbles:true}));return}
  const r=e.target.closest('[data-retailer-story]');if(r){dialog.close();openProfile(r.dataset.retailerStory)}
 });
 $('storiesFiltersToggle').onclick=()=>{const open=root.dataset.filters!=='open';root.dataset.filters=open?'open':'';$('storiesFiltersToggle').setAttribute('aria-expanded',String(open))};
 $('storiesSearch').addEventListener('input',e=>{search=e.target.value;page=0;render()});$('storiesRetailer').onchange=e=>{selected=e.target.value;page=0;render()};$('storiesPeriod').onchange=e=>{period=e.target.value;page=0;render()};
 $('storiesReset').onclick=()=>{selected='';search='';period='90';page=0;$('storiesSearch').value='';$('storiesRetailer').value='';$('storiesPeriod').value='90';render()};
 for(const [id,step]of [['storiesPrev',-1],['storiesNext',1]])$(id).onclick=()=>{page+=step;render();$('storiesHeading').scrollIntoView({block:'start',behavior:'instant'})};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-stories-open]');if(!b)return;e.preventDefault();const r=retailerForKey(b.classList.contains('stories-workshop-link')?$('retailSourceRetailer').value:b.dataset.storiesOpen);window.ATLAS_WORKSPACE.show('stories');filterRetailer(r?.id||'')});
 const chains=document.querySelector('#workspace-chains .workspace-page-heading');if(chains){const a=document.createElement('a');a.href='#stories';a.dataset.workspace='stories';a.className='text-button stories-section-link';a.textContent='Read retailer stories & news →';chains.append(a)}
 const sourceBar=$('retailSourceForm');if(sourceBar){const a=document.createElement('a');a.href='#stories';a.className='stories-workshop-link';a.dataset.storiesOpen='';a.textContent='Retailer story & news →';(sourceBar.closest('.retail-picker')?.querySelector('.workshop-source-note')||$('retailSourceNote'))?.after(a);const sync=()=>a.dataset.storiesOpen=$('retailSourceRetailer').value;sourceBar.addEventListener('change',sync);document.addEventListener('atlas:workspace-view',sync);sync()}
 render();
 window.ATLAS_RETAILER_NEWS={version:1,profileCount:profiles.length,openRetailer:id=>{window.ATLAS_WORKSPACE.show('stories');filterRetailer(id)}};
}
if(document.readyState==='loading'||document.readyState==='interactive')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
