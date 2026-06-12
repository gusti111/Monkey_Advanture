  /**
 * input.js — Multi-Device Input Handler
 * Maps: Keyboard (SPACE/ArrowUp/ArrowDown/ESC/ENTER) + Touch buttons
 */

const Input = (() => {
  const state = {
    jump:   false,
    duck:   false,
    pause:  false,
    confirm:false,
    // edge triggers (consumed each frame)
    jumpEdge:   false,
    pauseEdge:  false,
    confirmEdge:false,
  };

  /* ── Keyboard ── */
  const KEY_JUMP    = new Set(['Space', 'ArrowUp']);
  const KEY_DUCK    = new Set(['ArrowDown']);
  const KEY_PAUSE   = new Set(['Escape']);
  const KEY_CONFIRM = new Set(['Enter']);

  document.addEventListener('keydown', e => {
    if (KEY_JUMP.has(e.code)) {
      e.preventDefault();
      if (!state.jump) state.jumpEdge = true;
      state.jump = true;
    }
    if (KEY_DUCK.has(e.code)) {
      e.preventDefault();
      state.duck = true;
    }
    if (KEY_PAUSE.has(e.code)) {
      e.preventDefault();
      state.pauseEdge = true;
      state.pause = true;
    }
    if (KEY_CONFIRM.has(e.code)) {
      e.preventDefault();
      state.confirmEdge = true;
      state.confirm = true;
    }
  });

  document.addEventListener('keyup', e => {
    if (KEY_JUMP.has(e.code))    state.jump    = false;
    if (KEY_DUCK.has(e.code))    state.duck    = false;
    if (KEY_PAUSE.has(e.code))   state.pause   = false;
    if (KEY_CONFIRM.has(e.code)) state.confirm = false;
  });

  /* ── Mobile Touch Buttons ── */
  function bindTouchBtn(id, downCb, upCb) {
    const el = document.getElementById(id);
    if (!el) return;
    const down = () => downCb && downCb();
    const up   = () => upCb   && upCb();
    el.addEventListener('touchstart', e => { e.preventDefault(); down(); }, { passive: false });
    el.addEventListener('touchend',   e => { e.preventDefault(); up();   }, { passive: false });
    el.addEventListener('mousedown',  down);
    el.addEventListener('mouseup',    up);
  }

  bindTouchBtn('btn-jump',
    () => { if (!state.jump) state.jumpEdge = true; state.jump = true; },
    () => { state.jump = false; }
  );

  bindTouchBtn('btn-duck',
    () => { state.duck = true; },
    () => { state.duck = false; }
  );

  /* ── Consume edge triggers (call once per frame) ── */
  function consumeJump()    { const v = state.jumpEdge;    state.jumpEdge    = false; return v; }
  function consumePause()   { const v = state.pauseEdge;   state.pauseEdge   = false; return v; }
  function consumeConfirm() { const v = state.confirmEdge; state.confirmEdge = false; return v; }

  function isDucking() { return state.duck; }

  return { consumeJump, consumePause, consumeConfirm, isDucking };
})();