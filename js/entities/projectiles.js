/**
 * projectiles.js — Proyektil Pisang
 * VISUAL UPGRADE: sekarang berbentuk pisang asli (bukan kotak kuning),
 * berputar 360° selama terbang, meninggalkan trail memudar, dan
 * bercahaya (glow) supaya lebih jelas terlihat sebagai item lempar
 * yang "hidup", bukan cuma hitbox polos.
 *
 * Hitbox (w/h) sengaja tetap kecil & ringkas agar keseimbangan gameplay
 * (susah/mudah kena musuh) tidak berubah dari versi sebelumnya.
 */
class Projectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        // Catatan: pakai .w/.h (bukan width/height) supaya cocok dengan
        // Physics.checkAABB() yang membaca properti .w dan .h
        this.w = 24;
        this.h = 14;
        // PERBAIKAN BUG: sebelumnya `speed` diperlakukan sebagai px/frame
        // (this.x += this.speed tanpa dt) — artinya kecepatan proyektil
        // bergantung pada frame-rate (lebih cepat di 144fps, lebih lambat
        // di 30fps), tidak konsisten dengan Obstacles/Physics/Boss yang
        // semuanya sudah pakai delta-time. Sekarang speed dalam satuan
        // px/detik (setara nilai lama 8px/frame @60fps) dan discale via dt
        // di update().
        this.speed = 480; // px/detik — kecepatan lemparan pisang

        // === FITUR BARU: rotasi penuh + trail ===
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = 16; // rad/s — muter cepat & jelas selama terbang
        this.trail = [];    // jejak posisi sebelumnya untuk efek trail
        this.maxTrail = 6;

        this.markedForDeletion = false;
    }

    update(dt, maxX) {
        // Simpan posisi & rotasi saat ini sebagai titik trail SEBELUM bergerak
        this.trail.push({ x: this.x, y: this.y, rot: this.rotation });
        if (this.trail.length > this.maxTrail) this.trail.shift();

        // PERBAIKAN BUG: pakai dt supaya kecepatan gerak konsisten di semua frame-rate
        this.x += this.speed * (dt || 0.016);
        this.rotation += this.rotSpeed * (dt || 0.016);

        // Hapus proyektil jika sudah keluar layar (kanan)
        // Batas kanan dikirim dari main.js lewat parameter `maxX`,
        // dengan fallback 1920 (W_INT) kalau parameter gak dikirim.
        if (this.x > (maxX || 1920)) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;

        // ── Trail: salinan bentuk pisang yang memudar & mengecil ke belakang ──
        const n = this.trail.length;
        for (let i = 0; i < n; i++) {
            const t = this.trail[i];
            const progress = (i + 1) / (n + 1); // 0 (paling lama) → 1 (terbaru)
            ctx.save();
            ctx.globalAlpha = progress * 0.32;
            ctx.translate(t.x + this.w / 2, t.y + this.h / 2);
            ctx.rotate(t.rot);
            const sc = 0.5 + progress * 0.5;
            ctx.scale(sc, sc);
            this._drawBananaShape(ctx);
            ctx.restore();
        }

        // ── Glow lembut di sekitar badan pisang ──
        const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, this.w * 1.7);
        glow.addColorStop(0, 'rgba(255,224,102,0.45)');
        glow.addColorStop(1, 'rgba(255,224,102,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, this.w * 1.7, 0, Math.PI * 2);
        ctx.fill();

        // ── Badan pisang utama — berputar 360° penuh selama terbang ──
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotation);
        this._drawBananaShape(ctx);
        ctx.restore();
    }

    /** Gambar satu bentuk pisang di origin (0,0), dipakai untuk trail & badan utama */
    _drawBananaShape(ctx) {
        const w = this.w, h = this.h;

        const grad = ctx.createLinearGradient(-w * 0.45, 0, w * 0.45, 0);
        grad.addColorStop(0, '#F6C945');
        grad.addColorStop(0.5, '#FFE066');
        grad.addColorStop(1, '#E3A712');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#8A6A16';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(-w * 0.46, h * 0.34);
        ctx.quadraticCurveTo(-w * 0.08, -h * 0.95, w * 0.46, -h * 0.34);
        ctx.quadraticCurveTo(w * 0.22, -h * 0.02, -w * 0.22, h * 0.50);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ujung batang pisang (kecil, di salah satu ujung)
        ctx.fillStyle = '#5D4E2A';
        ctx.beginPath();
        ctx.ellipse(-w * 0.42, h * 0.30, w * 0.07, h * 0.18, 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Kilau tipis di badan
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        ctx.beginPath();
        ctx.ellipse(-w * 0.05, -h * 0.15, w * 0.10, h * 0.28, -0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Simple object pool for projectiles to reduce allocations
Projectile._pool = [];
Projectile.acquire = function(x, y) {
    const p = Projectile._pool.pop();
    if (p) {
        p.x = x;
        p.y = y;
        p.markedForDeletion = false;
        p.rotation = Math.random() * Math.PI * 2;
        p.trail.length = 0;
        return p;
    }
    return new Projectile(x, y);
};

Projectile.release = function(obj) {
    if (!obj) return;
    obj.markedForDeletion = true;
    // reset some transient state
    obj.trail.length = 0;
    obj.vx = obj.vy = 0;
    Projectile._pool.push(obj);
};