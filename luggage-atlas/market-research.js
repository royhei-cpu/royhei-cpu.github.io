(function mountMarketResearch(global) {
  'use strict';

  const research = global.ATLAS_RESEARCH;
  const views = ['market', 'growth', 'travelers', 'benchmarks'];
  const {outlook, annualSales, travelParticipation, travelerIncome, carryOnBenchmark} = research;
  const brandSeries = ['samsonite', 'tumi', 'americanTourister'];
  const benchmarkFeatures = ['dimensions', 'weight', 'material', 'wheels', 'tracking', 'expansion'];
  const state = {
    series: 'samsonite', peer: 'tumi', from: annualSales.records[0].year,
    population: 'eu', year: travelParticipation.years.at(-1),
    reference: carryOnBenchmark.defaultReference, feature: 'dimensions'
  };
  const green = '#204d3e', gold = '#93612d', ink = '#193c32', muted = '#53655a', rule = '#d7ddd4';
  const number = (value, digits = 1) => value.toLocaleString('en-US', {
    minimumFractionDigits: digits, maximumFractionDigits: digits
  });
  const money = value => '$' + number(value, 2);
  const signed = (value, digits = 1) => (value > 0 ? '+' : value < 0 ? '−' : '') + number(Math.abs(value), digits);
  const signedMoney = value => (value > 0 ? '+' : value < 0 ? '−' : '') + money(Math.abs(value));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => (
    {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]
  ));
  const round = (value, places = 2) => Number(value.toFixed(places));
  const link = (url, label) => `<a href="${escape(url)}">${escape(label)}</a>`;
  const sourceLink = (url, label) => `<a href="${escape(url)}" target="_blank" rel="noopener">${escape(label)} ↗</a>`;
  const byId = id => document.getElementById(id);

  function cagr(start, end, years) {
    if (![start, end, years].every(Number.isFinite) || start <= 0 || end < 0 || years <= 0) return null;
    return 100 * (Math.pow(end / start, 1 / years) - 1);
  }

  function benchmarks() {
    const models = new Map(global.ATLAS_MODEL_FEATURES.records.map(r => [r.id, r]));
    return carryOnBenchmark.offerIds.flatMap(id => {
      const model = models.get(id);
      if (!model) return [];
      const matches = global.ATLAS.prices.filter(p => p.brand === model.brand && p.product === model.model &&
        p.source === model.source && p.currency === carryOnBenchmark.currency && p.format === 'Carry-on' &&
        (p.market === 'United States' || p.market === 'Target US') && Number.isFinite(p.amount) && p.amount > 0);
      const price = matches.sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!price) return [];
      const store = price.retailer === 'Brand / source storefront'
        ? (price.market === 'Target US' ? 'Target US' : model.brand) : price.retailer;
      return [{id, model, price, store}];
    }).sort((a, b) => a.price.amount - b.price.amount);
  }

  function select(id, label, choices, selected) {
    return `<label for="${id}">${escape(label)}<select id="${id}">${choices.map(([value, name]) =>
      `<option value="${escape(value)}"${String(value) === String(selected) ? ' selected' : ''}>${escape(name)}</option>`
    ).join('')}</select></label>`;
  }

  // The same SVG is displayed and downloaded. Units, period and source travel with the graphic.
  function svg(width, height, title, subtitle, source, body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="marketSvgTitle marketSvgDesc">
      <title id="marketSvgTitle">${escape(title)}</title><desc id="marketSvgDesc">${escape(subtitle)}. ${escape(source)}</desc>
      <rect width="100%" height="100%" fill="#fff"/>
      <g font-family="Arial, sans-serif" fill="${ink}">${body}
        <text x="8" y="${height - 10}" font-size="11" fill="${muted}">${escape(source)}</text>
      </g></svg>`;
  }
  function text(x, y, label, options = '') {
    return `<text x="${x}" y="${y}" ${options}>${escape(label)}</text>`;
  }
  function line(x1, y1, x2, y2, color = rule, extra = '') {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ${extra}/>`;
  }
  function dot(x, y, color, radius = 5) {
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
  }
  function table(headers, rows) {
    return `<table><thead><tr>${headers.map(h => `<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${
      rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
    }</tbody></table>`;
  }

  function marketOutlook(width) {
    const d = outlook, records = d.records;
    const left = 38, right = width - 12, bottom = 186, plot = 146, max = 100;
    const col = (right - left) / records.length, bw = Math.min(84, col * .54);
    let marks = text(8, 16, 'Global luggage revenue · USD billions', 'font-size="13"');
    marks += `<defs><pattern id="projectedFill" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#ede2cc"/><path d="M-2 2l4-4M0 8l8-8m-2 10l4-4" stroke="${gold}" stroke-width="1.5"/></pattern></defs>`;
    for (const tick of [0, 25, 50, 75, 100]) {
      const y = bottom - tick / max * plot;
      marks += line(left, y, right, y) + text(left - 6, y + 4, tick, `text-anchor="end" font-size="11" fill="${muted}"`);
    }
    records.forEach((r, i) => {
      const x = left + col * (i + .5), y = bottom - r.amount / max * plot;
      const projected = r.year === d.cagr.to;
      marks += `<rect x="${x - bw / 2}" y="${y}" width="${bw}" height="${bottom - y}" fill="${projected ? 'url(#projectedFill)' : green}"/>`;
      marks += text(x, y - 7, '$' + number(r.amount), 'text-anchor="middle" font-size="16" font-weight="bold"');
      marks += text(x, bottom + 20, r.year, 'text-anchor="middle" font-size="15"');
      marks += text(x, bottom + 37, r.basis, `text-anchor="middle" font-size="11" fill="${muted}"`);
    });
    const title = 'How large is the global luggage market?';
    const rate = d.cagr, caption = 'Grand View Research · global outlook, '+records[0].year+'–'+rate.to;
    marks += text(8,248,rate.from+'–'+rate.to+' forecast CAGR: '+number(rate.percent)+'%', 'font-size="13" font-weight="bold"');
    return {title, eyebrow:'Worldwide · market outlook', period:'Three published revenue estimates, in US dollars.',
      filters:'', metric:number(rate.percent) + '%', label:'Forecast compound annual growth rate',
      reading:`Grand View Research projects ${'$'+number(records.at(-1).amount)} billion in ${rate.to}, from an estimated $${number(records[1].amount)} billion in ${rate.from}.`,
      note:`CAGR expresses growth as a constant annual rate across ${rate.to - rate.from} years. The bars show the three amounts in the public summary.`,
      method:d.method, sources:sourceLink(d.source, 'Report, scope and forecast'), checked:d.checked,
      graphic:svg(width, 285, title, d.method, caption, marks),
      table:table(['Year','Revenue · USD billions','Evidence'], records.map(r => [r.year, number(r.amount), escape(r.basis)])),
      csv:[['Year','Global revenue (USD billions)','Evidence','Forecast CAGR (%)','CAGR from','CAGR to','Market','Publisher','Scope / method','Source','Checked'],
        ...records.map(r => [r.year,r.amount,r.basis,r.year === rate.to ? rate.percent : '',r.year === rate.to ? rate.from : '',
          r.year === rate.to ? rate.to : '',d.market,d.publisher,d.method,d.source,d.checked])]};
  }

  function salesGrowth(width) {
    const d = annualSales, series = state.series;
    const choices = Object.entries(d.series), peerChoices = brandSeries.filter(key => key !== series);
    const peer = brandSeries.includes(series) && peerChoices.includes(state.peer) ? state.peer : '';
    let filters = select('growthSeries','Sales series',choices,series);
    if (brandSeries.includes(series)) filters += select('growthPeer','Compare brand',[['','No comparison'],
      ...peerChoices.map(key => [key,d.series[key]])],peer);
    filters += select('growthFrom','Start year',d.records.slice(0,-1).map(r=>[r.year,'FY '+r.year]),state.from);
    const records = d.records.filter(r => r.year >= state.from), first = records[0], last = records.at(-1);
    const keys = peer ? [series, peer] : [series];
    const rate = key => cagr(first[key],last[key],last.year-first.year);
    const yoy = cagr(records.at(-2)[series], last[series], 1);
    const left = 49, right = width - 22, top = 61, bottom = 210;
    const maximum = Math.max(...records.flatMap(r=>keys.map(key=>r[key])));
    const step = maximum > 2500 ? 1000 : maximum > 1250 ? 500 : 250;
    const roof = Math.ceil(maximum / step) * step;
    const x = i => left + (right - left) * i / (records.length - 1);
    const y = value => bottom - value / roof * (bottom - top);
    let marks = text(8,16,'Reported net sales · USD millions','font-size="13"');
    let legendX = 9;
    keys.forEach((key, i) => {
      marks += line(legendX, 36, legendX+19, 36, i ? gold : green, i ? 'stroke-width="3" stroke-dasharray="4 3"' : 'stroke-width="3"');
      marks += text(legendX+24,40,d.series[key],'font-size="12"');
      legendX += d.series[key].length * 7.3 + 45;
    });
    for (let tick = 0; tick <= roof; tick += step) {
      marks += line(left,y(tick),right,y(tick)) + text(left-7,y(tick)+4,number(tick,0),'text-anchor="end" font-size="11"');
    }
    keys.forEach((key,i) => {
      const color = i ? gold : green;
      marks += `<polyline points="${records.map((r,n)=>`${x(n)},${y(r[key])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" ${i ? 'stroke-dasharray="7 4"' : ''}/>`;
      records.forEach((r,n)=>{marks += dot(x(n),y(r[key]),color);});
    });
    records.forEach((r,i)=>{marks += text(x(i),bottom+22,r.year,'font-size="13" text-anchor="middle"');});
    const period = `FY ${first.year}–${last.year}`, title = `${d.series[series]}${peer ? ' and '+d.series[peer] : ''}`;
    keys.forEach((key,i)=>{
      marks += text(8,256+i*17,d.series[key]+': '+signed(rate(key))+'% CAGR ('+period+')', 'font-size="12"');
    });
    const reportLinks = [...new Set(records.map(r=>r.report))].map(report=>sourceLink(d.sources[report],'FY '+report+' filing')).join(' · ');
    return {title, eyebrow:'Company benchmark · reported sales', period:`${period} · fiscal years ended December 31 · USD millions`, filters,
      metric:signed(rate(series))+'%',label:`Historical CAGR · ${d.series[series]} · ${period}`,
      reading:`${d.series[series]} went from $${number(first[series])}m to $${number(last[series])}m across ${last.year-first.year} annual interval${last.year-first.year===1?'':'s'}. Its latest full-year change was ${signed(yoy)}%.`,
      note:peer ? `Over the same period, ${d.series[peer]} recorded ${signed(rate(peer))}% CAGR, from $${number(first[peer])}m to $${number(last[peer])}m.` : 'Group total includes all brands and categories. The travel series isolates the company’s reported travel category.',
      method:`${d.method} Atlas calculates historical CAGR as (ending sales ÷ starting sales) raised to the power of 1 ÷ number of years, minus one.`,
      checked:d.checked, sources:reportLinks, graphic:svg(width,278+keys.length*17,title,period,`Samsonite Group filings · ${period} · reported USD`,marks),
      table:table(['Fiscal year',...keys.map(key=>d.series[key]+' · USD m'),'Filing'],records.map(r=>[r.year,...keys.map(key=>number(r[key])),sourceLink(d.sources[r.report],'FY '+r.report)])),
      csv:[['Fiscal year','Series','Reported net sales (USD millions)','CAGR from','CAGR to','Historical CAGR (%)','Market','Source','Checked'],
        ...records.flatMap(r=>keys.map(key=>[r.year,d.series[key],r[key],first.year,last.year,r===last ? round(rate(key),4) : '',d.market,d.sources[r.report],d.checked]))]};
  }

  // A shared numeric axis keeps price, participation and distribution figures readable on a phone.
  function dotPlot(width, {title, unit, footer, rows, limit, ticks, format, reference, referenceLabel}) {
    const left = width < 500 ? 103 : 154, right = width - (width < 500 ? 64 : 78);
    const start = 66, rowHeight = 34, last = start + (rows.length - 1) * rowHeight;
    const xpos = value => left + value / limit * (right - left);
    let marks = text(8,16,unit,'font-size="13"');
    for (const tick of ticks) {
      const x = xpos(tick);
      marks += line(x,43,x,last+10) + text(x,39,format(tick,true),'text-anchor="middle" font-size="11"');
    }
    if (reference != null) {
      marks += line(xpos(reference),44,xpos(reference),last+13,gold,'stroke-width="2" stroke-dasharray="4 3"');
    }
    rows.forEach((r,i) => {
      const y = start + i * rowHeight, x = xpos(r.value);
      marks += text(8,y+4,r.label,`font-size="${width<500 ? 10.5 : 13}"`);
      marks += line(left,y,x,y,green,'stroke-width="2"') + dot(x,y,r.selected ? gold : green,r.selected ? 6.5 : 5);
      marks += text(width-7,y+4,format(r.value,false),'text-anchor="end" font-size="13" font-weight="bold"');
    });
    if (reference != null) {
      marks += line(8,last+35,31,last+35,gold,'stroke-width="2" stroke-dasharray="4 3"');
      marks += text(38,last+39,referenceLabel,'font-size="12"');
    }
    return svg(width,last + (reference!=null ? 71 : 42),title,unit,footer,marks);
  }

  function demographics(width) {
    const us = state.population === 'us';
    let filters = select('travelerPopulation','Population and measure',[
      ['eu','European Union · participation by age'],['us','United States · household income']
    ],state.population);
    if (us) {
      const d = travelerIncome, title = 'Household income of U.S. overseas air travelers';
      const rows = d.records.map(r=>({label:r.band,value:r.share}));
      return {title,eyebrow:'United States · outbound air travel',period:`${d.period} · overseas destinations · combined annual household income`,filters,
        metric:'$'+number(d.median,0),label:'Median annual household income',
        reading:`The reported mean was $${number(d.mean,0)}. ${number(d.respondents,0)} respondents answered the income question.`,
        note:'This profile covers U.S. residents flying overseas in one quarter. A traveler’s household income does not establish their suitcase budget.',
        method:d.method, checked:d.checked, sources:sourceLink(d.source,'Survey workbook · Table 38')+' · '+sourceLink(d.methodology,'Survey methodology'),
        graphic:dotPlot(width,{title,unit:'Share reporting each household income · %',footer:'NTTO · U.S. overseas air travelers · Q2 2026',rows,limit:30,ticks:[0,10,20,30],format:(v,tick)=>number(v,tick?0:1)+'%'}),
        table:table(['Household income (USD)','Share of income respondents'],d.records.map(r=>[escape(r.band),number(r.share)+'%'])),
        csv:[['Annual household income band (USD)','Share (%)','Income respondents','Median household income (USD)','Mean household income (USD)','Period','Market','Method','Source','Checked'],
          ...d.records.map(r=>[r.band,r.share,d.respondents,d.median,d.mean,d.period,d.market,d.method,d.source,d.checked])]};
    }
    const d = travelParticipation, year = state.year, i = d.years.indexOf(year);
    filters += select('travelerYear','Calendar year',d.years.map(y=>[y,y]),year);
    const ages = d.records.filter(r=>!r.aggregate), average = d.records.find(r=>r.aggregate).shares[i];
    const ordered = [...ages].sort((a,b)=>b.shares[i]-a.shares[i]), high = ordered[0], low = ordered.at(-1);
    const title = 'Who took an overnight trip in the EU?';
    const rows = ages.map(r=>({label:'Age '+r.age,value:r.shares[i]}));
    return {title,eyebrow:'European Union · travel participation',period:`${year} · residents aged 15+ · domestic or foreign travel for personal purposes`,filters,
      metric:number(high.shares[i]-low.shares[i],2)+' pp',label:'Participation gap between the highest and lowest age bands',
      reading:`${number(high.shares[i],2)}% of residents aged ${high.age} took a trip, compared with ${number(low.shares[i],2)}% of those aged ${low.age}.`,
      note:'Each percentage uses its own age group as the denominator. The survey measures personal overnight travel. It does not identify luggage buyers.',
      method:`${d.method} The dashed marker shows the overall participation rate. Eurostat updated this extract on ${d.sourceUpdated}.`,
      checked:d.checked,sources:sourceLink(d.source,'Eurostat dataset')+' · '+sourceLink(d.extract,'Filtered source data'),
      graphic:dotPlot(width,{title,unit:'Residents taking at least one personal trip · %',footer:`Eurostat · EU27 · ${year}`,rows,limit:100,ticks:[0,25,50,75,100],
        reference:average,referenceLabel:`EU residents aged 15+ · ${number(average,2)}%`,format:(v,tick)=>number(v,tick?0:2)+'%'}),
      table:table(['Age band',year+' participation','Gap vs. ages 15+'],d.records.map(r=>[escape(r.age),number(r.shares[i],2)+'%',r.aggregate?'Reference':signed(r.shares[i]-average,2)+' pp'])),
      csv:[['Year','Age band','Participation (%)','EU ages 15+ (%)','Difference (percentage points)','Market','Measure','Source','Checked'],
        ...d.records.map(r=>[year,r.age,r.shares[i],average,round(r.shares[i]-average),d.market,d.method,d.extract,d.checked])]};
  }

  function carryOnPrices(width) {
    const d = carryOnBenchmark, offers = benchmarks(), fields = global.ATLAS_MODEL_FEATURES.fields;
    if (!offers.length) return null;
    const ref = offers.find(o=>o.id === state.reference) || offers[0];
    const feature = fields.find(f=>f.id===state.feature);
    const filters = select('benchmarkReference','Reference carry-on',offers.map(o=>[o.id,o.model.brand+' · '+o.model.model]),ref.id) +
      select('benchmarkFeature','Feature in the table',benchmarkFeatures.map(id=>[id,fields.find(f=>f.id===id).label]),feature.id);
    const dates = offers.map(o=>o.price.date).sort(), period = dates[0]+' to '+dates.at(-1);
    const delta = o => round(o.price.amount - ref.price.amount);
    const pct = o => 100 * delta(o) / ref.price.amount;
    const title = 'What does each carry-on cost in the U.S.?';
    const chartRows = offers.map(o=>({label:o.model.brand,value:o.price.amount,selected:o.id===ref.id}));
    const high = offers.at(-1), low = offers[0], limit = Math.ceil(high.price.amount / 100) * 100;
    const headers = ['Exact offer','Observed USD','Gap vs. reference',feature.label,'Evidence'];
    const visible = offers.map(o=>{
      const spec = o.model.features[feature.id], p = o.price;
      return [link('features.html?model='+encodeURIComponent(o.id),o.model.brand+' · '+o.model.model),
        money(p.amount)+'<small>'+escape(p.kind)+'</small>', o===ref ? 'Reference' : signedMoney(delta(o))+'<small>'+signed(pct(o))+'%</small>',
        spec ? escape(spec.value)+'<small>'+sourceLink(spec.source || o.model.source,'Feature source')+' · '+escape(o.model.checked)+'</small>' : 'Unverified for this offer',
        sourceLink(p.source,o.store)+'<small>'+escape(p.date)+'</small>'];
    });
    return {title,eyebrow:'United States · exact retail offers',period:`${offers.length} selected single carry-ons · displayed USD · price observations ${period}`,filters,
      metric:money(ref.price.amount),label:`Reference · ${ref.model.brand} · ${ref.model.model}`,
      reading:`The lowest observed offer was ${money(low.price.amount)} (${low.model.brand}). The highest was ${money(high.price.amount)} (${high.model.brand}).`,
      note:'Read the price basis beside each offer. Clearance, promotions and regular displayed prices are all represented. The feature selector lets you check what each source documents.',
      method:d.selection,checked:dates.at(-1),status:'Price observations '+period,sources:link('./#workbench','Open the Atlas comparison tool →'),
      graphic:dotPlot(width,{title,unit:'Displayed price per carry-on · USD',footer:`Luggage Atlas · U.S. offers · ${dates[0]} – ${dates.at(-1)}`,rows:chartRows,limit,
        ticks:[0,limit/2,limit],reference:ref.price.amount,referenceLabel:`${ref.model.brand} reference · ${money(ref.price.amount)}`,format:(v,tick)=>tick?'$'+number(v,0):money(v)}),
      table:table(headers,visible),csv:[['Offer ID','Brand','Exact product / variant','Storefront','Market','Currency','Observed price','Price basis','Price observation','Reference offer ID','Reference price','Difference (USD)','Difference (%)','Selected feature','Feature evidence','Feature basis','Feature source','Feature checked','Price source'],
        ...offers.map(o=>{const f=o.model.features[feature.id],p=o.price;return [o.id,o.model.brand,o.model.model,o.store,p.market,p.currency,p.amount,p.kind,p.date,ref.id,ref.price.amount,delta(o),round(pct(o)),feature.label,f?.value||'Unverified for this offer',f?.basis||'',f ? f.source||o.model.source : '',f ? o.model.checked : '',p.source];})]};
  }

  const builders = {market:marketOutlook, growth:salesGrowth, travelers:demographics, benchmarks:carryOnPrices};
  let active, current;
  function show(view) {
    active = view;
    const activeControl = document.activeElement?.id;
    const small = window.matchMedia('(max-width: 600px)').matches;
    current = builders[view](small ? 375 : 630);
    if (!current) {
      byId('marketChart').textContent='No matching priced offers are available.';
      for (const id of ['marketFilters','marketEyebrow','marketPeriod','marketSources','marketReading','marketMethod','marketTable','marketStatus']) byId(id).replaceChildren();
      byId('marketTitle').textContent='Carry-on benchmarks';
      byId('marketCsv').disabled=byId('marketSvg').disabled=true;
      return;
    }
    const v = current;
    byId('marketCsv').disabled=byId('marketSvg').disabled=false;
    byId('marketFilters').innerHTML=v.filters;
    byId('marketFilters').hidden=!v.filters;
    byId('marketEyebrow').textContent=v.eyebrow;
    byId('marketTitle').textContent=v.title;
    byId('marketPeriod').textContent=v.period;
    byId('marketChart').innerHTML=v.graphic;
    byId('marketSources').innerHTML=v.sources;
    byId('marketReading').innerHTML=`<span class="market-metric">${escape(v.metric)}</span><h3>${escape(v.label)}</h3><p>${escape(v.reading)}</p><hr><p>${escape(v.note)}</p>`;
    byId('marketMethod').textContent=v.method;
    byId('marketTable').innerHTML=v.table;
    byId('marketStatus').textContent=v.status || 'Source checked '+v.checked;
    if(activeControl && byId('marketFilters').contains(byId(activeControl))) byId(activeControl).focus({preventScroll:true});
  }
  function bind(exportCsv,exportSvg) {
    const keys = {growthSeries:'series',growthPeer:'peer',growthFrom:'from',travelerPopulation:'population',
      travelerYear:'year',benchmarkReference:'reference',benchmarkFeature:'feature'};
    byId('marketFilters').addEventListener('change',event=>{
      const key = keys[event.target.id];
      if (!key) return;
      state[key] = ['from','year'].includes(key) ? Number(event.target.value) : event.target.value;
      if(key==='series' && state.series===state.peer) state.peer='';
      show(active);
    });
    byId('marketCsv').addEventListener('click',()=>{if(current)exportCsv(current.csv,'Luggage_Atlas_'+active+'.csv');});
    byId('marketSvg').addEventListener('click',()=>{if(current)exportSvg(current.graphic,'Luggage_Atlas_'+active+'.svg');});
    window.matchMedia('(max-width: 600px)').addEventListener('change',()=>{if(active && !byId('marketWorkspace').hidden)show(active);});
  }
  global.AtlasMarketResearch = {views,bind,show,cagr,benchmarks};
})(typeof window !== 'undefined' ? window : globalThis);
