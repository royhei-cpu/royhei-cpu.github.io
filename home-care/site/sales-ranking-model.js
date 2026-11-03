(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HCSalesModel = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const KIND_ORDER = { purchase: 0, sold: 1, tracker: 2 };
  const NUMBER = /^\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*([kmb]?)\s*(\+)?\s+(sold|bought)\b/i;

  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value.trim());
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return '';
      return url.href;
    } catch (_) {
      return '';
    }
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const parsed = new Date(value + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : '';
  }

  function dateLabel(value) {
    if (!value) return 'snapshot date not recorded';
    const parts = value.split('-');
    return Number(parts[2]) + ' ' + MONTHS[Number(parts[1]) - 1] + ' ' + parts[0];
  }

  function periodIn(text) {
    const value = String(text || '').toLowerCase();
    if (/since yesterday/.test(value)) return 'Since yesterday';
    if (/\bpast month\b/.test(value)) return 'Past month';
    if (/\bpast week\b/.test(value)) return 'Past week';
    if (/\bpast day\b/.test(value)) return 'Past day';
    if (/\blast 30 days\b/.test(value)) return 'Last 30 days';
    if (/\blast 7 days\b/.test(value)) return 'Last 7 days';
    if (/\blast 24 hours\b/.test(value)) return 'Last 24 hours';
    return '';
  }

  function normalizePeriod(display, declared) {
    // The count itself is the primary evidence for its reporting window.
    const explicit = periodIn(display) || periodIn(declared);
    if (explicit) return explicit;
    const value = String(declared || '').trim();
    if (!value || /not stated|unspecified|not established|not provided|unknown|cumulative|rolling badge|not audited/i.test(value)) {
      return 'Period not stated';
    }
    return value;
  }

  function productIdentity(value, retailer, kind) {
    const href = safeUrl(value);
    if (!href) return null;
    const url = new URL(href);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const path = url.pathname.replace(/\/+$/, '');
    let id = '';
    let platform = '';

    if (host === 'amazon.com' || host.endsWith('.amazon.com')) {
      const match = path.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:\/|$)/i);
      if (match && retailer === 'Amazon US') { id = match[1].toUpperCase(); platform = 'amazon'; }
    } else if (host === 'shop.tiktok.com' || host === 'tiktok.com') {
      const match = path.match(/\/(?:pdp|product)\/(?:[^/]+\/)*(\d{10,})$/);
      if (match && retailer === 'TikTok Shop') { id = match[1]; platform = 'tiktok'; }
    } else if (host === 'walmart.com' || host.endsWith('.walmart.com')) {
      const match = path.match(/\/ip\/(?:[^/]+\/)*(\d+)$/);
      if (match && retailer === 'Walmart') { id = match[1]; platform = 'walmart'; }
    } else if (host === 'samsclub.com' || host.endsWith('.samsclub.com')) {
      const match = path.match(/\/ip\/(?:[^/]+\/)*(\d+)$/) || path.match(/\/p\/(?:[^/]+\/)*(prod\d+)$/i);
      if (match && /sam[’']s club/i.test(retailer)) { id = match[1]; platform = 'samsclub'; }
    } else if ((host === 'hashiq.io' || host.endsWith('.hashiq.io')) && kind === 'tracker') {
      const match = path.match(/^\/shop\/p\/.+-(\d{10,})$/);
      if (match) { id = match[1]; platform = 'hashiq'; }
    } else if (!['Amazon US', 'Walmart', 'TikTok Shop', 'Sam’s Club', "Sam's Club"].includes(retailer)) {
      // Future retailers must still have an explicit product path, not a shop or category page.
      if (/\/(?:products?|p|pd|ip)\/[^/]+(?:\/[^/]+)*$/i.test(path)) {
        id = host + path;
        platform = 'product-path';
      }
    }
    return id ? { itemUrl: href, itemIdentity: retailer + '|' + platform + '|' + id } : null;
  }

  function groupLabel(retailer, kind, period, observedAt) {
    let label;
    if (kind === 'tracker') {
      label = 'third-party total, ' + period.toLowerCase();
    } else if (kind === 'purchase') {
      label = period === 'Since yesterday' ? 'bought since yesterday'
        : period === 'Past month' ? 'bought in past month'
        : 'bought, ' + period.toLowerCase();
    } else {
      label = 'sold, ' + period.toLowerCase();
    }
    return [retailer || 'Retailer not stated', label, dateLabel(observedAt)].join(' · ');
  }

  function parseMetric(item) {
    if (!item || !item.hasSales) return null;
    const display = String(item.displaySales || item.sales || '').trim();
    const match = display.match(NUMBER);
    if (!match) return null;
    const suffix = match[2].toLowerCase();
    const exponent = { k: 3, m: 6, b: 9 }[suffix];
    const value = Number(match[1].replace(/,/g, '') + (exponent ? 'e' + exponent : ''));
    if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) return null;
    const kind = /tracker|third[ -]party/i.test(String(item.salesEvidenceKind || '') + ' ' + display)
      ? 'tracker' : match[4].toLowerCase() === 'bought' ? 'purchase' : 'sold';
    const retailer = String(item.retailer || '').trim();
    const period = normalizePeriod(display, item.salesPeriod);
    const observedAt = validDate(item.metricDate);
    const sourceUrl = safeUrl(item.metricSource);
    const identity = [item.salesItemSource, item.url, item.metricSource]
      .map(url => productIdentity(url, retailer, kind)).find(Boolean);
    const isMinimum = Boolean(match[3]);
    const wasRounded = Boolean(suffix);
    const qualifications = [];
    if (isMinimum) qualifications.push('Minimum displayed count (+); actual total may be higher');
    else if (wasRounded) qualifications.push('Abbreviated displayed count');
    else qualifications.push('Published count');
    if (kind === 'purchase') qualifications.push('purchase badge, not audited exact units');
    if (kind === 'tracker') qualifications.push('third-party report, not audited unit sales');
    const reasons = [];
    if (!retailer) reasons.push('Retailer not stated');
    if (!sourceUrl) reasons.push('Sales source URL unavailable or invalid');
    if (!observedAt) reasons.push('Sales snapshot date not recorded');
    if (!identity) reasons.push('Exact product listing not identified');
    const eligible = reasons.length === 0;

    return {
      value,
      display,
      kind,
      period,
      observedAt,
      sourceUrl,
      itemUrl: identity ? identity.itemUrl : '',
      itemIdentity: identity ? identity.itemIdentity : '',
      qualifier: qualifications.join('; ') + '.',
      isMinimum,
      wasRounded,
      eligible,
      reason: reasons.join('; '),
      groupKey: eligible ? JSON.stringify([retailer, kind, period, observedAt]) : '',
      groupLabel: groupLabel(retailer, kind, period, observedAt)
    };
  }

  function prefer(a, b) {
    if (a.metric.observedAt !== b.metric.observedAt) return a.metric.observedAt > b.metric.observedAt;
    const aVerified = a.item.salesVerifiedThisPass === true;
    const bVerified = b.item.salesVerifiedThisPass === true;
    if (aVerified !== bVerified) return aVerified;
    const aAdded = validDate(a.item.datePosted);
    const bAdded = validDate(b.item.datePosted);
    if (aAdded !== bAdded) return aAdded > bAdded;
    return String(a.item.id || '').localeCompare(String(b.item.id || '')) < 0;
  }

  function groupRows(rows) {
    const latest = new Map();
    for (const item of rows || []) {
      const metric = parseMetric(item);
      if (!metric || !metric.eligible) continue;
      const key = JSON.stringify([metric.itemIdentity, metric.kind, metric.period]);
      const candidate = { item, metric, duplicatesRemoved: 0 };
      const existing = latest.get(key);
      if (!existing) latest.set(key, candidate);
      else if (prefer(candidate, existing)) {
        candidate.duplicatesRemoved = existing.duplicatesRemoved + 1;
        latest.set(key, candidate);
      } else existing.duplicatesRemoved += 1;
    }

    const groups = new Map();
    for (const entry of latest.values()) {
      const { item, metric } = entry;
      let group = groups.get(metric.groupKey);
      if (!group) {
        group = {
          key: metric.groupKey,
          label: metric.groupLabel,
          retailer: String(item.retailer).trim(),
          kind: metric.kind,
          period: metric.period,
          observedAt: metric.observedAt,
          entries: [],
          duplicatesRemoved: 0
        };
        groups.set(group.key, group);
      }
      group.entries.push({ item, metric });
      group.duplicatesRemoved += entry.duplicatesRemoved;
    }
    return [...groups.values()].sort((a, b) =>
      a.retailer.localeCompare(b.retailer, 'en') || b.observedAt.localeCompare(a.observedAt) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.period.localeCompare(b.period, 'en'));
  }

  function rankGroup(group) {
    const entries = [...(group && group.entries || [])].sort((a, b) =>
      b.metric.value - a.metric.value ||
      String(a.item.name || a.item.id || '').localeCompare(String(b.item.name || b.item.id || ''), 'en', { sensitivity: 'base', numeric: true }) ||
      String(a.item.id || '').localeCompare(String(b.item.id || ''), 'en'));
    const frequencies = new Map();
    for (const entry of entries) frequencies.set(entry.metric.value, (frequencies.get(entry.metric.value) || 0) + 1);
    let rank = 0;
    return entries.map((entry, index) => {
      if (!index || entry.metric.value !== entries[index - 1].metric.value) rank = index + 1;
      return { item: entry.item, metric: entry.metric, rank, tied: frequencies.get(entry.metric.value) > 1 };
    });
  }

  return Object.freeze({ parseMetric, groupRows, rankGroup });
});
