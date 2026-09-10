// Intentionally independent of the lesson's modules and animation/audio stack.
// Diagnostics stay on the device until the learner chooses to copy them.
(() => {
  const $=id=>document.getElementById(id);
  const audio=$('test-audio');
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const report={
    Check:'Pawlish voice check 1',
    Device:/iPhone|iPad|iPod/.test(navigator.userAgent)?'iPhone / iPad':'Other',
    Browser:navigator.userAgent,
    'Secure page':window.isSecureContext?'Yes':'No',
    'Inside another page':window.top!==window?'Yes':'No',
    'Microphone API':navigator.mediaDevices?.getUserMedia?'Available':'Unavailable',
    'Speech API':Recognition?'Available':'Unavailable',
    'Greeting file':'Checking…',
    Sound:'Not tested',Microphone:'Not tested',Speech:'Not tested'
  };
  let micToken=0,stream=null,context=null,micFrame=null,micTimer=null,permissionTimer=null;
  let recognition=null,speechTimer=null;
  const render=()=>{$('check-report').value=Object.entries(report).map(([k,v])=>`${k}: ${v}`).join('\n');};
  const result=(kind,message,state='')=>{report[kind]=message;const el=$({Sound:'sound-result',Microphone:'mic-result',Speech:'speech-result'}[kind]);el.textContent=message;el.dataset.state=state;render();};
  $('environment').textContent='按下面的一、二、三步检查。每一步都可以单独试。';
  render();

  function stopMic(){
    micToken++;clearTimeout(micTimer);clearTimeout(permissionTimer);cancelAnimationFrame(micFrame);
    stream?.getTracks().forEach(track=>track.stop());stream=null;
    if(context){context.close().catch(()=>{});context=null;}
    $('check-mic').textContent='检查麦克风';$('mic-level').value=0;
  }
  function stopSpeech(){
    clearTimeout(speechTimer);const previous=recognition;recognition=null;
    if(previous)try{previous.abort();}catch{}
    $('check-speech').textContent='检查语音识别';
  }
  function stopOtherChecks(){
    const hadMic=!!stream||$('check-mic').textContent==='停止检查';
    const hadSpeech=!!recognition;stopMic();stopSpeech();
    if(hadMic)result('Microphone','检查已停止。');
    if(hadSpeech)result('Speech','检查已停止。');
  }

  audio.addEventListener('play',()=>{stopOtherChecks();result('Sound','正在播放。你听到小狗了吗？');});
  audio.addEventListener('ended',()=>result('Sound','播放完了。请确认你是否听到了声音。'));
  audio.addEventListener('error',()=>result('Sound',`声音没有加载成功（代码 ${audio.error?.code||'未知'}）。请试试直接打开声音。`,'error'));
  fetch('assets/puppy-female/cn-welcome.mp3',{method:'HEAD',cache:'no-store'}).then(response=>{
    report['Greeting file']=`HTTP ${response.status}; ${response.headers.get('content-type')||'no content type'}${response.redirected?'; redirected':''}`;render();
  }).catch(error=>{report['Greeting file']=`Could not load: ${error.name}`;render();});

  $('check-mic').addEventListener('click',async()=>{
    if($('check-mic').textContent==='停止检查'){stopMic();result('Microphone','检查已停止。');return;}
    audio.pause();stopOtherChecks();
    if(!navigator.mediaDevices?.getUserMedia){result('Microphone','这里无法使用麦克风，请用 Safari 打开网页。','error');return;}
    const token=micToken;$('check-mic').textContent='停止检查';
    result('Microphone','正在等手机授权。如果弹出提示，请点允许。');
    permissionTimer=setTimeout(()=>{if(token===micToken){stopMic();result('Microphone','三十秒内没有收到授权，看看手机是否在等你确认。','error');}},30000);
    try{
      const captured=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if(token!==micToken){captured.getTracks().forEach(track=>track.stop());return;}
      clearTimeout(permissionTimer);stream=captured;
      result('Microphone','麦克风已允许。现在说说话，看看音量条。');
      let peak=0;
      // Arm cleanup before awaiting any audio-engine promise: even a suspended
      // engine must not leave the microphone running beyond the eight seconds.
      micTimer=setTimeout(()=>{
        if(token!==micToken)return;
        const meterRunning=context?.state==='running';stopMic();
        result('Microphone',peak>.008?'检测到声音，麦克风正常。':meterRunning?'已允许麦克风，但声音不清楚。靠近一点再试试。':'已允许麦克风，但音量条没有运行。',peak>.008?'good':'');
      },8000);
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(AudioContext){
        context=new AudioContext();const ctx=context;
        await ctx.resume();if(token!==micToken)return;
        const analyser=ctx.createAnalyser();analyser.fftSize=1024;
        ctx.createMediaStreamSource(captured).connect(analyser);
        const samples=new Uint8Array(analyser.fftSize);
        const update=()=>{
          if(token!==micToken)return;
          analyser.getByteTimeDomainData(samples);let power=0;
          for(const sample of samples)power+=((sample-128)/128)**2;
          const rms=Math.sqrt(power/samples.length);peak=Math.max(peak,rms);
          $('mic-level').value=Math.min(1,rms*8);micFrame=requestAnimationFrame(update);
        };update();
      }
    }catch(error){
      if(token!==micToken)return;stopMic();
      const messages={NotAllowedError:'麦克风权限被拒绝或被浏览器阻止。',NotFoundError:'没有找到麦克风。',NotReadableError:'麦克风打不开，可能正在被其他应用使用。',SecurityError:'这个页面没有麦克风权限。'};
      result('Microphone',`${messages[error.name]||'麦克风设置失败。'} (${error.name})`,'error');
    }
  });

  $('check-speech').addEventListener('click',()=>{
    if(recognition){stopSpeech();result('Speech','检查已停止。');return;}
    audio.pause();stopOtherChecks();$('heard-words').textContent='';
    if(!Recognition){result('Speech','这个浏览器不能识别语音，可以返回后打字练习。','error');return;}
    let listener,heard=false;
    try{listener=new Recognition();}catch(error){result('Speech',`语音服务无法开始（${error.name}).`,'error');return;}
    recognition=listener;const current=()=>recognition===listener;
    listener.lang='en-US';listener.continuous=false;listener.interimResults=true;
    listener.onstart=()=>{if(current())result('Speech','正在听。试着说 Hello。');};
    listener.onresult=event=>{
      if(!current())return;
      const words=Array.from(event.results,r=>r[0].transcript).join(' ').trim();
      if(words){heard=true;$('heard-words').textContent=`听到的是：“${words}”`;result('Speech','收到了文字，语音识别正常。','good');}
    };
    listener.onerror=event=>{
      if(!current())return;stopSpeech();
      const messages={'not-allowed':'语音权限被拒绝或阻止。','service-not-allowed':'浏览器的语音服务暂时不可用。',network:'语音服务连接不上。','audio-capture':'语音服务无法使用麦克风。','no-speech':'没有检测到说话声。'};
      result('Speech',`${messages[event.error]||'语音识别已停止。'} (${event.error})`,'error');
    };
    listener.onend=()=>{if(current()){stopSpeech();if(!heard)result('Speech','语音服务停止了，还没有收到文字。','error');}};
    $('check-speech').textContent='停止检查';result('Speech','语音识别正在开始……');
    speechTimer=setTimeout(()=>{if(current()){stopSpeech();if(!heard)result('Speech','二十秒内没有识别到文字。','error');}},20000);
    try{listener.start();}catch(error){stopSpeech();result('Speech',`语音输入未能开始（${error.name}).`,'error');}
  });

  $('copy-check').addEventListener('click',async()=>{
    render();try{await navigator.clipboard.writeText($('check-report').value);$('copy-result').textContent='已复制，可以粘贴到聊天里。';}
    catch{$('check-report').focus();$('check-report').select();$('copy-result').textContent='长按选中的结果复制，也可以截图。';}
  });
  const leave=()=>{audio.pause();stopOtherChecks();};
  window.addEventListener('pagehide',leave);document.addEventListener('visibilitychange',()=>{if(document.hidden)leave();});
})();
