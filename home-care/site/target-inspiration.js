(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let context = null, data = null, view = null, nav = null;
  let benchmarks = [], benchmarkIds = new Set();

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
    // The base app restores catalogue IDs before these separate benchmark references exist.
    // Restore only valid benchmark IDs here and preserve all already-selected competitors.
    try {
      const stored=JSON.parse(localStorage.getItem('hc-merchant-picks') || '[]');
      if(Array.isArray(stored))for(const id of stored)if(benchmarkIds.has(id) && context.byId.has(id))context.picks.add(id);
    } catch (_) { }
  }

  function productCard(item,tag,comparison) {
    const image=photoFor(item);
    return '<article class="ti-reference-card"><div class="ti-reference-photo">'+(image?'<img loading="lazy" decoding="async" src="'+esc(image)+'" alt="'+esc(item.name)+'">':'<span class="ti-no-photo">Photo not available</span>')+'</div><div class="ti-reference-body"><span class="ti-reference-tag">'+esc(tag)+'</span><h4>'+esc(item.name)+'</h4><p class="ti-reference-meta">'+esc(item.retailer)+(item.brand?' · '+esc(item.brand):'')+'</p><p class="ti-reference-price">'+esc(item.displayPrice || 'Price not recorded')+'<small>Saved price snapshot</small></p><p class="ti-reference-meta">Saved source checked: '+dateLabel(item.checkedDate)+'</p>'+(comparison?.featureToLearn?'<p class="ti-reference-learning"><strong>Feature to learn:</strong> '+esc(comparison.featureToLearn)+'</p>':'')+(comparison?.limitation?'<p class="ti-reference-limit">'+esc(comparison.limitation)+'</p>':'')+(item.targetBenchmark && item.sourceFreshness?'<p class="ti-reference-limit">'+esc(item.sourceFreshness)+'</p>':'')+'<div class="ti-reference-actions">'+link(item.url,'View source')+pickButton(item.id)+'</div></div></article>';
  }

  function recommendationIds(recommendation) {
    const competitors=(recommendation.competitorIds || []).filter(id=>context.byId.has(id));
    const targets=(recommendation.benchmarkTcins || []).map(benchmarkId).filter(id=>benchmarkIds.has(id));
    return [...new Set([...competitors,...targets])];
  }

  function render() {
    const brand=data.brand || {},reviewedAt=data.reviewedAt || data.checkedAt || '';
    const brandSource=brand.sourceUrl || brand.url || '';
    view.innerHTML='<div class="ti-intro"><div><p class="ti-kicker">TARGET MERCHANT INSPIRATION</p><h2 id="target-inspiration-title">What could fit Open Story?</h2><p>'+esc(brand.description || 'Use Open Story’s existing travel products as the starting point for differentiated travel-organization ideas.')+' '+link(brandSource,'Official brand reference')+'</p></div><span class="ti-brand-mark">Open Story<br><small>Travel benchmarks</small></span></div>'+
      '<div class="ti-context-note"><strong>Build on what Target already offers.</strong><p>These are feature-adaptation hypotheses for travel merchant review. Each direction connects a saved competitor reference with an official Open Story benchmark. A confirmed Target assortment gap or current-stock claim is not implied.</p></div>'+
      '<div class="ti-brand-routing"><div><h3>Keep the travel use clear</h3><p>'+esc(brand.weakFit || '')+'</p></div><div><h3>Route household formulas to the right brief</h3><p>'+esc(brand.homeCareRouting || '')+' '+link(brandSource,'Target brand positioning')+'</p></div></div>'+
      '<div class="ti-toolbar"><p id="target-inspiration-selection" aria-live="polite"></p><div><button type="button" id="target-inspiration-compare">Compare selected</button><button type="button" id="target-inspiration-export">Export selected CSV</button></div></div>'+
      '<section class="ti-baselines" aria-labelledby="target-baselines-title"><div class="ti-section-heading"><div><p class="ti-kicker">THE CURRENT RESEARCH BASELINE</p><h3 id="target-baselines-title">Already offered by Open Story</h3><p>Official product references · research reviewed '+dateLabel(reviewedAt)+'. Prices retain their source-snapshot caveats.</p></div><span>'+benchmarks.length+' benchmark references</span></div><div class="ti-benchmark-grid">'+benchmarks.map(benchmark=>{
        const item=benchmark.record,image=photoFor(item);
        return '<article class="ti-benchmark"><div class="ti-benchmark-photo">'+(image?'<img loading="lazy" decoding="async" src="'+esc(image)+'" alt="'+esc(item.name)+'">':'<span class="ti-no-photo">Photo not available</span>')+'<span>Already offered</span></div><div class="ti-benchmark-body"><p class="ti-tcin">Open Story · TCIN '+esc(benchmark.tcin)+'</p><h4>'+esc(item.name)+'</h4><p class="ti-benchmark-price">'+esc(item.displayPrice || 'Price not recorded')+'<small>Source snapshot</small></p><ul>'+benchmark.features.map(feature=>'<li>'+esc(feature)+'</li>').join('')+'</ul>'+(benchmark.limitations?'<p class="ti-performance-note"><strong>Performance boundary</strong>'+esc(benchmark.limitations)+'</p>':'')+'<p class="ti-price-note">'+esc(item.priceBasis)+'</p><p class="ti-source-note">'+esc(benchmark.sourceNote || item.verificationNote)+(benchmark.sourceFreshness?'<br>'+esc(benchmark.sourceFreshness):'')+'</p><div class="ti-benchmark-actions">'+link(item.url,'Official Target listing')+pickButton(item.id)+'</div></div></article>';
      }).join('')+'</div></section>'+
      '<section class="ti-recommendations" aria-labelledby="target-ideas-title"><div class="ti-section-heading"><div><p class="ti-kicker">FEATURES TO EXPLORE</p><h3 id="target-ideas-title">Directions for merchant review</h3><p>Fit assessments below are sourcing judgments based on the cited features.</p></div></div>'+
      (data.recommendations || []).map((recommendation,index)=>{
        const ids=recommendationIds(recommendation),competitorIds=(recommendation.competitorIds || []).filter(id=>context.byId.has(id));
        const targetIds=(recommendation.benchmarkTcins || []).map(benchmarkId).filter(id=>benchmarkIds.has(id));
        const chosen=ids.length>0 && ids.every(id=>context.picks.has(id));
        const sources=(recommendation.sources || []).map(source=>link(source.url,source.label || 'Source')).filter(Boolean);
        return '<article class="ti-idea" id="target-idea-'+index+'"><div class="ti-idea-heading"><div class="ti-idea-title"><span class="ti-idea-number">'+String(index+1).padStart(2,'0')+'</span><div><h4>'+esc(recommendation.title)+'</h4>'+(recommendation.fit?'<p class="ti-fit">Fit to explore: '+esc(recommendation.fit)+'</p>':'')+'</div></div><button type="button" class="ti-select-set" data-ti-set="'+index+'" aria-pressed="'+chosen+'" '+(!ids.length?'disabled':'')+'>'+(chosen?'Reference set selected ✓':'Select this comparison set')+'</button></div>'+
          '<div class="ti-idea-summary"><div><span>Why it could fit Target</span><p>'+esc(recommendation.whyFit)+'</p></div><div class="ti-concept"><span>Differentiated concept to explore</span><p>'+esc(recommendation.concept)+'</p></div></div>'+
          '<div class="ti-feature-comparison"><div><h5>Target baseline</h5><p>'+esc(recommendation.targetBaseline)+'</p></div><div><h5>Feature worth adapting</h5><p>'+esc(recommendation.featureToAdapt)+'</p></div></div>'+
          '<div class="ti-reference-groups"><div><h5>Saved competitor inspiration</h5><div class="ti-reference-stack">'+(competitorIds.length?competitorIds.map(id=>productCard(context.byId.get(id),'Competitor reference',(recommendation.comparisons || []).find(comparison=>comparison.id===id))).join(''):'<p class="ti-empty">The referenced competitor product is unavailable in this catalogue version.</p>')+'</div></div><div><h5>Open Story comparison baseline</h5><div class="ti-reference-stack">'+(targetIds.length?targetIds.map(id=>productCard(context.byId.get(id),'Target benchmark')).join(''):'<p class="ti-empty">No benchmark reference attached.</p>')+'</div></div></div>'+
          '<div class="ti-validation"><h5>Validate before a merchant proposal</h5><ul>'+(recommendation.validation || []).map(value=>'<li>'+esc(value)+'</li>').join('')+'</ul></div>'+(sources.length?'<div class="ti-sources">'+sources.join('')+'</div>':'')+'</article>';
      }).join('')+'</section>'+
      '<div class="ti-method-note">'+(data.methodology || []).map(value=>'<p>'+esc(value)+'</p>').join('')+'<p>Use Select to place Target benchmarks and competitor references in the same comparison. CSV export includes product-photo URLs and source links; image files are not embedded in CSV.</p></div>';
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
    if(!view || !context)return;
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
    context=options;registerBenchmarks();
    nav=document.createElement('button');nav.type='button';nav.id='nav-target';nav.textContent='Target inspiration';nav.setAttribute('aria-pressed','false');
    $('nav-opportunities').after(nav);
    view=document.createElement('section');view.id='target-inspiration-view';view.hidden=true;view.setAttribute('aria-labelledby','target-inspiration-title');
    $('catalog-view').before(view);render();
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
      } else if(button.id==='target-inspiration-compare')window.HCProductCompare?.show?.();
      else if(button.id==='target-inspiration-export')$('export').click();
    });
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
      targetInspirationRole:benchmarkIds.has(item.id)?'Open Story benchmark — already offered':matches.length?'Competitor inspiration reference':'',
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
