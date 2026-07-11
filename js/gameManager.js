/**
 * gameManager.js — Core Game State & Loop Orchestrator
 *
 * This module is the new heart of the game, responsible for:
 * - Managing the primary game state (STATE.MENU, STATE.PLAYING, etc.).
 * - Initializing and resetting the game.
 * - Orchestrating the main game loop (update and render).
 * - Holding core game variables like score, speed, and the player object.
 *
 * It imports and delegates tasks to other specialized modules (UI, Shop, Scenery).
 */

const GameManager = (() => {
  // Canvas and context will be needed for rendering
  let canvas, ctx;

  // --- STATE ---
  const STATE = { NAME: 'NAME', STORY: 'STORY', MENU: 'MENU', SHOP: 'SHOP', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAMEOVER: 'GAMEOVER' };
  let gameState = STATE.NAME;

  let player, speed, score, surviveMs, multiplier, maxMultiplier;
  let timeScore = 0;
  let bonusScore = 0;
  let lastTime = 0;
  let rafId = null;
  let username = '';

  // --- GAMEPLAY VARIABLES (Moved from main.js) ---
  let shakeTime = 0, shakeMag = 0;
  let isStunned = false, stunTimer = 0, stunAnimAngle = 0;
  let projectiles = [], throwCooldown = 0;
  const THROW_COOLDOWN_TIME = 0.35;
  let bananaAmmo = 0, bananaEmptyHintShown = false;
  const BANANA_START_AMMO_BASE = 5;
  const BANANA_AMMO_MAX_BASE = 30;
  const BANANA_PICKUP_BONUS = 5;
  let toastTimer = null;
  let upgrades = {};
  let coinsEarnedThisRun = 0;
  let shieldCharges = 0;
  let magnetRadius = 0;
  const MAGNET_TYPES = new Set(['COIN', 'CHEST', 'BANANA']);
  let powerUps = [], powerUpTimer = 0, powerUpActive = false, powerUpDuration = 0;
  const POWERUP_INTERVAL = 12;

  // --- HELPER FUNCTIONS (Moved from main.js) ---
  function getBananaAmmoMax() { return BANANA_AMMO_MAX_BASE + (upgrades.ammo || 0) * 5; }
  function getBananaStartAmmo() { return BANANA_START_AMMO_BASE + (upgrades.ammo || 0); }

  function triggerShake(duration, magnitude) {
    shakeTime = Math.max(shakeTime, duration);
    shakeMag = Math.max(shakeMag, magnitude);
  }

  function showToast(text, duration = 2600) {
    const el = document.getElementById('toast-hint');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    void el.offsetWidth;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.classList.add('hidden'), 400);
    }, duration);
  }

  function init() {
    // Get canvas and context from main.js
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Bind top-level buttons that switch states
    document.getElementById('btn-play').addEventListener('click', startGame);
    document.getElementById('btn-restart').addEventListener('click', startGame);
    document.getElementById('btn-menu').addEventListener('click', UIManager.goToMenu);
    document.getElementById('btn-shop')?.addEventListener('click', UIManager.goToShop);
    document.getElementById('btn-shop-back')?.addEventListener('click', UIManager.goToMenu);
    document.getElementById('btn-gameover-shop')?.addEventListener('click', UIManager.goToShop);
    document.getElementById('btn-pause').addEventListener('click', pauseGame);
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-quit').addEventListener('click', () => { resumeGame(); UIManager.goToMenu(); });

    // Initialize other managers
    UIManager.init(commitName, startGame, continueFromStory);
    Scenery.init();
    AudioController.init();
    BossManager.init();
    ParticleSystem.init();
    Input.init();
    // Auto-pause when tab is hidden, resume when visible (only if auto-paused)
    let wasAutoPaused = false;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && gameState === STATE.PLAYING) {
        pauseGame(); wasAutoPaused = true;
      } else if (!document.hidden && wasAutoPaused) {
        resumeGame(); wasAutoPaused = false;
      }
    });
    
    // Bind input events
    document.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'x') {
        handleThrow();
      }
    });
    // Mobile controls are bound in UIManager or main.js if they remain there

    // Mobile throw button (jump/duck are bound in js/engine/input.js;
    // throw lives here since handleThrow's guards — state, cooldown, ammo —
    // are private to this module). touchstart is used instead of click for
    // lower input latency on mobile, matching how jump/duck respond instantly
    // to touch elsewhere in the game; preventDefault stops the synthetic
    // click that would otherwise also fire and double-trigger the throw.
    const btnThrow = document.getElementById('btn-throw');
    if (btnThrow) {
      btnThrow.addEventListener('touchstart', e => { e.preventDefault(); handleThrow(); }, { passive: false });
      btnThrow.addEventListener('click', handleThrow);
    }

    // Start the game by checking for a username
    const savedUser = Storage.getUsername();
    if (savedUser) {
      username = savedUser;
      UIManager.goToMenu();
    } else {
      UIManager.showScreen('name');
      gameState = STATE.NAME;
    }
  }

  function commitName() {
    const val = UIManager.inputName.value.trim();
    if (!val) {
      UIManager.inputName.classList.add('shake');
      setTimeout(() => UIManager.inputName.classList.remove('shake'), 400);
      return;
    }
    username = Storage.setUsername(val);
    AudioController.playMenuBGM();

    if (Storage.getItem('mbr_story_seen') === '1') {
      UIManager.goToMenu();
    } else {
      UIManager.showScreen('story');
      gameState = STATE.STORY;
    }
  }

  function continueFromStory() {
    Storage.setItem('mbr_story_seen', '1');
    UIManager.goToMenu();
  }

  function startGame() {
    UIManager.showScreen('game');
    gameState = STATE.PLAYING;
    UIManager.stopMascotPreview();
    Scenery.reset();

    // --- FULL GAME RESET LOGIC (Moved from main.js) ---
    const toastEl = document.getElementById('toast-hint');
    if (toastEl) { toastEl.classList.remove('show'); toastEl.classList.add('hidden'); }
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }

    speed = Config.SPEED_INIT;
    score = 0;
    timeScore = 0;
    bonusScore = 0;
    surviveMs = 0;
    multiplier = 1;
    maxMultiplier = 1;

    isStunned = false;
    stunTimer = 0;
    stunAnimAngle = 0;

    projectiles = [];
    throwCooldown = 0;
    upgrades = Storage.getUpgrades();
    bananaAmmo = getBananaStartAmmo();
    bananaEmptyHintShown = false;
    
    ParticleSystem.reset();
    powerUps = [];
    powerUpActive = false;
    powerUpTimer = 0;

    coinsEarnedThisRun = 0;
    shieldCharges = upgrades.shield;
    magnetRadius = upgrades.magnet > 0 ? 90 + upgrades.magnet * 40 : 0;

    Obstacles.reset();
    player = Player.create(200, Config.H_INT * Config.GROUND_RATIO, 1.0);

    BossManager.reset();

    shakeTime = 0; shakeMag = 0;

    AudioController.stopGameOver();
    AudioController.stopMenuBGM();
    AudioController.playBeachBGM();

    lastTime = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);

    updateHUD();
    UIManager.updateBananaHUD(bananaAmmo);
    UIManager.updateCoinHUD(coinsEarnedThisRun);
    UIManager.updateShieldHUD(shieldCharges);
  }

  function loop(timestamp) {
    if (gameState !== STATE.PLAYING) return;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    rafId = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (Input.consumePause()) { pauseGame(); return; }

    if (Input.consumeJump() && !isStunned) {
      if (Physics.applyJump(player)) AudioController.playJump();
    }

    player.isDucking = Input.isDucking() && !isStunned;

    Physics.integrate(player, Config.H_INT * Config.GROUND_RATIO, dt, speed / Config.SPEED_INIT);
    Player.updateAnim(player, dt);

    if (throwCooldown > 0) throwCooldown -= dt;

    ParticleSystem.update(dt);

    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update(dt, Config.W_INT);
        if (projectiles[i].markedForDeletion) {
          if (typeof Projectile !== 'undefined' && Projectile.release) Projectile.release(projectiles[i]);
          projectiles.splice(i, 1);
        }
    }

    powerUpTimer += dt;
    if (powerUpTimer >= POWERUP_INTERVAL) {
      if (typeof PowerUp !== 'undefined' && PowerUp.acquire) powerUps.push(PowerUp.acquire(Config.W_INT, Config.H_INT * Config.GROUND_RATIO));
      else powerUps.push(new PowerUp(Config.W_INT, Config.H_INT * Config.GROUND_RATIO));
      powerUpTimer = 0;
    }
    for (let i = powerUps.length - 1; i >= 0; i--) {
      powerUps[i].update(dt);
      if (powerUps[i].markedForDeletion) {
        if (typeof PowerUp !== 'undefined' && PowerUp.release) PowerUp.release(powerUps[i]);
        powerUps.splice(i, 1);
      }
    }

    if (powerUpActive) {
      powerUpDuration -= dt * 1000;
      if (powerUpDuration <= 0) powerUpActive = false;
    }

    surviveMs += dt * 1000;
    const timeInSeconds = surviveMs / 1000;
    speed = Config.SPEED_INIT + (Config.SPEED_SCALE * Math.log(1 + timeInSeconds));

    multiplier = parseFloat((speed / Config.SPEED_INIT).toFixed(1));
    if (powerUpActive) multiplier *= 2;
    if (multiplier > maxMultiplier) maxMultiplier = multiplier;

    // Update systems
    Obstacles.update(dt, speed, Config.H_INT * Config.GROUND_RATIO, Config.W_INT);
    const bossEvents = BossManager.update(dt, surviveMs, player, projectiles);
    if (bossEvents.shake) {
      triggerShake(bossEvents.shake.duration, bossEvents.shake.magnitude);
    }
    if (bossEvents.bossWasDefeated) {
      const coinReward = 25 + BossManager.getDefeatedCount() * 10; coinsEarnedThisRun += coinReward; UIManager.updateCoinHUD(coinsEarnedThisRun);
      bonusScore += 1000; showToast(`👑 Boss dikalahkan! +${coinReward} 🪙 +1000 poin`, 2400);
    }
    checkCollisions(bossEvents);

    if (isStunned) {
      stunTimer -= dt;
      stunAnimAngle += dt * 8;
      if (stunTimer <= 0) {
        isStunned = false;
        stunTimer = 0;
      }
    }

    timeScore += (dt * 1000) * Config.SCORE_TIME_M * multiplier;
    score = Math.floor(timeScore) + bonusScore;

    Scenery.update(dt, speed, BossManager.getPhase() !== 'none');

    if (shakeTime > 0) { shakeTime -= dt; if (shakeTime <= 0) shakeMag = 0; }
    
    updateHUD();

    // Update debug overlay once per frame with pool sizes
    try {
      const projPool = (typeof Projectile !== 'undefined' && Projectile._pool) ? Projectile._pool.length : 0;
      const upPool = (typeof PowerUp !== 'undefined' && PowerUp._pool) ? PowerUp._pool.length : 0;
      const obsActive = (typeof Obstacles !== 'undefined' && Obstacles.getPool) ? Obstacles.getPool().length : 0;
      const bossProj = (typeof Boss !== 'undefined' && Boss.getBoss && Boss.getBoss()) ? Boss.getBoss().projectiles.length : 0;
      UIManager.updateDebug({ projectilePool: projPool, powerupPool: upPool, obstaclesActive: obsActive, bossProjectiles: bossProj });
    } catch (e) { /* ignore debug errors */ }
  }

  function handleThrow() {
    if (gameState !== STATE.PLAYING || !player) return;
    if (isStunned) {
      showToast('💫 Banu sedang pusing! Tidak bisa melempar pisang!', 1000);
      return;
    }
    if (throwCooldown > 0) return;
    if (bananaAmmo <= 0) {
      showToast('🍌 Amunisi habis! Cari pickup pisang di jalan', 1400);
      return;
    }

      if (typeof Projectile !== 'undefined' && Projectile.acquire) projectiles.push(Projectile.acquire(player.x + player.w, player.y + player.h / 2, Config.W_INT));
      else projectiles.push(new Projectile(player.x + player.w, player.y + player.h / 2, Config.W_INT));
    if (Player.triggerThrow) Player.triggerThrow(player);
    throwCooldown = THROW_COOLDOWN_TIME;
    bananaAmmo--;
    UIManager.updateBananaHUD(bananaAmmo);
    if (bananaAmmo <= 0 && !bananaEmptyHintShown) {
      bananaEmptyHintShown = true;
      showToast('🍌 Pisang habis! Cari pickup 🍌 di jalan buat isi ulang');
    }
  }

  function updateHUD() {
    UIManager.updateScore(score, multiplier);
  }

  function inMagnetRange(o) {
    if (magnetRadius <= 0 || !MAGNET_TYPES.has(o.type)) return false;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const ox = o.x + o.w / 2, oy = o.y + o.h / 2;
    const dx = px - ox, dy = py - oy;
    return (dx * dx + dy * dy) <= magnetRadius * magnetRadius;
  }

  function render() {
    ctx.clearRect(0, 0, Config.W_INT, Config.H_INT);

    ctx.save();
    if (shakeTime > 0) {
      const dx = (Math.random() - 0.5) * shakeMag;
      const dy = (Math.random() - 0.5) * shakeMag;
      ctx.translate(dx, dy);
    }
    Scenery.draw(ctx);

    Obstacles.draw(ctx, Config.H_INT * Config.GROUND_RATIO);
    
    for (const pUp of powerUps) pUp.draw(ctx);
    for (const p of projectiles) p.draw(ctx);
    BossManager.draw(ctx);

    Player.draw(ctx, player);

    if (isStunned && player) {
      UIManager.drawStunStars(ctx, player, stunAnimAngle);
    }

    ParticleSystem.draw(ctx);

    if (powerUpActive) {
      UIManager.drawPowerupBanner(ctx);
    }

    ctx.restore();

    // Boss warning is now drawn by BossManager, so no need to call UIManager for it here.
  }

  function checkCollisions(bossEvents) {
    const obs = Obstacles.getPool();
    const groundY = Config.H_INT * Config.GROUND_RATIO;

    // If the boss triggered an instant-damage event, handle it once per frame
    // instead of inside the obstacle loop to avoid consuming multiple shield
    // charges in a single frame when many obstacles are present.
    if (bossEvents && bossEvents.playerShouldDie) {
      if (shieldCharges > 0) {
        shieldCharges--;
        UIManager.updateShieldHUD(shieldCharges);
        player.stompFlash = 0.35;
        ParticleSystem.spawnHitEffect(player.x + player.w / 2, player.y + player.h / 2, '🛡️');
        AudioController.playStomp();
        showToast('🛡️ Perisai menahan serangan Boss!', 1600);
        if (bossEvents.shake) triggerShake(bossEvents.shake.duration, bossEvents.shake.magnitude);
      } else {
        gameOver();
        return; // End processing this frame — player is dead
      }
    }

    // Player projectiles vs Obstacles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      let p = projectiles[i];
      for (const o of obs) {
        if (!o.alive || o.collected) continue;
        if (Physics.checkAABB(p, o)) {
          p.markedForDeletion = true;
          if (o.canStomp) {
            const pts = (powerUpActive ? (o.points || 300) * 2 : (o.points || 300));
            Obstacles.collect(o);
            AudioController.playSquish();
            bonusScore += 300;
            ParticleSystem.spawnHitEffect(o.x + (o.w || o.width || 0) / 2, o.y + (o.h || o.height || 0) / 2, `+${pts}`);
          }
          break;
        }
      }
    }

    // Player vs Powerups
    for (const pUp of powerUps) {
      if (!pUp.markedForDeletion && Physics.checkAABB(player, pUp)) {
        pUp.markedForDeletion = true; powerUpActive = true; powerUpDuration = 6000;
        bananaAmmo = Math.min(bananaAmmo + BANANA_PICKUP_BONUS, getBananaAmmoMax());
        UIManager.updateBananaHUD(bananaAmmo);
        ParticleSystem.spawnHitEffect(pUp.x + pUp.w / 2, pUp.y + pUp.h / 2, '⚡'); AudioController.playChestCoin();
      }
    }

    // Player vs Obstacles & Collectibles
    for (const o of obs) {
      if (!o.alive || o.collected) continue;

      // --- STOMP COLLISION ---
      if (Physics.checkStomp(player, o) && o.canStomp) {
        player.vy = -600; player.stompFlash = 0.3;

        // Determine points awarded for this stomp so we can show it in the pop
        let pts = 0;
        switch (o.type) {
          case 'CRAB': case 'SNAKE': case 'MONITOR':
            AudioController.playSquish();
            pts = (powerUpActive ? (o.points || 200) * 2 : (o.points || 200));
            bonusScore += (powerUpActive ? (o.points || 200) * 2 : (o.points || 200));
            break;
          case 'CHEST':
            AudioController.playChestCoin();
            pts = (powerUpActive ? (o.points || 500) * 2 : (o.points || 500));
            bonusScore += (powerUpActive ? (o.points || 500) * 2 : (o.points || 500));
            if (o.coinValue) { coinsEarnedThisRun += o.coinValue; UIManager.updateCoinHUD(coinsEarnedThisRun); }
            showToast('📦 Peti dibuka! +500 Poin', 1600);
            break;
          default:
            AudioController.playStomp();
            pts = (powerUpActive ? (o.points || 200) * 2 : (o.points || 200));
            bonusScore += (powerUpActive ? (o.points || 200) * 2 : (o.points || 200));
            break;
        }
        Obstacles.collect(o);
        ParticleSystem.spawnHitEffect(o.x + (o.w || o.width || 0) / 2, o.y + (o.h || o.height || 0) / 2, pts ? `+${pts}` : '');
        continue; // Mencegah objek yang sudah di-stomp diproses lagi sebagai tabrakan samping
      }
      // --- AABB (SIDE) COLLISION or MAGNET PULL ---
      else if (Physics.checkAABB(player, o) || inMagnetRange(o)) {
        switch (o.type) {
          case 'COIN':
            bonusScore += (powerUpActive ? o.points * 2 : o.points);
            coinsEarnedThisRun += (o.coinValue || 0) + (upgrades.coinBoost || 0);
            UIManager.updateCoinHUD(coinsEarnedThisRun);
            AudioController.playNormalCoin();
            Obstacles.collect(o);
            break;
          case 'CHEST': // Side-colliding with a chest makes you dizzy
            isStunned = true; stunTimer = 3.0; triggerShake(0.3, 8);
            bonusScore += (powerUpActive ? (o.points || 500) * 2 : (o.points || 500));
            if (o.coinValue) {
              coinsEarnedThisRun += o.coinValue + (upgrades.coinBoost || 0);
              UIManager.updateCoinHUD(coinsEarnedThisRun);
            }
            showToast('💫 Banu menabrak peti! Pusing selama 3 detik! +500 Poin', 2000);
            AudioController.playChestCoin();
            Obstacles.collect(o);
            break;
          case 'BANANA':
            bonusScore += (powerUpActive ? (o.points || 0) * 2 : (o.points || 0));
            bananaAmmo = Math.min(
              bananaAmmo + (o.ammo || 1) + (upgrades.bananaHarvest || 0),
              getBananaAmmoMax()
            );
            UIManager.updateBananaHUD(bananaAmmo);
            ParticleSystem.spawnHitEffect(o.x + o.w / 2, o.y + o.h / 2, `+${o.ammo || 1}🍌`);
            AudioController.playNormalCoin();
            Obstacles.collect(o);
            break;
          default: // Any other harmful obstacle
            if (shieldCharges > 0) {
              shieldCharges--; UIManager.updateShieldHUD(shieldCharges);
              player.stompFlash = 0.35;
              ParticleSystem.spawnHitEffect(player.x + player.w / 2, player.y + player.h / 2, '🛡️');
              AudioController.playStomp();
              showToast('🛡️ Perisai melindungimu!', 1600);
              Obstacles.collect(o);
            } else {
              gameOver();
              return;
            }
            break;
        }
      }
    }
  }

  function pauseGame() {
    if (gameState !== STATE.PLAYING) return;
    gameState = STATE.PAUSED; AudioController.pauseBeachBGM(); cancelAnimationFrame(rafId);
    UIManager.showPauseOverlay(true);
  }

  function resumeGame() {
    if (gameState !== STATE.PAUSED) return;
    UIManager.showPauseOverlay(false);
    gameState = STATE.PLAYING; AudioController.playBeachBGM(); lastTime = performance.now(); rafId = requestAnimationFrame(loop);
  }

  function gameOver() {
    gameState = STATE.GAMEOVER;
    cancelAnimationFrame(rafId);
    AudioController.stopBeachBGM();
    AudioController.playGameOver();

    const finalScore = Math.floor(score);
    const { isNewBest } = Storage.saveScore({ name: username, score: finalScore, time: Math.floor(surviveMs / 1000), multiplier: maxMultiplier });
    const totalCoins = Storage.addCoins(coinsEarnedThisRun);

    UIManager.showGameOverScreen({
      score: finalScore,
      best: Storage.getBestScore(),
      time: Math.floor(surviveMs / 1000),
      multiplier: maxMultiplier,
      coins: coinsEarnedThisRun,
      totalCoins,
      isNewBest,
      leaderboard: Storage.getScores(),
      username,
    });
  }

  function getState() { return gameState; }
  function setState(newState) { gameState = newState; }

  // Public API
  return {
    init,
    getState,
    setState,
    // Expose for UIManager to use
  };
})();