/* Merchant hypotheses derived from saved catalogue evidence. No Target gap is presumed. */
let activeOpportunity=0;
let opportunityResult=null;
let opportunityVisible=[];
let opportunityExampleLimit=6;
const oppEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oppNumber=n=>Number(n||0).toLocaleString('en-US');
function oppDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s||'')?new Date(s+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Not recorded';}
function oppLink(url,label){try{const u=new URL(url);if(!/^https?:$/.test(u.protocol))return oppEsc(label);return '<a href="'+oppEsc(u.href)+'" target="_blank" rel="noopener noreferrer">'+oppEsc(label)+' ↗</a>';}catch{return oppEsc(label);}}
function showCatalogView(catalog){
 $('executive-view').hidden=catalog;$('catalog-view').hidden=!catalog;
 $('nav-opportunities').setAttribute('aria-pressed',String(!catalog));$('nav-catalog').setAttribute('aria-pressed',String(catalog));
 for(const id of ['analysis-view','compare-view','target-inspiration-view']){const v=$(id);if(v)v.hidden=true;}
 for(const id of ['nav-analysis','nav-target']){const button=$(id);if(button)button.setAttribute('aria-pressed','false');}
 window.HCProductCompare?.hide?.();
}
function opportunityRows(o){
 const ids=[...(o.seedIds||[]),...(o.references||[]).map(r=>r.id),...(o.matchedIds||[])];
 const allowed=new Set(o.matchedIds||[]),seen=new Set();
 return ids.filter(id=>id&&allowed.has(id)&&!seen.has(id)&&seen.add(id)).map(id=>byId.get(id)).filter(Boolean);
}
function opportunityCohorts(o){return o.salesCohorts||window.HCSalesModel.groupRows((o.recordIds||o.matchedIds||[]).map(id=>byId.get(id)).filter(Boolean));}
function renderOpportunitySales(o){
 const target=$('opportunity-sales');if(!target)return;
 const groups=opportunityCohorts(o);
 if(!groups.length){target.innerHTML='<p class="opp-empty">No comparable sourced sales counts are saved for these references. Add dated, item-specific evidence before evaluating demand.</p>';return;}
 target.innerHTML='<label class="opp-field">Compare sales evidence<select id="opportunity-sales-group">'+groups.map(g=>'<option value="'+oppEsc(g.key)+'">'+oppEsc(g.label)+'</option>').join('')+'</select></label><div id="opportunity-sales-leaders"></div>';
 const drawSales=()=>{
  const group=groups.find(g=>g.key===$('opportunity-sales-group').value)||groups[0];
  const ranked=window.HCSalesModel.rankGroup(group).slice(0,3);
  $('opportunity-sales-leaders').innerHTML='<p class="exec-note">Highest saved displayed counts in this comparison group. Rounded badges and unknown-period totals are not audited units or growth.</p><ol class="opp-sales-list">'+ranked.map(r=>'<li><div>'+oppLink(r.metric.itemUrl,r.item.name)+'</div><strong>'+oppEsc(r.metric.display)+'</strong><small>'+oppEsc(r.metric.period)+' · snapshot '+oppDate(r.metric.observedAt)+' · '+oppLink(r.metric.sourceUrl,'Sales source')+'</small></li>').join('')+'</ol>';
 };
 $('opportunity-sales-group').onchange=drawSales;drawSales();
}
function renderOpportunityDetail(){
 const o=opportunityResult.opportunities[activeOpportunity];if(!o)return;
 const c=o.counts,rows=opportunityRows(o),groups=opportunityCohorts(o);
 const checked=o.latestCheckedDate;
 const exact=c.individualItemLinks;
 $('opportunity-detail').innerHTML='<div class="opportunity-panel"><div class="opp-detail-heading"><span class="scope-tag">'+oppEsc(o.scope||o.route||'Home Care')+'</span><span class="priority '+oppEsc((o.priority||'Explore').toLowerCase())+'">'+oppEsc(o.priority||'Explore')+' · research priority</span></div><h2>'+oppEsc(o.title)+'</h2><p class="opp-category">'+oppEsc((o.categories||[]).join(' · '))+'</p><h4>Customer task & opportunity</h4><p>'+oppEsc(o.rationale||o.why)+'</p><div class="concept"><h4>Proposed own-brand concept</h4><p>'+oppEsc(o.concept)+'</p></div><h4>What the saved evidence shows</h4><p>'+oppNumber(c.distinctListings)+' comparison references across '+oppNumber(c.retailers)+' retailer'+(c.retailers===1?'':'s')+'. '+oppNumber(c.sourceBackedSales)+' references have dated, linked sales evidence. '+oppNumber(c.rankableSales)+' eligible metric snapshots appear in '+oppNumber(groups.length)+' separate comparison group'+(groups.length===1?'':'s')+'.</p><p class="exec-note">'+oppEsc(o.evidenceLabel||'Matching catalogue records provide comparison leads; source and offer quality vary.')+'</p><p class="exec-note">Latest saved product check: '+oppDate(checked)+'. '+oppNumber(exact)+' comparison references have individual item links; '+oppNumber(c.broadReferences)+' use broad references and '+oppNumber(c.limitedReferences)+' retain limited-verification notes (overlap possible). Matching does not refresh their sources.</p><h4>Sales evidence to inspect</h4><div id="opportunity-sales"></div><div class="opp-decision"><h4>Next decision for Target</h4><p>'+oppEsc(o.next)+'</p></div><h4>What still needs proving</h4><p>'+oppEsc(o.gapLabel||'Confirm the current Target assortment, differentiated benefit, exact pack economics and product performance before treating this as white space.')+'</p><p class="exec-note">'+oppEsc(o.caveat||'')+'</p><details class="opp-match-rule"><summary>How supporting products are matched</summary><p>'+oppEsc(o.matchRule||'Curated source examples and category-specific format matching.')+'</p></details><p class="exec-note">Target assortment comparison, supplier cost and margin are pending. National brands are benchmarks for a distinct concept, not approved own-brand proposals.</p></div>';
 $('opportunity-example-title').textContent='Supporting products · '+oppNumber(rows.length)+' matching records';
 $('opportunity-example-note').textContent='Retained examples appear first, followed by additional matched catalogue references. Counts may overlap between ideas. Prices and sales keep their original dates and source limitations.';
 const shown=rows.slice(0,opportunityExampleLimit);
 $('opportunity-products').replaceChildren(...shown.map(d=>{
  const card=document.createElement('article');card.className='exec-product';card.dataset.itemId=d.id;
  const original=cached.get(d.id),photo=original?.querySelector('img')?.getAttribute('src')||d.image||'';
  const metric=window.HCSalesModel.parseMetric(d);
  const reference=(o.references||[]).find(r=>r.id===d.id),source=metric?.itemUrl||reference?.url||d.url;
  card.innerHTML='<img loading="lazy" decoding="async" src="'+oppEsc(photo)+'" alt="'+oppEsc(d.name)+'"><div class="exec-product-body"><div class="card-meta">'+oppEsc(d.retailer)+(d.brand?' · '+oppEsc(d.brand):'')+'</div><h3>'+oppEsc(d.name)+'</h3><p class="exec-price">'+oppEsc(d.displayPrice||'Price not verified')+'</p><p class="exec-note">Saved offer / pack snapshot · check source</p><p>'+(metric?'<strong>'+oppEsc(metric.display)+'</strong><br><span class="exec-note">'+oppEsc(metric.period)+' · recorded '+oppDate(metric.observedAt)+(metric.kind==='tracker'?' · third-party tracker':'')+'</span>':'No sourced sales count available')+'</p><p class="exec-note">'+oppEsc(d.evidenceLevel||'Evidence status not recorded')+' · checked '+oppDate(d.checkedDate)+'</p>'+(reference&&!reference.matchesCriteria?'<p class="exec-note">Retained comparison example; format match needs confirmation.</p>':'')+'<details><summary>Sources & evidence notes</summary><p>'+oppLink(source,'Exact item / retailer reference')+'</p>'+(metric?'<p>'+oppLink(metric.sourceUrl,'Sales evidence')+'</p>':'')+'<p>'+oppLink(d.photoSource,'Photo source')+'</p><p>'+oppEsc(d.verificationNote||d.evidence||'Current offer and availability need checking.')+'</p><p>'+oppEsc(d.priceBasis||'Saved price; check exact pack and seller at source.')+'</p><p>'+(d.retailerListedDate?'Retailer first available: '+oppLink(d.retailerDateSource,oppDate(d.retailerListedDate)):'Retailer listing date: Not verified')+'</p></details><div class="exec-actions">'+oppLink(source,'View source')+'<button type="button" class="exec-select" data-exec-select="'+oppEsc(d.id)+'" aria-pressed="'+picks.has(d.id)+'">'+(picks.has(d.id)?'Selected ✓':'Select')+'</button><button type="button" data-exec-item="'+oppEsc(d.id)+'">Catalog details</button></div></div>';
  return card;
 }));
 $('opportunity-more').hidden=rows.length<=shown.length;
 $('opportunity-more').textContent='Show 12 more supporting products ('+oppNumber(shown.length)+' of '+oppNumber(rows.length)+')';
 $('opportunity-product-empty').hidden=rows.length>0;
 renderOpportunitySales(o);
}
function renderOpportunities(recalculate=false){
 if(!window.HCOpportunityModel)return;
 if(!opportunityResult||recalculate){const retailer=$('opportunity-retailer').value;opportunityResult=window.HCOpportunityModel.analyze(retailer==='all'?ITEMS:ITEMS.filter(d=>d.retailer===retailer),{analyzedAt:'2026-11-03'});}
 const query=$('opportunity-search').value.trim().toLowerCase(),cat=$('opportunity-category').value;
 opportunityVisible=opportunityResult.opportunities.map((o,i)=>({o,i})).filter(({o})=>(cat==='all'||(o.categories||[]).includes(cat))&&(!query||[o.title,o.rationale,o.concept,...(o.categories||[])].join(' ').toLowerCase().includes(query)));
 if(!opportunityVisible.some(x=>x.i===activeOpportunity)){activeOpportunity=opportunityVisible[0]?.i??-1;opportunityExampleLimit=6;}
 const unique=new Set(opportunityVisible.flatMap(({o})=>o.matchedIds||[])),supported=opportunityVisible.filter(({o})=>o.counts.distinctListings>0).length;
 $('opportunity-stats').innerHTML='<div><strong>'+opportunityVisible.length+'</strong><span>Candidate directions</span></div><div><strong>'+supported+'</strong><span>With saved references</span></div><div><strong>'+oppNumber(unique.size)+'</strong><span>Matching catalog records</span></div><div><strong>'+new Set([...unique].map(id=>byId.get(id)?.retailer).filter(Boolean)).size+'</strong><span>Retailers represented</span></div>';
 $('opportunity-rows').innerHTML=opportunityVisible.map(({o,i})=>'<tr class="'+(i===activeOpportunity?'active-row':'')+'"><td>'+(i+1)+'</td><td><button type="button" data-opportunity="'+i+'" aria-pressed="'+(i===activeOpportunity)+'">'+oppEsc(o.title)+'</button><small>'+oppNumber(o.counts.distinctListings)+' references · '+o.counts.retailers+' retailers'+(/adjacent/i.test(o.scope||'')?' · adjacent':'')+'</small></td><td><span class="priority '+oppEsc((o.priority||'Explore').toLowerCase())+'">'+oppEsc(o.priority||'Explore')+'</span></td></tr>').join('');
 const max=Math.max(1,...opportunityVisible.map(({o})=>o.counts.distinctListings));
 $('opportunity-evidence-chart').innerHTML=opportunityVisible.map(({o,i})=>'<button type="button" class="opp-bar-row" data-opportunity="'+i+'" aria-pressed="'+(i===activeOpportunity)+'"><span class="opp-bar-label">'+oppEsc(o.title)+'</span><span class="opp-bar-track"><span class="opp-bar-fill" style="width:'+Math.round(o.counts.distinctListings/max*10000)/100+'%"></span></span><span class="opp-bar-value">'+oppNumber(o.counts.distinctListings)+'</span></button>').join('');
 $('opportunity-empty').hidden=opportunityVisible.length>0;
 $('opportunity-layout').hidden=!opportunityVisible.length;
 $('opportunity-examples').hidden=!opportunityVisible.length;
 if(opportunityVisible.length)renderOpportunityDetail();
}
function setupOpportunities(){
 const definitions=window.HCOpportunityModel?.definitions||[],categories=[...new Set(definitions.flatMap(o=>o.categories||[]))].sort();
 const retailers=[...new Set(ITEMS.map(d=>d.retailer))].sort();
 $('executive-view').innerHTML='<div class="exec-intro"><p class="eyebrow">MERCHANT RESEARCH · CANDIDATE WHITE SPACE</p><h2 id="executive-title">From competitor evidence to the next concept</h2><p>Explore product needs, sales signals and proposed own-brand directions for Target.</p></div><p class="opp-review">Analysis expanded 3 November 2026 · Product evidence retains its original checked dates. The previous seven-area source review was completed 2 November.</p><div class="opp-framing"><strong>A growing research pipeline</strong><p>The seven original priorities are retained, with additional directions supported by catalogue matches. These are candidate opportunities; a current Target assortment comparison is needed to establish a gap.</p></div><div class="opp-controls"><label class="opp-field">Competitor<select id="opportunity-retailer"><option value="all">All competitors</option>'+retailers.map(r=>'<option>'+oppEsc(r)+'</option>').join('')+'</select></label><label class="opp-field">Category<select id="opportunity-category"><option value="all">All opportunity categories</option>'+categories.map(c=>'<option>'+oppEsc(c)+'</option>').join('')+'</select></label><label class="opp-field">Find a direction<input id="opportunity-search" type="search" placeholder="Refills, odor, kitchen…"></label></div><div id="opportunity-stats" class="opp-stats" aria-live="polite"></div><details class="opp-evidence-overview"><summary>Chart: comparison evidence behind each direction</summary><p class="exec-note">Distinct saved listing references within each idea. Themes can overlap; retailer coverage is uneven. Bar size measures research coverage, not demand, opportunity size or confidence. Select a bar to inspect the idea.</p><div id="opportunity-evidence-chart"></div></details><p id="opportunity-empty" class="opp-empty" hidden>No directions match this category or search. Clear the search or choose another category.</p><div id="opportunity-layout" class="exec-layout"><div class="exec-rank"><div class="opp-rank-heading"><h3>Opportunity pipeline</h3><p>Original priorities, then new directions to explore</p></div><div class="opp-rank-scroll"><table><thead><tr><th>#</th><th>Direction & evidence</th><th>Priority</th></tr></thead><tbody id="opportunity-rows"></tbody></table></div><p class="exec-note">The first seven retain the requested order. Priorities are research judgments; reference counts do not determine the order.</p></div><section id="opportunity-detail" aria-live="polite"></section></div><section id="opportunity-examples"><h2 id="opportunity-example-title" class="exec-products-title">Supporting products</h2><p id="opportunity-example-note" class="exec-note"></p><p id="opportunity-product-empty" class="opp-empty" hidden>No matching references from this competitor are collected for this direction yet. This is a research gap, not proof of an assortment gap.</p><div id="opportunity-products" class="exec-products"></div><button type="button" id="opportunity-more" class="opp-more">Show more supporting products</button></section><details class="score-method"><summary>How to turn a hypothesis into a merchant proposal</summary><p>1. Check the current Target assortment and exact competing pack. 2. Establish the differentiated customer benefit and price architecture. 3. Check supplier capability, landed cost, margin, testing and claims. 4. Agree merchant ownership, then validate demand through an appropriate test. No numerical opportunity score is assigned before that evidence is available.</p><p>Matching rules use category and product-name evidence, with retained curated examples. New records automatically expand the comparison set; new concepts and rule changes still require a merchant research review. Missing sales remain unknown. Prices are unnormalized saved offers. Matching counts are neither unique market SKUs nor market share.</p></details>';
 $('nav-opportunities').textContent='White-space opportunities';
 $('opportunity-retailer').onchange=()=>{opportunityExampleLimit=6;renderOpportunities(true);};
 $('opportunity-category').onchange=()=>{opportunityExampleLimit=6;renderOpportunities();};
 $('opportunity-search').oninput=()=>{opportunityExampleLimit=6;renderOpportunities();};
 const choose=e=>{const b=e.target.closest('[data-opportunity]');if(!b)return;activeOpportunity=Number(b.dataset.opportunity);opportunityExampleLimit=6;renderOpportunities();};
 $('opportunity-rows').onclick=choose;$('opportunity-evidence-chart').onclick=choose;
 $('opportunity-more').onclick=()=>{opportunityExampleLimit+=12;renderOpportunityDetail();};
 $('opportunity-products').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.execSelect){const id=b.dataset.execSelect;picks.has(id)?picks.delete(id):picks.add(id);try{localStorage.setItem('hc-merchant-picks',JSON.stringify([...picks]))}catch{}draw();renderOpportunityDetail();}if(b.dataset.execItem){const d=byId.get(b.dataset.execItem);if(!d)return;reset('all','all');$('search').value=d.name;draw();showCatalogView(true);$('status').scrollIntoView({block:'start'});}};
 $('nav-opportunities').onclick=()=>{showCatalogView(false);renderOpportunities();};
 $('nav-catalog').onclick=()=>showCatalogView(true);
 renderOpportunities(true);showCatalogView(true);
}
setupOpportunities();
