/**
 * audio.js — AudioController
 * Web Audio API synthesizer — zero external assets required.
 * Generates all SFX procedurally: jump, stomp, collect, game-over, BGM.
 */

const AudioController = (() => {
  let ctx = null;       // AudioContext
  let isMuted = false;
  let bgmNode = null;   // BGM oscillator group
  let bgmGain = null;

  // ── BGM note sequence (tropical / calypso feel) ──
  const BGM_NOTES = [
    523.25, 587.33, 659.25, 698.46,   // C D E F
    783.99, 698.46, 659.25, 587.33,   // G F E D
    523.25, 523.25, 587.33, 659.25,   // C C D E
    587.33, 523.25,                    // D C
  ];
  const BGM_TEMPO = 0.22; // seconds per note
  let bgmScheduler = null;
  let bgmNoteIdx = 0;
  let bgmStarted = false;

  /** Lazily create AudioContext on first user interaction */
  function _ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Master gain node */
  function _masterGain(vol = 0.18) {
    const g = ctx.createGain();
    g.gain.value = isMuted ? 0 : vol;
    g.connect(ctx.destination);
    return g;
  }

  // ── SFX generators ──

  /** Jump SFX — rising sine chirp */
  function playJump() {
    if (!_ensureCtx() || isMuted) return;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(680, t + 0.12);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t); osc.stop(t + 0.2);
  }

  /** Double jump SFX — two chirps */
  function playDoubleJump() {
    if (!_ensureCtx() || isMuted) return;
    const t = ctx.currentTime;
    [0, 0.1].forEach(offset => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 + offset * 400, t + offset);
      osc.frequency.linearRampToValueAtTime(900, t + offset + 0.1);
      g.gain.setValueAtTime(0.18, t + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.15);
      osc.start(t + offset); osc.stop(t + offset + 0.18);
    });
  }

  /** Stomp on enemy SFX — thump + squish */
  function playStomp() {
    if (!_ensureCtx() || isMuted) return;
    const t = ctx.currentTime;
    // Low thump
    const osc1 = ctx.createOscillator();
    const g1   = ctx.createGain();
    osc1.connect(g1); g1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(180, t);
    osc1.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    g1.gain.setValueAtTime(0.35, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc1.start(t); osc1.stop(t + 0.22);

    // Squish layer
    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src  = ctx.createBufferSource();
    const g2   = ctx.createGain();
    src.buffer = buf;
    src.connect(g2); g2.connect(ctx.destination);
    g2.gain.value = 0.15;
    src.start(t + 0.04);
  }

  /** Coin collect SFX — bright ding */
  function playCoin() {
    if (!_ensureCtx() || isMuted) return;
    const t = ctx.currentTime;
    [1047, 1319].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0, t + i * 0.06);
      g.gain.linearRampToValueAtTime(0.20, t + i * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.35);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.4);
    });
  }

  /** Chest collect SFX — fanfare */
  function playChest() {
    if (!_ensureCtx() || isMuted) return;
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0, t + i * 0.1);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.35);
    });
  }

  /** Game Over SFX — descending sad tones */
  function playGameOver() {
    if (!_ensureCtx() || isMuted) return;
    const t = ctx.currentTime;
    const notes = [392, 349, 311, 261];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0, t + i * 0.18);
      g.gain.linearRampToValueAtTime(0.18, t + i * 0.18 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.5);
      osc.start(t + i * 0.18);
      osc.stop(t + i * 0.18 + 0.55);
    });
  }

  /** BGM — tropical calypso loop using Web Audio API scheduler */
  function _scheduleBGMNote(time, freq) {
    if (!ctx || isMuted) return;

    // Marimba-like tone: sine + slight detune
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g    = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 1.003; // slight chorus

    const mix = ctx.createGain();
    mix.gain.value = 0.55;
    osc1.connect(mix); osc2.connect(mix);

    mix.connect(g); g.connect(bgmGain || ctx.destination);

    g.gain.setValueAtTime(0.0, time);
    g.gain.linearRampToValueAtTime(0.22, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, time + BGM_TEMPO * 0.85);

    osc1.start(time); osc1.stop(time + BGM_TEMPO);
    osc2.start(time); osc2.stop(time + BGM_TEMPO);

    // Bass note every 4 beats
    if (bgmNoteIdx % 4 === 0) {
      const bass = ctx.createOscillator();
      const bg   = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.value = freq * 0.25;
      bass.connect(bg); bg.connect(bgmGain || ctx.destination);
      bg.gain.setValueAtTime(0.0, time);
      bg.gain.linearRampToValueAtTime(0.28, time + 0.04);
      bg.gain.exponentialRampToValueAtTime(0.001, time + BGM_TEMPO * 1.8);
      bass.start(time); bass.stop(time + BGM_TEMPO * 2);
    }
  }

  function _runBGMScheduler() {
    if (!ctx || !bgmStarted) return;
    const LOOKAHEAD  = 0.15; // seconds
    const INTERVAL   = 80;   // ms

    let nextNoteTime = ctx.currentTime;

    bgmScheduler = setInterval(() => {
      if (!bgmStarted || !bgmGain) return;
      while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
        const freq = BGM_NOTES[bgmNoteIdx % BGM_NOTES.length];
        _scheduleBGMNote(nextNoteTime, freq);
        bgmNoteIdx++;
        nextNoteTime += BGM_TEMPO;
      }
    }, INTERVAL);
  }

  function playBGM() {
    _ensureCtx();
    if (bgmStarted) return;
    bgmGain = ctx.createGain();
    bgmGain.gain.value = isMuted ? 0 : 0.6;
    bgmGain.connect(ctx.destination);
    bgmNoteIdx  = 0;
    bgmStarted  = true;
    _runBGMScheduler();
  }

  function stopBGM() {
    bgmStarted = false;
    if (bgmScheduler) { clearInterval(bgmScheduler); bgmScheduler = null; }
    if (bgmGain) {
      try { bgmGain.gain.value = 0; } catch(e) {}
      bgmGain = null;
    }
  }

  // ── Mute toggle ──
  function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('btn-audio');
    if (btn) {
      btn.textContent = isMuted ? '🔇' : '🔊';
      btn.classList.toggle('muted', isMuted);
    }
    if (bgmGain) bgmGain.gain.value = isMuted ? 0 : 0.6;
    // Persist preference
    try { localStorage.setItem('mbr_muted', isMuted ? '1' : '0'); } catch(e) {}
  }

  function isMutedState() { return isMuted; }

  function init() {
    // Restore mute preference
    try {
      const saved = localStorage.getItem('mbr_muted');
      if (saved === '1') {
        isMuted = true;
        const btn = document.getElementById('btn-audio');
        if (btn) { btn.textContent = '🔇'; btn.classList.add('muted'); }
      }
    } catch(e) {}

    // Bind HUD button
    const btn = document.getElementById('btn-audio');
    if (btn) btn.addEventListener('click', toggleMute);

    // Keyboard shortcut M
    document.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'm') toggleMute();
    });
  }

  return {
    init, toggleMute, isMutedState,
    playBGM, stopBGM,
    playJump, playDoubleJump,
    playStomp, playCoin, playChest, playGameOver,
  };
})();