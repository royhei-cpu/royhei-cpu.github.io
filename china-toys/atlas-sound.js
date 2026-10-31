/* Original, locally synthesized music. No audio tracking or external media. */
(() => {
  'use strict';
  const host=document.querySelector('.header-links');
  if(!host || document.getElementById('atlasSound'))return;
  const key='china-toy-atlas-sound-v1';
  let enabled=true;try{enabled=localStorage.getItem(key)!=='off';}catch{}
  let ctx,music,fx,master,clock=null,next=0,step=0,busy=false,lastFx=-1;
  const button=document.createElement('button');
  button.id='atlasSound';button.type='button';button.className='text-button atlas-sound';
  host.prepend(button);
  const style=document.createElement('style');style.textContent='.atlas-sound{white-space:nowrap;border:1px solid #a9c8bb!important;border-radius:999px;padding:8px 12px!important;min-height:40px;background:#f2fff7;color:#174c3d}.atlas-sound[aria-pressed="true"]{background:#174c3d;color:#fff}.atlas-sound:focus-visible{outline:3px solid #e7ad48;outline-offset:3px}@media(max-width:600px){.header-links{gap:6px;flex-wrap:wrap}.atlas-sound{font-size:12px;padding:7px 9px!important}}';document.head.append(style);
  function playingMedia(){return [...document.querySelectorAll('video,audio')].some(el=>!el.paused&&!el.ended&&!el.muted);}
  function visible(){return !document.hidden&&!playingMedia();}
  function paint(){
    const on=!!(enabled&&ctx?.state==='running'&&visible());
    button.textContent=on?'♫ Sound on':enabled?'♫ Play music':'♫ Sound off';
    button.setAttribute('aria-pressed',String(on));
    button.setAttribute('aria-label',on?'Mute background music and click sounds':enabled?'Start background music and click sounds':'Enable background music and click sounds');
    button.title=on?'Quiet music and click sounds · tap to mute':enabled?'Music begins with your first tap':'Tap to enable music and click sounds';
  }
  const hz=n=>440*Math.pow(2,(n-69)/12);
  function note(n,t,dur,vol,bus,type='sine'){
    const osc=ctx.createOscillator(),amp=ctx.createGain();osc.type=type;osc.frequency.value=hz(n);
    amp.gain.setValueAtTime(.00001,t);amp.gain.exponentialRampToValueAtTime(vol,t+.018);amp.gain.exponentialRampToValueAtTime(Math.max(.00002,vol*.24),t+Math.min(.22,dur*.4));amp.gain.exponentialRampToValueAtTime(.00001,t+dur);
    osc.connect(amp).connect(bus);osc.start(t);osc.stop(t+dur+.025);osc.onended=()=>{osc.disconnect();amp.disconnect();};
  }
  // 16 bars: a soft pentatonic toy-box melody over warm major-seventh chords.
  const chords=[[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,59],[48,55,60,64],[45,52,57,60],[41,48,55,60],[43,50,57,62]];
  const melody=[[76,null,79,74,72,null,74,null],[72,null,76,79,76,null,72,null],[69,null,72,76,74,null,72,null],[71,null,74,79,76,null,74,null],[79,null,81,79,76,null,74,null],[76,null,72,69,72,null,76,null],[72,null,74,76,79,null,76,null],[74,null,71,67,72,null,null,null]];
  function schedule(){
    if(!enabled||ctx?.state!=='running'||!visible())return;
    while(next<ctx.currentTime+.16){
      const beat=60/86,slot=step%8,bar=Math.floor(step/8)%16,ch=chords[bar%8];
      if(slot===0){for(const n of ch)note(n,next,2.65,.13,music,'sine');note(ch[0]-12,next,1.35,.16,music,'sine');}
      if(slot===4)note(ch[0]-12,next,.95,.1,music,'sine');
      const lead=melody[bar%8][slot];if(lead!=null)note(lead+(bar>7&&slot===0?12:0),next,.8,.2,music,'sine');
      if(slot===2||slot===6)note(ch[2]+12,next,.5,.07,music,'triangle');
      next+=beat/2;step++;
    }
  }
  function pump(){
    if(!ctx)return;
    const run=enabled&&ctx.state==='running'&&visible();
    music.gain.cancelScheduledValues(ctx.currentTime);music.gain.setTargetAtTime(run?.075:0,ctx.currentTime,.1);
    if(run&&!clock){next=ctx.currentTime+.04;schedule();clock=setInterval(schedule,80);}
    else if(!run&&clock){clearInterval(clock);clock=null;}
    paint();
  }
  async function wake(){
    if(!enabled||busy)return;busy=true;
    try{
      if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC){button.textContent='Sound unavailable';button.disabled=true;return;}
        ctx=new AC();master=ctx.createGain();master.gain.value=.8;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=10;limiter.ratio.value=6;
        master.connect(limiter).connect(ctx.destination);music=ctx.createGain();music.gain.value=0;music.connect(master);fx=ctx.createGain();fx.gain.value=.12;fx.connect(master);
        ctx.addEventListener('statechange',pump);
      }
      await ctx.resume();pump();
    }catch{button.title='Tap again to start audio';}finally{busy=false;paint();}
  }
  function clickSound(kind='tap'){
    if(!enabled||ctx?.state!=='running'||!visible()||ctx.currentTime-lastFx<.065)return;
    lastFx=ctx.currentTime;const t=ctx.currentTime+.005;
    const seq=kind==='open'?[76,83]:kind==='save'?[72,76,79]:kind==='close'?[76,72]:[79];
    seq.forEach((n,i)=>note(n,t+i*.055,.11,.32,fx,'sine'));
  }
  button.addEventListener('click',async e=>{
    e.stopPropagation();
    if(enabled&&ctx?.state==='running'&&visible())enabled=false;else enabled=true;
    try{localStorage.setItem(key,enabled?'on':'off');}catch{}
    if(enabled){await wake();clickSound('open');}else{master?.gain.setTargetAtTime(0,ctx.currentTime,.025);pump();}
    if(enabled&&master)master.gain.setTargetAtTime(.8,ctx.currentTime,.04);
    paint();
  });
  document.addEventListener('click',async e=>{
    if(e.target.closest('#atlasSound'))return;
    // A user gesture unlocks browser audio. No autoplay-policy bypass.
    if(enabled){await wake();if(master)master.gain.setTargetAtTime(.8,ctx.currentTime,.04);}
    const el=e.target.closest('button,a,summary,[role="button"],input[type="checkbox"],input[type="radio"]');
    if(!el||el.disabled||el.getAttribute('aria-disabled')==='true')return;
    const kind=el.matches('[data-save]')?'save':el.matches('[data-open],[data-product],.photo-button,.product-card')?'open':el.matches('.dialog-close')?'close':'tap';clickSound(kind);
  });
  document.addEventListener('change',e=>{if(e.target.matches('select,input[type="checkbox"],input[type="radio"]')){wake().then(()=>clickSound());}});
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat&&enabled)wake();});
  document.addEventListener('visibilitychange',pump);
  ['play','pause','ended','volumechange'].forEach(event=>document.addEventListener(event,()=>setTimeout(pump,0),true));
  window.addEventListener('pagehide',()=>{if(clock)clearInterval(clock);clock=null;if(ctx?.state==='running')ctx.suspend().catch(()=>{});});
  paint();
})();
