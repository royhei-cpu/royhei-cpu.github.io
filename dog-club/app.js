(() => {
  'use strict';
  const P = window.DogClubPlanner;
  const $ = s => document.querySelector(s);
  const form = $('#profile');
  const steps = [...document.querySelectorAll('.step')];
  const storageKey = 'dog-club-personalized-v3';
  const legacyKeys = ['dog-club-personalized-v2', 'target-dog-club-concept-profile'];
  const petFields = ['dogName','age','ageUnit','weight','weightUnit','play','chew','texture','allergy','avoid','restriction'];
  const addressFields = ['recipient','email','address1','address2','city','state','zip','phone'];
  const state = {step:0,visited:0,activeWeek:0,photo:'',photoBusy:false,photoToken:0,weeks:[],dates:P.weeklyDates(P.defaultDate()),dateDrafts:{},firstDateDraft:null,skipped:[false,false,false,false],paused:false,complete:false,storageMessage:''};
  const node = (tag,text,className) => {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
  const profile = () => Object.fromEntries([...petFields.map(k=>[k,form.elements[k].value.trim()]),['circle',form.elements.circle.checked]]);
  const delivery = () => Object.fromEntries(addressFields.map(k=>[k,$('#'+k).value.trim()]));
  const dogName = () => $('#dogName').value.trim() || 'your dog';
  const selectedMode = () => $('#autoRecommend').checked;
  const announce = message => {$('#status').textContent=message;};
  const names = () => document.querySelectorAll('[data-name]').forEach(e=>e.textContent=dogName());
  const week5Date = () => P.addDays(state.dates[3],7);
  const dateLabel = date => P.isISODate(date) ? P.formatDate(date) : 'Choose a date';
  const activeCount = () => state.paused ? 0 : state.skipped.filter(v=>!v).length;
  const statusLabel = i => state.skipped[i] ? 'Skipped' : state.paused ? 'Paused' : 'Planned';
  function invalidateReview(){ $('#reviewed').checked=false; }
  function clearErrors(){
    $('#error').hidden=true;
    const final=$('#finalError');if(final)final.hidden=true;
    document.querySelectorAll('[aria-invalid=true]').forEach(e=>{e.removeAttribute('aria-invalid');e.removeAttribute('aria-describedby');});
  }
  function fail(message,element){
    let error=$('#error');
    if(state.complete){error=$('#finalError');if(!error){error=node('p',undefined,'notice');error.id='finalError';error.setAttribute('role','alert');$('#completeStatus').after(error);}}
    error.textContent=message;error.hidden=false;
    if(element){element.setAttribute('aria-invalid','true');element.setAttribute('aria-describedby',error.id);element.focus();element.scrollIntoView({block:'center'});}else error.scrollIntoView({block:'center'});
    return false;
  }
  const editedDates = () => state.dates.map((date,i)=>Object.prototype.hasOwnProperty.call(state.dateDrafts,i)?state.dateDrafts[i]:date);
  function validateDateDrafts(){
    if(state.firstDateDraft!==null)return fail('Correct the first requested delivery date before continuing.',$('#firstDate'));
    const pending=Object.keys(state.dateDrafts);
    if(!pending.length)return true;
    const index=Number(pending[0]),check=P.validateDates(editedDates());
    return fail(check.message||`Choose a supported future date for Week ${index+1} before continuing.`,$(`#${state.complete?'final':'plan'}-date-${index}`));
  }
  function syncPhoto(){
    for(const id of ['photoPreview','coverPhoto']){const e=$('#'+id);if(state.photo)e.src=state.photo;else e.removeAttribute('src');}
    $('#photoPreview').hidden=!state.photo;$('#removePhoto').hidden=!state.photo;
  }
  function conditional(){
    $('#avoidWrap').hidden=$('#allergy').value!=='Yes';
    $('#age').max=form.elements.ageUnit.value==='months'?'360':'30';
  }
  function normalizeWeeks(){const p=profile();state.weeks=Array.from({length:4},(_,i)=>P.normalizeWeek(state.weeks[i]||P.defaultWeek(p),p));}
  function choiceLabels(week){
    const p=profile(),toys=P.toyOptions(p),treats=P.treatOptions(p);
    return [toys.find(o=>o.id===week.toy)?.label||'Review toy choice',treats.find(o=>o.id===week.treat1)?.label||'Review treat choice',treats.find(o=>o.id===week.treat2)?.label||'Review treat choice'];
  }
  function setOptions(select,options,value){select.replaceChildren(...options.map(o=>{const e=node('option',o.label);e.value=o.id;return e;}));select.value=value;}
  function renderWeekEditor(){
    normalizeWeeks();const p=profile(),w=state.weeks[state.activeWeek];
    setOptions($('#toyChoice'),P.toyOptions(p),w.toy);setOptions($('#treat1'),P.treatOptions(p),w.treat1);setOptions($('#treat2'),P.treatOptions(p),w.treat2);
    $('#weekTitle').textContent=`Week ${state.activeWeek+1} choices`;
    $('#week-editor').setAttribute('aria-labelledby',`week-tab-${state.activeWeek}`);
    document.querySelectorAll('[data-week]').forEach(b=>{const active=Number(b.dataset.week)===state.activeWeek;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    $('#recommendation').textContent=`Suggested categories for ${dogName()}. Change this week’s choices or copy them to all four weeks.`;
    const young=p.ageUnit==='months'?Number(p.age)<12:Number(p.age)<1;
    $('#suitability').textContent=(p.chew!=='Gentle play'?'Plush and rope categories are excluded for this chewing profile. ':'')+(young?'Puppy-specific suitability review is required. ':'')+(p.allergy!=='None known'||p.restriction!=='None'?'Food, chew and toy choices need individual review. ':'')+'These are preference categories, not approved products. Confirm full ingredients and appropriate sizes before any real order.';
    renderWeekCards($('#fourWeekOverview'),false);
  }
  function renderWeekCards(container,showDates=true){
    container.replaceChildren();
    state.weeks.forEach((week,i)=>{const card=node('article',undefined,'mini-week');card.append(node('h4',`Week ${i+1}${showDates?' · '+statusLabel(i):''}`));if(showDates)card.append(node('p',dateLabel(state.dates[i]),'hint'));choiceLabels(week).forEach(t=>card.append(node('p',t)));card.append(node('p','Plus 1 edible chew, pending suitability review.','hint'));container.append(card);});
  }
  function renderTiming(){
    $('#firstDate').min=P.earliestDate();$('#firstDate').max='9999-12-02';$('#firstDate').value=state.firstDateDraft!==null?state.firstDateDraft:state.dates[0]||'';if(state.firstDateDraft!==null)$('#firstDate').setAttribute('aria-invalid','true');
    $('#dateHelp').textContent=`Choose ${P.formatDate(P.earliestDate())} or later. The next three dates start one week apart.`;
    $('#week5Timing').textContent=selectedMode()?`Week 5 suggestion requested for ${dateLabel(week5Date())}.`:'Week 5 is off. You will keep choosing manually.';
  }
  function renderSchedule(container,prefix){
    container.replaceChildren();
    state.dates.forEach((date,i)=>{
      const card=node('article',undefined,'schedule-card'+(state.skipped[i]?' is-skipped':''));
      const title=node('h4',`Week ${i+1}`),pill=node('span',statusLabel(i),'status-pill'+(!state.skipped[i]&&!state.paused?' active':''));title.append(pill);card.append(title);
      const id=`${prefix}-date-${i}`,label=node('label','Requested delivery date');label.htmlFor=id;
      const input=node('input');input.type='date';input.id=id;input.min=P.earliestDate();input.max='9999-12-23';input.value=Object.prototype.hasOwnProperty.call(state.dateDrafts,i)?state.dateDrafts[i]:date;input.required=true;if(Object.prototype.hasOwnProperty.call(state.dateDrafts,i))input.setAttribute('aria-invalid','true');
      input.addEventListener('change',()=>{
        state.dateDrafts[i]=input.value;invalidateReview();
        const next=editedDates(),check=P.validateDates(next),earliest=P.earliestDate();
        if(!input.checkValidity()||!next.every(d=>P.isISODate(d)&&d>=earliest&&d<='9999-12-23')||!check.ok)return fail(check.message||'Choose a supported future date for this week.',input);
        state.dates=next;state.dateDrafts={};clearErrors();renderTiming();if(state.complete)renderFinal();else renderSchedule($('#scheduleEditor'),'plan');announce(`Week ${i+1} requested date changed to ${dateLabel(next[i])}.`);
      });
      const checkLabel=node('label',undefined,'check'),skip=node('input');skip.type='checkbox';skip.checked=state.skipped[i];skip.setAttribute('aria-label',`Skip week ${i+1}`);checkLabel.append(skip,node('span','Skip this week'));
      skip.addEventListener('change',()=>{const next=[...state.skipped];next[i]=skip.checked;if(next.every(Boolean)){skip.checked=state.skipped[i];return fail('Keep at least one of the first four boxes planned. You can pause the whole plan after review.',skip);}state.skipped=next;invalidateReview();clearErrors();if(state.complete)renderFinal();else renderSchedule($('#scheduleEditor'),'plan');announce(`Week ${i+1} ${state.skipped[i]?'skipped':'restored'}. Other dates are unchanged.`);});
      card.append(label,input,checkLabel,node('p',choiceLabels(state.weeks[i]).join(' · '),'hint'));container.append(card);
    });
  }
  function editButton(text,step){const b=node('button',text,'text-button');b.type='button';b.addEventListener('click',()=>openStep(step));return b;}
  function summaryGrid(container,withEdits){
    const grid=node('div',undefined,'summary-grid');
    const pet=node('article',undefined,'card'),p=profile();pet.append(node('h3',`${dogName()}’s profile`));
    const dl=node('dl');for(const [label,value] of [['Age',p.age+' '+p.ageUnit],['Weight',p.weight+' '+p.weightUnit],['Play',p.play],['Toy use',p.chew],['Treat texture',p.texture],['Ingredients',p.allergy==='Yes'?p.avoid:p.allergy],['Restrictions',p.restriction]]){const row=node('div');row.append(node('dt',label),node('dd',value));dl.append(row);}pet.append(dl);if(withEdits)pet.append(editButton('Edit pet profile',0),node('br'),editButton('Edit preferences',1));
    const address=node('article',undefined,'card'),d=delivery();address.append(node('h3','Sending to'));for(const line of [d.recipient,d.address1,d.address2,`${d.city}, ${d.state} ${d.zip}`,'United States',d.email,d.phone].filter(Boolean))address.append(node('p',line));address.append(node('p',`First requested arrival: ${dateLabel(state.dates.find((_,i)=>!state.skipped[i]))}`,'hint'));if(withEdits)address.append(editButton('Edit address and dates',3));grid.append(pet,address);container.append(grid);
  }
  function recommendationContent(container,withControl=false){
    container.replaceChildren();container.append(node('h3','From week 5 onward'));
    if(withControl){const label=node('label',undefined,'check'),input=node('input');input.type='checkbox';input.checked=selectedMode();input.setAttribute('aria-label','Suggest boxes from week 5');label.append(input,node('span','Suggest my weekly boxes'));input.addEventListener('change',()=>{$('#autoRecommend').checked=input.checked;invalidateReview();renderFinal();announce(input.checked?'Week 5 suggestions enabled for this preview.':'Week 5 suggestions switched off.');});container.append(label);}
    if(!selectedMode()){container.append(node('p','Keep choosing manually. No week 5 box has been added.'));return;}
    container.append(node('p',`${state.paused?'Paused · ':''}Requested date: ${dateLabel(week5Date())}`));
    const proposed=P.recommend(state.weeks,profile(),state.skipped);choiceLabels(proposed).forEach(t=>container.append(node('p',t)));container.append(node('p','Plus 1 edible chew, pending suitability review.','hint'),node('p','Suggested from your planned choices and profile. Exact ingredients and suitability still need review. No recurring order has been started.','hint'));
  }
  function renderReview(){
    const content=$('#reviewContent');content.replaceChildren();summaryGrid(content,true);
    const header=node('div',undefined,'section-heading');header.append(node('h3',`Your first four weeks · ${activeCount()} planned`),editButton('Edit box contents',2));content.append(header);
    const cards=node('div',undefined,'compact-weeks');renderWeekCards(cards);content.append(cards);
    const recommendation=node('article',undefined,'card');recommendationContent(recommendation);content.append(recommendation);
  }
  function validateStep(index){
    if(state.photoBusy)return fail('Your photo is still loading. Please wait a moment.',$('#photo'));
    if(index===0){if(!$('#dogName').value.trim())return fail('Please enter your dog’s name.',$('#dogName'));if(!state.photo)return fail('Please add a dog photo or use Ryan’s example.',$('#photo'));if(!$('#age').checkValidity())return fail('Please enter a valid age.',$('#age'));if(!$('#weight').checkValidity())return fail('Please enter a valid weight.',$('#weight'));if(!form.elements.circle.checked)return fail('Confirm Circle membership to continue this concept preview.',form.elements.circle);}
    if(index===1){for(const id of ['play','chew','texture','allergy','restriction'])if(!$('#'+id).value)return fail('Please answer every preference question.',$('#'+id));if($('#allergy').value==='Yes'&&!$('#avoid').value.trim())return fail('Please list the ingredients to avoid.',$('#avoid'));}
    if(index===2){normalizeWeeks();for(let i=0;i<4;i++){const w=state.weeks[i];if(!w.toy||!w.treat1||!w.treat2)return fail(`Complete all choices for week ${i+1}.`,$('#toyChoice'));}}
    if(index===3){const errors=P.addressErrors(delivery());if(errors.length)return fail(errors[0].message,$('#'+errors[0].field));if(!$('#email').checkValidity())return fail('Please enter a valid email address.',$('#email'));if(!validateDateDrafts())return false;if(!P.isISODate($('#firstDate').value)||$('#firstDate').value<P.earliestDate()||$('#firstDate').value!==state.dates[0])return fail('Choose a valid first delivery date after today.',$('#firstDate'));const dates=P.validateDates(state.dates);if(!dates.ok)return fail(dates.message,$('#firstDate'));if(state.skipped.every(Boolean))return fail('Keep at least one of the first four boxes planned.',$('#firstDate'));}
    if(index===4&&!$('#reviewed').checked)return fail('Please confirm you reviewed the contents, address and requested dates.',$('#reviewed'));
    return true;
  }
  function showStep(focus=true){
    conditional();names();syncPhoto();steps.forEach((e,i)=>e.hidden=i!==state.step);$('#intro').hidden=state.step!==0;
    document.querySelectorAll('[data-step-link]').forEach(b=>{const n=Number(b.dataset.stepLink);b.disabled=n>state.visited;if(n===state.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    $('#back').hidden=state.step===0;$('#next').textContent=state.step===4?'Save my box plan':state.step===2?'Continue to delivery':state.step===3?'Review my plan':'Continue';$('#next').disabled=state.photoBusy;
    if(state.step===2)renderWeekEditor();if(state.step===3){normalizeWeeks();renderTiming();renderSchedule($('#scheduleEditor'),'plan');}if(state.step===4)renderReview();
    if(focus){steps[state.step].querySelector('h2').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}announce(`Step ${state.step+1} of 5.`);
  }
  function openStep(index){state.complete=false;state.step=index;form.hidden=false;$('.progress').hidden=false;$('#complete').hidden=true;clearErrors();invalidateReview();showStep();}
  function renderFinal(){
    state.complete=true;form.hidden=true;$('.progress').hidden=true;$('#intro').hidden=true;$('#complete').hidden=false;names();
    $('#completeStatus').textContent=(state.paused?'Your plan is paused. ':`${activeCount()} of the first four boxes planned. `)+(state.storageMessage||'This preview stays in the current tab.');
    const cover=$('#cover').cloneNode(true);cover.removeAttribute('id');cover.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));$('#finalCover').replaceChildren(cover);
    $('#finalDetails').replaceChildren();summaryGrid($('#finalDetails'),false);renderSchedule($('#finalSchedule'),'final');recommendationContent($('#recommendationCard'),true);
    $('#pausePlan').textContent=state.paused?'Resume plan':'Pause plan';$('#downloadCalendar').disabled=state.paused;
  }
  function savePetProfile(){
    if(!$('#rememberProfile').checked){try{localStorage.removeItem(storageKey);legacyKeys.forEach(k=>localStorage.removeItem(k));}catch{}state.storageMessage='Address and dates stay only in this tab.';return;}
    try{const saved={...P.safeProfile(profile(),state.photo,state.weeks),conceptOnly:true,version:3};localStorage.setItem(storageKey,JSON.stringify(saved));legacyKeys.forEach(k=>localStorage.removeItem(k));state.storageMessage='Only the dog profile and choices were remembered. Address and dates stay in this tab.';}catch{state.storageMessage='Device storage was unavailable. Download your plan to keep a copy.';}
  }
  form.addEventListener('submit',e=>{
    e.preventDefault();clearErrors();
    if(state.step<4){if(!validateStep(state.step))return;state.step++;state.visited=Math.max(state.visited,state.step);showStep();return;}
    for(let i=0;i<4;i++){state.step=i;showStep(false);if(!validateStep(i))return;}
    state.step=4;showStep(false);if(!validateStep(4))return;
    savePetProfile();renderFinal();$('#complete h2').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
  });
  $('#back').addEventListener('click',()=>{if(state.step>0){clearErrors();state.step--;showStep();}});
  document.querySelectorAll('[data-step-link]').forEach(b=>b.addEventListener('click',()=>{const next=Number(b.dataset.stepLink);if(next<=state.step){openStep(next);return;}if(!validateStep(state.step))return;for(let i=0;i<next;i++){state.step=i;showStep(false);if(!validateStep(i))return;}state.step=next;clearErrors();showStep();}));
  form.addEventListener('input',e=>{if(e.target.id==='reviewed'||e.target.id==='rememberProfile')return;invalidateReview();clearErrors();conditional();names();});
  for(const key of ['play','chew','texture','allergy','avoid','restriction'])form.elements[key].addEventListener('change',()=>{const before=JSON.stringify(state.weeks);normalizeWeeks();if(before!==JSON.stringify(state.weeks))announce('Some box categories were updated to match the new preferences.');});
  document.querySelectorAll('[data-week]').forEach(b=>{
    b.addEventListener('click',()=>{state.activeWeek=Number(b.dataset.week);renderWeekEditor();announce(`Editing week ${state.activeWeek+1}.`);});
    b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();state.activeWeek=e.key==='Home'?0:e.key==='End'?3:(state.activeWeek+(e.key==='ArrowRight'?1:3))%4;renderWeekEditor();$(`#week-tab-${state.activeWeek}`).focus();});
  });
  for(const id of ['toyChoice','treat1','treat2'])$('#'+id).addEventListener('change',()=>{const w={toy:$('#toyChoice').value,treat1:$('#treat1').value,treat2:$('#treat2').value};if(id==='treat2'&&w.treat1===w.treat2){const alternative=P.treatOptions(profile()).find(o=>o.id!==w.treat2);if(alternative)w.treat1=alternative.id;}state.weeks[state.activeWeek]=P.normalizeWeek(w,profile());invalidateReview();renderWeekEditor();announce(`Week ${state.activeWeek+1} choices updated.`);});
  $('#copyWeeks').addEventListener('click',()=>{const current={...state.weeks[state.activeWeek]};state.weeks=Array.from({length:4},()=>({...current}));invalidateReview();renderWeekEditor();announce('These choices now apply to all four weeks.');});
  $('#firstDate').addEventListener('change',()=>{const first=$('#firstDate').value;state.firstDateDraft=first;invalidateReview();if(!P.isISODate(first)||first<P.earliestDate()||first>'9999-12-02'){return fail('Choose a supported first delivery date after today.',$('#firstDate'));}state.dates=P.weeklyDates(first);state.dateDrafts={};state.firstDateDraft=null;clearErrors();renderTiming();renderSchedule($('#scheduleEditor'),'plan');announce('All four requested dates updated, one week apart.');});
  $('#autoRecommend').addEventListener('change',()=>{invalidateReview();renderTiming();});
  const states='AL|Alabama;AK|Alaska;AZ|Arizona;AR|Arkansas;CA|California;CO|Colorado;CT|Connecticut;DE|Delaware;DC|District of Columbia;FL|Florida;GA|Georgia;HI|Hawaii;ID|Idaho;IL|Illinois;IN|Indiana;IA|Iowa;KS|Kansas;KY|Kentucky;LA|Louisiana;ME|Maine;MD|Maryland;MA|Massachusetts;MI|Michigan;MN|Minnesota;MS|Mississippi;MO|Missouri;MT|Montana;NE|Nebraska;NV|Nevada;NH|New Hampshire;NJ|New Jersey;NM|New Mexico;NY|New York;NC|North Carolina;ND|North Dakota;OH|Ohio;OK|Oklahoma;OR|Oregon;PA|Pennsylvania;RI|Rhode Island;SC|South Carolina;SD|South Dakota;TN|Tennessee;TX|Texas;UT|Utah;VT|Vermont;VA|Virginia;WA|Washington;WV|West Virginia;WI|Wisconsin;WY|Wyoming';
  states.split(';').forEach(pair=>{const [code,name]=pair.split('|');const option=node('option',name);option.value=code;$('#state').append(option);});
  $('#sampleDelivery').addEventListener('click',()=>{const sample={recipient:'Sam Sample',email:'sam@example.com',address1:'123 Demo Lane',address2:'Unit 4',city:'Minneapolis',state:'MN',zip:'55401',phone:''};addressFields.forEach(k=>$('#'+k).value=sample[k]);invalidateReview();clearErrors();announce('Fictional sample address and contact details filled in.');});
  $('#pausePlan').addEventListener('click',()=>{state.paused=!state.paused;invalidateReview();clearErrors();renderFinal();announce(state.paused?'All planned boxes paused.':'Plan resumed; skipped weeks remain skipped.');});
  $('#editDelivery').addEventListener('click',()=>openStep(3));$('#editChoices').addEventListener('click',()=>openStep(2));$('#editProfile').addEventListener('click',()=>openStep(0));
  function resetMemory(){state.photoToken++;state.photoBusy=false;state.step=0;state.visited=0;state.activeWeek=0;state.weeks=[];state.dates=P.weeklyDates(P.defaultDate());state.dateDrafts={};state.firstDateDraft=null;state.skipped=[false,false,false,false];state.paused=false;state.complete=false;state.storageMessage='';$('#autoRecommend').checked=false;$('#includeContact').checked=false;$('#rememberProfile').checked=false;addressFields.forEach(k=>$('#'+k).value='');$('#finalCover').replaceChildren();$('#finalDetails').replaceChildren();$('#finalSchedule').replaceChildren();$('#recommendationCard').replaceChildren();$('#completeStatus').textContent='';}
  function useRyan(){form.reset();resetMemory();const values={dogName:'Ryan',age:'4',ageUnit:'years',weight:'40',weightUnit:'lb',play:'Fetch',chew:'Gentle play',texture:'Soft bites',allergy:'None known',restriction:'None',avoid:''};for(const [k,v] of Object.entries(values))form.elements[k].value=v;state.photo='ryan.png';$('#photo').value='';$('#photoStatus').textContent='Example photo: Ryan the Border Collie.';normalizeWeeks();openStep(0);}
  $('#tryRyan').addEventListener('click',useRyan);
  $('#clear').addEventListener('click',()=>{try{[storageKey,...legacyKeys].forEach(k=>localStorage.removeItem(k));}catch{}form.reset();resetMemory();state.photo='';petFields.forEach(k=>{if(form.elements[k].tagName==='INPUT')form.elements[k].value='';});form.elements.circle.checked=false;$('#photo').value='';$('#photoStatus').textContent='Photo, profile and delivery details cleared.';openStep(0);announce('Photo, pet profile, address and delivery details cleared.');});
  $('#removePhoto').addEventListener('click',()=>{state.photoToken++;state.photoBusy=false;$('#next').disabled=false;state.photo='';$('#photo').value='';$('#photoStatus').textContent='Photo removed.';invalidateReview();syncPhoto();});
  $('#photo').addEventListener('change',async()=>{
    const file=$('#photo').files[0];if(!file)return;const token=++state.photoToken;state.photoBusy=false;$('#next').disabled=false;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return fail('Please choose a JPG, PNG or WebP image.',$('#photo'));
    if(file.size>10*1024*1024)return fail('Please choose an image smaller than 10 MB.',$('#photo'));
    state.photoBusy=true;$('#next').disabled=true;$('#photoStatus').textContent='Preparing your photo…';const url=URL.createObjectURL(file);
    try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});if(token!==state.photoToken)return;if(!img.naturalWidth)throw Error('Invalid image');const ratio=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff8ef';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);state.photo=canvas.toDataURL('image/jpeg',.86);invalidateReview();syncPhoto();clearErrors();$('#photoStatus').textContent='Photo ready. Your personalized cover is in step 3.';}catch{if(token===state.photoToken){fail('This image could not be opened. Your previous photo has been kept.',$('#photo'));$('#photoStatus').textContent='Choose another JPG, PNG or WebP.';}}finally{URL.revokeObjectURL(url);if(token===state.photoToken){state.photoBusy=false;$('#next').disabled=false;}}
  });
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
  async function downloadCover(){
    if(!state.photo)return fail('Add a dog photo first.',$('#photo'));
    try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=state.photo;});const c=document.createElement('canvas');c.width=1600;c.height=1000;const x=c.getContext('2d');x.fillStyle='#cc0000';x.fillRect(0,0,1600,1000);x.fillStyle='#fff5e5';x.fillRect(35,35,1530,860);x.fillStyle='#b00000';x.font='bold 30px Arial';x.fillText('Target Run Dog Club',80,110);x.font='italic 60px Georgia';x.fillText('Made for',80,350);let size=72;x.font='bold '+size+'px Georgia';while(x.measureText(dogName()).width>580&&size>22){size--;x.font='bold '+size+'px Georgia';}x.fillText(dogName(),80,450);x.font='24px Arial';x.fillText('Their photo. Their name. Their box.',80,550);const r=Math.min(850/img.naturalWidth,800/img.naturalHeight),w=img.naturalWidth*r,h=img.naturalHeight*r;x.drawImage(img,690+(850-w)/2,65+(800-h)/2,w,h);x.fillStyle='white';x.font='bold 30px Arial';x.fillText('YOUR WEEKLY BOX OF HAPPY',70,960);x.font='20px Arial';x.fillText('Packaging concept',1310,960);c.toBlob(blob=>{if(blob)downloadBlob(blob,'my-dog-box-cover.png');else fail('The cover could not be downloaded. Please try again.');},'image/png');}catch{fail('The cover image could not be opened. Please try another photo.');}
  }
  $('#downloadCover').addEventListener('click',downloadCover);$('#saveImage').addEventListener('click',downloadCover);
  $('#downloadPlan').addEventListener('click',()=>{
    if(!validateDateDrafts())return;
    const lines=['TARGET RUN DOG CLUB — CONCEPT PLAN',`Dog: ${dogName()}`,`Plan: ${state.paused?'paused':'active preview'}`,''];
    state.weeks.forEach((w,i)=>lines.push(`Week ${i+1}: ${dateLabel(state.dates[i])} — ${statusLabel(i)}`,...choiceLabels(w),'Plus 1 edible chew, pending suitability review.',''));
    if(selectedMode())lines.push(`Week 5 suggestion: ${dateLabel(week5Date())}${state.paused?' — paused':''}`,...choiceLabels(P.recommend(state.weeks,profile(),state.skipped)),'');else lines.push('Week 5: off; keep choosing manually.','');
    if($('#includeContact').checked){const d=delivery();lines.push('DELIVERY DETAILS (included by your choice)',d.recipient,d.address1,d.address2,`${d.city}, ${d.state} ${d.zip}`,'United States',d.email,d.phone,'');}else lines.push('Address and contact details omitted from this download.','');
    lines.push('Requested dates only. No order, payment, subscription or shipment was created.','Product availability, ingredients, price and delivery need live checkout confirmation.');downloadBlob(new Blob([lines.filter(v=>v!==undefined).join('\n')],{type:'text/plain;charset=utf-8'}),'dog-club-plan.txt');
  });
  $('#downloadCalendar').addEventListener('click',()=>{
    if(state.paused||!validateDateDrafts())return;const dateCheck=P.validateDates(state.dates);if(!dateCheck.ok)return fail(dateCheck.message);
    const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Dog Club Concept//Requested Dates//EN','CALSCALE:GREGORIAN'];
    const dates=state.dates.map((date,i)=>({date,week:i+1,skip:state.skipped[i]}));if(selectedMode())dates.push({date:week5Date(),week:5,skip:false});
    dates.filter(v=>!v.skip).forEach(({date,week})=>lines.push('BEGIN:VEVENT',`UID:dog-club-${Date.now()}-${week}@concept.invalid`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${P.addDays(date,1).replace(/-/g,'')}`,`SUMMARY:Dog Club week ${week} - requested date (concept)`,'DESCRIPTION:Planning preview only. No order or shipment has been created.','TRANSP:TRANSPARENT','END:VEVENT'));
    lines.push('END:VCALENDAR');downloadBlob(new Blob([lines.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}),'dog-club-requested-dates.ics');
  });
  function restore(){
    let saved=null;try{const raw=localStorage.getItem(storageKey)||localStorage.getItem(legacyKeys[0]);saved=raw?JSON.parse(raw):null;}catch{}
    if(!saved||!saved.conceptOnly){useRyan();return;}
    if(saved.dogName==='Kai'&&saved.photo==='kai.png')saved={...saved,dogName:'Ryan',photo:'ryan.png'};
    const oldWeek={toy:saved.toyChoice,treat1:saved.treat1,treat2:saved.treat2};
    const oldWeeks=Array.isArray(saved.weeks)?saved.weeks:Array.from({length:4},()=>({...oldWeek}));
    const safe=P.safeProfile(saved,saved.photo,oldWeeks);for(const k of petFields)if(safe[k]!==undefined)form.elements[k].value=String(safe[k]);form.elements.circle.checked=!!safe.circle;state.photo=safe.photo||'';state.weeks=safe.weeks;$('#rememberProfile').checked=true;addressFields.forEach(k=>$('#'+k).value='');$('#photoStatus').textContent='Remembered dog profile loaded. Add delivery details again to plan a shipment.';normalizeWeeks();showStep(false);
  }
  restore();
})();
