# 🎰 Gacha Waifu website

Proyek ini adalah aplikasi **Gacha Waifu** berbasis web yang menampilkan gambar karakter dengan peluang yang bisa diatur.  
Dilengkapi efek **confetti**, **suara pop**, dan label **rarity** untuk memberikan pengalaman gacha yang seru seperti game asli.

## ✨ Fitur

- **Gacha dengan persentase drop rate** (`percent`) untuk setiap waifu.
- **Animasi Rolling** dengan efek gambar berganti cepat.
- **Efek Confetti** berbeda jumlah & durasi sesuai rarity.
- **Efek Suara Pop** menggunakan Web Audio API (bisa dinonaktifkan oleh browser jika autoplay diblokir).
- **Rarity Label** otomatis muncul (UR, SSR, SR, Rare, Common) berdasarkan `percent`.
- **Toggle Normalize View**  
  Melihat **raw percent** vs **normalized chance** (persentase sebenarnya dari total semua item).
- **Preload Images** untuk mempercepat tampilan.
- **Fallback SVG** jika gambar gagal dimuat.
- **Shortcut Keyboard**: Tekan `R` untuk roll.

## 🛠 Cara Kerja

1. **Load Data Waifu**  
   - Data diambil dari `public/images.json` (format array objek `{ name, url, percent }`).
   - Menghitung total persen & normalized chance.
   - Menampilkan daftar waifu dengan persentase drop.

2. **Rolling Gacha**  
   - Menampilkan animasi gambar acak beberapa kali.
   - Memilih 1 waifu berdasarkan **weighted random** (`pickByPercent`).
   - Menampilkan hasil akhir dengan label rarity + efek visual & audio.

3. **Rarity System**
   ```javascript
   // Threshold rarity
   ur:   <= 0.2%    // Ultra Rare
   ssr:  <= 1%      // Super Super Rare
   sr:   <= 3%      // Super Rare
   rare: <= 6%      // Rare
   common: > 6%     // Common
