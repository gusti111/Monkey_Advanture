/**
 * audio.js — AudioController
 * Web Audio API synthesizer — zero external assets required.
 * Generates all SFX procedurally: jump, stomp, collect, game-over, BGM.
 *
 * CATATAN INTEGRASI:
 * Modul ini sekarang menjadi satu-satunya AudioController yang dipakai game
 * (sebelumnya main.js punya AudioController tertanam sendiri berbasis file
 * assets/audio/*.mp3 yang meng-shadow modul ini — sudah dihapus dari main.js).
 * Semua fungsi di bawah disesuaikan agar cocok dengan pemanggilan di main.js:
 * playMenuBGM/stopMenuBGM/playBeachBGM/pauseBeachBGM/stopBeachBGM,
 * playSquish/playNormalCoin/playChestCoin, playGameOver/stopGameOver.
 */

const AudioController = (() => {
  let ctx = null;       // AudioContext
  let isMuted = false;

  /** Lazily create AudioContext on first user interaction.
   *  Dibungkus try/catch: di browser dengan autoplay policy ketat (mis. iOS
   *  Safari versi lama) atau kalau window.AudioContext tidak tersedia sama
   *  sekali, konstruksi bisa melempar error. Daripada bikin seluruh game
   *  crash, kita fallback ke "silent mode" — semua fungsi SFX/BGM sudah
   *  mengecek ctx sebelum dipakai, jadi game tetap jalan tanpa suara. */
  function _ensureCtx() {
    if (ctx) {
      if (ctx.state === 'suspended') {
        try { ctx.resume(); } catch (e) {}
      }
      return ctx;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null; // browser tidak dukung Web Audio API sama sekali
      ctx = new Ctor();
      return ctx;
    } catch (e) {
      console.warn('AudioController: gagal membuat AudioContext, fallback ke silent mode.', e);
      return null;
    }
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
    const osc1 = ctx.createOscillator();
    const g1   = ctx.createGain();
    osc1.connect(g1); g1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(180, t);
    osc1.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    g1.gain.setValueAtTime(0.35, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc1.start(t); osc1.stop(t + 0.22);

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

  /** Squish SFX — dipakai khusus saat pisang mengenai musuh (mis. kepiting) */
  function playSquish() {
    if (!_ensureCtx() || isMuted) return;
    const t = ctx.currentTime;

    // Lapisan noise pendek (tekstur "squish")
    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const g   = ctx.createGain();
    src.buffer = buf;
    src.connect(g); g.connect(ctx.destination);
    g.gain.value = 0.22;
    src.start(t);

    // Nada turun pendek biar terasa "squishy", bukan cuma noise
    const osc = ctx.createOscillator();
    const og  = ctx.createGain();
    osc.connect(og); og.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    og.gain.setValueAtTime(0.18, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.start(t); osc.stop(t + 0.15);
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

  // Alias supaya cocok dengan nama yang dipanggil dari main.js
  function playNormalCoin() { playCoin(); }
  function playChestCoin()  { playChest(); }

  /** Game Over SFX — descending sad tones (one-shot, tidak perlu di-stop) */
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

  /** main.js memanggil stopGameOver() saat transisi layar. SFX ini bersifat
   *  one-shot (bukan loop), jadi tidak ada node yang perlu dihentikan —
   *  fungsi ini sengaja no-op supaya tidak error saat dipanggil. */
  function stopGameOver() {}

  /* ════════════════════════════════════════════
     BGM — dua channel independen (Menu & Beach)
  ════════════════════════════════════════════ */
  const BGM_TEMPO = 0.22; // detik per not

  const MENU_NOTES = [
    523.25, 587.33, 659.25, 698.46,
    783.99, 698.46, 659.25, 587.33,
    523.25, 523.25, 587.33, 659.25,
    587.33, 523.25,
  ];
  // Nada & tempo sedikit berbeda supaya BGM gameplay terasa lebih "hidup"
  const BEACH_NOTES = [
    659.25, 698.46, 783.99, 880.00,
    783.99, 698.46, 659.25, 587.33,
    659.25, 783.99, 880.00, 987.77,
    880.00, 783.99,
  ];

  function _createBGMChannel(notes, tempo, baseVol = 0.5) {
    let gain = null;
    let scheduler = null;
    let noteIdx = 0;
    let started = false;

    function _scheduleNote(time, freq) {
      if (!ctx || isMuted || !gain) return;
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
      mix.connect(g); g.connect(gain);

      g.gain.setValueAtTime(0.0, time);
      g.gain.linearRampToValueAtTime(0.22, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, time + tempo * 0.85);

      osc1.start(time); osc1.stop(time + tempo);
      osc2.start(time); osc2.stop(time + tempo);

      if (noteIdx % 4 === 0) {
        const bass = ctx.createOscillator();
        const bg   = ctx.createGain();
        bass.type = 'sine';
        bass.frequency.value = freq * 0.25;
        bass.connect(bg); bg.connect(gain);
        bg.gain.setValueAtTime(0.0, time);
        bg.gain.linearRampToValueAtTime(0.28, time + 0.04);
        bg.gain.exponentialRampToValueAtTime(0.001, time + tempo * 1.8);
        bass.start(time); bass.stop(time + tempo * 2);
      }
    }

    function _runScheduler() {
      const LOOKAHEAD = 0.15; // detik
      const INTERVAL  = 80;   // ms
      let nextNoteTime = ctx.currentTime;

      scheduler = setInterval(() => {
        if (!started || !gain) return;
        while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
          const freq = notes[noteIdx % notes.length];
          _scheduleNote(nextNoteTime, freq);
          noteIdx++;
          nextNoteTime += tempo;
        }
      }, INTERVAL);
    }

    function play() {
      if (!_ensureCtx() || started) return;
      gain = ctx.createGain();
      gain.gain.value = isMuted ? 0 : baseVol;
      gain.connect(ctx.destination);
      noteIdx = 0;
      started = true;
      _runScheduler();
    }

    function pause() {
      started = false;
      if (scheduler) { clearInterval(scheduler); scheduler = null; }
      if (gain) { try { gain.gain.value = 0; } catch (e) {} }
    }

    function stop() {
      pause();
      gain = null;
      noteIdx = 0;
    }

    function setMuted(m) {
      if (gain) gain.gain.value = m ? 0 : baseVol;
    }

    return { play, pause, stop, setMuted };
  }

  const menuBGM  = _createBGMChannel(MENU_NOTES, BGM_TEMPO, 0.5);
  const beachBGM = _createBGMChannel(BEACH_NOTES, BGM_TEMPO * 0.85, 0.5);

  function playMenuBGM()   { beachBGM.pause(); menuBGM.play(); }
  function stopMenuBGM()   { menuBGM.stop(); }
  function playBeachBGM()  { menuBGM.pause(); beachBGM.play(); }
  function pauseBeachBGM() { beachBGM.pause(); }
  function stopBeachBGM()  { beachBGM.stop(); }

  // Alias generik (kompatibilitas ke belakang jika ada kode lain yang memanggil)
  function playBGM()  { playBeachBGM(); }
  function stopBGM()  { stopBeachBGM(); }

  // ── Mute toggle ──
  function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('btn-audio');
    if (btn) {
      btn.textContent = isMuted ? '🔇' : '🔊';
      btn.classList.toggle('muted', isMuted);
    }
    menuBGM.setMuted(isMuted);
    beachBGM.setMuted(isMuted);
    try { localStorage.setItem('mbr_muted', isMuted ? '1' : '0'); } catch (e) {}
  }

  function isMutedState() { return isMuted; }

  function init() {
    try {
      const saved = window.localStorage ? window.localStorage.getItem('mbr_muted') : null;
      if (saved === '1') {
        isMuted = true;
        const btn = document.getElementById('btn-audio');
        if (btn) { btn.textContent = '🔇'; btn.classList.add('muted'); }
      }
    } catch (e) {}

    const btn = document.getElementById('btn-audio');
    if (btn) btn.addEventListener('click', toggleMute);

    document.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'm') toggleMute();
    });
  }

  return {
    init, toggleMute, isMutedState,
    playBGM, stopBGM,
    playMenuBGM, stopMenuBGM, playBeachBGM, pauseBeachBGM, stopBeachBGM,
    playJump, playDoubleJump,
    playStomp, playSquish,
    playCoin, playChest, playNormalCoin, playChestCoin,
    playGameOver, stopGameOver,
  };
})();