export const mainSections=['home','products','workshop','insights','opportunities'];
export const viewLabels={home:'Homecare',catalog:'U.S. products',global:'Global retailers & items',compare:'Compare products',analysis:'Sales & analysis',target:'Target inspiration',opportunities:'Opportunities'};
export function readView(search='',hash=''){
 const p=new URLSearchParams(search),view=p.get('view');
 if(view==='retailers')return 'global';
 if(view==='workshop')return 'workshop';
 if(Object.hasOwn(viewLabels,view))return view;
 return hash==='#category-directory'?'catalog':'home';
}
export function sectionForView(view){return ['catalog','global','compare'].includes(view)?'products':['analysis','target'].includes(view)?'insights':view;}
export function viewAddress(view,country=''){
 if(view==='home')return '/home-care/';
 const p=new URLSearchParams({view});if(view==='global'&&country)p.set('country',country);
 return '/home-care/?'+p+(view==='catalog'?'#category-directory':view==='global'?'#homecare-workspace':'');
}
export const workshopSteps=[{id:'references',hash:'#wl-real-products',label:'Real products'},{id:'changes',hash:'#wl-development-case',label:'Why & what changes'},{id:'design',hash:'#wl-proposed-design',label:'Design & costs'}];
export function stepFromHash(hash){return workshopSteps.find(s=>s.hash===hash)?.id||'references';}
