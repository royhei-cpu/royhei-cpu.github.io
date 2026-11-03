(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let context = null, data = null, view = null, nav = null, rendered = false;
  let benchmarks = [], benchmarkIds = new Set(), travelReferences = [], travelReferenceIds = new Set();
  let filters={query:'',scale:'all',platform:'all',priority:'all'};
  const expandedIdeas=new Set();

  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value.trim(),window.location.href);
      return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch (_) { return ''; }
  }
  function dateLabel(value) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value || ''))return 'Not recorded';
    const d=new Date(value+'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value ? d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : 'Not recorded';
  }
  function link(value,label) {
    const url=safeUrl(value);
    return url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>':'';
  }
  function benchmarkId(tcin) { return /^\d{6,12}$/.test(String(tcin))?'TARGET-OPENSTORY-'+String(tcin):''; }
  function photoFor(item) {
    const value=context.cached?.get(item.id)?.querySelector('img')?.getAttribute('src') || item.image || item.originalImage || '';
    if(/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(value))return value;
    return safeUrl(value);
  }
  function pickButton(id) {
    const selected=context.picks.has(id);
    return '<button type="button" class="ti-select" data-ti-select="'+esc(id)+'" aria-pressed="'+selected+'">'+(selected?'Selected ✓':'Select')+'</button>';
  }

  function registerBenchmarks() {
    benchmarks=[];benchmarkIds=new Set();
    for(const benchmark of data.benchmarks || []) {
      const id=benchmarkId(benchmark.tcin),url=safeUrl(benchmark.url || benchmark.listingSource);
      if(!id || !url)continue;
      const features=(benchmark.features || []).map(value=>typeof value==='string'?value:String(value.label || '')).filter(Boolean);
      const checkedDate=benchmark.sourceCheckedAt || benchmark.checkedAt || data.reviewedAt || data.checkedAt || '';
      const priceObservedAt=benchmark.priceObservedAt || '';
      const priceNote=String(benchmark.priceNote || 'Price from the cited Target source snapshot; confirm the selected variant, current offer and stock.');
      const image=safeUrl(benchmark.image);
      const record={
        ...benchmark,
        id,retailer:benchmark.retailer || 'Target',brand:'Open Story',name:String(benchmark.name || 'Open Story benchmark '+benchmark.tcin),
        category:benchmark.category || 'Travel Accessories',categoryLabel:benchmark.categoryLabel || benchmark.category || 'Travel / Open Story benchmark',merchantScope:'Target travel benchmark',merchantDepartment:benchmark.merchantDepartment || 'Travel',
        type:benchmark.type || 'Target private brand benchmark',url,listingSource:url,currentSource:url,image,originalImage:safeUrl(benchmark.originalImage || benchmark.imageSourceUrl || benchmark.imageSource) || image,
        displayPrice:String(benchmark.displayPrice || ''),price:String(benchmark.displayPrice || ''),
        priceBasis:(priceObservedAt?'Source retrieved: '+dateLabel(priceObservedAt)+'. ':'')+String(benchmark.priceBasis || priceNote),
        priceObservedAt,checkedDate,verificationStatus:'Official Target benchmark',evidenceLevel:'Individual item link',
        hasSales:false,displaySales:'',salesPeriod:'',metricDate:'',metricSource:'',salesEvidenceKind:'',salesVerifiedThisPass:false,
        photoSource:safeUrl(benchmark.photoSource) || url,photoVerification:String(benchmark.photoVerification || benchmark.imageNote || benchmark.photoNote || 'Official Target product-page image; verify the selected variant at source.'),
        verificationNote:String(benchmark.verificationNote || benchmark.sourceNote || 'Official Target product reference. Current price, variant and stock require confirmation.'),
        evidence:features.join('; ')+(benchmark.sourceFreshness?'. '+benchmark.sourceFreshness:''),packSize:String(benchmark.pack || benchmark.packSize || ''),
        retailerListedDate:'',retailerListedStatus:'Retailer listing date not verified',retailerDateSource:'',
        datePosted:data.reviewedAt || data.checkedAt || '',catalogDateBasis:'Target benchmark added for comparative research; not the retailer launch date',
        merchantScopeBasis:'Official Target travel benchmark, separate from competitor Home Care research',
        targetReviewRoute:'Open Story / Travel merchant review',
        targetBenchmarkContext:'Already offered by Open Story; feature benchmark, not a confirmed Target assortment gap',
        targetBenchmark:true,targetTcin:String(benchmark.tcin),targetFeatures:features
      };
      context.byId.set(id,record);
      benchmarkIds.add(id);benchmarks.push({...benchmark,id,record,features});
    }
  }

  function registerTravelReferences() {
    travelReferences=[];travelReferenceIds=new Set();
    for(const reference of data.competitorReferences || []) {
      const id=String(reference.id || ''),url=safeUrl(reference.url || reference.listingSource);
      if(!/^TRAVEL-[A-Za-z0-9_-]+$/.test(id) || !reference.name || !url)continue;
      const checkedDate=reference.checkedDate || reference.sourceCheckedAt || reference.checkedAt || '';
      const image=safeUrl(reference.image || reference.originalImage);
      const record={
        ...reference,id,name:String(reference.name),retailer:String(reference.retailer || reference.brand || 'Travel reference'),brand:String(reference.brand || ''),
        category:reference.category || 'Travel products',categoryLabel:reference.categoryLabel || reference.category || 'Travel products',
        merchantScope:'Travel inspiration reference',merchantDepartment:reference.merchantDepartment || 'Luggage & Travel',
        merchantScopeBasis:'Separate travel product research for comparison with Open Story',type:reference.type || 'Travel brand reference',
        targetReviewRoute:'Open Story / Travel merchant review',url,listingSource:safeUrl(reference.listingSource) || url,currentSource:safeUrl(reference.currentSource) || url,
        image,originalImage:safeUrl(reference.originalImage || reference.imageSourceUrl || reference.imageSource) || image,
        displayPrice:String(reference.displayPrice || ''),price:String(reference.displayPrice || reference.price || ''),
        priceBasis:String(reference.priceBasis || 'Saved source price; confirm pack, currency, variant, offer and current checkout price.'),
        checkedDate,verificationStatus:reference.verificationStatus || 'Travel reference from saved research',evidenceLevel:reference.evidenceLevel || 'Travel product reference',
        verificationNote:reference.verificationNote || reference.sourceNote || 'Source details are retained from the cited research; current availability is not established.',
        photoSource:safeUrl(reference.photoSource) || url,photoVerification:reference.photoVerification || 'Source product image; check exact variant at the linked source.',
        hasSales:false,displaySales:'',salesPeriod:'',metricDate:'',metricSource:'',salesEvidenceKind:'',salesVerifiedThisPass:false,
        retailerListedDate:reference.retailerListedDate || '',retailerListedStatus:reference.retailerListedStatus || 'Retailer listing date not verified',
        datePosted:reference.datePosted || data.reviewedAt || '',catalogDateBasis:reference.catalogDateBasis || 'Travel reference registered for comparative research; not a product launch date',
        travelInspirationReference:true
      };
      context.byId.set(id,record);travelReferenceIds.add(id);travelReferences.push(record);
    }
  }

  function restoreReferenceSelections() {
    // The base app restores its own catalogue IDs before these separate references exist.
    // Only recognized Target/TRAVEL IDs are added; existing competitor picks are preserved.
    const registered=new Set([...benchmarkIds,...travelReferenceIds]);
    try {
      const stored=JSON.parse(localStorage.getItem('hc-merchant-picks') || '[]');
      if(Array.isArray(stored))for(const id of stored)if(registered.has(id) && context.byId.has(id))context.picks.add(id);
    } catch (_) { }
  }

  function productCard(item,tag,comparison) {
    const image=photoFor(item);
    const features=Array.isArray(item.features)?item.features.filter(value=>typeof value==='string'):[];
    return '<article class="ti-reference-card"><div class="ti-reference-photo">'+(image?'<img loading="lazy" decoding="async" src="'+esc(image)+'" alt="'+esc(item.name)+'">':'<span class="ti-no-photo">Photo not available</span>')+'</div><div class="ti-reference-body"><span class="ti-reference-tag">'+esc(tag)+'</span><h6>'+esc(item.name)+'</h6><p class="ti-reference-meta">'+esc(item.retailer)+(item.brand?' · '+esc(item.brand):'')+'</p><p class="ti-reference-price">'+esc(item.displayPrice || 'Price not recorded')+'<small>Saved price snapshot</small></p><p class="ti-reference-meta">Saved source checked: '+dateLabel(item.checkedDate)+'</p>'+(item.priceBasis?'<p class="ti-reference-limit">'+esc(item.priceBasis)+'</p>':'')+(comparison?.featureToLearn?'<p class="ti-reference-learning"><strong>Feature to learn:</strong> '+esc(comparison.featureToLearn)+'</p>':features.length?'<p class="ti-reference-learning">'+esc(features.join(' · '))+'</p>':'')+(comparison?.limitation?'<p class="ti-reference-limit"><strong>Reference limit:</strong> '+esc(comparison.limitation)+'</p>':'')+(item.limitations?'<p class="ti-reference-limit"><strong>Performance boundary:</strong> '+esc(item.limitations)+'</p>':'')+(item.sourceFreshness?'<p class="ti-reference-limit">'+esc(item.sourceFreshness)+'</p>':'')+'<div class="ti-reference-actions">'+link(item.url,'View source')+pickButton(item.id)+'</div></div></article>';
  }

  function recommendationIds(recommendation) {
    const competitors=(recommendation.competitorIds || []).filter(id=>context.byId.has(id));
    const targets=(recommendation.benchmarkTcins || []).map(benchmarkId).filter(id=>benchmarkIds.has(id));
    return [...new Set([...competitors,...targets])];
  }

  function recommendations() { return Array.isArray(data.recommendations)?data.recommendations:[]; }
  function scaleOf(recommendation) { return String(recommendation.scale || 'Direction to classify'); }
  function platformOf(recommendation) { return String(recommendation.platform || 'Travel organization'); }
  function priorityOf(recommendation) { return String(recommendation.priority || 'Merchant review'); }
  function scaleLabel(scale) {
    return scale==='Major product platform'?'Major product platforms':scale==='Accessory enhancement'?'Accessory enhancements':scale;
  }
  function unique(values) { return [...new Set(values.filter(Boolean))]; }
  function optionList(values,allLabel,selected) {
    return '<option value="all">'+esc(allLabel)+'</option>'+values.map(value=>'<option value="'+esc(value)+'"'+(value===selected?' selected':'')+'>'+esc(value)+'</option>').join('');
  }
  function ideaKey(recommendation,index) { return String(recommendation.id || 'direction-'+index); }

  function matchedDirections() {
    const query=filters.query.trim().toLocaleLowerCase();
    return recommendations().map((recommendation,index)=>({recommendation,index})).filter(({recommendation})=>{
      if(filters.scale!=='all' && scaleOf(recommendation)!==filters.scale)return false;
      if(filters.platform!=='all' && platformOf(recommendation)!==filters.platform)return false;
      if(filters.priority!=='all' && priorityOf(recommendation)!==filters.priority)return false;
      if(!query)return true;
      const productText=recommendationIds(recommendation).map(id=>{
        const item=context.byId.get(id);return item?[item.name,item.brand,item.category].join(' '):'';
      }).join(' ');
      const text=[recommendation.title,recommendation.travelerJob,recommendation.platform,recommendation.priority,recommendation.scale,recommendation.fit,recommendation.targetBaseline,recommendation.featureToAdapt,recommendation.whyFit,recommendation.concept,recommendation.priceArchitecture,productText].filter(Boolean).join(' ').toLocaleLowerCase();
      return query.split(/\s+/).every(term=>text.includes(term));
    });
  }

  function benchmarkCard(benchmark) {
    const item=benchmark.record,image=photoFor(item);
    return `<article class="ti-benchmark">
      <div class="ti-benchmark-photo">${image?'<img loading="lazy" decoding="async" src="'+esc(image)+'" alt="'+esc(item.name)+'">':'<span class="ti-no-photo">Photo not available</span>'}<span>Already offered · source record</span></div>
      <div class="ti-benchmark-body"><p class="ti-tcin">Open Story · TCIN ${esc(benchmark.tcin)}</p><h4>${esc(item.name)}</h4>
      <p class="ti-benchmark-price">${esc(item.displayPrice || 'Price not recorded')}<small>Source snapshot</small></p>
      <ul>${benchmark.features.map(feature=>'<li>'+esc(feature)+'</li>').join('')}</ul>
      ${benchmark.limitations?'<p class="ti-performance-note"><strong>Performance boundary</strong>'+esc(benchmark.limitations)+'</p>':''}
      <p class="ti-price-note">${esc(item.priceBasis)}</p>
      <p class="ti-source-note">${esc(benchmark.sourceNote || item.verificationNote)}${benchmark.sourceFreshness?'<br>'+esc(benchmark.sourceFreshness):''}</p>
      <div class="ti-benchmark-actions">${link(item.url,'Official Target listing')}${pickButton(item.id)}</div></div>
    </article>`;
  }

  function renderIdea(recommendation,index) {
    const ids=recommendationIds(recommendation),competitorIds=unique((recommendation.competitorIds || []).filter(id=>context.byId.has(id)));
    const targetIds=unique((recommendation.benchmarkTcins || []).map(benchmarkId).filter(id=>benchmarkIds.has(id)));
    const chosen=ids.length>0 && ids.every(id=>context.picks.has(id));
    const sources=(recommendation.sources || []).map(source=>link(source.url,source.label || 'Source')).filter(Boolean);
    const key=ideaKey(recommendation,index),hero=context.byId.get(targetIds[0] || competitorIds[0]),image=hero?photoFor(hero):'';
    const travelerJob=recommendation.travelerJob || recommendation.fit || '';
    const comparison=id=>(recommendation.comparisons || []).find(entry=>entry.id===id);
    return `<article class="ti-idea${scaleOf(recommendation)==='Major product platform'?' ti-idea-major':''}" id="target-idea-${index}" data-ti-idea="${esc(key)}">
      <div class="ti-idea-heading">
        ${image?'<div class="ti-idea-photo"><img loading="lazy" decoding="async" src="'+esc(image)+'" alt="'+esc(hero.name)+'"><span>'+esc(benchmarkIds.has(hero.id)?'Target baseline':'Competitor reference')+'</span></div>':''}
        <div class="ti-idea-title"><div class="ti-idea-labels"><span>${esc(scaleOf(recommendation))}</span><span class="ti-priority">${esc(priorityOf(recommendation))}</span></div><h4>${esc(recommendation.title)}</h4>${travelerJob?'<p class="ti-traveler-job"><strong>Traveler need</strong> '+esc(travelerJob)+'</p>':''}</div>
      </div>
      <div class="ti-feature-comparison"><div><h5>Open Story baseline</h5><p>${esc(recommendation.targetBaseline)}</p></div><div class="ti-adaptation"><h5>What to improve or extend</h5><p>${esc(recommendation.featureToAdapt)}</p></div></div>
      ${recommendation.priceArchitecture?'<div class="ti-price-architecture"><strong>Price architecture from saved sources</strong><p>'+esc(recommendation.priceArchitecture)+'</p></div>':''}
      <div class="ti-idea-actions"><button type="button" class="ti-select-set" data-ti-set="${index}" aria-pressed="${chosen}" ${!ids.length?'disabled':''}>${chosen?'Reference set selected ✓':'Select this comparison set'}</button><span>${ids.length} available product references · shared compare &amp; CSV</span></div>
      <details class="ti-idea-details" data-ti-details="${esc(key)}" ${expandedIdeas.has(key)?'open':''}><summary>Explore concept, product evidence &amp; validation</summary><div class="ti-idea-detail-body">
        <div class="ti-idea-summary"><div><h5>Why it could fit Target</h5><p>${esc(recommendation.whyFit)}</p></div><div class="ti-concept"><h5>Differentiated concept to explore</h5><p>${esc(recommendation.concept)}</p></div></div>
        ${recommendation.priorityBasis?'<p class="ti-priority-basis"><strong>Review priority rationale:</strong> '+esc(recommendation.priorityBasis)+'</p>':''}
        ${recommendation.fit?'<p class="ti-fit"><strong>Fit assessment:</strong> '+esc(recommendation.fit)+'</p>':''}
        <div class="ti-reference-groups"><div><h5>Competitor product evidence</h5><div class="ti-reference-stack">${competitorIds.length?competitorIds.map(id=>productCard(context.byId.get(id),travelReferenceIds.has(id)?'Travel research reference':'Saved Home Care reference',comparison(id))).join(''):'<p class="ti-empty">The referenced competitor product is unavailable in this catalogue version.</p>'}</div></div><div><h5>Open Story comparison baseline</h5><div class="ti-reference-stack">${targetIds.length?targetIds.map(id=>productCard(context.byId.get(id),'Target benchmark')).join(''):'<p class="ti-empty">No benchmark reference attached.</p>'}</div></div></div>
        <div class="ti-validation"><h5>Validate before a merchant proposal</h5><ul>${(recommendation.validation || []).map(value=>'<li>'+esc(value)+'</li>').join('')}</ul></div>
        ${sources.length?'<div class="ti-sources">'+sources.join('')+'</div>':''}
      </div></details>
    </article>`;
  }

  function syncFilterControls() {
    if(!rendered)return;
    view.querySelectorAll('[data-ti-filter-scale]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tiFilterScale===filters.scale)));
    const query=$('target-direction-search'),platform=$('target-platform-filter'),priority=$('target-priority-filter');
    if(query && query.value!==filters.query)query.value=filters.query;
    if(platform)platform.value=filters.platform;
    if(priority)priority.value=filters.priority;
    $('target-direction-reset').disabled=!filters.query && filters.scale==='all' && filters.platform==='all' && filters.priority==='all';
  }

  function renderDirections() {
    const results=$('target-directions');if(!results)return;
    const matches=matchedDirections(),scales=unique(['Major product platform','Accessory enhancement',...matches.map(({recommendation})=>scaleOf(recommendation))]);
    const groups=scales.map(scale=>({scale,rows:matches.filter(({recommendation})=>scaleOf(recommendation)===scale)})).filter(group=>group.rows.length);
    results.innerHTML=groups.map(group=>{
      const platforms=unique(group.rows.map(({recommendation})=>platformOf(recommendation)));
      return '<section class="ti-scale-group" data-ti-group="'+esc(group.scale)+'"><div class="ti-scale-heading"><h4>'+esc(scaleLabel(group.scale))+'</h4><span>'+group.rows.length+' direction'+(group.rows.length===1?'':'s')+'</span></div>'+platforms.map(platform=>'<div class="ti-platform-group" data-ti-platform="'+esc(platform)+'"><div class="ti-platform-heading">'+esc(platform)+'</div>'+group.rows.filter(({recommendation})=>platformOf(recommendation)===platform).map(({recommendation,index})=>renderIdea(recommendation,index)).join('')+'</div>').join('')+'</section>';
    }).join('') || '<div class="ti-empty-results"><h4>No directions match these filters</h4><p>Try a broader search or use Reset filters to see all research directions.</p></div>';
    const major=matches.filter(({recommendation})=>scaleOf(recommendation)==='Major product platform').length;
    const accessory=matches.filter(({recommendation})=>scaleOf(recommendation)==='Accessory enhancement').length;
    $('target-direction-status').textContent='Showing '+matches.length+' of '+recommendations().length+' directions · '+major+' major product direction'+(major===1?'':'s')+' · '+accessory+' accessory enhancement'+(accessory===1?'':'s')+'.';
    syncFilterControls();syncSelections();
  }

  function render() {
    const brand=data.brand || {},reviewedAt=data.reviewedAt || data.checkedAt || '',rows=recommendations();
    const brandSource=brand.sourceUrl || brand.url || '';
    const major=rows.filter(row=>scaleOf(row)==='Major product platform').length,accessory=rows.filter(row=>scaleOf(row)==='Accessory enhancement').length;
    const scales=unique(['Major product platform','Accessory enhancement',...rows.map(scaleOf)]).filter(scale=>rows.some(row=>scaleOf(row)===scale));
    const platforms=unique(rows.map(platformOf)).sort((a,b)=>a.localeCompare(b)),priorities=unique(rows.map(priorityOf));
    view.innerHTML=`<div class="ti-intro"><div><p class="ti-kicker">TARGET MERCHANT INSPIRATION</p><h2 id="target-inspiration-title">Bigger travel opportunities for Open Story</h2><p>${esc(brand.description || 'Build differentiated luggage, bags and travel systems from Open Story’s established product baseline.')} ${link(brandSource,'Official brand reference')}</p></div><span class="ti-brand-mark">Open Story<br><small>Travel product research</small></span></div>
      <div class="ti-portfolio-summary"><div><strong>${major}</strong><span>major product directions</span></div><div><strong>${accessory}</strong><span>accessory enhancements</span></div><div><strong>${benchmarks.length}</strong><span>Target baseline products</span></div><div><strong>${travelReferences.length}</strong><span>additional travel references</span></div></div>
      <div class="ti-context-note"><strong>Start with the full product platform.</strong><p>Explore luggage, bags and travel systems before the smaller accessory enhancements. Each direction builds on cited Open Story products and competitor features. These are hypotheses for merchant validation; the research does not establish a complete Target assortment gap or current stock.</p></div>
      <div class="ti-toolbar"><p id="target-inspiration-selection" aria-live="polite"></p><div><button type="button" id="target-inspiration-compare">Compare selected</button><button type="button" id="target-inspiration-export">Export selected CSV</button></div></div>
      <section class="ti-recommendations" aria-labelledby="target-ideas-title"><div class="ti-section-heading"><div><p class="ti-kicker">PRODUCT PLATFORMS &amp; FEATURE IMPROVEMENTS</p><h3 id="target-ideas-title">Directions for merchant review</h3><p>Research reviewed ${dateLabel(reviewedAt)}. Priority is an editorial assessment of fit and product scope; commercial demand still needs validation.</p></div><span>${rows.length} research directions</span></div>
        <form class="ti-filters" id="target-direction-filters" role="search"><div class="ti-filter-fields"><label class="ti-search-label" for="target-direction-search">Search directions and products<input type="search" id="target-direction-search" placeholder="Try carry-on, laundry, backpack…" autocomplete="off" value="${esc(filters.query)}"></label><label for="target-platform-filter">Product platform<select id="target-platform-filter">${optionList(platforms,'All platforms',filters.platform)}</select></label><label for="target-priority-filter">Review priority<select id="target-priority-filter">${optionList(priorities,'All priorities',filters.priority)}</select></label><button type="button" id="target-direction-reset">Reset filters</button></div>
        <fieldset class="ti-scale-filters"><legend>Product scope</legend><button type="button" data-ti-filter-scale="all" aria-pressed="${filters.scale==='all'}">All directions <span>${rows.length}</span></button>${scales.map(scale=>'<button type="button" data-ti-filter-scale="'+esc(scale)+'" aria-pressed="'+(filters.scale===scale)+'">'+esc(scaleLabel(scale))+' <span>'+rows.filter(row=>scaleOf(row)===scale).length+'</span></button>').join('')}</fieldset></form>
        <p class="ti-filter-status" id="target-direction-status" role="status" aria-live="polite"></p><div id="target-directions"></div>
      </section>
      <details class="ti-library" id="target-benchmark-library"><summary><span class="ti-library-title">Open Story baseline products</span><span>${benchmarks.length} official Target references</span></summary><div class="ti-library-body"><p class="ti-library-note">Already offered in the cited product records. Prices retain their source-snapshot and variant caveats; verify current checkout and inventory with Target.</p><div class="ti-benchmark-grid">${benchmarks.map(benchmarkCard).join('')}</div></div></details>
      ${travelReferences.length?'<details class="ti-library" id="target-travel-reference-library"><summary><span class="ti-library-title">Travel competitor reference library</span><span>'+travelReferences.length+' saved product references</span></summary><div class="ti-library-body"><p class="ti-library-note">These travel references support Open Story comparisons. They are separate from the Home Care catalogue and its sales charts. Their original source dates and price caveats are retained.</p><div class="ti-travel-reference-grid">'+travelReferences.map(item=>productCard(item,'Travel research reference')).join('')+'</div></div></details>':''}
      <div class="ti-brand-routing"><div><h3>Keep the travel use clear</h3><p>${esc(brand.weakFit || '')}</p></div><div><h3>Route household formulas to the right brief</h3><p>${esc(brand.homeCareRouting || '')} ${link(brandSource,'Target brand positioning')}</p></div></div>
      <details class="ti-method-note"><summary>Research approach and export notes</summary>${(data.methodology || []).map(value=>'<p>'+esc(value)+'</p>').join('')}<p>Use Select to place Target benchmarks, travel references and Home Care products in one comparison. CSV includes product-photo URLs and source links; image files are not embedded in CSV. Price architecture uses saved product offers with different packs, variants and source dates; proposed Target retail prices and revenue forecasts have not been calculated.</p></details>`;
    rendered=true;renderDirections();
  }

  function persist() {
    try{localStorage.setItem('hc-merchant-picks',JSON.stringify([...context.picks]));}catch(_){ }
    if(typeof context.redraw==='function')context.redraw();
    document.dispatchEvent(new CustomEvent('hc-selection-change',{detail:{selectedCount:context.picks.size}}));
    window.HCProductCompare?.refresh?.();
    window.HCMerchantAnalytics?.syncSelections?.();
    syncSelections();
  }

  function syncSelections() {
    if(!view || !context || !rendered)return;
    view.querySelectorAll('[data-ti-select]').forEach(button=>{
      const selected=context.picks.has(button.dataset.tiSelect);
      button.setAttribute('aria-pressed',String(selected));button.textContent=selected?'Selected ✓':'Select';
    });
    view.querySelectorAll('[data-ti-set]').forEach(button=>{
      const ids=recommendationIds((data.recommendations || [])[Number(button.dataset.tiSet)] || {});
      const selected=ids.length>0 && ids.every(id=>context.picks.has(id));
      button.setAttribute('aria-pressed',String(selected));button.textContent=selected?'Reference set selected ✓':'Select this comparison set';
    });
    const count=context.picks.size;
    $('target-inspiration-selection').textContent=count.toLocaleString()+' selected across all views. Benchmarks and competitor products share one comparison and export.';
    $('target-inspiration-compare').disabled=!count;$('target-inspiration-export').disabled=!count;
  }

  function show() {
    if(!view)return;
    if(!rendered)render();
    if(typeof window.showCatalogView==='function')window.showCatalogView(false);
    $('catalog-view').hidden=true;$('executive-view').hidden=true;
    const analysis=$('analysis-view');if(analysis)analysis.hidden=true;
    const compare=$('compare-view');if(compare)compare.hidden=true;
    view.hidden=false;nav.setAttribute('aria-pressed','true');
    $('nav-catalog').setAttribute('aria-pressed','false');$('nav-opportunities').setAttribute('aria-pressed','false');
    syncSelections();
  }
  function hide() { if(view)view.hidden=true;if(nav)nav.setAttribute('aria-pressed','false'); }

  function mount(options) {
    if(view)return;
    if(!options?.byId || !options?.picks)throw new Error('Target inspiration requires the shared catalogue index and selections');
    data=window.HCTargetInspirationData;
    if(!data || !Array.isArray(data.benchmarks))throw new Error('Target inspiration source data did not load');
    context=options;registerBenchmarks();registerTravelReferences();restoreReferenceSelections();
    nav=document.createElement('button');nav.type='button';nav.id='nav-target';nav.textContent='Target inspiration';nav.setAttribute('aria-pressed','false');
    $('nav-opportunities').after(nav);
    view=document.createElement('section');view.id='target-inspiration-view';view.hidden=true;view.setAttribute('aria-labelledby','target-inspiration-title');
    $('catalog-view').before(view);
    nav.addEventListener('click',show);
    view.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.dataset.tiSelect) {
        const id=button.dataset.tiSelect;if(!context.byId.has(id))return;
        if(context.picks.has(id))context.picks.delete(id);else context.picks.add(id);persist();
      } else if(button.hasAttribute('data-ti-set')) {
        const ids=recommendationIds((data.recommendations || [])[Number(button.dataset.tiSet)] || {});
        const remove=ids.length>0 && ids.every(id=>context.picks.has(id));
        for(const id of ids)if(remove)context.picks.delete(id);else context.picks.add(id);persist();
      } else if(button.hasAttribute('data-ti-filter-scale')) {
        filters.scale=button.dataset.tiFilterScale;renderDirections();
      } else if(button.id==='target-direction-reset') {
        filters={query:'',scale:'all',platform:'all',priority:'all'};renderDirections();
      } else if(button.id==='target-inspiration-compare')window.HCProductCompare?.show?.();
      else if(button.id==='target-inspiration-export')$('export').click();
    });
    view.addEventListener('input',event=>{
      if(event.target.id==='target-direction-search') {filters.query=event.target.value;renderDirections();}
    });
    view.addEventListener('change',event=>{
      if(event.target.id==='target-platform-filter') {filters.platform=event.target.value;renderDirections();}
      if(event.target.id==='target-priority-filter') {filters.priority=event.target.value;renderDirections();}
    });
    view.addEventListener('submit',event=>event.preventDefault());
    view.addEventListener('toggle',event=>{
      const key=event.target.dataset?.tiDetails;if(!key)return;
      if(event.target.open)expandedIdeas.add(key);else expandedIdeas.delete(key);
    },true);
    view.addEventListener('error',event=>{
      const image=event.target;if(!(image instanceof HTMLImageElement))return;
      const note=document.createElement('span');note.className='ti-no-photo';note.textContent='Photo could not be loaded';image.replaceWith(note);
    },true);
    document.addEventListener('hc-selection-change',syncSelections);
    if(typeof context.redraw==='function')context.redraw();
    syncSelections();
  }

  function exportValue(item,field) {
    const fields=['targetInspirationRole','targetInspirationIdeas','targetFeatureToLearn','targetProposedConcept','targetValidationSteps','targetInspirationSources'];
    if(!fields.includes(field))return undefined;
    const matches=(data?.recommendations || []).filter(recommendation=>recommendationIds(recommendation).includes(item.id));
    const join=key=>matches.map(recommendation=>recommendation.title+': '+String(recommendation[key] || '')).join(' | ');
    const values={
      targetInspirationRole:benchmarkIds.has(item.id)?'Open Story benchmark — already offered':travelReferenceIds.has(item.id)?'Travel inspiration reference':matches.length?'Competitor inspiration reference':'',
      targetInspirationIdeas:matches.map(recommendation=>recommendation.title).join(' | '),
      targetFeatureToLearn:join(benchmarkIds.has(item.id)?'targetBaseline':'featureToAdapt'),
      targetProposedConcept:join('concept'),
      targetValidationSteps:matches.map(recommendation=>recommendation.title+': '+(recommendation.validation||[]).join('; ')).join(' | '),
      targetInspirationSources:[...new Set(matches.flatMap(recommendation=>(recommendation.sources||[]).map(source=>safeUrl(source.url)).filter(Boolean)))].join(' | ')
    };
    return values[field];
  }
  window.HCTargetInspiration={mount,show,hide,syncSelections,exportValue};
})();
