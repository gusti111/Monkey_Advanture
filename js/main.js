/**
 * main.js — Monkey Beach Adventure HD
 *
 * This is the main entry point of the game. Its sole responsibility
 * is to initialize the GameManager, which then orchestrates all other
 * systems and manages the game's lifecycle.
 */

(() => {
  /* ════════════════════════════════════════════
     REAL VIEWPORT HEIGHT (--vh custom property)
     Mobile browsers' `100vh` includes the address bar even when it's
     currently hidden, which made #app-rotate/.screen taller than what's
     actually visible and let the page scroll, exposing decorations that
     should sit flush at the screen edge. The CSS `dvh` unit was tried as
     a fix but some mobile browsers compute it inconsistently (too small,
     cutting off content). Measuring window.innerHeight in JS and writing
     it to a CSS variable is the more reliable, well-tested approach —
     style.css uses `calc(var(--vh, 1vh) * 100)` wherever it previously
     used 100vh.
  ════════════════════════════════════════════ */
  function setViewportHeightVar() {
    document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
  }
  setViewportHeightVar();
  window.addEventListener('resize', setViewportHeightVar);

  /* ════════════════════════════════════════════
     CANVAS & CONTEXT
  ════════════════════════════════════════════ */
  const canvas = document.getElementById('game-canvas');
  // #app-rotate is the force-landscape wrapper (see style.css). On portrait
  // phones it's rotated 90° via CSS and its *layout* box (clientWidth/Height,
  // which CSS transforms do NOT affect) already reports the correct
  // logical landscape-shaped space — so we measure it instead of
  // window.innerWidth/innerHeight, which would still report the raw
  // (unrotated) physical viewport and produce a tiny letterboxed canvas.
  const appRoot = document.getElementById('app-rotate') || document.body;

  function resizeCanvas() {
    const vw = appRoot.clientWidth;
    const vh = appRoot.clientHeight;
    const aspect = Config.W_INT / Config.H_INT;
    let cw, ch; // Declare cw and ch
    if (vw / vh > aspect) { ch = vh; cw = ch * aspect; }
    else { cw = vw; ch = cw / aspect; }
    canvas.width = Config.W_INT;
    canvas.height = Config.H_INT;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.style.left = ((vw - cw) / 2) + 'px';
    canvas.style.top = ((vh - ch) / 2) + 'px';
    canvas.style.position = 'absolute';
  }

  window.addEventListener('resize', resizeCanvas);
  // orientationchange fires when the device is physically rotated; some
  // mobile browsers report stale innerWidth/Height for a brief moment right
  // after it fires, so we re-measure on the next frame as well.
  window.addEventListener('orientationchange', () => {
    setViewportHeightVar();
    resizeCanvas();
    requestAnimationFrame(() => { setViewportHeightVar(); resizeCanvas(); });
    setTimeout(() => { setViewportHeightVar(); resizeCanvas(); }, 250);
  });
  resizeCanvas();

  /* ════════════════════════════════════════════
     FULLSCREEN + REAL ORIENTATION LOCK
     Progressive enhancement on top of the CSS force-landscape trick:
     browsers that support the Fullscreen API + Screen Orientation API
     (mostly Android Chrome) get a proper native fullscreen landscape lock.
     Browsers that don't (notably iOS Safari) simply keep relying on the
     CSS rotation above — nothing breaks either way since every call here
     is wrapped in try/catch and only attempted, never required.
  ════════════════════════════════════════════ */
  async function requestFullscreenAndLockLandscape() {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' }).catch(() => { });
      }
    } catch (e) { /* fullscreen refused/unsupported — ignore */ }
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape').catch(() => { });
      }
    } catch (e) { /* orientation lock unsupported (e.g. iOS Safari) — ignore */ }
  }

  // Fullscreen/orientation APIs only work inside a user gesture, so we hook
  // this to the very first tap/click anywhere and only run it once.
  function armFullscreenOnFirstGesture() {
    const handler = () => {
      requestFullscreenAndLockLandscape();
      document.removeEventListener('click', handler);
      document.removeEventListener('touchend', handler);
    };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('touchend', handler, { once: true });
  }
  armFullscreenOnFirstGesture();

  // Initialize the game
  GameManager.init();
})();