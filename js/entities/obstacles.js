/**
 * obstacles.js — Obstacle & Collectible Entities
 * Types: CRAB | COCONUT | COIN | CHEST | CACTUS | FALLEN_PALM
 * All drawn procedurally via Canvas 2D API (HD vector style)
 */

const Obstacles = (() => {
  // ── Spawn Config Baru (Tuned untuk Resolusi HD 1080p) ──
  const TYPES = {
    CRAB:        { w: 72,  h: 44,  points: 0,   canStomp: true  },
    COCONUT:     { w: 48,  h: 48,  points: 0,   canStomp: false },
    COIN:        { w: 36,  h: 36,  points: 100, canStomp: false },
    CHEST:       { w: 80,  h: 64,  points: 500, canStomp: true  }, 
    CACTUS:      { w: 50,  h: 90,  points: 0,   canStomp: false }, // Rintangan Darat Baru (Unstompable)
    FALLEN_PALM: { w: 140, h: 46,  points: 0,   canStomp: false }, // Rintangan Darat Baru (Unstompable)
  };

  const SPAWN_INTERVAL_MIN = 1.2; // Detik
  const SPAWN_INTERVAL_MAX = 2.4;

  let pool = [];
  let spawnTimer = 0;
  let nextSpawn  = 1.5;
  let animTimer  = 0;
  let animFrame  = 0;

  function reset() {
    pool = [];
    spawnTimer = 0;
    nextSpawn  = 1.5;
    animTimer  = 0;
    animFrame  = 0;
  }

  /**
   * Update semua rintangan & kelola pergerakan serta pembersihan objek
   */
  function update(dt, speed, groundY, W) {
    animTimer += dt;
    if (animTimer > 0.1) { animTimer = 0; animFrame = (animFrame + 1) % 8; }

    // Jalankan pergerakan objek yang aktif di dalam pool
    for (let i = pool.length - 1; i >= 0; i--) {
      const o = pool[i];
      o.x -= speed * dt;

      // Kalkulasi fisika jatuh kelapa dari langit
      if (o.type === 'COCONUT') {
        o.vy += 1800 * dt;
        o.y  += o.vy * dt;
        if (o.y + o.h >= groundY) {
          o.y  = groundY - o.h;
          o.vy = -o.vy * 0.35; // Pantulan kecil di atas pasir
          if (Math.abs(o.vy) < 80) o.vy = 0;
        }
      }

      // Efek melayang (bobbing) sinusoide untuk koin
      if (o.type === 'COIN') {
        o.y = o.baseY + Math.sin(animFrame / 8 * Math.PI * 2 + o.phaseOffset) * 8;
      }

      // Bersihkan objek yang sudah keluar dari layar kiri untuk optimalisasi memori
      if (o.x + o.w < -150) pool.splice(i, 1);
    }

    // Manajemen waktu pemunculan rintangan prosedural
    spawnTimer += dt;
    if (spawnTimer >= nextSpawn) {
      spawnTimer = 0;
      nextSpawn  = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
      _spawn(speed, groundY, W);
    }
  }

  /**
   * Pembangkitan Objek Prosedural dengan Penyeimbang Kesulitan Taktis
   */
  function _spawn(speed, groundY, W) {
    const rand = Math.random();
    let type;
    
    // Distribusi Probabilitas Baru untuk Mengunci Game Balance
    if (rand < 0.30) {
      type = 'CRAB';        // 30% Kepiting darat (stompable)
    } else if (rand < 0.50) {
      type = 'COCONUT';     // 20% Kelapa jatuh (unstompable)
    } else if (rand < 0.70) {
      type = 'CACTUS';      // 20% Kaktus statis tinggi (unstompable)
    } else if (rand < 0.88) {
      type = 'FALLEN_PALM'; // 18% Pohon kelapa tumbang lebar (unstompable)
    } else if (rand < 0.96) {
      type = 'COIN';        // 8% Koin biasa
    } else {
      type = 'CHEST';       // HANYA 4% Peluang Muncul (Langka & Berharga!)
    }

    const cfg = TYPES[type];
    const startX = W + 100; // Memberikan margin agar render objek HD tidak pop-in patah di kanan layar

    let obj = {
      type,
      x: startX,
      w: cfg.w,
      h: cfg.h,
      points: cfg.points,
      canStomp: cfg.canStomp,
      alive: true,
      collected: false,
      collectAnim: 0,
    };

    // Alokasi Posisi Tinggi Y Berdasarkan Spesifikasi Entitas Objek
    if (type === 'CRAB' || type === 'CHEST' || type === 'CACTUS' || type === 'FALLEN_PALM') {
      obj.y = groundY - cfg.h;
    } else if (type === 'COCONUT') {
      obj.x = startX + Math.random() * 150;
      obj.y = -cfg.h * 2;
      obj.vy = 250 + Math.random() * 350; 
    } else if (type === 'COIN') {
      const floatH = 120 + Math.random() * 160;
      obj.baseY = groundY - cfg.h - floatH;
      obj.y     = obj.baseY;
      obj.phaseOffset = Math.random() * Math.PI * 2;
    }

    pool.push(obj);
  }

  /** Memicu animasi pop-out saat item diambil atau dihancurkan */
  function collect(o) {
    o.collected  = true;
    o.collectAnim = 0.5;
  }

  /** Master draw router untuk memproyeksikan seluruh entitas ke kanvas */
  function draw(ctx, groundY) {
    for (const o of pool) {
      if (!o.alive) continue;
      ctx.save();

      if (o.collected) {
        o.collectAnim -= 0.016;
        if (o.collectAnim <= 0) { o.alive = false; ctx.restore(); continue; }
        ctx.globalAlpha = o.collectAnim / 0.5;
        ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
        const scale = 1 + (1 - o.collectAnim / 0.5) * 0.8;
        ctx.scale(scale, scale);
        ctx.translate(-(o.x + o.w / 2), -(o.y + o.h / 2));
      }

      switch (o.type) {
        case 'CRAB':        _drawCrab(ctx, o, groundY);    break;
        case 'COCONUT':     _drawCoconut(ctx, o);          break;
        case 'COIN':        _drawCoin(ctx, o);             break;
        case 'CHEST':       _drawChest(ctx, o);            break;
        case 'CACTUS':      _drawCactus(ctx, o);           break; 
        case 'FALLEN_PALM': _drawFallenPalm(ctx, o);       break; 
      }
      ctx.restore();

      // Render teks skor mengambang (+100 / +500)
      if (o.collected && o.points > 0 && o.collectAnim > 0) {
        const alpha = o.collectAnim / 0.5;
        const rise  = (1 - alpha) * 40;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font        = 'bold 28px Poppins, sans-serif';
        ctx.fillStyle   = o.type === 'CHEST' ? '#FFB703' : '#FFFFFF';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth   = 3;
        ctx.textAlign   = 'center';
        ctx.strokeText(`+${o.points}`, o.x + o.w / 2, o.y - rise);
        ctx.fillText(`+${o.points}`,   o.x + o.w / 2, o.y - rise);
        ctx.restore();
      }
    }
  }

  /* ════════════════════════════════════════════
     INDIVIDUAL PROCEDURAL VECTOR RENDERERS (HD)
  ════════════════════════════════════════════ */

  function _drawCrab(ctx, o, groundY) {
    const cx = o.x + o.w / 2;
    const by = o.y + o.h;
    const s  = o.w / 72; 

    const legWave = Math.sin(animFrame / 8 * Math.PI * 4) * 8 * s;

    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth   = 4 * s;
    ctx.lineCap     = 'round';
    for (let i = -1; i <= 1; i++) {
      const lx = cx + i * 14 * s;
      ctx.beginPath(); ctx.moveTo(lx, by - 10 * s); ctx.lineTo(lx - 10 * s, by + legWave * (i === 0 ? -1 : 1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx, by - 10 * s); ctx.lineTo(lx + 10 * s, by - legWave * (i === 0 ? -1 : 1)); ctx.stroke();
    }

    const grad = ctx.createRadialGradient(cx, o.y + o.h * 0.4, 2 * s, cx, o.y + o.h * 0.4, 28 * s);
    grad.addColorStop(0, '#FF6B6B'); grad.addColorStop(1, '#C0392B');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(cx, o.y + o.h * 0.45, o.w * 0.45, o.h * 0.42, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(cx - 4 * s, o.y + o.h * 0.3, o.w * 0.2, o.h * 0.15, -0.3, 0, Math.PI * 2); ctx.fill();

    _drawClaw(ctx, cx - 26 * s, o.y + o.h * 0.35, -1, s);
    _drawClaw(ctx, cx + 26 * s, o.y + o.h * 0.35,  1, s);

    const eyeWave = Math.sin(animFrame / 8 * Math.PI * 2) * 2 * s;
    _crabEye(ctx, cx - 12 * s, o.y + o.h * 0.12 + eyeWave, s);
    _crabEye(ctx, cx + 12 * s, o.y + o.h * 0.12 - eyeWave, s);
  }

  function _drawClaw(ctx, x, y, dir, s) {
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath(); ctx.ellipse(x, y, 16 * s, 10 * s, dir * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#C0392B';
    ctx.beginPath(); ctx.moveTo(x + dir * 10 * s, y - 6 * s); ctx.lineTo(x + dir * 18 * s, y - 12 * s); ctx.lineTo(x + dir * 16 * s, y + 2 * s); ctx.closePath(); ctx.fill();
  }

  function _crabEye(ctx, x, y, s) {
    ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(x, y + 14 * s); ctx.lineTo(x, y + 4 * s); ctx.stroke();
    ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(x, y, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + 2 * s, y - 2 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawCoconut(ctx, o) {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const r  = o.w * 0.46;
    const s  = o.w / 48;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(animFrame / 8 * Math.PI * 2);

    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#8B6914'); grad.addColorStop(0.6, '#5D4037'); grad.addColorStop(1, '#3E2723');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2 * s;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke();
    }

    ctx.fillStyle = '#1A1A1A';
    const eyePositions = [{ x: 0, y: -r * 0.35 }, { x: -r * 0.28, y: r * 0.15 }, { x:  r * 0.28, y: r * 0.15 }];
    for (const ep of eyePositions) { ctx.beginPath(); ctx.arc(ep.x, ep.y, 4 * s, 0, Math.PI * 2); ctx.fill(); }

    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function _drawCoin(ctx, o) {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const r  = o.w * 0.46;
    const s  = o.w / 36;

    const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.6);
    glow.addColorStop(0, 'rgba(255,215,0,0.35)'); glow.addColorStop(1, 'rgba(255,183,3,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2); ctx.fill();

    const grad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#FFE066'); grad.addColorStop(0.6, '#FFB703'); grad.addColorStop(1, '#E08900');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#E08900'; ctx.lineWidth = 2.5 * s;
    ctx.beginPath(); ctx.arc(cx, cy, r - 1.5 * s, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = 'rgba(180,100,0,0.85)'; ctx.font = `bold ${Math.floor(r * 1.1)}px Poppins, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🪙', cx, cy + 1);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.22, cy - r * 0.28, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
  }

  function _drawChest(ctx, o) {
    const x = o.x; const y = o.y; const w = o.w; const h = o.h; const s = w / 80;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 4 * s, w * 0.4, 6 * s, 0, 0, Math.PI * 2); ctx.fill();

    const bodyGrad = ctx.createLinearGradient(x, y + h * 0.45, x, y + h);
    bodyGrad.addColorStop(0, '#8B4513'); bodyGrad.addColorStop(1, '#5D2E0C');
    ctx.fillStyle = bodyGrad; _rr(ctx, x, y + h * 0.4, w, h * 0.6, 8 * s);

    const lidGrad = ctx.createLinearGradient(x, y, x, y + h * 0.45);
    lidGrad.addColorStop(0, '#A0522D'); lidGrad.addColorStop(1, '#7B3A1A');
    ctx.fillStyle = lidGrad; _rr(ctx, x, y, w, h * 0.48, [8 * s, 8 * s, 0, 0]);

    ctx.fillStyle = '#D4A017';
    ctx.fillRect(x + 4 * s, y + h * 0.36, w - 8 * s, 6 * s); ctx.fillRect(x + 4 * s, y + h * 0.72, w - 8 * s, 5 * s);
    ctx.fillRect(x + w * 0.25, y + 4 * s, 6 * s, h - 8 * s); ctx.fillRect(x + w * 0.69, y + 4 * s, 6 * s, h - 8 * s);

    ctx.fillStyle = '#FFD700'; _rr(ctx, x + w * 0.38, y + h * 0.30, w * 0.24, h * 0.28, 4 * s);
    ctx.fillStyle = '#B8860B'; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.33, w * 0.09, Math.PI, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.18)'; _rr(ctx, x + 8 * s, y + 4 * s, w - 16 * s, h * 0.15, 4 * s);

    if (animFrame < 2) {
      ctx.fillStyle = 'rgba(255,220,0,0.7)'; ctx.font = `${16 * s}px sans-serif`;
      ctx.textAlign = 'center'; ctx.fillText('✦', x + w / 2, y - 8 * s);
    }
  }

  /* ── RINTANGAN BARU: KAKTUS PANTAI HD ── */
  function _drawCactus(ctx, o) {
    const cx = o.x + o.w / 2;
    const y = o.y;
    const s = o.w / 50; 

    ctx.save();
    ctx.fillStyle = '#2D6A4F';
    ctx.strokeStyle = '#1B4332';
    ctx.lineWidth = 3 * s;
    
    _rr(ctx, cx - 12 * s, y, 24 * s, o.h, 10 * s);

    // Cabang Kiri
    _rr(ctx, cx - 26 * s, y + 30 * s, 16 * s, 12 * s, 4 * s);
    _rr(ctx, cx - 26 * s, y + 10 * s, 10 * s, 24 * s, 4 * s);

    // Cabang Kanan
    _rr(ctx, cx + 10 * s, y + 42 * s, 16 * s, 12 * s, 4 * s);
    _rr(ctx, cx + 16 * s, y + 22 * s, 10 * s, 24 * s, 4 * s);

    // Detail Aksen Jarum Duri
    ctx.strokeStyle = '#52B788';
    ctx.lineWidth = 2 * s;
    for (let i = 1; i <= 5; i++) {
      let dy = y + i * 15 * s;
      ctx.beginPath(); ctx.moveTo(cx - 6 * s, dy); ctx.lineTo(cx + 6 * s, dy); ctx.stroke();
    }
    ctx.restore();
  }

  /* ── RINTANGAN BARU: POHON KELAPA TUMBANG HD ── */
  function _drawFallenPalm(ctx, o) {
    const x = o.x; const y = o.y; const h = o.h; const w = o.w; const s = h / 46;

    ctx.save();
    const trunkGrad = ctx.createLinearGradient(x, y, x, y + h);
    trunkGrad.addColorStop(0, '#8D6E63'); trunkGrad.addColorStop(0.5, '#A1887F'); trunkGrad.addColorStop(1, '#5D4037');
    ctx.fillStyle = trunkGrad;
    ctx.strokeStyle = '#4E342E'; ctx.lineWidth = 2.5 * s;
    _rr(ctx, x + 30 * s, y + 10 * s, w - 30 * s, h - 14 * s, 6 * s);

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    for(let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(x + 50 * s + i * 16 * s, y + 10 * s); ctx.lineTo(x + 50 * s + i * 16 * s, y + h - 4 * s); ctx.stroke();
    }

    ctx.fillStyle = '#4E342E';
    ctx.beginPath(); ctx.arc(x + 30 * s, y + h * 0.5, 16 * s, 0, Math.PI * 2); ctx.fill();

    // Pelepah Daun Kelapa yang Tumbang
    ctx.fillStyle = '#1B4332';
    for(let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(x + w - 20 * s + (i * 8 * s), y + 12 * s, 22 * s, 10 * s, 0.4 - i * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* Rounded Rectangle Helper Method */
  function _rr(ctx, x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    ctx.beginPath();
    ctx.moveTo(x + r[0], y); ctx.lineTo(x + w - r[1], y);
    ctx.arcTo(x + w, y, x + w, y + r[1], r[1]); ctx.lineTo(x + w, y + h - r[2]);
    ctx.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]); ctx.lineTo(x + r[3], y + h);
    ctx.arcTo(x, y + h, x, y + h - r[3], r[3]); ctx.lineTo(x, y + r[0]);
    ctx.arcTo(x, y, x + r[0], y, r[0]);
    ctx.closePath(); ctx.fill();
  }

  function getPool() { return pool; }

  return { reset, update, draw, collect, getPool };
})();