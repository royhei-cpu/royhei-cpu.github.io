const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname,elements=new Map(),storage=new Map(),windowEvents=new Map();
function el(id){if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,checked:false,open:false,dataset:{},style:{},listeners:new Map(),addEventListener(name,fn){this.listeners.set(name,fn);},setAttribute(name,value){this[name]=value;},removeAttribute(name){delete this[name];},scrollIntoView(){this.scrolled=true;},focus(){this.focused=true;},querySelector(){return el('#research-summary');},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);}
const ctx={window:{addEventListener:(name,fn)=>windowEvents.set(name,fn),scrollTo(){}},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({click(){}})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{hash:'',search:''},setTimeout(){},URL:{createObjectURL(){return '';},revokeObjectURL(){}},Blob:function(){},console};
vm.createContext(ctx);
for(const file of ['data.js','photos.js','weekly.js','atlas-upgrade.js','fashion.js','fashion-ui.js','innovation.js','innovation-ui.js','workbench.js','model-evidence.js','model-catalog.js','tutorial.js','offer-photos.js','directory.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run('tab'),'start');assert.equal(el('#hero').hidden,false,'The home travel hero stays visible after rendering');assert.equal(el('#innerHeading').hidden,true);assert.equal((el('#view').innerHTML.match(/class="start-card"/g)||[]).length,4);
assert(el('#view').innerHTML.includes('Browse real luggage'));assert(el('#view').innerHTML.includes('name="q"'));assert(el('#view').innerHTML.includes('href="#research"'));assert.equal(el('#routeContext').hidden,true);
assert.equal(run("atlasRoute('', '?q=Open%20Story')"),'directory');assert.equal(run("atlasRoute('#brands')"),'brands');assert.equal(run("atlasRoute('#costTableAnchor')"),'workbench');assert.equal(run("atlasRoute('#old-missing-section')"),'start');
el('#researchToggle').listeners.get('click')();assert.equal(el('#researchMenu').open,true);assert.equal(el('#researchToggle')['aria-expanded'],'true');assert(el('#researchMenu').scrolled);assert(el('#research-summary').focused);
run("location.hash='#directory'");windowEvents.get('hashchange')();assert.equal(run('tab'),'directory');assert.equal(el('#hero').hidden,true,'Research pages keep compact headings');assert.equal(el('#researchMenu').open,false);assert.equal(el('#researchMenu').hidden,true);assert(el('#innerHeading h1').focused);
run("directoryToggle('offer-a8bb8cf6');costScenarios['offer-a8bb8cf6']={fob:'50',freight:'7',duty:'10',other:'0',retail:'160',quantity:'100'};saveDesk()");assert.equal(el('#navShortlistCount').textContent,'1');assert.equal(el('#navShortlistCount').hidden,false);
run("location.hash='#workbench'");windowEvents.get('hashchange')();assert(el('#view').innerHTML.indexOf('id="costTableAnchor"')<el('#view').innerHTML.indexOf('id="deskOfferPicker"'));
assert(el('#deskComparison').innerHTML.includes('Paralux'));assert(el('#deskComparison').innerHTML.includes('Supplier evidence'));assert.equal(run("scenarioFor(selectedOffers()[0]).fob"),'50');
run("location.hash='#main'");windowEvents.get('hashchange')();assert.equal(run('tab'),'workbench');assert(el('#main').focused);
const before=el('#view').innerHTML;
run("location.hash='#costTableAnchor'");windowEvents.get('hashchange')();assert.equal(run('tab'),'workbench');assert(el('#costTableAnchor').scrolled);assert.equal(el('#view').innerHTML,before,'An in-page jump must not recreate the comparison or lose control state.');
run("location.hash='#research'");windowEvents.get('hashchange')();assert(el('#researchMenu').open);assert.equal(run('tab'),'research');assert.equal(el('#researchMenu').hidden,false);run("location.hash='#start'");windowEvents.get('hashchange')();run("location.hash='#directory'");windowEvents.get('hashchange')();assert(run("itemSelection.has('offer-a8bb8cf6')"));assert.equal(run("scenarioFor(selectedOffers()[0]).freight"),'7');
run("itemSelection.clear();saveDesk();location.hash='#workbench';render()");assert(el('#deskComparison').innerHTML.includes('Choose your first products'));assert(el('#deskComparison').innerHTML.includes('href="#directory"'));assert.equal(el('#navShortlistCount').hidden,true);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(index.includes('class="hero-art"') && index.includes('Explore the collection'),'The illustrated home hero and collection link render before JavaScript.');
assert.equal(el('#editionCoverage').textContent,run("D.brands.length+' BRANDS / '+D.retailers.length+' RETAIL CHANNELS / GLOBAL PERSPECTIVE'"));

for(const file of ['index.html','features.html']) {
 const html=fs.readFileSync(path.join(root,file),'utf8');
 for(const label of ['Find luggage','Compare','Research','Help']) assert(html.includes(label),label);
 assert(!html.includes('Develop Open Story'));
}
const tutorial=fs.readFileSync(path.join(root,'tutorial.html'),'utf8');
assert(tutorial.includes('tutorial/luggage-guide.mp4') && tutorial.includes('href="./#workbench"'));
const hub=index.slice(index.indexOf('<details id="researchMenu"'),index.indexOf('<footer>'));assert.equal((hub.match(/<a /g)||[]).length,3);for(const url of ['research.html','#trends','#suppliers'])assert(hub.includes('href="'+url+'"'));for(const duplicate of ['#brands','#photos','#prices','features.html','#overview','tutorial.html'])assert(!hub.includes('href="'+duplicate+'"'));
assert(!index.includes('class="atlas-journey"'));
assert(!el('#directoryShortlist').innerHTML.includes('studio.html'));
console.log('PASS: travel hero, native navigation, research menu, comparison, saved shortlist, exports menu and site-specific tutorial.');

run("location.hash='#prices';render()");assert.equal((el('#priceContent').innerHTML.match(/<tr><td>/g)||[]).length,30);el('#priceMore').onclick();assert.equal((el('#priceContent').innerHTML.match(/<tr><td>/g)||[]).length,60);el('#priceQ').oninput({target:{value:'Quince'}});assert.equal(run('priceLimit'),30);
run("location.hash='#photos';render()");assert.equal((el('#photoCards').innerHTML.match(/class=\"photo-card\"/g)||[]).length,6);el('#photoMore').onclick();assert.equal((el('#photoCards').innerHTML.match(/class=\"photo-card\"/g)||[]).length,12);
run("location.hash='#suppliers';render()");assert(run("supplierRows().every(b=>fashionFor(b).supplier.status!=='Not verified')"));
console.log('PASS: bounded price/photo results, load more, filter resets, and sourced supplier default.');
