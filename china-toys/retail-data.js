/* Retail planning helpers. Scores are editorial heuristics, never sales forecasts. */
(() => {
'use strict';
const checked='2026-11-04';
const benchmarks=[
 {id:'target-rms-dumpling',brand:'RMS USA',name:'RMS Mystery Squishy Dumpling Fidget Toy',category:'Squishy toys',image:'retail/target-dumpling.jpg',retail_benchmark:true,details:{age:'3+',material:'TPR (thermoplastic rubber)',size:'2 × 4 × 4 inches (product)',source:'https://www.target.com/p/rms-usa-mystery-squish-dumpling-fidget-toy-confetti/-/A-95253515'},listings:[{source:'Target.com',source_id:'target',retailer_key:'shop:target',market:'United States',currency:'USD',price:4.99,variant:'1 piece',available:true,checked,url:'https://www.target.com/p/rms-usa-mystery-squish-dumpling-fidget-toy-confetti/-/A-95253515'}],image_source:'https://target.scene7.com/is/image/Target/GUEST_c5edb84d-7ac2-4597-b154-375b9473fb29?fmt=pjpeg&hei=600&wid=600'},
 {id:'target-mofusand-clip',brand:'Mofusand',name:'Mofusand 6-inch Kiramekko Roto Plush Clip Blind Box',category:'Blind-box plush',image:'retail/target-mofusand.jpg',retail_benchmark:true,details:{age:'3+',material:'Polyester',size:'5.91 × 4.33 × 4.33 inches (product)',source:'https://www.target.com/p/mofusand-6pc-kiramekko-roto-plush-clips/-/A-1011135915'},listings:[{source:'Target.com',source_id:'target',retailer_key:'shop:target',market:'United States',currency:'USD',price:19.99,variant:'1 piece (specification; assortment photo)',available:true,checked,url:'https://www.target.com/p/mofusand-6pc-kiramekko-roto-plush-clips/-/A-1011135915'}],image_source:'https://target.scene7.com/is/image/Target/GUEST_fc607780-d7de-417c-b7f9-40c25038e9cd?fmt=pjpeg&hei=600&wid=600'}
];
const categories=['Blind-box figures','Blind-box plush','Squishy toys','Squishy blind boxes','Blind-box dolls'];
const eligible=p=>window.ATLAS_PRODUCT_SCOPE?.eligible(p)??categories.includes(p.category);
const labels={'Blind-box figures':'Figures','Blind-box plush':'Plush & charms','Squishy toys':'Squishies','Squishy blind boxes':'Squishy blind boxes','Blind-box dolls':'Dolls'};
const isSingle=s=>/\b(single|1\s*(pc|pcs|piece|box|pack|capsule)|one\s*(piece|box))\b/i.test(s||'')&&!/\b([2-9]|\d{2,})\s*(pc|pcs|pieces|boxes)\b|no\s*box|opened|confirmed|set of|whole|case|full set/i.test(s||'');
function offer(p){
 const candidates=[];
 for(const l of p.listings||[]){
  if(l.currency!=='USD')continue;
  for(const o of l.options||[])if(isSingle(o.name)&&Number(o.price)>0)candidates.push({...l,...o,variant:o.name,unit_verified:true});
  if(isSingle(l.variant)&&Number(l.price)>0)candidates.push({...l,unit_verified:true});
 }
 return candidates.sort((a,b)=>(a.available===false)-(b.available===false)||a.price-b.price)[0]||null;
}
const listingKey=l=>l.retailer_key||'shop:'+(l.source_id||String(l.source||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-'));
function chosenOffer(p,key='',url='',variant=''){
 const listings=(p.listings||[]).filter(l=>!key||listingKey(l)===key);
 if(!listings.length)return null;
 const matches=listings.filter(l=>!url||l.url===url);
 const candidates=[];
 for(const l of matches.length?matches:listings){
  for(const o of l.options||[])if(isSingle(o.name)&&Number(o.price)>0)candidates.push({...l,...o,variant:o.name,unit_verified:true});
  candidates.push({...l,unit_verified:isSingle(l.variant),price:Number(l.price)>0?Number(l.price):null});
 }
 if(url&&variant){const exact=candidates.find(l=>l.url===url&&l.variant===variant);if(exact)return exact}
 // Prefer a captured single pack, then the listing's stated pack. Never divide a set price.
 candidates.sort((a,b)=>(a.available===false)-(b.available===false)||(b.unit_verified?1:0)-(a.unit_verified?1:0));
 if(!key&&!url){const usd=offer(p);if(usd)return usd}
 return candidates[0]||null;
}
function resolveOffer(p,item){return chosenOffer(p,item?.retailerKey||'',item?.offerUrl||'',item?.offerVariant||'')}
function buildDirectory(catalog,chainData,photoCache={}){
 const chains=new Map((chainData?.chains||[]).map(c=>[c.id,c]));
 const sources=new Map((chainData?.sources||[]).map(s=>[s.id,s]));
 const additions=(chainData?.products||[]).map(p=>{
  const source=sources.get(p.source_id),price=p.prices?.[0],url=source?.url||price?.source||p.release?.source;
  const image=p.image?.startsWith('http')?(photoCache[p.id]||''):p.image||'';
  return {id:'chain-'+p.id,brand:p.brand,name:p.name,name_cn:p.name_cn,category:p.category,image,image_source:p.image_source,chain_reference:true,retail_evidence:p.evidence_type,chain_ids:p.chain_ids,details:{...(p.details||{}),description:p.summary,source:url},listings:(p.chain_ids||[]).map(id=>({source:chains.get(id)?.nav_name||chains.get(id)?.name||id,source_id:'chain-'+id,retailer_key:'chain:'+id,kind:'Dated chain reference',url,market:'Mainland China',currency:price?.currency||'CNY',price:price?.amount??null,variant:p.pack||price?.basis||'Pack not established',available:null,checked:price?.as_of||p.checked,price_basis:price?.type||'Price not captured',evidence:p.evidence_type}))};
 });

 const products=[...benchmarks,...catalog.products,...additions].filter(eligible),retailers=new Map();
 for(const p of products)for(const key of new Set((p.listings||[]).map(listingKey))){
  const l=p.listings.find(l=>listingKey(l)===key);
  if(!retailers.has(key))retailers.set(key,{key,name:l.source,count:0,kind:key.startsWith('chain:')?'chain':'shop',note:key.startsWith('chain:')?'Dated mainland retail evidence. Branch stock and complete inventory are unverified.':'Captured shop listings. Prices, pack options and availability retain their observation dates.'});
  retailers.get(key).count++;
 }
 for(const c of chains.values()){const r=retailers.get('chain:'+c.id);if(r){r.name=c.nav_name||c.name;r.url=c.official_reference}}
 return {products,retailers:[...retailers.values()].sort((a,b)=>a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name))};
}
function age(p){const s=p.details?.age||'';return s?Number(String(s).match(/\d+/)?.[0])||null:null}
function score(p,brief={}){
 const o=offer(p),d=p.details||{},limit=Number(brief.maxTicket)||20;
 const format=/Squishy|plush/.test(p.category)?25:/figures/.test(p.category)?22:18;
 const value=o?(o.price<=limit?25:o.price<=limit*1.5?12:0):0;
 const facts=(d.age?10:0)+(d.material?5:0)+(d.size?5:0)+(p.retail_benchmark||(p.listings||[]).some(l=>/brand storefront|official/i.test(l.kind||l.source))?10:0);
 const stock=o?.available===true?20:o?.available===false?0:10;
 const audience=brief.audience==='family'&&(age(p)===null||age(p)>8)?-25:0;
 const total=Math.max(0,format+value+facts+stock+audience);
 const gaps=[];if(!d.age)gaps.push('Age not documented');if(!d.material)gaps.push('Material not documented');if(!o)gaps.push('Single-pack USD offer not verified');if(brief.audience==='family'&&age(p)>8)gaps.push('Older age label: '+d.age);if(o?.available===false)gaps.push('Offer unavailable when checked');
 return {total,parts:{format,value,facts,stock,audience},offer:o,gaps,reason:/Squishy/.test(p.category)?'Tactile entry-price idea; test durability and handling.':/plush/.test(p.category)?'Portable gifting and character discovery; verify attachment quality.':/dolls/.test(p.category)?'Character-led gifting; give the story room on shelf.':'Small collectible footprint; keep age and blind-box terms visible.'};
}
function defaults(p){return /plush/.test(p.category)?{width:16,height:24,packDepth:14}:/Squishy/.test(p.category)?{width:13,height:14,packDepth:12}:{width:12,height:18,packDepth:10}}
const newPlan=()=>({version:1,config:{title:'Little discoveries',retailer:'Target-inspired',sourceRetailer:'',theme:'bright',currency:'USD',color:'#cc3937',bays:3,shelves:4,bayWidth:120,maxTicket:20,audience:'collector'},items:[],customs:[],selected:null,shelf:{bay:0,row:1}});
function validate(raw,ids){
 if(!raw||raw.version!==1||!raw.config||!Array.isArray(raw.items))throw new Error('Choose an Atlas retail plan JSON file (version 1).');
 const n=newPlan(),c=raw.config;
 n.config={...n.config,title:String(c.title||n.config.title).slice(0,60),retailer:c.retailer==='My retail'?'My retail':'Target-inspired',color:/^#[0-9a-f]{6}$/i.test(c.color)?c.color:n.config.color,bays:Math.max(1,Math.min(4,Math.round(Number(c.bays)||3))),shelves:Math.max(3,Math.min(5,Math.round(Number(c.shelves)||4))),bayWidth:[90,120].includes(Number(c.bayWidth))?Number(c.bayWidth):120,maxTicket:Math.max(1,Math.min(500,Number(c.maxTicket)||20)),audience:c.audience==='family'?'family':'collector'};
 n.config.sourceRetailer=/^(shop|chain):[\w-]+$/.test(c.sourceRetailer||'')?c.sourceRetailer:'';
 n.config.theme=['bright','wood','dark'].includes(c.theme)?c.theme:'bright';
 n.config.currency=['USD','CNY','HKD','JPY','EUR','GBP'].includes(c.currency)?c.currency:'USD';
 n.customs=(raw.customs||[]).slice(0,30).filter(p=>eligible(p)&&/^custom-[\w-]+$/.test(p.id)&&p.name).map(p=>({id:p.id,name:String(p.name).slice(0,180),brand:String(p.brand||'My product').slice(0,80),category:categories.includes(p.category)?p.category:categories[0],image:/^data:image\/(png|jpeg|webp);base64,/.test(p.image||'')&&p.image.length<180000?p.image:'',details:{},listings:[],custom:true}));
 const known=new Set([...ids,...n.customs.map(p=>p.id)]),used=new Set();
 for(const item of raw.items.slice(0,120)){
  if(!known.has(item.id)||used.has(item.uid)||typeof item.uid!=='string')continue;
  const i={uid:item.uid.slice(0,80),id:item.id,bay:Math.max(0,Math.min(n.config.bays-1,Math.round(Number(item.bay)||0))),row:Math.max(0,Math.min(n.config.shelves-1,Math.round(Number(item.row)||0))),facings:Math.max(1,Math.min(12,Math.round(Number(item.facings)||1))),depth:Math.max(1,Math.min(6,Math.round(Number(item.depth)||1))),width:Math.max(3,Math.min(90,Number(item.width)||12)),height:Math.max(3,Math.min(70,Number(item.height)||18)),packDepth:Math.max(3,Math.min(50,Number(item.packDepth)||10)),ticket:item.ticket===null||item.ticket===''?null:Math.max(0,Math.min(9999,Number(item.ticket)||0))};
  i.display=['box','hanger'].includes(item.display)?item.display:'box';
  i.retailerKey=/^(shop|chain):[\w-]+$/.test(item.retailerKey||'')?item.retailerKey:'';
  i.offerUrl=/^https?:\/\//.test(item.offerUrl||'')?String(item.offerUrl).slice(0,2048):'';
  i.offerVariant=String(item.offerVariant||'').slice(0,250);
  n.items.push(i);used.add(i.uid);
 }
 n.selected=n.items.some(i=>i.uid===raw.selected)?raw.selected:n.items[0]?.uid||null;
 const selected=n.items.find(i=>i.uid===n.selected);n.shelf=selected?{bay:selected.bay,row:selected.row}:{bay:0,row:0};
 return n;
}
window.ATLAS_RETAIL_DATA={benchmarks,categories,labels,eligible,offer,chosenOffer,resolveOffer,listingKey,buildDirectory,score,age,defaults,newPlan,validate,checked};
})();

window.ATLAS_RETAIL_PHOTO_CACHE={"toycity-cluebie-flower": "retail/chain-toycity-cluebie-flower.jpg", "toycity-laura-chess": "retail/chain-toycity-laura-chess.jpg", "toycity-monboo-unknown": "retail/chain-toycity-monboo-unknown.jpg", "toycity-mrpa-company": "retail/chain-toycity-mrpa-company.jpg", "toycity-mrpa-transform": "retail/chain-toycity-mrpa-transform.jpg", "mrpa-creature-wardrobe": "retail/chain-mrpa-creature-wardrobe.jpg", "52toys-zootopia-best-partners": "retail/chain-52toys-zootopia-best-partners.jpg"};
