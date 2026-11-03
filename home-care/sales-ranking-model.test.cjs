const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMetric, groupRows, rankGroup } = require('./site/sales-ranking-model.js');

function amazon(id = '1', overrides = {}) {
  const asin = 'B' + String(id).padStart(9, '0');
  return {
    id: 'A-' + id, name: 'Product ' + id, retailer: 'Amazon US', hasSales: true,
    displaySales: '1K+ bought in past month', salesPeriod: 'Past month', metricDate: '2026-11-01',
    metricSource: 'https://www.amazon.com/dp/' + asin, url: 'https://www.amazon.com/dp/' + asin,
    salesEvidenceKind: 'Retailer purchase badge', salesVerifiedThisPass: true, datePosted: '2026-11-01',
    ...overrides
  };
}

function tiktok(id = '1729492678943609637', overrides = {}) {
  return {
    id: 'T-' + id, name: 'TikTok product ' + id, retailer: 'TikTok Shop', hasSales: true,
    displaySales: '13.6K sold', salesPeriod: 'Period not stated', metricDate: '2026-10-31',
    metricSource: 'https://shop.tiktok.com/us/k/cleaning',
    url: 'https://shop.tiktok.com/us/pdp/cleaning-product/' + id,
    salesEvidenceKind: 'Retailer public sold count', salesVerifiedThisPass: true, datePosted: '2026-11-01',
    ...overrides
  };
}

test('parses magnitude, minimum signs and rounded displays without calling them exact units', () => {
  const metric = parseMetric(amazon('1', { displaySales: '100K+ bought in past month' }));
  assert.equal(metric.value, 100000);
  assert.equal(metric.display, '100K+ bought in past month');
  assert.equal(metric.kind, 'purchase');
  assert.equal(metric.isMinimum, true);
  assert.equal(metric.wasRounded, true);
  assert.match(metric.qualifier, /Minimum/);
  assert.match(metric.qualifier, /not audited exact units/);
  assert.equal(parseMetric(tiktok()).value, 13600);
  assert.equal(parseMetric(tiktok('1729492678943609638', { displaySales: '1,037,794 sold' })).value, 1037794);
  assert.equal(parseMetric(tiktok('1729492678943609639', { displaySales: '1.2M sold' })).value, 1200000);
  assert.equal(parseMetric(tiktok('1729492678943609640', { displaySales: '1B sold' })).value, 1000000000);
  assert.equal(parseMetric(tiktok('1729492678943609641', { displaySales: '1.001K sold' })).value, 1001);
});

test('does not convert missing data, reviews, prices or malformed counts into sales', () => {
  for (const displaySales of ['900 reviews', '4.8/5 · 1000 ratings', '$1,000 sold', '#1 best seller', 'No count available', '1,2 sold']) {
    assert.equal(parseMetric(amazon('1', { displaySales })), null, displaySales);
  }
  assert.equal(parseMetric(amazon('1', { hasSales: false })), null);
  assert.equal(parseMetric(amazon('1', { displaySales: '', sales: '' })), null);
  const zero = parseMetric(tiktok('1729492678943609637', { displaySales: '0 sold' }));
  assert.equal(zero.value, 0);
  assert.equal(zero.eligible, true);
});

test('uses the explicit count period before a missing or generic period field', () => {
  const item = {
    ...amazon('1'), retailer: 'Sam’s Club',
    displaySales: '600+ bought since yesterday', salesPeriod: undefined,
    metricSource: 'https://www.samsclub.com/browse/cleaning/15740520',
    url: 'https://www.samsclub.com/ip/cleaning-product/13850722468'
  };
  assert.equal(parseMetric(item).period, 'Since yesterday');
  assert.equal(parseMetric({ ...item, salesPeriod: 'Retailer rolling badge; no extrapolation' }).period, 'Since yesterday');
  assert.equal(parseMetric({ ...item, salesPeriod: 'Past month' }).period, 'Since yesterday');
  assert.equal(parseMetric(tiktok()).period, 'Period not stated');
});

test('requires a sales-specific observation date and rejects invalid dates', () => {
  for (const metricDate of [undefined, '', '2026-11', '2026-02-30', '2025-02-29', '2026-11-01T00:00:00Z']) {
    const metric = parseMetric(amazon('1', { metricDate, checkedDate: '2026-11-03' }));
    assert.equal(metric.observedAt, '');
    assert.equal(metric.eligible, false);
    assert.match(metric.reason, /Sales snapshot date/);
  }
  assert.equal(parseMetric(amazon('1', { metricDate: '2024-02-29' })).observedAt, '2024-02-29');
});

test('rejects unsafe links and broad storefront-only identity but keeps the displayed metric', () => {
  for (const metricSource of ['javascript:alert(1)', 'data:text/html,test', 'https://user:pass@www.amazon.com/dp/B000000001', '']) {
    const metric = parseMetric(amazon('1', { metricSource }));
    assert.equal(metric.sourceUrl, '');
    assert.equal(metric.eligible, false);
  }
  const storefront = tiktok('1729492678943609637', {
    metricSource: 'https://shop.tiktok.com/us/store/scrub-daddy/7494956340169509603',
    url: 'https://shop.tiktok.com/us/store/scrub-daddy/7494956340169509603'
  });
  assert.equal(parseMetric(storefront).value, 13600);
  assert.equal(parseMetric(storefront).eligible, false);
  assert.match(parseMetric(storefront).reason, /Exact product listing/);
  assert.equal(groupRows([storefront]).length, 0);
});

test('uses product-level sales evidence and does not confuse a category URL with an item', () => {
  const item = tiktok('1729492678943609637', {
    url: 'https://shop.tiktok.com/us/store/scrub-daddy/7494956340169509603',
    salesItemSource: 'https://shop.tiktok.com/us/pdp/product/1729384288999805667'
  });
  assert.match(parseMetric(item).itemIdentity, /1729384288999805667$/);
  const group = groupRows([tiktok(), tiktok('1729492678943609638')])[0];
  assert.equal(group.entries.length, 2);
  assert.equal(group.duplicatesRemoved, 0);
});

test('keeps retailers, reporting periods, snapshot dates and tracker counts in separate groups', () => {
  const tracker = tiktok('1732422619594199385', {
    displaySales: '2,553 sold (tracker)', salesEvidenceKind: 'Third-party tracker',
    metricSource: 'https://hashiq.io/shop/p/cleaner-1732422619594199385',
    url: 'https://hashiq.io/shop/p/cleaner-1732422619594199385',
    salesPeriod: 'Cumulative count reported by HashIQ; not audited sales'
  });
  const rows = [
    amazon('1'), amazon('2', { displaySales: '900 bought in past week', salesPeriod: 'Past week' }),
    amazon('3', { metricDate: '2026-10-27' }), tiktok(), tracker
  ];
  const groups = groupRows(rows);
  assert.equal(groups.length, 5);
  assert.equal(groups.filter(g => g.retailer === 'Amazon US').length, 3);
  assert.equal(groups.filter(g => g.kind === 'tracker').length, 1);
  assert.match(groups.find(g => g.kind === 'tracker').label, /third-party/);
  assert.equal(groups[0].retailer, 'Amazon US');
  assert.equal(groups[0].observedAt, '2026-11-01');
  assert.equal(groups[2].observedAt, '2026-10-27');
});

test('sorts numeric magnitudes and shares competition ranks on equal displayed values', () => {
  const rows = [
    amazon('1', { name: 'B', displaySales: '1K+ bought in past month' }),
    amazon('2', { name: 'C', displaySales: '900 bought in past month' }),
    amazon('3', { name: 'A', displaySales: '1,000 bought in past month' }),
    amazon('4', { name: 'D', displaySales: '2K+ bought in past month' })
  ];
  const ranked = rankGroup(groupRows(rows)[0]);
  assert.deepEqual(ranked.map(e => e.item.id), ['A-4', 'A-3', 'A-1', 'A-2']);
  assert.deepEqual(ranked.map(e => e.rank), [1, 2, 2, 4]);
  assert.deepEqual(ranked.map(e => e.tied), [false, true, true, false]);
  assert.equal(ranked[2].metric.display, '1K+ bought in past month');
});

test('keeps the latest listing snapshot once even when its newer count is lower', () => {
  const older = tiktok('1729492678943609637', { id: 'old', displaySales: '15K sold', metricDate: '2026-10-27' });
  const newer = tiktok('1729492678943609637', { id: 'new', displaySales: '13.6K sold' });
  const groups = groupRows([older, newer]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].entries[0].item.id, 'new');
  assert.equal(groups[0].entries[0].metric.value, 13600);
  assert.equal(groups[0].duplicatesRemoved, 1);
  assert.equal(groupRows([newer, older])[0].entries[0].item.id, 'new');
});

test('same-date duplicate preference uses verification then recorded addition date', () => {
  const old = amazon('1', { id: 'old', salesVerifiedThisPass: false, datePosted: '2026-11-03' });
  const verified = amazon('1', { id: 'verified', salesVerifiedThisPass: true, datePosted: '2026-11-01' });
  const later = amazon('1', { id: 'later', salesVerifiedThisPass: true, datePosted: '2026-11-02' });
  const group = groupRows([old, verified, later])[0];
  assert.equal(group.entries[0].item.id, 'later');
  assert.equal(group.duplicatesRemoved, 2);
});

test('deduplication does not remove another time window for the same listing', () => {
  const monthly = amazon('1');
  const weekly = amazon('1', { id: 'weekly', displaySales: '500 bought in past week', salesPeriod: 'Past week' });
  assert.equal(groupRows([monthly, weekly]).length, 2);
});

test('model functions leave catalogue records and group order unchanged', () => {
  const rows = [amazon('1'), tiktok(), amazon('2', { displaySales: '10K+ bought in past month' })];
  const original = JSON.parse(JSON.stringify(rows));
  const groups = groupRows(rows);
  const order = groups[0].entries.map(e => e.item.id);
  rankGroup(groups[0]);
  assert.deepEqual(rows, original);
  assert.deepEqual(groups[0].entries.map(e => e.item.id), order);
});
