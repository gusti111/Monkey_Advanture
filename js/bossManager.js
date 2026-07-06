/**
 * bossManager.js — Boss Battle Lifecycle & Logic Manager
 *
 * This module orchestrates the entire boss battle sequence, from the
 * initial warning to the boss's defeat. It manages state, updates,
 * collision detection, and rendering for the boss.
 */

const BossManager = (() => {
  // --- Constants ---
  const BOSS_WARNING_DURATION = 2.2;
  const BOSS_FIRST_TIME = 45000;
  const BOSS_REPEAT_TIME = 60000;

  // --- State ---
  let phase = 'none'; // 'none', 'warning', 'fighting'
  let warningTimer = 0;
  let nextBossTime = 0;
  let defeatedCount = 0;

  function init() {
    // Reserved for future use
  }

  function reset() {
    phase = 'none';
    warningTimer = 0;
    nextBossTime = BOSS_FIRST_TIME;
    defeatedCount = 0;
    Boss.despawn();
  }

  /**
   * Main update function for the boss system.
   * @param {number} dt - Delta time in seconds.
   * @param {number} surviveMs - Total time survived in the current run.
   * @param {object} player - The player object.
   * @param {Array} projectiles - Player's projectiles array.
   * @returns {object} An object describing the outcomes of the frame.
   */
  function update(dt, surviveMs, player, projectiles) {
    const groundY = Config.H_INT * Config.GROUND_RATIO;
    const W_INT = Config.W_INT;
    let events = {
      playerShouldDie: false,
      bossWasDefeated: false,
      shake: null,
      shieldUsed: false,
    };

    if (phase === 'none') {
      if (surviveMs >= nextBossTime) {
        phase = 'warning';
        warningTimer = BOSS_WARNING_DURATION;
        Obstacles.pauseSpawning();
        events.shake = { duration: 0.4, magnitude: 6 };
      }
    } else if (phase === 'warning') {
      warningTimer -= dt;
      if (warningTimer <= 0) {
        phase = 'fighting';
        Boss.spawn(groundY, W_INT);
        events.shake = { duration: 0.5, magnitude: 10 };
      }
    } else if (phase === 'fighting') {
      Boss.update(dt, groundY, W_INT, player.x);
      const boss = Boss.getBoss();

      if (boss) {
        // Check collisions
        const collisionResults = _checkBossCollisions(player, projectiles, boss);
        if (collisionResults.playerShouldDie) events.playerShouldDie = true;
        if (collisionResults.shieldUsed) events.shieldUsed = true;
        if (collisionResults.shake) events.shake = collisionResults.shake;

        // Check for boss defeat
        if (boss.state === 'dead') {
          events.bossWasDefeated = true;
          defeatedCount++;
          nextBossTime = surviveMs + BOSS_REPEAT_TIME;
          phase = 'none';
          Boss.despawn();
          Obstacles.resumeSpawning();
        }
      }
    }

    return events;
  }

  function _checkBossCollisions(player, projectiles, boss) {
    let events = { playerShouldDie: false, shieldUsed: false, shake: null };
    if (!boss || boss.state !== 'fighting') return events;

    // Player projectiles vs Boss
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (Physics.checkAABB(p, boss)) {
        p.markedForDeletion = true;
        if (Boss.hit()) {
          AudioController.playSquish();
          ParticleSystem.spawnHitEffect(boss.x + boss.w / 2, boss.y + boss.h * 0.4, '+300');
          events.shake = { duration: 0.18, magnitude: 5 };
        }
      }
    }

    // Player vs Boss body (stomp or side collision)
      if (Physics.checkStomp(player, boss)) {
      player.vy = -650; player.stompFlash = 0.3;
      if (Boss.hit()) {
        AudioController.playStomp();
        ParticleSystem.spawnHitEffect(boss.x + boss.w / 2, boss.y + boss.h * 0.25, '+300');
        events.shake = { duration: 0.2, magnitude: 6 };
      }
    } else if (Physics.checkAABB(player, boss)) {
      events.playerShouldDie = true; // GameManager will check for shield
    }

    // Player vs Boss projectiles
    for (let i = boss.projectiles.length - 1; i >= 0; i--) {
      const r = boss.projectiles[i];
      if (Physics.checkAABB(player, r)) {
        boss.projectiles.splice(i, 1);
        events.playerShouldDie = true; // GameManager will check for shield
      }
    }
    return events;
  }

  function draw(ctx) {
    if (phase === 'fighting') {
      Boss.draw(ctx);
    } else if (phase === 'warning') {
      UIManager.drawBossWarning(ctx, warningTimer);
    }
  }

  function getPhase() {
    return phase;
  }

  function getDefeatedCount() {
    return defeatedCount;
  }

  return { init, reset, update, draw, getPhase, getDefeatedCount };
})();