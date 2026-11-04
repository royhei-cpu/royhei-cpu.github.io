const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const Core = require('./atlas-audio-core.js');
const contexts = [];
class Param {
  constructor() { this.value = 0; this.events = []; }
  setValueAtTime(v, t) { assert(Number.isFinite(v) && Number.isFinite(t)); this.value = v; this.events.push([v, t]); }
  exponentialRampToValueAtTime(v, t) { assert(v > 0); this.setValueAtTime(v, t); }
  cancelScheduledValues() {}
  setTargetAtTime(v, t) { this.setValueAtTime(v, t); }
}
class Node {
  constructor(ctx, source = false) { this.ctx = ctx; this.connections = []; this.gain = new Param(); this.frequency = new Param(); this.Q = new Param(); if (source) ctx.sources.push(this); }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; }
  start(at) { this.startAt = at; }
  stop(at) { this.stopAt = at ?? this.ctx.currentTime; if (at === undefined) this.onended?.(); }
}
class Context {
  constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 22050; this.destination = {}; this.sources = []; contexts.push(this); }
  createGain() { return new Node(this); }
  createOscillator() { return new Node(this, true); }
  createBufferSource() { return new Node(this, true); }
  createBiquadFilter() { return new Node(this); }
  createBuffer(channels, length) { assert(length < 10000); return { getChannelData: () => new Float32Array(length) }; }
  createDynamicsCompressor() { const n = new Node(this); for (const p of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[p] = new Param(); return n; }
  async resume() { this.state = 'running'; this.onstatechange?.(); }
  async suspend() { this.state = 'suspended'; this.onstatechange?.(); }
  async close() { this.state = 'closed'; }
  advance(time) { this.currentTime = time; for (const source of this.sources) if (!source.ended && source.stopAt <= time) { source.ended = true; source.onended?.(); } }
}
async function testCore() {
  const prefs = Core.sanitize({ music: 'yes', buttons: true, musicVolume: -5, effectsVolume: Infinity });
  assert.equal(prefs.music, false); assert.equal(prefs.buttons, true); assert.equal(prefs.musicVolume, 0); assert.equal(prefs.effectsVolume, .45);
  const tasks = new Map(); let taskId = 0, hidden = false;
  const e = new Core.Engine({ AudioContext: Context, preferences: { music: true }, isHidden: () => hidden, setInterval: f => { tasks.set(++taskId, f); return taskId; }, clearInterval: id => tasks.delete(id) });
  assert.equal(contexts.length, 0); assert.equal(e.play('export'), false);
  assert.equal(await e.activate(), true); assert.equal(contexts.length, 1); assert.equal(tasks.size, 1);
  const ctx = e.context; let maxLive = 0;
  for (let i = 0; i < 490; i++) { ctx.advance(i / 10); for (const f of [...tasks.values()]) f(); maxLive = Math.max(maxLive, e.nodes.size); }
  assert(ctx.sources.length > 100, 'Composition continues through two complete eight-bar cycles');
  assert(maxLive < 24, 'Ended music voices are released');
  for (const source of ctx.sources) { assert(source.startAt >= 0); assert(source.stopAt > source.startAt); if (source.frequency.events.length) assert(source.frequency.events.every(([hz]) => hz > 20 && hz < 5000)); }
  const count = ctx.sources.length; assert.equal(e.play('inside'), false); assert.equal(e.play('tap', 'buttons'), false); assert.equal(ctx.sources.length, count);
  e.setPreferences({ ...e.prefs, buttons: true, workshop: false }); assert.equal(e.play('tap', 'buttons'), true); assert.equal(e.play('material'), false);
  e.setPreferences({ ...e.prefs, workshop: true });
  for (const cue of ['material', 'inside', 'zip', 'exploded', 'repair', 'orbit', 'zoom', 'wet', 'size', 'export', 'exterior']) { ctx.advance(ctx.currentTime + .3); assert.equal(e.play(cue), true, cue); }
  assert.equal(e.play('exterior'), false, 'Rapid duplicate cue is throttled');
  e.setPreferences({ ...e.prefs, workshop: false }); assert.equal(e.workshopBus.gain.value, 0); assert(![...e.nodes].some(n => n.channel === 'workshop'));
  e.setPreferences({ ...e.prefs, music: false }); assert.equal(tasks.size, 0); assert(![...e.nodes].some(n => n.channel === 'music')); assert(e.active);
  e.setPreferences({ ...e.prefs, buttons: false }); assert.equal(e.active, false); assert.equal(ctx.state, 'suspended'); assert.equal(e.nodes.size, 0);
  e.setPreferences({ music: true }); hidden = true; assert.equal(await e.activate(), false); assert.equal(ctx.state, 'suspended'); assert.equal(tasks.size, 0);
  hidden = false; await e.activate(); e.pause('Background tab'); assert.equal(e.active, false); assert.equal(tasks.size, 0); assert.equal(e.play('inside'), false);
  await e.activate(); ctx.state = 'suspended'; ctx.onstatechange(); assert(!e.active); assert.equal(tasks.size, 0);
  const directory = new Core.Engine({ AudioContext: Context, preferences: { workshop: true }, workshopEnabled: false }); assert.equal(await directory.activate(), false); assert.equal(directory.context, null);
  directory.setPreferences({ buttons: true, workshop: true }); await directory.activate(); assert.equal(directory.play('zip'), false); directory.setPreferences({ buttons: false, workshop: true }); assert.equal(directory.active, false);
  class Delayed extends Context { resume() { return new Promise(resolve => { this.finish = () => { this.state = 'running'; resolve(); }; }); } }
  const delayed = new Core.Engine({ AudioContext: Delayed, preferences: { music: true } }); const activation = delayed.activate(); delayed.pause(); delayed.context.finish(); assert.equal(await activation, false); assert.equal(delayed.context.state, 'suspended'); assert.equal(delayed.nodes.size, 0);
  class Rejected extends Context { async resume() { throw Error('Playback rejected'); } }
  const rejected = new Core.Engine({ AudioContext: Rejected, preferences: { music: true } }); await assert.rejects(() => rejected.activate()); assert(!rejected.active); assert.equal(rejected.nodes.size, 0);
  const unsupported = new Core.Engine({ preferences: { music: true } }); await assert.rejects(() => unsupported.activate());
  e.destroy(); directory.destroy(); delayed.destroy(); rejected.destroy(); assert.equal(ctx.state, 'closed');
}
async function testUI(scene = 'workshop') {
  const elements = new Map(), listeners = new Map(), windowListeners = new Map(), storage = new Map(); let root;
  const el = id => { if (!elements.has(id)) elements.set(id, { id, dataset: {}, hidden: id === 'atlas-sound-panel', checked: false, value: '', classList: { toggle() {} }, focus() { this.focused = true; }, setAttribute(k, v) { this[k] = v; }, getAttribute(k) { return this[k] || null; } }); return elements.get(id); };
  const document = { hidden: false, body: { dataset: { soundScene: scene }, append(node) { root = node; } }, getElementById: el, createElement() { return { setAttribute() {}, contains: target => Boolean(target?.inSound) }; }, addEventListener(name, f) { listeners.set(name, f); } };
  const window = { AtlasSoundCore: Core, AudioContext: Context, addEventListener: (n, f) => windowListeners.set(n, f) };
  const uiContext = { window, document, localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) }, console };
  vm.createContext(uiContext); const before = contexts.length;
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'atlas-audio.js'), 'utf8'), uiContext);
  assert.equal(contexts.length, before); assert(root.innerHTML.includes('Workshop effects') === (scene === 'workshop'));
  assert.equal(el('atlas-sound-play').disabled, true); el('atlas-sound-toggle').onclick(); assert.equal(el('atlas-sound-panel').hidden, false); assert(el('sound-music').focused);
  listeners.get('keydown')({ key: 'Escape' }); assert(el('atlas-sound-panel').hidden); assert(el('atlas-sound-toggle').focused);
  await el('sound-buttons').onchange({ target: { checked: true } }); assert.equal(contexts.length, before + 1); assert.equal(el('sound-buttons').checked, true); assert(el('atlas-sound-status').textContent.includes('effects enabled'));
  const ctx = contexts.at(-1); const button = { id: 'ordinary', dataset: {}, closest() { return this; }, getAttribute() { return null; } };
  ctx.advance(1); const count = ctx.sources.length; listeners.get('click')({ isTrusted: true, target: button }); assert.equal(ctx.sources.length, count + 1);
  listeners.get('click')({ isTrusted: false, target: button }); assert.equal(ctx.sources.length, count + 1, 'Programmatic clicks do not produce duplicate feedback');
  if (scene === 'workshop') { await el('sound-workshop').onchange({ target: { checked: true } }); ctx.advance(2); const change = { id: 'frontAccess', dataset: {}, matches() { return true; } }; const beforeZip = ctx.sources.length; listeners.get('change')({ isTrusted: true, target: change }); assert(ctx.sources.length >= beforeZip + 2); }
  el('sound-effects-volume').oninput({ target: { value: '0' } }); assert.equal(JSON.parse(storage.get('luggage-atlas-sound-v1')).effectsVolume, 0);
  document.hidden = true; listeners.get('visibilitychange')(); assert.equal(ctx.state, 'suspended'); document.hidden = false; assert.equal(ctx.state, 'suspended', 'Returning does not auto-resume');
  await el('atlas-sound-play').onclick(); assert.equal(ctx.state, 'running'); listeners.get('play')({ target: { matches: () => true } }); assert.equal(ctx.state, 'suspended'); assert(el('atlas-sound-status').textContent.includes('media playback'));
  await el('atlas-sound-play').onclick(); windowListeners.get('pagehide')(); assert.equal(ctx.state, 'suspended');
  windowListeners.get('storage')({ key: 'luggage-atlas-sound-v1', newValue: '{bad json' }); assert(!el('sound-music').checked); assert.equal(el('atlas-sound-play').disabled, true);
}
(async () => { await testCore(); await testUI(); await testUI('directory'); console.log('PASS: audio opt-in/no autoplay; 48s original score scheduling and voice cleanup; independent button/workshop channels; volume, mute, races, interruption, hidden-tab/media pauses; accessible sound-panel controls and delegated feedback. Audio device/browser listening not performed.'); })().catch(e => { console.error(e); process.exitCode = 1; });
