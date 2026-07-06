/**
 * main.js — Monkey Beach Adventure HD
 *
 * This is the main entry point of the game. Its sole responsibility
 * is to initialize the GameManager, which then orchestrates all other
 * systems and manages the game's lifecycle.
 */

(() => {
  /* ════════════════════════════════════════════
     CANVAS & CONTEXT
  ════════════════════════════════════════════ */
  const canvas = document.getElementById('game-canvas');

  function resizeCanvas() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
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
  resizeCanvas();

  // Initialize the game
  GameManager.init();
})();