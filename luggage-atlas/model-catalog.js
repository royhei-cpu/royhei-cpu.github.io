'use strict';

// Prices, availability and photographs belong to offers. This index only joins reviewed identities.
const membership = new Map();
for (const family of window.ATLAS_MODEL_EVIDENCE) {
  for (const [id, variant] of Object.entries(family.variants)) membership.set(id, {family, variant});
}
const currentVariant = new Map();
function identity(p) {
  return membership.get(p.id || offerKey(p));
}
function modelGroups(rows) {
  const groups = new Map();
  for (const p of rows) {
    const matched = identity(p)?.family;
    const id = matched?.id || p.id || offerKey(p);
    if (!groups.has(id)) groups.set(id, {id, matched, name: matched?.name || p.product, offers: []});
    groups.get(id).offers.push(p);
  }
  return [...groups.values()];
}
function chosenOffer(group) {
  return group.offers.find(p => p.id === currentVariant.get(group.id)) || group.offers[0];
}
function availability(p) {
  const text = p.kind + ' ' + p.note;
  if (/listed (?:as )?unavailable|sold out|out of stock/i.test(text)) return 'Unavailable at observation';
  if (/listed (?:as )?available/i.test(text)) return 'Available at observation';
  if (/waitlist|notify.me/i.test(text)) return 'Waitlist / notify me';
  if (/pre-order/i.test(text)) return 'Pre-order';
  return 'Not verified';
}
function photoForVariant(p) {
  const variant = identity(p)?.variant;
  if (variant?.photo) return {url:variant.photo, label:'Storefront photo assigned to this variant'};
  return p.sourcePhoto ? {url:p.sourcePhoto, label:'Storefront product photo · variant appearance unconfirmed'} : null;
}
function storefrontFigure(p) {
  const photo = photoForVariant(p);
  if (!photo) return '';
  return `<img src="${E(photo.url)}" alt="${E(p.product)}" loading="lazy"><small>${E(photo.label)}</small>`;
}
const optionTranslations = {
  'シャンパンゴールド':'Champagne gold','ブラック':'Black','クールホワイト':'Cool white','ブルーグレー':'Blue gray',
  'ガンメタルブラック':'Gunmetal black','ネイビーブルー':'Navy blue','フォレストグリーン':'Forest green','スチールグレー':'Steel gray',
  'オーシャンブルー':'Ocean blue','クラシックシルバー':'Classic silver','イエロー':'Yellow','ホワイトベージュ':'White beige',
  'ロイヤルブルー':'Royal blue','アイスブルー':'Ice blue','ディープブラック':'Deep black','アイボリー':'Ivory',
  'コーラルピンク':'Coral pink','シックレッド':'Chic red','アッシュブルー':'Ash blue','シルバーグレー':'Silver gray',
  'クリームアイボリー':'Cream ivory','ライトベージュ':'Light beige','オレンジ':'Orange','コンパクトS':'Compact S',
  'コンパクトM':'Compact M','S(8cm拡張タイプ)':'S (8 cm expansion)'
};
function variantControls(group, p) {
  if (!group.matched) return '<p class="caption">Individual listing · parent model unverified</p>';
  const variant = identity(p).variant;
  const controls = [];
  const select = (axis, label, values, selected) => {
    if (!values.length) return;
    if (values.length === 1) {
      controls.push(`<span><b>${E(label)}</b> ${E(values[0][1])}</span>`);
      return;
    }
    controls.push(`<label>${E(label)}<select data-variant-axis="${axis}" data-group="${E(group.id)}">${values.map(([id, name]) => `<option value="${E(id)}" ${id === selected ? 'selected' : ''}>${E(name)}</option>`).join('')}</select></label>`);
  };
  let candidates = group.offers;
  for (const [axis, label] of [['size','Size'], ['color','Color']]) {
    if (!candidates.some(offer => identity(offer).variant[axis])) continue;
    const values = [...new Set(candidates.map(offer => identity(offer).variant[axis] || ''))];
    select(axis, label, values.map(v => [v, optionTranslations[v] || v || 'Unspecified']), variant[axis] || '');
    candidates = candidates.filter(offer => (identity(offer).variant[axis] || '') === (variant[axis] || ''));
  }
  if (candidates.length > 1) {
    select('offer', 'Offer', candidates.map(o => [o.id, [o.market, o.retailer, money(o), o.date, identity(o).variant.sku || o.id].join(' · ')]), p.id);
  }
  return `<div class="model-options"><small>${group.offers.length} matching priced offer${group.offers.length === 1 ? '' : 's'}</small>${controls.join('')}</div>`;
}
function switchVariant(control) {
  const desk = tab === 'workbench';
  const group = modelGroups(desk ? deskRows() : directoryRows()).find(g => g.id === control.dataset.group);
  if (!group) return;
  const axis = control.dataset.variantAxis;
  const old = chosenOffer(group);
  const prior = identity(old).variant;
  let choices = group.offers;
  if (axis === 'offer') choices = choices.filter(p => p.id === control.value);
  else {
    if (axis === 'color') choices = choices.filter(p => identity(p).variant.size === prior.size);
    choices = choices.filter(p => (identity(p).variant[axis] || '') === control.value);
  }
  const next = choices.find(p => identity(p).variant.color === prior.color) || choices[0];
  if (!next) return;
  currentVariant.set(group.id, next.id);
  if (desk) drawDeskOffers(); else drawDirectory();
  document.querySelector(`[data-group="${group.id}"][data-variant-axis="${axis}"]`)?.focus?.({preventScroll:true});
}
document.addEventListener('change', event => {
  if (event.target.dataset.variantAxis) switchVariant(event.target);
});
function priceRanges(rows) {
  const byMarket = new Map();
  for (const p of rows) {
    const key = [p.market, p.currency].join(' · ');
    const values = byMarket.get(key) || [];
    values.push(p.amount);
    byMarket.set(key, values);
  }
  return [...byMarket].map(([key, values]) => {
    const low = Math.min(...values), high = Math.max(...values);
    return key + ' ' + low + (low === high ? '' : '–' + high);
  }).join(' | ');
}
function exportModels(rows) {
  csv('Luggage_Atlas_Model_Index.csv', [
    ['Record type','Model ID','Brand','Model or listing','Matching priced offers','Observed prices by market and currency','Identity evidence','Offer IDs','Source URLs','Product configuration'],
    ...modelGroups(rows).map(g => [g.matched ? 'Verified model family' : 'Unlinked listing', g.matched?.id, g.offers[0].brand, g.name, g.offers.length, priceRanges(g.offers), g.matched?.basis, g.offers.map(p => p.id).join(' | '), g.offers.map(p => p.source).join(' | '),g.matched?.configuration || 'Unverified'])
  ]);
}
function exportModelOffers(rows) {
  csv('Luggage_Atlas_Priced_Offers.csv', [
    ['Model ID','Model','Offer ID','Brand','Exact listing','Size','Color','SKU','Amount','Currency','Regular price','Market','Retailer','Availability','Observed','Store listing date','Price basis','Original note','Source URL','Original photo URL','Variant-assigned photo URL','Product configuration',...offerPhotoExportHeaders],
    ...rows.map(p => {
      const m = identity(p);
      return [m?.family.id,m?.family.name,p.id,p.brand,p.product,m?.variant.size,m?.variant.color,m?.variant.sku || p.sku,p.amount,p.currency,p.regular,p.market,p.retailer,availability(p),p.date,p.storeListingDate,p.kind,p.note,p.source,p.sourcePhoto,m?.variant.photo,m?.family.configuration || 'Unverified',...offerPhotoExport(p)];
    })
  ]);
}
// The publication date of a story or a storefront listing is insufficient evidence for a launch.
function recentLaunches() {
  const end = D.asOf, start = new Date(end+'T00:00:00Z');
  start.setUTCDate(start.getUTCDate()-6);
  const from = start.toISOString().slice(0,10);
  const dated = new Set(['Brand-announced Japan release date; stock not audited','Brand-confirmed launch date','Japan launch confirmed by BRUNO','launch day','Collection launch','Announcement and immediate availability','Announced launch date; release published January 15','Global launch reported by Wallpaper']);
  const bySource = new Map();
  for (const item of D.launches) {
    if (dated.has(item.dateType) && item.source && item.date >= from && item.date <= end && /^\d{4}-\d\d-\d\d$/.test(item.date)) bySource.set([item.brand,item.title,item.date].join('|'), item);
  }
  return {from,end,items:[...bySource.values()].sort((a,b)=>b.date.localeCompare(a.date))};
}
function modelDashboard() {
  const all = modelGroups(offers()), confirmed = all.filter(g=>g.matched);
  const {from,end,items} = recentLaunches();
  const individual = confirmed.filter(g=>g.matched.configuration==='Individual product').length;
  const sets = confirmed.filter(g=>g.matched.configuration==='Set').length;
  const totals = new Map(D.brands.map(b=>[b.name,{families:0,offers:0,unlinked:0}]));
  for (const g of all) {
    const brand = brandBy(g.offers[0].brand)?.name || g.offers[0].brand;
    if (!totals.has(brand)) totals.set(brand,{families:0,offers:0,unlinked:0});
    const row = totals.get(brand);
    row[g.matched?'families':'unlinked']++;
    row.offers += g.offers.length;
  }
  const sorted = [...totals].sort((a,b)=>b[1].families-a[1].families || a[0].localeCompare(b[0]));
  const pricedBrands = [...totals.values()].filter(r=>r.offers>0).length;
  const metrics = [['Verified model families',confirmed.length],['Priced offers',D.prices.length],['Unlinked listings',all.length-confirmed.length],['Verified launch events',items.length]];
  return `<section class="section model-dashboard"><h2>Assortment coverage</h2><div class="model-stats">${metrics.map(([label,n])=>`<div><strong>${n.toLocaleString()}</strong><span>${label}</span></div>`).join('')}</div>
  <p><b>${individual} individual product families · ${sets} set configurations.</b> Priced offers cover ${pricedBrands} of ${D.brands.length} brand profiles through ${E(end)}. Unlinked listings remain searchable and are excluded from the verified model count.</p>
  <h3>Brands with the most verified families in this sample</h3>
  ${barRows(sorted.slice(0,5).map(([label,r])=>({label,value:r.families})),Math.max(1,sorted[0]?.[1].families||0))}
  <p class="caption">Each bar counts distinct reviewed families. Listing volume and sales are separate measures.</p>
  <details><summary>Model and offer counts by brand</summary><p class="caption">Coverage of the Atlas sample. Each reviewed family counts once. Offer counts measure listing coverage.</p><div class="table-wrap"><table><thead><tr><th>Brand</th><th>Verified families</th><th>Priced offers</th><th>Unlinked listings</th></tr></thead><tbody>${sorted.map(([b,r])=>`<tr><td><a href="?modelBrand=${encodeURIComponent(brandBy(b)?.id || b)}#directory">${E(b)}</a></td><td>${r.families}</td><td>${r.offers}</td><td>${r.unlinked}</td></tr>`).join('')}</tbody></table></div></details>
  <details><summary>${items.length} verified launch events · ${E(from)} to ${E(end)}</summary><ol class="launch-list">${items.map(launchHTML).join('')||'<li>No verified launches in this window.</li>'}</ol><button class="btn" data-export-launches>Export these launches CSV</button></details>
  <a class="btn" href="#directory">Browse models and export offers →</a>${openStoryModelStudy()}</section>`;
}
document.addEventListener('click', e => {
  if (!e.target.closest('[data-export-launches]')) return;
  const {items} = recentLaunches();
  csv('Luggage_Atlas_Verified_Launches.csv',[['Record type','Brand','Launch','Release date','Date evidence','Source URL'],...items.map(x=>['Verified launch event',x.brand,x.title,x.date,x.dateType,x.source])]);
});
function brandModelSummary(b) {
  const rows = offers().filter(p=>brandBy(p.brand)?.id===b.id);
  const groups = modelGroups(rows), verified = groups.filter(g=>g.matched).length;
  return `${verified} verified model families · ${rows.length} priced offers · ${groups.length-verified} unlinked listings`;
}

// Compare like-sized offers within a single currency. The saved observations supply every displayed price.
function openStoryModelStudy() {
  const rows = offers();
  const find = (name, sku) => rows.find(p=>identity(p)?.family.name === name && identity(p)?.variant.sku === sku);
  const standard = find('SPEED U','M15-S-BK-01'), expanded = find('SPEED U plus','M15P-S-BK-01');
  if (!standard || !expanded || standard.currency !== expanded.currency || standard.market !== expanded.market) return '';
  return `<article class="note"><h3>Open Story benchmark · expandable carry-on</h3>
  <p>MAIMO’s black size S was listed at ${money(standard)} for SPEED U and ${money(expanded)} for SPEED U plus with 8 cm expansion. The observed price difference was ${money({currency:standard.currency,amount:expanded.amount-standard.amount})} in Japan.</p>
  <p>Quote the expansion zipper and gusset as a separate option for Open Story. Weigh both prototypes and check packed depth and wheel stability before setting a US retail target.</p>
  ${link(standard.source,'Standard case ↗')} · ${link(expanded.source,'Expandable case ↗')} · <a href="studio.html">Open Story workshop →</a></article>`;
}
