import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AudioControls} from './audio-ui.jsx';
import {catalogRows,globalCounts,matchingRows,asNativeReference,reorderNavigation} from './upgrade-model.js';
const Workshop=React.lazy(()=>import('./workshop-ui.jsx').then(m=>({default:m.WhiteLabelWorkshop})));
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

function Workspace({controller,context,rows,initialMode,initialCountry,initialConcept}){
 const [mode,setMode]=useState(initialMode),[concept,setConcept]=useState(initialConcept||'laundry-sorter'),[,refresh]=useState(0);
 controller.renderMode=setMode;
 useEffect(()=>{const changed=()=>refresh(v=>v+1);document.addEventListener('click',changed);return()=>document.removeEventListener('click',changed);},[]);
 const toggle=id=>{context.picks.has(id)?context.picks.delete(id):context.picks.add(id);try{localStorage.setItem('hc-merchant-picks',JSON.stringify([...context.picks]));}catch{}context.redraw();refresh(v=>v+1);};
 function chooseConcept(id){setConcept(id);const u=new URL(location.href);u.searchParams.set('concept',id);history.replaceState(null,'',u);}
 return <><AudioControls/><div className="hc-upgrade-panel" hidden={!mode} id="homecare-workspace">{mode==='global'&&<GlobalListings rows={rows} picks={context.picks} toggle={toggle} compare={()=>window.HCProductCompare.show()} initialCountry={initialCountry} referenceError={context.referencesError}/>} {mode==='workshop'&&<React.Suspense fallback={<p role="status">Loading White Label Workshop…</p>}><Workshop catalog={[]} onOpen={()=>{}} onCompare={toggle} selected={[...context.picks]} conceptId={concept} setConceptId={chooseConcept}/></React.Suspense>}</div></>;
}

export function mount(context){
 const nav=document.querySelector('.view-nav'),opportunities=document.getElementById('nav-opportunities');
 if(!nav||!opportunities||document.getElementById('homecare-upgrade-root'))return;
 const params=new URLSearchParams(location.search),initial=params.get('view');
 const requested=initial==='workshop'?'workshop':['global','retailers'].includes(initial)?'global':null;
 const rows=catalogRows(context.items,id=>context.cached.get(id)?.querySelector('img')?.getAttribute('src')||'',context.references);
 for(const p of context.references)if(!context.byId.has(p.id))context.byId.set(p.id,asNativeReference(p));
 try{const saved=JSON.parse(localStorage.getItem('hc-merchant-picks')||'[]');if(Array.isArray(saved))for(const id of saved)if(context.byId.has(id))context.picks.add(id);}catch{}
 const root=document.createElement('div');root.id='homecare-upgrade-root';nav.after(root);
 const controller={mode:null,renderMode(){}};
 function updateAddress(mode,country){const u=new URL(location.href);if(mode){u.searchParams.set('view',mode);u.hash='homecare-workspace';}else{if(['global','retailers','workshop'].includes(u.searchParams.get('view')))u.searchParams.delete('view');u.searchParams.delete('concept');u.hash='category-directory';}if(country)u.searchParams.set('country',country);else if(mode!=='global')u.searchParams.delete('country');history.replaceState(null,'',u);}
 function hide(){if(!controller.mode)return;controller.mode=null;controller.renderMode(null);for(const id of ['nav-global','nav-workshop'])document.getElementById(id)?.setAttribute('aria-pressed','false');updateAddress(null);}
 function show(mode,country){
  controller.mode=mode;for(const id of nativeViewIds){const node=document.getElementById(id);if(node)node.hidden=true;}
  for(const b of nav.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.id==='nav-'+mode));
  controller.renderMode(mode);updateAddress(mode,country);
  document.getElementById('homecare-upgrade-root').scrollIntoView({block:'start'});
 }
 for(const [id,label,mode] of [['nav-global','Global retailers & items','global'],['nav-workshop','White Label Workshop','workshop']]){
  let b=document.getElementById(id);if(!b){b=document.createElement('button');b.type='button';b.id=id;opportunities.before(b);}b.textContent=label;b.setAttribute('aria-pressed','false');b.onclick=()=>show(mode);
 }
 const factory=[...nav.querySelectorAll('a')].find(a=>a.href.includes('brand-factories'));if(factory)factory.dataset.navigationId='brand-factories';
 const video=[...nav.querySelectorAll('a')].find(a=>a.href.includes('tutorial'));if(video)video.dataset.navigationId='video-guide';
 reorderNavigation(nav);
 document.addEventListener('click',event=>{const n=event.target.closest?.('.view-nav button,.view-nav a');if(n&&!['nav-global','nav-workshop'].includes(n.id))hide();
  const jump=event.target.closest?.('[data-homecare-open]');if(jump){event.preventDefault();if(jump.dataset.homecareCountry){location.href='/home-care/?view=global&country='+encodeURIComponent(jump.dataset.homecareCountry)+'#homecare-workspace';return;}show(jump.dataset.homecareOpen);}
 });
 const observer=new MutationObserver(()=>{if(controller.mode&&nativeViewIds.some(id=>{const n=document.getElementById(id);return n&&!n.hidden;}))hide();});
 for(const id of nativeViewIds){const node=document.getElementById(id);if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden']});}
 const weekly=document.getElementById('weekly-updates'),directory=document.getElementById('category-directory');
 if(weekly&&directory){const disclosure=document.createElement('details');disclosure.id='homecare-weekly-brief';const summary=document.createElement('summary');summary.textContent='Weekly brief, additions and coverage notes';disclosure.append(summary);weekly.before(disclosure);disclosure.append(weekly);disclosure.before(directory);}
 createRoot(root).render(<Workspace controller={controller} context={context} rows={rows} initialMode={requested} initialCountry={params.get('country')||'All countries'} initialConcept={params.get('concept')}/>);
 window.HCHomecareUpgradeController={show,hide};
 // React installs its setter during the first render; hide native views immediately for a deep link.
 if(requested){controller.mode=requested;for(const id of nativeViewIds){const n=document.getElementById(id);if(n)n.hidden=true;}for(const b of nav.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.id==='nav-'+requested));}
 context.redraw();
}
