(()=>{
  'use strict';
  const $=id=>document.getElementById(id),input=$('api-key'),button=$('connect-button'),form=$('connection-form'),disconnect=$('disconnect-button'),paste=$('paste-key');
  const parseKeyInput=PawlishKeyInput.parseKeyInput;
  let busy=false,ready=false,pasteTicket=0;
  const setBusy=value=>{busy=value;if(value)pasteTicket++;input.disabled=value||!ready;button.disabled=value||!ready;paste.disabled=value||!ready;disconnect.disabled=value;button.textContent=value?'正在连接…… Connecting…':'保存并连接 · Connect';};
  function say(message,error=false){$('connection-status').textContent=message;$('connection-status').classList.toggle('error',error);}
  function help(data){
    const link=$('connection-help');link.hidden=true;link.removeAttribute('href');
    const allowed=['https://platform.openai.com/settings/organization/billing/overview','https://platform.openai.com/settings/organization/general'];
    if(allowed.includes(data.helpURL)){link.href=data.helpURL;link.textContent=data.code==='insufficient_quota'?'打开 OpenAI API 充值页面 · Open API billing':'打开 OpenAI 账号验证 · Open verification';link.hidden=false;}
  }
  function state(data){$('continue-button').hidden=!data.connected;disconnect.hidden=!data.personal;}
  paste.addEventListener('click',async()=>{
    if(busy||!ready)return;
    let copied='';const ticket=++pasteTicket;
    try{
      // Clipboard access happens only after the user clicks Paste key.
      copied=await navigator.clipboard.readText();
      if(ticket!==pasteTicket||busy)return;
      const parsed=parseKeyInput(copied);copied='';
      if(parsed.problem){input.value='';say(parsed.problem.error+'\n'+parsed.problem.detail,true);return;}
      input.value=parsed.key;say('已粘贴。点击下方「连接」。\nPasted. Click Connect below.');button.focus();
    }catch{if(ticket!==pasteTicket)return;say('请点击密钥框粘贴：Mac 按 ⌘+V；手机长按后点「粘贴」。\nClick the key box and press ⌘+V on Mac, or touch and hold it on your phone and choose Paste.');input.focus();}
    finally{copied='';}
  });
  async function check(){
    try{const response=await fetch('/api/dog/connection',{cache:'no-store',credentials:'same-origin'});const data=await response.json();if(!response.ok)throw new Error(data.detail||'Sign in to Pawlish, then reload this page.');
      ready=!!data.canSave;state(data);say(data.connected?'已连接。可以选择狗狗照片了。\nConnected. You can choose a dog photo.':ready?'还差一步：在下方粘贴密钥。\nOne step left: paste your key below.':'安全设置正在准备，请稍后刷新。\nSecure setup is not ready yet. Please reload shortly.',!ready);setBusy(false);
    }catch{say('暂时连接不上。请刷新页面，并检查网络连接。\nUnable to load your connection. Check your network and reload.',true);setBusy(false);}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!ready)return;
    let parsed=parseKeyInput(input.value);
    if(parsed.problem){input.value='';say(parsed.problem.error+'\n'+parsed.problem.detail,true);parsed=null;input.focus();return;}
    const body=JSON.stringify({apiKey:parsed.key});input.value='';parsed=null;setBusy(true);help({});say('正在直接连接 OpenAI……\nChecking your key with OpenAI…');
    try{const response=await fetch('/api/dog/connection',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(20000)});const data=await response.json();
      if(!response.ok){say((data.error||'连接未完成。')+'\n'+(data.detail||'Connection was not completed. Please try again.'),true);help(data);return;}
      state(data);say('连接成功！密钥已加密保存。\nConnected! Your key is saved encrypted. Choose a dog photo below.');$('continue-button').focus();
    }catch{say('没有收到连接结果。刷新页面检查是否已保存，再决定是否重试。\nNo response received. Reload to check whether the key was saved before trying again.',true);}
    finally{input.value='';setBusy(false);}
  });
  disconnect.addEventListener('click',async()=>{
    if(busy||!confirm('断开图像服务？你的小狗和学习进度会保留。\nDisconnect image creation? Your dog and learning progress will be kept.'))return;
    setBusy(true);input.value='';help({});
    try{const response=await fetch('/api/dog/connection',{method:'DELETE',credentials:'same-origin'});const data=await response.json();if(!response.ok)throw new Error();state(data);say(data.connected?'个人密钥已删除。\nYour personal key has been removed.':'已断开连接。\nDisconnected. Your saved key has been removed.');}catch{say('断开未完成，请重试。\nCould not disconnect. Please try again.',true);}finally{setBusy(false);}
  });
  addEventListener('pagehide',()=>{pasteTicket++;input.value='';});check();
})();
