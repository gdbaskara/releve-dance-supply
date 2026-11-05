# 13 — Naskah presentasi demo untuk klien (±15 menit)

Naskah ini untuk presenter. Bagian **"Ucapkan"** adalah poin bicara (boleh diparafrasekan); bagian **langkah** adalah klik persisnya. Skenario mengikuti `03-demo.md` §4 (D1–D8; D9 hanya test otomatis). Teks tombol di bawah sama dengan teks di UI versi Indonesia.

> URL di naskah ini memakai `https://releve-demo.vercel.app` — ganti dengan URL demo yang sebenarnya (`12-deploy.md` §6). Untuk demo lokal: `http://localhost:3000`.

---

## 0. Persiapan (30–60 menit sebelum meeting)

### Reset data
- [ ] Seed ulang database demo (`12-deploy.md` §10):
  ```bash
  DATABASE_URL="$NEON_URL" NEXT_PUBLIC_SITE_URL='https://releve-demo.vercel.app' ADMIN_PASSWORD='releve-demo' pnpm db:seed
  ```
  Lokal: `pnpm db:seed` (atau `pnpm db:reset` jika skema berubah).
- [ ] Pastikan `DEMO_MODE=true` dan `NEXT_PUBLIC_DEMO_MODE=true` (banner "Mode demo — pembayaran & pengiriman disimulasikan." terlihat).
- [ ] Jam meeting: **GoSend Instant hanya muncul sebelum 16:00 WIB** (Grab Same Day sebelum 14:00 WIB) dan hanya untuk Jabodetabek (zona Z1). Jika meeting sore, D1 memakai JNE YES/Reguler — jelaskan aturan cutoff-nya sebagai fitur.

### Perangkat & tab
- [ ] **HP (toko, tampilan pembeli)** — mode incognito / keranjang kosong:
  1. `https://releve-demo.vercel.app/id`
  2. `…/id/p/diamond-sd140`
- [ ] **Laptop (admin + layar besar)**:
  1. `…/admin/login` → login **admin@releve.test / releve-demo**, biarkan Dashboard terbuka
  2. `…/admin/outbox` (WA outbox)
  3. `…/admin/checkout-links`
  4. `…/id/design-system` (showcase design system, untuk penutup/jika ditanya)
- [ ] Mirror layar HP ke proyektor/Zoom (atau buka toko di laptop dengan DevTools mode mobile 390×844 sebagai cadangan).
- [ ] WhatsApp di HP presenter siap (tombol "Tanya via WA" membuka wa.me ke `NEXT_PUBLIC_WA_NUMBER`).
- [ ] Nomor WA pembeli contoh untuk diketik: `0812-3456-7890`. Alamat: DKI Jakarta → Kota Jakarta Selatan → Kebayoran Baru → 12160 → "Jl. Senopati No. 10".

### Produk yang dipakai (semua ada di `data/catalog/products.json`)

| Slug | Nama | Peran di demo |
|---|---|---|
| `diamond-sd140` | Diamond SD140 (Rp660.000) | Hampir semua ukuran **ready** → happy path D1, D4 |
| `alina-iv-pointe-shoe-p95` | Alina IV Pointe Shoe P95 | Stok tipis **"Sisa 1–3"** → D2, D6 |
| `briar-sd110l`, `jaxon-jz86l`, `claudine-sd155` | Briar SD110L, Jaxon JZ86L, Claudine SD155 | Full **pre-order** (estimasi 4–6 minggu) → D4 |
| `roy-bl104`, `elsie-sl248` | Roy BL104, Elsie SL248 | **Habis** semua ukuran → "Kabari Saya via WA" → D3 |
| `claudia-satin-sd09`, `toshie-sd40vc` | Claudia Satin SD09, Toshie SD40VC | Pointe dengan pilihan **shank** → D8 |

> Kredensial admin `admin@releve.test / releve-demo` **hanya untuk demo**. Untuk link yang ditinggalkan ke klien, seed ulang dengan password lain dan kirim terpisah.

---

## 1. Pembuka (1 menit)

**Ucapkan:**
- "Ini Relevé Dance Supply — toko online sepatu dansa & dancewear Só Dança untuk pasar Indonesia, sebagai reseller independen. Nama dan logo masih nama kerja."
- "Yang Bapak/Ibu lihat ini sudah berjalan sungguhan: katalog, stok per ukuran, order, dan admin pakai database asli. Yang **disimulasikan** hanya tiga hal: pembayaran, ongkir kurir, dan pengiriman pesan WhatsApp otomatis — karena akun Xendit, Biteship, dan WhatsApp Business belum dibuat. Kodenya sudah disiapkan untuk disambung."
- "Kita coba seperti pembeli sungguhan, di HP."

## 2. D1 — Belanja sampai bayar dengan QRIS + kurir instan (3 menit)

**Langkah (HP):**
1. Beranda `/id` → menu/kategori **Ballet** → **Diamond SD140**.
2. Tunjukkan: harga Rp, label stok per ukuran (Ready / Sisa N / Habis).
3. Pilih warna **Light Pink**, ukuran **7.0L (adult)**, width **C** → **Tambah ke Keranjang** → **Lihat keranjang** → Checkout.
4. Isi **Nama lengkap**, **Nomor WhatsApp** `0812-3456-7890`, **Provinsi** DKI Jakarta, **Kabupaten/Kota** Kota Jakarta Selatan, **Kecamatan** Kebayoran Baru, **Kode pos** 12160, **Alamat lengkap** → **Lanjut ke Pengiriman**.
5. Pilih **GoSend Instant** (atau kurir pertama jika sudah lewat 16:00 WIB) → tunjukkan **Asuransi pengiriman** → **Lanjut ke Pembayaran**.
6. Di ringkasan, isi **Kode voucher** `RELEVE10` → **Pakai** → muncul "Voucher dipakai — hemat …" (diskon 10%, minimal belanja Rp500.000).
7. Metode **QRIS** sudah terpilih → **Bayar Sekarang** → halaman bayar dengan QR & hitung mundur 30 menit.
8. Klik **Simulasikan Bayar Berhasil** → halaman "Pembayaran berhasil".
9. **Laptop:** buka **WA outbox** → pesan "Pembayaran diterima" untuk order itu. Buka **Dashboard** → order baru di "10 order terbaru".

**Ucapkan:**
- "Pembeli tidak perlu bikin akun — cukup nama, nomor WA, dan alamat. **WhatsApp jadi saluran utama**: konfirmasi, status bayar, dan resi dikirim ke WA."
- "Pengiriman **hanya Pulau Jawa**, dari gudang di **Jakarta**. Kurir instan otomatis muncul hanya untuk Jabodetabek dan sebelum jam cutoff."
- "Pembayaran **digital penuh**: QRIS, e-wallet, Virtual Account, kartu. **Tidak ada COD** — sesuai keputusan untuk segmen menengah-atas, dan menghindari risiko paket ditolak."
- "Harga dan total selalu dihitung ulang di server — tidak bisa diakali dari browser. Stok varian ini langsung berkurang 1."
- "Tombol 'Simulasikan' ini hanya ada di mode demo. Nanti diganti notifikasi asli dari Xendit."

## 3. D2 — Konsultasi ukuran via WA → admin kirim link checkout → bayar VA (3 menit)

**Langkah:**
1. **HP:** buka **Alina IV Pointe Shoe P95** → tunjukkan callout "Pointe sebaiknya dicoba/difitting" dan banyak ukuran "Sisa 1–3".
2. Klik **Tanya via WA** → WhatsApp terbuka dengan pesan terisi (nama produk + kode model). Tidak perlu dikirim; kembali ke browser.
3. **Laptop:** **Checkout link** → **Produk**: ketik `P95` → pilih **Alina IV Pointe Shoe P95** → **Ukuran** 6.0L (adult) → **Width** C → **Tambah item**.
4. Isi **Nama** "Sari Dewi" dan **Nomor WhatsApp** pembeli → **Buat checkout link**.
5. Tunjukkan link `…/id/checkout?link=…` dan tombol kirim via WA (membuka WA ke pembeli dengan pesan + link). Salin link → buka di **HP**.
6. **HP:** muncul "Pesanan disiapkan oleh admin Relevé", nama & WA sudah terisi. Isi alamat → **Lanjut ke Pengiriman** → pilih kurir → **Lanjut ke Pembayaran**.
7. Pilih **BCA Virtual Account** → **Bayar Sekarang** → tunjukkan nomor VA (diawali 39108) → **Salin nomor Virtual Account** → buka panduan **ATM BCA**.
8. **Simulasikan Bayar Berhasil** → sukses. **Laptop:** **Checkout link** → status link "Terpakai" dengan nomor ordernya.

**Ucapkan:**
- "Untuk pointe, pembeli biasanya tanya dulu soal ukuran. Alurnya kami desain **WA-first**: pembeli chat, admin bantu pilih size/width/shank, lalu **admin membuat link checkout** berisi produk yang tepat dan mengirimnya lewat WA."
- "Link berlaku 48 jam dan hanya bisa dipakai sekali. Pembeli tinggal isi alamat dan bayar — tidak perlu cari produknya lagi."
- "Stok yang ditampilkan **jujur per ukuran**: 'Sisa 1' artinya memang tinggal satu pasang di gudang."

## 4. D3 — Stok habis → "Kabari Saya via WA" (2 menit)

**Langkah:**
1. **HP:** buka **Roy BL104** (atau **Elsie SL248**) → semua ukuran **Habis**.
2. Pilih warna **Black**, ukuran **7.0L (adult)**, width **Medium** → **Kabari Saya via WA** → isi nomor WA → **Kabari Saya** → "Siap! Kami kabari via WhatsApp saat … ready."
3. **Laptop:** **Back-in-stock** → permintaan baru tampil (seed sudah berisi 2 permintaan Roy + 1 Elsie).
4. **Produk & stok** → **Roy BL104** → pilih **Black** → di grid, isi stok varian 7.0L (adult) / Medium menjadi `2` → **Simpan stok** → "N pembeli dikabari via WA".
5. **WA outbox** → pesan "Stok ready lagi" ke nomor tadi.

**Ucapkan:**
- "Daripada pembeli pergi, kita simpan nomornya. Begitu admin menambah stok, semua yang menunggu **otomatis dikabari via WA** — masing-masing sekali saja."
- "Ini juga data permintaan: admin bisa lihat model & ukuran apa yang paling dicari sebelum restock."

## 5. D4 — Pre-order dicampur dengan barang ready (1,5 menit)

**Langkah:**
1. **HP:** buka **Briar SD110L** (atau Jaxon JZ86L / Claudine SD155) → semua ukuran berlabel **Pre-order**. Pilih Pink 40, ukuran 7.0L (adult), width C → **Tambah ke Keranjang**.
2. Tambah juga **Diamond SD140** ready.
3. **Keranjang:** tunjukkan pemberitahuan "Keranjang berisi item pre-order. Semua item dikirim sekaligus setelah item pre-order tiba (estimasi 4–6 minggu)."
4. Lanjut checkout sampai ringkasan → tunjukkan label pre-order lagi. (Bayar opsional; halaman sukses juga menampilkan "Estimasi tiba 4–6 minggu".)

**Ucapkan:**
- "Model yang belum ada di gudang tetap bisa dijual sebagai **pre-order**, dengan estimasi yang jelas sejak awal. Admin bisa mengaktifkan/mematikan pre-order per varian atau per produk."
- "Untuk versi pertama, pesanan campuran dikirim sekaligus — sederhana dan hemat ongkir. Pengiriman terpisah bisa ditambah nanti."

## 6. D5 — Alamat di luar Pulau Jawa (30 detik)

**Langkah:** di checkout, buka dropdown **Provinsi** → hanya 6 provinsi Jawa (DKI Jakarta, Banten, Jawa Barat, Jawa Tengah, DI Yogyakarta, Jawa Timur); **Bali tidak ada**. Tunjukkan link **"Di luar Pulau Jawa? Hubungi kami via WA"**.

**Ucapkan:** "Sesuai keputusan awal, checkout otomatis hanya untuk Jawa. Pembeli luar Jawa tidak ditolak — diarahkan ke WA untuk ditangani manual. Saat Biteship disambung, cakupannya bisa diperluas tinggal konfigurasi."

## 7. D6 — Pembayaran kedaluwarsa → stok kembali (1,5 menit)

**Langkah:**
1. **HP:** buka **Alina IV Pointe Shoe P95** → pilih ukuran berlabel **Sisa 1** (mis. 7.5L (adult), width C) → **Tambah ke Keranjang** → checkout → **Bayar Sekarang** (metode apa saja).
2. (Opsional) Buka PDP Alina di tab lain → ukuran itu sekarang **Habis** — stoknya sedang dipegang untuk pembeli ini.
3. Klik **Simulasikan Kedaluwarsa** → "Pembayaran kedaluwarsa", "Stok sudah dilepas", tombol **Pesan lagi**.
4. Refresh PDP → ukuran itu kembali **Sisa 1**. **Laptop:** WA outbox → "Pembayaran kedaluwarsa".

**Ucapkan:**
- "Begitu pembeli menekan bayar, stok **dikunci** untuknya — tidak ada dua orang membayar sepasang sepatu terakhir yang sama. Kami sudah menguji skenario rebutan stok terakhir secara otomatis: satu berhasil, satu ditolak."
- "Kalau tidak dibayar sampai batas waktu (QRIS 30 menit, VA 24 jam), order kedaluwarsa dan stok otomatis kembali dijual."

**Opsional — kartu ditolak (30 detik):** di checkout pilih **Kartu kredit/debit** → **Bayar Sekarang** → **Nomor kartu** `4000 0000 0000 0002`, berlaku `12/30`, CVV `123` → **Bayar Rp…** → OTP 6 digit apa saja → **Verifikasi** → "Kartu ditolak oleh bank penerbit" → **Ganti metode pembayaran** → QRIS → **Pakai metode ini**. "Order tidak hilang; pembeli tinggal ganti metode."

## 8. D7 — Admin memproses & mengirim, pembeli melacak (2 menit)

**Langkah:**
1. **Laptop:** **Order** → filter status **Dibayar** → buka order **Sekar Ayu Larasati** (order contoh dari seed; atau order D1 tadi).
2. Tunjukkan detail: item, alamat, pembayaran, timeline, pesan WA, tombol **Chat pembeli**.
3. **Ubah status ke** → **Proses pesanan** → status "Diproses".
4. **Ubah status ke** → **Kirim (input resi)** → **Kurir** JNE → **Nomor resi (AWB)** mis. `JNE1234567890` → **Kirim (input resi)** → status "Dikirim"; timeline berisi resi; WA outbox berisi pesan dengan nomor resi.
5. **HP:** `…/id/track` → **Nomor pesanan** (salin dari admin) + **4 digit terakhir nomor WA** (`5432` untuk Sekar; `7890` untuk order D1) → **Lacak** → timeline "Dikirim", nomor resi bisa disalin, tombol "Tanya pesanan ini".

**Ucapkan:**
- "Admin hanya melihat tombol yang sah untuk status saat ini — tidak bisa langsung 'Dikirim' sebelum 'Diproses', dan resi wajib diisi."
- "Status 'Dibayar' hanya bisa datang dari payment gateway, bukan diklik admin — mencegah kesalahan dan kecurangan."
- "Pembeli melacak tanpa login: cukup nomor pesanan + 4 digit terakhir WA."

## 9. D8 — Bilingual (1 menit)

**Langkah:** **HP:** buka **Claudia Satin SD09** (atau **Toshie SD40VC**) → tunjukkan pilihan **shank** (Full Normal / Full Extra Reinforced; Toshie punya 4 shank) → ketuk **EN** di header → UI berbahasa Inggris, harga tetap format **Rp**, istilah *pointe, shank, vamp* tidak diterjemahkan. Kembali ke **ID**.

**Ucapkan:** "Bahasa Indonesia default, Inggris untuk pelanggan ekspatriat dan studio internasional. Istilah dansa dibiarkan apa adanya karena penari memakainya begitu."

## 10. Penutup (1,5 menit)

Tunjukkan sekilas **`/id/design-system`** di laptop: "Semua warna, tombol, dan komponen dikumpulkan di sini, jadi ganti nama/logo/warna merek nanti cepat dan konsisten."

### Yang sudah siap disambung
| Bagian | Di demo | Nanti | Yang dibutuhkan dari klien |
|---|---|---|---|
| **Pembayaran — Xendit** | Simulasi QRIS, e-wallet, VA 5 bank, kartu (+3DS) | Xendit asli; webhook & tanda tangan sudah lewat jalur yang sama | Akun Xendit bisnis terverifikasi (KYC badan usaha/perorangan) |
| **Ongkir & resi — Biteship** | Tarif dari tabel 7 layanan kurir | Tarif & area real-time, pelacakan resi | Akun Biteship, alamat gudang Jakarta |
| **Notifikasi — WhatsApp Business API** | Pesan tersimpan di "WA outbox" | Terkirim otomatis lewat BSP (mis. Qontak/Wati/360dialog) | Nomor WA bisnis khusus, verifikasi Meta, template pesan disetujui |

"Ketiganya sudah dibuat sebagai 'colokan' di kode — mengganti simulasi ke asli adalah pekerjaan konfigurasi dan pengujian, bukan membangun ulang." (Detail teknis: `11-go-live-integrations.md`.)

### Keputusan yang dibutuhkan dari klien
1. **Harga grosir (Q-01):** apakah Bapak/Ibu bisa mendapat harga grosir (±50% dari harga retail) dari Só Dança? Tanpa itu, harga jual kita sekitar 2× harga pasar.
2. **Strategi pointe (Q-02):** pointe Só Dança di kisaran Rp3 juta, sementara Bloch lokal Rp1,1–1,6 juta. Pointe mau dijual normal, dijadikan pre-order/niche, atau margin diturunkan?
3. **Nama & logo (Q-03):** apakah "Relevé Dance Supply" dipakai, atau ada nama & logo final?
4. **Nomor WhatsApp bisnis (Q-04):** nomor mana yang dipakai untuk toko (sebaiknya nomor khusus, karena akan didaftarkan ke WhatsApp Business API)?
5. **Alamat gudang Jakarta (Q-05):** alamat lengkapnya untuk titik jemput kurir instan dan footer toko.
6. **Tabel ukuran (Q-06):** apakah ada tabel ukuran (cm) resmi per kategori? Saat ini kami salin dari size chart Só Dança dan perlu dicek.
7. **Bea masuk & pajak impor (Q-07):** bisa bantu konfirmasi HS code, bea masuk, lartas, dan PPh 22 dengan PPJK/forwarder? Ini memengaruhi harga jual.
8. **Retur & tukar ukuran (Q-08):** kebijakannya seperti apa? Sementara kami tulis "lewat WA, kasus per kasus".
9. **Foto produk (Q-09):** kapan foto produk sendiri tersedia? Wajib sebelum toko live (demo memakai placeholder).

**Tutup:** "Setelah keputusan ini dan akun-akun di atas siap, langkah berikutnya adalah menyambung integrasi asli, mengisi foto & harga final, lalu uji coba terbatas sebelum go-live."

---

## Jika ada kendala saat demo
| Gejala | Tindakan |
|---|---|
| GoSend Instant tidak muncul | Sudah lewat 16:00 WIB atau kota bukan Jabodetabek — pakai JNE, jelaskan cutoff |
| "Stok tidak cukup" di checkout | Data sudah terpakai sesi sebelumnya — pilih ukuran lain, atau seed ulang setelah meeting |
| Keranjang berisi item lama | Buka tab incognito |
| Admin terlempar ke login | Sesi 12 jam habis — login ulang |
| Voucher "Minimal belanja …" | Subtotal di bawah Rp500.000 — tambah item |
