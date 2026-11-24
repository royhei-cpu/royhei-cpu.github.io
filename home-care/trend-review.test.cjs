const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const data=require('./site/trend-review.json');
test('fresh review covers seven areas with dated primary sources and preserves announcement date',()=>{
 assert.equal(data.areas.length,7);assert.equal(new Set(data.areas.map(a=>a.id)).size,7);
 for(const a of data.areas){assert.ok(a.concept&&a.next);for(const key of a.sources){const s=data.sources[key];assert.ok(s.url.startsWith('https://'));assert.equal(s.checkedAt,data.reviewedAt);}}
 assert.equal(data.sources['barebird-announcement'].eventDate,'2026-10-28');assert.equal(data.newLaunchesVerifiedThisReview,0);
 const context={window:{HCTrendReview:structuredClone(data)}};vm.runInNewContext(fs.readFileSync('home-care/site/trend-review.js','utf8'),context);
 assert.match(context.window.HCTrendReview.panelHTML(),/Fresh trend review/);assert.match(context.window.HCTrendReview.areaHTML('pet-odor'),/barebird/);
});
