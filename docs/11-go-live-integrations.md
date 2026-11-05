# 11 — Go-live integrasi (Xendit, Biteship, WhatsApp Business)

Demo memakai provider mock (`PAYMENT_PROVIDER=mock`, `SHIPPING_PROVIDER=mock`, `MESSAGING_PROVIDER=outbox`).
Provider asli sudah ada di `src/lib/providers/**`; go-live = isi env + ganti 3 variabel. Tidak ada perubahan kode.

> **Secret tidak pernah di-commit.** Isi di `.env.local` (lokal) atau secret manager hosting. `.env.example` hanya berisi nama variabel (dikomentari).

Bagian bertanda **VERIFIKASI** adalah asumsi bentuk API yang harus dicek di sandbox/test mode sebelum live.

---

## 0. Checklist cepat

| # | Langkah | Selesai |
|---|---|---|
| 1 | Domain HTTPS publik (`NEXT_PUBLIC_SITE_URL=https://…`) — Xendit menolak return URL non-HTTPS | ☐ |
| 2 | Xendit: akun terverifikasi, payment method aktif, secret key + webhook token, URL webhook | ☐ |
| 3 | Uji Xendit di test mode (semua tile: QRIS, 4 e-wallet, 5 VA, kartu) | ☐ |
| 4 | Biteship: API key, kode pos/area gudang + koordinat, saldo | ☐ |
| 5 | Meta WABA: nomor bisnis, System User token, 7 template × 2 bahasa **Approved** | ☐ |
| 6 | `validateProviderEnv()` tanpa masalah (lihat §5) | ☐ |
| 7 | Set `PAYMENT_PROVIDER=xendit`, `SHIPPING_PROVIDER=biteship`, `MESSAGING_PROVIDER=waba`, `DEMO_MODE=false`, `NEXT_PUBLIC_DEMO_MODE=false` | ☐ |
| 8 | Smoke test produksi dengan nominal kecil (QRIS Rp10.000) lalu refund manual di dashboard | ☐ |

Provider bisa diganti satu per satu (mis. Biteship dulu, Xendit belakangan).

---

## 1. Xendit (pembayaran)

### 1.1 Integrasi yang dipakai
Xendit **Payments API v3** (`POST /v3/payment_requests`, header `api-version: 2024-11-11`) — API terpadu yang
menggantikan QR Codes API, E-Wallet Charges, dan Fixed VA API lama. Kartu memakai **Payment Session** hosted
(`POST /sessions`, `mode: PAYMENT_LINK`, `allowed_payment_channels: ["CARDS"]`) sehingga data kartu tidak pernah
menyentuh server kita (tidak perlu PCI DSS penuh).

| Tile | `channel_code` | Hasil |
|---|---|---|
| QRIS | `QRIS` | `qrString` dari action `QR_STRING`, kedaluwarsa 30 mnt |
| GoPay / OVO / DANA / ShopeePay | `GOPAY` / `OVO` / `DANA` / `SHOPEEPAY` | `redirectUrl` dari action `WEB_URL` (atau `DEEPLINK_URL`) |
| VA BCA / Mandiri / BNI / BRI / Permata | `BCA_VIRTUAL_ACCOUNT`, `MANDIRI_…`, `BNI_…`, `BRI_…`, `PERMATA_…` | `vaNumber` dari action `VIRTUAL_ACCOUNT_NUMBER`; `type: PAY` = VA tertutup, sekali pakai, nominal pas; 24 jam |
| Kartu | Payment Session | `redirectUrl` = `payment_link_url` (3DS di halaman Xendit), 15 mnt |

`reference_id` = `<orderNo>-<METODE>-<acak>`; dikirim juga sebagai `idempotency-key`. `providerRef` = id Xendit (`pr-…` atau `ps-…`).
Ganti metode → `POST /v3/payment_requests/{id}/cancel` atau `POST /sessions/{id}/cancel`.

### 1.2 Akun & kunci
1. Daftar di <https://dashboard.xendit.co>, lengkapi verifikasi bisnis (dokumen Indonesia), lalu aktifkan payment method: QRIS, GoPay, OVO, DANA, ShopeePay, VA BCA/Mandiri/BNI/BRI/Permata, Cards. Aktivasi beberapa channel (GoPay, kartu) butuh review partner — mulai lebih awal.
2. **Settings → API keys** → *Generate secret key* dengan izin **Money-in: Write** (Payments API / Sessions). Test mode: `xnd_development_…`; live: `xnd_production_…`.
3. **Settings → Webhooks** → salin **Webhook verification token** → `XENDIT_CALLBACK_TOKEN`.
4. Di halaman Webhooks yang sama, isi URL untuk event **Payments API** (payment / payment_request) **dan** **Payment Session**:
   `https://<domain>/api/webhooks/payment`

### 1.3 Env
| Var | Wajib | Isi |
|---|---|---|
| `PAYMENT_PROVIDER` | ✓ | `xendit` |
| `XENDIT_SECRET_KEY` | ✓ | secret key (Basic auth, password kosong) |
| `XENDIT_CALLBACK_TOKEN` | ✓ | webhook verification token |
| `XENDIT_BASE_URL` | – | default `https://api.xendit.co` |
| `XENDIT_API_VERSION` | – | default `2024-11-11` |

`WEBHOOK_SECRET` tetap diperlukan untuk mock/demo; tidak dipakai Xendit.

### 1.4 Webhook → status pesanan
Header `x-callback-token` harus sama persis dengan `XENDIT_CALLBACK_TOKEN` (perbandingan constant-time), kalau tidak → 401.

| Event Xendit | Status kita | `eventId` (idempoten) |
|---|---|---|
| `payment.capture` | PAID | `xendit:payment.capture:<payment_id>` |
| `payment.failure` | FAILED (pesanan tetap menunggu, pembeli bisa ganti metode) | `xendit:payment.failure:<payment_id>` |
| `payment_request.expiry` | EXPIRED | `xendit:payment_request.expiry:<payment_request_id>` |
| `payment_session.completed` | PAID (kartu) | `xendit:payment_session.completed:<payment_session_id>` |
| `payment_session.expired` | EXPIRED (kartu) | `xendit:payment_session.expired:<payment_session_id>` |
| event lain (refund, token, authorization…) | diabaikan, dijawab **200** | – |

Retry Xendit (hingga 6× dalam 24 jam) mengirim payload yang sama → `eventId` sama → `payment_events` menolak duplikat.
Sweep kedaluwarsa lokal (`/api/cron/expire`) tetap berjalan sebagai jaring pengaman bila webhook expiry tidak datang.

**VERIFIKASI di test mode**
- QRIS & VA menerima `channel_properties.expires_at`; e-wallet memakai expiry partner (OVO 15 mnt, GoPay 30 mnt).
- OVO butuh `channel_properties.account_mobile_number` (E.164) dan berupa push notification — bisa jadi **tanpa** `redirectUrl`; halaman bayar harus menampilkan "buka aplikasi OVO".
- Payment request di dalam Payment Session kartu mewarisi `reference_id` session (`…-CARD-…`) sehingga event `payment.*`-nya diabaikan (yang dilacak `payment_session.completed`). Bila tidak mewarisi, event itu akan dijawab 404 (pembayaran tidak dikenal) dan di-retry Xendit — tidak merusak data, tapi perlu disesuaikan.
- `idempotency-key` dihormati oleh kedua endpoint.
- Objek `customer` inline di Payment Session diterima (reference_id `wa_<digit WA>`).

### 1.5 Uji di test mode
1. Isi env dengan kunci `xnd_development_…`, `PAYMENT_PROVIDER=xendit`, jalankan app di URL HTTPS publik (mis. tunnel ngrok/cloudflared) dan set `NEXT_PUBLIC_SITE_URL` ke URL itu; daftarkan URL webhook tunnel di dashboard test mode.
2. Buat pesanan untuk tiap tile. Simulasikan bayar:
   - **QRIS / VA**: Dashboard (test mode) → transaksi → *Simulate payment*, atau endpoint simulasi Xendit untuk payment request (lihat docs.xendit.co → "Simulate payment").
   - **E-wallet**: buka `redirectUrl`, halaman sandbox partner menyediakan tombol sukses/gagal.
   - **Kartu**: halaman Payment Session dengan kartu uji Xendit (docs: "Simulate card scenarios (test cards)").
3. Cek: pesanan → PAID, stok terpotong, pesan `PAYMENT_PAID` di WA Outbox; kirim ulang webhook dari Dashboard → respons `duplicate: true`.
4. Biarkan satu QRIS kedaluwarsa → pesanan EXPIRED, stok dilepas.
5. Ganti metode di halaman bayar → payment lama berstatus CANCELED di dashboard.

---

## 2. Biteship (ongkir & lacak)

### 2.1 Yang dipakai
- `POST /v1/rates/couriers` dengan kurir `jne,jnt,sicepat,anteraja` berdasarkan **kode pos** (asal ↔ tujuan). Bila pembeli belum mengisi kode pos atau gudang memakai area id → `GET /v1/maps/areas?countries=ID&input=…&type=single` (di-cache).
- Kurir instan `gojek,grab` dihitung dengan **koordinat**: pin gudang + titik tengah kota tujuan (`shipping/biteship-areas.ts`, hanya Z1). Harga instan = estimasi kota sampai checkout punya pin peta.
- Aturan toko tetap berlaku di atas Biteship: instan hanya Z1, sebelum cutoff WIB (GoSend Instant 16:00 / ≤20 kg, Grab Same Day 14:00 / ≤7 kg), freight/cargo dibuang, urutan Instan → Express → Reguler.
- Tipe: `service_type` `instant`/`same_day` → Instan (jam), `overnight` + `jne_yes`, `sicepat_best`, `anteraja_next_day` → Express, lainnya → Reguler. `serviceCode` = `<courier_code>_<service_code>` (mis. `jne_reg`).
- Asuransi: default aturan kita max(Rp2.500, 0,25 % nilai barang). `BITESHIP_USE_COURIER_INSURANCE=true` → kirim `courier_insurance` dan pakai `insurance_fee` Biteship.
- Lacak: `GET /v1/trackings/{awb}/couriers/{courier_code}` (nama kurir dari admin dinormalisasi: "J&T" → `jnt`, "GoSend" → `gojek`).

### 2.2 Langkah
1. Daftar di <https://dashboard.biteship.com>, verifikasi akun, isi saldo (dibutuhkan saat nanti membuat order pengiriman; cek tarif juga dikenai kuota/biaya API sesuai paket — cek <https://biteship.com/id/harga>).
2. **Integrasi → API Key** → buat key test (`biteship_test.…`) dan live (`biteship_live.…`).
3. Gudang Jakarta (asumsi demo: Kota Jakarta Selatan): isi kode pos gudang, dan ambil koordinat pin gudang (Google Maps → klik kanan → salin lat,lng).
   Opsional: cari area id via `GET https://api.biteship.com/v1/maps/areas?countries=ID&input=<kode pos>&type=single` dengan header `authorization: <key>`.
4. Aktifkan kurir JNE, J&T, SiCepat, AnterAja, GoSend, GrabExpress di dashboard.

### 2.3 Env
| Var | Wajib | Isi |
|---|---|---|
| `SHIPPING_PROVIDER` | ✓ | `biteship` |
| `BITESHIP_API_KEY` | ✓ | API key |
| `BITESHIP_ORIGIN_POSTAL_CODE` **atau** `BITESHIP_ORIGIN_AREA_ID` | ✓ | gudang |
| `BITESHIP_ORIGIN_LATITUDE`, `BITESHIP_ORIGIN_LONGITUDE` | untuk instan | pin gudang; tanpa ini kurir instan tidak ditawarkan |
| `BITESHIP_COURIERS` | – | default `jne,jnt,sicepat,anteraja,gojek,grab` |
| `BITESHIP_USE_COURIER_INSURANCE` | – | default `false` |
| `BITESHIP_BASE_URL` | – | default `https://api.biteship.com` |

**VERIFIKASI dengan key test**: nilai `service_type`, format `shipment_duration_range` ("1 - 2"), `shipping_type` "parcel", dan isi `history[]` tracking (`status`, `note`, `updated_at`). Bandingkan daftar layanan yang muncul dengan tile checkout; tambah/kurangi kode di `EXPRESS_SERVICES` bila perlu.

### 2.4 Uji
Checkout → isi alamat Jakarta Barat (Z1) jam < 14:00 WIB → muncul Instan, Express, Reguler. Alamat Semarang (Z3) → tanpa Instan. Kirim pesanan dengan resi asli → `getTracking` mengembalikan riwayat.

---

## 3. WhatsApp Business (Meta Cloud API)

### 3.1 Yang dipakai
`POST https://graph.facebook.com/{WABA_API_VERSION}/{WABA_PHONE_NUMBER_ID}/messages` dengan `Authorization: Bearer WABA_TOKEN`,
pesan **template** (`type: template`) dengan parameter BODY posisional `{{1}}…{{n}}`, bahasa `id` / `en` sesuai locale pesanan.
Setiap kiriman juga dicatat di `wa_outbox` (status `SENT` bila Meta mengembalikan `wamid`, `FAILED` bila error) → Admin → WA Outbox tetap jalan.
Kegagalan WA tidak pernah menggagalkan pesanan (dicatat log `wa.failed`).

### 3.2 Setup Meta
1. <https://business.facebook.com> → buat/verifikasi Business Portfolio (verifikasi bisnis menaikkan limit pesan).
2. <https://developers.facebook.com> → *Create app* → tipe Business → tambah produk **WhatsApp**.
3. WhatsApp → API Setup → tambahkan **nomor bisnis** (nomor yang belum terdaftar di aplikasi WhatsApp biasa; bisa nomor yang sama dengan `NEXT_PUBLIC_WA_NUMBER` setelah dimigrasi) → salin **Phone number ID** → `WABA_PHONE_NUMBER_ID`.
4. Business Settings → Users → **System users** → buat system user (Admin) → *Assign assets*: app + WhatsApp account → *Generate token* dengan izin `whatsapp_business_messaging` dan `whatsapp_business_management`, masa berlaku *Never* → `WABA_TOKEN`. (Token sementara di API Setup kedaluwarsa 24 jam — jangan dipakai di produksi.)
5. Set display name "Relevé Dance Supply" (tanpa klaim "Official/Resmi" — lihat `design-system/glossary.json`).
6. WhatsApp Manager → **Message templates** → buat 7 template di bawah, masing-masing dengan bahasa **Indonesian (id)** dan **English (en)**.

### 3.3 Template
Nama = `WABA_TEMPLATE_PREFIX` (default `releve_`) + nama di tabel. Kategori **Utility**, kecuali `back_in_stock` yang kemungkinan diklasifikasi Meta sebagai **Marketing** (biaya & aturan opt-in marketing).
Isi sama dengan docs/05 §6. Meta menolak template yang **diakhiri parameter**, jadi template yang diakhiri URL diberi baris penutup `Relevé Dance Supply`.

| Template (kode) | Nama Meta | Parameter |
|---|---|---|
| ORDER_CREATED | `releve_order_created` | 1 name · 2 order_no · 3 total · 4 method · 5 expires · 6 pay_url |
| PAYMENT_PAID | `releve_payment_paid` | 1 order_no · 2 total · 3 track_url |
| PAYMENT_EXPIRED | `releve_payment_expired` | 1 order_no · 2 shop_url |
| ORDER_SHIPPED | `releve_order_shipped` | 1 order_no · 2 courier · 3 awb · 4 track_url |
| ORDER_DELIVERED | `releve_order_delivered` | 1 order_no |
| BACK_IN_STOCK | `releve_back_in_stock` | 1 name · 2 variant · 3 url |
| PAYMENT_INSTRUCTIONS | `releve_payment_instructions` | 1 order_no · 2 method · 3 va_or_qr_hint · 4 total · 5 expires |

Urutan parameter ditetapkan di `src/lib/providers/messaging/waba-templates.ts`; satu bahasa boleh memakai urutan berbeda (`{{2}}` sebelum `{{1}}`).

**Isi yang disarankan**

`releve_order_created`
- id: `Terima kasih, {{1}}! Pesanan {{2}} sebesar {{3}} menunggu pembayaran via {{4}} sampai {{5}}. Bayar: {{6}}` + baris `Relevé Dance Supply`
- en: `Thank you, {{1}}! Order {{2}} for {{3}} is awaiting payment via {{4}} until {{5}}. Pay: {{6}}` + baris `Relevé Dance Supply`

`releve_payment_paid`
- id: `Pembayaran {{1}} sebesar {{2}} sudah kami terima. Pesanan sedang kami siapkan. Lacak: {{3}}` + `Relevé Dance Supply`
- en: `We have received your payment of {{2}} for {{1}}. We are preparing your order. Track: {{3}}` + `Relevé Dance Supply`

`releve_payment_expired`
- id: `Pembayaran {{1}} sudah kedaluwarsa dan stok dilepas. Mau pesan lagi? {{2}}` + `Relevé Dance Supply`
- en: `The payment for {{1}} has expired and the stock was released. Want to order again? {{2}}` + `Relevé Dance Supply`

`releve_order_shipped`
- id: `Pesanan {{1}} sudah dikirim via {{2}}, resi {{3}}. Lacak: {{4}}` + `Relevé Dance Supply`
- en: `Order {{1}} has been shipped via {{2}}, tracking number {{3}}. Track: {{4}}` + `Relevé Dance Supply`

`releve_order_delivered`
- id: `Pesanan {{1}} sudah sampai. Semoga cocok di kaki! Ada kendala ukuran? Balas pesan ini.`
- en: `Order {{1}} has been delivered. We hope it fits perfectly! Any sizing issue? Just reply to this message.`

`releve_back_in_stock`
- id: `Kabar baik! {{1}} {{2}} sudah ready lagi. Pesan sekarang: {{3}}` + `Relevé Dance Supply`
- en: `Good news! {{1}} {{2}} is back in stock. Order now: {{3}}` + `Relevé Dance Supply`

`releve_payment_instructions`
- id: `Instruksi bayar {{1}}: {{2}} {{3}}, total {{4}}, batas {{5}}.`
- en: `Payment instructions for {{1}}: {{2}} {{3}}, total {{4}}, due {{5}}.`

Saat mengajukan, isi contoh nilai (mis. `Siti`, `RDS-261105-AB12`, `Rp685.000`, `QRIS`, `5 Nov 2026 10.30 WIB`, `https://<domain>/id/pay/RDS-261105-AB12`).
Parameter kosong dikirim sebagai `-`; baris baru/tab di parameter dibuang (aturan Meta).

### 3.4 Aturan opt-in (WA-05)
- Notifikasi pesanan (`ORDER_CREATED`, `PAYMENT_PAID`, `PAYMENT_EXPIRED`, `ORDER_SHIPPED`, `ORDER_DELIVERED`) hanya dikirim bila pembeli mencentang opt-in WA di checkout (`notifyOrder` memeriksa `waOptIn`).
- `PAYMENT_INSTRUCTIONS` dikirim karena pembeli menekan "Kirim instruksi ke WA"; `BACK_IN_STOCK` karena pembeli mendaftar "Kabari saya".
- Teks opt-in di checkout harus menyebut nama bisnis dan bahwa pembeli akan menerima pesan WhatsApp (syarat kebijakan Meta). Hormati permintaan berhenti: balasan "STOP" saat ini ditangani manual oleh admin.
- Pesan template boleh dikirim di luar jendela 24 jam; balasan bebas (non-template) dari admin tetap lewat `wa.me` / aplikasi WhatsApp Business.

### 3.5 Env
| Var | Wajib | Isi |
|---|---|---|
| `MESSAGING_PROVIDER` | ✓ | `waba` |
| `WABA_TOKEN` | ✓ | System User token |
| `WABA_PHONE_NUMBER_ID` | ✓ | Phone number ID |
| `WABA_API_VERSION` | – | default `v26.0` (Graph API terbaru per Juli 2026; **VERIFIKASI** di changelog Meta) |
| `WABA_TEMPLATE_PREFIX` | – | default `releve_` |
| `WABA_LANG_ID`, `WABA_LANG_EN` | – | default `id`, `en` (pakai `en_US` bila template dibuat sebagai English (US)) |

### 3.6 Uji
Di API Setup tambahkan nomor HP kamu sebagai penerima uji, buat pesanan dengan opt-in → pesan `releve_order_created` diterima, WA Outbox berstatus SENT.
Template salah nama/bahasa → Outbox `FAILED`, log `wa.failed` berisi kode Meta (mis. `132001`).

**VERIFIKASI**: status `SENT` = diterima Meta (ada `wamid`), belum tentu terkirim/dibaca; webhook status Meta belum dipasang.

---

## 4. Ringkasan env produksi

```bash
PAYMENT_PROVIDER=xendit
SHIPPING_PROVIDER=biteship
MESSAGING_PROVIDER=waba
DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SITE_URL=https://<domain>
XENDIT_SECRET_KEY=…          XENDIT_CALLBACK_TOKEN=…
BITESHIP_API_KEY=…           BITESHIP_ORIGIN_POSTAL_CODE=…   BITESHIP_ORIGIN_LATITUDE=…   BITESHIP_ORIGIN_LONGITUDE=…
WABA_TOKEN=…                 WABA_PHONE_NUMBER_ID=…
```

## 5. Fail-fast & rollback
- Nama provider tak dikenal (mis. `PAYMENT_PROVIDER=midtrans`) → error langsung saat dipanggil.
- Provider asli tanpa env → `ProviderConfigError: "<provider> is not configured: missing X, Y"` pada panggilan pertama.
- Cek semua sekaligus sebelum deploy: `validateProviderEnv()` dari `@/lib/providers` → `{ ok, problems[] }`, mis.
  `pnpm tsx --env-file=.env.local -e 'import("./src/lib/providers/config.ts").then(m => console.log(m.validateProviderEnv()))'`.
- Rollback: kembalikan variabel ke `mock` / `outbox`. Pembayaran Xendit yang masih PENDING tetap bisa dibayar pembeli; webhooknya hanya diproses lagi setelah `PAYMENT_PROVIDER=xendit` (rekonsiliasi manual via dashboard bila rollback lama).
