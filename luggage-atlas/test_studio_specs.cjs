const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const ctx = { window: {}, Date }; vm.createContext(ctx);
for (const name of ['studio-config.js', 'studio-specs.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, name), 'utf8'), ctx);
const S = ctx.window.OpenStorySpecs, D = ctx.window.OpenStoryDesign;
const plain = x => JSON.parse(JSON.stringify(x));
assert.equal(S.baseline('__proto__').tcin, '86391405');
const original = S.review(D.defaults, 'hardside');
assert.equal(original.baseline.tcin, '86391405');
assert.equal(original.baseline.savedOfferSource, 'https://www.target.com/p/-/A-88289923');
assert.deepEqual(plain(original.baselineDimensionsCm), [55.25, 36.2, 24.77]);
assert.deepEqual(plain(original.dimensionDeltaCm), [-0.25, -0.2, -1.77]);
assert.equal(original.rows.length, 16); assert.equal(original.upgrades.length, 8);
assert.equal(original.conceptChanges.length, 0);
assert(original.rows.find(r => r.id === 'weight').revised.includes('Unknown'));
assert(original.rows.find(r => r.id === 'capacity').revised.includes('Unknown'));
assert(original.rows.find(r => r.id === 'price').revised.includes('unknown'));
assert(original.rows.find(r => r.id === 'expansion').revised.includes('not modeled'));
const signature = S.review(D.defaults, 'signature');
assert.equal(signature.baseline.tcin, '87249354');
assert(signature.rows.find(r => r.id === 'organization').change.includes('existing product idea'));
assert(signature.baseline.weightNote.includes('7.71'));
assert(signature.baseline.capacity.includes('Not established'));
const front = S.review(D.defaults, 'front-pocket');
assert.equal(front.baseline.tcin, '92443469');
assert(front.rows.find(r => r.id === 'front-access').change.includes('Existing baseline feature retained'));
assert(front.rows.find(r => r.id === 'weight').original.includes('14.25 lb'));
assert(front.rows.find(r => r.id === 'weight').original.includes('shipping section says 9 lb'));
assert(front.baseline.cautions.some(x => x.includes('Laptop-fit answers also conflict')));
for (const baseline of Object.keys(S.baselines)) {
  for (const format of Object.keys(D.formats)) {
    for (const interior of ['compression', 'cubes', 'divider']) {
      const report = S.review({ ...D.defaults, format, interior, frontAccess: false, repairable: false, wetPocket: false }, baseline);
      assert.equal(report.comparableFormat, format === 'cabin');
      if (format !== 'cabin') assert.equal(report.dimensionDeltaCm, null);
      for (const id of ['front-access', 'wheels', 'wet-pocket']) assert.equal(report.rows.find(r => r.id === id).status, 'Feature off');
      assert(report.upgrades.every(u => u.validation && u.modelScope && u.benefit && u.tradeoff));
      assert(report.conceptChanges.some(c => c.field === 'Front access' && c.revised === 'Off'));
      assert(report.rows.every(r => !/undefined|NaN/.test(JSON.stringify(r))));
    }
  }
}
// Parse the actual serializer, including quoted commas, quotes and newline-safe fields.
function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = text.replace(/^\ufeff/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (ch === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell); rows.push(row); return rows;
}
const csv = S.csv(front), rows = parseCSV(csv);
assert.equal(rows.length, 17); assert(rows.every(row => row.length === 13));
assert(rows.slice(1).every(row => row[2] === '92443469' && row[8] === front.baseline.source && row[9] === '2026-11-04'));
const unsafe = plain(front); unsafe.rows[0].revised = '=CMD("test")';
assert.equal(parseCSV(S.csv(unsafe))[1][4], '\'=CMD("test")');
const markdown = S.markdown(front);
assert(markdown.includes('Original versus revised specifications'));
assert(markdown.includes('Upgrade details'));
assert(markdown.includes('Changes from the base Blender concept'));
assert(markdown.includes('retail reference'));
const html = fs.readFileSync(path.join(__dirname, 'studio.html'), 'utf8');
assert(html.includes('id="specifications"')); assert(html.includes('id="upgrade-details"'));
assert(html.includes('<details class="full-specifications"><summary>View all 16'));
for(const step of ['1 · Opportunities &amp; white space','2 · Add features','3 · 3D workshop','4 · Component BOM','5 · Review &amp; export'])assert(html.includes(step));
assert(html.indexOf('id="national-brand-references"')<html.indexOf('class="studio-layout"'));
assert(html.indexOf('studio-config.js?') < html.indexOf('studio-specs.js?'));
assert(html.indexOf('studio-specs.js?') < html.indexOf('src="studio.js?'));
if (process.env.STUDIO_SPEC_CSV_EXPORT) fs.writeFileSync(process.env.STUDIO_SPEC_CSV_EXPORT, csv);
console.log('PASS: 3 exact retail baselines; retailer conflicts preserved; 27 format/interior/baseline combinations; off-state exclusions; no invented mass/capacity/cost; 16 aligned CSV rows and full upgrade brief; simple navigation and collapsed technical details.');

