const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const root=process.cwd(),data={};
for(const id of ['home-care','china-toys','luggage-atlas']){const w={};vm.runInNewContext(fs.readFileSync(`_site/${id}/directory-data.js`,'utf8'),{window:w});const d=w.DIRECTORY,p=d.packed;d.items=p.rows.map(r=>Object.fromEntries(p.keys.flatMap((k,i)=>r[i]<0?[]:[[k,p.pool[r[i]]]])));data[id]=d;}
test('All baseline, addition and international Home Care records are retained',()=>{const d=data['home-care'],ids=new Set(d.items.map(p=>p.id));for(const p of JSON.parse(fs.readFileSync('_site/home-care/catalog-records.json')))assert(ids.has(p.id),p.id);for(const p of JSON.parse(fs.readFileSync('home-care/site/global-reference-products.json')))assert(ids.has(p.id),p.id);assert(ids.size===d.items.length);assert(d.items.some(p=>p.market==='China'));});
test('Every luggage observation has its stable original offer key and exact price',()=>{const d=data['luggage-atlas'],by=new Map(d.items.map(p=>[p.id,p]));const key=p=>'offer-'+Array.from([p.brand,p.product,p.currency,p.retailer,p.source].join('|')).reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261).toString(16);const raw=JSON.parse(fs.readFileSync('luggage-atlas/data.json'));assert.equal(raw.prices.length,d.items.filter(p=>p.id.startsWith('offer-')).length);for(const p of raw.prices){const n=by.get(key(p));assert(n,p.product);assert.equal(n.amount,p.amount);assert.equal(n.currency,p.currency);assert.equal(n.url,p.source)}const bags=d.items.filter(p=>p.brand==='BAGSMART'&&p.id.startsWith('offer-'));assert.equal(new Set(bags.map(p=>p.group)).size,1);assert.equal(bags.length,12);});
test('Every in-scope toy and exact retailer option remains available',()=>{const d=data['china-toys'],ids=new Set(d.items.map(p=>p.id));for(const p of JSON.parse(fs.readFileSync('_site/china-toys/catalog.json')).products){assert(ids.has(p.id),p.name);for(const l of p.listings||[]){for(const o of l.options||[]){assert(d.items.some(v=>v.group===p.id&&v.url===l.url&&v.variant===(o.name||'')&&v.amount===o.price&&v.retailer===(l.source||'')),p.name+' '+o.name)}}}assert(d.items.some(p=>p.character==='CRYBABY'));});
test('All data payloads have unique IDs and retain numeric price semantics',()=>{for(const d of Object.values(data)){assert.equal(new Set(d.items.map(p=>p.id)).size,d.items.length);for(const p of d.items){assert(p.name);assert(p.amount==null||typeof p.amount==='number');assert(!p.url||/^https?:\/\//.test(p.url),p.id);}}});
test('Each site retains its own original interface and excludes development tools',()=>{
 const home=fs.readFileSync('_site/home-care/index.html','utf8'),toy=fs.readFileSync('_site/china-toys/index.html','utf8'),luggage=fs.readFileSync('_site/luggage-atlas/index.html','utf8');
 assert(home.includes('hc-site-brand')&&home.includes('White-label recommendations'));
 assert(toy.includes('simple-navigation.js')&&toy.includes('styles.css'));
 assert(luggage.includes('hero-art')&&luggage.includes('hero.css')&&luggage.includes('THE GLOBAL TRAVEL GOODS EDIT'));
 for(const html of [home,toy,luggage])assert(!/<script[^>]+(?:planogram|retail-studio|studio-viewer|three\.module)/i.test(html));
 assert(!toy.includes('planogram.js'));assert(!luggage.includes('href="studio.html"'));
 assert(!home.includes('data-section="workshop"'));
 const toyJS=fs.readFileSync('_site/china-toys/simple-navigation.js','utf8');assert(!toyJS.includes("['retail','Planogram']"));
 for(const id of Object.keys(data)){const html=fs.readFileSync(`_site/${id}/index.html`,'utf8');assert(!html.includes('class="site-switcher"'));}
});
test('News entries retain source links',()=>{for(const d of Object.values(data)){assert(d.news.length);for(const n of d.news){assert(n.id&&n.title);assert(n.sources?.length,n.title);assert(n.sources.some(s=>s.url),n.title)}}});

test('Unpriced luggage model references retain separate source-scoped specifications',()=>{const d=data['luggage-atlas'],by=new Map(d.items.map(p=>[p.id,p]));for(const r of JSON.parse(fs.readFileSync('luggage-atlas/model-features.json')).records.filter(r=>!r.offerId)){const p=by.get('reference-'+r.id);assert(p);assert.equal(p.url,r.source);assert.equal(p.amount,null);assert.equal(p.evidence,'Model / family source reference');}});

test('Luggage news excludes retired opportunity displays and exports',()=>{
 const source=fs.readFileSync('_site/luggage-atlas/atlas-upgrade.js','utf8');
 assert.doesNotMatch(source,/Open Story opportunity|Implications for Open Story|x\.implication|w\.analysis/);
 for(const hook of ['function weeklyDashboard','function showWeeklyDetail','function exportWeekly','Photo URL','Photo source'])assert(source.includes(hook),hook);
});
