import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mainSections,readView,viewAddress,sectionForView,stepFromHash} from './ui-src/navigation-model.js';
import {mountNavigation} from './ui-src/navigation-runtime.js';
import {navigationHeader,homeStart} from './navigation-build.mjs';

test('first visits start at Home while old catalog, country and workshop links retain their meaning',()=>{
 assert.equal(readView('',''),'home');assert.equal(readView('?v=old-link',''),'home');
 assert.equal(readView('?v=20261027-fast','#category-directory'),'catalog');
 for(const view of ['home','catalog','global','analysis','target','compare','opportunities','workshop'])assert.equal(readView('?view='+view),view);
 assert.equal(readView('?view=retailers'),'global');assert.equal(sectionForView('global'),'products');assert.equal(sectionForView('analysis'),'insights');
 assert.equal(viewAddress('home'),'/home-care/');assert.equal(new URL(viewAddress('global','United Kingdom'),'https://example.com').searchParams.get('country'),'United Kingdom');
 assert.equal(stepFromHash('#wl-real-products'),'references');assert.equal(stepFromHash('#wl-development-case'),'changes');assert.equal(stepFromHash('#wl-proposed-design'),'design');
});

test('five shared sections provide every existing tool, with Opportunities last and help separate',()=>{
 assert.deepEqual(mainSections,['home','products','workshop','insights','opportunities']);
 const html=navigationHeader();assert.deepEqual([...html.matchAll(/data-section="([^"]+)"/g)].map(m=>m[1]),mainSections);
 for(const view of ['catalog','global','compare','analysis','target','opportunities'])assert.ok(html.includes('data-homecare-view="'+view+'"'));
 for(const page of ['brand-factories.html','workshop/laundry-sorter.html?v=20261104-navigation#wl-real-products','help.html'])assert.ok(html.includes(page));
 assert.ok(html.indexOf('data-section="opportunities"')<html.indexOf('</nav>'));
 assert.ok(homeStart().includes('Start browsing products'));assert.ok(homeStart().includes('See China listings'));
 const site=new URL('./site/',import.meta.url);
 for(const page of ['help.html','tutorial.html','workshop/laundry-sorter.html','workshop/pantry-canisters.html']){
  const source=fs.readFileSync(new URL(page,site),'utf8');assert.equal((source.match(/aria-label="Main navigation"/g)||[]).length,1,page);
  assert.ok(source.includes('navigation.css'));assert.ok(source.includes('Help &amp; guide'));
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
 const link={dataset:{homecareView:'global',homecareCountry:'China'}};let prevented=false;
 listeners.click({target:{closest(){return link;}},button:0,preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(navigation.view,'global');assert.equal(navigation.options.country,'China');assert.equal(navigation.options.history,'push');
 menus[0].open=true;listeners.click({target});assert.equal(menus[0].open,false);
});
