(()=>{
 const video=document.getElementById('guide-video'),status=document.getElementById('chapter-status'),buttons=[...document.querySelectorAll('[data-time]')];
 if(!video)return;
 function seek(button){const time=Number(button.dataset.time);if(!Number.isFinite(time))return;const move=()=>{video.currentTime=time;status.textContent='Chapter: '+button.querySelector('span').textContent;video.focus();video.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};if(video.readyState>=1)move();else{video.addEventListener('loadedmetadata',move,{once:true});video.load();}}
 buttons.forEach(b=>b.addEventListener('click',()=>seek(b)));
 video.addEventListener('timeupdate',()=>{const current=[...buttons].reverse().find(b=>Number(b.dataset.time)<=video.currentTime+.1);for(const b of buttons){if(b===current)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');}});
})();
