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
    if (body.jumpsLeft <= 0) return false;
    const force = body.jumpsLeft === 2 ? JUMP_FORCE : DOUBLE_JUMP;
    body.vy = force;
    body.onGround = false;
    body.jumpsLeft--;
    return true;
  }

  /**
   * AABB collision detection (axis-aligned bounding box)
   * Returns true if the two rects overlap.
   */
  function checkAABB(a, b) {
    const margin = 10; // px forgiveness margin for fairness
    return (
      a.x + margin < b.x + b.w - margin &&
      a.x + a.w - margin > b.x + margin &&
      a.y + margin < b.y + b.h - margin &&
      a.y + a.h - margin > b.y + margin
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