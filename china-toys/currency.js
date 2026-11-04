/* USD presentation keeps original source amounts untouched. */
(() => {
'use strict';
const fx={"date":"2026-11-03","base":"USD","to_usd":{"USD":1.0,"JPY":0.006317603842893473,"CZK":0.04592285256541921,"DKK":0.1495818558908142,"GBP":1.3410830394203315,"HUF":0.0030677826564215146,"PLN":0.25297578637700835,"RON":0.20923485812682485,"SEK":0.1020773410035155,"CHF":1.219615972070696,"ISK":0.008207782672540381,"NOK":0.10833939041527353,"TRY":0.020001037713737718,"AUD":0.6983819578934215,"BRL":0.1820357916334207,"CAD":0.7155475900915317,"CNY":0.14987263708271886,"HKD":0.12745411013567437,"IDR":5.513681367515297e-05,"ILS":0.31675733877365975,"INR":0.010554640255675514,"KRW":0.0007437197296290383,"MXN":0.05377207834686574,"MYR":0.24527722316080477,"NZD":0.5624371100825115,"PHP":0.01575772098727147,"SGD":0.7805474095796676,"THB":0.029625016562872662,"ZAR":0.060103766230275,"EUR":1.1179},"source":"https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml","publisher":"European Central Bank","checked":"2026-11-04"};
const convert=(amount,currency='USD')=>amount===null||amount===undefined||amount===''||!Number.isFinite(Number(amount))?null:(currency==='USD'?Number(amount):fx.to_usd[currency]?Number(amount)*fx.to_usd[currency]:null);
const format=(amount,currency='USD')=>{const value=convert(amount,currency);return value===null?'Price unavailable in USD':(currency!=='USD'?'≈':'')+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value)};
const original=(amount,currency='USD')=>amount==null?'Not captured':new Intl.NumberFormat('en-US',{style:'currency',currency}).format(amount)+' '+currency;
window.ATLAS_USD={convert,format,original,fx};
document.addEventListener('DOMContentLoaded',()=>{for(const el of document.querySelectorAll('[data-usd-note]'))el.textContent='Prices in USD. ≈ converted using ECB reference rates dated '+fx.date+'. Original source amounts remain in evidence and exports.';},{once:true});
})();
