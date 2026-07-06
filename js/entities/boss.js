/**
 * boss.js — Boss Battle System (v1)
 * Boss pertama: 🦀 Kepiting Raksasa (Giant Crab)
 *
 * Alur: main.js memicu Boss.spawn() setelah fase warning selesai.
 * Boss masuk dari kanan (state 'entering') → berhenti di posisi tempur
 * (state 'fighting') → melempar batu secara berkala, bisa dipukul mundur
 * via stomp atau proyektil pisang → HP habis → animasi mati (state 'dying')
 * → 'dead' (main.js membaca ini untuk memberi reward & reset).
 *
 * Desain hitbox: properti .w/.h/.x/.y konsisten dengan Physics.checkAABB()
 * & Physics.checkStomp(), supaya bisa langsung dipakai ulang tanpa mengubah
 * physics.js.
 */
const Boss = (() => {
  const HP_MAX = 5;
  const ATTACK_INTERVAL_BASE = 2.4; // detik antar lemparan batu

  let boss = null;
  let projRecycle = [];

  function spawn(groundY, W_INT) {
    const w = 260, h = 190;
    boss = {
      w, h,
      x: W_INT + 260,
      y: groundY - h,
      groundY,
      targetX: W_INT * 0.70,
      hp: HP_MAX,
      maxHp: HP_MAX,
      state: 'entering', // entering | fighting | dying | dead
      hitFlash: 0,
      invuln: 0.15,       // jeda kecil biar 1 pukulan gak ke-double-count
      attackTimer: 1.0,   // jeda sebelum lemparan pertama
      attackInterval: ATTACK_INTERVAL_BASE,
      projectiles: [],
      animT: 0,
      deathT: 0,
      enterShakeSent: false,
    };
    return boss;
  }

  function getBoss() { return boss; }
  function isActive() { return !!boss; }

  /** @returns {boolean} true kalau hit benar-benar diterapkan (bukan lagi invuln/mati) */
  function hit() {
    if (!boss || boss.state === 'dying' || boss.state === 'dead' || boss.invuln > 0) return false;
    boss.hp--;
    boss.hitFlash = 0.22;
    boss.invuln = 0.35;
    if (boss.hp <= 0) {
      boss.state = 'dying';
      boss.deathT = 1.1;
      boss.projectiles = []; // batu yang belum kena dibersihkan biar gak nyangkut
    }
    return true;
  }

  function despawn() { boss = null; }

  function update(dt, groundY, W_INT, playerX) {
    if (!boss) return;
    boss.animT += dt;
    if (boss.hitFlash > 0) boss.hitFlash -= dt;
    if (boss.invuln > 0) boss.invuln -= dt;

    if (boss.state === 'entering') {
      boss.x += (boss.targetX - boss.x) * Math.min(1, dt * 2.4);
      if (Math.abs(boss.x - boss.targetX) < 4) {
        boss.x = boss.targetX;
        boss.state = 'fighting';
      }
    } else if (boss.state === 'fighting') {
      boss.attackTimer -= dt;
      if (boss.attackTimer <= 0) {
        boss.attackTimer = boss.attackInterval;
        _throwRock(W_INT);
      }
    } else if (boss.state === 'dying') {
      boss.deathT -= dt;
      if (boss.deathT <= 0) boss.state = 'dead';
    }

    // Update proyektil batu
    for (let i = boss.projectiles.length - 1; i >= 0; i--) {
      const r = boss.projectiles[i];
      r.x += r.vx * dt;
      r.rot += dt * 7;
      if (r.x < -80) {
        const rem = boss.projectiles.splice(i, 1)[0];
        projRecycle.push(rem);
      }
    }
  }

  /** Lempar batu — separuh kesempatan rendah (harus lompat), separuh tinggi (harus duck) */
  function _throwRock(W_INT) {
    const isHigh = Math.random() < 0.5;
    const y = isHigh
      ? boss.groundY - 300  // tinggi → wajib duck (kalau lompat malah kena)
      : boss.groundY - 60;  // rendah → wajib lompat
    let rock;
    if (projRecycle.length) {
      rock = projRecycle.pop();
      rock.x = boss.x + boss.w * 0.10; rock.y = y; rock.w = 40; rock.h = 40; rock.vx = -640; rock.rot = Math.random() * Math.PI * 2; rock.isHigh = isHigh;
    } else {
      rock = { x: boss.x + boss.w * 0.10, y, w: 40, h: 40, vx: -640, rot: Math.random() * Math.PI * 2, isHigh };
    }
    boss.projectiles.push(rock);
  }

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  function draw(ctx) {
    if (!boss) return;

    for (const r of boss.projectiles) _drawRock(ctx, r);

    if (boss.state === 'dead') return;

    const shrink = boss.state === 'dying' ? Math.max(0, boss.deathT / 1.1) : 1;
    const cx = boss.x + boss.w / 2;
    const cy = boss.y + boss.h * (boss.state === 'dying' ? (1 - (1 - shrink) * 0.4) : 1);

    ctx.save();
    if (boss.state === 'dying') {
      ctx.globalAlpha = shrink;
      ctx.translate(cx, boss.y + boss.h);
      ctx.rotate((1 - shrink) * 0.6);
      ctx.scale(shrink, shrink);
      ctx.translate(-cx, -(boss.y + boss.h));
    }

    _drawGiantCrab(ctx, boss);

    ctx.restore();

    // HP bar mengambang di atas boss (hanya saat masih hidup/fighting)
    if (boss.state !== 'dying') {
      const barW = boss.w * 0.8, barH = 16;
      const bx = boss.x + (boss.w - barW) / 2, by = boss.y - 34;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(bx - 3, by - 3, barW + 6, barH + 6);
      ctx.fillStyle = '#4a2c1a';
      ctx.fillRect(bx, by, barW, barH);
      const pct = Math.max(0, boss.hp / boss.maxHp);
      const hpGrad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
      hpGrad.addColorStop(0, '#FF6B6B'); hpGrad.addColorStop(1, '#C0392B');
      ctx.fillStyle = hpGrad;
      ctx.fillRect(bx, by, barW * pct, barH);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, barW, barH);
      ctx.restore();
    }
  }

  function _drawGiantCrab(ctx, b) {
    const cx = b.x + b.w / 2;
    const bob = Math.sin(b.animT * 3) * 6;
    const by = b.y + b.h * 0.55 + bob;
    const s = b.w / 260;
    const legWave = Math.sin(b.animT * 6) * 14 * s;

    // Bayangan tanah
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, b.groundY + 6, b.w * 0.4, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Kaki-kaki (4 pasang, lebih besar dari kepiting biasa)
    ctx.strokeStyle = '#7A1F1F';
    ctx.lineWidth = 9 * s;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const lx = cx + i * 34 * s;
      const wave = legWave * (i % 2 === 0 ? 1 : -1);
      ctx.beginPath();
      ctx.moveTo(lx, by - 16 * s);
      ctx.lineTo(lx - 22 * s * Math.sign(i), by + 44 * s + wave);
      ctx.stroke();
    }

    // Badan utama (karapas)
    const grad = ctx.createRadialGradient(cx, by - b.h * 0.12, 6 * s, cx, by, b.w * 0.42);
    grad.addColorStop(0, b.hitFlash > 0 ? '#FFFFFF' : '#FF7B54');
    grad.addColorStop(1, '#B33A2E');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, by - b.h * 0.05, b.w * 0.40, b.h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7A1F1F';
    ctx.lineWidth = 4 * s;
    ctx.stroke();

    // Kilau badan
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx - b.w * 0.14, by - b.h * 0.2, b.w * 0.13, b.h * 0.09, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Mata besar bertangkai
    _bossEye(ctx, cx - 40 * s, by - b.h * 0.36, s);
    _bossEye(ctx, cx + 40 * s, by - b.h * 0.36, s);

    // Sepasang capit besar — mengatup-buka saat menyerang (interval attackTimer)
    const pinchOpen = b.state === 'fighting' ? Math.max(0, Math.sin((b.attackInterval - b.attackTimer) * 1.4)) : 0.4;
    _bossClaw(ctx, cx - b.w * 0.46, by + 4 * s, -1, s, pinchOpen);
    _bossClaw(ctx, cx + b.w * 0.46, by + 4 * s, 1, s, pinchOpen);
  }

  function _bossEye(ctx, x, y, s) {
    ctx.strokeStyle = '#7A1F1F'; ctx.lineWidth = 6 * s;
    ctx.beginPath(); ctx.moveTo(x, y + 26 * s); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = '#1A1A2E';
    ctx.beginPath(); ctx.arc(x, y - 4 * s, 15 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(x + 4 * s, y - 8 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _bossClaw(ctx, x, y, dir, s, openAmt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dir * -0.15);
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.ellipse(0, 0, 34 * s, 22 * s, dir * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7A1F1F'; ctx.lineWidth = 4 * s; ctx.stroke();

    // Dua "jari" capit yang membuka sesuai openAmt (0 = tertutup, 1 = terbuka penuh)
    ctx.fillStyle = '#C0392B';
    ctx.save();
    ctx.rotate(dir * 0.5 * openAmt);
    ctx.beginPath();
    ctx.moveTo(dir * 22 * s, -10 * s);
    ctx.lineTo(dir * 48 * s, -18 * s - openAmt * 10 * s);
    ctx.lineTo(dir * 40 * s, 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.rotate(-dir * 0.5 * openAmt);
    ctx.beginPath();
    ctx.moveTo(dir * 22 * s, 10 * s);
    ctx.lineTo(dir * 48 * s, 18 * s + openAmt * 10 * s);
    ctx.lineTo(dir * 40 * s, -2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function _drawRock(ctx, r) {
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.rotate(r.rot);
    const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, r.w * 0.6);
    grad.addColorStop(0, '#8D8D8D'); grad.addColorStop(1, '#4A4A4A');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-r.w * 0.5, 0);
    ctx.lineTo(-r.w * 0.2, -r.h * 0.48);
    ctx.lineTo(r.w * 0.3, -r.h * 0.4);
    ctx.lineTo(r.w * 0.5, r.h * 0.05);
    ctx.lineTo(r.w * 0.15, r.h * 0.48);
    ctx.lineTo(-r.w * 0.3, r.h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    ctx.stroke();
    // sedikit "warning trail" merah di belakang batu biar kebaca arah datangnya
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#FF5533';
    ctx.beginPath();
    ctx.ellipse(r.w * 0.55, 0, r.w * 0.5, r.h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return { spawn, getBoss, isActive, hit, despawn, update, draw, HP_MAX };
})();