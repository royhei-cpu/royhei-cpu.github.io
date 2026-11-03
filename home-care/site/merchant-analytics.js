(function () {
  'use strict';
  const model = window.HCMerchantAnalyticsModel;
  const salesModel = window.HCSalesModel;
  let items = [], view, nav, latest, rendered = false, priceBandKey = '';
  let activeSalesGroup = null, salesRanks = new Map();
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => Number(value || 0).toLocaleString('en-US');
  const dateLabel = value => value ? new Date(value+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : 'Not recorded';
  const dateRange = range => !range.first ? 'Not recorded' : range.first === range.last ? dateLabel(range.first) : dateLabel(range.first)+' – '+dateLabel(range.last);
  const pct = (value,total) => total ? (100*value/total).toFixed(1)+'%' : '0.0%';
  const sourceLink = (url,label) => url ? '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>' : '';
  const hasPick = id => typeof picks !== 'undefined' && picks instanceof Set && picks.has(id);
  const pickButton = id => '<button type="button" class="ma-pick" data-ma-select="'+esc(id)+'" aria-pressed="'+hasPick(id)+'">'+(hasPick(id)?'Selected ✓':'Select')+'</button>';

  function populateOptions() {
    const home = model.filterItems(items);
    for (const [id,field,label] of [['analysis-retailer','retailer','All retailers'],['analysis-category','category','All Home Care categories']]) {
      const select=$(id), previous=select.value || 'all';
      const options=model.countBy(home,field).sort((a,b)=>a.label.localeCompare(b.label,'en'));
      const all=document.createElement('option');all.value='all';all.textContent=label;
      select.replaceChildren(all,...options.map(option=>{const node=document.createElement('option');node.value=option.key;node.textContent=option.label;return node;}));
      select.value=options.some(option=>option.key===previous)?previous:'all';
    }
  }

  function mount(sourceItems) {
    if(view) { refresh(sourceItems); return; }
    if(!model || !salesModel) throw new Error('Merchant analytics models did not load');
    items=sourceItems;
    nav=document.createElement('button');nav.type='button';nav.id='nav-analysis';nav.textContent='Sales & analysis';nav.setAttribute('aria-pressed','false');
    $('nav-catalog').after(nav);
    view=document.createElement('section');view.id='analysis-view';view.hidden=true;view.setAttribute('aria-labelledby','analysis-title');
    view.innerHTML=`
      <div class="ma-intro"><div><p class="ma-kicker">MERCHANT ANALYSIS</p><h2 id="analysis-title">Sales & analysis</h2><p>Explore captured sales signals, offer prices and competitor coverage.</p></div><span class="ma-scope-tag">Home Care</span></div>
      <div class="ma-filter-bar"><label for="analysis-retailer">Competitor<select id="analysis-retailer"></select></label><label for="analysis-category">Category<select id="analysis-category"></select></label><button type="button" id="analysis-reset">Reset analysis</button></div>
      <p class="ma-snapshot-note" id="analysis-dates"></p><p class="ma-selection-note" id="analysis-selection-note">Selections are shared with the catalogue, comparison and CSV export.</p>
      <div class="ma-kpis" id="analysis-kpis"></div>
      <p class="ma-filter-status" id="analysis-filter-status" role="status" aria-live="polite"></p>
      <section class="ma-card ma-sales-card" aria-labelledby="analysis-sales-title"><div class="ma-card-heading"><div><p class="ma-kicker">PUBLISHED DEMAND SIGNALS</p><h3 id="analysis-sales-title">Highest published sales counts</h3></div><span class="ma-chart-tag">One comparable group at a time</span></div>
        <label class="ma-group-label" for="analysis-sales-group">Retailer, reporting period and snapshot<select id="analysis-sales-group"></select></label>
        <p class="ma-chart-caption" id="analysis-sales-caption"></p><ol class="ma-sales-bars" id="analysis-sales-bars"></ol>
        <p class="ma-method-note">Bars use the published count. “+” is a minimum, abbreviated counts may be rounded, and equal values share a rank. Unknown-period totals and third-party tracker counts stay separate. These snapshots do not establish current retailer bestseller positions.</p>
      </section>
      <div class="ma-chart-grid">
        <section class="ma-card" aria-labelledby="analysis-price-title"><p class="ma-kicker">COLLECTED OFFER PRICES</p><h3 id="analysis-price-title">Where saved prices sit</h3><p class="ma-chart-caption" id="analysis-price-caption"></p><div class="ma-price-chart" id="analysis-price-chart"></div><p class="ma-small-note">Select a price band to inspect examples. Packs, sizes and retailers vary; this is a distribution of captured offers.</p><div id="analysis-price-examples"></div><details class="ma-method-details"><summary>Price sample & inclusion rules</summary><div id="analysis-price-method"></div></details></section>
        <section class="ma-card" aria-labelledby="analysis-availability-title"><p class="ma-kicker">HOW MUCH EVIDENCE WE HAVE</p><h3 id="analysis-availability-title">Sales-data availability</h3><p class="ma-chart-caption">Counts of catalogue records in your selected view.</p><ul class="ma-availability-bars" id="analysis-availability-bars"></ul><div class="ma-reading-note" id="analysis-reading-note"></div><p class="ma-method-note">Percentages describe data coverage. Revenue and sales growth are not calculated because comparable sales histories and transaction values are not recorded.</p></section>
      </div>
      <div class="ma-chart-grid">
        <section class="ma-card" aria-labelledby="analysis-category-title"><p class="ma-kicker">RESEARCH COVERAGE</p><h3 id="analysis-category-title">Captured listings by category</h3><p class="ma-chart-caption">Select a category bar to focus this analysis.</p><div id="analysis-category-bars"></div></section>
        <section class="ma-card" aria-labelledby="analysis-retailer-title"><p class="ma-kicker">RESEARCH COVERAGE</p><h3 id="analysis-retailer-title">Captured listings by retailer</h3><p class="ma-chart-caption">Select a retailer bar to focus this analysis.</p><div id="analysis-retailer-bars"></div></section>
      </div><p class="ma-footer-note">Coverage charts count saved listings and may include related packs or repeated references. Research depth varies by retailer; these charts do not measure market share or establish a Target assortment gap. Every chart recalculates from the current catalogue.</p>`;
    $('catalog-view').before(view);
    populateOptions();
    nav.addEventListener('click',show);
    $('analysis-retailer').addEventListener('change',render);
    $('analysis-category').addEventListener('change',render);
    $('analysis-sales-group').addEventListener('change',renderSales);
    $('analysis-reset').addEventListener('click',()=>{$('analysis-retailer').value='all';$('analysis-category').value='all';priceBandKey='';render();});
    view.addEventListener('click',event=>{
      const choose=event.target.closest('[data-ma-filter]');
      if(choose) { const select=$('analysis-'+choose.dataset.maDimension); select.value=choose.dataset.maFilter; render(); return; }
      const band=event.target.closest('[data-ma-price-band]');
      if(band) { priceBandKey=band.dataset.maPriceBand;renderPrices();return; }
      const select=event.target.closest('[data-ma-select]');
      if(select && typeof picks !== 'undefined' && picks instanceof Set) {
        const id=select.dataset.maSelect;
        if(picks.has(id))picks.delete(id);else picks.add(id);
        try{localStorage.setItem('hc-merchant-picks',JSON.stringify([...picks]));}catch(_){ }
        if(typeof draw==='function')draw();
        syncSelections();
        window.HCProductCompare?.refresh?.();
      }
    });
  }

  function render() {
    latest=model.summarize(items,{retailer:$('analysis-retailer').value,category:$('analysis-category').value});
    const t=latest.totals;
    $('analysis-dates').textContent='Saved evidence · record checks: '+dateRange(latest.dates.records)+' · sales observations: '+dateRange(latest.dates.sales)+'. Charts do not refresh the underlying sources.';
    $('analysis-kpis').innerHTML=[
      [number(t.records),'Captured listings',number(t.retailers)+' retailers in this view'],
      [number(t.publishedCounts),'Published sales counts',pct(t.publishedCounts,t.records)+' of captured listings'],
      [number(t.priceSamples),'Eligible price snapshots','Single USD amounts passing the stated checks'],
      [dateLabel(latest.dates.records.last),'Latest record check',latest.dates.sales.last?'Sales observations through '+dateLabel(latest.dates.sales.last):'No sales observation date recorded']
    ].map(([value,label,note])=>'<div class="ma-kpi"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span><small>'+esc(note)+'</small></div>').join('');
    $('analysis-filter-status').textContent=t.records ? number(t.records)+' Home Care records match this analysis.' : 'No captured records match these filters. Source coverage remains partial.';
    const selected=$('analysis-sales-group').value;
    $('analysis-sales-group').replaceChildren(...latest.groups.map(group=>{const option=document.createElement('option');option.value=group.key;option.textContent=group.label+' · '+number(group.entries.length)+' listings';return option;}));
    $('analysis-sales-group').disabled=!latest.groups.length;
    if(!latest.groups.length){const option=document.createElement('option');option.value='';option.textContent='No comparable sales group in this selection';$('analysis-sales-group').append(option);}
    if(latest.groups.some(group=>group.key===selected))$('analysis-sales-group').value=selected;
    renderSales();renderPrices();renderAvailability();
    $('analysis-category-bars').innerHTML=coverageBars(latest.categoryBars,'category');
    $('analysis-retailer-bars').innerHTML=coverageBars(latest.retailerBars,'retailer');
    rendered=true;syncSelections();
  }

  function renderSales() {
    const group=latest.groups.find(entry=>entry.key===$('analysis-sales-group').value);
    if(!group) {
      activeSalesGroup=null;salesRanks.clear();
      $('analysis-sales-caption').textContent='No comparable published sales counts are captured for these filters. Choose another retailer or category.';
      $('analysis-sales-bars').replaceChildren();return;
    }
    const ranked=salesModel.rankGroup(group),shown=ranked.slice(0,10),maximum=shown[0]?.metric.value||0;
    activeSalesGroup=group;salesRanks=new Map(ranked.map(entry=>[entry.item.id,entry]));
    $('analysis-sales-caption').textContent='Saved snapshot: '+dateLabel(group.observedAt)+' · '+group.retailer+' · '+group.period+'. Showing '+shown.length+' of '+number(ranked.length)+' eligible listings; ties share the same displayed-value rank.';
    $('analysis-sales-bars').innerHTML=shown.map(entry=>{
      const {item,metric,rank,tied}=entry;
      const exact=metric.itemUrl && metric.itemUrl!==metric.sourceUrl ? sourceLink(metric.itemUrl,'Exact listing') : '';
      return '<li><div class="ma-sales-top"><div class="ma-sales-label"><span class="ma-rank">#'+rank+(tied?' =':'')+'</span><span>'+esc(item.name)+'</span></div><strong class="ma-sales-number">'+esc(metric.display)+'</strong></div><div class="ma-bar-track" aria-hidden="true"><span style="width:'+(maximum?100*metric.value/maximum:0)+'%"></span></div><div class="ma-sales-foot"><span>'+esc(item.categoryLabel||item.category)+'</span><div class="ma-item-actions">'+sourceLink(metric.sourceUrl,'Sales source')+exact+pickButton(item.id)+'</div></div></li>';
    }).join('');
    syncSelections();
  }

  function coverageBars(bars,dimension) {
    if(!bars.length)return '<p class="ma-empty">No captured listings in this selection.</p>';
    const max=bars[0].count;
    const row=bar=>'<li><button type="button" data-ma-dimension="'+dimension+'" data-ma-filter="'+esc(bar.key)+'" aria-label="Filter '+dimension+': '+esc(bar.label)+', '+number(bar.count)+' captured listings"><span class="ma-coverage-label"><span>'+esc(bar.label)+'</span><strong>'+number(bar.count)+'</strong></span><span class="ma-bar-track" aria-hidden="true"><span style="width:'+(100*bar.count/max)+'%"></span></span></button></li>';
    return '<ul class="ma-coverage-bars">'+bars.slice(0,8).map(row).join('')+'</ul>'+(bars.length>8?'<details class="ma-more-bars"><summary>Show '+(bars.length-8)+' more '+(dimension==='category'?'categories':'retailers')+'</summary><ul class="ma-coverage-bars">'+bars.slice(8).map(row).join('')+'</ul></details>':'');
  }

  function renderPrices() {
    const data=latest.prices,maximum=Math.max(1,...data.bands.map(band=>band.count));
    if(!data.bands.some(band=>band.key===priceBandKey && band.count))priceBandKey=[...data.bands].sort((a,b)=>b.count-a.count).find(band=>band.count)?.key||'';
    $('analysis-price-caption').textContent=number(data.includedCount)+' eligible listing-price snapshots · record checks: '+dateRange(data.dates)+'. Research coverage influences this sample.';
    $('analysis-price-chart').innerHTML=data.bands.map(band=>'<button type="button" class="ma-price-band" data-ma-price-band="'+band.key+'" aria-pressed="'+(band.key===priceBandKey)+'" '+(!band.count?'disabled ':'')+'aria-label="'+esc(band.label)+': '+number(band.count)+' captured price snapshots"><strong>'+number(band.count)+'</strong><span class="ma-price-track" aria-hidden="true"><span style="height:'+(100*band.count/maximum)+'%"></span></span><span class="ma-price-label">'+esc(band.label)+'</span></button>').join('');
    const chosen=data.bands.find(band=>band.key===priceBandKey);
    $('analysis-price-examples').innerHTML=chosen?'<h4>'+esc(chosen.label)+' · example offers</h4><p class="ma-small-note">'+Math.min(4,chosen.entries.length)+' of '+number(chosen.entries.length)+' saved offers in this band.</p><ul class="ma-price-examples">'+chosen.entries.slice(0,4).map(({item,price})=>'<li><div><strong>'+esc(price.display)+'</strong><span>'+sourceLink(price.sourceUrl,item.name)+'</span><small>'+esc(item.retailer)+' · record checked '+dateLabel(price.checkedAt)+'</small></div>'+pickButton(item.id)+'</li>').join('')+'</ul>':'<p class="ma-empty">No prices meet the stated inclusion rules for this selection.</p>';
    $('analysis-price-method').innerHTML='<p>Included: a single positive USD amount of at least $1, with a source link and a valid recorded check date. Explicit ranges, unit-price and conditional-price evidence are excluded. Prices below $1 require a pack/unit basis check; this is a conservative analytical screen, and original catalogue values stay unchanged.</p><p>'+number(data.missingCount)+' records have no displayed price; '+number(data.excludedCount)+' displayed prices are excluded.'+(data.exclusions.length?' '+data.exclusions.map(entry=>esc(entry.label)+': '+number(entry.count)).join(' · '):'')+'</p><p>Pack quantities, sizes, variants, stores and source dates differ. Compare the exact offer before making a pricing decision; these are saved observations, not a national price benchmark or current checkout quotes.</p>';
    syncSelections();
  }

  function renderAvailability() {
    const total=latest.totals.records,availability=latest.availability;
    const bars=[
      {label:'Latest listing counts eligible for charts',count:availability.rankedListings,tone:'green'},
      {label:'Other sourced count records',count:availability.otherCountRecords,tone:'amber'},
      {label:'No sourced sales count collected',count:availability.withoutCount,tone:'muted'}
    ];
    $('analysis-availability-bars').innerHTML=bars.map(bar=>'<li><div><span>'+esc(bar.label)+'</span><strong>'+number(bar.count)+' <small>'+pct(bar.count,total)+'</small></strong></div><div class="ma-bar-track '+bar.tone+'" aria-hidden="true"><span style="width:'+(total?100*bar.count/total:0)+'%"></span></div></li>').join('');
    $('analysis-reading-note').innerHTML='<strong>Reading this selection</strong><p>'+number(latest.totals.publishedCounts)+' records contain published counts across '+number(latest.groups.length)+' separate sales groups. Older duplicate snapshots and incomplete item identity remain outside the charts.</p><p>'+number(availability.withoutCount)+' records need sourced sales evidence before drawing demand conclusions. More captured listings alone do not establish higher sales.</p>';
  }

  function syncSelections() {
    if(!view)return;
    view.querySelectorAll('[data-ma-select]').forEach(button=>{const chosen=hasPick(button.dataset.maSelect);button.setAttribute('aria-pressed',String(chosen));button.textContent=chosen?'Selected ✓':'Select';});
    const count=typeof picks!=='undefined' && picks instanceof Set?picks.size:0;
    $('analysis-selection-note').textContent=number(count)+' selected across the catalogue. Selections are shared with comparison and CSV export, including product-photo URLs and source links.';
  }

  function show() {
    if(!view)return;
    if(typeof window.showCatalogView==='function')window.showCatalogView(false);
    $('catalog-view').hidden=true;$('executive-view').hidden=true;
    const compare=$('compare-view');if(compare)compare.hidden=true;
    view.hidden=false;
    $('nav-catalog').setAttribute('aria-pressed','false');$('nav-opportunities').setAttribute('aria-pressed','false');nav.setAttribute('aria-pressed','true');
    if(!rendered)render();else syncSelections();
  }

  function hide() { if(view)view.hidden=true;if(nav)nav.setAttribute('aria-pressed','false'); }
  function refresh(sourceItems) { if(sourceItems)items=sourceItems;if(!view)return;populateOptions();if(view.hidden)rendered=false;else render(); }
  function exportRank(item) {
    if(!view || view.hidden)return null;
    const entry=salesRanks.get(item.id);
    return {salesRankInView:entry?entry.rank:'',salesRankingGroup:entry && activeSalesGroup?activeSalesGroup.label:''};
  }
  window.HCMerchantAnalytics={mount,show,hide,refresh,syncSelections,exportRank};
})();
