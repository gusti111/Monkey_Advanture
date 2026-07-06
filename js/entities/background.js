/**
 * background.js — Mangrove Silhouette Parallax Backdrop
 *
 * CATATAN INTEGRASI:
 * File ini sebelumnya berisi `Layer` class generik (langit/laut/tanah warna
 * polos, dihitung untuk kanvas 800×400) yang TIDAK PERNAH di-load di
 * index.html dan tidak cocok dengan resolusi internal game (1920×1080,
 * lihat W_INT/H_INT di main.js) — jadi orphaned code. main.js sendiri sudah
 * punya renderer langit/laut/pasir HD-nya sendiri (drawSky/drawSea/drawSand).
 *
 * Modul ini digantikan menjadi layer BARU: siluet hutan mangrove yang jauh,
 * disisipkan sebagai lapisan parallax paling belakang di antara langit dan
 * laut — memberi kedalaman ekstra pada dunia (Bekantan tinggal di hutan
 * mangrove, jadi hutan yang samar-samar di horizon menguatkan tema).
 *
 * Lokasi file: js/background.js (di-load lewat <script> di index.html,
 * sejajar dengan js/engine/*.js — bukan di dalam folder engine/).
 *
 * API yang dipakai main.js:
 *   Background.draw(ctx, scrollFar, scrollNear, W_INT, groundY)
 * `scrollFar`/`scrollNear` adalah akumulasi jarak scroll (piksel), bukan
 * delta — sinkron dengan pola `scroll.*` yang sudah ada di main.js
 * (mis. scroll.farPalm, scroll.sand), supaya arah & kecepatan gerak
 * konsisten dengan layer parallax lain.
 *
 * Dua band kedalaman:
 *   - far  : lebih kecil, lebih transparan, scroll paling lambat (kabut jauh)
 *   - near : lebih besar, lebih pekat, scroll sedikit lebih cepat (masih
 *            lebih lambat dari farPalm supaya urutan kedalaman tetap benar:
 *            mangrove far < mangrove near < farPalm < sea < sand)
 */

const Background = (() => {
  const FAR_COUNT  = 9;
  const NEAR_COUNT = 6;

  // Lebar "dunia" siklus tiap band dibuat lebih besar dari W_INT supaya
  // pola pengulangan tidak terasa terlalu cepat/berulang.
  const FAR_WORLD_W  = 1.5;  // dikali W_INT
  const NEAR_WORLD_W = 1.7;  // dikali W_INT

  let farClusters = [];
  let nearClusters = [];
  let initialized = false;
  let cachedW = 0;

  /** Bikin satu deret klaster pohon mangrove dengan variasi ukuran & fase acak,
   *  disebar merata (+ sedikit jitter) di sepanjang lebar dunia siklusnya. */
  function _buildClusters(count, worldW, wMin, wMax, hMin, hMax) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (i / count) * worldW + (Math.random() - 0.5) * (worldW / count) * 0.6,
        w: wMin + Math.random() * (wMax - wMin),
        h: hMin + Math.random() * (hMax - hMin),
        seed: Math.random() * 10,
        rootCount: 3 + Math.floor(Math.random() * 3),
      });
    }
    return arr;
  }

  function init(W_INT) {
    farClusters  = _buildClusters(FAR_COUNT,  W_INT * FAR_WORLD_W,  130, 230, 70, 130);
    nearClusters = _buildClusters(NEAR_COUNT, W_INT * NEAR_WORLD_W, 200, 340, 120, 200);
    initialized = true;
    cachedW = W_INT;
  }

  /** Gambar satu siluet klaster pohon mangrove: kanopi bergerombol tidak rata
   *  + akar tunjang (prop roots) menjuntai turun — bentuk khas mangrove,
   *  beda dari palem yang berbatang tunggal. Digambar sebagai siluet flat
   *  (tanpa detail) karena posisinya jauh di background/kabut. */
  function _drawCluster(ctx, x, groundY, w, h, color, seed, rootCount) {
    const baseY = groundY;
    const topY  = baseY - h;

    ctx.fillStyle = color;

    // Kanopi: beberapa gumpalan elips bertumpuk supaya siluet terasa organik
    // (bukan cuma satu blob bulat), memakai `seed` biar tiap klaster punya
    // bentuk unik yang konsisten antar-frame (bukan re-random tiap draw).
    const lumps = 5;
    for (let i = 0; i < lumps; i++) {
      const t = i / (lumps - 1);
      const lx = x + t * w;
      const wobble = Math.sin(seed + t * 9.4) * 0.5 + 0.5;
      const ly = topY + h * 0.22 * (1 - wobble);
      const lr = (w / lumps) * (0.65 + wobble * 0.35);
      ctx.beginPath();
      ctx.ellipse(lx, ly + lr * 0.4, lr, lr * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Badan bawah kanopi menyambung ke tanah supaya tidak ada celah antara
    // gumpalan kanopi & akar.
    ctx.beginPath();
    ctx.moveTo(x, baseY - h * 0.35);
    ctx.lineTo(x, topY + h * 0.5);
    ctx.lineTo(x + w, topY + h * 0.5);
    ctx.lineTo(x + w, baseY - h * 0.35);
    ctx.closePath();
    ctx.fill();

    // Akar tunjang (prop roots) — garis-garis melengkung turun ke tanah,
    // ciri paling khas pohon mangrove yang membedakannya dari pohon lain.
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, w * 0.02);
    for (let i = 0; i < rootCount; i++) {
      const t = (i + 0.5) / rootCount;
      const rx = x + t * w;
      const spread = w * 0.06;
      ctx.beginPath();
      ctx.moveTo(rx, baseY - h * 0.3);
      ctx.quadraticCurveTo(rx - spread * 0.5, baseY - h * 0.1, rx - spread, baseY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx, baseY - h * 0.3);
      ctx.quadraticCurveTo(rx + spread * 0.5, baseY - h * 0.1, rx + spread, baseY);
      ctx.stroke();
    }
  }

  function _drawBand(ctx, clusters, scrollX, worldW, groundY, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    clusters.forEach(c => {
      // Wrap posisi X berbasis scroll supaya loop mulus tanpa celah/lompatan.
      const cx = ((c.x - scrollX) % worldW + worldW) % worldW - c.w;
      _drawCluster(ctx, cx, groundY, c.w, c.h, color, c.seed, c.rootCount);
    });
    ctx.restore();
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} scrollFar   akumulasi scroll band jauh (piksel)
   * @param {number} scrollNear  akumulasi scroll band dekat (piksel)
   * @param {number} W_INT       lebar internal kanvas
   * @param {number} groundY     Y garis tanah (siluet mangrove "berdiri" sedikit
   *                             di atas garis laut, bukan tepat di tanah pantai)
   */
  function draw(ctx, scrollFar, scrollNear, W_INT, groundY) {
    if (!initialized || cachedW !== W_INT) init(W_INT);

    // Band jauh: lebih kecil, lebih pudar (efek kabut jarak), duduk di garis
    // horizon laut. Band dekat: lebih besar & lebih pekat, sedikit lebih
    // rendah — tapi tetap di belakang farPalm/sea supaya urutan depth benar.
    _drawBand(ctx, farClusters,  scrollFar,  W_INT * FAR_WORLD_W,  groundY * 0.62, 0.38, 'rgba(30,58,52,1)');
    _drawBand(ctx, nearClusters, scrollNear, W_INT * NEAR_WORLD_W, groundY * 0.68, 0.55, 'rgba(18,42,36,1)');
  }

  return { init, draw };
})();