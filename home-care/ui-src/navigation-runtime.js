import {readView,sectionForView,viewLabels} from './navigation-model.js';
export function mountNavigation(doc=document,win=window){
 const header=doc.querySelector('.hc-site-header');if(!header||header.dataset.navigationReady==='true')return;header.dataset.navigationReady='true';
 const menus=[...header.querySelectorAll('details')];
 function close(){for(const menu of menus)menu.open=false;}
 function update(view){
  const active=sectionForView(view);header.dataset.activeSection=active;
  for(const n of header.querySelectorAll('[data-section]')){
   const target=n.tagName==='DETAILS'?n.querySelector('summary'):n;
   if(n.dataset.section===active)target.setAttribute('aria-current','page');else target.removeAttribute('aria-current');
  }
  for(const a of header.querySelectorAll('[data-homecare-view]'))if(a.closest('.hc-nav-menu')){
   if(a.dataset.homecareView===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  }
  const title=doc.querySelector('.hc-catalog-header h1');if(title&&viewLabels[view])title.textContent=viewLabels[view];
  const crumb=doc.getElementById('hc-location');if(crumb){crumb.hidden=view==='home';const label=crumb.querySelector('span');if(label)label.textContent=(active==='products'?'Products / ':active==='insights'?'Insights / ':'')+(viewLabels[view]||'');}
  if(viewLabels[view])doc.title=view==='home'?'Homecare | Start here':viewLabels[view]+' · Homecare';
 }
 doc.addEventListener('homecare:viewchange',e=>update(e.detail.view));
 doc.addEventListener('click',event=>{
  const link=event.target.closest?.('a[data-homecare-view]');
  if(link&&!event.defaultPrevented&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&(event.button===0||event.button===undefined)){
   const controller=win.HCHomecareUpgradeController;
   if(controller?.navigate){event.preventDefault();controller.navigate(link.dataset.homecareView,{country:link.dataset.homecareCountry||'',history:'push',scroll:true});if(link.hasAttribute('data-homecare-news'))requestAnimationFrame(()=>{const n=doc.getElementById('homecare-weekly-brief');if(n){n.open=true;n.scrollIntoView({block:'start'});}});}
   close();
  }else if(!header.contains(event.target))close();
 });
 for(const menu of menus)menu.addEventListener('toggle',()=>{if(menu.open)for(const other of menus)if(other!==menu)other.open=false;});
 doc.addEventListener('keydown',event=>{if(event.key==='Escape'){const current=menus.find(m=>m.open);close();current?.querySelector('summary')?.focus();}});
 if(doc.body.hasAttribute('data-homecare-view'))update(readView(win.location.search,win.location.hash));
}
if(typeof document!=='undefined')mountNavigation();
