import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

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
      // Retained product-specific evidence takes precedence over brand-level enrichment.
      if (!Object.hasOwn(d, key)) d[key] = value;
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
  // Retain company evidence for product records and exports; the directory UI is retired.
  const redirect = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Home Care products</title><meta http-equiv="refresh" content="0;url=/home-care/?view=catalog"><link rel="canonical" href="https://royhei-cpu.github.io/home-care/?view=catalog"></head><body><p><a href="/home-care/?view=catalog">Open Home Care products</a></p></body></html>';
  fs.writeFileSync(path.join(siteDir,'brand-factories.html'),redirect);
  return stats;
}

export function addFactoryInterface(html) {
  assert.ok(html.includes('details.prepend(dates);'), 'Product details integration moved');
  html = html.replace('details.prepend(dates);', `details.prepend(dates);
  const factory=document.createElement('section');factory.className='evidence-block';factory.setAttribute('aria-label','Manufacturer and factory');
  for(const [label,value] of [['Brand owner',d.brandOwnerName],['Manufacturer / supplier company',d.manufacturerName],['Disclosed brand factories',d.factoryName],['Factory locations',d.factoryLocation],['Exact SKU factory',d.skuFactoryName],['Research status',d.factoryVerificationStatus],['Evidence scope',d.factoryEvidenceScope],['Evidence note',d.factoryEvidenceNote],['Factory evidence checked',d.factoryCheckedDate||'Research not completed']]){const p=document.createElement('p');p.textContent=label+': '+(value||'Not publicly verified');factory.append(p)}
  for(const [label,sources] of [['Product brand source',d.brandIdentitySource],['Owner source',d.brandOwnerSource],['Manufacturer source',d.manufacturerSource],['Factory source',d.factorySource]])for(const url of (sources||'').split(' | ').filter(Boolean)){const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';const p=document.createElement('p');p.append(a);factory.append(p)}details.append(factory);`);
  const fields = ['originalCatalogBrand','brandIdentitySource','brandIdentityCheckedDate','brandIdentityProductCode','factoryBrand','brandOwnerName','brandOwnerSource','manufacturerName','manufacturerSource','factoryName','factoryLocation','factorySource','factoryEvidenceScope','skuFactoryName','factoryVerificationStatus','factoryCheckedDate','factoryEvidenceNote'];
  const labels = ['Original brand before identification','Product brand evidence URL','Product brand evidence checked','Retailer product code for brand evidence','Factory research brand','Brand owner','Brand owner source','Manufacturer / supplier company','Manufacturer source','Disclosed brand factories (not SKU assignment)','Disclosed factory locations','Factory source URLs','Factory evidence scope','Exact SKU factory','Factory verification status','Factory evidence checked date','Factory evidence note'];
  html = html.replace("const fields=['", "const fields=["+fields.map(f=>JSON.stringify(f)).join(',')+",'");
  html = html.replace('const headers={', 'const headers={'+fields.map((f,i)=>f+':'+JSON.stringify(labels[i])).join(',')+',');
  return html;
}
