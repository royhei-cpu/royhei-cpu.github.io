(()=>{'use strict';
const search=document.getElementById('storeSearch');
search?.addEventListener('input',()=>{let shown=0;const q=search.value.trim().toLocaleLowerCase();for(const row of document.querySelectorAll('#storeTable tbody tr')){row.hidden=!row.textContent.toLocaleLowerCase().includes(q);if(!row.hidden)shown++;}document.getElementById('storeCount').textContent=shown+' sources shown';});
for(const button of document.querySelectorAll('[data-rank-sort]'))button.addEventListener('click',()=>{const key=button.dataset.rankSort,body=document.querySelector('#rankTable tbody');[...body.rows].sort((a,b)=>Number(a.dataset[key])-Number(b.dataset[key])).forEach(row=>body.append(row));for(const b of document.querySelectorAll('[data-rank-sort]'))b.setAttribute('aria-pressed',String(b===button));});
})();
