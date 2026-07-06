/**
 * physics.js — HD Physics Engine
 * Mario-style variable-height jump with delta-time integration
 * Tuned for 1920×1080 internal resolution, scales to any screen
 */

const Physics = (() => {
  // ── Constants (in internal 1080p units) ──
  const GRAVITY_BASE  = 2800;  // px/s² — snappy Mario feel
  const JUMP_FORCE    = -880;  // initial jump velocity (px/s)
  const DOUBLE_JUMP   = -780;  // second jump (slightly weaker)
  const DUCK_SCALE    = 0.5;   // hitbox height multiplier when ducking
  const MAX_FALL      = 1600;  // terminal velocity (px/s)

  /**
   * Integrate a body for one frame.
   * @param {object} body  { x, y, vy, onGround, jumpsLeft, isDucking, w, h, baseH }
   * @param {number} groundY  canvas ground Y in internal units
   * @param {number} dt  delta-time in seconds
   * @param {number} speed  current game speed (for gravity scaling feel)
   */
  function integrate(body, groundY, dt, speed = 1) {
    const gravScale = 1 + (speed - 1) * 0.05; // gravity feels slightly heavier at high speed

    // Apply gravity
    body.vy += GRAVITY_BASE * gravScale * dt;
    if (body.vy > MAX_FALL) body.vy = MAX_FALL;

    // Integrate position
    body.y += body.vy * dt;

    // Duck hitbox
    const targetH = body.isDucking ? body.baseH * DUCK_SCALE : body.baseH;
    body.h = targetH;

    // Snap to ground
    if (body.y + body.h >= groundY) {
      body.y = groundY - body.h;
      body.vy = 0;
      body.onGround = true;
      body.jumpsLeft = 2; // reset double-jump
    } else {
      body.onGround = false;
    }
  }

  /**
   * Attempt a jump. Respects double-jump limit.
   * @returns {boolean} whether a jump was applied
   */
  function applyJump(body) {
    if (body.jumpsLeft <= 0 || body.isDucking) return false;
    const force = body.jumpsLeft === 2 ? JUMP_FORCE : DOUBLE_JUMP;
    body.vy = force;
    body.onGround = false;
    body.jumpsLeft--;
    return true;
  }

  /**
   * AABB collision detection (axis-aligned bounding box)
   * Dilengkapi dengan Dynamic Margin agar tidak merusak hitbox objek kecil (seperti proyektil)
   */
  function checkAABB(a, b) {
    // Mencegah margin menelan objek yang ukurannya lebih kecil dari 20px (misal: Pisang/Peluru)
    // Maksimal pemotongan adalah 10px ATAU 20% dari ukuran objek, mana saja yang lebih kecil.
    const marginX = Math.min(10, a.w * 0.2, b.w * 0.2);
    const marginY = Math.min(10, a.h * 0.2, b.h * 0.2);
    
    return (
      a.x + marginX < b.x + b.w - marginX &&
      a.x + a.w - marginX > b.x + marginX &&
      a.y + marginY < b.y + b.h - marginY &&
      a.y + a.h - marginY > b.y + marginY
    );
  }

  /**
   * Check if player is stomping on top of an obstacle (Mario jump-on).
   * Player must be falling downward and above the obstacle's mid-point.
   */
  function checkStomp(player, obstacle) {
    if (player.vy <= 0) return false; // must be falling
    
    const playerBottom = player.y + player.h;
    const obstacleTop  = obstacle.y;
    // Area yang bisa diinjak adalah 50% bagian atas musuh
    const obstacleVert = obstacle.y + obstacle.h * 0.5; 
    
    return (
      playerBottom >= obstacleTop &&
      playerBottom <= obstacleVert &&
      player.x + player.w > obstacle.x + 10 &&
      player.x < obstacle.x + obstacle.w - 10
    );
  }

  return { integrate, applyJump, checkAABB, checkStomp, DUCK_SCALE };
})();