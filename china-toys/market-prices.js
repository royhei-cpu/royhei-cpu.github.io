/* Dated market asking-price evidence. No estimated or converted prices. */
(() => {
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash=(n,c)=>`${c} ${Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const range=g=>g.low===g.high?cash(g.low,g.currency):`${cash(g.low,g.currency)}–${Number(g.high).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const groups=p=>p.market_prices?.groups||[];
const selected=(p,l)=>groups(p).find(g=>g.offers.some(o=>o.url===l?.url&&o.variant===l?.variant));
const note=g=>`${g.market} · ${g.basis} · ${g.listing_count} listing${g.listing_count===1?'':'s'} / ${g.shop_count} shop${g.shop_count===1?'':'s'}`;
const dates=g=>g.checked_from===g.checked_to?g.checked_to:`${g.checked_from}–${g.checked_to}`;
const summary=(p,l)=>{const g=selected(p,l);return g?`<div class="market-price-card"><span>Observed asking ${g.listing_count>1?'range':'price'}</span><strong>${esc(range(g))}</strong><small>${esc(note(g))}<br>Checked ${esc(dates(g))}${g.available_count===0?' · No confirmed in-stock option':''}${g.listing_count===1?' · One listing only':''}</small></div>`:'<div class="market-price-card"><small>No recent comparable price captured for this option.</small></div>'};
const detail=p=>{const gs=groups(p);return `<section class="market-price-detail" aria-label="Observed market prices"><h3>Observed market prices</h3><p>Advertised prices from the last ${p.market_prices?.window_days||30} days at the ${esc(p.market_prices?.as_of||'catalog')} snapshot, including sold-out options. These are not completed-sale values. Shipping, tax and checkout discounts are excluded.</p>${gs.length?`<details><summary>View ${gs.length} pack / market group${gs.length===1?'':'s'} and price sources</summary>${gs.map(g=>`<div class="market-price-group"><strong>${esc(range(g))}</strong><p>${esc(note(g))}<br>Checked ${esc(dates(g))}${g.listing_count===1?' · Only one listing; no market range established.':''}</p><ul>${g.offers.map(o=>`<li><a href="${esc(/^https?:\/\//.test(o.url)?o.url:'#')}" target="_blank" rel="noopener noreferrer">${esc(o.source)}</a> · ${esc(o.variant)} · ${esc(cash(o.price,g.currency))} · ${o.available===true?'In stock':o.available===false?'Out of stock':'Stock unknown'} · ${esc(o.checked)}</li>`).join('')}</ul></div>`).join('')}</details>`:'<p>No recent usable price evidence captured. A market value has not been estimated.</p>'}<small>Only offers for this catalog product with the same currency, market and pack are grouped. Unspecified packs stay separate by source. ${p.market_prices?.excluded_listings?esc(p.market_prices.excluded_listings)+' stale, undated, broken or unavailable-source listing(s) excluded.':''}</small></section>`};
const fields=(p,l)=>{const g=selected(p,l);return g?[g.low,g.high,g.currency,g.market,g.basis,g.listing_count,g.checked_from,g.checked_to]:Array(8).fill('')};
const csv=p=>JSON.stringify(p.market_prices||{});
window.ATLAS_MARKET_PRICES={selected,summary,detail,csv,fields};
})();
