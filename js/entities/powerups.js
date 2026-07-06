// js/entities/powerups.js

class PowerUp {
    constructor(canvasWidth, groundHeight) {
        // Catatan: pakai .w/.h (bukan width/height) supaya cocok dengan
        // Physics.checkAABB() yang membaca properti .w dan .h
        this.w = 34;
        this.h = 34;
        this.x = canvasWidth;
        // Posisi Y dibuat melayang agar Bekantan harus melompat untuk mengambilnya
        this.y = groundHeight - 100 - Math.random() * 50; 
        // PERBAIKAN BUG: sebelumnya `speed` diperlakukan sebagai px/frame
        // (this.x -= this.speed tanpa dt) — gerak power-up jadi bergantung
        // frame-rate, tidak konsisten dengan Obstacles/Physics yang sudah
        // pakai delta-time. Sekarang px/detik (setara nilai lama 5px/frame
        // @60fps), discale via dt di update().
        this.speed = 300; // px/detik — kecepatan bergerak ke kiri
        this.markedForDeletion = false;
        this.type = 'golden_banana'; // Jenis power up
        this._t = 0; // timer internal untuk animasi kedip/putar
    }

    update(dt = 0.016) {
        // PERBAIKAN BUG: pakai dt supaya kecepatan gerak konsisten di semua frame-rate
        this.x -= this.speed * dt;
        this._t += dt;
        // Perbaikan: sebelumnya pakai this.width (undefined sejak constructor
        // diganti ke this.w) → perbandingan selalu NaN → power-up gak pernah
        // dihapus dari pool walau sudah keluar layar.
        if (this.x + this.w < 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        const s  = this.w / 34;

        // Glow berdenyut biar kelihatan sebagai item spesial (bukan koin biasa)
        const pulse = 0.75 + Math.sin(this._t * 6) * 0.25;
        const glow = ctx.createRadialGradient(cx, cy, 2 * s, cx, cy, this.w * 1.1 * pulse);
        glow.addColorStop(0, 'rgba(255,215,0,0.55)');
        glow.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, this.w * 1.1 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.35 + Math.sin(this._t * 4) * 0.15);

        // Badan pisang emas (gradient keemasan, beda dari pisang biasa yang kuning polos)
        const grad = ctx.createLinearGradient(-this.w * 0.4, 0, this.w * 0.4, 0);
        grad.addColorStop(0, '#FFD700'); grad.addColorStop(0.5, '#FFF3B0'); grad.addColorStop(1, '#E8A500');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2 * s;

        ctx.beginPath();
        ctx.moveTo(-this.w * 0.42, this.h * 0.30);
        ctx.quadraticCurveTo(-this.w * 0.10, -this.h * 0.55, this.w * 0.42, -this.h * 0.30);
        ctx.quadraticCurveTo(this.w * 0.20, -this.h * 0.02, -this.w * 0.20, this.h * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Kilau tipis di tengah badan
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(-this.w * 0.05, -this.h * 0.05, this.w * 0.12, this.h * 0.22, -0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Bintang kecil berkedip di sekitar, penanda "power up", bukan collectible biasa
        for (let i = 0; i < 3; i++) {
            const ang = this._t * 2 + (i / 3) * Math.PI * 2;
            const d = this.w * 0.9;
            const sparkAlpha = 0.4 + Math.sin(this._t * 5 + i) * 0.3;
            ctx.save();
            ctx.globalAlpha = Math.max(0, sparkAlpha);
            ctx.fillStyle = '#FFF3B0';
            ctx.font = `${10 * s}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('✦', cx + Math.cos(ang) * d, cy + Math.sin(ang) * d);
            ctx.restore();
        }
    }
}

// Lightweight pooling for PowerUp instances
PowerUp._pool = [];
PowerUp.acquire = function(canvasWidth, groundHeight) {
    const p = PowerUp._pool.pop();
    if (p) {
        p.w = 34; p.h = 34;
        p.x = canvasWidth;
        p.y = groundHeight - 100 - Math.random() * 50;
        p.speed = 300;
        p.markedForDeletion = false;
        p.type = 'golden_banana';
        p._t = 0;
        return p;
    }
    return new PowerUp(canvasWidth, groundHeight);
};

PowerUp.release = function(obj) {
    if (!obj) return;
    obj.markedForDeletion = true;
    PowerUp._pool.push(obj);
};