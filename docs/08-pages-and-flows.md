# 08 — Halaman & alur

## 1. Sitemap

```
/                         → redirect /id
/[locale]                 Home
/[locale]/c/[discipline]  Listing (ballet, pointe, jazz, tap, character, latin-ballroom, contemporary,
                          leotards, skirts, tops, tights) + /c/shoes, /c/dancewear, /c/kids (agregat)
/[locale]/p/[slug]        PDP
/[locale]/search?q=       Hasil cari
/[locale]/cart            Keranjang
/[locale]/checkout        Checkout (?link=<token> dari admin)
/[locale]/pay/[orderNo]   Halaman bayar
/[locale]/success/[orderNo]
/[locale]/track           Lacak pesanan (form) → /[locale]/track/[orderNo]
/[locale]/size-guide      Panduan ukuran (halaman penuh, sama isi dengan modal)
/[locale]/info/{shipping|payment|faq|terms|privacy|about}
/admin/login · /admin · /admin/products · /admin/products/[id] · /admin/orders · /admin/orders/[orderNo]
/admin/checkout-links · /admin/outbox · /admin/back-in-stock
```

## 2. Global

- **Header** (sticky): wordmark kiri · nav tengah (desktop): SHOES · POINTE · DANCEWEAR · KIDS · TRACK ORDER · kanan: search, LanguageToggle, cart (badge jumlah). Mobile: hamburger kiri, wordmark tengah, search + cart kanan.
- **Mega menu Shoes** (desktop): kolom disiplin + kolom "Kids" + tile foto "Konsultasi ukuran via WA".
- **Footer** (`surface-alt`): kolom Belanja / Bantuan (Pengiriman, Pembayaran, FAQ, Lacak) / Tentang / Kontak (WA, alamat Jakarta, jam operasional) · baris logo pembayaran (QRIS, GoPay, OVO, DANA, ShopeePay, BCA, Mandiri, BNI, BRI, Permata, Visa, Mastercard) · logo kurir · LanguageToggle · disclaimer: "Relevé Dance Supply adalah toko independen dan tidak berafiliasi dengan Só Dança."
- **WA FAB** di semua halaman toko kecuali `/pay/*` & `/checkout` (di sana WA inline).
- **DemoBanner** saat `DEMO_MODE`.

## 3. Home
1. Hero: foto lifestyle, eyebrow "SÓ DANÇA · ORIGINAL", tagline display, CTA primary "Belanja Sepatu" + secondary "Konsultasi Ukuran".
2. Belanja per disiplin: 6 tile (Ballet, Pointe, Jazz, Tap, Ballroom, Dancewear).
3. "Ready di Jakarta": carousel 8 ProductCard status READY.
4. Banner split `accent`: "Bingung ukuran? Ukur kaki, kirim ke kami, kami bantu pilih." + WA.
5. Kids: 4 produk anak.
6. TrustStrip.
7. Cara belanja 3 langkah: Pilih ukuran → Bayar QRIS/VA/e-wallet → Dikirim dari Jakarta (instan Jabodetabek).

## 4. Listing
Breadcrumb · H1 disiplin + deskripsi singkat 1 kalimat · bar: jumlah produk, "Filter" (mobile) / sidebar (desktop), Sort · grid ProductCard · "Muat lebih banyak" · empty state (dengan WA).

## 5. PDP
Mobile urutan: galeri (swipe + dots) → eyebrow disiplin → nama (H1) → kode model → Price → VariantPicker (Warna, Size + "Panduan ukuran", Width, Shank) → AvailabilityLine → CTA (Tambah / Kabari) full-width → "Tanya via WA" → TrustStrip mini (Dikirim dari Jakarta · QRIS/VA/e-wallet) → accordion: Deskripsi · Fitur · Material & perawatan · Pengiriman · Pembayaran → CompareStyles → "Kamu mungkin suka".
Desktop: galeri kiri (grid 2 kolom thumbnail), info kanan sticky.
Pointe: callout `info` di atas CTA: "Pointe sebaiknya dicoba/difitting. Konsultasikan dulu via WA."

## 6. Checkout (satu halaman, 3 step)

```
[Ringkasan (collapsible mobile)]
① Kontak & Alamat   → nama, WA (+62), email opsional, opt-in WA, AddressForm
② Pengiriman        → CourierOption list (Instan / Express / Reguler), asuransi
③ Pembayaran        → PaymentMethodTile grup QRIS / E-wallet / VA / Kartu, voucher
[StickyPayBar: Total Rp … | Bayar Sekarang]
```
- Validasi per step, tombol "Lanjut" per step di mobile; desktop semua terbuka berurutan.
- Error stok saat submit → banner error di atas + item ditandai + tombol "Perbarui keranjang".
- Dari checkout link: banner `info` "Pesanan disiapkan oleh admin Relevé", item terkunci (qty tidak bisa diubah).

## 7. Halaman bayar `/pay/[orderNo]`
Header minimal (wordmark + "Butuh bantuan? WA") · nomor order (Salin) · Total · panel sesuai metode (QRISPanel / VAPanel / EwalletPanel / CardForm) · Countdown · "Ganti metode pembayaran" · "Kirim instruksi ke WA saya" · DemoPaymentControls (demo) · poll status tiap 5 dtk → sukses.
Expired: PaymentStatus kedaluwarsa + "Stok sudah dilepas" + CTA "Pesan lagi".

## 8. Sukses `/success/[orderNo]`
Ikon success · "Pembayaran berhasil" · nomor order · "Konfirmasi sudah dikirim ke WA +62 812-•••-7890" · ringkasan · estimasi kirim (pre-order: estimasi tiba) · OrderTimeline · CTA "Lacak Pesanan" + "Lanjut Belanja" + WA.

## 9. Lacak
Form: nomor order + 4 digit terakhir WA → OrderTimeline + item + info kurir/resi (Salin) + WA "Tanya pesanan ini".

## 10. Admin
- **Login** sederhana.
- **Dashboard**: StatCard (Menunggu bayar, Perlu diproses, Perlu dikirim, Stok rendah), tabel 10 order terbaru.
- **Produk**: DataTable (nama, kode, disiplin, harga, total stok, status), detail → info harga (MSRP, modal landed, harga, margin dari `pricing`) + VariantStockGrid per warna (baris size, kolom width) dengan input stok, toggle pre-order, lead time; Simpan.
- **Order**: filter status, detail (kontak, alamat, item, pembayaran, riwayat), StatusSelect (hanya transisi valid), input kurir + resi saat Kirim, tombol "Chat pembeli" (wa.me ke nomor pembeli).
- **Checkout link**: cari produk → pilih varian + qty → nama/WA opsional → Buat → link + "Salin" + "Kirim via WA" (wa.me ke nomor pembeli dengan teks berisi link).
- **WA Outbox**: list pesan dengan preview gelembung chat, filter template.
- **Back-in-stock**: daftar permintaan per varian, status notified.

## 11. Alur utama (ringkas)

```
Browse ─▶ PDP ─▶ pilih varian ─┬─ READY/LOW/PO ─▶ Cart ─▶ Checkout ─▶ Pay ─▶ (webhook PAID) ─▶ Success ─▶ WA: PAYMENT_PAID
                               ├─ SOLD_OUT ─▶ Kabari via WA ─▶ (admin restock) ─▶ WA: BACK_IN_STOCK
                               └─ ragu ukuran ─▶ wa.me ─▶ admin buat checkout link ─▶ Checkout(?link) ─▶ Pay …
Pay ─(expired)─▶ EXPIRED, stok dilepas ─▶ WA: PAYMENT_EXPIRED
Admin: PAID ─▶ PROCESSING ─▶ SHIPPED(resi) ─▶ WA: ORDER_SHIPPED ─▶ DELIVERED ─▶ WA: ORDER_DELIVERED
```
