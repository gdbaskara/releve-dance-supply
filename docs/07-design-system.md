# 07 — Design system: Relevé v1.0

Sumber token: `design-system/tokens.json` (kebenaran) → `design-system/tokens.css`. Glosarium: `design-system/glossary.json`.

## 1. Prinsip

1. **Produk adalah panggung.** UI monokrom & tenang; warna datang dari foto produk. Tidak ada gaya flash-sale marketplace (merah menyala, countdown promo, badge bertumpuk).
2. **Presisi seperti balet.** Garis tipis, sudut tajam (radius 2–4px), grid rapi, spasi lega.
3. **Jujur soal stok.** Status per ukuran selalu terlihat sebelum pembeli menekan tombol.
4. **WhatsApp selalu satu ketukan.** Tapi hijau WA hanya untuk WA — tidak dipakai untuk aksi lain.
5. **Bahasa ramah, istilah teknis tetap.** "Kamu", ringkas, hangat; istilah dansa dalam English.

**Rasa yang dirujuk Só Dança:** latar putih, tipografi sans bersih dengan label UPPERCASE ber-letter-spacing, foto besar 1:1, navigasi per disiplin. **Yang berbeda (identitas sendiri):** wordmark sendiri, aksen Ballet Pink, serif editorial untuk tagline, pola WA & pembayaran lokal.

## 2. Identitas

- **Wordmark (demo):** "RELEVÉ" — Plus Jakarta Sans 600, UPPERCASE, letter-spacing 0.24em, warna `ink`; sub-label "DANCE SUPPLY" 12px, 0.24em, `ink-muted`. Dibuat sebagai SVG teks di `public/brand/wordmark.svg`. Favicon: huruf "R" dalam kotak `ink`.
- Tagline hero (display serif italic): *"Setiap langkah dimulai dari sepatu yang tepat."* / *"Every step begins with the right shoe."*
- Trust line: "Produk original Só Dança · Dikirim dari Jakarta · Bayar QRIS, VA & e-wallet".

## 3. Warna

| Token | Hex | Pakai untuk | Kontras |
|---|---|---|---|
| `bg` / `surface` | #FFFFFF | Latar, card | — |
| `surface-alt` | #F7F4F0 | Section selang-seling, panel ringkasan, footer | — |
| `ink` | #141414 | Teks utama, **tombol primary**, ikon | 18.4:1 |
| `ink-muted` | #5E5852 | Teks sekunder, label, meta | 7.0:1 (6.4 di alt) |
| `ink-subtle` | #8A837C | Placeholder, teks ≥18px non-esensial | 3.7:1 ⚠️ bukan body |
| `border` | #E6E1DB | Divider dekoratif | dekoratif |
| `border-strong` | #8A837C | Border input/checkbox/size chip | 3.7:1 (non-text ≥3 ✓) |
| `accent` | #F3E1DD | Ballet Pink: latar badge "Baru", hero tint, highlight | latar saja |
| `accent-strong` | #9A4A57 | Link hover, ikon aksen, eyebrow di hero | 6.0:1 |
| `accent-ink` | #7E3845 | Teks di atas `accent` | 6.55:1 |
| `success` / `-bg` | #1F7A4D / #E7F4EC | Ready, pembayaran berhasil | 5.3 / 4.7:1 |
| `warning` / `-bg` | #8A5A00 / #FBF1DC | Sisa N, Pre-order, countdown < 5 mnt | 5.9 / 5.3:1 |
| `error` / `-bg` | #B3261E / #FBE9E7 | Error form, habis, gagal | 6.5 / 5.6:1 |
| `info` / `-bg` | #2A5DB0 / #E8EFFA | Notice informatif (mode demo, pre-order campur) | 6.4:1 |
| `whatsapp` + `whatsapp-ink` | #25D366 + #0B2A17 | **Hanya** tombol/ikon WA | 7.8:1 (teks putih dilarang: 2:1) |

Aturan: maksimal **satu** tombol primary (`ink`) per layar/seksi. Harga selalu `ink`, bukan aksen.

## 4. Tipografi

| Peran | Font | Size / line-height | Weight | Catatan |
|---|---|---|---|---|
| Display hero | Cormorant Garamond | 36/44 mobile · 64/68 desktop | 500 (italic opsional) | Hanya tagline hero & quote testimoni |
| H1 | Plus Jakarta Sans | 30/36 mobile · 48/56 desktop | 600 | tracking −0.01em |
| H2 | Plus Jakarta Sans | 24/32 · 30/36 | 600 | |
| H3 | Plus Jakarta Sans | 20/28 · 24/32 | 600 | |
| Eyebrow / nav / label kategori | Plus Jakarta Sans | 12/16 | 600 | UPPERCASE, tracking 0.12em |
| Body | Plus Jakarta Sans | 16/24 | 400 | Panjang baris maks 70ch |
| Body small / meta | Plus Jakarta Sans | 14/20 | 400–500 | |
| Caption / legal | Plus Jakarta Sans | 12/16 | 400 | `ink-muted` |
| Harga PDP | Plus Jakarta Sans | 24/32 | 600 | tabular-nums |
| Harga card | Plus Jakarta Sans | 14/20 · 16/24 | 600 | tabular-nums |
| Nomor VA / order / SKU | mono | 20/28 (VA) · 14/20 | 500 | letter-spacing 0.04em, dikelompokkan 4 digit |

Input selalu ≥ 16px (cegah auto-zoom iOS).

## 5. Layout, spasi, bentuk

- Grid: 4 kolom (mobile, gutter 16) · 8 (tablet, 24) · 12 (desktop, 32). Container maks 1280px.
- Ritme vertikal antar section: 48px mobile, 80px desktop. Spasi dalam komponen: kelipatan 4.
- Radius: button/input/badge **2px**, card/tile **4px**, modal/drawer **8px**, swatch/chip/FAB **pill**. Foto produk **0**.
- Shadow hanya untuk overlay (drawer, modal, popover). Card dibedakan dengan garis `border`, bukan shadow.
- Listing produk: 2 kolom mobile, 3 tablet, 4 desktop. Gap 16/24/32.
- Header: 56px mobile, 72px desktop, sticky, latar putih + garis bawah `border` saat scroll.

## 6. Foto & ikon

- Produk: rasio **1:1**, latar polos `#F7F4F0` atau putih, produk di tengah, ≥ 1200px. Gambar ke-2: tampak samping/sol. Lifestyle (hero/kategori): 4:5 mobile, 16:9 desktop.
- Placeholder demo: blok `surface-alt` + siluet sepatu line-art (SVG) + kode model di pojok, warna `ink-subtle`.
- Ikon: lucide, stroke 1.5, 20px (24px di nav). Logo pembayaran: SVG resmi grayscale saat tidak dipilih, berwarna saat dipilih.

## 7. Komponen

Setiap komponen wajib: story di Storybook untuk **semua varian & state**, a11y addon tanpa pelanggaran, teks lewat i18n.

### 7.1 Primitive (`src/components/ui`)

| Komponen | Varian | State | Spesifikasi |
|---|---|---|---|
| **Button** | `primary` (ink/putih), `secondary` (outline ink 1px), `ghost` (teks), `whatsapp` (hijau + ikon WA, teks `whatsapp-ink`), `danger` (admin) | default, hover (primary: #2B2B2B; secondary: bg surface-alt), active, focus-visible (ring 2px ink offset 2), disabled (opacity .4, cursor not-allowed), loading (spinner, label tetap) | Size `md` 48px tinggi (default, mobile), `sm` 36px (admin/inline). Label 14px 600 UPPERCASE tracking 0.08em. `fullWidth` di mobile CTA |
| **IconButton** | ghost, outline | sama | 44×44 minimum |
| **Link** | inline, nav | hover underline, visited tetap | Inline: underline 1px offset 3px |
| **Input / Textarea** | default, with prefix (`+62`), with suffix | default, focus (border ink 2px), error (border error + pesan), disabled, readOnly | Tinggi 48px, label di atas (14px 500), helper/error di bawah (12–14px) |
| **Select / Combobox** | native-style, searchable (kab/kota) | sama dengan Input | Combobox untuk 119 kab/kota |
| **Checkbox / Radio** | — | checked, unchecked, focus, disabled, error | 20px kontrol, area klik 44px |
| **Badge** | `neutral`, `success`, `warning`, `error`, `info`, `accent` | — | 12px 600 UPPERCASE tracking .08em, padding 4×8, radius 2 |
| **Chip (filter)** | toggle | selected (bg ink, teks putih), unselected (outline), disabled | Pill, 36px |
| **Tabs / SegmentedControl** | — | — | Untuk ID/EN, metode bayar group |
| **Accordion** | — | open/closed | Instruksi bayar, FAQ, deskripsi PDP |
| **Dialog / Sheet** | center modal (desktop), bottom sheet (mobile) | — | Radix Dialog; fokus terkunci; Esc menutup |
| **Drawer** | kanan (cart, desktop), bawah (mobile) | — | Lebar 420px desktop |
| **Toast** | success, error, info | — | Pojok bawah (mobile: atas tombol sticky), auto-hide 4s, bisa ditutup |
| **Skeleton** | text, card, image | — | Animasi shimmer dimatikan saat reduced-motion |
| **Tooltip** | — | — | Hanya info tambahan, bukan info wajib |
| **Breadcrumb** | — | — | PDP & listing desktop |
| **Pagination / LoadMore** | — | — | Listing: tombol "Muat lebih banyak" (24/halaman) |

### 7.2 Komponen toko (`src/components/store`)

| Komponen | Isi & perilaku |
|---|---|
| **Price** | `formatIDR(value)` → `Rp 675.000`; size `sm/md/lg`; tabular-nums; prop `from` → "Mulai Rp …" |
| **StockBadge** | Input: status + available + lead. READY → `success` "Ready" · LOW → `warning` "Sisa {n}" · PREORDER → `warning` "Pre-order · {lead} minggu" · SOLD_OUT → `neutral` "Habis". Ada versi inline (teks + dot 8px) untuk PDP |
| **ProductCard** | Gambar 1:1 (hover desktop: gambar ke-2), eyebrow disiplin, nama (2 baris maks), kode model `ink-muted`, Price, swatches (maks 5 + "+N"), StockBadge agregat. Seluruh card = 1 link. Tidak ada tombol add di card (pilih ukuran wajib di PDP) |
| **ColorSwatch** | Bulat 28px, border 1px `border-strong`; selected = ring 2px ink offset 2; nama warna tampil di label di atasnya ("Warna: Ballet Pink"); habis = garis diagonal |
| **SizeSelector** | Grid chip kotak 48×48 (radius 2), label size US; selected = bg ink teks putih; LOW = titik warning kecil di pojok; SOLD_OUT = teks dicoret + `ink-subtle`, tetap bisa difokus (aria-disabled) dan menampilkan opsi "Kabari saya"; PREORDER = label kecil "PO". Link "Panduan ukuran" di kanan atas |
| **WidthSelector / ShankSelector** | Segmented. Width: Narrow/Medium/Wide atau A–EE (tergantung model). Shank (SD09, SD40VC): Full Soft / Full Normal / Full Reinforced / Full Extra Reinforced. Tooltip penjelas istilah dari glosarium |
| **VariantPicker** | Komposisi Warna → Size → Width → Shank sesuai `product.options`; menghitung ketersediaan kombinasi; emit `selectedSku` |
| **AvailabilityLine** | Di bawah VariantPicker: ikon + teks: "Ready · dikirim 1–2 hari kerja dari Jakarta" / "Sisa 2 — segera habis" / "Pre-order · estimasi tiba 4–6 minggu" / "Habis untuk ukuran ini" |
| **SizeGuide** | Sheet/Dialog: tab kategori (Ballet & Jazz / Pointe / Tap & Character / Ballroom / Dancewear), tabel US ↔ panjang kaki cm, ilustrasi cara ukur, callout pointe, tombol WA "Konsultasi ukuran" |
| **CompareStyles** | Tabel 3 kolom: foto, nama, sol, material, harga, link |
| **CartLine** | Thumb 64px, nama, varian ("Ballet Pink · 7.5 · M"), badge pre-order, qty stepper (−/+, 44px), harga, hapus |
| **CartDrawer** | Header "Keranjang (n)", list CartLine, notice (stok berubah / pre-order campur), subtotal, CTA "Checkout", tombol WA sekunder |
| **QtyStepper** | min 1, max = available atau 5 (pre-order); disabled di batas |
| **WhatsAppButton** | Varian `fab` (pill 56px, bawah-kanan, label "Chat" muncul di desktop), `inline` (Button whatsapp), `link` (teks + ikon). Prop `context` + `vars` → membuat teks dari template |
| **LanguageToggle** | "ID / EN" segmented, 12px UPPERCASE |
| **TrustStrip** | 3–4 item ikon + teks: Original Só Dança · Dikirim dari Jakarta · QRIS/VA/e-wallet · Konsultasi ukuran via WA |
| **EmptyState** | Ikon line-art, judul, deskripsi, CTA (kembali belanja / WA) |
| **DemoBanner** | Bar `info-bg` 32px: "Mode demo — pembayaran & pengiriman disimulasikan" |
| **FilterPanel** | Mobile: Sheet bawah dengan accordion per facet + tombol "Tampilkan {n} produk"; desktop: sidebar 240px |

### 7.3 Komponen checkout (`src/components/checkout`)

| Komponen | Isi & perilaku |
|---|---|
| **CheckoutStep** | Nomor bulat + judul + status (aktif / selesai ✓ dengan ringkasan & "Ubah" / terkunci) |
| **PhoneInput** | Prefix tetap `+62`, `inputmode="tel"`, auto-format `812-3456-7890`, menerima input 08… / 62… / +62… |
| **AddressForm** | Provinsi (select 6) → Kab/Kota (combobox, di-filter provinsi) → Kecamatan (teks) → Kode pos (`inputmode="numeric"`, 5 digit) → Alamat lengkap (textarea) → Catatan kurir. Link WA "Di luar Pulau Jawa?" |
| **CourierOption** | Radio card: logo kurir, nama layanan, estimasi, harga (kanan); grup heading Instan / Express / Reguler; instan menampilkan cutoff |
| **InsuranceToggle** | Checkbox default ON + nominal |
| **PaymentMethodTile** | Radio card 4px radius: logo, nama, keterangan singkat ("Bayar dari semua e-wallet & m-banking"); selected = border ink 2px; grup: QRIS · E-wallet · Virtual Account · Kartu |
| **OrderSummary** | Daftar item ringkas, voucher field, baris subtotal/ongkir/asuransi/diskon, **Total** (20px 600); sticky kanan desktop, collapsible "Lihat ringkasan (Rp …)" di mobile |
| **StickyPayBar** | Mobile: bar bawah dengan total + Button primary "Bayar Sekarang" |
| **QRISPanel** | Logo QRIS, QR 240px (putih, padding 16), nominal (Salin), Countdown, "Unduh QR", langkah singkat 1-2-3, logo e-wallet/bank pendukung |
| **VAPanel** | Logo bank, label "Nomor Virtual Account", nomor mono 20px dikelompokkan 4 + tombol **Salin** (toast "Disalin"), nominal + Salin, Countdown, Accordion instruksi ATM / m-banking / internet banking |
| **EwalletPanel** | Logo, tombol "Buka {wallet}", teks "Selesaikan di aplikasi dalam {mm:ss}" |
| **CardForm** | Nomor kartu (mask 4-4-4-4, deteksi Visa/MC/JCB), MM/YY, CVV; catatan "Data kartu tidak disimpan" |
| **Countdown** | `HH:MM:SS`; < 5 menit → warna warning; habis → state expired + CTA "Buat pembayaran baru" |
| **PaymentStatus** | Menunggu (spinner halus "Menunggu pembayaran…"), Berhasil (success), Kedaluwarsa, Gagal |
| **DemoPaymentControls** | Hanya `DEMO_MODE`: kotak garis putus-putus `info`, tombol "Simulasikan Bayar Berhasil" & "Simulasikan Kedaluwarsa" |
| **OrderTimeline** | Vertikal: Dibuat → Dibayar → Diproses → Dikirim (resi + Salin) → Terkirim; titik aktif ink, selesai success, mendatang border |

### 7.4 Admin (`src/components/admin`)
Memakai primitive yang sama dengan density lebih rapat (Button `sm`, tabel 14px). Komponen: DataTable (sort, filter, pagination), StatCard, VariantStockGrid (size × width, input angka, highlight perubahan), StatusSelect (hanya transisi valid), CheckoutLinkBuilder, OutboxList (preview gelembung chat WA).

## 8. Copy & glosarium

**Voice:** "kamu", kalimat pendek, positif, tanpa tanda seru berlebihan. EN: friendly, plain.

| Kunci | ID | EN |
|---|---|---|
| cta.addToCart | Tambah ke Keranjang | Add to Cart |
| cta.notifyMe | Kabari Saya via WA | Notify Me on WhatsApp |
| cta.askWa | Tanya via WA | Ask on WhatsApp |
| cta.sizeConsult | Konsultasi Ukuran via WA | Size Consultation on WhatsApp |
| cta.checkout | Checkout | Checkout |
| cta.payNow | Bayar Sekarang | Pay Now |
| cta.copy / copied | Salin / Disalin | Copy / Copied |
| stock.ready | Ready · dikirim 1–2 hari kerja | In stock · ships in 1–2 business days |
| stock.low | Sisa {n} | Only {n} left |
| stock.preorder | Pre-order · estimasi {lead} minggu | Pre-order · est. {lead} weeks |
| stock.soldout | Habis | Sold out |
| checkout.waLabel | Nomor WhatsApp | WhatsApp number |
| checkout.waHelp | Konfirmasi & update pesanan dikirim ke nomor ini | Order confirmation & updates go to this number |
| checkout.outsideJava | Di luar Pulau Jawa? Hubungi kami via WA | Outside Java? Contact us on WhatsApp |
| pay.waiting | Menunggu pembayaran… | Waiting for payment… |
| pay.expiresIn | Bayar dalam | Pay within |
| error.stock | Stok {item} tidak cukup. Kami sudah menyesuaikan keranjangmu. | Not enough stock for {item}. We've updated your cart. |

**Tidak diterjemahkan** (`design-system/glossary.json`): disiplin & produk (Ballet, Pointe, Jazz, Tap, Character, Latin, Ballroom, Contemporary, Leotard, Tights, Body Liner, Skirt, Warm-up), anatomi (shank, box, vamp, platform, split sole, full sole, drawstring, demi-pointe, heel), width (Narrow, Medium, Wide, A–EE), shank (Full Soft, Full Normal, Full Reinforced, Full Extra Reinforced), nama warna Só Dança, nama model & kode. "Pre-order", "Ready", "Checkout" juga tetap dipakai di versi ID (umum di Indonesia).

**Dilarang:** "Official", "Authorized", "Resmi Só Dança", "Só Dança Indonesia", "COD", "Bayar di tempat", "Cicilan" (v1).

## 9. Implementasi token (Tailwind v4)

```css
/* src/styles/globals.css */
@import "tailwindcss";
@import "../../design-system/tokens.css";
@theme inline {
  --color-bg: var(--color-bg);
  --color-surface-alt: var(--color-surface-alt);
  --color-ink: var(--color-ink);
  --color-ink-muted: var(--color-ink-muted);
  /* … petakan semua token warna, font, radius dari tokens.css */
  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --radius-sm: var(--radius-sm);
}
```
Aturan lint: larang kelas warna bawaan Tailwind (`bg-gray-*`, `text-red-*`, dll.) dan nilai arbitrer hex (`bg-[#...]`) di `src/components/**`.

## 10. Storybook — definisi selesai

- Halaman **Foundations**: Colors (dengan rasio kontras), Typography, Spacing, Radius, Icons.
- Setiap komponen §7: story per varian + state, kontrol props, viewport mobile & desktop, a11y addon 0 violation.
- Halaman **Patterns**: Stok (4 status di card, PDP, size chip), Harga, WhatsApp (semua konteks), Checkout (alur lengkap dengan data mock), Halaman bayar (QRIS/VA/e-wallet/kartu × menunggu/berhasil/kedaluwarsa).
- Toggle locale ID/EN di toolbar Storybook.
