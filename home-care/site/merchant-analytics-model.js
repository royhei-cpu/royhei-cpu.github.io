(function (root, factory) {
  'use strict';
  const sales = typeof module === 'object' && module.exports ? require('./sales-ranking-model.js') : root.HCSalesModel;
  const api = factory(sales);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HCMerchantAnalyticsModel = api;
})(typeof window !== 'undefined' ? window : null, function (sales) {
  'use strict';
  const BAND_DEFINITIONS = [
    {key:'1-5',label:'$1–<$5',min:1,max:5},
    {key:'5-10',label:'$5–<$10',min:5,max:10},
    {key:'10-20',label:'$10–<$20',min:10,max:20},
    {key:'20-30',label:'$20–<$30',min:20,max:30},
    {key:'30-50',label:'$30–<$50',min:30,max:50},
    {key:'50-plus',label:'$50+',min:50,max:Infinity}
  ];

  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const parsed = new Date(value + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value ? value : '';
  }

  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value.trim());
      return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch (_) { return ''; }
  }

  function category(item) { return String(item.category || item.categoryLabel || 'Not assigned'); }

  function filterItems(items, filters = {}) {
    const scope = filters.scope || 'Home Care';
    const retailer = filters.retailer || 'all';
    const selectedCategory = filters.category || 'all';
    return (items || []).filter(item =>
      (scope === 'all' || item.merchantScope === scope) &&
      (retailer === 'all' || item.retailer === retailer) &&
      (selectedCategory === 'all' || category(item) === selectedCategory));
  }

  function countBy(rows, field) {
    const counts = new Map();
    for (const item of rows) {
      const key = field === 'category' ? category(item) : String(item[field] || 'Not stated');
      const label = field === 'category' ? String(item.categoryLabel || key) : key;
      if (!counts.has(key)) counts.set(key, {key,label,count:0});
      counts.get(key).count += 1;
    }
    return [...counts.values()].sort((a,b) => b.count-a.count || a.label.localeCompare(b.label,'en'));
  }

  function range(values) {
    const dates = values.map(date).filter(Boolean).sort();
    return {first:dates[0] || '',last:dates[dates.length-1] || ''};
  }

  function parsePrice(item) {
    // Use the displayed offer snapshot; raw missing-price placeholders are not prices.
    const display = String(item && item.displayPrice || '').trim();
    if (!display) return null;
    const match = display.match(/^(?:US\$|USD\s*\$?|\$)\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)$/i);
    const value = match ? Number(match[1].replace(/,/g,'')) : null;
    const sourceUrl = [item.priceSource,item.currentSource,item.url].map(safeUrl).find(Boolean) || '';
    const checkedAt = date(item.priceCheckedAt) || date(item.priceDate) || date(item.checkedDate);
    let reasonCode = '', reason = '';
    const basis = String(item.priceBasis || '');
    if (!match || (item.currency && String(item.currency).toUpperCase() !== 'USD')) {
      reasonCode = 'notSingleUSD'; reason = 'No single explicit USD offer price';
    } else if (!Number.isFinite(value) || value <= 0) {
      reasonCode = 'notPositive'; reason = 'No positive offer price';
    } else if (value < 1) {
      reasonCode = 'packCheck'; reason = 'Under $1: pack/unit price basis needs checking';
    } else if (/\bunit[- ]price\b|\bper (?:fl\.?\s*oz|oz|ounce|lb|pound|sheet|load|piece|count)\b|\bmember(?:s|ship)?[- ]only\b|\bmember(?:s|ship)? price\b|\b(?:after|with) (?:a )?coupon\b|\bsubscribe.{0,12}save\b|\bsubscription (?:only|price)\b|\bprice not (?:recorded|established|verified)\b|\bno price asserted\b/i.test(basis)) {
      reasonCode = 'conditionalOrUnit'; reason = 'Conditional, unit-price or unestablished price basis';
    } else if (!sourceUrl || !checkedAt) {
      reasonCode = 'missingEvidence'; reason = 'Source link or record-check date missing';
    }
    return {value,display,currency:'USD',sourceUrl,checkedAt,eligible:!reasonCode,reasonCode,reason,basis};
  }

  function priceBands(rows) {
    const bands = BAND_DEFINITIONS.map(band => ({...band,count:0,entries:[]}));
    const entries = [], reasons = new Map();
    let missingCount = 0, excludedCount = 0;
    for (const item of rows) {
      const price = parsePrice(item);
      if (!price) { missingCount += 1; continue; }
      if (!price.eligible) {
        excludedCount += 1;
        const previous = reasons.get(price.reasonCode) || {code:price.reasonCode,label:price.reason,count:0};
        previous.count += 1; reasons.set(price.reasonCode,previous);
        continue;
      }
      const entry = {item,price};
      entries.push(entry);
      const band = bands.find(b => price.value >= b.min && price.value < b.max);
      band.count += 1; band.entries.push(entry);
    }
    for (const band of bands) band.entries.sort((a,b) => b.price.checkedAt.localeCompare(a.price.checkedAt) || a.price.value-b.price.value || String(a.item.name).localeCompare(String(b.item.name),'en'));
    return {bands,entries,includedCount:entries.length,missingCount,excludedCount,exclusions:[...reasons.values()],dates:range(entries.map(e => e.price.checkedAt))};
  }

  function summarize(items, filters = {}) {
    if (!sales) throw new Error('The sales ranking model must load before merchant analytics');
    const rows = filterItems(items,filters);
    const metrics = rows.map(item => ({item,metric:sales.parseMetric(item)})).filter(entry => entry.metric);
    const groups = sales.groupRows(rows);
    const rankedListings = groups.reduce((total,group) => total+group.entries.length,0);
    const categoryBars = countBy(rows,'category');
    const retailerBars = countBy(rows,'retailer');
    const prices = priceBands(rows);
    return {
      rows,groups,categoryBars,retailerBars,prices,
      totals:{records:rows.length,retailers:retailerBars.length,categories:categoryBars.length,publishedCounts:metrics.length,rankedListings,priceSamples:prices.includedCount},
      availability:{rankedListings,otherCountRecords:metrics.length-rankedListings,withoutCount:rows.length-metrics.length},
      dates:{records:range(rows.map(item => item.checkedDate)),sales:range(metrics.map(entry => entry.metric.observedAt))}
    };
  }

  return Object.freeze({filterItems,countBy,parsePrice,priceBands,summarize});
});
