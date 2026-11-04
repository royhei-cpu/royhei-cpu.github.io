import {countriesFor,filterGlobalProducts,buildRetailListings} from './global-logic.js';
export const primaryNavigation=['nav-catalog','nav-global','nav-analysis','nav-workshop','brand-factories','video-guide','nav-target','nav-opportunities'];
export function referenceImage(value){
 if(!value)return '/home-care/global-photo-pending.svg';
 if(/^https?:\/\//.test(value)||value.startsWith('/home-care/'))return value;
 return '/cleantrend-opportunity-hub/'+value.replace(/^\//,'');
}
export function asNativeReference(p){return {
 id:p.id,name:p.name,brand:p.brand||'',retailer:p.retailer,market:p.market,category:p.category,categoryLabel:p.category,
 merchantScope:'Home Care',type:'International reference',url:p.link,image:referenceImage(p.image),
 displayPrice:p.priceLabel||'Price not recorded',price:p.priceLabel||'Price not recorded',hasSales:false,displaySales:'',
 checkedDate:p.evidence?.checkedAt||'',datePosted:'',verificationStatus:'Recorded international reference; current offer unverified',
 verificationNote:p.watchout||'',photoSource:p.link,photoVerification:'Recorded reference image; confirm exact pack',
 referenceCurrency:p.referencePrice?.currency||'',sourceScope:p.sourceScope||p.evidence?.method||'Recorded reference',
 sourceDate:p.sourceDiscoveredAt||'',globalReference:true
};}
export function catalogRows(items,cachedImage=()=>'',references=[]){
 const native=items.map(d=>({id:d.id,name:d.name,brand:d.brand||'',retailer:d.retailer,market:'United States',category:d.categoryLabel||d.category,
 link:d.salesItemSource||d.currentSource||d.url,image:d.image||cachedImage(d.id)||'/home-care/global-photo-pending.svg',
 priceLabel:d.displayPrice||d.price||'Price not recorded',evidence:{checkedAt:d.checkedDate||null},
 sourceScope:d.evidenceLevel||d.verificationStatus||'Recorded catalog reference',packLabel:d.size||'Confirm exact pack at source',native:d}));
 const seen=new Set(native.map(p=>p.id));
 const extra=references.filter(p=>!seen.has(p.id)&&seen.add(p.id)).map(p=>({...p,image:referenceImage(p.image),native:asNativeReference(p)}));
 return buildRetailListings([...native,...extra]);
}
export function globalCounts(rows){return {records:new Set(rows.map(p=>p.id)).size,countries:new Set(rows.flatMap(p=>p.countries||countriesFor(p.market))).size,retailers:new Set(rows.map(p=>p.retailer)).size};}
export function matchingRows(rows,filters){return filterGlobalProducts(rows,filters);}

export function reorderNavigation(nav){const nodes=[...nav.children];for(const id of primaryNavigation){const n=nodes.find(n=>n.id===id||n.dataset.navigationId===id);if(n)nav.append(n);}const opp=nodes.find(n=>n.id==='nav-opportunities');if(opp)nav.append(opp);}
