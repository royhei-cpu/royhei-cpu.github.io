const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
function boot(view){const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'insights.html'),'utf8'),{url:'https://royhei-cpu.github.io/luggage-atlas/insights.html?view='+view,runScripts:'outside-only'});const w=dom.window;w.localStorage.setItem("luggage-atlas-cost-desk-v1",JSON.stringify({selected:[],scenarios:{existing:{fob:"50"}}}));for(const f of ['data.js','photos.js','model-evidence.js','innovation.js','sales-ranking-model.js','merchant-analytics-model.js','insights-adapter.js','merchant-analytics.js','opportunities.js','insights-page.js'])require('vm').runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),dom.getInternalVMContext());return w;}
const w=boot('target'),d=w.document;
assert.equal(d.querySelector('#executive-view').hidden,false);assert.equal(d.querySelector('#analysis-view').hidden,true);
assert.equal(d.querySelectorAll('#opportunity-rows tr').length,11);
assert(d.querySelectorAll('#opportunity-products article').length>0);
for(const img of d.querySelectorAll('#opportunity-products img')){const src=img.getAttribute('src');if(!/^https?:/.test(src))assert(fs.existsSync(path.resolve(__dirname,src)),src);}
const input=d.querySelector('#opportunity-search');input.value='no-such-direction';input.dispatchEvent(new w.Event('input'));assert.equal(d.querySelector('#opportunity-layout').hidden,true);assert.equal(d.querySelector('#opportunity-empty').hidden,false);
input.value='';input.dispatchEvent(new w.Event('input'));
d.querySelector('#opportunity-role').value='concepts';d.querySelector('#opportunity-role').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('#opportunity-rows tr').length,8);
for(const b of [...d.querySelectorAll('#opportunity-products [data-exec-select]')].slice(0,5))b.click();
const saved=JSON.parse(w.localStorage.getItem('luggage-atlas-cost-desk-v1'));assert(saved.selected.length>0&&saved.selected.length<=4);assert.equal(saved.scenarios.existing.fob,"50");
const a=boot('analysis'),ad=a.document;assert(!ad.querySelector('#analysis-view').hidden);assert(ad.querySelector('#executive-view').hidden);assert.equal(ad.querySelectorAll('#analysis-sales-group option').length,2);
const labels=[...ad.querySelectorAll('#analysis-sales-group option')].map(o=>o.textContent);assert(labels.some(t=>t.includes('Amazon'))&&labels.some(t=>t.includes('TikTok')));
const groups=ad.querySelector('#analysis-sales-group');groups.selectedIndex=1;groups.dispatchEvent(new a.Event('change'));assert(ad.querySelector('#analysis-sales-bars').textContent.includes('1.5K'));
const retailer=ad.querySelector('#analysis-retailer');retailer.value='Amazon US';retailer.dispatchEvent(new a.Event('change'));assert.equal(ad.querySelectorAll('#analysis-sales-group option').length,1);assert(ad.querySelector('#analysis-sales-bars').textContent.includes('6K+'));
ad.querySelector('#analysis-reset').click();assert.equal(retailer.value,'all');
console.log('PASS: both routes, 11 directions, search empty/reset, concept filter, photos, capped shared shortlist, sales-period separation, competitor filter/reset.');
