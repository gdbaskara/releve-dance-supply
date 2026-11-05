# 00 — Brief (baca ini dulu)

**Proyek:** Web toko **Relevé Dance Supply** (nama kerja) — reseller **tidak resmi** produk **Só Dança** (sepatu dansa & dancewear) di Indonesia.
**Fase:** **Demo untuk klien.** Fungsional end-to-end, tapi pembayaran, ongkir, dan WhatsApp **disimulasikan** (siap disambung ke layanan asli).
**Status dokumen:** v1.0 — 5 Nov 2026. Requirement terkunci kecuali yang ada di `10-decisions.md` → "Terbuka".

## Satu kalimat
Toko dansa premium yang terasa seperti Só Dança (bersih, monokrom, foto besar, katalog per disiplin), tapi cara belanjanya Indonesia: Bahasa Indonesia/English, WhatsApp-first, QRIS/VA/e-wallet, ongkir kurir lokal se-Pulau Jawa dari Jakarta, stok jujur per ukuran.

## Keputusan kunci (non-negotiable)

1. **Tanpa COD.** Tidak di UI, tidak di backend, tidak di roadmap.
2. **Pembayaran 100% digital:** QRIS, e-wallet (GoPay, OVO, DANA, ShopeePay), Virtual Account (BCA, Mandiri, BNI, BRI, Permata), kartu kredit/debit (bayar penuh). **Tanpa cicilan/paylater** di v1.
3. **WhatsApp-first:** tombol WA di produk, size guide, keranjang, checkout, halaman bayar, lacak pesanan. Nomor WA wajib di checkout; email opsional.
4. **Pengiriman Pulau Jawa saja**, gudang **Jakarta**. Instan/same-day khusus Jabodetabek.
5. **Bilingual ID (default) + EN.** Istilah dansa **tidak diterjemahkan** (glosarium di `07-design-system.md` §8).
6. **Reseller tidak resmi:** dilarang klaim "Official", "Authorized", "Só Dança Indonesia"; dilarang memakai logo Só Dança sebagai logo toko. Boleh menyebut "Produk original Só Dança (impor)".
7. **Stok per varian** (model × warna × size × width × shank), reservasi saat bayar, potong saat lunas.
8. **Guest checkout** (tanpa akun pembeli). Admin login.
9. **Light mode saja** di v1.
10. Harga = **markup dari modal impor resmi** (lihat `06-pricing.md`).

## Isi paket

| File | Isi |
|---|---|
| `01-research.md` | Riset Só Dança, pasar, pembayaran, pengiriman, prinsip lokalisasi |
| `02-requirements.md` | Requirement fungsional (ID `FR-*`) + non-fungsional (`NFR-*`) + acceptance criteria |
| `03-demo.md` | Ruang lingkup demo, apa yang di-mock, 8 skenario demo |
| `04-tech-stack.md` | Stack terkunci, struktur repo, konvensi kode, environment |
| `05-data-and-contracts.md` | Skema DB, state machine order, logika stok, interface provider, API |
| `06-pricing.md` | Kurs, pajak impor, markup, cek harga pasar |
| `07-design-system.md` | Prinsip, token, tipografi, komponen + state, copy & glosarium |
| `08-pages-and-flows.md` | Sitemap, spesifikasi per halaman, alur checkout |
| `09-work-plan.md` | Workstream (siap multi-agent), urutan, dependency, Definition of Done |
| `10-decisions.md` | Log keputusan + pertanyaan terbuka |
| `../messages/{id,en}/<namespace>.json` | Teks UI per namespace (owner per namespace: `09`) |
| `../data/` | Katalog 40 model / 2.903 SKU, wilayah Jawa, tarif ongkir simulasi |
| `../design-system/` | `tokens.json`, `tokens.css`, `glossary.json` |
