(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AtlasSoundCore = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const defaults = Object.freeze({ music: false, buttons: false, workshop: false, musicVolume: .32, effectsVolume: .45 });
  const clamp = (x, fallback) => typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : fallback;
  function sanitize(value) {
    const v = value && typeof value === 'object' ? value : {};
    return { ...Object.fromEntries(['music', 'buttons', 'workshop'].map(k => [k, typeof v[k] === 'boolean' ? v[k] : defaults[k]])), musicVolume: clamp(v.musicVolume, defaults.musicVolume), effectsVolume: clamp(v.effectsVolume, defaults.effectsVolume) };
  }
  // Original, deliberately sparse eight-bar composition: "Departure Lounge", 80 BPM.
  const score = Object.freeze([
    { chord: [50, 57, 62, 66], melody: [74, null, 69, null] },
    { chord: [47, 54, 59, 62], melody: [73, null, 69, 66] },
    { chord: [43, 50, 57, 62], melody: [71, null, 74, null] },
    { chord: [45, 52, 59, 64], melody: [69, null, 76, 73] },
    { chord: [50, 57, 61, 66], melody: [74, null, 78, null] },
    { chord: [47, 54, 62, 66], melody: [76, null, 73, 69] },
    { chord: [43, 50, 59, 62], melody: [71, null, 69, null] },
    { chord: [45, 52, 57, 61], melody: [73, null, 69, null] }
  ]);
  const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);
  class Engine {
    constructor(options = {}) {
      this.options = options; this.prefs = sanitize(options.preferences); this.context = null;
      this.active = false; this.wantsPlay = false; this.reason = 'Sound starts when you choose Play or enable a sound.';
      this.nodes = new Set(); this.timer = null; this.step = 0; this.nextBeat = 0; this.activation = 0;
      this.lastCue = new Map(); this.onChange = options.onChange || (() => {});
      this.repeat = options.setInterval || ((f, n) => setInterval(f, n));
      this.cancel = options.clearInterval || (id => clearInterval(id));
    }
    makeContext() {
      if (this.context) return;
      if (!this.options.AudioContext) throw new Error('Web Audio is not supported by this browser.');
      const ctx = new this.options.AudioContext(); this.context = ctx;
      this.master = ctx.createGain(); this.master.gain.value = .7;
      this.musicBus = ctx.createGain(); this.buttonBus = ctx.createGain(); this.workshopBus = ctx.createGain();
      for (const bus of [this.musicBus, this.buttonBus, this.workshopBus]) { bus.gain.value = 0; bus.connect(this.master); }
      const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -16; limiter.knee.value = 12; limiter.ratio.value = 4; limiter.attack.value = .01; limiter.release.value = .2;
      this.master.connect(limiter); limiter.connect(ctx.destination);
      ctx.onstatechange = () => { if (this.active && ctx.state !== 'running') this.pause('Playback interrupted. Choose Play to resume.'); };
    }
    enabled(channel) { return this.prefs[channel] && !(channel === 'workshop' && this.options.workshopEnabled === false); }
    anyEnabled() { return ['music', 'buttons', 'workshop'].some(k => this.enabled(k)); }
    async activate() {
      if (!this.anyEnabled()) return false;
      this.wantsPlay = true; const attempt = ++this.activation;
      this.makeContext(); await this.context.resume();
      if (attempt !== this.activation || this.options.isHidden?.() || this.context.state !== 'running') { if ((!this.wantsPlay || this.options.isHidden?.()) && this.context.state === 'running') await this.context.suspend(); return false; }
      this.active = true; this.reason = ''; this.updateBuses(); this.syncMusic(); this.onChange(); return true;
    }
    setPreferences(value) {
      this.prefs = sanitize(value); this.updateBuses();
      if (!this.prefs.music) this.stopChannel('music');
      if (!this.prefs.buttons) this.stopChannel('buttons');
      if (!this.prefs.workshop) this.stopChannel('workshop');
      if (!this.anyEnabled()) this.pause('All sounds are off.');
      else { this.syncMusic(); this.onChange(); }
    }
    updateBuses() {
      if (!this.context) return;
      for (const [name, bus, volume] of [['music', this.musicBus, this.prefs.musicVolume], ['buttons', this.buttonBus, this.prefs.effectsVolume], ['workshop', this.workshopBus, this.prefs.effectsVolume]]) {
        const at = this.context.currentTime; bus.gain.cancelScheduledValues(at);
        bus.gain.setTargetAtTime(this.active && this.enabled(name) ? volume : 0, at, .018);
      }
    }
    track(source, gain, channel, extra) {
      const item = { source, gain, channel, extra }; this.nodes.add(item);
      source.onended = () => { this.nodes.delete(item); try { source.disconnect(); gain.disconnect(); extra?.disconnect(); } catch {} };
      return item;
    }
    tone(hz, at, duration, volume, channel, type = 'sine', attack = .008, release = .06) {
      if (this.nodes.size >= 72) return;
      const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(hz, at);
      gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + attack);
      gain.gain.setValueAtTime(volume, at + Math.max(attack, duration - release)); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      osc.connect(gain); gain.connect(channel === 'music' ? this.musicBus : channel === 'buttons' ? this.buttonBus : this.workshopBus);
      this.track(osc, gain, channel); osc.start(at); osc.stop(at + duration + .02);
    }
    noise(at, duration, band, volume) {
      if (this.nodes.size >= 72) return;
      const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), samples = buffer.getChannelData(0); let seed = 7181;
      for (let i = 0; i < samples.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; samples[i] = seed / 2147483648 - 1; }
      source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = band; filter.Q.value = .8;
      gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + .012); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      source.connect(filter); filter.connect(gain); gain.connect(this.workshopBus); this.track(source, gain, 'workshop', filter);
      source.start(at); source.stop(at + duration + .02);
    }
    play(cue = 'tap', channel = 'workshop') {
      if (!this.active || !this.context || this.context.state !== 'running' || !this.enabled(channel) || this.options.isHidden?.()) return false;
      const at = this.context.currentTime, previous = this.lastCue.get(cue);
      if (previous !== undefined && at - previous < .065) return false;
      this.lastCue.set(cue, at);
      if (channel === 'buttons') { this.tone(640, at, .045, .075, 'buttons'); return true; }
      switch (cue) {
        case 'material': this.tone(740, at, .09, .07, channel, 'triangle'); this.tone(1109, at + .035, .11, .035, channel); break;
        case 'inside': case 'zip': this.noise(at, .19, 1700, .09); this.tone(370, at + .04, .1, .035, channel); break;
        case 'exploded': case 'repair': [0, .045, .09].forEach((t, i) => this.tone(420 + i * 160, at + t, .06, .08, channel, 'triangle')); break;
        case 'orbit': case 'zoom': this.noise(at, .09, 650, .055); break;
        case 'wet': this.noise(at, .13, 950, .065); break;
        case 'size': this.tone(196, at, .14, .09, channel, 'triangle'); this.tone(294, at + .045, .14, .05, channel); break;
        case 'export': [74, 78, 81].forEach((m, i) => this.tone(frequency(m), at + i * .08, .28, .065, channel)); break;
        default: this.tone(523.25, at, .07, .07, channel, 'triangle');
      }
      return true;
    }
    tick() {
      if (!this.active || !this.prefs.music || this.context.state !== 'running') return;
      const now = this.context.currentTime;
      if (this.nextBeat < now - .2) this.nextBeat = now + .04;
      while (this.nextBeat < now + .22) {
        const chord = score[Math.floor(this.step / 4) % score.length], beat = this.step % 4, at = this.nextBeat;
        if (beat === 0) chord.chord.forEach(m => this.tone(frequency(m), at, 3.8, .027, 'music', 'sine', .5, .9));
        if (chord.melody[beat] !== null) this.tone(frequency(chord.melody[beat]), at + .03, 1.2, .027, 'music', 'sine', .02, .8);
        this.step = (this.step + 1) % 32; this.nextBeat += .75;
      }
    }
    syncMusic() {
      if (!this.active || !this.prefs.music) { if (this.timer !== null) this.cancel(this.timer); this.timer = null; return; }
      if (this.timer !== null) return;
      this.nextBeat = this.context.currentTime + .04; this.tick(); this.timer = this.repeat(() => this.tick(), 100);
    }
    stopChannel(channel) {
      if (channel === 'music' && this.timer !== null) { this.cancel(this.timer); this.timer = null; }
      for (const item of [...this.nodes]) if (item.channel === channel) {
        try { item.source.stop(); item.source.disconnect(); item.gain.disconnect(); item.extra?.disconnect(); } catch {}
        this.nodes.delete(item);
      }
    }
    pause(reason = 'Sound paused. Choose Play to resume.') {
      ++this.activation; this.wantsPlay = false; this.active = false; this.reason = reason; this.updateBuses();
      for (const channel of ['music', 'buttons', 'workshop']) this.stopChannel(channel);
      if (this.context?.state === 'running') this.context.suspend().catch(() => {});
      this.onChange();
    }
    destroy() { this.pause(); if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {}); }
  }
  return Object.freeze({ defaults, sanitize, score, frequency, Engine });
});
