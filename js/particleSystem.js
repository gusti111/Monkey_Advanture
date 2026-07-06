/**
 * particleSystem.js — Visual Effects Particle Manager
 *
 * Handles the creation, update, and rendering of all short-lived
 * visual effects, such as sparks from stomps, coin collection glows,
 * and text pop-ups.
 */

const ParticleSystem = (() => {
  let particles = [];

  function init() {
    // Reserved for any future pre-warming or asset loading.
  }

  function reset() {
    particles = [];
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.92;
      pt.vy += 260 * dt; // A bit of gravity
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }
  }

  function draw(ctx) {
    for (const pt of particles) {
      const alpha = Math.max(pt.life / pt.maxLife, 0);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (pt.isText) {
        ctx.fillStyle = pt.color;
        ctx.font = 'bold 26px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(pt.text, pt.x, pt.y);
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function spawnHitEffect(x, y, text = 'POP!') {
    const colors = ['#FFD93D', '#FF6B35', '#FFFFFF', '#FFB703'];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 180 + Math.random() * 140;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.45,
        maxLife: 0.45,
        size: 4 + Math.random() * 4,
        color: colors[i % colors.length],
      });
    }
    if (text) {
      particles.push({
        x, y, vx: 0, vy: -60,
        life: 0.5, maxLife: 0.5,
        isText: true, text,
        color: '#FFFFFF',
      });
    }
  }

  // Public API
  return { init, reset, update, draw, spawnHitEffect };
})();