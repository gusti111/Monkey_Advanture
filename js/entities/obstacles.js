/**
 * obstacles.js — Obstacle & Collectible Entities
 * Types: CRAB | SNAKE | MONITOR | COCONUT | COIN | CHEST | CACTUS | FALLEN_PALM | BANANA | BRANCH
 * Optimized for HD Canvas 2D API with Distance-Based Spawning
 */

const Obstacles = (() => {
  const TYPES = {
    CRAB: { w: 72, h: 44, points: 0, canStomp: true },
    SNAKE: { w: 84, h: 26, points: 0, canStomp: true },
    MONITOR: { w: 92, h: 46, points: 0, canStomp: true },
    COCONUT: { w: 48, h: 48, points: 0, canStomp: false },
    // coinValue: koin persisten (currency Shop) yang didapat saat dikoleksi —
    // terpisah dari `points` (yang cuma menambah skor sementara per-run).
    COIN: { w: 36, h: 36, points: 100, canStomp: false, coinValue: 1 },
    CHEST: { w: 80, h: 64, points: 500, canStomp: true, coinValue: 5 },
    CACTUS: { w: 50, h: 90, points: 0, canStomp: false },
    FALLEN_PALM: { w: 140, h: 46, points: 0, canStomp: false },
    // Pisang: bukan poin, tapi ammo lemparan (dibaca lewat o.ammo di main.js)
    BANANA: { w: 38, h: 26, points: 20, canStomp: false, ammo: 1 },
    // === FITUR BARU: Cabang Mangrove Menjuntai ===
    // Obstacle "wajib duck" — hanya muncul lewat sistem Formasi (bukan spawn
    // acak biasa), karena butuh partner (koin/rintangan lain) untuk jadi pola
    // yang bermakna. y selalu di-override manual (menjuntai dari atas, bukan
    // berdiri di tanah), lihat _makeFormationObj().
    BRANCH: { w: 110, h: 40, points: 0, canStomp: false },
  };

  // Base kecepatan (harus sinkron dengan SPEED_INIT di main.js)
  const BASE_SPEED = 400;

  // Interval spawn dikonversi ke satuan jarak (piksel) untuk memastikan 
  // kepadatan rintangan tetap konsisten meskipun kecepatan game meningkat.
  const SPAWN_DISTANCE_MIN = BASE_SPEED * 1.2;
  const SPAWN_DISTANCE_MAX = BASE_SPEED * 2.4;

  let pool = [];
  let recycle = [];
  let distanceTraveled = 0;
  let nextSpawnDistance = SPAWN_DISTANCE_MIN * 1.5;
  let animTimer = 0;
  let animFrame = 0;
  // === FITUR BARU: dipakai saat Boss Battle aktif — obstacle yang sudah ada
  // tetap discroll & dibersihkan seperti biasa, tapi tidak ada spawn baru
  // supaya layar tidak penuh sesak saat fokus lawan boss.
  let spawningPaused = false;

  // === FITUR BARU: Wave / Formation Events ===
  // Sesekali, alih-alih 1 obstacle acak, spawn "formasi": pola beberapa objek
  // sekaligus dengan susunan yang bermakna (bukan cuma acak satu-satu terus).
  const FORMATION_CHANCE = 0.35;        // peluang formasi dibanding spawn tunggal (kalau cooldown sudah lewat)
  const FORMATION_MIN_SPAWNS = 3;       // minimal N spawn tunggal dulu sebelum formasi berikutnya boleh muncul
  let spawnsSinceFormation = 0;

  function reset() {
    pool = [];
    distanceTraveled = 0;
    nextSpawnDistance = SPAWN_DISTANCE_MIN;
    animTimer = 0;
    animFrame = 0;
    spawningPaused = false;
    spawnsSinceFormation = 0;
    recycle = [];
  }

  function pauseSpawning() { spawningPaused = true; }
  function resumeSpawning() {
    spawningPaused = false;
    // Reset jarak spawn supaya tidak langsung muncul obstacle detik itu juga
    // begitu boss selesai — beri jeda napas sebentar untuk pemain.
    distanceTraveled = 0;
    nextSpawnDistance = SPAWN_DISTANCE_MIN * 1.3 + Math.random() * (SPAWN_DISTANCE_MAX - SPAWN_DISTANCE_MIN);
  }

  function update(dt, speed, groundY, W) {
    animTimer += dt;
    if (animTimer > 0.1) { animTimer = 0; animFrame = (animFrame + 1) % 8; }

    const frameDistance = speed * dt;
    distanceTraveled += frameDistance;

    for (let i = pool.length - 1; i >= 0; i--) {
      const o = pool[i];
      o.x -= frameDistance;

      // PERBAIKAN BUG: animasi "collected" sebelumnya di-decay dengan angka
      // tetap (0.016) di dalam draw() — artinya animasi ini melaju sesuai
      // jumlah FRAME yang digambar, bukan waktu nyata (dt), sehingga di
      // frame-rate tinggi (mis. 144fps) animasi collect selesai jauh lebih
      // cepat daripada di 30fps. Dipindah ke sini (update, yang punya dt asli)
      // supaya konsisten dengan sistem lain yang semuanya sudah pakai dt.
      if (o.collected && o.alive) {
        o.collectAnim -= dt;
        if (o.collectAnim <= 0) o.alive = false;
      }

      // Jika objek sudah tidak hidup (telah selesai animasi collect), pindahkan ke recycle
      if (!o.alive) {
        pool.splice(i, 1);
        recycle.push(o);
        continue;
      }

      if (o.type === 'COCONUT') {
        o.vy += 1800 * dt;
        o.y += o.vy * dt;
        if (o.y + o.h >= groundY) {
          o.y = groundY - o.h;
          o.vy = -o.vy * 0.35;
          if (Math.abs(o.vy) < 80) o.vy = 0;
        }
      }

      // o._noFloat: dipakai koin dalam formasi "duckTunnel" yang posisinya harus
      // presisi tetap (sejajar tinggi duck di bawah cabang), tidak boleh naik-turun
      // seperti koin ambient biasa — kalau ikut animasi float bisa nyangkut ke cabang.
      if ((o.type === 'COIN' || o.type === 'BANANA') && !o._noFloat) {
        o.y = o.baseY + Math.sin(animFrame / 8 * Math.PI * 2 + o.phaseOffset) * 8;
      }

      // Hapus jika keluar layar (kembalikan ke recycle)
      if (o.x + o.w < -150) {
        const rem = pool.splice(i, 1)[0];
        recycle.push(rem);
      }
    }

    // Pemunculan berbasis jarak (Distance-based spawning)
    if (!spawningPaused && distanceTraveled >= nextSpawnDistance) {
      distanceTraveled = 0;
      nextSpawnDistance = SPAWN_DISTANCE_MIN + Math.random() * (SPAWN_DISTANCE_MAX - SPAWN_DISTANCE_MIN);

      spawnsSinceFormation++;
      const cooldownDone = spawnsSinceFormation >= FORMATION_MIN_SPAWNS;
      if (cooldownDone && Math.random() < FORMATION_CHANCE) {
        spawnsSinceFormation = 0;
        // Formasi butuh "ruang napas" ekstra sebelum spawn berikutnya biar
        // tidak langsung numpuk dengan obstacle tunggal setelahnya.
        nextSpawnDistance += SPAWN_DISTANCE_MIN * 0.9;
        _spawnFormation(groundY, W);
      } else {
        _spawn(groundY, W);
      }
    }
  }

  function _spawn(groundY, W) {
    const rand = Math.random();
    let type;

    if (rand < 0.20) type = 'CRAB';
    else if (rand < 0.32) type = 'SNAKE';
    else if (rand < 0.42) type = 'MONITOR';
    else if (rand < 0.54) type = 'COCONUT';
    else if (rand < 0.66) type = 'CACTUS';
    else if (rand < 0.76) type = 'FALLEN_PALM';
    else if (rand < 0.84) type = 'COIN';
    else if (rand < 0.96) type = 'BANANA';
    else type = 'CHEST';

    const cfg = TYPES[type];
    const startX = W + 100;

    let obj;
    if (recycle.length) {
      obj = recycle.pop();
      obj.type = type; obj.x = startX; obj.w = cfg.w; obj.h = cfg.h;
      obj.points = cfg.points; obj.canStomp = cfg.canStomp; obj.ammo = cfg.ammo || 0;
      obj.coinValue = cfg.coinValue || 0;
      obj.alive = true; obj.collected = false; obj.collectAnim = 0;
    } else {
      obj = {
        type, x: startX, w: cfg.w, h: cfg.h,
        points: cfg.points, canStomp: cfg.canStomp, ammo: cfg.ammo || 0,
        coinValue: cfg.coinValue || 0,
        alive: true, collected: false, collectAnim: 0,
      };
    }

    if (['CRAB', 'SNAKE', 'MONITOR', 'CHEST', 'CACTUS', 'FALLEN_PALM'].includes(type)) {
      obj.y = groundY - cfg.h;
    } else if (type === 'COCONUT') {
      obj.x = startX + Math.random() * 150;
      obj.y = -cfg.h * 2;
      obj.vy = 250 + Math.random() * 350;
    } else if (type === 'COIN' || type === 'BANANA') {
      const floatH = 120 + Math.random() * 160;
      obj.baseY = groundY - cfg.h - floatH;
      obj.y = obj.baseY;
      obj.phaseOffset = Math.random() * Math.PI * 2;
    }

    pool.push(obj);
  }

  /* ════════════════════════════════════════════
     FORMASI (WAVE EVENTS)
     Pola spawn majemuk — dipanggil sebagai pengganti _spawn() sesekali,
     lihat cooldown & peluang di update(). Setiap fungsi _formationX
     membangun objek-objeknya sendiri lalu push langsung ke `pool`.
     ════════════════════════════════════════════ */

  /** Helper: bikin 1 objek obstacle/collectible dengan posisi eksplisit,
   * dipakai khusus oleh formasi (beda dari _spawn yang pakai tabel bobot acak). */
  function _makeFormationObj(type, x, y, overrides = {}) {
    const cfg = TYPES[type];
    const obj = {
      type, x, y,
      w: overrides.w || cfg.w,
      h: overrides.h || cfg.h,
      points: cfg.points, canStomp: cfg.canStomp, ammo: cfg.ammo || 0,
      coinValue: cfg.coinValue || 0,
      alive: true, collected: false, collectAnim: 0,
      ...overrides,
    };
    return obj;
  }

  const FORMATION_KINDS = ['coinArc', 'jumpGauntlet', 'duckTunnel', 'jumpDuckCombo'];

  function _spawnFormation(groundY, W) {
    const kind = FORMATION_KINDS[Math.floor(Math.random() * FORMATION_KINDS.length)];
    const startX = W + 100;
    switch (kind) {
      case 'coinArc': _formationCoinArc(startX, groundY); break;
      case 'jumpGauntlet': _formationJumpGauntlet(startX, groundY); break;
      case 'duckTunnel': _formationDuckTunnel(startX, groundY); break;
      case 'jumpDuckCombo': _formationJumpDuckCombo(startX, groundY); break;
    }
  }

  /** Barisan koin melengkung mengikuti busur lompatan — reward visual untuk
   * lompatan yang presisi (pemain "mengoleksi" jalur lompatannya sendiri). */
  function _formationCoinArc(startX, groundY) {
    const count = 7;
    const spacing = 66;
    const arcHeight = 210;
    const baseY = groundY - 150; // dasar ketinggian arc (tinggi lompatan normal)
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const arc = Math.sin(t * Math.PI) * arcHeight;
      const y = baseY - arc;
      const obj = _makeFormationObj('COIN', startX + i * spacing, y, {
        baseY: y,
        phaseOffset: t * Math.PI * 2,
      });
      pool.push(obj);
    }
  }

  /** 3 rintangan wajib-lompat berturut-turut dengan jarak konsisten —
   * menuntut ritme lompat, bukan cuma satu lompatan tunggal. */
  function _formationJumpGauntlet(startX, groundY) {
    const gapOffsets = [0, 260, 520];
    gapOffsets.forEach(g => {
      pool.push(_makeFormationObj('CACTUS', startX + g, groundY - TYPES.CACTUS.h));
    });
  }

  /** Cabang mangrove menjuntai lebar (wajib duck) dengan koin sejajar tinggi
   * duck di bawahnya — reward karena berhasil ducking pas waktunya. */
  function _formationDuckTunnel(startX, groundY) {
    const branchW = 260;
    const branchY = groundY - 100; // lihat kalkulasi clearance di komentar TYPES.BRANCH
    pool.push(_makeFormationObj('BRANCH', startX, branchY, { w: branchW }));

    const coinCount = 3;
    for (let i = 0; i < coinCount; i++) {
      const cx = startX + 45 + i * 70;
      const cy = groundY - 62; // tinggi duck-safe, di bawah cabang
      pool.push(_makeFormationObj('COIN', cx, cy, { baseY: cy, phaseOffset: 0, _noFloat: true }));
    }
  }

  /** Kombinasi wajib-lompat lalu wajib-duck lalu wajib-lompat lagi —
   * menguji dua refleks berbeda dalam satu formasi berurutan. */
  function _formationJumpDuckCombo(startX, groundY) {
    pool.push(_makeFormationObj('CACTUS', startX, groundY - TYPES.CACTUS.h));
    pool.push(_makeFormationObj('BRANCH', startX + 300, groundY - 100, { w: TYPES.BRANCH.w }));
    pool.push(_makeFormationObj('CACTUS', startX + 620, groundY - TYPES.CACTUS.h));
  }

  function collect(o) {
    o.collected = true;
    o.collectAnim = 0.5;
  }

  function draw(ctx, groundY) {
    for (const o of pool) {
      if (!o.alive) continue;
      ctx.save();

      if (o.collected) {
        // Nilai collectAnim sekarang di-decay di update(dt) — di sini cuma
        // dipakai untuk menghitung tampilan (fade + scale-up), tanpa
        // memodifikasinya lagi supaya tidak dobel-decay per frame.
        if (o.collectAnim <= 0) { ctx.restore(); continue; }
        ctx.globalAlpha = o.collectAnim / 0.5;
        ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
        const scale = 1 + (1 - o.collectAnim / 0.5) * 0.8;
        ctx.scale(scale, scale);
        ctx.translate(-(o.x + o.w / 2), -(o.y + o.h / 2));
      }

      switch (o.type) {
        case 'CRAB': _drawCrab(ctx, o, groundY); break;
        case 'SNAKE': _drawSnake(ctx, o); break;
        case 'MONITOR': _drawMonitor(ctx, o); break;
        case 'COCONUT': _drawCoconut(ctx, o); break;
        case 'COIN': _drawCoin(ctx, o); break;
        case 'CHEST': _drawChest(ctx, o); break;
        case 'CACTUS': _drawCactus(ctx, o); break;
        case 'FALLEN_PALM': _drawFallenPalm(ctx, o); break;
        case 'BANANA': _drawBanana(ctx, o); break;
        case 'BRANCH': _drawBranch(ctx, o); break; // PERBAIKAN: Menambahkan render branch agar terlihat di layar
      }
      ctx.restore();

      if (o.collected && o.points > 0 && o.collectAnim > 0) {
        const alpha = o.collectAnim / 0.5;
        const rise = (1 - alpha) * 40;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 28px Poppins, sans-serif';
        ctx.fillStyle = o.type === 'CHEST' ? '#FFB703' : '#FFFFFF';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(`+${o.points}`, o.x + o.w / 2, o.y - rise);
        ctx.fillText(`+${o.points}`, o.x + o.w / 2, o.y - rise);
        ctx.restore();
      }
    }
  }

  /* ════════════════════════════════════════════
     INDIVIDUAL PROCEDURAL VECTOR RENDERERS (HD)
     ════════════════════════════════════════════ */

  function _drawCrab(ctx, o, groundY) {
    const cx = o.x + o.w / 2; const by = o.y + o.h; const s = o.w / 72;
    const legWave = Math.sin(animFrame / 8 * Math.PI * 4) * 8 * s;
    ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
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
    _drawClaw(ctx, cx + 26 * s, o.y + o.h * 0.35, 1, s);
    const eyeWave = Math.sin(animFrame / 8 * Math.PI * 2) * 2 * s;
    _crabEye(ctx, cx - 12 * s, o.y + o.h * 0.12 + eyeWave, s);
    _crabEye(ctx, cx + 12 * s, o.y + o.h * 0.12 - eyeWave, s);
  }

  function _drawClaw(ctx, x, y, dir, s) {
    ctx.fillStyle = '#E74C3C'; ctx.beginPath(); ctx.ellipse(x, y, 16 * s, 10 * s, dir * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#C0392B'; ctx.beginPath(); ctx.moveTo(x + dir * 10 * s, y - 6 * s); ctx.lineTo(x + dir * 18 * s, y - 12 * s); ctx.lineTo(x + dir * 16 * s, y + 2 * s); ctx.closePath(); ctx.fill();
  }

  function _crabEye(ctx, x, y, s) {
    ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(x, y + 14 * s); ctx.lineTo(x, y + 4 * s); ctx.stroke();
    ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(x, y, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + 2 * s, y - 2 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawSnake(ctx, o) {
    const s = o.w / 84;
    const segCount = 7;
    const segW = o.w / segCount;
    const wave = animFrame / 8 * Math.PI * 2;

    ctx.save();
    ctx.strokeStyle = '#2D6A4F';
    ctx.lineWidth = o.h * 0.55;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= segCount; i++) {
      const px = o.x + i * segW;
      const py = o.y + o.h * 0.5 + Math.sin(wave + i * 0.9) * o.h * 0.32;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = '#95D5B2';
    ctx.lineWidth = o.h * 0.16;
    ctx.beginPath();
    for (let i = 0; i <= segCount; i++) {
      const px = o.x + i * segW;
      const py = o.y + o.h * 0.5 + Math.sin(wave + i * 0.9) * o.h * 0.32;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    const headX = o.x;
    const headY = o.y + o.h * 0.5 + Math.sin(wave) * o.h * 0.32;
    ctx.fillStyle = '#2D6A4F';
    ctx.beginPath();
    ctx.ellipse(headX, headY, o.h * 0.42, o.h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(headX - o.h * 0.14, headY - o.h * 0.12, o.h * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath(); ctx.arc(headX - o.h * 0.16, headY - o.h * 0.12, o.h * 0.035, 0, Math.PI * 2); ctx.fill();

    if (animFrame % 4 < 2) {
      ctx.strokeStyle = '#E63946';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(headX - o.h * 0.4, headY);
      ctx.lineTo(headX - o.h * 0.65, headY);
      ctx.moveTo(headX - o.h * 0.65, headY);
      ctx.lineTo(headX - o.h * 0.78, headY - o.h * 0.12);
      ctx.moveTo(headX - o.h * 0.65, headY);
      ctx.lineTo(headX - o.h * 0.78, headY + o.h * 0.12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function _drawMonitor(ctx, o) {
    const s = o.w / 92;
    const cx = o.x + o.w * 0.58;
    const by = o.y + o.h;
    const legWave = Math.sin(animFrame / 8 * Math.PI * 4) * 6 * s;

    ctx.save();

    ctx.fillStyle = '#52796F';
    ctx.beginPath();
    ctx.moveTo(o.x + o.w * 0.72, by - o.h * 0.45);
    ctx.quadraticCurveTo(o.x + o.w * 1.15, by - o.h * 0.55, o.x + o.w * 1.30, by - o.h * 0.15);
    ctx.quadraticCurveTo(o.x + o.w * 1.05, by - o.h * 0.30, o.x + o.w * 0.72, by - o.h * 0.30);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#40605A';
    ctx.lineWidth = 6 * s;
    ctx.lineCap = 'round';
    [[0.18, 1], [-0.05, -1], [-0.22, 1], [-0.36, -1]].forEach(([offX, dir]) => {
      const lx = o.x + o.w * (0.58 + offX);
      ctx.beginPath();
      ctx.moveTo(lx, by - o.h * 0.35);
      ctx.lineTo(lx + dir * legWave, by - 2 * s);
      ctx.stroke();
    });

    const grad = ctx.createRadialGradient(cx, o.y + o.h * 0.4, 4 * s, cx, o.y + o.h * 0.4, o.w * 0.4);
    grad.addColorStop(0, '#6B9080'); grad.addColorStop(1, '#40605A');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, o.y + o.h * 0.45, o.w * 0.36, o.h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(20,40,30,0.35)';
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2) * o.w * 0.10;
      ctx.beginPath();
      ctx.arc(cx + dx, o.y + o.h * 0.35 + (i % 2) * o.h * 0.15, 3 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    const headX = o.x + o.w * 0.22;
    const headY = o.y + o.h * 0.38;
    ctx.fillStyle = '#6B9080';
    ctx.beginPath();
    ctx.ellipse(headX, headY, o.w * 0.20, o.h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(o.x + o.w * 0.04, headY + o.h * 0.02, o.w * 0.10, o.h * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath(); ctx.arc(headX - o.w * 0.06, headY - o.h * 0.06, 2.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(headX - o.w * 0.07, headY - o.h * 0.08, 0.9 * s, 0, Math.PI * 2); ctx.fill();

    if (animFrame % 5 === 0) {
      ctx.strokeStyle = '#E63946';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(o.x - o.w * 0.02, headY + o.h * 0.02);
      ctx.lineTo(o.x - o.w * 0.16, headY + o.h * 0.02);
      ctx.stroke();
    }

    ctx.restore();
  }

  function _drawCoconut(ctx, o) {
    const cx = o.x + o.w / 2; const cy = o.y + o.h / 2; const r = o.w * 0.46; const s = o.w / 48;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(animFrame / 8 * Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#8B6914'); grad.addColorStop(0.6, '#5D4037'); grad.addColorStop(1, '#3E2723');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2 * s;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke();
    }
    ctx.fillStyle = '#1A1A1A';
    const eyePositions = [{ x: 0, y: -r * 0.35 }, { x: -r * 0.28, y: r * 0.15 }, { x: r * 0.28, y: r * 0.15 }];
    for (const ep of eyePositions) { ctx.beginPath(); ctx.arc(ep.x, ep.y, 4 * s, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function _drawCoin(ctx, o) {
    const cx = o.x + o.w / 2; const cy = o.y + o.h / 2; const r = o.w * 0.46; const s = o.w / 36;
    const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.6);
    glow.addColorStop(0, 'rgba(255,215,0,0.35)'); glow.addColorStop(1, 'rgba(255,183,3,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2); ctx.fill();
    const grad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#FFE066'); grad.addColorStop(0.6, '#FFB703'); grad.addColorStop(1, '#E08900');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
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

  function _drawCactus(ctx, o) {
    const cx = o.x + o.w / 2;
    const y = o.y;
    const s = o.w / 50;

    ctx.save();
    ctx.fillStyle = '#2D6A4F';
    ctx.strokeStyle = '#1B4332';
    ctx.lineWidth = 3 * s;

    _rr(ctx, cx - 12 * s, y, 24 * s, o.h, 10 * s, true);

    _rr(ctx, cx - 26 * s, y + 30 * s, 16 * s, 12 * s, 4 * s, true);
    _rr(ctx, cx - 26 * s, y + 10 * s, 10 * s, 24 * s, 4 * s, true);

    _rr(ctx, cx + 10 * s, y + 42 * s, 16 * s, 12 * s, 4 * s, true);
    _rr(ctx, cx + 16 * s, y + 22 * s, 10 * s, 24 * s, 4 * s, true);

    ctx.strokeStyle = '#52B788';
    ctx.lineWidth = 2 * s;
    for (let i = 1; i <= 5; i++) {
      let dy = y + i * 15 * s;
      ctx.beginPath(); ctx.moveTo(cx - 6 * s, dy); ctx.lineTo(cx + 6 * s, dy); ctx.stroke();
    }
    ctx.restore();
  }

  function _drawFallenPalm(ctx, o) {
    const x = o.x; const y = o.y; const h = o.h; const w = o.w; const s = h / 46;

    ctx.save();
    const trunkGrad = ctx.createLinearGradient(x, y, x, y + h);
    trunkGrad.addColorStop(0, '#8D6E63'); trunkGrad.addColorStop(0.5, '#A1887F'); trunkGrad.addColorStop(1, '#5D4037');
    ctx.fillStyle = trunkGrad;
    ctx.strokeStyle = '#4E342E'; ctx.lineWidth = 2.5 * s;

    _rr(ctx, x + 30 * s, y + 10 * s, w - 30 * s, h - 14 * s, 6 * s, true);

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(x + 50 * s + i * 16 * s, y + 10 * s); ctx.lineTo(x + 50 * s + i * 16 * s, y + h - 4 * s); ctx.stroke();
    }

    ctx.fillStyle = '#4E342E';
    ctx.beginPath(); ctx.arc(x + 30 * s, y + h * 0.5, 16 * s, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#1B4332';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(x + w - 20 * s + (i * 8 * s), y + 12 * s, 22 * s, 10 * s, 0.4 - i * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function _drawBanana(ctx, o) {
    const cx = o.x + o.w / 2; const cy = o.y + o.h / 2; const s = o.w / 38;

    const glow = ctx.createRadialGradient(cx, cy, 2 * s, cx, cy, o.w * 0.9);
    glow.addColorStop(0, 'rgba(255,224,102,0.35)'); glow.addColorStop(1, 'rgba(255,224,102,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, o.w * 0.9, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.35 + Math.sin(animFrame / 8 * Math.PI * 2) * 0.08);

    const grad = ctx.createLinearGradient(-o.w * 0.4, 0, o.w * 0.4, 0);
    grad.addColorStop(0, '#F6C945'); grad.addColorStop(0.5, '#FFE066'); grad.addColorStop(1, '#E3A712');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#8A6A16';
    ctx.lineWidth = 2 * s;

    ctx.beginPath();
    ctx.moveTo(-o.w * 0.42, o.h * 0.30);
    ctx.quadraticCurveTo(-o.w * 0.10, -o.h * 0.55, o.w * 0.42, -o.h * 0.30);
    ctx.quadraticCurveTo(o.w * 0.20, -o.h * 0.02, -o.w * 0.20, o.h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#5D4E2A';
    ctx.beginPath();
    ctx.ellipse(-o.w * 0.40, o.h * 0.28, 3 * s, 2 * s, 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // === RENDERER BARU: Cabang Mangrove Menjuntai ===
  function _drawBranch(ctx, o) {
    const x = o.x;
    const y = o.y;
    const w = o.w;
    const h = o.h;
    const s = h / 40; // Menggunakan rasio tinggi default cabang sebagai skala base

    ctx.save();
    // Gradasi kulit kayu bakau tua
    const branchGrad = ctx.createLinearGradient(x, y, x, y + h);
    branchGrad.addColorStop(0, '#4A2810');
    branchGrad.addColorStop(0.5, '#5D3A1A');
    branchGrad.addColorStop(1, '#331A08');

    ctx.fillStyle = branchGrad;
    ctx.strokeStyle = '#261405';
    ctx.lineWidth = 3 * s;

    // Menggambar batang utama cabang atas yang melintang menggunakan helper _rr dengan stroke=true
    _rr(ctx, x, y, w, h, [0, 0, 8 * s, 8 * s], true);

    // Render daun-daun mangrove menjuntai di bawah ranting secara prosedural
    ctx.fillStyle = '#1B4332';
    ctx.strokeStyle = '#112A1F';
    ctx.lineWidth = 2 * s;
    const leafCount = 4;
    for (let i = 0; i < leafCount; i++) {
      ctx.beginPath();
      const lx = x + (i * (w / 3.5)) + 10 * s;
      const ly = y + h;
      const angle = 0.15 * (i % 2 === 0 ? 1 : -1);
      ctx.ellipse(lx, ly, 15 * s, 9 * s, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function _rr(ctx, x, y, w, h, r, doStroke = false) {
    if (typeof r === 'number') r = [r, r, r, r];
    ctx.beginPath();
    ctx.moveTo(x + r[0], y); ctx.lineTo(x + w - r[1], y);
    ctx.arcTo(x + w, y, x + w, y + r[1], r[1]); ctx.lineTo(x + w, y + h - r[2]);
    ctx.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]); ctx.lineTo(x + r[3], y + h);
    ctx.arcTo(x, y + h, x, y + h - r[3], r[3]); ctx.lineTo(x, y + r[0]);
    ctx.arcTo(x, y, x + r[0], y, r[0]);
    ctx.closePath();
    ctx.fill();
    if (doStroke) ctx.stroke();
  }

  function getPool() { return pool; }

  return { reset, update, draw, collect, getPool, pauseSpawning, resumeSpawning };
})();
