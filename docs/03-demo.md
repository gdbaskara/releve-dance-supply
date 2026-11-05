# 03 — Demo: ruang lingkup & skenario

## 1. Tujuan demo
Klien bisa mencoba **alur jual end-to-end** di HP dan laptop: lihat katalog → pilih ukuran → checkout → bayar (simulasi) → notifikasi WA (simulasi) → admin proses & kirim → pembeli lacak. Semua terasa nyata, tanpa akun payment gateway / kurir / WA API.

## 2. Asli vs simulasi

| Bagian | Di demo | Nanti (produksi) |
|---|---|---|
| Katalog, stok, order, admin | **Asli** (Postgres) | Sama |
| Pembayaran | `MockPaymentProvider` — QR & VA dummy, tombol "Simulasikan Bayar" | `XenditProvider` |
| Ongkir | `MockShippingProvider` — `data/shipping/mock-rates.json` | Biteship |
| Wilayah | `data/shipping/java-areas.json` (prov + kab/kota), kecamatan & kode pos input bebas | Biteship Area API |
| WhatsApp keluar (notifikasi) | `OutboxMessagingProvider` — tersimpan & tampil di Admin → WA Outbox | WhatsApp Business API |
| WhatsApp masuk (tanya) | **Asli** — link `wa.me` ke nomor demo | Sama |
| Foto produk | Placeholder netral (default). Flag `DEMO_USE_REFERENCE_IMAGES=true` memakai URL referensi sodanca.com — **hanya untuk presentasi internal** | Foto sendiri |
| Harga | Model markup (`06-pricing.md`) | Harga final klien |

Banner kecil di atas halaman saat `DEMO_MODE=true`: "Mode demo — pembayaran & pengiriman disimulasikan."

## 3. Data demo

| Data | File | Isi |
|---|---|---|
| Produk & varian | `data/catalog/products.json` | 40 model, 2.903 SKU, harga, stok |
| Varian (tabel) | `data/catalog/variants.csv` | Untuk dibuka klien di Sheets |
| Asumsi harga | `data/catalog/pricing_config.json` | Kurs 18.500, bea, multiplier |
| Wilayah | `data/shipping/java-areas.json` | 6 provinsi, 119 kab/kota, zona Z1–Z4 |
| Tarif | `data/shipping/mock-rates.json` | 7 layanan kurir, asuransi |
| Seed tambahan (dibuat agent WS-2) | `src/db/seed/*` | 1 admin, 12 order contoh di berbagai status, 3 permintaan back-in-stock, voucher `RELEVE10` |

Distribusi stok sengaja beragam supaya semua status terlihat: READY 1.023 SKU · LOW 680 · PREORDER 582 · SOLD_OUT 618. Produk penting untuk demo:
- **Diamond SD140 (Adult)** — hampir semua ukuran ready → alur happy path.
- **Alina IV P95** — banyak "Sisa 1–3" → urgensi stok.
- **Briar SD110L, Jaxon JZ86L, Claudine SD155** — full pre-order.
- **Roy BL104, Elsie SL248** — habis → "Kabari saya via WA".
- **SD09 / Toshie** — pointe dengan pilihan **shank**.

## 4. Skenario demo (wajib lulus — juga jadi test E2E Playwright)

| # | Skenario | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| D1 | **Happy path QRIS + kurir instan** | HP → Ballet → Diamond SD140 → Ballet Pink, size, width → Tambah → Checkout, alamat Kota Jakarta Selatan → GoSend Instant → QRIS → Simulasikan Bayar | Halaman sukses, stok varian −1, WA outbox "Pembayaran diterima" |
| D2 | **Konsultasi ukuran → link checkout → VA** | PDP Alina → "Tanya via WA" (pesan terisi) → Admin buat checkout link untuk varian itu → buka link → VA BCA → salin nomor → Simulasikan Bayar | Order PAID dari link admin |
| D3 | **Stok habis → kabari saya** | Roy BL104 → pilih ukuran → "Kabari Saya via WA" → isi WA → Admin tambah stok varian itu | WA outbox "Stok sudah ready" |
| D4 | **Pre-order + ready campur** | Tambah Briar (pre-order) + Diamond (ready) → checkout | Label pre-order & estimasi 4–6 minggu di cart, ringkasan, sukses |
| D5 | **Di luar Jawa** | Checkout → cari provinsi Bali | Tidak ada; link WA "Di luar Pulau Jawa?" |
| D6 | **Kedaluwarsa → stok kembali** | Checkout item "Sisa 1" → Simulasikan Kedaluwarsa | Order EXPIRED, stok available kembali, WA outbox "Pembayaran kedaluwarsa" |
| D7 | **Admin kirim + lacak** | Admin → order PAID → Proses → Kirim (JNE, resi) → pembeli buka Lacak (nomor order + 4 digit WA) | Timeline SHIPPED, WA outbox berisi resi |
| D8 | **Bahasa** | Toggle EN di PDP pointe | UI Inggris, istilah (pointe, shank, vamp, Ballet Pink) & format Rp tetap |
| D9 | **Rebutan stok terakhir** (test otomatis saja) | 2 checkout paralel untuk varian available=1 | Satu berhasil, satu ditolak "Stok tidak cukup" |

## 5. Deploy demo
- URL preview (Vercel) + Postgres (Neon). Admin: kredensial dari env, diberikan ke klien terpisah.
- Storybook di-deploy terpisah (`/storybook` atau project Vercel kedua) untuk review design system.
