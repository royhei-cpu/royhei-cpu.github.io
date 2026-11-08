(function () {
  'use strict';
  const PAGE_SIZE = 4;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  let context = null, panel = null, compareButton = null, observer = null;
  let page = 1, selectionSignature = '', mounted = false;

  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value.trim(), window.location.href);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch (_) { return ''; }
  }
  function dateLabel(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Not recorded';
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Not recorded';
    return date.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'});
  }
  function linked(value, label) {
    const url = safeUrl(value);
    return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + ' ↗</a>' : '<span class="hc-compare-muted">Not recorded</span>';
  }
  function selectedEntries() {
    return [...context.picks].map(id => ({id, item: context.byId.get(id)}));
  }
  function metricFor(item) {
    return item && window.HCSalesModel ? window.HCSalesModel.parseMetric(item) : null;
  }
  function photoFor(item) {
    if (!item) return '';
    const cachedPhoto = context.cached && context.cached.get(item.id)?.querySelector('img')?.getAttribute('src');
    return safeUrl(cachedPhoto || item.image || item.originalImage || '');
  }
  function itemUrl(item) {
    const metric = metricFor(item);
    return metric?.itemUrl || safeUrl(item.salesItemSource) || safeUrl(item.listingSource) || safeUrl(item.url);
  }
  function packText(item) {
    const explicit = item.packSize || item.pack || item.size || item.packageSize;
    if (typeof explicit === 'string' && explicit.trim()) return esc(explicit);
    const title = String(item.name || '');
    const matches = title.match(/\b\d+(?:[.,]\d+)?\s*(?:fl\.?\s*oz\b|fluid ounces?\b|oz\b|ounces?\b|counts?\b|ct\b|pk\b|packs?\b|pieces?\b|gallons?\b|gal\b|ml\b|lit(?:er|re)s?\b|kg\b|g\b|l\b|sheets?\b|rolls?\b|loads?\b|sq\.?\s*ft\b)|\b(?:pack|set)\s+of\s+\d+|\b\d+\s*[-–]\s*pack\b/gi);
    return matches && matches.length ? esc([...new Set(matches)].join(' · ')) + '<small>Wording in product title; verify the selected pack.</small>' : '<span class="hc-compare-muted">Not separately stated in the title</span>';
  }
  function salesValue(item) {
    const metric = metricFor(item);
    if (!metric) return '<span class="hc-compare-muted">No sourced numeric count available</span>';
    const kind = metric.kind === 'purchase' ? 'Purchase badge' : metric.kind === 'tracker' ? 'Third-party tracker count' : 'Published sold count';
    return '<strong>' + esc(metric.display) + '</strong><small>' + esc(kind) + '</small><small>' + esc(metric.qualifier) + '</small>';
  }
  function makeRow(label, items, render) {
    return '<tr><th scope="row">' + esc(label) + '</th>' + items.map(entry => '<td>' + (entry.item ? render(entry.item) : '<span class="hc-compare-muted">Saved item unavailable in this catalogue version</span>') + '</td>').join('') + '</tr>';
  }
  function render() {
    if (!panel || !context) return;
    const all = selectedEntries();
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    page = Math.max(1, Math.min(page, pages));
    const items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const exportable = all.filter(entry => entry.item).length;
    const missing = all.length - exportable;
    const heading = '<div class="hc-compare-heading"><div><p class="hc-compare-eyebrow">SELECTED PRODUCTS</p><h2 id="compare-title" tabindex="-1">Compare side by side</h2><p class="hc-compare-summary" aria-live="polite">' + all.length.toLocaleString() + ' selected' + (all.length > PAGE_SIZE ? ' · showing ' + ((page - 1) * PAGE_SIZE + 1) + '–' + Math.min(page * PAGE_SIZE, all.length) : '') + '. ' + (exportable ? 'CSV export includes all ' + exportable.toLocaleString() + ' available selected products.' : 'Select products to compare and export.') + '</p></div><div class="hc-compare-actions"><button type="button" data-compare-action="browse">Browse more products</button><button type="button" data-compare-action="export" class="hc-compare-primary"' + (exportable ? '' : ' disabled') + '>Export selected CSV' + (exportable ? ' (' + exportable.toLocaleString() + ')' : '') + '</button></div></div>';
    const exportNote = '<p class="hc-compare-export-note">Photos are shown here. CSV includes photo URLs and product/source links; the CSV format cannot embed image files.</p>';
    if (!all.length) {
      panel.innerHTML = heading + '<div class="hc-compare-empty"><h3>Choose products to compare</h3><p>Use <b>Select</b> on product cards in Browse competitors, Sales analysis or Opportunities. Your selections stay together when you change views or filters.</p><button type="button" data-compare-action="browse">Browse competitors</button></div>' + exportNote;
      return;
    }
    const singleNote = all.length === 1 ? '<p class="hc-compare-notice">One product selected. Select one more to compare them side by side.</p>' : '';
    const missingNote = missing ? '<p class="hc-compare-notice">' + missing + ' saved selection' + (missing === 1 ? ' is' : 's are') + ' unavailable in this catalogue version. They stay selected until you remove them and are not included in CSV.</p>' : '';
    const headers = items.map(({id, item}) => {
      const photo = photoFor(item);
      return '<th scope="col"><div class="hc-compare-product">' + (photo ? '<a href="' + esc(photo) + '" target="_blank" rel="noopener noreferrer" class="hc-compare-photo"><img loading="lazy" decoding="async" src="' + esc(photo) + '" alt="' + esc(item.name) + '"></a>' : '<div class="hc-compare-photo hc-compare-no-photo">Photo not available</div>') + '<span class="hc-compare-retailer">' + esc(item?.retailer || 'Saved selection') + '</span><h3>' + esc(item?.name || id) + '</h3><button type="button" data-compare-remove="' + esc(id) + '" aria-label="Remove ' + esc(item?.name || id) + ' from selection">Remove</button></div></th>';
    }).join('');
    const rows = [
      makeRow('Brand', items, d => esc(d.coverageBrand || d.brand || 'Not recorded')),
      makeRow('Category / scope', items, d => esc(d.categoryLabel || d.category || 'Not recorded') + '<small>' + esc(d.merchantScope || 'Scope not recorded') + '</small>'),
      makeRow('Pack / size', items, packText),
      makeRow('Saved price', items, d => '<strong>' + esc(d.displayPrice || d.price || 'Not recorded') + '</strong><small>' + esc(d.priceBasis || 'Saved offer; verify pack, seller and current checkout price.') + '</small>'),
      makeRow('Published sales signal', items, salesValue),
      makeRow('Sales reporting period', items, d => esc(metricFor(d)?.period || 'Not available')),
      makeRow('Sales snapshot date', items, d => esc(metricFor(d) ? dateLabel(metricFor(d).observedAt) : 'Not available')),
      makeRow('Sales comparison group', items, d => {
        const metric = metricFor(d);
        return metric ? esc(metric.groupLabel) + (!metric.eligible ? '<small>Not ranked: ' + esc(metric.reason) + '</small>' : '') : '<span class="hc-compare-muted">Not available</span>';
      }),
      makeRow('Source checked', items, d => esc(dateLabel(d.checkedDate)) + '<small>General source review; not a refreshed price or sales observation.</small>'),
      makeRow('Retailer first available', items, d => d.retailerListedDate ? esc(dateLabel(d.retailerListedDate)) + '<small>' + linked(d.retailerDateSource, 'Date evidence') + '</small>' : '<span class="hc-compare-muted">Not verified</span>'),
      makeRow('Product link', items, d => linked(itemUrl(d), 'Open product / reference')),
      makeRow('Sales evidence', items, d => linked(metricFor(d)?.sourceUrl || d.metricSource, 'Open sales source')),
      makeRow('Photo link', items, d => linked(photoFor(d), 'Open product photo')),
      makeRow('Photo source', items, d => linked(d.photoSource, 'Open photo source') + '<small>' + esc(d.photoVerification || 'Match and exact pack not independently verified.') + '</small>')
    ].join('');
    panel.innerHTML = heading + singleNote + missingNote + '<p class="hc-compare-guidance">Match the retailer, metric, reporting period and sales snapshot before comparing counts. Prices are saved pack offers; quantities and packs differ. No shared sales total or market ranking is calculated.</p><div class="hc-compare-table-scroll" role="region" aria-label="Selected product comparison; scroll horizontally for more products" tabindex="0"><table class="hc-compare-table" style="min-width:' + (168 + items.length * 252) + 'px"><caption class="hc-compare-sr-only">Comparison of selected Home Care products, saved prices and dated source evidence</caption><thead><tr><th scope="col" class="hc-compare-field">Product details</th>' + headers + '</tr></thead><tbody>' + rows + '</tbody></table></div><div class="hc-compare-paging"><button type="button" data-compare-action="previous"' + (page <= 1 ? ' disabled' : '') + '>← Previous ' + PAGE_SIZE + '</button><span>Page ' + page + ' of ' + pages + (all.length > PAGE_SIZE ? ' · ' + all.length.toLocaleString() + ' selected in total' : '') + '</span><button type="button" data-compare-action="next"' + (page >= pages ? ' disabled' : '') + '>Next ' + PAGE_SIZE + ' →</button></div>' + exportNote;
  }
  function sync() {
    if (!mounted) return;
    compareButton.textContent = 'Compare selected (' + context.picks.size.toLocaleString() + ')';
    compareButton.setAttribute('aria-expanded', String(!panel.hidden));
    const nextSignature = JSON.stringify([...context.picks]);
    if (nextSignature !== selectionSignature) {
      selectionSignature = nextSignature;
      render();
    }
  }
  function persist() {
    try { localStorage.setItem('hc-merchant-picks', JSON.stringify([...context.picks])); } catch (_) {}
    if (typeof context.redraw === 'function') context.redraw();
    document.dispatchEvent(new CustomEvent('hc-selection-change', {detail: {selectedCount: context.picks.size}}));
    sync();
  }
  function browse() {
    hide();
    if (typeof context.onBrowse === 'function') context.onBrowse();
    else if ($('catalog-view')) $('catalog-view').hidden = false;
  }
  function show() {
    if (!mounted) return;
    if (typeof context.onShow === 'function') context.onShow();
    else {
      if ($('catalog-view')) $('catalog-view').hidden = true;
      if ($('executive-view')) $('executive-view').hidden = true;
    }
    panel.hidden = false;
    render();
    sync();
    $('compare-title')?.focus({preventScroll: true});
    panel.scrollIntoView({block: 'start'});
  }
  function hide() {
    if (!panel) return;
    panel.hidden = true;
    compareButton.setAttribute('aria-expanded', 'false');
  }
  function mount(options) {
    if (mounted) return;
    if (!options?.byId || !options?.picks) throw new Error('Product comparison needs the shared catalogue and selections.');
    const exportButton = $('export'), catalog = $('catalog-view');
    if (!exportButton || !catalog) throw new Error('Product comparison requires the catalogue and CSV export control.');
    context = options;
    compareButton = document.createElement('button');
    compareButton.id = 'compare-selected';
    compareButton.type = 'button';
    compareButton.setAttribute('aria-controls', 'compare-view');
    compareButton.setAttribute('aria-expanded', 'false');
    const actions = document.createElement('div');
    actions.className = 'hc-compare-header-actions';
    exportButton.before(actions);
    actions.append(compareButton, exportButton);
    panel = document.createElement('section');
    panel.id = 'compare-view';
    panel.className = 'hc-compare-view';
    panel.setAttribute('aria-labelledby', 'compare-title');
    panel.hidden = true;
    catalog.after(panel);
    function openView(view, fallback) {
      const navigation = window.HCHomecareUpgradeController;
      if (navigation) navigation.navigate(view, {history: 'push', scroll: false});
      else fallback();
    }
    compareButton.addEventListener('click', () => openView('compare', show));
    panel.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-compare-remove')) {
        context.picks.delete(button.getAttribute('data-compare-remove'));
        persist();
        return;
      }
      const action = button.getAttribute('data-compare-action');
      if (action === 'browse') openView('catalog', browse);
      else if (action === 'export') exportButton.click();
      else if (action === 'previous' || action === 'next') {
        page += action === 'next' ? 1 : -1;
        render();
        panel.querySelector('[data-compare-action="' + action + '"]')?.focus({preventScroll: true});
      }
    });
    panel.addEventListener('error', event => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      const replacement = document.createElement('span');
      replacement.className = 'hc-compare-image-error';
      replacement.textContent = 'Photo could not be loaded';
      image.replaceWith(replacement);
    }, true);
    mounted = true;
    observer = new MutationObserver(sync);
    observer.observe(exportButton, {childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['disabled']});
    document.addEventListener('hc-selection-change', sync);
    render();
    sync();
  }
  window.HCProductCompare = Object.freeze({mount, show, hide, refresh: () => {if (mounted) {render(); sync();}}, isVisible: () => Boolean(panel && !panel.hidden)});
})();
