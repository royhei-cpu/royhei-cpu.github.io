/* Retail planning helpers. Scores are editorial heuristics, never sales forecasts. */
(() => {
'use strict';
const checked='2026-11-04';
const benchmarks=[
 {id:'target-rms-dumpling',brand:'RMS USA',name:'RMS Mystery Squishy Dumpling Fidget Toy',category:'Squishy toys',image:'retail/target-dumpling.jpg',retail_benchmark:true,details:{age:'3+',material:'TPR (thermoplastic rubber)',size:'2 × 4 × 4 inches (product)',source:'https://www.target.com/p/rms-usa-mystery-squish-dumpling-fidget-toy-confetti/-/A-95253515'},listings:[{source:'Target.com',market:'United States',currency:'USD',price:4.99,variant:'1 piece',available:true,checked,url:'https://www.target.com/p/rms-usa-mystery-squish-dumpling-fidget-toy-confetti/-/A-95253515'}],image_source:'https://target.scene7.com/is/image/Target/GUEST_c5edb84d-7ac2-4597-b154-375b9473fb29?fmt=pjpeg&hei=600&wid=600'},
 {id:'target-mofusand-clip',brand:'Mofusand',name:'Mofusand 6-inch Kiramekko Roto Plush Clip Blind Box',category:'Blind-box plush',image:'retail/target-mofusand.jpg',retail_benchmark:true,details:{age:'3+',material:'Polyester',size:'5.91 × 4.33 × 4.33 inches (product)',source:'https://www.target.com/p/mofusand-6pc-kiramekko-roto-plush-clips/-/A-1011135915'},listings:[{source:'Target.com',market:'United States',currency:'USD',price:19.99,variant:'1 piece (specification; assortment photo)',available:true,checked,url:'https://www.target.com/p/mofusand-6pc-kiramekko-roto-plush-clips/-/A-1011135915'}],image_source:'https://target.scene7.com/is/image/Target/GUEST_fc607780-d7de-417c-b7f9-40c25038e9cd?fmt=pjpeg&hei=600&wid=600'}
];
const categories=['Blind-box figures','Blind-box plush','Squishy toys','Squishy blind boxes','Blind-box dolls'];
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
const newPlan=()=>({version:1,config:{title:'Little discoveries',retailer:'Target-inspired',color:'#cc3937',bays:3,shelves:4,bayWidth:120,maxTicket:20,audience:'collector'},items:[],customs:[],selected:null,shelf:{bay:0,row:1}});
function validate(raw,ids){
 if(!raw||raw.version!==1||!raw.config||!Array.isArray(raw.items))throw new Error('Choose an Atlas retail plan JSON file (version 1).');
 const n=newPlan(),c=raw.config;
 n.config={...n.config,title:String(c.title||n.config.title).slice(0,60),retailer:c.retailer==='My retail'?'My retail':'Target-inspired',color:/^#[0-9a-f]{6}$/i.test(c.color)?c.color:n.config.color,bays:Math.max(1,Math.min(4,Math.round(Number(c.bays)||3))),shelves:Math.max(3,Math.min(5,Math.round(Number(c.shelves)||4))),bayWidth:[90,120].includes(Number(c.bayWidth))?Number(c.bayWidth):120,maxTicket:Math.max(1,Math.min(500,Number(c.maxTicket)||20)),audience:c.audience==='family'?'family':'collector'};
 n.customs=(raw.customs||[]).slice(0,30).filter(p=>/^custom-[\w-]+$/.test(p.id)&&p.name).map(p=>({id:p.id,name:String(p.name).slice(0,180),brand:String(p.brand||'My product').slice(0,80),category:categories.includes(p.category)?p.category:categories[0],image:/^data:image\/(png|jpeg|webp);base64,/.test(p.image||'')&&p.image.length<180000?p.image:'',details:{},listings:[],custom:true}));
 const known=new Set([...ids,...n.customs.map(p=>p.id)]),used=new Set();
 for(const item of raw.items.slice(0,120)){
  if(!known.has(item.id)||used.has(item.uid)||typeof item.uid!=='string')continue;
  const i={uid:item.uid.slice(0,80),id:item.id,bay:Math.max(0,Math.min(n.config.bays-1,Math.round(Number(item.bay)||0))),row:Math.max(0,Math.min(n.config.shelves-1,Math.round(Number(item.row)||0))),facings:Math.max(1,Math.min(12,Math.round(Number(item.facings)||1))),depth:Math.max(1,Math.min(6,Math.round(Number(item.depth)||1))),width:Math.max(3,Math.min(90,Number(item.width)||12)),height:Math.max(3,Math.min(70,Number(item.height)||18)),packDepth:Math.max(3,Math.min(50,Number(item.packDepth)||10)),ticket:item.ticket===null||item.ticket===''?null:Math.max(0,Math.min(9999,Number(item.ticket)||0))};
  n.items.push(i);used.add(i.uid);
 }
 n.selected=n.items.some(i=>i.uid===raw.selected)?raw.selected:n.items[0]?.uid||null;
 const selected=n.items.find(i=>i.uid===n.selected);n.shelf=selected?{bay:selected.bay,row:selected.row}:{bay:0,row:0};
 return n;
}
window.ATLAS_RETAIL_DATA={benchmarks,categories,labels,offer,score,age,defaults,newPlan,validate,checked};
})();
