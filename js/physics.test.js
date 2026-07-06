/**
 * Unit tests for physics.js
 *
 * These tests verify the core game mechanics like gravity, jumping,
 * ducking, and collision detection.
 *
 * To run: You would use a test runner like Jest.
 * `npm install --save-dev jest`
 * and then run `jest` in your terminal.
 *
 * Note: This requires the `Physics` module to be accessible.
 * You might need to adjust your file structure or build process
 * (e.g., using ES6 modules) to import it into the test file.
 * For this example, we'll assume `Physics` is globally available
 * or can be required.
 */

// Mocking the dependencies if they are in separate files.
// If running in a Node.js environment with Jest, you'd do:
// const Physics = require('./physics.js'); // Assuming you export it.

// For this example, let's assume the physics.js file is loaded.

describe('Physics Engine', () => {

  let player;
  const GROUND_Y = 842.4; // 1080 * 0.78
  const DT = 0.016; // Approx 60 FPS

  beforeEach(() => {
    // Create a fresh player object before each test
    player = {
      x: 100, y: GROUND_Y - 96,
      w: 72, h: 96, baseH: 96,
      vy: 0, onGround: true, jumpsLeft: 2,
      isDucking: false,
    };
  });

  describe('integrate', () => {
    it('should apply gravity to a falling player', () => {
      player.onGround = false;
      const initialVy = player.vy;
      Physics.integrate(player, GROUND_Y, DT);
      expect(player.vy).toBeGreaterThan(initialVy);
      expect(player.y).toBeGreaterThan(GROUND_Y - 96);
    });

    it('should not apply gravity when on the ground', () => {
      player.vy = 100; // some downward velocity
      Physics.integrate(player, GROUND_Y, DT);
      expect(player.vy).toBe(0);
      expect(player.y).toBe(GROUND_Y - player.h);
      expect(player.onGround).toBe(true);
    });

    it('should reset jumps when landing on the ground', () => {
      player.jumpsLeft = 0;
      player.y = GROUND_Y; // Force landing
      Physics.integrate(player, GROUND_Y, DT);
      expect(player.jumpsLeft).toBe(2);
    });

    it('should change player height when ducking', () => {
      player.isDucking = true;
      Physics.integrate(player, GROUND_Y, DT);
      expect(player.h).toBe(player.baseH * Physics.DUCK_SCALE);
      expect(player.h).toBe(48);
    });
  });

  describe('applyJump', () => {
    it('should apply an initial jump force', () => {
      const jumped = Physics.applyJump(player);
      expect(jumped).toBe(true);
      expect(player.vy).toBeLessThan(0);
      expect(player.jumpsLeft).toBe(1);
      expect(player.onGround).toBe(false);
    });

    it('should allow a double jump', () => {
      Physics.applyJump(player); // First jump
      const firstJumpVy = player.vy;

      // Simulate some time in the air
      player.y -= 50;

      const doubleJumped = Physics.applyJump(player);
      expect(doubleJumped).toBe(true);
      expect(player.vy).toBeLessThan(0);
      // Double jump force is slightly weaker
      expect(player.vy).toBeGreaterThan(firstJumpVy);
      expect(player.jumpsLeft).toBe(0);
    });

    it('should not allow more than two jumps', () => {
      Physics.applyJump(player); // First jump
      Physics.applyJump(player); // Second jump
      const finalVy = player.vy;

      const failedJump = Physics.applyJump(player);
      expect(failedJump).toBe(false);
      expect(player.vy).toBe(finalVy); // Velocity is unchanged
      expect(player.jumpsLeft).toBe(0);
    });

    it('should not allow jumping while ducking', () => {
      player.isDucking = true;
      const jumped = Physics.applyJump(player);
      expect(jumped).toBe(false);
      expect(player.jumpsLeft).toBe(2);
    });
  });

  describe('checkAABB', () => {
    it('should return true for overlapping objects', () => {
      const obstacle = { x: 150, y: GROUND_Y - 50, w: 50, h: 50 };
      expect(Physics.checkAABB(player, obstacle)).toBe(true);
    });

    it('should return false for non-overlapping objects', () => {
      const obstacle = { x: 300, y: GROUND_Y - 50, w: 50, h: 50 };
      expect(Physics.checkAABB(player, obstacle)).toBe(false);
    });
  });

  describe('checkStomp', () => {
    it('should return true for a valid stomp', () => {
      const obstacle = { x: 100, y: GROUND_Y - 50, w: 50, h: 50 };
      player.vy = 100; // Falling down
      player.y = obstacle.y - player.h + 5; // Positioned just above
      expect(Physics.checkStomp(player, obstacle)).toBe(true);
    });

    it('should return false if player is not falling', () => {
      const obstacle = { x: 100, y: GROUND_Y - 50, w: 50, h: 50 };
      player.vy = -100; // Moving up
      player.y = obstacle.y - player.h + 5;
      expect(Physics.checkStomp(player, obstacle)).toBe(false);
    });

    it('should return false for a side collision', () => {
      const obstacle = { x: 100, y: GROUND_Y - 50, w: 50, h: 50 };
      player.vy = 100; // Falling
      player.y = obstacle.y; // Aligned vertically
      expect(Physics.checkStomp(player, obstacle)).toBe(false);
    });
  });
});