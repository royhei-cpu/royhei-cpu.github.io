/* Retail-chain navigation: chain identity is separate from product brand. */
(() => {
  'use strict';
  if(document.getElementById('retailChains'))return;
  const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'').toLowerCase();}catch{return '';}};
  const chains=[
    {name:'POP MART',brand:'POP MART',kind:'Toy brand + retail chain',color:'#a83248',url:'https://www.popmart.com.cn/home/cooperation',link:'Official retail channels',domains:['popmart.com','popmart.com.cn'],note:'Brand stores, ROBOSHOP vending and official online channels.'},
    {name:'TOP TOY',brand:'TOP TOY',kind:'Multi-brand toy retail chain',color:'#316baf',url:'https://www.toptoyglobal.com/store/15.html',link:'Official China store directory',domains:['toptoyglobal.com','gotoptoy.com'],note:'Browse the retail chain separately from TOP TOY-branded products.'},
    {name:'52TOYS',brand:'52TOYS',kind:'Toy brand + retail stores',color:'#713ba2',url:'https://hi52toys.com/pages/52-toys-official-store-points',link:'Official store locations',domains:['52toys.com','hi52toys.com'],note:'Product collections and official-store listings have separate links.'},
    {name:'MINISO',brand:'MINISO',kind:'Lifestyle retail chain',color:'#b9393d',url:'https://www.miniso.cn/shop/image.html',link:'Official China store pages',domains:['miniso.cn','miniso.com'],store:'https://miniso.tmall.com/',note:'Include toy and IP assortments within this wider retail chain.'},
    {name:'X11',kind:'Multi-brand collectible-toy chain',color:'#255ea2',url:'https://www.kkgroup.cn/zh-CN/x11',link:'Official retail-chain page',domains:[],note:'A toy retailer carrying collections from multiple brands.'},
    {name:'KKV',kind:'Multi-category lifestyle chain',color:'#876300',url:'https://www.kkgroup.cn/zh-CN/kkv',link:'Official retail-group page',domains:[],note:'Track its relevant toy assortment as a retail channel.'},
    {name:'Jiumu · 九木杂物社',kind:'Creative lifestyle retail chain',color:'#896943',url:'https://www.mg-pen.com/chenguangbrand/info.aspx?itemid=30',link:'M&G official chain profile',domains:[],note:'M&G’s lifestyle chain; toy and licensed-character ranges sit alongside stationery and gifts.'},
    {name:'KuLe · 酷乐潮玩',kind:'Collectibles and lifestyle retail chain',color:'#9a4a8b',url:'https://www.maigoo.com/brand/141609.html',link:'Third-party retail profile',domains:[],note:'Retail operator reference for collectible toys and gifts. Product assortment still needs store-level capture.'},
    {name:'SANFU · 三福',kind:'Lifestyle and IP-goods retail chain',color:'#b04d36',url:'https://www.sanfu.com/about',link:'Official chain profile',domains:[],evidence:'https://weibo.com/sanfu',evidenceLabel:'Official product announcements',note:'China lifestyle retailer whose official account promotes blind boxes. Toy offers need checking by store and channel; the company profile is not an inventory feed.'},
    {name:'IPSTAR · 潮玩星球',kind:'Anime and character-goods retail chain',color:'#4c5daa',url:'https://weibo.com/6509826766',link:'Official operator announcements',domains:[],evidence:'https://wechat.bandainamcotoyshobbysh.com/H5/store.php?id=471',evidenceLabel:'Bandai stockist reference',note:'Retail and themed stores for character merchandise. Manufacturer stockist lists and operator notices support inclusion; individual stores may close or have limited opening periods.'},
    {name:'The Green Party',kind:'Lifestyle retail chain · 绿光派对',color:'#43723b',url:'https://www.smsupermalls.cn/city/jjfloor.aspx',link:'China mall tenant directory',domains:[],note:'China mall retail channel with toys and lifestyle goods. This tenant source confirms a store presence, not a complete inventory.'}
  ];
  const data=window.TOY_ATLAS||{},products=data.products||[],sources=[...(data.sources||[])];
  // Include directly captured official product pages as well as configured feeds.
  for(const p of products)for(const l of p.listings||[]){const h=host(l.url);if(!h||sources.some(s=>host(s.url)===h)||!chains.some(c=>inDomain(h,c.domains)))continue;sources.push({id:l.source_id||('shop-'+h),name:l.source||h,url:l.url});}

  const section=document.createElement('section');section.id='retailChains';section.className='retail-chains';section.setAttribute('aria-labelledby','retailChainsTitle');
  function inDomain(h,ds){return ds.some(x=>h===x||h.endsWith('.'+x));}
  function matchesSource(c,s){return inDomain(host(s.url),c.domains);}
  section.innerHTML='<div class="chains-heading"><div><span class="chains-eyebrow">1 · CHOOSE WHERE TO SHOP</span><h2 id="retailChainsTitle">Retail chains</h2><p>Choose a chain to see its captured store listings or official product showcase. Reseller offers and missing store coverage are labeled separately.</p></div><a href="#retailer">All tracked shops ↓</a></div><div class="chain-tabs" role="tablist" aria-label="Retail chains">'+chains.map((c,i)=>'<button type="button" id="chain-tab-'+i+'" role="tab" aria-selected="'+(i===0)+'" aria-controls="chainDetail" tabindex="'+(i===0?'0':'-1')+'" data-chain="'+i+'">'+e(c.name)+'</button>').join('')+'</div><div id="chainDetail" role="tabpanel" aria-labelledby="chain-tab-0"></div>';
  function selectChain(index,focus=false){
    const c=chains[index];if(!c)return;
    section.querySelectorAll('[data-chain]').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;if(i===index&&focus)b.focus();});
    const shops=sources.filter(s=>matchesSource(c,s));
    const links=shops.map(s=>{
      const count=products.filter(p=>(p.listings||[]).some(l=>l.source_id===s.id||host(l.url)===host(s.url))).length;
      if(!count)return '';
      return '<a class="chain-assortment" href="./?'+e(new URLSearchParams({retailer:s.id}).toString())+'#results">'+e(s.name)+' · '+count+(s.source_type==='official_showcase'?' official showcase entries →</a>':' listings →</a>');
    }).join('');
    const brandCount=c.brand?products.filter(p=>p.brand===c.brand).length:0;
    const panel=section.querySelector('#chainDetail');panel.setAttribute('aria-labelledby','chain-tab-'+index);
    panel.innerHTML='<article class="chain-card" style="--chain:'+c.color+'"><div><span class="chain-kind">'+e(c.kind)+'</span><h3>'+e(c.name)+'</h3><p>'+e(c.note)+'</p></div><div class="chain-actions"><a class="chain-official" href="'+e(c.url)+'" target="_blank" rel="noopener noreferrer">'+e(c.link)+' ↗</a>'+(c.evidence?'<a href="'+e(c.evidence)+'" target="_blank" rel="noopener noreferrer">'+e(c.evidenceLabel)+' ↗</a>':'')+(c.store?'<a href="'+e(c.store)+'" target="_blank" rel="noopener noreferrer">Official Tmall flagship ↗</a>':'')+links+(!links?'<p class="chain-coverage">Directory reference · no captured assortment yet. Use the source link to explore the chain.</p>':'<p class="chain-coverage">'+(shops.some(s=>s.source_type==='official_showcase')?'Official showcase sample only. Tmall inventory, current prices and stock are not captured.':'Captured listings are a dated sample, not complete chain inventory.')+'</p>')+(brandCount?'<a class="chain-brand" href="./?'+e(new URLSearchParams({brand:c.brand}).toString())+'#results">Brand products across all shops ('+brandCount+') →</a>':'')+'</div></article>';
  }
  section.addEventListener('click',ev=>{const b=ev.target.closest('[data-chain]');if(b)selectChain(Number(b.dataset.chain));});
  section.addEventListener('keydown',ev=>{const b=ev.target.closest('[data-chain]');if(!b)return;let i=Number(b.dataset.chain);if(ev.key==='ArrowRight')i=(i+1)%chains.length;else if(ev.key==='ArrowLeft')i=(i+chains.length-1)%chains.length;else if(ev.key==='Home')i=0;else if(ev.key==='End')i=chains.length-1;else return;ev.preventDefault();selectChain(i,true);});
  selectChain(0);
  const gaps=chains.filter(c=>!sources.some(s=>matchesSource(c,s)&&products.some(p=>(p.listings||[]).some(l=>l.source_id===s.id||host(l.url)===host(s.url)))));
  const coverage=document.createElement('p');coverage.className='chain-coverage';coverage.id='chainCoverageGaps';coverage.textContent='No store assortment captured: '+gaps.map(c=>c.name).join(', ')+'. MINISO’s official showcase does not establish Tmall inventory.';section.append(coverage);
  const audit=document.createElement('details');audit.id='chainCoverageAudit';audit.className='chain-audit';
  const auditNotes={
    'POP MART':'US official-page sample and brand offers across other shops; mainland store assortment remains incomplete.',
    'TOP TOY':'International-store sample; the official China locator gives addresses, not live store stock.',
    '52TOYS':'International-store sample; China shop inventory and regional availability need separate checks.',
    'MINISO':'Seven China showcase entries; Tmall inventory, current prices and stock remain uncaptured.',
    'X11':'Official profile documents toy categories; mini-program and store SKUs remain uncaptured.',
    'KKV':'Official group profile includes toys; category presence does not identify current shop SKUs.',
    'Jiumu · 九木杂物社':'M&G chain profile; product-level assortment uncaptured. Profile retrieval was unavailable in this review.',
    'KuLe · 酷乐潮玩':'Third-party chain reference; official store listings, prices and availability still need capture.',
    'SANFU · 三福':'Official company profile and product announcements; no shop assortment captured.',
    'IPSTAR · 潮玩星球':'Operator notices and manufacturer stockists; verify store changes and local assortment separately.',
    'The Green Party':'China mall tenant reference confirms presence; it does not establish product inventory.'
  };
  audit.innerHTML='<summary>Coverage by retailer · '+chains.length+' chains</summary><p>Reviewed 31 October 2026. Counts below are saved product records, not total stock or a completeness score. Prices retain their own observation dates. This expanding directory does not yet cover every China retailer.</p><div class="chain-audit-scroll"><table><caption>Captured coverage and remaining gaps</caption><thead><tr><th scope="col">Retailer / source</th><th scope="col">Captured sample</th><th scope="col">What still needs checking</th></tr></thead><tbody>'+chains.map(c=>{
    const matched=sources.filter(s=>matchesSource(c,s));
    const count=products.filter(p=>(p.listings||[]).some(l=>matched.some(s=>l.source_id===s.id||host(l.url)===host(s.url)))).length;
    const showcase=matched.some(s=>s.source_type==='official_showcase');
    return '<tr><th scope="row"><a href="'+e(c.url)+'" target="_blank" rel="noopener noreferrer">'+e(c.name)+' ↗</a></th><td>'+(count?count+(showcase?' showcase entries':' shop records'):'Not captured')+'</td><td>'+e(auditNotes[c.name])+'</td></tr>';
  }).join('')+'</tbody></table></div>';section.append(audit);
  const target=document.querySelector('.retailer-section')||document.querySelector('.brand-section');if(target)target.before(section);else document.querySelector('main')?.append(section);
  const style=document.createElement('style');style.textContent=`
    .chain-audit{margin-top:14px;border-top:1px solid #c9d8cf;padding-top:12px}.chain-audit summary{cursor:pointer;font-weight:700;color:#174c3d}.chain-audit p,.chain-audit table{font-size:13px;line-height:1.6}.chain-audit-scroll{overflow-x:auto}.chain-audit table{width:100%;border-collapse:collapse;background:#fff}.chain-audit caption{text-align:left;padding:8px 0;font-weight:700}.chain-audit th,.chain-audit td{padding:10px;text-align:left;vertical-align:top;border-bottom:1px solid #dbe4de}.chain-audit th:first-child{min-width:120px}.chain-audit a{color:#174c3d}.retail-chains{margin:24px 0;padding:24px;background:linear-gradient(115deg,#fff6df,#f2ecff 55%,#e4f8f3);border:1px solid #e2dce9;border-radius:18px;scroll-margin-top:100px}.chains-heading{display:flex;justify-content:space-between;align-items:start;gap:20px}.chains-eyebrow{font-size:11px;font-weight:800;letter-spacing:1.6px;color:#6b536d}.chains-heading h2{margin:6px 0 9px;font-size:26px;color:#173f35}.chains-heading p{max-width:690px;font-size:14px;line-height:1.6;margin:0;color:#465a54}.chains-heading>a{white-space:nowrap;color:#164b3c;font-size:13px;font-weight:700}.unused-chain-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:20px}.chain-card{background:#fff;border:1px solid #e5e0e8;border-top:5px solid var(--chain);border-radius:12px;padding:19px;display:grid;grid-template-columns:1.2fr 1fr;gap:16px;min-width:0}.chain-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 12px}.chain-tabs button{border:1px solid #c8d8d0;background:#fff;border-radius:999px;padding:9px 14px;color:#174c3d;font-weight:700;cursor:pointer}.chain-tabs button[aria-selected="true"]{color:white;background:#174c3d;border-color:#174c3d}.chain-tabs button:focus-visible{outline:3px solid #d9aa58;outline-offset:3px}.chain-actions{display:flex;flex-direction:column;gap:8px;align-items:flex-start;justify-content:center}.chain-kind{font-size:11px;color:#52605c}.chain-card h3{font-size:25px;color:var(--chain);margin:0;letter-spacing:.2px}.chain-card p{font-size:13px;line-height:1.55;color:#4c5c56;margin:0 0 4px}.chain-card a{font-size:12px;line-height:1.55;font-weight:650;color:#174c3d;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}.chain-official{margin-top:auto}.chain-brand{color:#636067!important}.chains-footnote{font-size:12px;line-height:1.55;color:#53645c;margin:16px 0 0}.retail-nav-link{font-weight:800!important}.chain-card a:focus-visible{outline:3px solid #d9aa58;outline-offset:4px;border-radius:2px}@media(max-width:800px){.unused-chain-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:500px){.retail-chains{padding:17px}.chains-heading{display:block}.chains-heading>a{display:inline-block;margin-top:12px}.unused-chain-grid{grid-template-columns:1fr}.chain-card{padding:16px;grid-template-columns:1fr}.chains-heading h2{font-size:23px}}
  `;document.head.append(style);
})();
