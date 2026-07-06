/**
 * uiManager.js — UI & Screen Management
 *
 * Handles all interactions with the DOM, including:
 * - Showing and hiding different game screens (menu, shop, game over).
 * - Updating HUD elements.
 * - Managing the main menu mascot animation.
 * - Binding UI-specific event listeners.
 */

const UIManager = (() => {
  const screens = {
    name: document.getElementById('screen-name'),
    story: document.getElementById('screen-story'),
    menu: document.getElementById('screen-menu'),
    shop: document.getElementById('screen-shop'),
    game: document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover'),
  };
  const overlayPause = document.getElementById('overlay-pause');
  const inputName = document.getElementById('input-name');

  // Debug overlay element (created on init)
  let debugOverlay = null;

  // Mascot animation variables
  const mascotCanvas = document.getElementById('menu-mascot');
  const mascotCtx = mascotCanvas ? mascotCanvas.getContext('2d') : null;
  let mascotPlayer = null;
  let mascotRafId = null;
  let mascotLastTime = 0;

  function init(nameCommitCb, gameStartCb, storyContinueCb) {
    document.getElementById('btn-start-name').addEventListener('click', nameCommitCb);
    inputName.addEventListener('keydown', e => { if (e.key === 'Enter') nameCommitCb(); });

    const btnStoryContinue = document.getElementById('btn-story-continue');
    if (btnStoryContinue) btnStoryContinue.addEventListener('click', storyContinueCb);

    // Removed problematic keydown listener for 'Enter'
    // Game start should primarily be triggered by btn-play or specific GameManager logic.
    // Story continue is handled by btn-story-continue.
    // Gameover restart is handled by btn-restart.
  }

  function createDebugOverlay() {
    if (debugOverlay) return;
    debugOverlay = document.createElement('div');
    debugOverlay.id = 'debug-overlay';
    debugOverlay.innerHTML = `<div><span class="key">Pools:</span><br/><span id="dbg-projectiles">P:0</span> <span id="dbg-powerups">U:0</span><br/><span id="dbg-obstacles">O:0</span> <span id="dbg-bossproj">B:0</span></div>`;
    document.body.appendChild(debugOverlay);
  }

  function updateDebug(info = {}) {
    if (!debugOverlay) createDebugOverlay();
    const p = document.getElementById('dbg-projectiles');
    const u = document.getElementById('dbg-powerups');
    const o = document.getElementById('dbg-obstacles');
    const b = document.getElementById('dbg-bossproj');
    if (p) p.textContent = `P:${info.projectilePool || 0}`;
    if (u) u.textContent = `U:${info.powerupPool || 0}`;
    if (o) o.textContent = `O:${info.obstaclesActive || 0}`;
    if (b) b.textContent = `B:${info.bossProjectiles || 0}`;
  }

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    overlayPause.classList.add('hidden');
    if (screens[name]) screens[name].classList.add('active');
  }

  function showPauseOverlay(show) {
    overlayPause.classList.toggle('hidden', !show);
  }

  // --- Screen Changers ---

  function goToMenu() {
    showScreen('menu');
    GameManager.setState('MENU'); // Assumes GameManager has a state setter
    AudioController.stopGameOver();
    AudioController.playMenuBGM();

    // Update menu text content
    document.getElementById('menu-welcome').textContent = `Halo, ${Storage.getUsername()}! 👋`;
    document.getElementById('menu-best-score').textContent = Storage.getBestScore().toLocaleString('id-ID');
    const menuCoinEl = document.getElementById('menu-coin-count');
    if (menuCoinEl) menuCoinEl.textContent = Storage.getCoins().toLocaleString('id-ID');

    startMascotPreview();
  }

  function goToShop() {
    stopMascotPreview();
    showScreen('shop');
    GameManager.setState('SHOP');
    ShopManager.render(); // Delegate to the new ShopManager
  }

  // --- Mascot Animation ---

  function startMascotPreview() {
    if (!mascotCtx) return;
    mascotPlayer = Player.create(mascotCanvas.width / 2 - 34, mascotCanvas.height - 12, 0.82);
    mascotLastTime = performance.now();
    if (mascotRafId) cancelAnimationFrame(mascotRafId);
    mascotRafId = requestAnimationFrame(mascotLoop);
  }

  function stopMascotPreview() {
    if (mascotRafId) cancelAnimationFrame(mascotRafId);
    mascotRafId = null;
  }

  function mascotLoop(ts) {
    if (GameManager.getState() !== 'MENU') return;
    const now = ts || performance.now();
    const dt = Math.min((now - mascotLastTime) / 1000, 0.05);
    mascotLastTime = now;
    Player.updateAnim(mascotPlayer, dt, true);
    mascotCtx.clearRect(0, 0, mascotCanvas.width, mascotCanvas.height);
    Player.drawPortrait(mascotCtx, mascotPlayer, mascotCanvas.width, mascotCanvas.height);
    mascotRafId = requestAnimationFrame(mascotLoop);
  }

  // --- HUD Updates ---

  function updateScore(score, multiplier) {
    document.getElementById('hud-score').textContent = Math.floor(score).toLocaleString('id-ID');
    const multEl = document.getElementById('hud-multiplier');
    if (multiplier > 1.0) { multEl.classList.remove('hidden'); multEl.textContent = `×${multiplier.toFixed(1)}`; }
    else { multEl.classList.add('hidden'); }
  }

  function updateBananaHUD(ammo) {
    const countEl = document.getElementById('hud-banana-count');
    const wrapEl = document.getElementById('hud-banana');
    if (countEl) countEl.textContent = ammo;
    if (wrapEl) wrapEl.classList.toggle('low', ammo <= 2);
  }

  function updateCoinHUD(coins) {
    const el = document.getElementById('hud-coin-count');
    if (el) el.textContent = coins;
  }

  function updateShieldHUD(charges) {
    const wrap = document.getElementById('hud-shield');
    if (!wrap) return;
    if (charges <= 0) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    const countEl = document.getElementById('hud-shield-count');
    if (countEl) countEl.textContent = charges;
  }

  // --- In-Game Render Helpers ---

  function drawStunStars(ctx, p, stunAnimAngle) {
    const cx = p.x + p.w / 2;
    const cy = p.y - 15;
    const starCount = 3;
    const radiusX = 35;
    const radiusY = 10;

    for (let i = 0; i < starCount; i++) {
      const angle = stunAnimAngle + (i / starCount) * Math.PI * 2;
      const sx = cx + Math.cos(angle) * radiusX;
      const sy = cy + Math.sin(angle) * radiusY;
      const scale = Math.sin(angle) > 0 ? 0.6 : 1.0;
      
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle * 1.5);
      ctx.globalAlpha = Math.sin(angle) > 0 ? 0.5 : 1.0;
      ctx.fillStyle = '#FFD93D';
      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const r = (j % 2 === 0) ? 10 * scale : 4 * scale;
        const a = (j / 4) * Math.PI;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPowerupBanner(ctx) {
    ctx.save();
    ctx.fillStyle = 'gold';
    ctx.font = 'bold 45px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 10;
    ctx.fillText('⚡ SKOR x2 AKTIF! ⚡', Config.W_INT / 2, 120);
    ctx.restore();
  }

  function drawBossWarning(ctx, timer) {
    const pulse = 0.55 + Math.sin(timer * 14) * 0.25;
    ctx.save();
    ctx.fillStyle = `rgba(180,0,0,${0.18 + pulse * 0.12})`;
    ctx.fillRect(0, 0, Config.W_INT, Config.H_INT);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 84px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,0,0,0.9)';
    ctx.shadowBlur = 22;
    ctx.globalAlpha = 0.7 + pulse * 0.3;
    ctx.fillText('⚠️ BOSS MENDEKAT! ⚠️', Config.W_INT / 2, Config.H_INT * 0.38);
    ctx.font = 'bold 34px Poppins, sans-serif';
    ctx.fillText('🦀 Kepiting Raksasa', Config.W_INT / 2, Config.H_INT * 0.38 + 60);
    ctx.restore();
  }

  function showGameOverScreen(data) {
    document.getElementById('go-score').textContent = data.score.toLocaleString('id-ID');
    document.getElementById('go-best').textContent = data.best.toLocaleString('id-ID');
    document.getElementById('go-time').textContent = `${data.time}s`;
    document.getElementById('go-mult').textContent = `×${data.multiplier.toFixed(1)}`;
    const goCoinsEl = document.getElementById('go-coins');
    if (goCoinsEl) goCoinsEl.textContent = `+${data.coins} 🪙 (Total: ${data.totalCoins.toLocaleString('id-ID')})`;

    document.getElementById('new-best-badge').classList.toggle('hidden', !data.isNewBest);

    const lb = document.getElementById('leaderboard');
    lb.innerHTML = '';
    if (!data.leaderboard.length) { lb.innerHTML = '<p style="color:rgba(255,255,255,0.5);text-align:center;font-size:0.85rem">Belum ada skor</p>'; }
    else {
      const medals = ['🥇', '🥈', '🥉', '4', '5'];
      data.leaderboard.forEach((entry, i) => {
        const row = document.createElement('div');
        row.className = 'lb-row' + (entry.score === data.score && entry.name === data.username ? ' current' : '');
        row.innerHTML = `<span class="lb-rank">${medals[i] || (i + 1)}</span><span class="lb-name">${entry.name}</span><span class="lb-score">${entry.score.toLocaleString('id-ID')}</span><span class="lb-date">${entry.date || ''}</span>`;
        lb.appendChild(row);
      });
    }
    showScreen('gameover');
  }

  return {
    init,
    showScreen,
    goToMenu,
    goToShop,
    stopMascotPreview,
    inputName, // Expose for the GameManager
    showPauseOverlay,
    updateScore, updateBananaHUD, updateCoinHUD, updateShieldHUD,
    drawStunStars, drawPowerupBanner, drawBossWarning,
    showGameOverScreen,
    createDebugOverlay, updateDebug,
  };
})();