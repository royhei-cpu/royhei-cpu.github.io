#!/usr/bin/env python3
"""Idempotent navigation repair. Does not change product data or other catalogs."""
from pathlib import Path
import hashlib
import re

VERSION = '20261030-navigation-repair-1'
MARKER = '/* ATLAS_NAVIGATION_REPAIR_1 */'

HELPERS = r'''/* ATLAS_NAVIGATION_REPAIR_1 */
window.ATLAS_NAVIGATION_VERSION='20261030-navigation-repair-1';
function focusProductResults(){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const el=$('results');
    el.scrollIntoView({block:'start',behavior:'instant'});
    el.setAttribute('tabindex','-1');el.focus({preventScroll:true});
  }));
}
function clearBrowseRestrictions(){
  state.view='catalog';
  for(const key of ['ip','search','category','evidence','year','currency','change'])state[key]='';
  state.sort='featured';page=1;
}
function chooseBrand(value){
  const wanted=String(value||'');
  const previousShop=state.retailer;
  clearBrowseRestrictions();
  state.brand=wanted;
  // Keep a selected shop only when it actually has this brand. Otherwise
  // browse the brand across shops instead of showing a misleading blank grid.
  if(wanted&&state.retailer&&!products.some(p=>p.brand===wanted&&atRetailer(p)))state.retailer='';
  brands();syncControls();render();focusProductResults();
  if(previousShop&&!state.retailer)toast('Showing '+(wanted||'all brands')+' across all shops. Earlier filters cleared.');
  else toast('Showing '+num(filtered.length)+' products / series. Earlier filters cleared.');
}
function showAllProducts(){state.view='catalog';reset();focusProductResults()}
'''

BRANDS = r'''function brands(){
 const pool=products.filter(atRetailer),counts={},totals={};
 pool.forEach(p=>counts[p.brand]=(counts[p.brand]||0)+1);
 products.forEach(p=>totals[p.brand]=(totals[p.brand]||0)+1);
 const all=[...new Set([...(data.priority_brands||[]),...Object.keys(counts).sort()])];
 let bs=allBrands?all:(data.priority_brands||[]).slice(0,14);
 if(state.brand&&!bs.includes(state.brand))bs.push(state.brand);
 $('brandTabs').classList.toggle('expanded',allBrands);
 $('brandTabs').innerHTML=[['','All brands'],...bs.map(b=>[b,b])].map(([v,b])=>{
  const local=v?(counts[v]||0):pool.length,total=v?(totals[v]||0):products.length;
  const otherShop=!!(v&&state.retailer&&!local&&total);
  return `<button class="brand-tab ${state.brand===v?'active':''}" data-brand="${esc(v)}" aria-pressed="${state.brand===v}" ${v&&!total?'disabled aria-disabled="true"':''} title="${esc(v&&!total?'No product listings captured yet':otherShop?'Browse this brand across all shops':'Browse available product listings')}">${esc(b)}<span>${num(local||total)}${otherShop?' · all shops':''}</span></button>`;
 }).join('');
 $('allBrandsButton').textContent=allBrands?'Show main brands':'Show all brand tabs';
 const choices=[...new Set([...Object.keys(counts),...(state.brand?[state.brand]:[])])].sort();
 $('brandSelect').innerHTML='<option value="">All brands</option>'+choices.map(b=>`<option value="${esc(b)}">${esc(b)} (${num(counts[b]||totals[b])})</option>`).join('');
 $('brandSelect').value=state.brand;
}'''

RETAILER = r'''function chooseRetailer(k){
 const selected=retailers.get(k);
 if(k&&(!selected||!selected.count)){toast('This shop has no captured listings yet. Choose a shop with products.');$('retailer').value=state.retailer;return}
 clearBrowseRestrictions();state.retailer=selected?k:'';state.brand='';
 brands();syncControls();render();focusProductResults();
 toast('Showing '+num(filtered.length)+' products / series. Earlier filters cleared.');
}'''


def once(text, old, new, label):
    n=text.count(old)
    if n!=1:
        raise RuntimeError(f'{label}: expected one matching signature, found {n}; no files changed')
    return text.replace(old,new,1)


def apply(root=None):
    root=Path(root) if root else Path(__file__).resolve().parent
    app_path=root/'app.js';index_path=root/'index.html'
    app=app_path.read_text(encoding='utf-8')
    if MARKER not in app:
        app=once(app,'function reset(keepRetailer=false){',HELPERS+'\nfunction reset(keepRetailer=false){state.view=\'catalog\';','reset and navigation helpers')
        app=once(app,"function chooseRetailer(k){state.retailer=retailers.has(k)?k:'';state.view='catalog';reset(true)}",RETAILER,'retailer selection')
        app=once(app,"if(b.dataset.brand!==undefined){state.brand=b.dataset.brand;if(b.dataset.catalog)state.view='catalog';page=1;brands();render()}","if(b.dataset.brand!==undefined){chooseBrand(b.dataset.brand);return}",'brand tab selection')
        app=once(app,"$('brandSelect').addEventListener('change',()=>{state.brand=$('brandSelect').value;page=1;brands();render()});","$('brandSelect').addEventListener('change',()=>chooseBrand($('brandSelect').value));",'brand dropdown selection')
        app=once(app,"$('resetFilters').onclick=()=>reset();","$('resetFilters').onclick=showAllProducts;",'reset filters view')
        app=once(app,"if(b.dataset.reset)reset(true)","if(b.dataset.reset){reset(true);focusProductResults()}",'empty state recovery')
        app=once(app,"for(const key of ['brand','search','category','evidence','year','currency'])state[key]='';","for(const key of ['ip','brand','search','category','evidence','year','currency'])state[key]='';",'weekly drilldown IP reset')
        app=once(app,"o.value=r.id;o.textContent=r.name+", "o.value=r.id;o.disabled=!r.count;o.textContent=r.name+",'uncaptured shop option')
        app=once(app,'data-retailer="${esc(x.id)}" aria-pressed=', 'data-retailer="${esc(x.id)}" ${!x.count?\'disabled aria-disabled="true"\':\'\'} aria-pressed=', 'uncaptured shop button')
        app=once(app,'<button class="text-button" data-retailer="${esc(r.id)}">View products</button>', '<button class="text-button" data-retailer="${esc(r.id)}" ${!r.count?\'disabled\':\'\'}>${r.count?\'View products\':\'No captured listings\'}</button>','coverage shop navigation')
        app=once(app,'>Clear product filters</button>', '>Show available products</button>','empty-state action wording')
        start=app.index('function brands(){');end=app.index('\nfunction weeklySummary()',start)
        app=app[:start]+BRANDS+app[end:]
        app=once(app,'brands();syncControls();render();\n})();','brands();syncControls();render();if(state.brand||state.retailer)focusProductResults();\n})();','deep-link result visibility')
    index=index_path.read_text(encoding='utf-8')
    index=re.sub(r'<a\b[^>]*href=["\'][^"\']*home-care[^"\']*["\'][^>]*>.*?</a>','',index,flags=re.I|re.S)
    # A new asset URL prevents stale cached code after any later rebuild.
    version=hashlib.sha256(app.encode()).hexdigest()[:12]
    index,n=re.subn(r'app\.js(?:\?[^"\s]*)?', 'app.js?v=nav-'+version,index)
    if n!=1:raise RuntimeError('Expected one app.js reference')
    if re.search(r'home[ -]?care',index,re.I):raise RuntimeError('Unrelated catalog text remains in the public HTML')
    app_path.write_text(app,encoding='utf-8');index_path.write_text(index,encoding='utf-8')
    return version


def install_hooks(root):
    hook="\n# Preserve tested product navigation after generated UI changes.\nif __name__ == '__main__':\n    from navigation_fix import apply as _apply_navigation_fix\n    _apply_navigation_fix(R)\n"
    for name in ('review_publish.py','build_ip_directory.py'):
        p=root/name;text=p.read_text(encoding='utf-8')
        if 'from navigation_fix import apply as _apply_navigation_fix' not in text:
            p.write_text(text.rstrip()+'\n'+hook,encoding='utf-8')


if __name__=='__main__':
    root=Path(__file__).resolve().parent
    version=apply(root)
    install_hooks(root)
    print('Navigation fixed; products unchanged; browser script version:',version)
