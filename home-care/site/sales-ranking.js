(function () {
  'use strict';
  const model = window.HCSalesModel;
  const metrics = new Map();
  let refresh = () => {};
  let panel, groupSelect, summary, rankButton, rankControls;
  let groups = [], activeGroup = null, rankById = new Map();
  let baseCount = 0, countWithEvidence = 0, excludedCount = 0;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLabel = date => /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : 'Not recorded';
  const kindLabel = kind => kind === 'purchase' ? 'Purchase badge' : kind === 'tracker' ? 'Third-party tracker count' : 'Published sold count';
  const metricFor = item => metrics.get(item.id) || null;

  function mount(items, redraw) {
    if (panel) return;
    if (!model) throw new Error('Sales ranking model did not load');
    refresh = redraw;
    for (const item of items) metrics.set(item.id, model.parseMetric(item));
    panel = document.createElement('div');
    panel.className = 'hc-sales-panel';
    panel.id = 'sales-ranking';
    panel.innerHTML = '<div class="hc-sales-heading"><div><strong>Units sold & purchase counts</strong><p id="sales-ranking-summary" aria-live="polite">Compare the published counts collected for this catalogue.</p></div><button type="button" id="rank-by-sales" aria-pressed="false">Rank by sales ↓</button></div><div id="sales-ranking-controls" hidden><label for="sales-comparison-group">Compare the same retailer, period and snapshot<select id="sales-comparison-group"></select></label><p class="hc-sales-explainer">Ranks use the displayed count. Purchase badges are approximate; “+” means at least that many. Sold totals with no stated period are not monthly sales. These are saved snapshots, not a live retailer bestseller list.</p><button type="button" id="sales-browse-all" class="hc-sales-back">Back to all products</button></div>';
    const moreFilters = $('more-filters').closest('.filter-line');
    moreFilters.before(panel);
    groupSelect = $('sales-comparison-group');
    rankControls = $('sales-ranking-controls');
    summary = $('sales-ranking-summary');
    rankButton = $('rank-by-sales');
    rankButton.addEventListener('click', () => { $('sort').value = $('sort').value === 'sales' ? 'listed' : 'sales'; refresh(); });
    $('sales-browse-all').addEventListener('click', () => { $('sort').value = 'listed'; refresh(); });
    groupSelect.addEventListener('change', () => refresh());
  }

  function rankRows(rows) {
    baseCount = rows.length;
    countWithEvidence = rows.filter(item => metricFor(item)).length;
    excludedCount = rows.filter(item => { const metric = metricFor(item); return metric && !metric.eligible; }).length;
    groups = model.groupRows(rows);
    const chosen = groupSelect.value;
    const options = groups.map(group => { const option = document.createElement('option'); option.value = group.key; option.textContent = group.label + ' · ' + group.entries.length.toLocaleString() + ' listings'; return option; });
    groupSelect.replaceChildren(...options);
    groupSelect.disabled = !groups.length;
    if (groups.some(group => group.key === chosen)) groupSelect.value = chosen;
    activeGroup = groups.find(group => group.key === groupSelect.value) || null;
    const ranked = activeGroup ? model.rankGroup(activeGroup) : [];
    rankById = new Map(ranked.map(entry => [entry.item.id, entry]));
    return ranked.map(entry => entry.item);
  }

  function decorateCard(item, ranking) {
    const card = $('product-grid').querySelector('[data-id="' + CSS.escape(item.id) + '"]');
    if (!card) return;
    const metric = metricFor(item), body = card.querySelector('.body');
    const viewLink = card.querySelector('a.view');
    if (viewLink) viewLink.href = ranking && metric?.itemUrl ? metric.itemUrl : item.url;
    let badge = card.querySelector('.hc-sales-rank');
    const ranked = ranking && rankById.get(item.id);
    if (ranked) {
      if (!badge) { badge = document.createElement('p'); badge.className = 'hc-sales-rank'; body.prepend(badge); }
      badge.textContent = '#' + ranked.rank + (ranked.tied ? ' · tied' : '') + ' in this sales group';
      badge.dataset.rank = String(ranked.rank);
    } else if (badge) badge.remove();
    if (card.querySelector('.hc-sales-evidence')) return;
    card.querySelectorAll('.sales-count').forEach(node => { node.hidden = true; });
    const evidence = document.createElement('div');
    evidence.className = 'hc-sales-evidence' + (metric ? '' : ' hc-sales-unavailable');
    if (!metric) {
      evidence.textContent = 'Units sold: No sourced count available';
    } else {
      const source = metric.sourceUrl ? '<a href="' + esc(metric.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Sales source ↗</a>' : 'Source not recorded';
      const exactListing = metric.itemUrl && metric.itemUrl !== metric.sourceUrl ? ' · <a href="' + esc(metric.itemUrl) + '" target="_blank" rel="noopener noreferrer">Exact listing ↗</a>' : '';
      evidence.innerHTML = '<p class="hc-sales-value"><strong>' + esc(metric.display) + '</strong><span>' + esc(kindLabel(metric.kind)) + '</span></p><p>Period: ' + esc(metric.period) + '<br>Snapshot: ' + esc(dateLabel(metric.observedAt)) + '</p><p>' + source + exactListing + '</p>' + (!metric.eligible ? '<p class="hc-sales-caution">Not ranked: ' + esc(metric.reason) + '</p>' : '');
      const details = card.querySelector('.product-details');
      if (details) {
        const caveat = document.createElement('p');
        caveat.className = 'hc-sales-method';
        caveat.innerHTML = '<strong>About this sales count</strong>' + esc(metric.qualifier) + ' ' + esc(item.metricNote || 'Published platform count; exact pack, variants and current totals may differ.') + '<br>' + (item.salesVerifiedThisPass ? 'Recorded as checked in its saved source pass.' : 'Prior sourced snapshot; not reverified in the saved source pass.') + ' This ranking update does not refresh the underlying sales count.';
        details.append(caveat);
      }
    }
    body.querySelector('.actions').before(evidence);
  }

  function afterDraw(rows, shown) {
    const ranking = $('sort').value === 'sales';
    panel.classList.toggle('is-ranking', ranking);
    rankControls.hidden = !ranking;
    rankButton.setAttribute('aria-pressed', String(ranking));
    rankButton.textContent = ranking ? 'Sales ranking on ✓' : 'Rank by sales ↓';
    if (!ranking) {
      rankById.clear(); activeGroup = null;
      const withCount = rows.filter(item => metricFor(item)).length;
      summary.textContent = withCount.toLocaleString() + ' of ' + rows.length.toLocaleString() + ' listings in this view have published counts. Rank them within the same retailer and period.';
    } else if (activeGroup) {
      const noCount = baseCount - countWithEvidence;
      summary.textContent = rows.length.toLocaleString() + ' ranked listings · ' + activeGroup.label + '. ' + noCount.toLocaleString() + ' filtered listings have no sourced count in this catalogue and remain in Browse.' + (excludedCount ? ' ' + excludedCount + ' more have incomplete ranking evidence.' : '');
      $('retailer-coverage').textContent = 'Ranked only within the selected sales group. Latest saved snapshot per listing; source dates and periods are shown below.';
    } else {
      summary.textContent = 'No comparable sales counts are available for these filters. Change the retailer or category, or return to all products.';
    }
    for (const item of shown) decorateCard(item, ranking);
    const empty = $('empty');
    const originalMessage = 'No collected listings match these filters. An empty category does not mean the retailer stocks no products. ';
    if (empty.firstChild && empty.firstChild.nodeType === Node.TEXT_NODE) empty.firstChild.textContent = ranking && !rows.length ? 'No comparable published sales counts in this view. Products remain available in Browse. ' : originalMessage;
  }

  function exportValue(item, field) {
    const targetValue = window.HCTargetInspiration?.exportValue?.(item, field);
    if (targetValue !== undefined) return targetValue;
    if (field === 'salesRankInView' || field === 'salesRankingGroup') {
      const analysisRank = window.HCMerchantAnalytics?.exportRank?.(item);
      if (analysisRank) return analysisRank[field];
      // A hidden browse filter must not label comparisons or opportunity exports.
      if ($('catalog-view')?.hidden) return '';
    }
    const metric = metricFor(item);
    const ranked = $('sort').value === 'sales' && rankById.get(item.id);
    const values = {
      salesRankInView: ranked ? ranked.rank : '',
      salesRankingGroup: ranked ? activeGroup.label : '',
      salesCountValue: metric ? metric.value : '',
      salesCountQualifier: metric ? metric.qualifier : '',
      salesCountStatus: !metric ? 'No sourced count available' : metric.eligible ? 'Published source snapshot' : 'Not ranked: ' + metric.reason,
      salesMetricType: metric ? kindLabel(metric.kind) : '',
      salesPeriodNormalized: metric ? metric.period : '',
      salesSnapshotDate: metric ? metric.observedAt : '',
      salesEvidenceSource: metric ? metric.sourceUrl : '',
      salesExactListing: metric ? metric.itemUrl : ''
    };
    return Object.prototype.hasOwnProperty.call(values, field) ? values[field] : item[field];
  }
  window.HomeCareSalesRanking = {mount, rankRows, afterDraw, exportValue};
})();
