# Laporan Praktikum — Monkey Adventure (Bekantan Beach Run)

## Identitas
- Nama: [Nama Anda]
- NIM: [NIM]
- Praktikum: Pengembangan Game Web

## Tujuan
Mengembangkan dan memperbaiki game berbasis Canvas2D serta mendokumentasikan perubahan.

## Ringkasan Perubahan
- Memperbaiki bug collision antara boss dan shield sehingga konsumsi shield tidak berlebih.
- Menambahkan object pooling untuk `projectiles`, `powerups`, `obstacles`, dan projectile boss untuk mengurangi GC overhead.
- Menambahkan debug overlay yang menampilkan ukuran pool saat playtest.
- Menambahkan auto-pause pada `visibilitychange` untuk mencegah kehilangan input saat tab tidak aktif.
- Memperbaiki tata letak menu dan toko, menambahkan beberapa item shop.

## Cara Menjalankan
1. Jalankan server statis:
```bash
node serve.js
```
2. Buka browser ke `http://localhost:8080`.

## Verifikasi
- Semua file JS lulus pemeriksaan sintaks (`node --check`).
- Server merespon HTTP 200 untuk aset utama.
- Hasil playtest manual: game berjalan, kontrol input dasar bekerja, overlay debug muncul.

## File Penting yang Diubah
- `js/gameManager.js`
- `js/uiManager.js`
- `js/entities/obstacles.js`
- `js/entities/boss.js`
- `js/entities/projectiles.js`
- `js/entities/powerups.js`
- `css/style.css`
- `index.html`

## Known Issues dan Rekomendasi
- Perlu pooling untuk projectile boss lebih lanjut dan observability runtime.
- Pertimbangkan menambahkan CI yang menjalankan `physics_test.js` dan `storage_test.js`.

## Kesimpulan
Perbaikan meningkatkan stabilitas runtime dan mengurangi alokasi objek, membuat game lebih siap untuk playtest lebih luas.
