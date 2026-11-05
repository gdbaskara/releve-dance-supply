# 02 — Requirements

Prioritas: **M** = wajib untuk demo · **S** = sebaiknya ada di demo · **L** = nanti (bukan demo).
Setiap FR punya acceptance criteria (AC) yang bisa dites. Agent wajib mereferensikan ID FR di commit/PR.

---

## A. Katalog (CAT)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| CAT-01 | M | Navigasi utama: **Shoes · Dancewear · Kids · Pointe** + search | Menu tampil di header desktop; di mobile lewat drawer. Tiap item ke halaman listing yang benar |
| CAT-02 | M | Listing per disiplin: Ballet, Pointe, Jazz, Tap, Character, Latin/Ballroom, Contemporary, Leotards, Skirts, Tops, Tights | URL `/[locale]/c/[discipline]`; jumlah produk sesuai `data/catalog/products.json` |
| CAT-03 | M | Filter: disiplin, untuk (Adult/Kids/Men), ukuran, width, warna, rentang harga, **ketersediaan** (Ready / Pre-order) | Filter bisa digabung; state filter di query string (bisa di-share); tombol "Reset" |
| CAT-04 | M | Sort: Terbaru (default), Harga ↑, Harga ↓ | Hasil berurutan benar |
| CAT-05 | M | ProductCard: foto 1:1, nama, kode model (SD16), harga Rp, swatch warna (maks 5 + "+N"), badge stok agregat | Badge: "Ready" bila ada varian READY/LOW; "Pre-order" bila hanya PREORDER; "Habis" bila semua SOLD_OUT |
| CAT-06 | M | Search nama / kode model | "sd16" dan "bliss" menemukan Bliss Stretch Canvas SD16; hasil kosong → empty state + CTA WA |
| CAT-07 | S | Homepage: hero editorial, belanja per disiplin, produk ready-stock, banner "Konsultasi ukuran via WA", trust strip | — |
| CAT-08 | L | Wishlist, recently viewed | — |

## B. Halaman produk (PDP)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| PDP-01 | M | Galeri foto (swipe di mobile), nama, kode model, merek "Só Dança", harga | Harga format `Rp 675.000` |
| PDP-02 | M | Pemilih varian: **Warna → Size → Width → Shank** (hanya opsi yang dimiliki produk) | Opsi yang kombinasinya SOLD_OUT tetap terlihat tapi dicoret + tooltip "Habis"; pilihan warna mengganti foto (jika ada) |
| PDP-03 | M | Status stok **per varian terpilih**: Ready (kirim 1–2 hari kerja) / Sisa N / Pre-order (estimasi 4–6 minggu) / Habis | Berubah real-time saat varian diganti; sebelum varian lengkap dipilih tampil "Pilih ukuran" |
| PDP-04 | M | CTA utama: "Tambah ke Keranjang" (Ready/Sisa/Pre-order) atau "Kabari Saya via WA" (Habis) | Tombol disabled sampai varian lengkap; qty maks = stok (READY/LOW) atau 5 (PREORDER) |
| PDP-05 | M | Tombol sekunder **"Tanya via WA"** dengan pesan terisi | Membuka `wa.me/<WA_NUMBER>?text=` berisi nama, kode, varian terpilih, URL produk (lihat `05` §6) |
| PDP-06 | M | **Size guide** modal: tabel ukuran per kategori (US → cm panjang kaki), cara ukur kaki, CTA "Konsultasi ukuran via WA" | Untuk Pointe tampil info "Disarankan konsultasi/fitting sebelum membeli pointe" |
| PDP-07 | M | Deskripsi (EN dari sumber + poin fitur ID), material, perawatan, info pengiriman & pembayaran ringkas | — |
| PDP-08 | S | "Bandingkan model serupa" (3 produk satu disiplin) | — |
| PDP-09 | M | Label kepercayaan: "Produk original Só Dança · Impor resmi" — **tanpa** kata official/authorized | Grep codebase: tidak ada string "official"/"authorized"/"resmi Só Dança" |

## C. Keranjang (CART)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| CART-01 | M | Cart drawer (dibuka setelah add) + halaman `/cart` | — |
| CART-02 | M | Ubah qty, hapus, ubah varian; validasi ulang stok setiap buka keranjang | Jika stok turun di bawah qty → qty disesuaikan + notice |
| CART-03 | M | Item pre-order diberi label + estimasi; keranjang campuran ready + pre-order dikirim **sekaligus** saat semua siap (v1) | Notice jelas di cart & ringkasan checkout |
| CART-04 | M | Ringkasan: subtotal, "Ongkir dihitung di checkout", total | — |
| CART-05 | M | Keranjang disimpan di localStorage (guest) | Reload browser → isi keranjang tetap |
| CART-06 | S | Tombol "Tanya keranjang ini via WA" (pesan berisi daftar item) | — |

## D. Checkout (CHK)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| CHK-01 | M | Guest checkout satu halaman, 3 seksi bertahap: **Kontak & Alamat → Pengiriman → Pembayaran** | Mobile: seksi berikut terbuka setelah seksi sebelumnya valid |
| CHK-02 | M | Kontak: nama lengkap, **nomor WA** (wajib, normalisasi ke `+62`), email (opsional), checkbox "Kirim update pesanan via WhatsApp" (default ON) | `0812-3456-7890`, `62812…`, `+62 812…` → `+6281234567890`; tolak jika < 9 atau > 13 digit setelah 62 |
| CHK-03 | M | Alamat: Provinsi (6 provinsi Jawa) → Kab/Kota (`data/shipping/java-areas.json`) → Kecamatan (teks) → Kode pos (5 digit) → Alamat lengkap → Catatan kurir | Provinsi luar Jawa tidak ada di dropdown; link "Di luar Pulau Jawa? Hubungi kami via WA" |
| CHK-04 | M | Pengiriman: daftar layanan dari ShippingProvider (harga, estimasi), dikelompokkan **Instan · Express · Reguler**; asuransi default ON | Instan hanya tampil untuk zona Z1 (Jabodetabek) & sebelum cutoff |
| CHK-05 | M | Pembayaran: tile metode (QRIS, e-wallet, VA per bank, kartu), urutan sesuai `05` §5 | **Tidak ada opsi COD**; tidak ada cicilan |
| CHK-06 | M | Ringkasan pesanan sticky (desktop) / collapsible (mobile): item, subtotal, ongkir, asuransi, **total** | Total = subtotal + ongkir + asuransi; angka sama dengan server |
| CHK-07 | M | Tombol "Bayar Sekarang" → server membuat order + reservasi stok + payment → redirect ke halaman bayar | Jika stok tidak cukup: tidak buat order, tampilkan item bermasalah |
| CHK-08 | M | Persetujuan: "Dengan membayar, kamu menyetujui Syarat & Ketentuan" (link) | — |
| CHK-09 | S | Voucher/kode promo (1 kode, persen atau nominal) | Kode demo: `RELEVE10` (10%, min Rp500.000) |
| CHK-10 | M | **Checkout link** dari admin (lihat ADM-05) mem-prefill keranjang & kontak | `/[locale]/checkout?link=<token>`; token kedaluwarsa 48 jam |

## E. Pembayaran (PAY)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| PAY-01 | M | Semua pembayaran lewat interface `PaymentProvider`; demo memakai `MockPaymentProvider` | Ganti provider = ganti 1 env var `PAYMENT_PROVIDER` |
| PAY-02 | M | Halaman bayar QRIS: QR besar, nominal, countdown 30 menit, "Cara bayar", tombol unduh QR | QR berisi string mock (render via lib QR) |
| PAY-03 | M | Halaman bayar VA: nama bank, nomor VA (mono, tombol **Salin**), nominal (Salin), countdown 24 jam, instruksi per kanal (ATM / m-banking / internet banking) dalam accordion | — |
| PAY-04 | M | E-wallet: tombol "Buka GoPay/OVO/DANA/ShopeePay" (mock redirect ke halaman konfirmasi), countdown 15 menit | — |
| PAY-05 | M | Kartu: form nomor kartu, exp, CVV (mock, tidak disimpan), langkah 3DS simulasi | Kartu tes `4000 0000 0000 0002` gagal, nomor lain sukses |
| PAY-06 | M | Status di-poll tiap 5 detik; saat PAID → redirect ke halaman sukses | — |
| PAY-07 | M | **Mode demo**: tombol "Simulasikan Pembayaran Berhasil" dan "Simulasikan Kedaluwarsa" (hanya jika `DEMO_MODE=true`) | Memanggil webhook mock yang sama dengan jalur produksi |
| PAY-08 | M | Webhook idempoten & diverifikasi (token/signature) | Webhook dikirim 2× → order tetap 1×PAID, stok dipotong 1× |
| PAY-09 | S | "Kirim instruksi pembayaran ke WA saya" | Membuat pesan di WA outbox (demo) |
| PAY-10 | M | Ganti metode pembayaran sebelum bayar | Payment lama dibatalkan, reservasi tetap |
| PAY-11 | L | Xendit sandbox/live, cicilan, paylater | — |

## F. Stok (STK)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| STK-01 | M | Stok per varian: `on_hand`, `reserved`; `available = on_hand − reserved` | — |
| STK-02 | M | Status: READY (available > 3), LOW (1–3, tampil "Sisa N"), PREORDER (0 & `preorder_enabled`), SOLD_OUT (0 & tidak pre-order) | Ambang 3 bisa diubah di config |
| STK-03 | M | Reservasi dibuat saat order dibuat, kedaluwarsa = masa berlaku pembayaran + 5 menit | Order EXPIRED → reservasi dilepas otomatis (job tiap 1 menit atau lazy saat baca) |
| STK-04 | M | Saat PAID: `on_hand −= qty`, `reserved −= qty` dalam satu transaksi | Tidak pernah negatif (constraint DB) |
| STK-05 | M | **Tidak boleh oversell**: dua checkout bersamaan untuk stok terakhir → hanya satu berhasil | Test konkurensi lulus |
| STK-06 | M | Pre-order tidak mengurangi stok; dicatat sebagai `preorder` di order item | — |
| STK-07 | M | Back-in-stock: simpan nomor WA + varian; saat stok varian > 0 → pesan WA (outbox) | — |
| STK-08 | M | Semua perubahan stok tercatat di `stock_movements` (siapa, kapan, alasan) | — |

## G. Pengiriman (SHP)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| SHP-01 | M | `ShippingProvider` interface; demo `MockShippingProvider` membaca `data/shipping/mock-rates.json` | — |
| SHP-02 | M | Berat = Σ(berat varian × qty) + 150 g packaging, dibulatkan ke atas per kg | — |
| SHP-03 | M | Admin input nomor resi + kurir → status SHIPPED → pesan WA | — |
| SHP-04 | S | Halaman lacak menampilkan timeline mock (Dikemas → Dikirim → Dalam perjalanan → Terkirim) | — |
| SHP-05 | L | Biteship live (rates, order, tracking webhook) | — |

## H. WhatsApp (WA)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| WA-01 | M | Satu nomor bisnis dari env `NEXT_PUBLIC_WA_NUMBER` | — |
| WA-02 | M | Tombol WA floating (semua halaman toko kecuali halaman bayar) + inline di PDP, size guide, cart, checkout, sukses, lacak | — |
| WA-03 | M | Template pesan pre-filled per konteks (lihat `05` §6), bahasa mengikuti locale | — |
| WA-04 | M | Notifikasi transaksional lewat `MessagingProvider`; demo = `OutboxMessagingProvider` (simpan ke tabel `wa_outbox`, tampil di admin) | Event: ORDER_CREATED, PAYMENT_PAID, ORDER_SHIPPED, ORDER_DELIVERED, PAYMENT_EXPIRED, BACK_IN_STOCK |
| WA-05 | M | Hormati opt-in: notifikasi hanya jika checkbox ON | — |
| WA-06 | L | WhatsApp Business API (BSP / Meta Cloud API) | — |

## I. Pesanan & lacak (ORD)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| ORD-01 | M | Nomor order format `RDS-YYMMDD-XXXX` (XXXX = base32 acak) | Unik |
| ORD-02 | M | Halaman sukses: nomor order, ringkasan, "Konfirmasi dikirim ke WA kamu", tombol lacak & WA | — |
| ORD-03 | M | Lacak pesanan tanpa login: input nomor order + 4 digit terakhir nomor WA | Salah → pesan generik (tidak membocorkan keberadaan order) |
| ORD-04 | M | Timeline status (lihat state machine `05` §3) | — |

## J. Admin (ADM) — Bahasa Indonesia saja

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| ADM-01 | M | Login admin (1 akun seed dari env) | Route `/admin/*` terlindungi |
| ADM-02 | M | Dashboard: order hari ini, menunggu bayar, perlu dikirim, varian stok rendah | — |
| ADM-03 | M | Produk & stok: tabel per produk → grid varian (size × width) dengan input stok, toggle pre-order, lead time | Simpan → `stock_movements` tercatat |
| ADM-04 | M | Order: list + filter status, detail, ubah status (Proses, Kirim + resi, Selesai, Batalkan) | Transisi mengikuti state machine |
| ADM-05 | M | **Buat checkout link**: pilih varian + qty, isi nama/WA (opsional), harga tetap dari katalog → link + tombol "Kirim via WA" | Link valid 48 jam |
| ADM-06 | M | WA outbox: daftar pesan yang "terkirim" (demo) dengan preview | — |
| ADM-07 | S | Harga: lihat kalkulasi markup (`06-pricing.md`), override harga per produk | — |
| ADM-08 | L | Multi-admin, role, audit lengkap | — |

## K. Bahasa (I18N)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| I18N-01 | M | Locale `id` (default) & `en`, prefix URL `/id/...`, `/en/...`; `/` → redirect `/id` | — |
| I18N-02 | M | Toggle bahasa di header & footer, mempertahankan halaman saat ini | — |
| I18N-03 | M | Semua string UI di `messages/id.json` & `messages/en.json`; **tidak ada string hard-coded** | Lint/test: key id & en sama persis |
| I18N-04 | M | Istilah dansa & nama warna Só Dança **tidak diterjemahkan** (`design-system/glossary.json`) | — |
| I18N-05 | M | Angka & uang selalu format Indonesia di kedua locale (`Rp 1.250.000`), tanggal `5 Nov 2026` / `5 Nov 2026` | — |

---

## Non-fungsional (NFR)

| ID | Requirement |
|---|---|
| NFR-01 | **Mobile-first**; diuji di 360×800, 390×844, 768×1024, 1280×800. Tanpa scroll horizontal |
| NFR-02 | **WCAG 2.1 AA**: kontras (token sudah dicek), fokus terlihat, navigasi keyboard, label form, target sentuh ≥ 44px, `prefers-reduced-motion` |
| NFR-03 | Performa (Lighthouse mobile, halaman listing & PDP): Performance ≥ 85, LCP < 2,5 s, CLS < 0,1 |
| NFR-04 | SEO: metadata per halaman, `hreflang` id/en, sitemap, JSON-LD `Product` (offers IDR, availability) |
| NFR-05 | Keamanan: harga & total **selalu dihitung server**; validasi Zod di semua input; webhook diverifikasi; data kartu tidak pernah disimpan; rate limit pada create-order & lacak |
| NFR-06 | Privasi (UU PDP): nomor WA hanya untuk pesanan & notifikasi yang di-opt-in; halaman Kebijakan Privasi |
| NFR-07 | Waktu: semua tampilan WIB (Asia/Jakarta); simpan UTC |
| NFR-08 | Observability: log terstruktur untuk order/payment/stock events |
| NFR-09 | Uang disimpan sebagai **integer Rupiah** (tanpa desimal) |
