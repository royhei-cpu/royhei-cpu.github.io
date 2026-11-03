/* The directory and every retail entry point share this narrow product scope. */
(() => {
 'use strict';
 const categories=['Blind-box figures','Blind-box plush','Blind-box dolls','Squishy toys','Squishy blind boxes'];
 const aliases={'Blind-box articulated dolls':'Blind-box dolls','Squishy blind-box lights':'Squishy blind boxes'};
 const excluded=/\blego\b|building[ -]blocks?|construction[ -]sets?|model[ -]kits?|\bbuildable\b|积木|拼装/i;
 const category=p=>aliases[p.category]||p.category;
 const eligible=p=>!!p&&categories.includes(category(p))&&!excluded.test([p.name,p.name_cn,p.brand,p.category].join(' '));
 function apply(data){
  if(!data?.products)return;
  data.products=data.products.filter(eligible).map(p=>aliases[p.category]?{...p,category:category(p)}:p);
  if(data.stats){
   const ps=data.products;data.brands={};for(const p of ps)data.brands[p.brand]=(data.brands[p.brand]||0)+1;
   Object.assign(data.stats,{products:ps.length,brands:Object.keys(data.brands).length,squishy:ps.filter(p=>/Squishy/.test(p.category)).length,with_images:ps.filter(p=>p.image).length,with_launch_dates:ps.filter(p=>p.launch).length,with_china_prices:ps.filter(p=>p.china_price).length,with_sales:ps.filter(p=>p.sales).length,with_source_prices:ps.filter(p=>p.listings?.some(l=>l.price!=null)).length});
  }
  data.directory_scope='Blind-box figures, blind-box plush, blind-box dolls and squishies only. Building blocks, construction sets, model kits and unrelated merchandise are excluded.';
 }
 window.ATLAS_PRODUCT_SCOPE={categories,eligible,category,apply};
 apply(window.TOY_ATLAS);apply(window.CHAIN_ASSORTMENTS);
})();
