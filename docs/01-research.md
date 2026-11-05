# 01 — Riset

Tanggal riset: 5 Nov 2026. Angka pasar banyak dari blog vendor → anggap estimasi.

## 1. Referensi: Só Dança (sodanca.com)

- Brand **sepatu & dancewear dansa** (US/Brasil): ballet, pointe, jazz, tap, character, latin/ballroom, contemporary + leotard, tights, skirt, warm-up.
- Website Shopify. Navigasi top-level: **Shoes · Dancewear · Children · Sale** + blog/loyalty, B2B login, store locator ("Find a Retailer").
- Katalog per **disiplin**; filter: gender, availability, price, color (nama warna sepatu: Ballet Pink, Theatrical Pink, Suntan, Caramel, Mocha…).
- Varian **color × size × width** (pointe + **shank**); SKU & barcode per varian; label **backorder** ("delivery in 4–6 weeks"); tabel **Compare Similar Styles**; size chart (gambar).
- Copy: hangat, aspiratif, inklusif ("Everything you need to move, grow, and find your place in ballet"); product copy teknis & benefit-led.
- Foto: produk di latar polos (square) + lifestyle studio/kelas.

Sumber: [sodanca.com](https://www.sodanca.com/), [FAQ](https://www.sodanca.com/pages/faq), [Store locator](https://www.sodanca.com/pages/store-locator-2), katalog publik `products.json` (dipakai untuk `data/catalog`).

## 2. Pasar Indonesia

- Sepatu balet dominan dijual di **marketplace** (Tokopedia/Shopee/Lazada), mayoritas generik murah (Rp100–400rb). Toko spesialis dansa premium dengan web sendiri **hampir tidak ada** → celah.
- Ada distributor merek (contoh: Ballet and Dance Shop Indonesia untuk Bloch) dengan harga pointe Bloch/Capezio **Rp1,1–1,6 jt**.
- Só Dança SD16 dijual reseller marketplace **Rp460–555rb**.
- Target: **kelas menengah–atas** — orang tua murid sanggar/sekolah balet, penari dewasa, guru. Literasi digital "menengah": paham QRIS/m-banking, tidak suka UI ruwet.
- **Mobile >70%** belanja online → mobile-first.
- **WhatsApp** = kanal utama penjual–pembeli di Indonesia (email lemah).

Sumber: [Tokopedia "balet"](https://www.tokopedia.com/find/balet), [Tokopedia "bloch"](https://www.tokopedia.com/find/bloch), [Tokopedia SD16](https://www.tokopedia.com/mainstream/sepatu-ballet-so-danca-canvas-elastic-premium-6-5-c-standart), [BDS Indonesia](https://www.tokopedia.com/bdsindonesiaofficial), [Mekari Qontak](https://mekari.com/en/qontak/whatsapp-business-api/).

## 3. Pembayaran digital

- E-wallet ±35–42% transaksi e-commerce, transfer bank / Virtual Account ±23–34%, kartu ±10%. **QRIS** = standar QR Bank Indonesia, bisa dibayar dari semua e-wallet & m-banking.
- COD masih ada di pasar massal — **sengaja tidak dipakai** (segmen premium, keputusan owner).

Sumber: [Antom](https://www.antom.com/markets/indonesia), [Shoplazza](https://www.shoplazza.com/blog/indonesian-payment-methods), [Xendit](https://www.xendit.co/en-id/blog/7-most-popular-payment-methods-in-indonesia/), [Tazapay](https://tazapay.com/en-sg/blog/local-payment-methods-in-indonesia-dana).

## 4. Pengiriman

- Agregator **Biteship**: satu API untuk JNE, J&T, SiCepat, AnterAja, GoSend, Grab (rates, order, tracking, Area API). Sumber: [Biteship](https://biteship.com/en/produk/shipping), [panduan](https://help.biteship.com/hc/id/articles/58144517272089).

## 5. Lokalisasi: "lokal, bukan clone"

iBox/Erafone mirip Apple karena reseller resmi yang terikat brand guideline. Kita **reseller tidak resmi** → tidak boleh mengaku resmi, dan tidak perlu meniru 1:1. Yang dilokalkan adalah **perilaku belanja**:

| Area | Gaya global | Versi kita |
|---|---|---|
| Bahasa | English | **ID default + EN**, istilah dansa tidak diterjemahkan |
| Kontak | Email | **WhatsApp di setiap titik keputusan** |
| Bayar | Kartu | **QRIS, e-wallet, VA, kartu** — tanpa COD |
| Ukuran | US size chart | Size chart + **cm** + konsultasi ukuran via WA |
| Kirim | Flat rate | Ongkir per kurir, **instan Jabodetabek** |
| Harga | USD | **Rp 1.250.000** |
| Trust | Nama brand | Barang original impor resmi, stok jujur, alamat Jakarta, testimoni sanggar |
