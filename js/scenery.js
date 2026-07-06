/**
 * scenery.js — Background, Environment, and Weather Renderer
 *
 * This module is responsible for managing and rendering all non-interactive
 * visual elements that create the game's atmosphere. This includes:
 * - Parallax scrolling layers (sky, sea, sand, mangroves).
 * - Dynamic sky with clouds and a sun.
 * - Ambient life like hornbills and butterflies.
 * - A procedural weather system for tropical rain.
 */

const Scenery = (() => {
  // --- SCROLLING & PARALLAX ---
  const scroll = { sky: 0, mangroveFar: 0, mangroveNear: 0, farPalm: 0, midSea: 0, nearSea: 0, sand: 0 };
  const SCROLL_SPEED = { sky: 0.02, mangroveFar: 0.035, mangroveNear: 0.055, farPalm: 0.08, midSea: 0.20, nearSea: 0.35, sand: 1.0 };

  // --- SKY & CLOUDS ---
  const clouds = [
    { x: 300, y: 80, r: 70, speed: 0.03 }, { x: 750, y: 130, r: 55, speed: 0.025 },
    { x: 1200, y: 60, r: 90, speed: 0.035 }, { x: 1600, y: 100, r: 65, speed: 0.02 },
  ];
  let _skyGrad = null, _sunGlowGrad = null;

  // --- AMBIENT LIFE ---
  let hornbillEvents = [];
  let hornbillTimer = 0;
  let nextHornbillTime = 15 + Math.random() * 10;

  const butterflies = [
    { x: 400, yBase: Config.H_INT * 0.55, phase: 0, speed: 0.05, hue: '#FF6B9D' },
    { x: 1100, yBase: Config.H_INT * 0.62, phase: 2.1, speed: 0.04, hue: '#FFD93D' },
    { x: 1700, yBase: Config.H_INT * 0.58, phase: 4.2, speed: 0.055, hue: '#7EE8FA' },
  ];

  // --- FOREGROUND DECORATION ---
  const palms = [
    { x: 200, size: 1.0 }, { x: 600, size: 0.8 }, { x: 1100, size: 1.1 },
    { x: 1500, size: 0.9 }, { x: 1800, size: 1.0 },
  ];
  const beachDeco = Array.from({ length: 12 }, (_, i) => ({
    x: i * 165 + Math.random() * 60,
    type: Math.random() > 0.5 ? 'rock' : 'shell',
    size: 6 + Math.random() * 10,
  }));
  let _sandGrad = null;

  // --- WEATHER SYSTEM ---
  let isRaining = false;
  let rainOpacity = 0;
  let weatherTimer = 0;
  let weatherNextToggle = 12 + Math.random() * 10;
  const RAIN_DROP_COUNT = 90;
  const rainDrops = Array.from({ length: RAIN_DROP_COUNT }, () => ({
    x: Math.random() * Config.W_INT,
    y: Math.random() * Config.H_INT,
    len: 22 + Math.random() * 18,
    speed: 900 + Math.random() * 500,
    drift: -60 - Math.random() * 40,
  }));

  function init() {
    Background.init(Config.W_INT);
  }

  function reset() {
    Object.keys(scroll).forEach(k => scroll[k] = 0);
    hornbillEvents = [];
    hornbillTimer = 0;
    nextHornbillTime = 15 + Math.random() * 10;
    _resetWeather();
  }

  function update(dt, speed, isBossActive) {
    const scrollBase = speed * dt;
    for (const key in scroll) {
      scroll[key] += scrollBase * SCROLL_SPEED[key];
    }

    clouds.forEach(c => {
      c.x -= speed * c.speed * dt;
      if (c.x + 120 < 0) c.x = Config.W_INT + 100;
    });

    _updateHornbillEvents(dt);
    _updateWeather(dt, isBossActive);

    butterflies.forEach(bf => {
      bf.phase += 0.05;
    });
  }

  function draw(ctx) {
    const groundY = Config.H_INT * Config.GROUND_RATIO;

    _drawSky(ctx);
    _drawClouds(ctx);
    _drawBirds(ctx);
    _drawButterflies(ctx);
    Background.draw(ctx, scroll.mangroveFar, scroll.mangroveNear, Config.W_INT, groundY);
    _drawFarPalms(ctx, groundY);
    _drawSea(ctx, groundY);
    _drawSand(ctx, groundY);
    _drawBeachDeco(ctx);
    _drawGroundLine(ctx, groundY);
    _drawWeather(ctx);
  }

  // --- Private Update Helpers ---

  function _updateHornbillEvents(dt) {
    hornbillTimer += dt;
    if (hornbillTimer >= nextHornbillTime) {
      hornbillTimer = 0;
      nextHornbillTime = 20 + Math.random() * 10;
      _spawnHornbillEvent();
    }
    for (let i = hornbillEvents.length - 1; i >= 0; i--) {
      const b = hornbillEvents[i];
      b.flap += dt * 4.5;
      b.x += b.dir * b.speed * dt;
      if ((b.dir > 0 && b.x > Config.W_INT + 220) || (b.dir < 0 && b.x < -220)) {
        hornbillEvents.splice(i, 1);
      }
    }
  }

  function _spawnHornbillEvent() {
    const isNear = Math.random() < 0.5;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const scale = isNear ? 1.3 + Math.random() * 0.4 : 0.45 + Math.random() * 0.25;
    const y = isNear
      ? Config.H_INT * 0.30 + Math.random() * Config.H_INT * 0.12
      : Config.H_INT * 0.10 + Math.random() * Config.H_INT * 0.10;
    const speed = isNear ? 480 + Math.random() * 120 : 220 + Math.random() * 80;

    hornbillEvents.push({
      x: dir > 0 ? -180 : Config.W_INT + 180,
      y, dir, scale, speed,
      flap: Math.random() * Math.PI * 2,
    });
  }

  function _resetWeather() {
    isRaining = false;
    rainOpacity = 0;
    weatherTimer = 0;
    weatherNextToggle = 12 + Math.random() * 10;
  }

  function _updateWeather(dt, isBossActive) {
    if (isBossActive) return;

    weatherTimer += dt;
    if (weatherTimer > weatherNextToggle) {
      isRaining = !isRaining;
      weatherTimer = 0;
      weatherNextToggle = isRaining ? (14 + Math.random() * 10) : (22 + Math.random() * 18);
    }

    const target = isRaining ? 1 : 0;
    rainOpacity += (target - rainOpacity) * Math.min(1, dt * 1.2);

    if (rainOpacity > 0.01) {
      rainDrops.forEach(d => {
        d.y += d.speed * dt;
        d.x += d.drift * dt;
        if (d.y > Config.H_INT) { d.y = -20; d.x = Math.random() * Config.W_INT; }
        if (d.x < -20) d.x = Config.W_INT + 20;
      });
    }
  }

  // --- Private Render Helpers ---

  function _drawSky(ctx) {
    const groundY = Config.H_INT * Config.GROUND_RATIO;
    if (!_skyGrad) {
      _skyGrad = ctx.createLinearGradient(0, 0, 0, groundY * 0.7);
      _skyGrad.addColorStop(0.0, '#38B6FF'); _skyGrad.addColorStop(0.4, '#7ECEF4');
      _skyGrad.addColorStop(0.7, '#FFD580'); _skyGrad.addColorStop(1.0, '#FFB703');
    }
    ctx.fillStyle = _skyGrad; ctx.fillRect(0, 0, Config.W_INT, groundY * 0.7);

    const sunX = Config.W_INT * 0.82; const sunY = Config.H_INT * 0.18;
    if (!_sunGlowGrad) {
      _sunGlowGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 200);
      _sunGlowGrad.addColorStop(0.0, 'rgba(255,240,120,1)'); _sunGlowGrad.addColorStop(0.15, 'rgba(255,200,60,0.85)');
      _sunGlowGrad.addColorStop(0.5, 'rgba(255,180,30,0.25)'); _sunGlowGrad.addColorStop(1.0, 'rgba(255,150,0,0)');
    }
    ctx.fillStyle = _sunGlowGrad; ctx.fillRect(sunX - 200, sunY - 200, 400, 400);

    ctx.save(); ctx.translate(sunX, sunY); ctx.globalAlpha = 0.12; ctx.fillStyle = '#FFE580';
    for (let i = 0; i < 12; i++) {
      ctx.save(); ctx.rotate((i / 12) * Math.PI * 2 + scroll.sky * 0.1);
      ctx.beginPath(); ctx.moveTo(-3, -60); ctx.lineTo(3, -60); ctx.lineTo(8, -400); ctx.lineTo(-8, -400); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function _drawClouds(ctx) {
    clouds.forEach(c => {
      ctx.save(); ctx.globalAlpha = 0.82; ctx.fillStyle = 'rgba(255,255,255,0.92)';
      const cloudParts = [{ dx: 0, dy: 0, r: c.r }, { dx: c.r * 0.7, dy: c.r * 0.2, r: c.r * 0.75 }, { dx: -c.r * 0.65, dy: c.r * 0.25, r: c.r * 0.7 }, { dx: c.r * 1.3, dy: c.r * 0.5, r: c.r * 0.55 }, { dx: -c.r * 1.2, dy: c.r * 0.5, r: c.r * 0.5 }];
      cloudParts.forEach(p => { ctx.beginPath(); ctx.arc(c.x + p.dx, c.y + p.dy, p.r, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 0.10; ctx.fillStyle = '#7ECEF4';
      ctx.beginPath(); ctx.ellipse(c.x + c.r * 0.1, c.y + c.r * 0.9, c.r * 1.4, c.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  function _drawFarPalms(ctx, groundY) {
    palms.forEach(p => {
      const px = ((p.x - scroll.farPalm % Config.W_INT) + Config.W_INT) % Config.W_INT;
      _drawPalmTree(ctx, px, groundY, p.size * 0.65, 0.45);
    });
  }

  function _drawPalmTree(ctx, x, groundY, scale, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; const s = scale;
    const trunkGrad = ctx.createLinearGradient(x - 12 * s, 0, x + 12 * s, 0);
    trunkGrad.addColorStop(0, '#5D4037'); trunkGrad.addColorStop(0.5, '#8D6E63'); trunkGrad.addColorStop(1, '#5D4037');
    ctx.fillStyle = trunkGrad; ctx.beginPath(); ctx.moveTo(x - 10 * s, groundY);
    ctx.bezierCurveTo(x - 8 * s, groundY - 120 * s, x + 5 * s, groundY - 200 * s, x + 2 * s, groundY - 260 * s);
    ctx.bezierCurveTo(x + 10 * s, groundY - 200 * s, x + 14 * s, groundY - 120 * s, x + 12 * s, groundY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2 * s;
    for (let i = 1; i <= 5; i++) { const ty = groundY - i * 44 * s; ctx.beginPath(); ctx.moveTo(x - 10 * s + i * 0.5, ty); ctx.bezierCurveTo(x, ty - 4 * s, x + 4 * s, ty - 4 * s, x + 10 * s - i * 0.5, ty); ctx.stroke(); }
    const frondColors = ['#2D6A4F', '#40916C', '#52B788', '#1B4332']; const topX = x + 2 * s; const topY = groundY - 260 * s;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI * 0.15; const len = (100 + Math.sin(i * 1.3) * 30) * s;
      const midX = topX + Math.cos(angle) * len * 0.5; const midY = topY + Math.sin(angle) * len * 0.3 + 20 * s;
      const endX = topX + Math.cos(angle) * len; const endY = topY + Math.sin(angle) * len + 30 * s;
      ctx.fillStyle = frondColors[i % frondColors.length];
      ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo(midX - 12 * s, midY, endX, endY); ctx.quadraticCurveTo(midX + 12 * s, midY, topX, topY); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#6D4C2A'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(topX + (i - 1) * 14 * s, topY + 10 * s, 8 * s, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function _drawSea(ctx, groundY) {
    const seaLayers = [
      { yBase: groundY * 0.68, amp: 18, freq: 0.003, speed: scroll.midSea * 0.5, color: 'rgba(0,119,182,0.55)' },
      { yBase: groundY * 0.72, amp: 12, freq: 0.004, speed: scroll.midSea, color: 'rgba(0,150,210,0.50)' },
      { yBase: groundY * 0.75, amp: 8, freq: 0.005, speed: scroll.nearSea, color: 'rgba(0,180,216,0.45)' },
    ];
    seaLayers.forEach(layer => {
      ctx.fillStyle = layer.color; ctx.beginPath(); ctx.moveTo(0, Config.H_INT); ctx.lineTo(0, layer.yBase);
      for (let x = 0; x <= Config.W_INT; x += 6) ctx.lineTo(x, layer.yBase + Math.sin((x + layer.speed) * layer.freq) * layer.amp);
      ctx.lineTo(Config.W_INT, Config.H_INT); ctx.closePath(); ctx.fill();
    });
    ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    for (let w = 0; w < 4; w++) {
      const waveOff = (scroll.nearSea * 1.2 + w * Config.W_INT * 0.25) % Config.W_INT; ctx.beginPath();
      for (let x = -50; x <= Config.W_INT + 50; x += 8) { const xw = x + waveOff; const y = groundY * 0.73 + Math.sin(x * 0.012) * 10; x === -50 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function _drawSand(ctx, groundY) {
    if (!_sandGrad) {
      _sandGrad = ctx.createLinearGradient(0, groundY * 0.76, 0, Config.H_INT);
      _sandGrad.addColorStop(0.0, '#FFE5B4'); _sandGrad.addColorStop(0.3, '#F4C87A'); _sandGrad.addColorStop(0.7, '#E8B860'); _sandGrad.addColorStop(1.0, '#D4A040');
    }
    ctx.fillStyle = _sandGrad; ctx.fillRect(0, groundY * 0.76, Config.W_INT, Config.H_INT - groundY * 0.76);
    ctx.save(); ctx.globalAlpha = 0.12;
    for (let i = 0; i < 80; i++) {
      const sx = (i * 237 + scroll.sand * 0.8) % Config.W_INT; const sy = groundY * 0.8 + (i * 53 % (Config.H_INT - groundY * 0.8));
      ctx.fillStyle = i % 2 === 0 ? '#A0763A' : '#FFD090'; ctx.beginPath(); ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function _drawBeachDeco(ctx) {
    ctx.save();
    for (const d of beachDeco) {
      const dx = ((d.x - scroll.sand * 0.9) % (Config.W_INT + 200) + (Config.W_INT + 200)) % (Config.W_INT + 200) - 100;
      const dy = Config.H_INT - 26 - d.size * 0.4;

      if (d.type === 'rock') {
        ctx.fillStyle = 'rgba(90, 70, 50, 0.55)'; ctx.beginPath();
        ctx.ellipse(dx, dy, d.size, d.size * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath();
        ctx.ellipse(dx - d.size * 0.25, dy - d.size * 0.2, d.size * 0.3, d.size * 0.16, -0.4, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255, 245, 235, 0.85)'; ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const ang = Math.PI + (i / 6) * Math.PI; const r = d.size * 0.5;
          const px = dx + Math.cos(ang) * r; const py = dy + Math.sin(ang) * r * 0.6;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(220, 170, 150, 0.6)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.restore();
  }

  function _drawBirds(ctx) {
    if (!hornbillEvents.length) return;
    ctx.save();
    hornbillEvents.forEach(b => {
      const bx = b.x; const by = b.y + Math.sin(b.flap * 0.4) * 14;
      const flapCycle = Math.sin(b.flap * 2); const wingAngle = flapCycle > 0.75 ? (flapCycle - 0.75) * 4 : 0.04;
      ctx.save(); ctx.translate(bx, by); ctx.scale(b.dir * b.scale, b.scale);
      ctx.fillStyle = 'rgba(18,18,18,0.88)'; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-28, -6 - wingAngle * 22, -46, 2 - wingAngle * 6); ctx.quadraticCurveTo(-24, 7, -3, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(238,235,228,0.9)'; ctx.beginPath(); ctx.ellipse(-37, -wingAngle * 5, 7, 2.6, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(18,18,18,0.9)'; ctx.beginPath(); ctx.moveTo(3, 0); ctx.quadraticCurveTo(28, -6 - wingAngle * 22, 46, 2 - wingAngle * 6); ctx.quadraticCurveTo(24, 7, 3, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(238,235,228,0.9)'; ctx.beginPath(); ctx.ellipse(37, -wingAngle * 5, 7, 2.6, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(18,18,18,0.9)'; ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(-23, 3); ctx.lineTo(-23, 6); ctx.lineTo(-5, 4.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(238,235,228,0.9)'; ctx.fillRect(-23, 2.5, 4, 4);
      ctx.fillStyle = 'rgba(18,18,18,0.94)'; ctx.beginPath(); ctx.ellipse(0, 1.5, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(18,18,18,0.96)'; ctx.beginPath(); ctx.arc(10, -1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#E8A33D'; ctx.beginPath(); ctx.moveTo(13, -2.5); ctx.quadraticCurveTo(25, -1.5, 23, 3); ctx.quadraticCurveTo(17, 2, 13, 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#D48A2E'; ctx.beginPath(); ctx.ellipse(14, -4.2, 4.2, 2.2, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  function _drawButterflies(ctx) {
    ctx.save();
    butterflies.forEach(bf => {
      const bx = ((bf.x - scroll.sky * bf.speed * 30) % (Config.W_INT + 100) + (Config.W_INT + 100)) % (Config.W_INT + 100) - 50;
      const by = bf.yBase + Math.sin(bf.phase * 1.3) * 26;
      const wingSpread = Math.abs(Math.sin(bf.phase * 4)) * 10 + 4;
      ctx.save(); ctx.translate(bx, by); ctx.fillStyle = bf.hue; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(-wingSpread * 0.6, 0, wingSpread * 0.7, wingSpread * 0.5, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(wingSpread * 0.6, 0, wingSpread * 0.7, wingSpread * 0.5, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(60,40,30,0.8)'; ctx.beginPath(); ctx.ellipse(0, 0, 2, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  function _drawGroundLine(ctx, groundY) {
    const lineGrad = ctx.createLinearGradient(0, groundY - 4, 0, groundY + 12);
    lineGrad.addColorStop(0, 'rgba(100,60,0,0.35)'); lineGrad.addColorStop(1, 'rgba(100,60,0,0)');
    ctx.fillStyle = lineGrad; ctx.fillRect(0, groundY - 4, Config.W_INT, 16);
  }

  function _drawWeather(ctx) {
    if (rainOpacity < 0.01) return;
    ctx.save();
    ctx.fillStyle = `rgba(20,40,70,${rainOpacity * 0.16})`;
    ctx.fillRect(0, 0, Config.W_INT, Config.H_INT);

    ctx.globalAlpha = rainOpacity * 0.6;
    ctx.strokeStyle = 'rgba(210,230,255,0.75)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    rainDrops.forEach(d => {
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 8, d.y + d.len); ctx.stroke();
    });
    ctx.restore();
  }

  return { init, reset, update, draw };
})();