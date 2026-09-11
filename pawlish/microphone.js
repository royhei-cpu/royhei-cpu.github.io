// Record only the learner's turn. Unlike Web Speech, this does not depend on
// Safari's dictation service or a browser vendor's speech-recognition backend.
export function canRecord(host=globalThis){
  return !!(host.navigator?.mediaDevices?.getUserMedia&&host.MediaRecorder&&(host.AudioContext||host.webkitAudioContext));
}
export class MicrophoneSession {
  constructor({host=globalThis,onText,onRetry=()=>false,onChange=()=>{},onTranscript=()=>{},onLevel=()=>{},getEndSilence=()=>950,now=()=>Date.now()}){
    Object.assign(this,{host,onText,onRetry,onChange,onTranscript,onLevel,getEndSilence,now});
    this.active=false;this.phase='off';this.generation=0;this.turn=0;this.timers=new Set();this.emptyTurns=0;
  }
  later(fn,ms){const id=this.host.setTimeout(()=>{this.timers.delete(id);fn();},ms);this.timers.add(id);return id;}
  clear(id){this.host.clearTimeout(id);this.timers.delete(id);}
  change(phase,message='',problem=''){this.phase=phase;this.onChange({active:this.active,phase,message,problem});}
  enable({greeting=false}={}){
    this.release();this.active=true;this.holdForSpeech=greeting;this.suspended=false;this.emptyTurns=0;this.repairs=0;
    const generation=this.generation;
    this.change('starting','请允许麦克风。');
    try{
      const Context=this.host.AudioContext||this.host.webkitAudioContext;
      this.context=new Context();
      // Both calls stay in the initial user gesture. No permission prompt on
      // later turns. Keep the input device running between replies; toggling
      // its track off can put a phone's capture session back to sleep. Stop the
      // recorder during the puppy, so none of its speech is collected or sent.
      const resumed=this.context.resume();resumed?.catch(()=>{});
      const permission=this.host.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      const timer=this.later(()=>{if(this.current(generation))this.fail('还没获得麦克风权限。请允许麦克风，再点开始。','permission_timeout');},20000);
      Promise.resolve(permission).then(stream=>{
        if(!this.current(generation)){stream.getTracks().forEach(track=>track.stop());return;}
        this.clear(timer);this.stream=stream;
        for(const track of stream.getAudioTracks()){track.enabled=!this.suspended;track.onended=()=>{if(this.current(generation))this.fail('麦克风断开了，请重新开始。','audio-capture');};}
        try{
          this.input=this.context.createMediaStreamSource(stream);this.analyser=this.context.createAnalyser();this.analyser.fftSize=2048;
          this.samples=new Float32Array(this.analyser.fftSize);this.input.connect(this.analyser);
          if(!this.holdForSpeech)this.listen(0);
        }catch{this.fail('麦克风无法启动，请重新开始。','audio-capture');}
      },error=>{if(this.current(generation))this.fail(error?.name==='NotAllowedError'?'麦克风未获允许。请在浏览器的网站权限中允许麦克风。':'没有收到麦克风，请检查设备后重试。',error?.name==='NotAllowedError'?'not-allowed':'audio-capture');});
    }catch{this.fail('这里不能使用麦克风，请用 Safari 或 Chrome 打开。','unsupported');}
    return this.active;
  }
  current(generation){return this.active&&this.generation===generation;}
  cancelTurn(){
    this.turn++;for(const id of this.timers)this.host.clearTimeout(id);this.timers.clear();
    this.abort?.abort();this.abort=null;
    const recorder=this.recorder;this.recorder=null;
    if(recorder){recorder.ondataavailable=null;recorder.onstop=null;recorder.onerror=null;try{if(recorder.state!=='inactive')recorder.stop();}catch{}}
    this.onLevel(0);
  }
  release(){
    this.generation++;this.cancelTurn();
    this.stream?.getTracks().forEach(track=>{track.onended=null;track.stop();});this.stream=null;
    try{this.input?.disconnect();}catch{}this.input=null;this.analyser=null;
    const context=this.context;this.context=null;try{context?.close()?.catch(()=>{});}catch{}
  }
  stop(message='已暂停。'){this.active=false;this.release();this.change('off',message);}
  fail(message,problem='microphone'){this.active=false;this.release();this.change('blocked',message,problem);}
  suspend(){
    this.suspended=true;this.pauseForSpeech();
    this.stream?.getAudioTracks().forEach(track=>{track.enabled=false;});
  }
  pauseForSpeech(){
    if(!this.active)return;this.holdForSpeech=true;
    // Do not cancel the initial microphone permission timeout while the puppy
    // starts speaking. There is no recorder until permission is granted.
    if(this.stream)this.cancelTurn();this.change('thinking');
  }
  listen(delay=240){
    if(!this.active)return;this.holdForSpeech=false;this.suspended=false;
    if(!this.stream){this.change('starting','请允许麦克风。');return;}
    this.cancelTurn();const turn=this.turn;this.change('waiting');
    this.later(()=>{if(this.active&&this.turn===turn&&!this.holdForSpeech)this.capture();},delay);
  }
  recoverInput(){
    if(!this.active||this.holdForSpeech||this.suspended)return;
    this.cancelTurn();
    if(this.repairs++>=2){this.fail('麦克风没有恢复。请点开始重试，或在手机浏览器打开。','capture-stalled');return;}
    const generation=this.generation,turn=this.turn,context=this.context;
    const current=()=>this.current(generation)&&this.turn===turn&&!this.holdForSpeech&&!this.suspended;
    this.change('recovering','麦克风断了一下，正在恢复…');
    const timeout=this.later(()=>{if(current())this.fail('麦克风没有恢复。请点开始重试。','capture-stalled');},3500);
    // Some phone audio engines report running while their clock is frozen.
    // Reset that engine using the existing stream, without another permission
    // request. Pause, menus and backgrounding invalidate every completion.
    Promise.resolve().then(()=>{if(current())return context.suspend?.();})
      .then(()=>{if(current())return context.resume();})
      .then(()=>{if(current()){this.clear(timeout);this.listen(80);}})
      .catch(()=>{if(current())this.fail('麦克风没有恢复。请点开始重试。','capture-stalled');});
  }
  capture(){
    const generation=this.generation,turn=this.turn;
    const current=()=>this.current(generation)&&this.turn===turn&&!this.holdForSpeech;
    if(!current())return;
    this.stream.getAudioTracks().forEach(track=>{track.enabled=true;});
    const resumed=this.context.resume();resumed?.catch(()=>{if(current())this.fail('声音通道暂停了，请点开始继续。','audio-capture');});
    let recorder;
    try{
      const mimeType=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>this.host.MediaRecorder.isTypeSupported(type));
      if(!mimeType)throw new Error('Unsupported recording type');
      recorder=new this.host.MediaRecorder(this.stream,{mimeType,audioBitsPerSecond:64000});this.recorder=recorder;
    }catch{this.fail('这里不能录音，请用 Safari 或 Chrome 打开。','unsupported');return;}
    const chunks=[];let bytes=0,heard=0,lastVoice=0,voiceStarted=0,stopping=false;
    const began=this.now(),endSilence=Math.max(600,Math.min(1500,Number(this.getEndSilence())||950));let noise=.0003,notified=false;
    let audioTime=this.context.currentTime,clockAdvancedAt=began;
    recorder.ondataavailable=event=>{
      if(!current()||!event.data?.size)return;chunks.push(event.data);bytes+=event.data.size;
      if(bytes>1024*1024)this.fail('这句话有点长，我们分成短句说。','audio_size');
    };
    recorder.onerror=()=>{if(current())this.recoverInput();};
    recorder.onstop=()=>{
      if(!current())return;
      this.recorder=null;this.onLevel(0);
      // A phone may end the recorder without our silence timer stopping it.
      // Preserve a voiced final chunk instead of losing the learner's answer.
      if(!stopping){
        if(!voiceStarted){this.recoverInput();return;}
        stopping=true;this.change('transcribing','听到啦，想一下……');
      }
      this.transcribe(new this.host.Blob(chunks,{type:recorder.mimeType.split(';')[0]}),generation,turn);
    };
    try{recorder.start(250);}catch{this.fail('录音没能开始，请重试。','audio-capture');return;}
    this.change('listening');this.onTranscript('');
    const poll=()=>{
      if(!current()||stopping)return;
      const now=this.now();
      if(this.context.state!=='running'){
        if(now-clockAdvancedAt>=1500){this.recoverInput();return;}
        this.later(poll,50);return;
      }
      const nextAudioTime=this.context.currentTime;
      if(Number.isFinite(nextAudioTime)){
        if(nextAudioTime!==audioTime){audioTime=nextAudioTime;clockAdvancedAt=now;}
        else if(now-clockAdvancedAt>=1500){this.recoverInput();return;}
      }
      try{this.analyser.getFloatTimeDomainData(this.samples);}
      catch{this.recoverInput();return;}
      const rms=Math.sqrt(this.samples.reduce((sum,sample)=>sum+sample*sample,0)/this.samples.length);
      this.onLevel(Math.min(1,rms*60));
      // The former .004 floor discarded a quiet one-word reply completely.
      // Still require two voiced windows and a full silence interval; room
      // noise below the adaptive floor must never become an answer.
      const voiced=rms>Math.max(.0012,noise*2.7);
      if(voiced){heard+=50;lastVoice=now;if(!voiceStarted&&heard>=100)voiceStarted=now;}
      else if(!voiceStarted){heard=Math.max(0,heard-25);noise=.95*noise+.05*Math.min(rms,.006);}
      if(voiceStarted&&(now-lastVoice>=endSilence||now-voiceStarted>=25000)){
        stopping=true;this.change('transcribing','听到啦，想一下……');
        // Keep a bounded deadline if a recorder fails to deliver its final chunk.
        this.later(()=>{if(current()&&this.recorder===recorder)this.fail('录音没能完成，请重新开始。','audio-capture');},3000);
        try{recorder.stop();}catch{this.fail('录音没能完成，请重试。','audio-capture');}return;
      }
      if(!voiceStarted&&now-began>=8000&&!notified){notified=true;this.change('listening','还没听到，靠近麦克风说一句。');}
      if(!voiceStarted&&now-began>=15000){this.listen(0);return;}
      this.later(poll,50);
    };
    this.later(poll,50);
  }
  async transcribe(blob,generation,turn){
    const current=()=>this.current(generation)&&this.turn===turn&&!this.holdForSpeech;
    if(!current())return;
    if(blob.size<100){this.listen(0);return;}
    const abort=new this.host.AbortController();this.abort=abort;
    const retryListening=message=>{
      if(!current())return;
      this.pauseForSpeech();
      if(!this.onRetry(message))this.listen(240);
    };
    try{
      for(let attempt=0;attempt<3;attempt++){
        const request=new this.host.AbortController(),cancel=()=>request.abort();
        abort.signal.addEventListener('abort',cancel,{once:true});
        const timer=this.later(cancel,23000);
        let wait=650*2**attempt;
        try{
          const response=await this.host.fetch('/api/voice/transcribe',{method:'POST',headers:{'Content-Type':blob.type},body:blob,cache:'no-store',signal:request.signal});
          let data;try{data=await response.json();}catch{throw new Error('VoiceResponseUnavailable');}
          if(!current())return;
          if(!response.ok){
            const permanent=['invalid_key','insufficient_quota','access_denied','verification_required','model_unavailable','unexpected_redirect','connection_required','sign_in'].includes(data.code);
            const retryable=!permanent&&(response.status>=500||response.status===429&&['busy','rate_limited'].includes(data.code));
            if(!retryable){this.fail(data.error||'语音暂时不可用，请检查连接。',data.code||'voice_unavailable');return;}
            if(response.status===429)wait=Math.max(wait,5000);
            throw new Error('VoiceTemporarilyUnavailable');
          }
          const text=typeof data.text==='string'?data.text.trim().slice(0,500):'';
          if(!text){this.emptyTurns++;retryListening('没听清，靠近手机再说一次。我会自动接着听。');return;}
          this.emptyTurns=0;this.repairs=0;this.onTranscript(text);this.pauseForSpeech();this.onText(text);return;
        }catch{
          if(!current())return;
          if(attempt===2){retryListening('暂时无法识别录音，是连接问题，不是你说错了。请再试一次。');return;}
          this.change('reconnecting','声音已经录好，正在重新连接。');
        }finally{this.clear(timer);abort.signal.removeEventListener('abort',cancel);}
        // Pause must settle this delay as well as abort the active request.
        await new Promise(resolve=>{
          let id;const done=()=>{this.clear(id);abort.signal.removeEventListener('abort',done);resolve();};
          id=this.later(done,wait);abort.signal.addEventListener('abort',done,{once:true});
          if(abort.signal.aborted)done();
        });
        if(!current())return;
        }
    }
    finally{if(this.abort===abort)this.abort=null;}
  }
}
