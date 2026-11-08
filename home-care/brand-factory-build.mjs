import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {decoratePage} from './navigation-build.mjs';

const unknown = 'Not publicly verified';
const normalize = s => String(s || '').normalize('NFKC').replace(/[’‘]/g, "'").trim().toLowerCase();
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function addBrandFactories(items, siteDir) {
  const file = path.join(siteDir, 'brand-factories.json');
  assert.ok(fs.existsSync(file), 'Brand/factory evidence file missing');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const aliases = new Map();
  for (const e of data.entries) {
    for (const url of [e.brandOwnerSource, e.manufacturerSource, ...e.factories.map(f => f.source)].filter(Boolean)) {
      assert.equal(new URL(url).protocol, 'https:', 'Evidence URLs must use HTTPS');
    }
    for (const brand of e.brands) {
      const key = normalize(brand);
      assert.ok(!aliases.has(key) || aliases.get(key) === e, 'Ambiguous brand alias: ' + brand);
      aliases.set(key, e);
    }
  }
  const identities = new Map();
  for (const evidence of data.productBrandIdentifications || []) {
    assert.ok(!identities.has(evidence.id), 'Duplicate brand evidence: ' + evidence.id);
    assert.equal(new URL(evidence.source).protocol, 'https:');
    assert.ok(evidence.brand && evidence.checkedDate && evidence.retailerProductCode);
    identities.set(evidence.id, evidence);
  }
  const directory = new Map();
  for (const d of items) {
    // Apply retailer evidence only to the same listing while its original brand is blank.
    const proof = identities.get(d.id);
    if (proof && proof.source === d.url && !d.brand && !d.coverageBrand) {
      d.originalCatalogBrand = d.brand ?? '';
      d.brand = proof.brand;
      d.brandIdentitySource = proof.source;
      d.brandIdentityCheckedDate = proof.checkedDate;
      d.brandIdentityProductCode = proof.retailerProductCode;
    }
    const brand = d.coverageBrand || d.brand || '';
    const e = aliases.get(normalize(brand));
    const facilities = e?.factories || [];
    const source = [...new Set(facilities.map(f => f.source))].join(' | ');
    const status = facilities.length ? 'Brand facility disclosed; SKU plant unverified' : e ? 'Reviewed; factory unresolved' : brand ? 'Factory research pending' : 'Brand missing; factory unresolved';
    const fields = {
      factoryBrand: brand || 'Brand not recorded',
      brandOwnerName: e?.brandOwnerName || unknown,
      brandOwnerSource: e?.brandOwnerSource || '',
      manufacturerName: e?.manufacturerName || unknown,
      manufacturerSource: e?.manufacturerSource || '',
      factoryName: facilities.map(f => f.name).join(' | ') || unknown,
      factoryLocation: facilities.map(f => f.location).join(' | ') || unknown,
      factorySource: source,
      factoryEvidenceScope: facilities.length ? [...new Set(facilities.map(f => f.scope))].join(' | ') : 'No factory established by this review',
      skuFactoryName: unknown,
      factoryVerificationStatus: status,
      factoryCheckedDate: e?.checkedDate || '',
      factoryEvidenceNote: e?.evidenceNote || (e ? 'Company evidence does not establish the factory for this product.' : brand ? 'No brand-specific factory research completed in this pass; do not infer a factory from the retailer, seller, brand name or headquarters.' : 'The retained record has no brand. Brand identification and factory research are still required.')
    };
    for (const [key, value] of Object.entries(fields)) {
      assert.ok(!Object.hasOwn(d, key), 'Factory enrichment must not overwrite retained field: ' + key);
      d[key] = value;
    }
    const key = brand || '';
    if (!directory.has(key)) directory.set(key, {...fields, productRecords: 0});
    directory.get(key).productRecords++;
  }
  const rows = [...directory.values()].sort((a,b) => a.factoryBrand.localeCompare(b.factoryBrand));
  const stats = {
    productRecords: items.length,
    brandLabels: rows.filter(r => r.factoryBrand !== 'Brand not recorded').length,
    missingBrandRecords: rows.find(r => r.factoryBrand === 'Brand not recorded')?.productRecords || 0,
    brandLabelsWithFacilities: rows.filter(r => r.factorySource).length,
    brandLabelsWithCompanyEvidence: rows.filter(r => r.brandOwnerSource || r.manufacturerSource).length,
    brandLabelsResearchPending: rows.filter(r => r.factoryVerificationStatus === 'Factory research pending').length,
    productRecordsWithBrandFacilities: items.filter(r => r.factorySource).length,
    exactSKUFactoriesVerified: 0
  };
  fs.writeFileSync(path.join(siteDir,'brand-factory-directory.json'), JSON.stringify({reviewDate:data.reviewDate,stats,rows}, null, 2)+'\n');
  const csvFields = Object.keys(rows[0]);
  const quote = value => '"'+String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"','""')+'"';
  fs.writeFileSync(path.join(siteDir,'brand-factory-directory.csv'), '\uFEFF'+[csvFields.map(quote).join(','), ...rows.map(r=>csvFields.map(f=>quote(r[f])).join(','))].join('\r\n'));
  const link = (urls,label) => urls ? urls.split(' | ').map(u=>'<a href="'+escape(u)+'" target="_blank" rel="noopener noreferrer">'+label+'</a>').join(' · ') : '';
  const tableRows = rows.map(r=>'<tr data-status="'+escape(r.factoryVerificationStatus)+'"><th scope="row">'+escape(r.factoryBrand)+'<small>'+r.productRecords+' records</small></th><td>'+escape(r.brandOwnerName)+'<br>'+link(r.brandOwnerSource,'Owner source')+'</td><td>'+escape(r.manufacturerName)+'<br>'+link(r.manufacturerSource,'Manufacturer source')+'</td><td>'+escape(r.factoryName)+'<small>'+escape(r.factoryLocation)+'</small>'+link(r.factorySource,'Factory source')+'</td><td>'+escape(r.factoryVerificationStatus)+'<small>Exact SKU factory: '+escape(r.skuFactoryName)+'</small><small>'+escape(r.factoryEvidenceScope)+'</small><small>'+escape(r.factoryEvidenceNote)+'</small><small>'+(r.factoryCheckedDate?'Evidence checked '+escape(r.factoryCheckedDate):'Research not completed')+'</small></td></tr>').join('');
  const narrowControls = '@media(max-width:480px){.controls label{width:100%;min-width:0}.controls input,.controls select{box-sizing:border-box;width:100%;min-width:0}}';
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brand and factory directory · Home Care</title><style>body{font:15px/1.5 Arial,sans-serif;color:#20251f;background:#f7f7f3;margin:0;border-top:6px solid #b12721}main{max-width:1500px;margin:auto;padding:28px 4vw}a{color:#9e2520}h1{font-size:30px;margin-bottom:8px}p{max-width:1000px}.controls{display:flex;gap:16px;flex-wrap:wrap;margin:24px 0}label{display:flex;flex-direction:column;gap:6px}input,select{font:inherit;padding:12px;border:1px solid #899385;border-radius:8px;min-width:240px}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;background:#fff;min-width:850px}th,td{text-align:left;vertical-align:top;padding:14px;border-bottom:1px solid #e0e4d9;overflow-wrap:anywhere}thead{background:#e9eee5}small{display:block;font-size:12px;color:#58634e;margin:6px 0}[hidden]{display:none!important}:focus-visible{outline:3px solid #b12721;outline-offset:3px}.note{background:#fff4df;padding:14px;border-radius:8px}td:nth-child(5){max-width:360px}'+narrowControls+'</style></head><body><main><a href="/home-care/">← Home Care catalog</a><h1>Brand and factory directory</h1><p>Every catalog brand has a factory field and research status. Manufacturer, brand owner and disclosed factory are separate. A brand-level facility does not identify the plant that made a particular SKU or batch.</p><p class="note">'+stats.brandLabels+' brand labels · '+stats.brandLabelsWithCompanyEvidence+' with company evidence · '+stats.brandLabelsWithFacilities+' with disclosed brand facilities · '+stats.exactSKUFactoriesVerified+' exact SKU factories verified. '+stats.missingBrandRecords+' product records still lack a brand. Evidence reviewed '+escape(data.reviewDate)+'.</p><p><a href="/home-care/brand-factory-directory.csv" download>Download all brands CSV</a> · <a href="/home-care/brand-factory-directory.json">Evidence data</a>. Product selections also export factory fields from the catalog.</p><div class="controls"><label>Search brands, companies or factories<input type="search" id="factory-search" placeholder="For example: Libman or Waxdale"></label><label>Research status<select id="factory-status"><option value="all">All statuses</option>'+[...new Set(rows.map(r=>r.factoryVerificationStatus))].map(s=>'<option>'+escape(s)+'</option>').join('')+'</select></label></div><p id="factory-count" aria-live="polite">'+rows.length+' rows</p><div class="table-wrap"><table><thead><tr><th>Brand</th><th>Brand owner</th><th>Manufacturer / supplier company</th><th>Disclosed brand factories</th><th>Evidence and remaining gaps</th></tr></thead><tbody>'+tableRows+'</tbody></table></div><script>const rows=[...document.querySelectorAll("tbody tr")],search=document.getElementById("factory-search"),statusFilter=document.getElementById("factory-status");function filterFactories(){const q=search.value.trim().toLowerCase(),status=statusFilter.value;let count=0;for(const row of rows){row.hidden=!(row.textContent.toLowerCase().includes(q)&&(status==="all"||row.dataset.status===status));if(!row.hidden)count++}document.getElementById("factory-count").textContent=count+(count===1?" row":" rows")}search.addEventListener("input",filterFactories);statusFilter.addEventListener("change",filterFactories);</script></main></body></html>';
  const hasNavigation=fs.existsSync(path.join(siteDir,'navigation.css'))&&fs.existsSync(path.join(siteDir,'ui-assets/manifest.json'));
  fs.writeFileSync(path.join(siteDir,'brand-factories.html'),hasNavigation?decoratePage(html.replace('← Home Care catalog','← Homecare home'),siteDir,'insights'):html);
  return stats;
}

export function addFactoryInterface(html) {
  assert.ok(html.includes('details.prepend(dates);'), 'Product details integration moved');
  html = html.replace('details.prepend(dates);', `details.prepend(dates);
  const factory=document.createElement('section');factory.className='evidence-block';factory.setAttribute('aria-label','Manufacturer and factory');
  for(const [label,value] of [['Brand owner',d.brandOwnerName],['Manufacturer / supplier company',d.manufacturerName],['Disclosed brand factories',d.factoryName],['Factory locations',d.factoryLocation],['Exact SKU factory',d.skuFactoryName],['Research status',d.factoryVerificationStatus],['Evidence scope',d.factoryEvidenceScope],['Evidence note',d.factoryEvidenceNote],['Factory evidence checked',d.factoryCheckedDate||'Research not completed']]){const p=document.createElement('p');p.textContent=label+': '+(value||'Not publicly verified');factory.append(p)}
  for(const [label,sources] of [['Product brand source',d.brandIdentitySource],['Owner source',d.brandOwnerSource],['Manufacturer source',d.manufacturerSource],['Factory source',d.factorySource]])for(const url of (sources||'').split(' | ').filter(Boolean)){const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';const p=document.createElement('p');p.append(a);factory.append(p)}details.append(factory);`);
  html = html.replace('<a href="/home-care/tutorial.html">', '<a href="/home-care/brand-factories.html">Brands &amp; factories</a><a href="/home-care/tutorial.html">');
  const fields = ['originalCatalogBrand','brandIdentitySource','brandIdentityCheckedDate','brandIdentityProductCode','factoryBrand','brandOwnerName','brandOwnerSource','manufacturerName','manufacturerSource','factoryName','factoryLocation','factorySource','factoryEvidenceScope','skuFactoryName','factoryVerificationStatus','factoryCheckedDate','factoryEvidenceNote'];
  const labels = ['Original brand before identification','Product brand evidence URL','Product brand evidence checked','Retailer product code for brand evidence','Factory research brand','Brand owner','Brand owner source','Manufacturer / supplier company','Manufacturer source','Disclosed brand factories (not SKU assignment)','Disclosed factory locations','Factory source URLs','Factory evidence scope','Exact SKU factory','Factory verification status','Factory evidence checked date','Factory evidence note'];
  html = html.replace("const fields=['", "const fields=["+fields.map(f=>JSON.stringify(f)).join(',')+",'");
  html = html.replace('const headers={', 'const headers={'+fields.map((f,i)=>f+':'+JSON.stringify(labels[i])).join(',')+',');
  return html;
}
