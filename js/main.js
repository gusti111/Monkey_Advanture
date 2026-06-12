/**
 * main.js — Monkey Beach Adventure HD
 * Game Loop, State Machine, HD Background Renderer, Infinite Logarithmic Score Engine
 * Internal resolution: 1920 × 1080 (downscaled to fit viewport)
 */

(() => {
  /* ════════════════════════════════════════════
     CONSTANTS & CONFIG
  ════════════════════════════════════════════ */
  const W_INT  = 1920;  // internal canvas width
  const H_INT  = 1080;  // internal canvas height
  const GROUND_RATIO = 0.78; // groundY as fraction of H_INT
  const GROUND_Y = H_INT * GROUND_RATIO;

  const SPEED_INIT   = 400;   // Kecepatan awal yang wajar dan santai
  const SPEED_SCALE  = 110;   // Kurva redam: perlahan di awal, lalu mendaki tanpa batas (Infinite)
  const SCORE_TIME_M = 0.035; // Faktor pengali score dasar per ms

  /* ════════════════════════════════════════════
     STATE MACHINE
  ════════════════════════════════════════════ */
  const STATE = { NAME: 'NAME', MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAMEOVER: 'GAMEOVER' };
  let gameState = STATE.NAME;

  /* ════════════════════════════════════════════
     CANVAS & CONTEXT
  ════════════════════════════════════════════ */
  const canvas  = document.getElementById('game-canvas');
  const ctx     = canvas.getContext('2d');

  function resizeCanvas() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const aspect = W_INT / H_INT;
    let cw, ch;
    if (vw / vh > aspect) { ch = vh; cw = ch * aspect; }
    else                  { cw = vw; ch = cw / aspect; }
    canvas.width  = W_INT;
    canvas.height = H_INT;
    canvas.style.width  = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.style.left   = ((vw - cw) / 2) + 'px';
    canvas.style.top    = ((vh - ch) / 2) + 'px';
    canvas.style.position = 'absolute';
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  /* ════════════════════════════════════════════
     AUDIO CONTROLLER (GHOST LISTENER SYSTEM)
  ════════════════════════════════════════════ */
  const AudioController = (() => {
    let isMuted = false;

    // ── Musik Latar (BGM) ──
    const bgmMenu = new Audio('assets/audio/bgm_menu.mp3'); 
    bgmMenu.loop = true;
    bgmMenu.volume = 0.40;

    const bgmBeach = new Audio('assets/audio/monkey_beach_sound.ogg'); 
    bgmBeach.loop = true;
    bgmBeach.volume = 0.35;

    // ── Efek Suara (SFX) ──
    const fxJump = new Audio('assets/audio/jump.flac');
    fxJump.volume = 0.6;

    const fxStomp = new Audio('assets/audio/stomp.flac');
    fxStomp.volume = 0.7;

    const fxSquish = new Audio('assets/audio/squish.mp3');
    fxSquish.volume = 0.6;

    const fxNormalCoin = new Audio('assets/audio/coin.flac');     
    fxNormalCoin.volume = 0.5;

    const fxChestCoin = new Audio('assets/audio/fx_coin.flac');    
    fxChestCoin.volume = 0.65;

    const fxGameOver = new Audio('assets/audio/fx_gameover.ogg');  
    fxGameOver.volume = 0.7;

    function init() {
      const btnAudio = document.getElementById('btn-audio');
      if (!btnAudio) return;

      btnAudio.addEventListener('click', toggleMute);
      document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'm' && gameState !== STATE.NAME) {
          toggleMute();
        }
      });
    }

    function toggleMute() {
      isMuted = !isMuted;
      const btnAudio = document.getElementById('btn-audio');
      if (!btnAudio) return;

      bgmMenu.muted      = isMuted;
      bgmBeach.muted     = isMuted;
      fxJump.muted       = isMuted;
      fxStomp.muted      = isMuted;
      fxSquish.muted     = isMuted;
      fxNormalCoin.muted = isMuted;
      fxChestCoin.muted  = isMuted;
      fxGameOver.muted   = isMuted;

      if (isMuted) {
        btnAudio.textContent = '🔇';
        btnAudio.style.background = 'rgba(231, 76, 60, 0.5)';
      } else {
        btnAudio.textContent = '🔊';
        btnAudio.style.background = 'rgba(0, 0, 0, 0.35)';
      }
    }

    function playMenuBGM() {
      if (!isMuted) {
        bgmBeach.pause();
        const playPromise = bgmMenu.play();
        
        // IDE LIAR: Ghost Listener untuk menembus pemblokiran Autoplay bagi pemain lama
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            const startGhostAudio = () => {
              if (gameState === STATE.MENU && !isMuted) bgmMenu.play();
              // Bunuh diri event listener setelah sukses dijalankan agar efisien
              document.removeEventListener('click', startGhostAudio);
              document.removeEventListener('keydown', startGhostAudio);
            };
            document.addEventListener('click', startGhostAudio);
            document.addEventListener('keydown', startGhostAudio);
          });
        }
      }
    }

    function stopMenuBGM() { bgmMenu.pause(); bgmMenu.currentTime = 0; }

    function playBeachBGM() {
      if (!isMuted) {
        bgmMenu.pause();
        bgmBeach.play().catch(() => {});
      }
    }
    function pauseBeachBGM() { bgmBeach.pause(); }
    function stopBeachBGM()  { bgmBeach.pause(); bgmBeach.currentTime = 0; }

    function playJump() { if (!isMuted) { fxJump.currentTime = 0; fxJump.play(); } }
    function playStomp() { if (!isMuted) { fxStomp.currentTime = 0; fxStomp.play(); } }
    function playSquish() { if (!isMuted) { fxSquish.currentTime = 0; fxSquish.play(); } }
    function playNormalCoin() { if (!isMuted) { fxNormalCoin.currentTime = 0; fxNormalCoin.play(); } }
    function playChestCoin() { if (!isMuted) { fxChestCoin.currentTime = 0; fxChestCoin.play(); } }
    
    function playGameOver() { 
      if (!isMuted) { 
        fxGameOver.currentTime = 0; 
        fxGameOver.play(); 
      } 
    }

    function stopGameOver() {
      fxGameOver.pause();
      fxGameOver.currentTime = 0;
    }

    return { 
      init, toggleMute, 
      playMenuBGM, stopMenuBGM, 
      playBeachBGM, pauseBeachBGM, stopBeachBGM, 
      playJump, playStomp, playSquish, playNormalCoin, playChestCoin, 
      playGameOver, stopGameOver 
    };
  })();

  /* ════════════════════════════════════════════
     GAME VARIABLES
  ════════════════════════════════════════════ */
  let player, speed, score, surviveMs, multiplier, maxMultiplier;
  let lastTime = 0;
  let rafId    = null;
  let username = '';

  const scroll = { sky: 0, farPalm: 0, midSea: 0, nearSea: 0, sand: 0 };
  const SCROLL_SPEED = { sky: 0.02, farPalm: 0.08, midSea: 0.20, nearSea: 0.35, sand: 1.0 };

  const clouds = [
    { x: 300,  y: 80,  r: 70, speed: 0.03 },
    { x: 750,  y: 130, r: 55, speed: 0.025 },
    { x: 1200, y: 60,  r: 90, speed: 0.035 },
    { x: 1600, y: 100, r: 65, speed: 0.02  },
  ];

  const palms = [
    { x: 200,  size: 1.0 },
    { x: 600,  size: 0.8 },
    { x: 1100, size: 1.1 },
    { x: 1500, size: 0.9 },
    { x: 1800, size: 1.0 },
  ];

  const beachDeco = Array.from({ length: 12 }, (_, i) => ({
    x: i * 165 + Math.random() * 60,
    type: Math.random() > 0.5 ? 'rock' : 'shell',
    size: 6 + Math.random() * 10,
  }));

  /* ════════════════════════════════════════════
     DOM REFS
  ════════════════════════════════════════════ */
  const screens = {
    name:     document.getElementById('screen-name'),
    menu:     document.getElementById('screen-menu'),
    game:     document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover'),
  };
  const overlayPause = document.getElementById('overlay-pause');

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    overlayPause.classList.add('hidden');
    if (screens[name]) screens[name].classList.add('active');
  }

  /* ════════════════════════════════════════════
     NAME SCREEN LOGIC
  ════════════════════════════════════════════ */
  const inputName  = document.getElementById('input-name');
  const btnStartName = document.getElementById('btn-start-name');

  function initNameScreen() {
    const saved = Storage.getUsername();
    if (saved) {
      username = saved;
      goToMenu(); // Ini memicu Bypass Autoplay Ghost Listener beraksi di belakang layar
      return;
    }
    showScreen('name');
    gameState = STATE.NAME;
    inputName.focus();
  }

  function commitName() {
    const val = inputName.value.trim();
    if (!val) { 
      inputName.classList.add('shake'); 
      setTimeout(() => inputName.classList.remove('shake'), 400); 
      return; 
    }
    username = Storage.setUsername(val);

    // Memicu BGM Beranda dari klik valid
    AudioController.playMenuBGM(); 
    goToMenu();
  }

  btnStartName.addEventListener('click', commitName);
  inputName.addEventListener('keydown', e => { if (e.key === 'Enter') commitName(); });

  /* ════════════════════════════════════════════
     MENU SCREEN LOGIC (BERANDA GAME)
  ════════════════════════════════════════════ */
  function goToMenu() {
    showScreen('menu');
    gameState = STATE.MENU;
    
    AudioController.stopGameOver();
    AudioController.playMenuBGM();

    document.getElementById('menu-welcome').textContent = `Halo, ${username}! 👋`;
    document.getElementById('menu-best-score').textContent = Storage.getBestScore().toLocaleString('id-ID');
  }

  document.getElementById('btn-play').addEventListener('click', startGame);
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && gameState === STATE.MENU) startGame();
  });

  /* ════════════════════════════════════════════
     GAME START / RESET
  ════════════════════════════════════════════ */
  function startGame() {
    showScreen('game');
    gameState = STATE.PLAYING;
    resizeCanvas();

    speed       = SPEED_INIT;
    score       = 0;
    surviveMs   = 0;
    multiplier  = 1;
    maxMultiplier = 1;
    lastTime    = performance.now(); 

    Object.keys(scroll).forEach(k => scroll[k] = 0);
    Obstacles.reset();
    player = Player.create(200, GROUND_Y, 1.0);

    AudioController.stopGameOver();
    AudioController.stopMenuBGM();
    AudioController.playBeachBGM();

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);

    updateHUD();
  }

  /* ════════════════════════════════════════════
     MAIN GAME LOOP
  ════════════════════════════════════════════ */
  function loop(timestamp) {
    if (gameState !== STATE.PLAYING) return;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    rafId = requestAnimationFrame(loop);
  }

  /* ════════════════════════════════════════════
     UPDATE ENGINE
  ════════════════════════════════════════════ */
  function update(dt) {
    if (Input.consumePause()) { pauseGame(); return; }
    if (Input.consumeJump())  { 
      if (Physics.applyJump(player)) {
        AudioController.playJump(); 
      }
    }
    player.isDucking = Input.isDucking();

    Physics.integrate(player, GROUND_Y, dt, speed / SPEED_INIT);
    Player.updateAnim(player, dt);

    // KURVA FISIKA BARU: Merayap halus di awal, tanpa batas maksimal di akhir.
    surviveMs += dt * 1000;
    const timeInSeconds = surviveMs / 1000;
    speed = SPEED_INIT + (SPEED_SCALE * Math.log(1 + timeInSeconds));

    multiplier = parseFloat((speed / SPEED_INIT).toFixed(1));
    if (multiplier > maxMultiplier) maxMultiplier = multiplier;

    score = Math.floor(surviveMs * SCORE_TIME_M * multiplier);

    Obstacles.update(dt, speed, GROUND_Y, W_INT);
    checkCollisions();

    const scrollBase = speed * dt;
    scroll.sky      += scrollBase * SCROLL_SPEED.sky;
    scroll.farPalm  += scrollBase * SCROLL_SPEED.farPalm;
    scroll.midSea   += scrollBase * SCROLL_SPEED.midSea;
    scroll.nearSea  += scrollBase * SCROLL_SPEED.nearSea;
    scroll.sand     += scrollBase * SCROLL_SPEED.sand;

    clouds.forEach(c => { c.x -= speed * c.speed * dt; if (c.x + 120 < 0) c.x = W_INT + 100; });

    updateHUD();
  }

  function checkCollisions() {
    const obs = Obstacles.getPool();
    for (const o of obs) {
      if (!o.alive || o.collected) continue;

      if (Physics.checkStomp(player, o) && o.canStomp) {
        player.vy     = -600;
        player.stompFlash = 0.3;
        
        if (o.type === 'CRAB') {
          AudioController.playSquish(); 
        } else if (o.type === 'CHEST') {
          AudioController.playChestCoin(); 
        } else {
          AudioController.playStomp();  
        }

        const pts = o.points || 200;
        score += pts;
        surviveMs += pts / SCORE_TIME_M / multiplier; 
        Obstacles.collect(o);

      } else if (Physics.checkAABB(player, o)) {
        if (o.type === 'COIN') {
          score += o.points;
          AudioController.playNormalCoin(); 
          Obstacles.collect(o);
        } else if (o.type === 'CHEST') {
          score += o.points;
          AudioController.playChestCoin(); 
          Obstacles.collect(o);
        } else {
          gameOver();
          return;
        }
      }
    }
  }

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  function render() {
    ctx.clearRect(0, 0, W_INT, H_INT);

    drawSky();
    drawClouds();
    drawFarPalms();
    drawSea();
    drawSand();
    drawBeachDeco();

    Obstacles.draw(ctx, GROUND_Y);
    Player.draw(ctx, player);

    drawGroundLine();
  }

  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y * 0.7);
    grad.addColorStop(0.0, '#38B6FF');
    grad.addColorStop(0.4, '#7ECEF4');
    grad.addColorStop(0.7, '#FFD580');
    grad.addColorStop(1.0, '#FFB703');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W_INT, GROUND_Y * 0.7);

    const sunX = W_INT * 0.82;
    const sunY = H_INT * 0.18;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 200);
    sunGlow.addColorStop(0.0, 'rgba(255,240,120,1)');
    sunGlow.addColorStop(0.15, 'rgba(255,200,60,0.85)');
    sunGlow.addColorStop(0.5, 'rgba(255,180,30,0.25)');
    sunGlow.addColorStop(1.0, 'rgba(255,150,0,0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(sunX - 200, sunY - 200, 400, 400);

    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle   = '#FFE580';
    for (let i = 0; i < 12; i++) {
      ctx.save();
      ctx.rotate((i / 12) * Math.PI * 2 + scroll.sky * 0.1);
      ctx.beginPath();
      ctx.moveTo(-3, -60);
      ctx.lineTo(3, -60);
      ctx.lineTo(8, -400);
      ctx.lineTo(-8, -400);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawClouds() {
    clouds.forEach(c => {
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      const cloudParts = [
        { dx: 0,        dy: 0,       r: c.r },
        { dx: c.r * 0.7, dy: c.r * 0.2, r: c.r * 0.75 },
        { dx: -c.r * 0.65, dy: c.r * 0.25, r: c.r * 0.7 },
        { dx: c.r * 1.3, dy: c.r * 0.5,  r: c.r * 0.55 },
        { dx: -c.r * 1.2, dy: c.r * 0.5, r: c.r * 0.5  },
      ];
      cloudParts.forEach(p => {
        ctx.beginPath();
        ctx.arc(c.x + p.dx, c.y + p.dy, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = '#7ECEF4';
      ctx.beginPath();
      ctx.ellipse(c.x + c.r * 0.1, c.y + c.r * 0.9, c.r * 1.4, c.r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawFarPalms() {
    palms.forEach(p => {
      const px = ((p.x - scroll.farPalm % W_INT) + W_INT) % W_INT;
      drawPalmTree(ctx, px, GROUND_Y, p.size * 0.65, 0.45);
    });
  }

  function drawPalmTree(ctx, x, groundY, scale, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const s = scale;

    const trunkGrad = ctx.createLinearGradient(x - 12 * s, 0, x + 12 * s, 0);
    trunkGrad.addColorStop(0, '#5D4037');
    trunkGrad.addColorStop(0.5, '#8D6E63');
    trunkGrad.addColorStop(1, '#5D4037');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, groundY);
    ctx.bezierCurveTo(x - 8 * s, groundY - 120 * s, x + 5 * s, groundY - 200 * s, x + 2 * s, groundY - 260 * s);
    ctx.bezierCurveTo(x + 10 * s, groundY - 200 * s, x + 14 * s, groundY - 120 * s, x + 12 * s, groundY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2 * s;
    for (let i = 1; i <= 5; i++) {
      const ty = groundY - i * 44 * s;
      ctx.beginPath();
      ctx.moveTo(x - 10 * s + i * 0.5, ty);
      ctx.bezierCurveTo(x, ty - 4 * s, x + 4 * s, ty - 4 * s, x + 10 * s - i * 0.5, ty);
      ctx.stroke();
    }

    const frondColors = ['#2D6A4F', '#40916C', '#52B788', '#1B4332'];
    const topX = x + 2 * s;
    const topY = groundY - 260 * s;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI * 0.15;
      const len   = (100 + Math.sin(i * 1.3) * 30) * s;
      const midX  = topX + Math.cos(angle) * len * 0.5;
      const midY  = topY + Math.sin(angle) * len * 0.3 + 20 * s;
      const endX  = topX + Math.cos(angle) * len;
      const endY  = topY + Math.sin(angle) * len + 30 * s;
      ctx.fillStyle = frondColors[i % frondColors.length];
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(midX - 12 * s, midY, endX, endY);
      ctx.quadraticCurveTo(midX + 12 * s, midY, topX, topY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#6D4C2A';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(topX + (i - 1) * 14 * s, topY + 10 * s, 8 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSea() {
    const seaLayers = [
      { yBase: GROUND_Y * 0.68, amp: 18, freq: 0.003, speed: scroll.midSea * 0.5,  color: 'rgba(0,119,182,0.55)' },
      { yBase: GROUND_Y * 0.72, amp: 12, freq: 0.004, speed: scroll.midSea,         color: 'rgba(0,150,210,0.50)' },
      { yBase: GROUND_Y * 0.75, amp: 8,  freq: 0.005, speed: scroll.nearSea,        color: 'rgba(0,180,216,0.45)' },
    ];

    seaLayers.forEach(layer => {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, H_INT);
      ctx.lineTo(0, layer.yBase);
      for (let x = 0; x <= W_INT; x += 6) {
        const y = layer.yBase + Math.sin((x + layer.speed) * layer.freq) * layer.amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W_INT, H_INT);
      ctx.closePath();
      ctx.fill();
    });

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth   = 3;
    for (let w = 0; w < 4; w++) {
      const waveOff = (scroll.nearSea * 1.2 + w * W_INT * 0.25) % W_INT;
      ctx.beginPath();
      for (let x = -50; x <= W_INT + 50; x += 8) {
        const xw = x + waveOff;
        const y = GROUND_Y * 0.73 + Math.sin(x * 0.012) * 10;
        x === -50 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSand() {
    const sandGrad = ctx.createLinearGradient(0, GROUND_Y * 0.76, 0, H_INT);
    sandGrad.addColorStop(0.0, '#FFE5B4');
    sandGrad.addColorStop(0.3, '#F4C87A');
    sandGrad.addColorStop(0.7, '#E8B860');
    sandGrad.addColorStop(1.0, '#D4A040');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, GROUND_Y * 0.76, W_INT, H_INT - GROUND_Y * 0.76);

    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 80; i++) {
      const sx = (i * 237 + scroll.sand * 0.8) % W_INT;
      const sy = GROUND_Y * 0.8 + (i * 53 % (H_INT - GROUND_Y * 0.8));
      ctx.fillStyle = i % 2 === 0 ? '#A0763A' : '#FFD090';
      ctx.beginPath();
      ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBeachDeco() {
    beachDeco.forEach(d => {
      const dx = ((d.x - scroll.sand % W_INT) + W_INT * 2) % W_INT;
      const dy = GROUND_Y + d.size * 0.5;
      if (d.type === 'rock') {
        ctx.fillStyle = '#A08060';
        ctx.beginPath();
        ctx.ellipse(dx, dy, d.size, d.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(dx - d.size * 0.2, dy - d.size * 0.15, d.size * 0.4, d.size * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#F4C8A0';
        ctx.beginPath();
        ctx.arc(dx, dy, d.size * 0.6, 0, Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#C8906A';
        ctx.lineWidth = 1.5;
        for (let r = 0; r < 4; r++) {
          ctx.beginPath();
          ctx.arc(dx, dy, d.size * 0.15 * (r + 1), 0, Math.PI);
          ctx.stroke();
        }
      }
    });
  }

  function drawGroundLine() {
    const lineGrad = ctx.createLinearGradient(0, GROUND_Y - 4, 0, GROUND_Y + 12);
    lineGrad.addColorStop(0, 'rgba(100,60,0,0.35)');
    lineGrad.addColorStop(1, 'rgba(100,60,0,0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, GROUND_Y - 4, W_INT, 16);
  }

  /* ════════════════════════════════════════════
     HUD UPDATE
  ════════════════════════════════════════════ */
  function updateHUD() {
    document.getElementById('hud-score').textContent = Math.floor(score).toLocaleString('id-ID');
    const multEl = document.getElementById('hud-multiplier');
    if (multiplier > 1.0) {
      multEl.classList.remove('hidden');
      multEl.textContent = `×${multiplier.toFixed(1)}`;
    } else {
      multEl.classList.add('hidden');
    }
  }

  /* ════════════════════════════════════════════
     PAUSE / RESUME SYSTEM
  ════════════════════════════════════════════ */
  document.getElementById('btn-pause').addEventListener('click', pauseGame);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-quit').addEventListener('click', () => { resumeGame(); goToMenu(); });

  function pauseGame() {
    if (gameState !== STATE.PLAYING) return;
    gameState = STATE.PAUSED;
    AudioController.pauseBeachBGM(); 
    cancelAnimationFrame(rafId);
    overlayPause.classList.remove('hidden');
  }

  function resumeGame() {
    if (gameState !== STATE.PAUSED) return;
    overlayPause.classList.add('hidden');
    gameState = STATE.PLAYING;
    AudioController.playBeachBGM(); 
    lastTime  = performance.now(); 
    rafId     = requestAnimationFrame(loop);
  }

  /* ════════════════════════════════════════════
     GAME OVER
  ════════════════════════════════════════════ */
  function gameOver() {
    gameState = STATE.GAMEOVER;
    cancelAnimationFrame(rafId);
    
    AudioController.stopBeachBGM(); 
    AudioController.playGameOver(); 

    const finalScore = Math.floor(score);
    const { isNewBest } = Storage.saveScore({
      name: username,
      score: finalScore,
      time: Math.floor(surviveMs / 1000),
      multiplier: maxMultiplier,
    });

    document.getElementById('go-score').textContent = finalScore.toLocaleString('id-ID');
    document.getElementById('go-best').textContent  = Storage.getBestScore().toLocaleString('id-ID');
    document.getElementById('go-time').textContent  = `${Math.floor(surviveMs / 1000)}s`;
    document.getElementById('go-mult').textContent  = `×${maxMultiplier.toFixed(1)}`;

    const badgeEl = document.getElementById('new-best-badge');
    if (isNewBest) badgeEl.classList.remove('hidden');
    else           badgeEl.classList.add('hidden');

    renderLeaderboard(finalScore);
    showScreen('gameover');
  }

  function renderLeaderboard(currentScore) {
    const lb  = document.getElementById('leaderboard');
    const scores = Storage.getScores();
    lb.innerHTML = '';

    if (!scores.length) {
      lb.innerHTML = '<p style="color:rgba(255,255,255,0.5);text-align:center;font-size:0.85rem">Belum ada skor</p>';
      return;
    }

    const medals = ['🥇', '🥈', '🥉', '4', '5'];
    scores.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'lb-row' + (entry.score === currentScore && entry.name === username ? ' current' : '');
      row.innerHTML = `
        <span class="lb-rank">${medals[i] || (i + 1)}</span>
        <span class="lb-name">${entry.name}</span>
        <span class="lb-score">${entry.score.toLocaleString('id-ID')}</span>
        <span class="lb-date">${entry.date || ''}</span>
      `;
      lb.appendChild(row);
    });
  }

  document.getElementById('btn-restart').addEventListener('click', startGame);
  document.getElementById('btn-menu').addEventListener('click', goToMenu);

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && gameState === STATE.GAMEOVER) startGame();
  });

  /* ════════════════════════════════════════════
     BOOT INITIALIZATION
  ════════════════════════════════════════════ */
  AudioController.init(); 
  initNameScreen();
})();