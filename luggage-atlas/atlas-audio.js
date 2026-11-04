(function () {
  'use strict';
  const Core = window.AtlasSoundCore;
  if (!Core) return;
  const key = 'luggage-atlas-sound-v1', workshop = document.body.dataset.soundScene === 'workshop';
  let preferences = Core.sanitize(null), pending = false;
  try { preferences = Core.sanitize(JSON.parse(localStorage.getItem(key) || 'null')); } catch {}
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>';
  const container = document.createElement('section'); container.className = 'atlas-sound'; container.setAttribute('aria-label', 'Sound controls');
  const switches = [['music', 'Music'], ['buttons', 'Button sounds'], ...(workshop ? [['workshop', 'Workshop effects']] : [])];
  container.innerHTML = `<button type="button" id="atlas-sound-toggle" class="sound-toggle" aria-expanded="false" aria-controls="atlas-sound-panel">${icon}<span>Sound</span><i aria-hidden="true"></i></button><div id="atlas-sound-panel" class="sound-panel" hidden><div class="sound-heading"><h2>Sound</h2><button type="button" id="atlas-sound-close" aria-label="Close sound settings">×</button></div><p class="sound-description">A little atmosphere for your journey.</p>${switches.map(([id, label]) => `<label class="sound-switch"><span>${label}</span><span class="sound-switch-control"><output id="sound-${id}-label">Off</output><input type="checkbox" role="switch" id="sound-${id}" aria-label="${label}"><span class="sound-switch-track" aria-hidden="true"></span></span></label>`).join('')}<div class="sound-volume"><label for="sound-music-volume">Music volume <output id="sound-music-volume-label"></output></label><input type="range" id="sound-music-volume" min="0" max="100" step="1"><label for="sound-effects-volume">Effects volume <output id="sound-effects-volume-label"></output></label><input type="range" id="sound-effects-volume" min="0" max="100" step="1"></div><button type="button" id="atlas-sound-play" class="sound-play">Play sound</button><p id="atlas-sound-status" role="status" aria-live="polite"></p><small>Original ambient music${workshop ? ' · workshop cues are interface feedback' : ''}.</small></div>`;
  document.body.append(container);
  const $ = id => document.getElementById(id), panel = $('atlas-sound-panel');
  const engine = new Core.Engine({ AudioContext: window.AudioContext || window.webkitAudioContext, preferences, workshopEnabled: workshop, isHidden: () => document.hidden, onChange: paint });
  function persist() { try { localStorage.setItem(key, JSON.stringify(engine.prefs)); } catch {} }
  function paint() {
    const p = engine.prefs;
    for (const [id] of switches) { $('sound-' + id).checked = p[id]; $('sound-' + id + '-label').textContent = p[id] ? 'On' : 'Off'; }
    for (const kind of ['music', 'effects']) { const value = Math.round(p[kind + 'Volume'] * 100); $('sound-' + kind + '-volume').value = value; $('sound-' + kind + '-volume-label').textContent = value + '%'; }
    $('atlas-sound-toggle').classList.toggle('is-playing', engine.active);
    $('atlas-sound-toggle').setAttribute('aria-label', engine.active ? 'Sound settings, sound is on' : 'Sound settings, sound is paused or off');
    $('atlas-sound-play').textContent = pending ? 'Starting…' : engine.active ? 'Pause all sound' : 'Play selected sounds';
    $('atlas-sound-play').disabled = pending || !(p.music || p.buttons || (workshop && p.workshop));
    $('atlas-sound-status').textContent = engine.active ? (p.music ? 'Departure Lounge · original ambient music playing.' : 'Sound effects enabled. Music is off.') : engine.reason || 'Choose Play to start your saved sound settings.';
  }
  function showPanel(open, restoreFocus = false) {
    panel.hidden = !open; $('atlas-sound-toggle').setAttribute('aria-expanded', String(open));
    if (open) $('sound-music').focus(); else if (restoreFocus) $('atlas-sound-toggle').focus();
  }
  async function start() {
    pending = true; paint();
    try { const ok = await engine.activate(); if (!ok && !document.hidden) engine.reason = 'Sound is paused. Choose Play to try again.'; }
    catch { engine.pause('Sound could not start in this browser. Choose Play to try again.'); }
    finally { pending = false; paint(); }
  }
  $('atlas-sound-toggle').onclick = () => showPanel(panel.hidden);
  $('atlas-sound-close').onclick = () => showPanel(false, true);
  $('atlas-sound-play').onclick = () => engine.active ? engine.pause() : start();
  for (const [id] of switches) $('sound-' + id).onchange = async e => {
    engine.setPreferences({ ...engine.prefs, [id]: e.target.checked }); persist();
    if (e.target.checked && !engine.active) await start();
    if (e.target.checked && id !== 'music') engine.play(id === 'workshop' ? 'material' : 'tap', id);
  };
  for (const kind of ['music', 'effects']) $('sound-' + kind + '-volume').oninput = e => {
    engine.setPreferences({ ...engine.prefs, [kind + 'Volume']: Number(e.target.value) / 100 }); persist();
  };
  function cueFor(target, change) {
    if (!workshop) return null;
    const data = target.dataset || {}, id = target.id;
    if (data.color || data.trim) return 'material';
    if (data.view || data.inspectView) return data.view || data.inspectView;
    if (data.orbit) return 'orbit'; if (data.zoom) return 'zoom';
    if (change) return ({ frontAccess: 'zip', repairable: 'repair', wetPocket: 'wet', format: 'size', interior: 'inside' })[id] || null;
    if (id === 'reset-view' || id === 'reset-config' || id === 'recommend') return 'exterior';
    return null;
  }
  function feedback(target, change) {
    const cue = cueFor(target, change);
    if (cue && engine.prefs.workshop) engine.play(cue, 'workshop');
    else engine.play('tap', 'buttons');
  }
  document.addEventListener('click', e => {
    if (!container.contains(e.target) && !panel.hidden) showPanel(false);
    if (!e.isTrusted || container.contains(e.target)) return;
    const target = e.target.closest('button, a, summary, input[type="button"], input[type="submit"]');
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    feedback(target, false);
  }, true);
  document.addEventListener('change', e => {
    if (!e.isTrusted || container.contains(e.target) || e.target.disabled || !e.target.matches('select, input[type="checkbox"], input[type="radio"]')) return;
    feedback(e.target, true);
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) showPanel(false, true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) engine.pause('Paused while this tab is in the background. Choose Play to resume.'); });
  document.addEventListener('play', e => { if (e.target.matches?.('video, audio')) engine.pause('Paused for media playback. Choose Play when you are ready.'); }, true);
  window.addEventListener('pagehide', () => engine.pause('Playback paused. Choose Play to resume.'));
  window.addEventListener('storage', e => { if (e.key === key) { let prefs; try { prefs = JSON.parse(e.newValue); } catch {} engine.pause('Sound settings changed in another tab. Choose Play to resume.'); engine.setPreferences(prefs); } });
  window.AtlasAudio = Object.freeze({ play: cue => engine.play(cue, 'workshop') });
  paint();
})();
