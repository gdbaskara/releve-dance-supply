# 10 — Log keputusan & pertanyaan terbuka

## Keputusan (dikunci)

| # | Tanggal | Keputusan | Alasan / sumber |
|---|---|---|---|
| D-01 | 5 Nov 2026 | Produk: sepatu dansa & dancewear Só Dança (bukan ice skating) | Konfirmasi owner |
| D-02 | 5 Nov 2026 | Reseller **tidak resmi** → tanpa klaim official/authorized, logo & nama sendiri | Konfirmasi owner |
| D-03 | 5 Nov 2026 | Tone visual mirip Só Dança (rasa, bukan salinan) | Permintaan klien |
| D-04 | 5 Nov 2026 | Nama kerja: **Relevé Dance Supply** | Sementara |
| D-05 | 5 Nov 2026 | Bilingual ID (default) + EN; istilah dansa tidak diterjemahkan | Konfirmasi owner |
| D-06 | 5 Nov 2026 | **Tanpa COD** selamanya; digital only; cicilan/paylater ditunda | Owner: segmen menengah–atas |
| D-07 | 5 Nov 2026 | Payment gateway: **Xendit** (demo: mock) | Semua metode 1 API, payment link untuk WA |
| D-08 | 5 Nov 2026 | Pengiriman Pulau Jawa, gudang **Jakarta**, instan Jabodetabek | Konfirmasi owner |
| D-09 | 5 Nov 2026 | 1 nomor WA bisnis; WA-first; email opsional | Konfirmasi owner |
| D-10 | 5 Nov 2026 | Retur/tukar ukuran: **ditunda**, sementara lewat WA | Owner |
| D-11 | 5 Nov 2026 | B2B (studio/sanggar): tidak di demo | Owner belum tahu |
| D-12 | 5 Nov 2026 | Demo katalog 40 model (30 sepatu/tights + 10 dancewear), stok dummy per varian | Owner minta ≥ 30, dancewear ikut |
| D-13 | 5 Nov 2026 | Harga = modal landed impor resmi × multiplier (pointe 1,45 / sepatu 1,65 / dancewear & tights 1,8), kurs perencanaan Rp18.500 | `06-pricing.md` |
| D-14 | 5 Nov 2026 | Tech stack `04-tech-stack.md` | Dikunci |
| D-15 | 5 Nov 2026 | Light mode saja di v1 | Sederhana, sesuai referensi |
| D-16 | 5 Nov 2026 | Guest checkout, admin tunggal | Demo |
| D-17 | 5 Nov 2026 | Keranjang campuran ready + pre-order dikirim sekaligus (v1) | Sederhana; split shipment nanti |
| D-18 | 5 Nov 2026 | Next.js 16.4: `cacheComponents`/`partialPrefetching` **dimatikan**; semua halaman dinamis | Stok harus selalu segar; lebih sederhana untuk demo |
| D-19 | 5 Nov 2026 | Auth admin: **session cookie bertanda tangan (jose) + bcryptjs**, bukan Auth.js | 1 admin, lebih sedikit dependensi di Next 16 |
| D-20 | 5 Nov 2026 | Dev/demo lokal: PostgreSQL 16 di container; `drizzle-kit push` untuk skema (migrasi file saat menuju produksi) | Docker tidak diperlukan |
| D-21 | 5 Nov 2026 | Next 16: `middleware` → `src/proxy.ts`; layout akar terpisah untuk `[locale]` dan `admin` | Konvensi Next 16 |

## Terbuka (tidak menghalangi demo)

| # | Pertanyaan | Default sementara | Dampak |
|---|---|---|---|
| Q-01 | Apakah klien bisa dapat **harga grosir** (±50% MSRP) dari Só Dança? | Diasumsikan ya | Tanpa itu harga ±2× lebih mahal dari pasar (`06` §6) |
| Q-02 | Strategi **pointe** (Rp3 jt vs Bloch lokal Rp1,1–1,6 jt) | Multiplier 1,45, ditampilkan normal | Bisa jadi niche/pre-order atau margin turun |
| Q-03 | Nama & logo final | Relevé Dance Supply | Ganti wordmark & copy |
| Q-04 | Nomor WA demo | `NEXT_PUBLIC_WA_NUMBER` placeholder | — |
| Q-05 | Alamat gudang Jakarta (untuk kurir instan & footer) | Kota Jakarta Selatan | Tarif instan |
| Q-06 | Tabel ukuran cm resmi per kategori | Disalin dari size chart Só Dança (gambar) saat build — perlu dicek manual | Akurasi size guide |
| Q-07 | Verifikasi HS code, bea masuk, lartas, PPh 22 ke PPJK | Asumsi `06` §2 | Harga live |
| Q-08 | Kebijakan retur/tukar ukuran | Via WA, kasus per kasus | Halaman FAQ/terms |
| Q-09 | Foto produk sendiri | Placeholder | Wajib sebelum live |
