import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {readView,viewAddress} from './navigation-model.js';
import {workshopPath} from './workshop-logic.js';
import {AudioControls} from './audio-ui.jsx';
import {catalogRows,globalCounts,matchingRows,asNativeReference,reorderNavigation} from './upgrade-model.js';
const extra={target:'_blank',rel:'noopener noreferrer'};
const nativeViewIds=['catalog-view','executive-view','analysis-view','compare-view','target-inspiration-view'];

export function GlobalListings({rows,picks,toggle,compare,initialCountry='All countries',referenceError=''}){
 const [country,setCountry]=useState(initialCountry),[retailer,setRetailer]=useState('All retailers'),[query,setQuery]=useState(''),[limit,setLimit]=useState(24);
 const countries=useMemo(()=>[...new Set(rows.flatMap(p=>p.countries))].sort(),[rows]);
 const countryRows=useMemo(()=>matchingRows(rows,{country}),[rows,country]);
 const retailers=useMemo(()=>[...new Set(countryRows.map(p=>p.retailer))].sort(),[countryRows]);
 const shown=useMemo(()=>matchingRows(rows,{country,retailer,query}),[rows,country,retailer,query]);
 const totals=useMemo(()=>globalCounts(rows),[rows]);
 function chooseCountry(value){setCountry(value);setRetailer('All retailers');setLimit(24);}
 return <section className="hc-global" aria-label="Global retailer product listings"><p className="eyebrow">GLOBAL RETAILERS & ITEMS</p><h2>Find the product. See the source.</h2><p>{totals.records.toLocaleString()} recorded catalog and international reference records · {totals.countries} countries · {totals.retailers} retailer labels. Coverage is partial; records can include different snapshots of the same listing.</p>
  {referenceError&&<p role="alert" className="hc-global-note">{referenceError}</p>}<div className="hc-global-filters"><label>Country / market<select aria-label="Global country" value={country} onChange={e=>chooseCountry(e.target.value)}><option>All countries</option>{countries.map(c=><option key={c}>{c}</option>)}</select></label><label>Retailer<select aria-label="Global retailer" value={retailer} onChange={e=>{setRetailer(e.target.value);setLimit(24);}}><option>All retailers</option>{retailers.map(r=><option key={r}>{r}</option>)}</select></label><label>Find an item<input aria-label="Global product search" type="search" placeholder="Brand, product or category" value={query} onChange={e=>{setQuery(e.target.value);setLimit(24);}}/></label></div>
  <div className="hc-global-shortcuts"><button onClick={()=>chooseCountry('China')}>China listings</button><button onClick={()=>chooseCountry('Japan')}>Japan</button><button onClick={()=>chooseCountry('United Kingdom')}>United Kingdom</button><button onClick={()=>{chooseCountry('All countries');setQuery('');}}>Clear filters</button><button onClick={compare} disabled={!picks.size}>Compare selected ({picks.size})</button></div>
  <p className="hc-global-result" role="status">{shown.length.toLocaleString()} matching listings{country==='All countries'?'':` · ${country}`}. Prices and evidence dates remain as originally recorded.</p>
  <div className="hc-global-grid">{shown.slice(0,limit).map(p=><article className="hc-global-card" key={p.listingKey} data-record-id={p.id}><a href={p.link} {...extra}><img src={p.image} alt={p.name} loading="lazy" onError={e=>{if(!e.currentTarget.src.endsWith('/global-photo-pending.svg'))e.currentTarget.src='/home-care/global-photo-pending.svg';}}/></a><div><p className="hc-global-meta">{p.retailer} · {p.market}</p><h3>{p.brand&&<span>{p.brand} · </span>}{p.name}</h3><p>{p.category}</p><strong>{p.priceLabel}</strong><p className="hc-global-evidence">{p.sourceDate?`${p.sourceDateKind} ${p.sourceDate}`:'Source date not recorded'} · {p.sourceScope}</p><div className="hc-global-actions"><a href={p.link} {...extra}>Source listing ↗</a><button aria-pressed={picks.has(p.id)} onClick={()=>toggle(p.id)}>{picks.has(p.id)?'Selected ✓':'Select to compare'}</button></div></div></article>)}</div>
  {!shown.length&&<p>No records match these filters. An empty result is a research gap, not proof of retailer absence.</p>}{shown.length>limit&&<button onClick={()=>setLimit(v=>v+24)}>Show 24 more listings ({Math.min(limit,shown.length)} of {shown.length.toLocaleString()})</button>}
  <p className="hc-global-note">International references join the same selection, comparison and CSV tools. The U.S. catalog and its saved sales analysis retain their original records and evidence. A reference price does not confirm current stock, delivery, a matched pack or a Target assortment gap.</p>
 </section>;
}

function Workspace({controller,context,rows,initialMode,initialCountry}){
 const [mode,setMode]=useState(initialMode==='global'?'global':null),[country,setCountry]=useState(initialCountry),[seenGlobal,setSeenGlobal]=useState(initialMode==='global'),[,refresh]=useState(0);
 controller.renderMode=(value,nextCountry)=>{setMode(value==='global'?'global':null);if(value==='global')setSeenGlobal(true);if(nextCountry)setCountry(nextCountry);};
 useEffect(()=>{const changed=()=>refresh(v=>v+1);document.addEventListener('click',changed);return()=>document.removeEventListener('click',changed);},[]);
 const toggle=id=>{context.picks.has(id)?context.picks.delete(id):context.picks.add(id);try{localStorage.setItem('hc-merchant-picks',JSON.stringify([...context.picks]));}catch{}context.redraw();refresh(v=>v+1);};
 return <><AudioControls/><div className="hc-upgrade-panel" hidden={!mode} id="homecare-workspace">{seenGlobal&&<GlobalListings key={country} rows={rows} picks={context.picks} toggle={toggle} compare={()=>controller.navigate('compare',{history:'push',scroll:true})} initialCountry={country} referenceError={context.referencesError}/>}</div></>;
}

export function mount(context){
 const nav=document.querySelector('.view-nav'),opportunities=document.getElementById('nav-opportunities');
 if(!nav||!opportunities||document.getElementById('homecare-upgrade-root'))return;
 const params=new URLSearchParams(location.search),requested=readView(location.search,location.hash);
 if(requested==='workshop'){location.replace(workshopPath(params.get('concept'))+'#wl-real-products');return;}
 const rows=catalogRows(context.items,id=>context.cached.get(id)?.querySelector('img')?.getAttribute('src')||'',context.references);
 for(const p of context.references)if(!context.byId.has(p.id))context.byId.set(p.id,asNativeReference(p));
 try{const saved=JSON.parse(localStorage.getItem('hc-merchant-picks')||'[]');if(Array.isArray(saved))for(const id of saved)if(context.byId.has(id))context.picks.add(id);}catch{}
 const root=document.createElement('div');root.id='homecare-upgrade-root';document.getElementById('homecare-start').after(root);
 const controller={mode:null,switching:false,renderMode(){}};
 const viewForId={'catalog-view':'catalog','executive-view':'opportunities','analysis-view':'analysis','target-inspiration-view':'target','compare-view':'compare'};
 const buttonForView={catalog:'nav-catalog',analysis:'nav-analysis',opportunities:'nav-opportunities',target:'nav-target'};
 function updateAddress(view,country,kind='replace'){
  const address=viewAddress(view,country==='All countries'?'':country),current=location.pathname+location.search+location.hash;
  if(address!==current)history[kind==='push'?'pushState':'replaceState'](null,'',address);
 }
 function setSection(view,country){
  controller.mode=['home','global'].includes(view)?view:null;controller.renderMode(view,view==='global'?country:undefined);
  document.body.dataset.homecareView=view;document.getElementById('homecare-start').hidden=view!=='home';
  for(const button of nav.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.id===({global:'nav-global',...buttonForView}[view])));
  document.dispatchEvent(new CustomEvent('homecare:viewchange',{detail:{view}}));
 }
 function navigate(view,{country='All countries',history:historyKind='none',scroll=false}={}){
  if(view==='workshop'){location.href=workshopPath(params.get('concept'))+'#wl-real-products';return;}
  controller.switching=true;
  if(view==='home'||view==='global')for(const id of nativeViewIds){const n=document.getElementById(id);if(n)n.hidden=true;}
  else if(view==='compare')window.HCProductCompare.show();
  else document.getElementById(buttonForView[view]||'nav-catalog')?.click();
  setSection(view,country);controller.switching=false;
  if(historyKind!=='none')updateAddress(view,country,historyKind);
  if(scroll)requestAnimationFrame(()=>{const heading=document.querySelector(view==='home'?'#hc-start-title':view==='global'?'#homecare-workspace h2':'.hc-catalog-header h1');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start'});});
 }
 controller.navigate=navigate;
 for(const [id,label,view] of [['nav-global','Global retailers & items','global'],['nav-workshop','White Label Workshop','workshop']]){
  let b=document.getElementById(id);if(!b){b=document.createElement('button');b.type='button';b.id=id;opportunities.before(b);}b.textContent=label;b.setAttribute('aria-pressed','false');b.onclick=()=>navigate(view,{history:'push',scroll:true});
 }
 const factory=[...nav.querySelectorAll('a')].find(a=>a.href.includes('brand-factories'));if(factory)factory.dataset.navigationId='brand-factories';
 const video=[...nav.querySelectorAll('a')].find(a=>a.href.includes('tutorial'));if(video)video.dataset.navigationId='video-guide';reorderNavigation(nav);
 document.addEventListener('click',event=>{
  const n=event.target.closest?.('.view-nav button');
  if(n&&!controller.switching){const view=Object.entries(buttonForView).find(([,id])=>id===n.id)?.[0];if(view){setSection(view);updateAddress(view);}}
  if(!controller.switching&&event.target.closest?.('#compare-selected')){setSection('compare');updateAddress('compare','', 'push');}
 });
 window.addEventListener('popstate',()=>navigate(readView(location.search,location.hash),{country:new URLSearchParams(location.search).get('country')||'All countries'}));
 const observer=new MutationObserver(()=>{const visible=nativeViewIds.find(id=>{const n=document.getElementById(id);return n&&!n.hidden;});const view=viewForId[visible];if(view&&!controller.switching&&document.body.dataset.homecareView!==view){setSection(view);updateAddress(view);}});
 for(const id of nativeViewIds){const node=document.getElementById(id);if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden']});}
 const weekly=document.getElementById('weekly-updates'),directory=document.getElementById('category-directory');
 if(weekly&&directory){const disclosure=document.createElement('details');disclosure.id='homecare-weekly-brief';const summary=document.createElement('summary');summary.textContent='Weekly brief, additions and coverage notes';disclosure.append(summary);weekly.before(disclosure);disclosure.append(weekly);disclosure.before(directory);}
 flushSync(()=>createRoot(root).render(<Workspace controller={controller} context={context} rows={rows} initialMode={requested} initialCountry={params.get('country')||'All countries'}/>));
 window.HCHomecareUpgradeController={navigate,show:(view,country)=>navigate(view,{country,history:'push',scroll:true}),hide:()=>setSection('catalog')};
 context.redraw();navigate(requested,{country:params.get('country')||'All countries'});
}
