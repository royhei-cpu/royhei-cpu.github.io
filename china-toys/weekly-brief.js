/* China Toy Atlas weekly brief. Counts use saved catalog facts, never invented news. */
(() => {
  'use strict';
  const data = window.TOY_ATLAS;
  const root = document.getElementById('weeklyOverview');
  if (!data?.products || !root) return;
  const products = data.products;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = n => Number(n || 0).toLocaleString('en-US');
  const day = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) ? String(s) : null;
  const asOf = day(data.updated);
  if (!asOf) return;
  const shift = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const start = shift(asOf, -6);
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const fmt = s => day(s) ? new Date(s + 'T12:00:00Z').toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : String(s || 'Date not stated');
  const inWeek = s => !!day(s) && s >= start && s <= asOf;
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sources = data.sources || [];
  const byHost = new Map(sources.map(s => [host(s.url), s.id]));
  const byName = new Map(sources.map(s => [s.name, s.id]));
  const key = l => l.source_id || byHost.get(host(l.url)) || byName.get(l.source) || ('shop-' + (host(l.url) || slug(l.source) || 'unknown'));
  const retail = l => l.kind !== 'source evidence' || l.price != null || byHost.has(host(l.url)) || /popmart\.com|52toys\.com|gotoptoy\.com/.test(host(l.url));
  const sourceLink = (u, title) => { try { const a = new URL(u, location.href); return /^https?:$/.test(a.protocol) ? `<a href="${esc(a.href)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>` : ''; } catch { return ''; } };
  const viewProduct = p => `<button type="button" class="brief-product-link" data-open="${esc(p.id)}">${esc(p.name)}</button>`;
  function activeTrend(p) { const t = p.trend; if (!t?.source || !day(t.observed?.slice(0,10))) return null; const seen = t.observed.slice(0,10), until = day(t.expires_on) || shift(seen, 45); return seen <= today && until >= today ? t : null; }
  function savedEvents(p, retailer) {
    const urls = new Set((p.listings || []).filter(l => !retailer || key(l) === retailer).map(l => l.url));
    const history = (p.history || []).filter(h => inWeek(h.date) && (!retailer || urls.has(h.source)));
    const launch = p.launch || p.launch_estimate;
    return {
      added: !p.baseline && p.first_seen > data.baseline_date && inWeek(p.first_seen),
      launch: !!(launch && launch.precision === 'day' && !launch.approximate && inWeek(launch.date)),
      price: history.some(h => h.type === 'price'),
      restock: history.some(h => h.type === 'restock')
    };
  }
  function selectedPool() {
    const retailer = document.getElementById('retailer')?.value || '';
    const pool = products.filter(p => !retailer || (p.listings || []).some(l => retail(l) && key(l) === retailer));
    const select = document.getElementById('retailer');
    const label = retailer ? (sources.find(s => s.id === retailer)?.name || select?.selectedOptions[0]?.textContent.split(' — ')[0] || 'Selected shop') : 'All tracked shops · China & international';
    return {retailer, pool, label};
  }
  function evidenceLinks(items, field, label) {
    const found = new Map();
    for (const p of items) { const d = field(p); if (d?.url && !found.has(d.url)) found.set(d.url, d.name || label); }
    return [...found].slice(0,3).map(([u,t]) => sourceLink(u,t)).join('');
  }
  function article({eyebrow, title, changed, matters, next, links, items = []}) {
    return `<article class="brief-story"><p class="brief-story-label">${esc(eyebrow)}</p><h4>${esc(title)}</h4><p><strong>What changed:</strong> ${changed}</p>${items.length ? `<ul class="brief-items">${items.slice(0,3).map(p => `<li>${viewProduct(p)}</li>`).join('')}</ul>` : ''}<details class="brief-next"><summary>Why it matters & next checks</summary><p><strong>Why it matters:</strong> ${esc(matters)}</p><p><strong>Next check:</strong> ${esc(next)}</p></details>${links ? `<div class="brief-source-links">${links}</div>` : ''}</article>`;
  }
  const css = document.createElement('style');
  css.textContent = `
.brief-expand>summary{cursor:pointer;font-weight:650;font-size:14px;padding:12px 0;color:#234c38}.brief-expand .brief-stories{padding-top:6px}.brief-secondary a{font-size:12px;padding:8px 11px;color:#24513a}.executive-brief~.intro,.executive-brief~#stats,#externalSourceAudit,#guideButton,.reading-note>strong,.reading-note>p{display:none!important}.brief-watch{margin-top:4px!important}.brief-kpis:has(>.brief-kpi:only-child){grid-template-columns:1fr}.weekly-overview.executive-brief{padding:27px 28px 22px;background:#f7faf8;border:1px solid #d3e1d8;border-radius:12px;margin:26px 0 20px;scroll-margin-top:16px}.brief-heading{display:flex;justify-content:space-between;gap:20px;align-items:start}.brief-kicker{font-size:11px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#587264;margin:0 0 8px}.brief-heading h1{font-size:32px;line-height:1.15;letter-spacing:-.7px;margin:0 0 11px;color:#163c2e}.brief-heading a{color:#225b43;text-decoration:underline;font-size:13px;white-space:nowrap;margin-top:4px}.brief-period{font-size:12px;line-height:1.7;color:#586e61;margin:0}.brief-scope{font-size:12px;font-weight:650;color:#305c45;margin:7px 0 0}.brief-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:21px 0 12px}.brief-kpi{display:flex;flex-direction:column;gap:7px;align-items:flex-start;text-align:left;min-width:0;padding:17px;background:white;border:1px solid #d6e2da;border-radius:9px;color:#203e31;cursor:pointer;font-family:inherit}.brief-kpi:hover{border-color:#558369;background:#fcfffc}.brief-kpi b{font-size:30px;line-height:1.05;font-variant-numeric:tabular-nums}.brief-kpi span{font-size:13px;font-weight:650;line-height:1.4}.brief-kpi small{font-size:11px;line-height:1.55;color:#63746a}.brief-status{font-size:12px;line-height:1.7;margin:0 0 13px;color:#566b5e}.brief-secondary{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 20px}.brief-secondary button{font:inherit;font-size:12px;line-height:1.4;border:1px solid #cadbd0;background:#fff;color:#24513a;border-radius:6px;padding:8px 11px;cursor:pointer}.brief-secondary button:hover{background:#edf6ef}.brief-section-head{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin:19px 0 11px}.brief-section-head h3{font-size:17px;margin:0;letter-spacing:-.2px;color:#1f4633}.brief-section-head small{font-size:11px;color:#637469}.brief-stories{display:grid;gap:12px}.brief-story{background:#fff;border:1px solid #dae4de;border-radius:9px;padding:18px 20px}.brief-story-label{font-size:11px!important;font-weight:650;color:#496956;margin:0 0 6px!important}.brief-story h4{font-size:17px;line-height:1.4;letter-spacing:-.2px;margin:0 0 8px;color:#193e2c}.brief-story p{font-size:12px;line-height:1.75;margin:7px 0;color:#485e50}.brief-story strong{font-weight:700;color:#2d4938}.brief-items{padding-left:18px;margin:10px 0}.brief-items li{margin:5px 0}.brief-product-link{padding:0;background:none;border:0;text-align:left;color:#246044;text-decoration:underline;text-underline-offset:2px;font:inherit;font-size:12px;line-height:1.6;cursor:pointer}.brief-next{border-top:1px solid #e5ebe7;padding-top:10px;margin-top:12px}.brief-next summary{font-size:12px;font-weight:650;color:#345c44;cursor:pointer;line-height:1.6}.brief-source-links{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:11px;font-size:11px;line-height:1.7}.brief-source-links a{color:#2a6548;text-decoration:underline;overflow-wrap:anywhere}.brief-watch{border-top:1px solid #dbe6df;margin-top:21px;padding-top:4px}.brief-watch>.brief-status{margin:8px 0 12px}.brief-footnote{font-size:11px;line-height:1.7;color:#65756b;border-top:1px solid #dce6df;margin:18px 0 0;padding-top:12px}.brief-footnote button{border:0;padding:0;background:none;color:#24573e;text-decoration:underline;font:inherit;cursor:pointer}.brief-warning{background:#fff7e8;border-left:3px solid #bd9450;padding:10px 13px;color:#715a32;font-size:12px;line-height:1.7;margin:14px 0}.brief-empty{font-size:13px;line-height:1.7;padding:15px;background:#fff;border-radius:8px;color:#586c5e}.executive-brief~.intro{padding-top:14px;margin:22px 0 20px}.executive-brief~.intro h1{font-size:clamp(26px,3vw,36px)}.executive-brief button:focus-visible,.executive-brief a:focus-visible,.executive-brief summary:focus-visible{outline:3px solid #d9aa58;outline-offset:3px}.brief-number-legend{font-size:11px;line-height:1.7;color:#647469;margin:6px 0 0}
@media(max-width:760px){.weekly-overview.executive-brief{padding:18px 15px;margin:18px 0}.brief-heading{gap:12px;flex-wrap:wrap}.brief-heading h1{font-size:27px}.brief-kicker{font-size:10px;letter-spacing:.65px}.brief-heading a{font-size:12px;margin:0}.brief-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:17px}.brief-kpi{padding:13px;gap:6px}.brief-kpi b{font-size:29px}.brief-kpi span{font-size:12px}.brief-kpi small{font-size:11px}.brief-story{padding:15px 13px}.brief-story h4{font-size:16px}.brief-story p,.brief-product-link,.brief-next summary{font-size:13px}.brief-source-links{font-size:12px}.brief-period,.brief-status,.brief-scope{font-size:12px}.brief-section-head{align-items:start;flex-direction:column;gap:4px}.brief-secondary{gap:7px}.brief-secondary button{font-size:12px;padding:9px}.brief-footnote{font-size:12px}.brief-warning{font-size:12px}}
`;
  document.head.append(css);
  root.classList.add('executive-brief');
  function arrange() {
    const main = document.querySelector('main.shell');
    if (main && main.firstElementChild !== root) main.prepend(root);
    const ip = document.getElementById('ip-rankings'), tutorial = document.getElementById('tutorial');
    const desk=document.getElementById('chinaIntelligence');if(desk&&root.nextElementSibling!==desk)root.after(desk);
    if (ip && (desk||root).nextElementSibling !== ip) (desk||root).after(ip);
    if (tutorial && (ip || root).nextElementSibling !== tutorial) (ip || root).after(tutorial);
  }
  function render() {
    if (root.querySelector('[data-executive-brief]')) return;
    const {retailer, pool, label} = selectedPool();
    const groups = {added:[], launch:[], price:[], restock:[]};
    for (const p of pool) { const events = savedEvents(p,retailer); for (const k of Object.keys(groups)) if (events[k]) groups[k].push(p); }
    const active = pool.filter(activeTrend);
    const shopCount = new Set(pool.flatMap(p => (p.listings || []).filter(l => retail(l) && (!retailer || key(l) === retailer)).map(key))).size;
    const eventCount = pool.filter(p => Object.values(savedEvents(p,retailer)).some(Boolean)).length;
    const mainKpis = [
      ['data-weekly="added"',groups.added.length,'Catalog additions','New here; not necessarily new products'],
      ['data-weekly="launch"',groups.launch.length,'New releases','Source-stated dates in the week shown'],
      ['data-view="trending"',active.length,'Current trend signals','Includes earlier evidence; not a sales rank'],
      ['data-brief-shops',shopCount,'Shops with listings','Only captured shops, not all of China']
    ];
    const highlights = [];
    if (groups.added.length) highlights.push(article({
      eyebrow:'Catalog expansion · saved '+fmt(asOf),title:num(groups.added.length)+' products / series added to the catalog',
      changed:`These entries were first captured during the displayed period. They are additions to this catalog, <strong>not necessarily newly launched products.</strong>`,
      matters:'A wider selection is available for product discovery. Added listings are not proof of sales growth or nationwide popularity.',
      next:'Open the item details to check its shop, market, single-box or set basis and exact pictured variant before comparing it.',
      links:evidenceLinks(groups.added,p=>{const l=(p.listings||[]).find(l=>!retailer||key(l)===retailer);return l?{url:l.url,name:l.source}:null},'Shop listing'),items:groups.added
    }));
    if (groups.launch.length) {
      const launches = [...groups.launch].sort((a,b)=>(b.launch||b.launch_estimate).date.localeCompare((a.launch||a.launch_estimate).date));
      const markets = [...new Set(launches.map(p=>(p.launch||p.launch_estimate).market||'Market not stated'))];
      highlights.push(article({eyebrow:'Release findings · '+fmt(start)+' – '+fmt(asOf),title:num(launches.length)+' captured listings have release dates this week',
        changed:`The linked sources state release dates within this reporting window. <strong>Market: ${esc(markets.join('; '))}.</strong> Announced and preorder dates do not prove that stock has shipped.`,
        matters:'These dates help identify recent products to compare, but they are not a complete list of China launches.',
        next:'Confirm mainland-China availability, current stock, actual launch timing and the single-box versus set price with the linked shop.',
        links:evidenceLinks(launches,p=>({url:(p.launch||p.launch_estimate).source,name:'Release evidence · '+((p.launch||p.launch_estimate).market||'source market')}),'Release evidence'),items:launches}));
    }
    if (groups.price.length || groups.restock.length) {
      const changed = [...new Map([...groups.price,...groups.restock].map(p=>[p.id,p])).values()];
      highlights.push(article({eyebrow:'Tracked shop changes · saved '+fmt(asOf),title:'Price and availability changes',
        changed:`${num(groups.price.length)} entries have recorded price changes; ${num(groups.restock.length)} were recorded back in stock. These are shop observations, not completed sales.`,
        matters:'Comparable offers may have changed. A restock can make an item easier to obtain; it is not proof of increased demand.',
        next:'Compare the same seller, currency, pack and variant. Recheck live availability before purchasing.',
        links:evidenceLinks(changed,p=>{const h=(p.history||[]).find(h=>inWeek(h.date)&&h.source);return h?{url:h.source,name:'Recorded shop change'}:null},'Recorded shop change'),items:changed}));
    }
    const watches = new Map();
    for (const p of active) { const t=activeTrend(p); const k=[t.source,t.market,t.period].join('|'); if(!watches.has(k))watches.set(k,{t,items:[]});watches.get(k).items.push(p); }
    const watchCards = [...watches.values()].sort((a,b)=>Number(/retailer|curat|hot pick/i.test(a.t.label+' '+a.t.level))-Number(/retailer|curat|hot pick/i.test(b.t.label+' '+b.t.level))).slice(0,2).map(({t,items})=>{
      const isPick=/retailer|curat|hot pick/i.test(t.label+' '+t.level);
      const date=t.observed.slice(0,10);
      return `<article class="brief-story"><p class="brief-story-label">${isPick?'Retailer selection · early signal':'Reported demand · source-attributed'} · evidence ${esc(fmt(date))}${inWeek(date)?'':' · outside this week'}</p><h4>${isPick?'Products highlighted by a specialist shop':'Character series with reported demand evidence'}</h4><p><strong>Why it is flagged:</strong> ${esc(t.summary||'Open the linked source for the stated signal.')}</p><p><strong>Scope:</strong> ${esc(t.market||'Market not stated')} · ${esc(t.period||'Period not stated')}.</p><ul class="brief-items">${items.slice(0,3).map(p=>`<li>${viewProduct(p)}</li>`).join('')}</ul><details class="brief-next"><summary>Why it matters & next checks</summary><p><strong>Why it matters:</strong> ${isPick?'This is a discovery lead from one shop, not an independent popularity ranking.':'The cited evidence helps prioritize which series to investigate. It does not establish weekly growth or sales for every variant.'}</p><p><strong>Next check:</strong> ${isPick?'Look for independent China-market sales, ranking or demand evidence before describing these items as nationally trending.':'Verify the channel, measurement period and product scope, then compare a later observation on the same basis before claiming growth.'}</p></details><div class="brief-source-links">${sourceLink(t.source,'Read the trend evidence')}<button type="button" class="brief-product-link" data-view="trending">See all current signals</button></div></article>`;
    }).join('');
    const failures=sources.filter(s=>!['complete','Listing evidence'].includes(s.status));
    const fullDate=day(data.last_full_collection)||asOf;
    const overdue=today>shift(fullDate,9);
    root.innerHTML=`<div data-executive-brief="20261030-brief-1"><div class="brief-heading"><div><p class="brief-kicker">China Blind Box & Squishy Weekly Brief</p><h1>What changed this week</h1><p class="brief-period">${esc(fmt(start))} – ${esc(fmt(asOf))} · Catalog saved ${esc(fmt(asOf))}</p><p class="brief-scope">${esc(label)} · weekly refresh scheduled Mondays, China time</p></div><a href="#filters" data-brief-browse>Browse products ↗</a></div>
<div class="brief-kpis">${mainKpis.filter(([,n])=>n>0).map(([attr,n,title,help])=>`<button type="button" class="brief-kpi" ${attr}><b>${num(n)}</b><span>${title}</span><small>${help}</small></button>`).join('')}</div>
<p class="brief-status">${eventCount?`${num(eventCount)} catalog entries have recorded changes in this saved period.`:'No product changes were recorded for this selection in the saved period.'}</p>
<div class="brief-secondary">${groups.price.length?`<button type="button" data-weekly="price">${num(groups.price.length)} price changes</button>`:""}${groups.restock.length?`<button type="button" data-weekly="restock">${num(groups.restock.length)} back in stock</button>`:""}<button type="button" data-weekly="">View all weekly changes</button><a class="brief-analysis-link" href="research.html">Source audit & market analysis ↗</a><button type="button" data-brief-tutorial>Watch narrated tutorial</button></div>
${overdue?'<p class="brief-warning"><strong>Full source refresh is overdue.</strong> These are the last saved observations, not a current market check.</p>':''}
${highlights.length?`<details class="brief-expand"><summary>Weekly highlights · ${num(eventCount)} changed entries</summary><div class="brief-stories">${highlights.slice(0,3).join('')}</div></details>`:""}
${watchCards?`<details class="brief-watch brief-expand"><summary>Current trend evidence · ${num(active.length)} products</summary><div class="brief-stories">${watchCards}</div></details>`:''}
<p class="brief-footnote">Full source collection: ${esc(fmt(fullDate))}${data.detail_reviewed?' · Item detail review: '+esc(fmt(data.detail_reviewed)):''}. ${failures.length?num(failures.length)+' source checks were incomplete or unavailable; older saved listings may remain. ':''}<button type="button" data-view="coverage">See coverage & missing information</button>.</p></div>`;
    arrange();
  }
  document.addEventListener('click', e => {
    if(e.target.closest('[data-brief-shops]')) { const x=document.querySelector('.retailer-list');if(x)x.open=true;document.querySelector('.retailer-section')?.scrollIntoView({behavior:'smooth',block:'start'}); }
    if(e.target.closest('[data-brief-rankings]')) document.getElementById('openIPRankings')?.click();
    if(e.target.closest('[data-brief-tutorial]')) document.getElementById('watchTutorialButton')?.click();
  });
  new MutationObserver(render).observe(root,{childList:true});
  render();arrange();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrange,{once:true});
  requestAnimationFrame(arrange);
})();

