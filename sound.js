'use strict';

// Synthesized sound effects (Web Audio API) so no audio files are needed.
const Sound = (() => {
  const STORE_KEY = 'bjtrainer.sound.v2';
  const OLD_KEY = 'bjtrainer.sound.v1'; // on/off boolean before the volume slider
  let volume = 1;   // 0–1; 0 is muted
  let restore = 1;  // volume to return to when unmuting
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && typeof saved.volume === 'number') {
      volume = Math.min(1, Math.max(0, saved.volume));
      if (typeof saved.restore === 'number' && saved.restore > 0) restore = saved.restore;
    } else if (JSON.parse(localStorage.getItem(OLD_KEY)) === false) {
      volume = 0;
    }
  } catch (e) { /* ignore */ }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ volume, restore })); } catch (e) { /* ignore */ }
  }
  // Squared so the slider feels roughly linear in loudness; full volume matches the old fixed 0.5.
  const masterGain = () => 0.5 * volume * volume;

  let ctx = null;
  let master = null;
  let noiseBuffer = null;

  // Created lazily: browsers only allow audio after a user gesture.
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = masterGain();
      master.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function envelope(start, dur, peak) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    g.connect(master);
    return g;
  }

  function tone(freq, dur, { type = 'sine', gain = 0.25, when = 0, slideTo = null } = {}) {
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    osc.connect(envelope(start, dur, gain));
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function noise(dur, { filterFreq = 3000, q = 1, gain = 0.3, when = 0 } = {}) {
    const start = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    src.connect(filter);
    filter.connect(envelope(start, dur, gain));
    src.start(start, Math.random() * 0.5);
    src.stop(start + dur + 0.02);
  }

  const notes = (freqs, step, opts) => freqs.forEach((f, i) => tone(f, step * 1.8, { ...opts, when: (opts.when || 0) + i * step }));

  const SOUNDS = {
    card: (w) => noise(0.07, { filterFreq: 2500, q: 0.8, gain: 0.35, when: w }),
    flip: (w) => { noise(0.03, { filterFreq: 4000, gain: 0.3, when: w }); noise(0.04, { filterFreq: 2000, gain: 0.3, when: w + 0.06 }); },
    chip: (w) => { noise(0.03, { filterFreq: 6000, q: 2, gain: 0.3, when: w }); tone(2500, 0.05, { type: 'triangle', gain: 0.12, when: w }); },
    correct: (w) => notes([659, 880], 0.08, { type: 'sine', gain: 0.2, when: w }),
    wrong: (w) => tone(220, 0.28, { type: 'square', gain: 0.08, slideTo: 140, when: w }),
    win: (w) => notes([523, 659, 784], 0.09, { type: 'triangle', gain: 0.22, when: w }),
    blackjack: (w) => notes([523, 659, 784, 1047], 0.1, { type: 'triangle', gain: 0.25, when: w }),
    lose: (w) => notes([392, 311], 0.16, { type: 'sine', gain: 0.2, when: w }),
    push: (w) => tone(494, 0.3, { type: 'sine', gain: 0.18, when: w }),
    shuffle: (w) => { for (let i = 0; i < 6; i++) noise(0.05, { filterFreq: 2000 + i * 300, gain: 0.2, when: w + i * 0.06 }); },
  };

  return {
    // when: seconds from now to start the sound
    play(name, when = 0) {
      if (!volume || !SOUNDS[name]) return;
      try {
        if (!audio()) return;
        SOUNDS[name](when);
      } catch (e) { /* never let audio break the game */ }
    },
    get volume() { return volume; },
    set volume(v) {
      volume = Math.min(1, Math.max(0, Number(v) || 0));
      if (volume) restore = volume;
      if (master) master.gain.setTargetAtTime(masterGain(), ctx.currentTime, 0.01);
      save();
    },
    toggleMute() { this.volume = volume ? 0 : restore; },
  };
})();
