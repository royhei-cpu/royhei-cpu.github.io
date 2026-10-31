/* Native links remain usable before the catalog finishes loading. */
(() => {
  const nav=document.getElementById('atlasBrandNav');
  if(!nav)return;
  const select=nav.querySelector('select');
  const brands=[...new Set((window.TOY_ATLAS?.products||[]).map(p=>p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  for(const brand of brands){const option=document.createElement('option');option.value=brand;option.textContent=brand;select.append(option);}
  select.disabled=!brands.length;
  select.addEventListener('change',()=>{if(select.value)location.href='./?'+new URLSearchParams({brand:select.value})+'#results';});
  function active(){const brand=new URLSearchParams(location.search).get('brand')||'';nav.querySelectorAll('[data-nav-brand]').forEach(a=>{if(a.dataset.navBrand===brand)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});select.value=brand;}
  active();window.addEventListener('popstate',active);
  const results=document.getElementById('resultsTitle');if(results)new MutationObserver(active).observe(results,{childList:true});
})();
