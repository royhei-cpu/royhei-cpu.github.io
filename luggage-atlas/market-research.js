(function mountMarketResearch(global) {
  'use strict';

  const research = global.ATLAS_RESEARCH;
  const views = ['market', 'growth', 'travelers', 'benchmarks'];
  const {outlook, annualSales, travelParticipation, travelerIncome, carryOnBenchmark} = research;
  const brandSeries = ['samsonite', 'tumi', 'americanTourister'];
  const benchmarkFeatures = ['dimensions', 'weight', 'material', 'wheels', 'expansion', 'laptop',
    'brake', 'compression', 'organization', 'tracking'];
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
      const model = models.get(id), annotation = carryOnBenchmark.annotations[id];
      if (!model || !annotation) return [];
      const storefront = p => p.retailer === 'Brand / source storefront'
        ? (p.market === 'Target US' ? 'Target US' : model.brand) : p.retailer;
      const reviewed = p => p.date === annotation.observation.date && p.amount === annotation.observation.amount;
      const matches = global.ATLAS.prices.filter(p => {
        if (p.brand !== model.brand || p.product !== model.model || p.source !== model.source) return false;
        if (p.format !== 'Carry-on' || p.currency !== carryOnBenchmark.currency || !['United States','Target US'].includes(p.market)) return false;
        if (storefront(p) !== annotation.store || (annotation.sku && p.sku !== annotation.sku)) return false;
        if (['color','size'].some(key=>annotation[key] && p[key] && p[key].toLowerCase() !== annotation[key].toLowerCase())) return false;
        if (p.seller && p.seller !== annotation.seller) return false;
        if (annotation.marketplace && !p.seller && !reviewed(p)) return false;
        return Number.isFinite(p.amount) && p.amount > 0;
      }).sort((a, b) => b.date.localeCompare(a.date));
      const price = matches[0];
      if (!price) return [];
      const regularPrice = matches.find(p => Number.isFinite(p.regular) && p.regular > 0);
      const observation = reviewed(price) ? annotation.observation : {};
      const seller = price.seller || (reviewed(price) ? annotation.seller : '');
      return [{id, model, price, store:annotation.store, seller, annotation, observation, regularPrice,
        auditedPrice:matches.find(reviewed)}];
    }).sort((a, b) => a.price.amount - b.price.amount);
  }

  function select(id, label, choices, selected) {
    return `<label for="${id}">${escape(label)}<select id="${id}">${choices.map(([value, name]) =>
      `<option value="${escape(value)}"${String(value) === String(selected) ? ' selected' : ''}>${escape(name)}</option>`
    ).join('')}</select></label>`;
  }

  // The same SVG is displayed and downloaded. Units, period and source travel with the graphic.
  function svg(width, contentHeight, title, subtitle, footer, body) {
    const height = contentHeight + footer.length * 16 + 8;
    const notes = footer.map((item,i) => {
      const [label, url] = item, y = contentHeight + 13 + i * 16;
      const caption = text(8,y,label,`font-size="11" fill="${muted}"${url ? ' text-decoration="underline"' : ''}`);
      return url ? `<a href="${escape(url)}" target="_blank" rel="noopener">${caption}</a>` : caption;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="marketSvgTitle marketSvgDesc">
      <title id="marketSvgTitle">${escape(title)}</title><desc id="marketSvgDesc">${escape(subtitle)}. ${escape(footer.map(item=>item[0]).join('. '))}</desc>
      <rect width="100%" height="100%" fill="#fff"/>
      <g font-family="Arial, sans-serif" fill="${ink}">${body}${notes}</g></svg>`;
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
      marks += `<rect x="${x - bw / 2}" y="${y}" width="${bw}" height="${bottom - y}" fill="${projected ? 'url(#projectedFill)' : r.year === d.cagr.from ? '#648979' : green}"/>`;
      marks += text(x, y - 7, '$' + number(r.amount), 'text-anchor="middle" font-size="16" font-weight="bold"');
      marks += text(x, bottom + 20, r.year, 'text-anchor="middle" font-size="15"');
      marks += text(x, bottom + 37, r.basis, `text-anchor="middle" font-size="11" fill="${muted}"`);
    });
    const title = 'How large is the global luggage market?';
    const rate = d.cagr, intervals = rate.to - rate.from;
    const baseline = records.find(r=>r.year===rate.from), projection = records.find(r=>r.year===rate.to);
    const implied = cagr(baseline.amount,projection.amount,intervals);
    marks += text(8,248,rate.from+'–'+rate.to+' forecast CAGR: '+number(rate.percent)+'%', 'font-size="13" font-weight="bold"');
    return {title, eyebrow:'Worldwide · market outlook', period:'Selected years · worldwide travel, business and casual bags · USD billions',
      filters:'', metric:number(rate.percent) + '%', label:'Forecast compound annual growth rate',
      reading:`Grand View Research projects $${number(projection.amount)} billion in ${rate.to}, from an estimated $${number(baseline.amount)} billion in ${rate.from}.`,
      note:`The two endpoints imply ${number(implied,4)}% CAGR across ${intervals} annual intervals. Each bar represents one selected year.`,
      method:d.method+' '+d.sourceNote, sources:sourceLink(d.source, 'Report, scope and forecast'), checked:d.checked,
      graphic:svg(width, 258, title, d.method, [
        ['Selected years · worldwide travel, business and casual bags'],
        [`Endpoints imply ${number(implied,4)}% over ${intervals} annual intervals.`],
        ['Main table rate used. The FAQ and chart description disagree.'],
        ['Grand View Research · report summary and main table',d.source]
      ], marks),
      table:table(['Year','Revenue · USD billions','Evidence'], records.map(r => [r.year, number(r.amount), escape(r.basis)])),
      csv:[['Year','Global revenue (USD billions)','Evidence','Forecast CAGR (%)','CAGR from','CAGR to','Market','Publisher','Scope / method','Source','Checked','Annual intervals','Endpoint-implied CAGR (%)','Publisher discrepancy'],
        ...records.map(r => [r.year,r.amount,r.basis,r.year === rate.to ? rate.percent : '',r.year === rate.to ? rate.from : '',
          r.year === rate.to ? rate.to : '',d.market,d.publisher,d.method,d.source,d.checked,
          r===projection ? intervals : '',r===projection ? round(implied,4) : '',d.sourceNote])]};
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
    const intervals = last.year - first.year, prior = records.at(-2);
    const rate = key => cagr(first[key],last[key],intervals);
    const yoy = key => 100 * (last[key] / prior[key] - 1);
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
    const reports = [...new Set(records.map(r=>r.report))];
    const reportLinks = reports.map(report=>sourceLink(d.sources[report],'FY '+report+' filing')).join(' · ');
    const footer = [
      [`${period} · ${intervals} annual interval${intervals === 1 ? '' : 's'} · latest YoY FY ${prior.year}–${last.year}`],
      ...keys.flatMap(key=>[
        [d.series[key]+' · CAGR '+signed(rate(key))+'% · latest YoY '+signed(yoy(key))+'%'],
        [d.seriesScope[key]]
      ]),
      ['Worldwide reported USD. Group, category and brand totals overlap.'],
      ...reports.map(report=>['Samsonite Group · FY '+report+' filing',d.sources[report]])
    ];
    return {title, eyebrow:'Company benchmark · reported sales', period:`${period} · fiscal years ended December 31 · USD millions`, filters,
      metric:signed(rate(series))+'%',label:`Historical CAGR · ${d.series[series]} · ${period}`,
      reading:`${d.series[series]} went from $${number(first[series])}m to $${number(last[series])}m across ${intervals} annual interval${intervals===1?'':'s'}. Its FY ${prior.year}–${last.year} change was ${signed(yoy(series))}%.`,
      note:peer ? `${d.series[peer]} recorded ${signed(rate(peer))}% CAGR over the same period and ${signed(yoy(peer))}% in the latest fiscal year.` : d.seriesScope[series]+'. Group, category and brand totals overlap.',
      method:`${d.method} CAGR uses (ending sales ÷ starting sales) raised to the power of 1 ÷ elapsed years, minus one. The separate nine-month sales view uses company-reported constant-currency changes.`,
      checked:d.checked, sources:reportLinks, graphic:svg(width,242,title,period,footer,marks),
      table:table(['Fiscal year',...keys.map(key=>d.series[key]+' · USD m'),'Filing'],records.map(r=>[r.year,...keys.map(key=>number(r[key])),sourceLink(d.sources[r.report],'FY '+r.report)])),
      csv:[['Fiscal year','Series','Reported net sales (USD millions)','CAGR from','CAGR to','Historical CAGR (%)','Market','Source','Checked','Series scope','Annual intervals','Latest YoY from','Latest YoY to','Latest YoY (%)','Reporting basis and overlap','CAGR start source','CAGR end source'],
        ...records.flatMap(r=>keys.map(key=>[r.year,d.series[key],r[key],first.year,last.year,r===last ? round(rate(key),4) : '',d.market,d.sources[r.report],d.checked,
          d.seriesScope[key],intervals,prior.year,last.year,r===last ? round(yoy(key),4) : '',d.method,d.sources[first.report],d.sources[last.report]]))]};
  }

  // Both population charts use a shared numeric axis across their bands.
  function dotPlot(width, {title, unit, footer, rows, limit, ticks, format, reference, referenceLabel}) {
    const left = width < 500 ? 119 : 154, right = width - (width < 500 ? 64 : 78);
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
    return svg(width,last + (reference!=null ? 49 : 20),title,unit,footer,marks);
  }

  function demographics(width) {
    const us = state.population === 'us';
    let filters = select('travelerPopulation','Population and measure',[
      ['eu','European Union · participation by age'],['us','United States · household income']
    ],state.population);
    if (us) {
      const d = travelerIncome, title = 'Household income of U.S. overseas air travelers';
      const rows = d.records.map(r=>({label:r.band,value:r.share}));
      return {title,exportKey:'travelers_US_'+d.periodId,eyebrow:'United States · outbound air travel',period:`${d.period} · U.S. residents flying overseas, excluding Canada and Mexico · combined annual household income`,filters,
        metric:'$'+number(d.median,0),label:'Median annual household income',
        reading:`The reported mean was $${number(d.mean,0)}. ${number(d.respondents,0)} respondents answered the income question.`,
        note:'NTTO weights the results to outbound air departures. Measuring a suitcase budget requires evidence from luggage purchasers.',
        method:d.method+' '+d.weighting, checked:d.checked, sources:sourceLink(d.source,'Survey workbook · Table 38')+' · '+sourceLink(d.methodology,'Survey methodology'),
        graphic:dotPlot(width,{title,unit:'Weighted share by annual household income · %',footer:[
          [d.period+' · U.S. residents flying overseas'],
          ['Excludes Canada and Mexico · weighted to air departures'],
          [number(d.respondents,0)+' respondents answered the income question.'],
          ['Median $'+number(d.median,0)+' · mean $'+number(d.mean,0)+' · household USD'],
          ['NTTO SIAT · outbound B1, Table 38, All U.S.',d.source],
          ['NTTO survey weighting methodology',d.methodology]
        ],rows,limit:30,ticks:[0,10,20,30],format:(v,tick)=>number(v,tick?0:1)+'%'}),
        table:table(['Annual household income (USD)','Weighted share of income respondents'],d.records.map(r=>[escape(r.band),number(r.share)+'%'])),
        csv:[['Annual household income band (USD)','Weighted share (%)','Income respondents','Median household income (USD)','Mean household income (USD)','Period','Market','Method','Source','Checked','Response base / weighting','Methodology source'],
          ...d.records.map(r=>[r.band,r.share,d.respondents,d.median,d.mean,d.period,d.market,d.method,d.source,d.checked,d.weighting,d.methodology])]};
    }
    const d = travelParticipation, year = state.year, i = d.years.indexOf(year);
    filters += select('travelerYear','Calendar year',d.years.map(y=>[y,y]),year);
    const ages = d.records.filter(r=>!r.aggregate), average = d.records.find(r=>r.aggregate).shares[i];
    const ordered = [...ages].sort((a,b)=>b.shares[i]-a.shares[i]), high = ordered[0], low = ordered.at(-1);
    const title = 'Who took an overnight trip in the EU?';
    const rows = ages.map(r=>({label:'Age '+r.age,value:r.shares[i]}));
    return {title,exportKey:'travelers_EU27_'+year,eyebrow:'European Union · travel participation',period:`${year} · residents aged 15+ · domestic or foreign overnight travel for personal purposes`,filters,
      metric:number(high.shares[i]-low.shares[i],2)+' pp',label:'Participation gap between the highest and lowest age bands',
      reading:`${number(high.shares[i],2)}% of residents aged ${high.age} took a trip, compared with ${number(low.shares[i],2)}% of those aged ${low.age}.`,
      note:'Each percentage uses its own age group as the denominator. The survey measures personal overnight travel. It does not identify luggage buyers.',
      method:`${d.method} The dashed marker shows the overall participation rate. Eurostat updated this extract on ${d.sourceUpdated}.`,
      checked:d.checked,sources:sourceLink(d.source,'Eurostat dataset')+' · '+sourceLink(d.extract,'Filtered source data'),
      graphic:dotPlot(width,{title,unit:'Within age band, ≥1 overnight personal trip · %',footer:[
        [`EU27 residents aged 15+ · ${year} · any destination`],
        ['Each age band uses all residents in that band as its denominator.'],
        ['Eurostat · filtered travel participation data',d.extract]
      ],rows,limit:100,ticks:[0,25,50,75,100],
        reference:average,referenceLabel:`Published EU ages 15+ aggregate · ${number(average,2)}%`,format:(v,tick)=>number(v,tick?0:2)+'%'}),
      table:table(['Age band',year+' participation','Gap vs. ages 15+'],d.records.map(r=>[escape(r.age),number(r.shares[i],2)+'%',r.aggregate?'Reference':signed(r.shares[i]-average,2)+' pp'])),
      csv:[['Year','Age band','Participation (%)','EU ages 15+ (%)','Difference (percentage points)','Market','Measure','Source','Checked','Denominator'],
        ...d.records.map(r=>[year,r.age,r.shares[i],average,round(r.shares[i]-average),d.market,d.method,d.extract,d.checked,
          r.aggregate ? 'Published aggregate for all EU27 residents aged 15+' : 'All EU27 residents in this age band'])]};
  }

  function variantName(offer) {
    return offer.model.model + (offer.annotation.size ? ' · '+offer.annotation.size : '');
  }

  function featureEvidence(offer, field) {
    const {annotation, model} = offer;
    const value = annotation.features?.[field];
    if (value) return {value, basis:annotation.featureBasis, source:annotation.source, checked:annotation.featureChecked};
    const recorded = model.features[field];
    if (recorded) return {...recorded, source:recorded.source || model.source, checked:recorded.checked || model.checked};
    return null;
  }

  function priceReferences(offers) {
    return offers.flatMap(offer => {
      const {id, price, regularPrice, auditedPrice} = offer;
      const basis = (key,p,regular=false) => ({key,offer,amount:regular ? p.regular : p.amount,
        basis:regular ? 'Displayed regular price' : p.kind,date:p.date,source:p.source});
      const choices = [basis(id,price)];
      if (regularPrice) choices.push(basis(id+'@regular',regularPrice,true));
      if (auditedPrice && auditedPrice!==price) {
        choices.push(basis(id+'@'+auditedPrice.date,auditedPrice));
        if (auditedPrice.regular > 0 && auditedPrice.regular!==regularPrice?.regular) {
          choices.push(basis(id+'@regular-'+auditedPrice.date,auditedPrice,true));
        }
      }
      return choices;
    });
  }

  function otherPrices(offer) {
    const {price, observation} = offer;
    const notes = [];
    if (Number.isFinite(price.regular)) notes.push('Regular '+money(price.regular));
    if (Number.isFinite(price.previousPrice)) notes.push('Previous '+money(price.previousPrice));
    if (Number.isFinite(observation.comparison)) notes.push(observation.comparisonLabel+' '+money(observation.comparison)+' (checked '+observation.comparisonChecked+')');
    return notes.join(' · ');
  }

  function pricePlot(width, title, offers, reference) {
    const limit = Math.ceil(Math.max(offers.at(-1).price.amount, reference.amount) / 100) * 100;
    const x = amount => 10 + amount / limit * (width - 20);
    let marks = text(8,17,'Observed U.S. retail price per carry-on · USD','font-size="13"');
    for (const tick of [0,limit/2,limit]) {
      const anchor = tick === 0 ? 'start' : tick === limit ? 'end' : 'middle';
      marks += text(x(tick),39,'$'+number(tick,0),`text-anchor="${anchor}" font-size="11"`);
    }
    const rowHeight = 85;
    offers.forEach((offer,i) => {
      const top = 60 + i * rowHeight;
      const label = text(8,top,offer.model.brand,'font-size="13" font-weight="bold" text-decoration="underline"');
      marks += `<a href="${escape(offer.price.source)}" target="_blank" rel="noopener">${label}</a>`;
      marks += text(width-8,top,money(offer.price.amount),'text-anchor="end" font-size="14" font-weight="bold"');
      marks += text(8,top+16,variantName(offer),'font-size="12"');
      marks += text(8,top+31,offer.price.kind+' · '+offer.price.date,`font-size="11" fill="${muted}"`);
      const y = top+45;
      marks += line(x(0),y,x(limit),y) + line(x(0),y,x(offer.price.amount),y,green,'stroke-width="2"');
      marks += line(x(reference.amount),y-6,x(reference.amount),y+6,gold,'stroke-width="2" stroke-dasharray="3 2"');
      marks += dot(x(offer.price.amount),y,offer.id===reference.offer.id ? gold : green);
      const related = otherPrices(offer);
      if (related) marks += text(8,top+63,related,`font-size="11" fill="${muted}"`);
    });
    const footer = [
      ['Dashed mark · '+reference.offer.model.brand+' reference '+money(reference.amount),reference.source],
      [variantName(reference.offer)],
      [reference.basis+' · '+reference.date],
      ['Before tax and shipping · select a brand for its price source.']
    ];
    return svg(width,60+(offers.length-1)*rowHeight+73,title,'Selected U.S. retail offers in USD',footer,marks);
  }

  function carryOnPrices(width) {
    const d = carryOnBenchmark, offers = benchmarks(), fields = global.ATLAS_MODEL_FEATURES.fields;
    if (!offers.length) return null;
    const references = priceReferences(offers);
    const ref = references.find(r=>r.key===state.reference) || references[0];
    const feature = fields.find(f=>f.id===state.feature);
    const filters = select('benchmarkReference','Reference offer and price basis',references.map(r=>[
      r.key,r.offer.model.brand+' · '+variantName(r.offer)+' · '+money(r.amount)+' · '+r.basis+' · '+r.date
    ]),ref.key) + select('benchmarkFeature','Feature in the table',benchmarkFeatures.map(id=>[
      id,id==='laptop' ? 'Laptop / front access' : fields.find(f=>f.id===id).label
    ]),feature.id);
    const dates = offers.map(o=>o.price.date).sort(), period = dates[0]+' to '+dates.at(-1);
    const title = 'What does each carry-on cost in the U.S.?';
    const rows = offers.map(offer => {
      const {price, model, store, seller, annotation, observation} = offer;
      const spec = featureEvidence(offer,feature.id);
      const gap = round(price.amount - ref.amount), percent = round(100 * gap / ref.amount);
      const comparator = otherPrices(offer), identifier = annotation.sku || annotation.identifier || '';
      const refLabel = ref.offer.model.brand+' · '+money(ref.amount)+' · '+ref.basis+' · '+ref.date;
      const visible = [
        link('features.html?model='+encodeURIComponent(offer.id),model.brand+' · '+variantName(offer))+
          (identifier ? '<small>'+escape(identifier)+'</small>' : ''),
        money(price.amount)+'<small>'+escape(price.kind)+' · '+escape(price.date)+'</small>'+
          (comparator ? '<small>'+escape(comparator)+'</small>' : ''),
        signedMoney(gap)+'<small>'+signed(percent,2)+'% · vs. '+escape(refLabel)+'</small>',
        spec ? escape(spec.value)+'<small>'+sourceLink(spec.source,'Feature source')+' · '+escape(spec.checked)+'</small>' : 'Not yet recorded',
        sourceLink(price.source,store)+'<small>Seller · '+escape(seller || 'Not recorded')+'</small>'+
          (annotation.offerNote ? '<small>'+escape(annotation.offerNote)+'</small>' : '')
      ];
      const csv = [offer.id,model.brand,variantName(offer),store,price.market,price.currency,price.amount,price.kind,price.date,
        ref.offer.id,ref.amount,gap,percent,feature.label,spec?.value || 'Not yet recorded',spec?.basis || '',spec?.source || '',spec?.checked || '',price.source,
        seller,identifier,price.regular ?? '',price.previousPrice ?? '',observation.comparison ?? '',observation.comparisonLabel || '',
        ref.basis,ref.date,ref.source,annotation.offerNote || '',observation.comparisonChecked || ''];
      return {visible,csv};
    });
    const low = offers[0], high = offers.at(-1);
    return {title,eyebrow:'United States · exact retail offers',period:`${offers.length} selected single carry-ons · displayed USD · price observations ${period}`,filters,
      metric:money(ref.amount),label:`Reference · ${ref.offer.model.brand} · ${variantName(ref.offer)}`,
      reading:ref.basis+' · '+ref.date+'. Every gap uses the observed offer price minus this reference. Percentage gaps use the reference as the denominator.',
      note:`The observed range is ${money(low.price.amount)} to ${money(high.price.amount)}. Selecting a regular reference keeps each dated offer price in the comparison.`,
      method:d.selection+' A missing feature means the Atlas has no recorded evidence for that offer.',checked:d.checked,
      status:'Price observations '+period,sources:link('./#workbench','Open the Atlas comparison tool →'),
      graphic:pricePlot(width,title,offers,ref),
      table:table(['Exact offer','Observed USD and price basis','Gap vs. reference',feature.label,'Price evidence and seller'],rows.map(r=>r.visible)),
      csv:[['Offer ID','Brand','Exact product / variant','Storefront','Market','Currency','Observed price','Price basis','Price observation','Reference offer ID','Reference price','Difference (USD)','Difference (%)','Selected feature','Feature evidence','Feature basis','Feature source','Feature checked','Price source',
        'Seller','SKU or retailer item ID','Displayed regular price (USD)','Previous price (USD)','Comparison value (USD)','Comparison value basis','Reference price basis','Reference observation date','Reference source','Offer qualification','Comparison value checked'],...rows.map(r=>r.csv)]};
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
    byId('marketCsv').addEventListener('click',()=>{if(current)exportCsv(current.csv,'Luggage_Atlas_'+(current.exportKey || active)+'.csv');});
    byId('marketSvg').addEventListener('click',()=>{if(current)exportSvg(current.graphic,'Luggage_Atlas_'+(current.exportKey || active)+'.svg');});
    window.matchMedia('(max-width: 600px)').addEventListener('change',()=>{if(active && !byId('marketWorkspace').hidden)show(active);});
  }
  global.AtlasMarketResearch = {views,bind,show,cagr,benchmarks};
})(typeof window !== 'undefined' ? window : globalThis);
