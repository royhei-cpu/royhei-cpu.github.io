// Intentionally independent of the lesson's modules and animation/audio stack.
// Reports stay on the device; sample/learner audio uses the lesson voice API.
import {MicrophoneSession,canRecord} from './microphone.js?v=33';
(() => {
  const $=id=>document.getElementById(id);
  const audio=$('test-audio');
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const report={
    Check:'Pawlish voice check 33',
    Device:/iPhone|iPad|iPod/.test(navigator.userAgent)?'iPhone / iPad':'Other',
    Browser:navigator.userAgent,
    'Secure page':window.isSecureContext?'Yes':'No',
    'Inside another page':window.top!==window?'Yes':'No',
    'Microphone API':navigator.mediaDevices?.getUserMedia?'Available':'Unavailable',
    'Speech API':Recognition?'Available':'Unavailable',
    'Greeting file':'Checking…',
    Sound:'Not tested',Microphone:'Not tested',Speech:'Not tested',Service:'Not tested'
  };
  let micToken=0,stream=null,context=null,micFrame=null,micTimer=null,permissionTimer=null;
  let recognition=null,speechTimer=null,lessonMic=null,serviceAbort=null;
  const render=()=>{$('check-report').value=Object.entries(report).map(([k,v])=>`${k}: ${v}`).join('\n');};
  const result=(kind,message,state='')=>{report[kind]=message;const el=$({Sound:'sound-result',Microphone:'mic-result',Speech:'speech-result',Service:'service-result'}[kind]);el.textContent=message;el.dataset.state=state;render();};
  $('environment').textContent='按下面的一、二、三步检查。每一步都可以单独试。';
  render();

  function stopMic(){
    micToken++;clearTimeout(micTimer);clearTimeout(permissionTimer);cancelAnimationFrame(micFrame);
    stream?.getTracks().forEach(track=>track.stop());stream=null;
    if(context){context.close().catch(()=>{});context=null;}
    $('check-mic').textContent='检查麦克风';$('mic-level').value=0;
  }
  function stopSpeech(){
    lessonMic?.stop();lessonMic=null;
    clearTimeout(speechTimer);const previous=recognition;recognition=null;
    if(previous)try{previous.abort();}catch{}
    $('check-speech').textContent='试说 Hello';
  }
  function stopOtherChecks(){
    serviceAbort?.abort();
    const hadMic=!!stream||$('check-mic').textContent==='停止检查';
    const hadSpeech=!!recognition||!!lessonMic?.active;stopMic();stopSpeech();
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

  // Feed known clips through the browser's real recorder, silence detector and
  // lesson transcription path. No microphone is opened for this check. The
  // quiet first clip reproduces the short-Hello failure that direct MP3
  // uploads could not detect.
  function checkRecordedSamples(signal){
    return new Promise((resolve,reject)=>{
      let ctx,destination,session,source,gain,finished=false,index=0,buffers;
      const phrases=['Hello.','Thank you.','Please.'];
      const normal=text=>text.toLowerCase().replace(/[^a-z]/g,'');
      const stopSource=()=>{try{source?.stop();source?.disconnect();gain?.disconnect();}catch{}source=null;gain=null;};
      const finish=error=>{
        if(finished)return;finished=true;signal.removeEventListener('abort',cancel);
        session?.stop();stopSource();destination?.stream.getTracks().forEach(track=>track.stop());
        try{ctx?.close()?.catch(()=>{});}catch{}
        if(error)reject(error);else resolve();
      };
      const cancel=()=>finish(new Error('检查已停止。'));
      signal.addEventListener('abort',cancel,{once:true});
      if(signal.aborted){cancel();return;}
      try{
        const Context=window.AudioContext||window.webkitAudioContext;
        ctx=new Context();destination=ctx.createMediaStreamDestination();
        const resumed=ctx.resume();
        Promise.all(phrases.map(async(_,i)=>{
          const clip=await fetch('assets/puppy-female/year-1-en-'+i+'.mp3',{signal});
          if(!clip.ok)throw new Error('示范声音没有加载好，请重试。');
          return ctx.decodeAudioData(await clip.arrayBuffer());
        })).then(async decoded=>{
          await resumed;if(finished)return;buffers=decoded;
          const host={Blob,AbortController,MediaRecorder:window.MediaRecorder,
            AudioContext:class {constructor(){return ctx;}},
            navigator:{mediaDevices:{getUserMedia:async()=>destination.stream}},
            setTimeout:(fn,ms)=>window.setTimeout(fn,ms),clearTimeout:id=>window.clearTimeout(id),
            fetch:(url,options)=>window.fetch(url,options)};
          session=new MicrophoneSession({host,
            onText:text=>{
              if(finished)return;
              if(normal(text)!==normal(phrases[index])){finish(new Error('第 '+(index+1)+' 句没有听清，请再试一次。'));return;}
              stopSource();index++;
              if(index===phrases.length)finish();else session.listen(250);
            },
            onRetry:()=>{finish(new Error('录音没有听清，请再检查一次。'));return true;},
            onChange:({phase,message})=>{
              if(finished)return;
              if(phase==='blocked'){finish(new Error(message));return;}
              if(phase==='recovering'){stopSource();result('Service',message);return;}
              if(phase==='transcribing')result('Service','第 '+(index+1)+' / 3 句已录好，正在识别…');
              if(phase!=='listening'||source)return;
              result('Service','正在录第 '+(index+1)+' / 3 句'+(index===0?'（轻声 Hello）':'')+'…');
              try{
                source=ctx.createBufferSource();source.buffer=buffers[index];gain=ctx.createGain();
                if(index===0){
                  const samples=buffers[index].getChannelData(0);let peak=0;
                  for(let p=0;p<samples.length;p+=1024){let sum=0,count=Math.min(2048,samples.length-p);for(let j=0;j<count;j++)sum+=samples[p+j]**2;peak=Math.max(peak,Math.sqrt(sum/count));}
                  gain.gain.value=Math.min(1,.003/Math.max(.003,peak));
                }
                source.connect(gain);gain.connect(destination);source.start(ctx.currentTime+.15);
              }catch(error){finish(error);}
            }});
          session.enable();
        }).catch(finish);
      }catch(error){finish(error);}
    });
  }

  $('check-service').addEventListener('click',async()=>{
    if(serviceAbort)return;
    audio.pause();stopOtherChecks();serviceAbort=new AbortController();
    const controller=serviceAbort,timeout=setTimeout(()=>controller.abort(),75000);
    $('check-service').disabled=true;
    try{
      result('Service','正在准备三句录音检查…');
      await checkRecordedSamples(controller.signal);
      result('Service','已连续录下并听懂 3 句，包括轻声 Hello。再点「试说 Hello」检查你的麦克风。','good');
    }catch(error){result('Service',controller.signal.aborted?'检查超时了，请重试。':error.message||'语音连接没有完成，请重试。','error');}
    finally{clearTimeout(timeout);if(serviceAbort===controller)serviceAbort=null;$('check-service').disabled=false;}
  });
  $('check-speech').addEventListener('click',()=>{
    if(lessonMic?.active){stopSpeech();result('Speech','检查已停止。');return;}
    audio.pause();stopOtherChecks();$('heard-words').textContent='';
    if(!canRecord(window)){result('Speech','这里不能录音，请用 Safari 或 Chrome 打开网页。','error');return;}
    lessonMic=new MicrophoneSession({host:window,
      onText:text=>{stopSpeech();$('heard-words').textContent='听到的是：“'+text+'”';result('Speech','收到你的话了！可以返回小狗老师继续练习。','good');},
      onRetry:()=>{stopSpeech();result('Speech','没有听清，请靠近手机再试一次。','error');return true;},
      onChange:({phase,message})=>{
        if(phase==='blocked'){result('Speech',message,'error');$('check-speech').textContent='试说 Hello';}
        else if(phase==='listening')result('Speech','正在听。试着说 Hello，然后停一下。');
        else if(phase==='transcribing')result('Speech','听到了，正在识别…');
        else if(phase==='starting')result('Speech','请允许麦克风。');
      }});
    $('check-speech').textContent='停止检查';lessonMic.enable();
    speechTimer=setTimeout(()=>{if(lessonMic?.active){stopSpeech();result('Speech','检查已停止，可以再试一次。');}},45000);
  });

  $('copy-check').addEventListener('click',async()=>{
    render();try{await navigator.clipboard.writeText($('check-report').value);$('copy-result').textContent='已复制，可以粘贴到聊天里。';}
    catch{$('check-report').focus();$('check-report').select();$('copy-result').textContent='长按选中的结果复制，也可以截图。';}
  });
  const leave=()=>{audio.pause();serviceAbort?.abort();stopOtherChecks();};
  window.addEventListener('pagehide',leave);document.addEventListener('visibilitychange',()=>{if(document.hidden)leave();});
})();
