# Model Harga & Markup — Relevé Dance Supply (demo)

Status: **riset + asumsi kerja**, 5 Nov 2026. Angka pajak/bea **wajib diverifikasi** ke PPJK (customs broker) & konsultan pajak sebelum dipakai untuk harga live.
Konfigurasi bisa diubah di `data/catalog/pricing_config.json` → generate ulang katalog.

---

## 1. Kurs

- Spot USD/IDR **± Rp18.140** (mid-market 4 Nov 2026; rupiah bergerak Rp18.100–18.180 sepanjang hari). Sumber: [CNBC Indonesia](https://cnbcindonesia.com/market/20261104150643-17-782298/rupiah-ditutup-di-level-rp18155-per-dolar-as), [Pluang](https://pluang.com/en/tools/currency-converter/usd-idr), [Bisnis.com](https://market.bisnis.com/kurs).
- **Kurs perencanaan: Rp18.500** (spot + ±2% buffer untuk spread bank/transfer internasional & fluktuasi selama barang dalam perjalanan).
- Aturan: review harga kalau kurs bergerak > 3% dari kurs perencanaan.

## 2. Komponen biaya impor (jalur impor resmi, pakai NPWP + NIB/API)

| Komponen | Asumsi | Catatan |
|---|---|---|
| Harga beli (FOB) | **50% dari harga retail US (MSRP)** | Harga grosir/B2B standar industri (keystone). Lihat §5 — ini asumsi paling krusial |
| Ongkir internasional + asuransi | **12% dari FOB** | Air cargo dari US/Brasil, kiriman kecil-menengah |
| **Bea Masuk (BM)** | **25% dari CIF** | Sepatu HS 64xx umumnya 20–30% (tergantung sub-pos); pakaian HS 61 ±25%. Tidak ada FTA dengan US/Brasil → tarif MFN. **Cek HS 8 digit di [INSW/BTKI](https://insw.go.id)** |
| **PPN impor** | **11% efektif** dari (CIF + BM) | Tarif 12% × DPP 11/12. Jadi **biaya** kalau toko belum PKP; jadi **kredit pajak** kalau sudah PKP |
| **PPh 22 impor** | **2,5%** (punya API) / 7,5% (tanpa API) | **Bukan biaya** — prepaid tax, dikreditkan ke PPh tahunan. Tapi makan cashflow. Beberapa barang konsumsi bisa kena 10% → cek |
| PPJK, handling, gudang, trucking | **4% dari CIF** | Jasa broker, biaya bandara, kirim ke gudang Jakarta |
| Lartas / izin impor | — | Alas kaki & pakaian bisa masuk barang larangan/pembatasan (Persetujuan Impor / laporan surveyor). **Wajib dicek ke PPJK** |

Sumber umum perhitungan: [ARMOCargo](https://armocargo.com/blog/cara-menghitung-bea-masuk-nilai-impor-cif-rumus-contoh-lengkap-2026/), [Klikpajak](https://klikpajak.id/blog/pajak-bea-cukai-2021-menghitung-bea-masuk-dan-pajak-impor-belanja-online/), [Indo Express (regulasi 2026)](https://www.indoexpress.co.id/regulasi-impor-indonesia.html), [ImportResmi (PPh 22)](https://www.importresmi.com/post/pajakimpornaik). Sumber-sumber ini blog/vendor dan angkanya kadang beda → **verifikasi**.

### Rumus

```
FOB         = MSRP_USD × 50%
CIF         = FOB × 1,12
BM          = CIF × 25%
PPN impor   = (CIF + BM) × 11%          ← biaya jika non-PKP
Handling    = CIF × 4%
Landed (USD)= CIF + BM + Handling (+ PPN impor jika non-PKP)
Landed (IDR)= Landed USD × 18.500
Harga jual  = Landed IDR × Multiplier, dibulatkan ke atas Rp5.000
```

Hasilnya: **modal landed ≈ 0,80 × MSRP** (non-PKP) → per $1 MSRP ≈ **Rp14.790** modal.

## 3. Markup yang proper

Patokan ritel fashion/olahraga: **gross margin 35–50%**, **net profit 10–25%**. "Berlipat-lipat" (2×) itu biasanya dihitung dari **harga grosir**, bukan dari modal landed. Dari modal landed, impor sudah memakan ±60% dari harga grosir.

Biaya operasional yang harus ditutup margin:

| Biaya | % dari penjualan |
|---|---|
| Payment gateway (Xendit; QRIS ±0,7%, VA flat, kartu ±2,9%) | ±2% (blended) |
| Overhead (sewa gudang Jakarta, admin WA, foto, iklan, packaging) | ±12% |
| Risiko stok (ukuran yang tidak laku, rusak, retur) | ±5% |
| PPh Final UMKM (PP 55/2022, jika omzet < Rp4,8 M/tahun) | 0,5% |

**Multiplier yang dipakai (dari modal landed):**

| Grup | Multiplier | Gross margin | Est. net profit | Alasan |
|---|---|---|---|---|
| Pointe | **1,45×** | ±31% | **±12%** | Barang habis pakai (penari ganti tiap beberapa minggu/bulan), sangat dibandingkan harga → margin tipis, jadi magnet traffic & repeat order |
| Sepatu lain (ballet, jazz, tap, character, latin) | **1,65×** | ±39% | **±20%** | Inti bisnis |
| Leotard, skirt, top | **1,80×** | ±44% | **±25%** | Fashion, kurang dibandingkan harga, banyak varian warna |
| Tights & aksesori | **1,80×** | ±44% | **±25%** | Item add-on, nilai kecil |

Kalau dilihat dari harga US: **sepatu ≈ 1,35× MSRP**, **dancewear ≈ 1,47×**, **pointe ≈ 1,18×** (dalam Rupiah kurs spot).

## 4. Contoh hitung

**SD16 Stretch Canvas Ballet (Kids) — MSRP $27,50**
FOB $13,75 → CIF $15,40 → BM $3,85 → PPN impor $2,12 → handling $0,62 → landed **$21,98 = Rp406.700**
× 1,65 = **Rp675.000**. Gross margin 40%, est. net ±20% (± Rp135.000/pasang).

**Alina I Pointe P88 — MSRP $140**
landed **Rp2.070.000** × 1,45 = **Rp3.005.000**. Est. net ±12% (± Rp350.000/pasang).

Tabel lengkap 40 model: `data/catalog/README.md`.

## 5. Cek harga pasar (marketplace Indonesia)

| Produk | Harga US | Harga di Indonesia (listing) | Model kita |
|---|---|---|---|
| Só Dança SD16 stretch canvas | $27,50 (≈Rp499rb) | **Rp460rb – Rp555rb** (Tokopedia) | Rp675rb |
| Bloch Suprima pointe | ±$126–151 | **Rp1,2 – 1,5 jt** | — |
| Bloch Triomphe pointe | — | Rp1,6 jt | — |
| Capezio Contempora / Pavlowa pointe | ±$112 | Rp1,55 jt / Rp1,1 jt (Shopee) | — |
| Só Dança Alina pointe | $140 | (tidak ditemukan) | **Rp3,0 jt** |
| Tap shoes (merek lain) | — | Rp1,07 – 1,2 jt | Theo Rp930rb |

Sumber: [Tokopedia SD16 – Mainstream](https://www.tokopedia.com/mainstream/sepatu-ballet-so-danca-canvas-elastic-premium-6-5-c-standart), [Tokopedia "bloch"](https://www.tokopedia.com/find/bloch), [Tokopedia "pointe shoes"](https://www.tokopedia.com/find/pointe-shoes), [Tokopedia BDS Indonesia](https://www.tokopedia.com/bdsindonesiaofficial), [BigGo](https://biggo.id/s/pointe+shoes+ballet/), [ThePointeShop](https://thepointeshop.com/collections/bloch). Listing marketplace bisa sudah berubah.

**Kesimpulan pasar:**
1. **Sepatu non-pointe & dancewear**: harga kita ±20–25% di atas listing marketplace. Masih masuk akal untuk segmen premium (stok jelas, konsultasi ukuran, pengiriman cepat dari Jakarta, garansi barang original), tapi **jangan lebih tinggi lagi**.
2. **Pointe = masalah.** Bloch/Capezio pointe di Indonesia dijual **Rp1,1–1,6 jt** — lebih murah dari harga US-nya. Artinya distributor resminya dapat harga beli jauh di bawah 50% MSRP. Alina Rp3 jt akan kalah bersaing. Opsi: (a) pointe Só Dança sebagai **pre-order/niche** untuk penari yang memang cocok di kaki, bukan andalan; (b) cari harga beli lebih murah (beli dari Brasil/negara asal, volume); (c) multiplier pointe diturunkan ke ±1,25× (net mendekati 0–5%).
3. **Reseller lokal yang jual SD16 di Rp460–555rb** kemungkinan dapat harga beli lebih murah dari asumsi kita, atau tidak lewat jalur impor resmi (jastip/barang bawaan). Kita tetap jalur resmi (NPWP) — itu nilai jual (barang legal, ada faktur).

## 6. Hal paling krusial: harga beli

| Skenario | Harga beli | Modal landed | SD16 dijual | Viable? |
|---|---|---|---|---|
| **A. Akun grosir/B2B** (asumsi model) | 50% MSRP | ±0,80× MSRP | Rp675rb | ✅ |
| B. Beli retail saat promo/sale | ±75% MSRP | ±1,20× MSRP | ±Rp1,0 jt | ⚠️ susah |
| C. Beli retail harga normal | 100% MSRP | ±1,60× MSRP | ±Rp1,34 jt | ❌ 2,5× harga pasar |

Jadi meskipun **tidak resmi**, toko **harus dapat harga grosir** (Só Dança punya portal B2B untuk retailer — biasanya butuh data usaha, tapi tidak harus distributor resmi). Tanpa itu, harga tidak akan bersaing. **Ini perlu dikonfirmasi ke klien.**

## 7. PKP atau non-PKP

- **Non-PKP (default model)**: omzet < Rp4,8 M/tahun, bayar PPh Final 0,5% omzet. PPN impor jadi biaya. Harga jual **tidak** menambah PPN.
- **PKP**: PPN impor bisa dikreditkan → modal turun ±10%, tapi harga jual wajib + PPN 11% efektif → harga ke konsumen hampir sama, admin pajak lebih berat (e-Faktur). Ubah `"pkp": true` di config untuk lihat hasilnya.
- Rekomendasi: mulai **non-PKP** sampai omzet mendekati batas.

## 8. Yang harus diverifikasi sebelum harga live

1. HS code 8 digit tiap kategori (ballet flat kanvas, sepatu kulit, tap, leotard) & tarif BM-nya — via PPJK / INSW.
2. Lartas alas kaki & pakaian (Persetujuan Impor, laporan surveyor) — apakah bisa impor umum dengan NIB/API-U.
3. Tarif PPh 22 untuk HS tersebut (2,5% vs 7,5% vs 10%).
4. Harga beli asli dari Só Dança (B2B) atau supplier + ongkir kargo aktual.
5. Kebijakan harga minimum (MAP) dari Só Dança, kalau ada.
