  /**
 * player.js — Monkey Player Entity
 * States: IDLE | RUN | JUMP | DUCK | STOMP
 * Drawn procedurally via Canvas 2D API (HD vector style)
 */

const Player = (() => {
  // ── Colours (HD tropical monkey palette) ──
  const C = {
    body:    '#8B4513',
    bodyHi:  '#A0522D',
    belly:   '#DEB887',
    face:    '#DEB887',
    ear:     '#A0522D',
    earIn:   '#CD853F',
    eye:     '#1A1A2E',
    eyeHi:   '#FFFFFF',
    nose:    '#4A2810',
    mouth:   '#4A2810',
    tail:    '#8B4513',
    feet:    '#4A2810',
    shadow:  'rgba(0,0,0,0.15)',
  };

  let state = {};

  function create(x, groundY, scale = 1) {
    const baseH = 96 * scale;
    const baseW = 72 * scale;
    return {
      x, y: groundY - baseH,
      w: baseW, h: baseH, baseH,
      vy: 0, onGround: true, jumpsLeft: 2,
      isDucking: false,

      // animation
      animState: 'IDLE',
      animFrame: 0,
      animTimer: 0,
      stompFlash: 0,  // countdown frames after stomp

      scale,
      score: 0,
    };
  }

  /** Call every frame to update animation timers */
  function updateAnim(p, dt) {
    p.animTimer += dt;

    if (!p.onGround) {
      p.animState = 'JUMP';
    } else if (p.isDucking) {
      p.animState = 'DUCK';
    } else {
      p.animState = 'RUN';
    }

    if (p.stompFlash > 0) {
      p.stompFlash -= dt;
      p.animState = 'STOMP';
    }

    // Cycle run frames ~12 fps
    if (p.animTimer > 0.083) {
      p.animTimer = 0;
      p.animFrame = (p.animFrame + 1) % 4;
    }
  }

  /** Main draw call */
  function draw(ctx, p) {
    ctx.save();
    const cx = p.x + p.w / 2;
    const bottom = p.y + p.h;
    const s = p.scale;

    // ── Shadow ──
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, bottom + 4 * s, p.w * 0.45, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Translate to draw around center-bottom ──
    ctx.translate(cx, bottom);

    // Run bob
    let bob = 0;
    if (p.animState === 'RUN') {
      bob = Math.sin(p.animFrame * Math.PI / 2) * 4 * s;
    }
    if (p.animState === 'STOMP') {
      ctx.scale(1.1, 0.9); // squash on stomp
    }

    const H = p.baseH;
    const W = p.w;

    // ── Tail ──
    ctx.save();
    const tailSwing = p.animState === 'RUN' ? Math.sin(p.animFrame * Math.PI / 2) * 15 : 0;
    ctx.strokeStyle = C.tail;
    ctx.lineWidth = 7 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-W * 0.35, -H * 0.35 + bob);
    ctx.bezierCurveTo(
      -W * 0.7, -H * 0.5 + bob,
      -W * 0.8 + tailSwing * s, -H * 0.75 + bob,
      -W * 0.5 + tailSwing * s, -H * 0.85 + bob
    );
    ctx.stroke();
    ctx.restore();

    // ── Legs ──
    if (p.animState === 'DUCK') {
      // Crouched legs
      _drawLimb(ctx, -10*s, -20*s, -18*s, -4*s, s, C.body, 10*s);
      _drawLimb(ctx,  10*s, -20*s,  18*s, -4*s, s, C.body, 10*s);
    } else {
      const legSwing = (p.animState === 'RUN') ? (p.animFrame % 2 === 0 ? 1 : -1) * 14 * s : 0;
      _drawLimb(ctx, -8*s, -22*s + bob, -14*s + legSwing, 0,   s, C.body, 10*s);
      _drawLimb(ctx,  8*s, -22*s + bob,  14*s - legSwing, 0,   s, C.body, 10*s);
    }

    // ── Body ──
    const bodyY = p.animState === 'DUCK' ? -H * 0.5 + bob : -H * 0.55 + bob;
    const bodyH = p.animState === 'DUCK' ? H * 0.38 : H * 0.42;
    _roundRect(ctx, -W*0.35, bodyY, W*0.70, bodyH, 18*s, C.body);

    // Belly
    _roundRect(ctx, -W*0.18, bodyY + bodyH*0.15, W*0.36, bodyH*0.70, 12*s, C.belly);

    // ── Arms ──
    if (p.animState === 'JUMP') {
      _drawLimb(ctx, -W*0.30, bodyY+bodyH*0.2, -W*0.55, bodyY-bodyH*0.1, s, C.body, 9*s);
      _drawLimb(ctx,  W*0.30, bodyY+bodyH*0.2,  W*0.55, bodyY-bodyH*0.1, s, C.body, 9*s);
    } else {
      const armSwing = (p.animState === 'RUN') ? (p.animFrame % 2 === 0 ? -1 : 1) * 10 * s : 0;
      _drawLimb(ctx, -W*0.30, bodyY+bodyH*0.25, -W*0.52 + armSwing, bodyY+bodyH*0.75, s, C.body, 9*s);
      _drawLimb(ctx,  W*0.30, bodyY+bodyH*0.25,  W*0.52 - armSwing, bodyY+bodyH*0.75, s, C.body, 9*s);
    }

    // ── Head ──
    const headCY = p.animState === 'DUCK' ? -H * 0.72 + bob : -H * 0.78 + bob;
    const headR  = W * 0.32;

    // Ears
    _ear(ctx, -headR * 0.85, headCY - headR * 0.55, headR * 0.28, s);
    _ear(ctx,  headR * 0.85, headCY - headR * 0.55, headR * 0.28, s);

    // Head circle
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.arc(0, headCY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Face plate
    ctx.fillStyle = C.face;
    ctx.beginPath();
    ctx.ellipse(0, headCY + headR * 0.1, headR * 0.66, headR * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeY = headCY - headR * 0.15;
    _eye(ctx, -headR * 0.28, eyeY, headR * 0.15, s, p.animState === 'JUMP');
    _eye(ctx,  headR * 0.28, eyeY, headR * 0.15, s, p.animState === 'JUMP');

    // Nose
    ctx.fillStyle = C.nose;
    ctx.beginPath();
    ctx.ellipse(0, headCY + headR * 0.18, headR * 0.18, headR * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = C.mouth;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    const mouthState = p.animState === 'JUMP' ? 0.3 : 0.15;
    ctx.arc(0, headCY + headR * 0.28, headR * 0.20, mouthState, Math.PI - mouthState);
    ctx.stroke();

    // Stomp flash stars
    if (p.animState === 'STOMP') {
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const d   = W * 0.6;
        ctx.fillStyle = `hsl(${i*60+30}, 100%, 65%)`;
        ctx.font = `${18*s}px sans-serif`;
        ctx.fillText('✦', Math.cos(ang)*d - 8*s, Math.sin(ang)*d - headR);
      }
    }

    ctx.restore();
  }

  /* helpers */
  function _roundRect(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  function _drawLimb(ctx, x1, y1, x2, y2, s, color, lw) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Foot/hand blob
    ctx.fillStyle = C.feet;
    ctx.beginPath();
    ctx.arc(x2, y2, lw * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function _ear(ctx, x, y, r, s) {
    ctx.fillStyle = C.ear;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.earIn;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  function _eye(ctx, x, y, r, s, isJumping) {
    ctx.fillStyle = C.eye;
    ctx.beginPath();
    if (isJumping) {
      ctx.ellipse(x, y, r, r * 1.3, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    // Highlight
    ctx.fillStyle = C.eyeHi;
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  return { create, updateAnim, draw };
})();