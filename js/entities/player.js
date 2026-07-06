/**
 * player.js — Bekantan (Proboscis Monkey) Player Entity (LF normalized)
 * States: IDLE | RUN | JUMP | DUCK | STOMP
 * Drawn procedurally via Canvas 2D API (HD vector style)
 *
 * === UPDATE PROPORSI (v0.3) ===
 * Proporsi direvisi supaya makin mirip Bekantan asli, bukan monyet generik:
 *  - Kepala DIPERKECIL (headR turun dari 0.32W → 0.26W)
 *  - Badan DIPERTINGGI/dijangkungkan (bodyH naik dari 0.42H → 0.46H,
 *    posisi badan digeser lebih tinggi)
 *  - Tangan DIPERPANJANG signifikan (jangkauan lengan ~0.62-0.95W,
 *    sebelumnya cuma ~0.52-0.55W) — ciri lengan panjang khas monyet
 *    berlengan panjang seperti Bekantan
 *  - Kaki DIRAMPINGKAN (lineWidth limb turun dari 10*s → 7*s)
 *  - Wajah & dada DIPUCATKAN (warna face/belly lebih terang)
 *  - Hidung menjuntai diperbesar sedikit (0.62 → 0.78 dari headR)
 *
 * === FITUR BARU: ANIMASI IDLE ===
 * Sebelumnya cuma ada RUN/JUMP/DUCK/STOMP. Sekarang ditambah state IDLE
 * dengan beberapa perilaku acak yang membuat karakter terasa "hidup"
 * saat diam (dipakai misalnya untuk preview di menu):
 *  - Kedip mata berkala
 *  - Menoleh kanan/kiri berkala
 *  - Menggaruk kepala sesekali
 *  - Ekor bergoyang pelan terus-menerus
 * Aktifkan lewat updateAnim(p, dt, true) — parameter ketiga forceIdle.
 */

const Player = (() => {
  // ── Colours (Bekantan / Proboscis Monkey palette) ──
  const C = {
    body:    '#B5651D',   // punggung coklat kemerahan
    bodyHi:  '#C97C3D',
    limb:    '#9C9086',   // lengan & kaki abu-abu kusam
    belly:   '#FAF3E4',   // dada krem lebih pucat
    face:    '#F7ECD8',   // wajah lebih pucat
    // === Palet kepala diselaraskan dengan gambar referensi (low-poly portrait):
    // mahkota coklat tua → pipi coklat sedang → wajah krem, + tepi rim-light ===
    headCrown: '#55310E', // coklat tua di atas/belakang kepala
    headCheek: '#A76E37', // coklat sedang di sisi pipi
    rimLight:  '#A8865F', // semburat terang tipis di tepi belakang kepala
    ear:     '#5A3210',   // telinga terlipat — selaras dengan warna mahkota
    earIn:   '#8B5A2B',
    eye:     '#1A1A2E',
    eyeHi:   '#FFFFFF',
    nose:    '#DE8E55',   // hidung besar — tan-oranye sesuai referensi
    noseShade: '#B8703D',
    mouth:   '#4A2810',
    tail:    '#B5651D',
    feet:    '#5A5048',
    shadow:  'rgba(0,0,0,0.15)',
  };

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

      throwTimer: 0,

      // === FITUR BARU: state internal untuk siklus animasi IDLE ===
      idle: {
        blinkTimer: 2 + Math.random() * 2,
        blinking: false,
        blinkDur: 0,
        lookTimer: 3 + Math.random() * 3,
        lookDir: 0,      // -1 kiri, 0 tengah, 1 kanan
        lookDur: 0,
        scratchTimer: 5 + Math.random() * 4,
        scratchDur: 0,
        tailPhase: Math.random() * Math.PI * 2,
      },

      scale,
      score: 0,
    };
  }

  function triggerThrow(p) {
    p.throwTimer = 0.2; // Durasi lemparan 200ms
  }

  /**
   * Call every frame to update animation timers.
   * @param {boolean} forceIdle - kalau true, paksa karakter ke state IDLE
   *   (dipakai untuk preview statis, mis. di menu, terlepas dari status
   *   onGround/ducking sesungguhnya).
   */
  function updateAnim(p, dt, forceIdle = false) {
    p.animTimer += dt;

    if (forceIdle) {
      p.animState = 'IDLE';
      _updateIdle(p, dt);
    } else {
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
    }

    if (p.throwTimer > 0) {
      p.throwTimer -= dt;
    }

    // Cycle run frames ~12 fps
    if (p.animState === 'RUN' && p.animTimer > 0.083) {
      p.animTimer = 0;
      p.animFrame = (p.animFrame + 1) % 4;
    }
  }

  /** Mengelola sub-perilaku IDLE: kedip, menoleh, menggaruk kepala, ekor goyang */
  function _updateIdle(p, dt) {
    const idle = p.idle;
    idle.tailPhase += dt * 1.3;

    // Kedip
    if (idle.blinking) {
      idle.blinkDur -= dt;
      if (idle.blinkDur <= 0) {
        idle.blinking = false;
        idle.blinkTimer = 2.4 + Math.random() * 2.6;
      }
    } else {
      idle.blinkTimer -= dt;
      if (idle.blinkTimer <= 0) {
        idle.blinking = true;
        idle.blinkDur = 0.14;
      }
    }

    // Menggaruk kepala (prioritas di atas menoleh biar gak tabrakan animasi)
    if (idle.scratchDur > 0) {
      idle.scratchDur -= dt;
      if (idle.scratchDur <= 0) {
        idle.scratchTimer = 6 + Math.random() * 5;
      }
    } else {
      idle.scratchTimer -= dt;
      if (idle.scratchTimer <= 0) {
        idle.scratchDur = 1.0;
        idle.lookDir = 0;
        idle.lookDur = 0;
      }
    }

    // Menoleh kanan/kiri (hanya kalau sedang tidak menggaruk kepala)
    if (idle.scratchDur <= 0) {
      if (idle.lookDur > 0) {
        idle.lookDur -= dt;
        if (idle.lookDur <= 0) {
          idle.lookDir = 0;
          idle.lookTimer = 3.5 + Math.random() * 3;
        }
      } else {
        idle.lookTimer -= dt;
        if (idle.lookTimer <= 0) {
          idle.lookDir = Math.random() < 0.5 ? -1 : 1;
          idle.lookDur = 1.1;
        }
      }
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
    const idle = p.idle;
    const isIdle = p.animState === 'IDLE';

    // Ofset kecil untuk kesan menoleh & bergoyang santai saat IDLE
    const headTurn  = isIdle ? idle.lookDir * headTurnAmt(W) : 0;
    const idleSway  = isIdle ? Math.sin(idle.tailPhase * 0.6) * 2 * s : 0;

    // ── Tail ──
    ctx.save();
    let tailSwing;
    if (p.animState === 'RUN') tailSwing = Math.sin(p.animFrame * Math.PI / 2) * 15;
    else if (isIdle) tailSwing = Math.sin(idle.tailPhase) * 10;
    else tailSwing = 0;
    ctx.strokeStyle = C.tail;
    ctx.lineWidth = 6 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-W * 0.30 + idleSway, -H * 0.42 + bob);
    ctx.bezierCurveTo(
      -W * 0.65 + idleSway, -H * 0.55 + bob,
      -W * 0.78 + tailSwing * s, -H * 0.82 + bob,
      -W * 0.48 + tailSwing * s, -H * 0.94 + bob
    );
    ctx.stroke();
    ctx.restore();

    // ── Legs (dirampingkan) ──
    if (p.animState === 'DUCK') {
      _drawLimb(ctx, -9*s, -18*s, -16*s, -3*s, s, C.limb, 7*s);
      _drawLimb(ctx,  9*s, -18*s,  16*s, -3*s, s, C.limb, 7*s);
    } else {
      const legSwing = (p.animState === 'RUN') ? (p.animFrame % 2 === 0 ? 1 : -1) * 13 * s : 0;
      const legY = -H * 0.28 + bob;
      _drawLimb(ctx, -7*s + idleSway, legY, -11*s + legSwing + idleSway, 0, s, C.limb, 7*s);
      _drawLimb(ctx,  7*s + idleSway, legY,  11*s - legSwing + idleSway, 0, s, C.limb, 7*s);
    }

    // ── Body (lebih jangkung) ──
    const bodyY = p.animState === 'DUCK' ? -H * 0.48 + bob : -H * 0.62 + bob;
    const bodyH = p.animState === 'DUCK' ? H * 0.34 : H * 0.46;
    _roundRect(ctx, -W*0.34 + idleSway, bodyY, W*0.68, bodyH, 18*s, C.body);

    // Perut buncit (potbelly) — ciri khas Bekantan, tetap menonjol
    _roundRect(ctx, -W*0.23 + idleSway, bodyY + bodyH*0.14, W*0.50, bodyH*0.80, 15*s, C.belly);

    // ── Arms (tangan sangat panjang — ciri khas Bekantan) ──
    if (p.throwTimer > 0) {
      // Status Melempar: satu tangan direntangkan jauh ke depan
      const throwProgress = p.throwTimer / 0.2;
      const armForwardX = W * 0.98;
      const armForwardY = bodyY + bodyH * 0.15;

      _drawLimb(ctx, -W*0.28, bodyY+bodyH*0.20, -W*0.16, bodyY+bodyH*0.98, s, C.limb, 8*s);
      _drawLimb(ctx,  W*0.28, bodyY+bodyH*0.20, armForwardX, armForwardY, s, C.limb, 8*s);

      ctx.save();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3 * s;
      ctx.globalAlpha = throwProgress;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(armForwardX + 10 * s, armForwardY - 15 * s);
      ctx.lineTo(armForwardX + 45 * s, armForwardY - 15 * s);
      ctx.moveTo(armForwardX, armForwardY + 10 * s);
      ctx.lineTo(armForwardX + 35 * s, armForwardY + 10 * s);
      ctx.stroke();
      ctx.restore();

    } else if (isIdle) {
      if (idle.scratchDur > 0) {
        // === FITUR BARU: menggaruk kepala ===
        const scratchT = 1 - Math.min(idle.scratchDur / 1.0, 1);
        const liftY = Math.sin(scratchT * Math.PI) * 6 * s; // gerakan naik-turun halus
        const headScratchX = W * 0.16;
        const headScratchY = -H * 0.90 - liftY;
        _drawLimb(ctx, -W*0.26 + idleSway, bodyY+bodyH*0.18, -W*0.34 + idleSway, bodyY+bodyH*1.10, s, C.limb, 8*s);
        _drawLimb(ctx,  W*0.26 + idleSway, bodyY+bodyH*0.15, headScratchX + idleSway, headScratchY, s, C.limb, 8*s);
      } else {
        // Kedua tangan tergantung panjang & santai, bergoyang pelan
        const swayArm = Math.sin(idle.tailPhase * 0.8) * 3 * s;
        _drawLimb(ctx, -W*0.28 + idleSway, bodyY+bodyH*0.18, -W*0.42 + idleSway + swayArm, bodyY+bodyH*1.18, s, C.limb, 8*s);
        _drawLimb(ctx,  W*0.28 + idleSway, bodyY+bodyH*0.18,  W*0.42 + idleSway - swayArm, bodyY+bodyH*1.18, s, C.limb, 8*s);
      }
    } else if (p.animState === 'JUMP') {
      _drawLimb(ctx, -W*0.28, bodyY+bodyH*0.16, -W*0.62, bodyY-bodyH*0.15, s, C.limb, 8*s);
      _drawLimb(ctx,  W*0.28, bodyY+bodyH*0.16,  W*0.62, bodyY-bodyH*0.15, s, C.limb, 8*s);
    } else {
      const armSwing = (p.animState === 'RUN') ? (p.animFrame % 2 === 0 ? -1 : 1) * 12 * s : 0;
      _drawLimb(ctx, -W*0.28, bodyY+bodyH*0.20, -W*0.62 + armSwing, bodyY+bodyH*0.85, s, C.limb, 8*s);
      _drawLimb(ctx,  W*0.28, bodyY+bodyH*0.20,  W*0.62 - armSwing, bodyY+bodyH*0.85, s, C.limb, 8*s);
    }

    // ── Head (diperkecil) ──
    const headCY = p.animState === 'DUCK' ? -H * 0.76 + bob : -H * 0.88 + bob;
    const headR  = W * 0.26;
    const headX  = headTurn + idleSway;

    // Ears (kecil, terlipat/menyudut — bukan bulat — sesuai referensi)
    _ear(ctx, headX - headR * 0.95, headCY - headR * 0.5, headR * 0.32, s, -1);
    _ear(ctx, headX + headR * 0.95, headCY - headR * 0.5, headR * 0.32, s, 1);

    // Rim-light tipis di tepi belakang kepala (semburat terang khas referensi)
    ctx.fillStyle = C.rimLight;
    ctx.beginPath();
    ctx.arc(headX, headCY, headR * 1.04, Math.PI * 1.15, Math.PI * 1.75);
    ctx.arc(headX, headCY, headR * 0.90, Math.PI * 1.75, Math.PI * 1.15, true);
    ctx.closePath();
    ctx.fill();

    // Head base — mahkota coklat tua di atas/belakang
    ctx.fillStyle = C.headCrown;
    ctx.beginPath();
    ctx.arc(headX, headCY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Pipi — coklat sedang, bidang lebih besar menutupi sisi & bawah kepala
    // (dua bidang datar meniru gaya low-poly/geometris pada referensi)
    ctx.fillStyle = C.headCheek;
    ctx.beginPath();
    ctx.moveTo(headX - headR * 0.98, headCY - headR * 0.05);
    ctx.lineTo(headX - headR * 0.55, headCY + headR * 0.95);
    ctx.lineTo(headX + headR * 0.30, headCY + headR * 0.98);
    ctx.lineTo(headX + headR * 0.85, headCY + headR * 0.25);
    ctx.lineTo(headX + headR * 0.60, headCY - headR * 0.45);
    ctx.closePath();
    ctx.fill();

    // Face plate (krem, bidang wajah bawah — lebih pucat)
    ctx.fillStyle = C.face;
    ctx.beginPath();
    ctx.ellipse(headX + headR * 0.05, headCY + headR * 0.15, headR * 0.62, headR * 0.60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes — kedip saat IDLE
    const eyeY = headCY - headR * 0.15;
    if (isIdle && idle.blinking) {
      ctx.strokeStyle = C.eye;
      ctx.lineWidth = 2 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headX - headR * 0.40, eyeY); ctx.lineTo(headX - headR * 0.16, eyeY);
      ctx.moveTo(headX + headR * 0.16, eyeY); ctx.lineTo(headX + headR * 0.40, eyeY);
      ctx.stroke();
    } else {
      _eye(ctx, headX - headR * 0.28, eyeY, headR * 0.15, s, p.animState === 'JUMP');
      _eye(ctx, headX + headR * 0.28, eyeY, headR * 0.15, s, p.animState === 'JUMP');
    }

    // Nose — hidung menjuntai, pusat perhatian (diperbesar sedikit dari versi lama)
    const noseWiggle = p.throwTimer > 0
      ? Math.sin((0.2 - p.throwTimer) * 40) * headR * 0.05
      : (p.animState === 'RUN' ? Math.sin(p.animFrame * Math.PI / 2) * headR * 0.02 : 0);
    const noseBaseY = headCY + headR * 0.14;
    const noseLen   = headR * 0.92; // diperbesar & lebih dramatis, sesuai referensi

    ctx.save();
    ctx.translate(headX + noseWiggle, 0);

    // Bayangan halus di pangkal hidung
    ctx.fillStyle = C.noseShade;
    ctx.beginPath();
    ctx.ellipse(0, noseBaseY + noseLen * 0.15, headR * 0.22, headR * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Badan hidung — melengkung dramatis ke bawah lalu sedikit menekuk ke
    // samping di ujung (mengikuti kurva khas referensi, bukan lurus ke bawah)
    ctx.fillStyle = C.nose;
    ctx.beginPath();
    ctx.moveTo(-headR * 0.18, noseBaseY - headR * 0.05);
    ctx.quadraticCurveTo(-headR * 0.30, noseBaseY + noseLen * 0.5, -headR * 0.20, noseBaseY + noseLen * 0.88);
    ctx.quadraticCurveTo(-headR * 0.10, noseBaseY + noseLen * 1.08, headR * 0.06, noseBaseY + noseLen * 1.04);
    ctx.quadraticCurveTo(headR * 0.18, noseBaseY + noseLen * 0.95, headR * 0.10, noseBaseY + noseLen * 0.70);
    ctx.quadraticCurveTo(headR * 0.26, noseBaseY + noseLen * 0.5, headR * 0.18, noseBaseY - headR * 0.05);
    ctx.closePath();
    ctx.fill();

    // Highlight lembut di sisi hidung
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(-headR * 0.08, noseBaseY + noseLen * 0.4, headR * 0.06, headR * 0.20, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Lubang hidung di ujung bawah
    ctx.fillStyle = C.mouth;
    ctx.beginPath();
    ctx.ellipse(-headR * 0.06, noseBaseY + noseLen, headR * 0.035, headR * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headR * 0.06, noseBaseY + noseLen, headR * 0.035, headR * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Mouth
    ctx.strokeStyle = C.mouth;
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    const mouthState = p.animState === 'JUMP' ? 0.3 : 0.15;
    ctx.arc(headX, noseBaseY + noseLen * 0.7, headR * 0.20, mouthState, Math.PI - mouthState);
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
  function headTurnAmt(W) { return W * 0.10; }

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

  /** Telinga kecil terlipat/menyudut (bukan bulat) — dir: -1 kiri, 1 kanan */
  function _ear(ctx, x, y, r, s, dir = 1) {
    ctx.save();
    ctx.translate(x, y);
    // Bentuk luar — segitiga membulat terlipat ke dalam
    ctx.fillStyle = C.ear;
    ctx.beginPath();
    ctx.moveTo(dir * -r * 0.55, r * 0.75);
    ctx.quadraticCurveTo(dir * -r * 0.95, -r * 0.15, dir * -r * 0.15, -r * 0.95);
    ctx.quadraticCurveTo(dir * r * 0.55, -r * 0.55, dir * r * 0.45, r * 0.25);
    ctx.quadraticCurveTo(dir * r * 0.20, r * 0.85, dir * -r * 0.55, r * 0.75);
    ctx.closePath();
    ctx.fill();
    // Lipatan dalam (segitiga lebih kecil, sedikit digeser ke tengah kepala)
    ctx.fillStyle = C.earIn;
    ctx.beginPath();
    ctx.moveTo(dir * -r * 0.30, r * 0.45);
    ctx.quadraticCurveTo(dir * -r * 0.55, -r * 0.05, dir * -r * 0.05, -r * 0.55);
    ctx.quadraticCurveTo(dir * r * 0.28, -r * 0.30, dir * r * 0.20, r * 0.12);
    ctx.quadraticCurveTo(dir * r * 0.05, r * 0.50, dir * -r * 0.30, r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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

  /**
   * drawPortrait — Render wajah Bekantan close-up (bukan full-body), khusus
   * untuk canvas kecil di menu (#menu-mascot). Dipanggil dengan idle state
   * yang sudah di-update lewat updateAnim(p, dt, true) supaya kedip/menoleh
   * tetap hidup, tapi tanpa badan/lengan/kaki penuh — cukup kepala + bahu.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} p        player object dari Player.create() (untuk idle state)
   * @param {number} cw       lebar canvas tujuan
   * @param {number} ch       tinggi canvas tujuan
   */
  function drawPortrait(ctx, p, cw, ch) {
    ctx.save();
    const idle = p.idle;
    const s = Math.min(cw, ch) / 160; // skala relatif ke ukuran referensi 160px

    const headR  = ch * 0.30;
    const headCY = ch * 0.42;
    const headTurn = idle.lookDir * headR * 0.12;
    const idleSway  = Math.sin(idle.tailPhase * 0.6) * 2 * s;
    const headX  = cw / 2 + headTurn + idleSway;

    // ── Bahu/pundak sederhana di bawah kepala, biar gak "melayang" ──
    ctx.fillStyle = C.body;
    ctx.beginPath();
    ctx.ellipse(cw / 2, ch * 0.92, cw * 0.46, ch * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.belly;
    ctx.beginPath();
    ctx.ellipse(cw / 2, ch * 0.97, cw * 0.30, ch * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    _ear(ctx, headX - headR * 0.95, headCY - headR * 0.5, headR * 0.32, s, -1);
    _ear(ctx, headX + headR * 0.95, headCY - headR * 0.5, headR * 0.32, s, 1);

    // Rim-light
    ctx.fillStyle = C.rimLight;
    ctx.beginPath();
    ctx.arc(headX, headCY, headR * 1.04, Math.PI * 1.15, Math.PI * 1.75);
    ctx.arc(headX, headCY, headR * 0.90, Math.PI * 1.75, Math.PI * 1.15, true);
    ctx.closePath();
    ctx.fill();

    // Head crown
    ctx.fillStyle = C.headCrown;
    ctx.beginPath();
    ctx.arc(headX, headCY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Cheek plane
    ctx.fillStyle = C.headCheek;
    ctx.beginPath();
    ctx.moveTo(headX - headR * 0.98, headCY - headR * 0.05);
    ctx.lineTo(headX - headR * 0.55, headCY + headR * 0.95);
    ctx.lineTo(headX + headR * 0.30, headCY + headR * 0.98);
    ctx.lineTo(headX + headR * 0.85, headCY + headR * 0.25);
    ctx.lineTo(headX + headR * 0.60, headCY - headR * 0.45);
    ctx.closePath();
    ctx.fill();

    // Face plate
    ctx.fillStyle = C.face;
    ctx.beginPath();
    ctx.ellipse(headX + headR * 0.05, headCY + headR * 0.15, headR * 0.62, headR * 0.60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes — kedip
    const eyeY = headCY - headR * 0.15;
    if (idle.blinking) {
      ctx.strokeStyle = C.eye;
      ctx.lineWidth = 2 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headX - headR * 0.40, eyeY); ctx.lineTo(headX - headR * 0.16, eyeY);
      ctx.moveTo(headX + headR * 0.16, eyeY); ctx.lineTo(headX + headR * 0.40, eyeY);
      ctx.stroke();
    } else {
      _eye(ctx, headX - headR * 0.28, eyeY, headR * 0.15, s, false);
      _eye(ctx, headX + headR * 0.28, eyeY, headR * 0.15, s, false);
    }

    // Nose — menjuntai dramatis
    const noseBaseY = headCY + headR * 0.14;
    const noseLen   = headR * 0.92;

    ctx.save();
    ctx.translate(headX, 0);

    ctx.fillStyle = C.noseShade;
    ctx.beginPath();
    ctx.ellipse(0, noseBaseY + noseLen * 0.15, headR * 0.22, headR * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = C.nose;
    ctx.beginPath();
    ctx.moveTo(-headR * 0.18, noseBaseY - headR * 0.05);
    ctx.quadraticCurveTo(-headR * 0.30, noseBaseY + noseLen * 0.5, -headR * 0.20, noseBaseY + noseLen * 0.88);
    ctx.quadraticCurveTo(-headR * 0.10, noseBaseY + noseLen * 1.08, headR * 0.06, noseBaseY + noseLen * 1.04);
    ctx.quadraticCurveTo(headR * 0.18, noseBaseY + noseLen * 0.95, headR * 0.10, noseBaseY + noseLen * 0.70);
    ctx.quadraticCurveTo(headR * 0.26, noseBaseY + noseLen * 0.5, headR * 0.18, noseBaseY - headR * 0.05);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(-headR * 0.08, noseBaseY + noseLen * 0.4, headR * 0.06, headR * 0.20, -0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = C.mouth;
    ctx.beginPath();
    ctx.ellipse(-headR * 0.06, noseBaseY + noseLen, headR * 0.035, headR * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headR * 0.06, noseBaseY + noseLen, headR * 0.035, headR * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Mouth
    ctx.strokeStyle = C.mouth;
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.arc(headX, noseBaseY + noseLen * 0.7, headR * 0.20, 0.15, Math.PI - 0.15);
    ctx.stroke();

    ctx.restore();
  }

  return { create, updateAnim, draw, drawPortrait, triggerThrow };
})();