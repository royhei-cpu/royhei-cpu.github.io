import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {mainSections,readView,viewAddress,sectionForView,stepFromHash} from './ui-src/navigation-model.js';
import {mountNavigation} from './ui-src/navigation-runtime.js';
import {navigationHeader,homeStart} from './navigation-build.mjs';

test('first visits start at Home while old catalog, country and workshop links retain their meaning',()=>{
 assert.equal(readView('',''),'home');assert.equal(readView('?v=old-link',''),'home');
 assert.equal(readView('?v=20261027-fast','#category-directory'),'catalog');
 for(const view of ['home','catalog','global','analysis','target','compare'])assert.equal(readView('?view='+view),view);
 for(const view of ['opportunities','workshop']){
  assert.equal(readView('?view='+view),'target');
  assert.equal(viewAddress(view),'/home-care/?view=target');
 }
 assert.equal(readView('?view=retailers'),'global');assert.equal(sectionForView('global'),'products');assert.equal(sectionForView('analysis'),'insights');
 assert.equal(viewAddress('home'),'/home-care/');assert.equal(new URL(viewAddress('global','United Kingdom'),'https://example.com').searchParams.get('country'),'United Kingdom');
 assert.equal(stepFromHash('#wl-real-products'),'references');assert.equal(stepFromHash('#wl-development-case'),'changes');assert.equal(stepFromHash('#wl-proposed-design'),'design');
});

test('three shared sections retain Target inspiration and help without retired duplicate tools',()=>{
 assert.deepEqual(mainSections,['home','products','insights']);
 const html=navigationHeader();assert.deepEqual([...html.matchAll(/data-section="([^"]+)"/g)].map(m=>m[1]),mainSections);
 for(const view of ['catalog','global','compare','analysis','target'])assert.ok(html.includes('data-homecare-view="'+view+'"'));
 assert.ok(html.includes('help.html'));assert.doesNotMatch(html,/brand-factories\.html|Brands &amp; factories|data-section="(?:workshop|opportunities)"/);
 assert.ok(homeStart().includes('Start browsing products'));assert.ok(homeStart().includes('See China listings'));
 const site=new URL('./site/',import.meta.url);
 for(const page of ['help.html','tutorial.html']){
  const source=fs.readFileSync(new URL(page,site),'utf8');assert.equal((source.match(/aria-label="Main navigation"/g)||[]).length,1,page);
  assert.ok(source.includes('navigation.css'));assert.ok(source.includes('Help &amp; guide'));assert.doesNotMatch(source,/brand-factories\.html/);
 }
});

test('the actual shared-menu handlers close other menus, support Escape and send links to the existing controller',()=>{
 const listeners={},target={};let focused=false,navigation;
 const makeMenu=()=>({tagName:'DETAILS',open:false,dataset:{section:'products'},summary:{setAttribute(){},removeAttribute(){},focus(){focused=true;}},handlers:{},querySelector(){return this.summary;},addEventListener(type,fn){this.handlers[type]=fn;}});
 const menus=[makeMenu(),makeMenu()];menus[1].dataset.section='insights';
 const header={dataset:{},querySelectorAll(selector){return selector==='details'?menus:selector==='[data-section]'?menus:[];},contains(node){return node!==target;}};
 const doc={querySelector:selector=>selector==='.hc-site-header'?header:null,getElementById(){return null;},body:{hasAttribute(){return false;}},addEventListener(type,fn){listeners[type]=fn;}};
 const win={HCHomecareUpgradeController:{navigate(view,options){navigation={view,options};}},location:{}};
 mountNavigation(doc,win);menus[0].open=true;menus[1].open=true;menus[1].handlers.toggle();assert.equal(menus[0].open,false);
 listeners.keydown({key:'Escape'});assert.equal(menus[1].open,false);assert.equal(focused,true);
 const link={dataset:{homecareView:'global',homecareCountry:'China'},hasAttribute(){return false;}};let prevented=false;
 listeners.click({target:{closest(){return link;}},button:0,preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(navigation.view,'global');assert.equal(navigation.options.country,'China');assert.equal(navigation.options.history,'push');
 menus[0].open=true;listeners.click({target});assert.equal(menus[0].open,false);
});

test('Target and legacy recommendation links open the existing Home Care renderer without a retired Target button',()=>{
 const requireUi=createRequire(new URL('./ui-src/package.json',import.meta.url));
 const source=requireUi('esbuild').transformSync(fs.readFileSync(new URL('./ui-src/upgrade.jsx',import.meta.url),'utf8'),{loader:'jsx',format:'cjs'}).code;
 for(const requested of ['target','opportunities','workshop']){
  const nodes=new Map(),clicked=[],observers=[];
  const node=id=>{const n={id,hidden:false,dataset:{},setAttribute(name,value){this[name]=value;},querySelectorAll(){return[];}};nodes.set(id,n);return n;};
  const catalog=node('catalog-view'),recommendations=node('executive-view');recommendations.hidden=true;
  for(const id of ['analysis-view','compare-view'])node(id).hidden=true;
  const start=node('homecare-start');start.after=n=>nodes.set(n.id,n);
  const recommendationsButton=node('nav-opportunities');
  recommendationsButton.click=()=>{clicked.push(recommendationsButton.id);catalog.hidden=true;recommendations.hidden=false;};
  node('nav-catalog');node('nav-analysis');node('nav-global');
  const nav={querySelectorAll:selector=>selector==='button'?[...nodes.values()].filter(n=>n.id.startsWith('nav-')):[]};
  const document={body:{dataset:{}},querySelector:selector=>selector==='.view-nav'?nav:null,getElementById:id=>nodes.get(id),createElement:()=>({}),addEventListener(){},dispatchEvent(){}};
  const window={addEventListener(){}},module={exports:{}};
  const context=vm.createContext({document,window,module,exports:module.exports,URLSearchParams,location:{search:'?view='+requested,hash:'',pathname:'/home-care/'},history:{replaceState(){},pushState(){}},localStorage:{getItem:()=>null},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},MutationObserver:class{constructor(callback){observers.push(callback);}observe(){}},require(name){
   if(name==='react')return{createElement(){return{};}};
   if(name==='react-dom/client')return{createRoot:()=>({render(){}})};
   if(name==='react-dom')return{flushSync:callback=>callback()};
   if(name==='./navigation-model.js')return{readView,viewAddress};
   if(name==='./audio-ui.jsx')return{AudioControls(){}};
   if(name==='./upgrade-model.js')return{catalogRows:()=>[],reorderNavigation(){}};
   throw Error('Unexpected test import: '+name);
  }});
  vm.runInContext(source,context);
  module.exports.mount({items:[],byId:new Map(),cached:new Map(),picks:new Set(),references:[],redraw(){}});
  assert.deepEqual(clicked,['nav-opportunities'],requested);
  assert.equal(recommendations.hidden,false,requested);assert.equal(catalog.hidden,true,requested);
  assert.equal(document.body.dataset.homecareView,'target',requested);
  for(const observer of observers)observer();
  assert.equal(document.body.dataset.homecareView,'target','Renderer visibility must retain the Target route');
  assert.equal(nodes.has('nav-target'),false,'The retired travel renderer is not required');
  window.HCHomecareUpgradeController.navigate('opportunities');
  assert.equal(document.body.dataset.homecareView,'target','Legacy controller navigation reaches Target');
 }
});
