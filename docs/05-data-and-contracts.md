# 05 — Data model & kontrak

Kontrak di sini **ditulis pertama** (WS-0) ke `src/lib/contracts/` supaya workstream lain bisa jalan paralel.

## 1. Skema database (Drizzle / Postgres)

Uang = `integer` Rupiah. Waktu = `timestamptz` (UTC). ID = `uuid` kecuali disebut lain.

```
products
  id text PK (= slug)              model_code text            name text
  brand text default 'Só Dança'    discipline enum            audience enum(Adult|Kids|Men)
  group enum(pointe|shoes|apparel|tights)
  price_idr int                    msrp_usd numeric(8,2)      landed_cost_idr int
  description_en text              description_id text null   features_id text[]  features_en text[]
  colors text[]                    widths text[]              options text[]   -- urutan opsi varian
  images jsonb  -- [{url, alt, color?}]
  is_active bool default true      created_at, updated_at

variants
  sku text PK                      product_id FK
  color text null  size text null  width text null  shank text null
  weight_grams int
  on_hand int  CHECK (on_hand >= 0)
  reserved int CHECK (reserved >= 0 AND reserved <= on_hand)
  preorder_enabled bool            preorder_lead_weeks text null  -- "4-6"
  INDEX (product_id)

stock_movements
  id, sku FK, delta int, reason enum(seed|admin_adjust|order_paid|order_cancel|restock), ref text null, actor text, created_at

orders
  id uuid PK                       order_no text UNIQUE  -- RDS-YYMMDD-XXXX
  status enum (lihat §3)           locale enum(id|en)
  customer_name text  customer_wa text (E.164)  customer_email text null  wa_opt_in bool
  address jsonb  -- {province, city, district, postal_code, line, note, zone}
  shipping jsonb -- {service_code, courier, service, type, price_idr, eta, insured}
  subtotal_idr int  shipping_idr int  insurance_idr int  discount_idr int  total_idr int
  voucher_code text null           checkout_link_id FK null
  has_preorder bool
  tracking jsonb null -- {courier, awb, shipped_at, delivered_at}
  created_at, paid_at, expires_at, updated_at

order_items
  id, order_id FK, sku FK, product_id, name_snapshot, variant_label, price_idr, qty, is_preorder bool

stock_reservations
  id, order_id FK, sku FK, qty, expires_at, released_at null, consumed_at null

payments
  id, order_id FK, provider text, method enum, channel text null   -- BCA, GOPAY, …
  status enum(PENDING|PAID|EXPIRED|FAILED|CANCELLED)
  amount_idr int, provider_ref text, qr_string text null, va_number text null, redirect_url text null
  expires_at, paid_at null, raw jsonb, created_at

payment_events   -- idempotensi webhook
  id, provider, event_id text UNIQUE, payload jsonb, processed_at

checkout_links
  id, token text UNIQUE, items jsonb [{sku, qty}], customer_name null, customer_wa null,
  created_by, expires_at, used_order_id null, created_at

back_in_stock_requests
  id, sku FK, customer_wa, locale, created_at, notified_at null

wa_outbox
  id, to_wa, template enum, locale, body text, order_id null, status enum(QUEUED|SENT|FAILED), created_at

vouchers
  code PK, type enum(percent|fixed), value int, min_subtotal_idr int, active bool, expires_at null

admin_users
  id, email UNIQUE, password_hash, name
```

Seed: `data/catalog/products.json` → products + variants (`stock_qty` → `on_hand`, `stock_status=PREORDER` → `preorder_enabled=true`, `reserved=0`).

## 2. Status stok (derivasi, tidak disimpan)

```ts
available = on_hand - reserved
status = available > LOW_STOCK_THRESHOLD (3) ? 'READY'
       : available > 0                         ? 'LOW'
       : preorder_enabled                      ? 'PREORDER'
       :                                         'SOLD_OUT'
```
Status produk (untuk card): READY jika ada varian READY/LOW; else PREORDER jika ada; else SOLD_OUT.

## 3. State machine order

```
PENDING_PAYMENT ──paid──▶ PAID ──admin──▶ PROCESSING ──admin(resi)──▶ SHIPPED ──admin/webhook──▶ DELIVERED
      │                     │                 │
      ├──expired──▶ EXPIRED │                 │
      └──cancel───▶ CANCELLED ◀──admin────────┘   (PAID/PROCESSING dibatalkan → REFUND_PENDING, v1: manual)
```
- Tidak ada state COD. Tidak ada transisi lain selain di atas (enforce di `orderService.transition()`).
- Setiap transisi → event messaging (§6) jika `wa_opt_in`.

## 4. Logika stok & order (service)

**createOrder(input)** — satu transaksi DB:
1. Validasi Zod; hitung ulang harga dari DB (abaikan harga dari klien).
2. Untuk setiap item non-preorder: `UPDATE variants SET reserved = reserved + :qty WHERE sku = :sku AND on_hand - reserved >= :qty` → jika 0 row → rollback, kembalikan daftar SKU kurang stok.
3. Item varian PREORDER (available = 0 & preorder_enabled) → `is_preorder = true`, tanpa reservasi.
4. Insert order (PENDING_PAYMENT), items, reservations (`expires_at` = payment expiry + 5 menit).
5. Commit → `paymentProvider.createPayment()` → simpan payment → event ORDER_CREATED.

**onPaymentPaid(event)** — idempoten via `payment_events.event_id`:
`on_hand -= qty, reserved -= qty` per reservasi, `consumed_at = now`, order → PAID, movement `order_paid`, event PAYMENT_PAID.

**expireOrders()** — cron tiap menit (`/api/cron/expire`) + dipanggil lazy saat membaca order: reservasi lewat waktu → `reserved -= qty`, `released_at`, order → EXPIRED, event PAYMENT_EXPIRED.

**adminAdjustStock(sku, newOnHand)** — tolak jika `newOnHand < reserved`; movement; jika available naik dari 0 → proses `back_in_stock_requests` (event BACK_IN_STOCK).

## 5. Kontrak provider (`src/lib/contracts`)

```ts
export type PaymentMethod = 'QRIS' | 'EWALLET' | 'VA' | 'CARD';   // TIDAK ADA 'COD'
export type EwalletChannel = 'GOPAY' | 'OVO' | 'DANA' | 'SHOPEEPAY';
export type VaChannel = 'BCA' | 'MANDIRI' | 'BNI' | 'BRI' | 'PERMATA';

export interface CreatePaymentInput {
  orderId: string; orderNo: string; amountIdr: number;
  method: PaymentMethod; channel?: EwalletChannel | VaChannel;
  customer: { name: string; wa: string; email?: string };
  successRedirectUrl: string;
}
export interface PaymentInstruction {
  providerRef: string; method: PaymentMethod; channel?: string;
  expiresAt: Date;
  qrString?: string;        // QRIS
  vaNumber?: string;        // VA
  redirectUrl?: string;     // e-wallet / kartu 3DS
}
export interface PaymentWebhookResult {
  eventId: string; providerRef: string;
  status: 'PAID' | 'EXPIRED' | 'FAILED'; paidAt?: Date; raw: unknown;
}
export interface PaymentProvider {
  readonly name: 'mock' | 'xendit';
  createPayment(input: CreatePaymentInput): Promise<PaymentInstruction>;
  cancelPayment(providerRef: string): Promise<void>;
  verifyAndParseWebhook(req: Request): Promise<PaymentWebhookResult>;
}

export interface ShippingRateRequest {
  destination: { province: string; city: string; zone: 'Z1'|'Z2'|'Z3'|'Z4'; postalCode: string };
  weightGrams: number; itemValueIdr: number; now: Date;
}
export interface ShippingRate {
  serviceCode: string; courier: string; service: string;
  type: 'instant' | 'express' | 'regular';
  priceIdr: number; insuranceIdr: number; eta: string;   // "1-2 hari" / "1-3 jam"
}
export interface ShippingProvider {
  readonly name: 'mock' | 'biteship';
  getRates(req: ShippingRateRequest): Promise<ShippingRate[]>;
  getTracking?(courier: string, awb: string): Promise<{ status: string; at: Date; note?: string }[]>;
}

export type MessageTemplate = 'ORDER_CREATED' | 'PAYMENT_PAID' | 'PAYMENT_EXPIRED'
  | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'BACK_IN_STOCK' | 'PAYMENT_INSTRUCTIONS';
export interface MessagingProvider {
  readonly name: 'outbox' | 'waba';
  send(to: string, template: MessageTemplate, locale: 'id'|'en', vars: Record<string, string>): Promise<void>;
}
```

**Mock payment:** `qrString = "MOCKQRIS|<orderNo>|<amount>"`, `vaNumber = <prefix bank> + 10 digit` (BCA `39108`, Mandiri `88908`, BNI `8808`, BRI `26215`, Permata `8215`), expiry QRIS 30 mnt, e-wallet 15 mnt, VA 24 jam, kartu 15 mnt. Tombol simulasi memanggil `POST /api/webhooks/payment` dengan payload mock bertanda tangan `WEBHOOK_SECRET` — jalur yang sama dengan produksi.

**Urutan tile pembayaran:** QRIS → GoPay → OVO → DANA → ShopeePay → VA BCA → VA Mandiri → VA BNI → VA BRI → VA Permata → Kartu.

**Mock shipping:** baca `data/shipping/mock-rates.json`; `regular/express` = `per_kg[zone] × ceil(kg)`; `instant` hanya Z1, berat ≤ `max_kg`, sebelum `cutoff` WIB; asuransi = max(`min_idr`, 0,25% × nilai barang). Urutan tampil: Instan, Express, Reguler (termurah dulu di tiap grup).

## 6. Template WhatsApp

**Link `wa.me` (pembeli → toko):** `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`

| Konteks | Teks (id) |
|---|---|
| PDP | `Halo Relevé, saya mau tanya {name} ({model_code}){variant? " – " + variant}. {url}` |
| Size guide | `Halo Relevé, saya mau konsultasi ukuran untuk {name} ({model_code}). Panjang kaki saya: … cm` |
| Cart | `Halo Relevé, saya mau tanya keranjang saya:\n{lines: "- {name} {variant} ×{qty}"}` |
| Luar Jawa | `Halo Relevé, saya di {province}, apakah bisa kirim ke sini?` |
| Order | `Halo Relevé, saya mau tanya pesanan {order_no}.` |
| Habis | `Halo Relevé, {name} {variant} masih bisa dipesan?` |

Versi `en` padanannya di `messages/en.json` ("Hi Relevé, I'd like to ask about …").

**Notifikasi (toko → pembeli, outbox):**

| Template | Isi (id) |
|---|---|
| ORDER_CREATED | `Terima kasih, {name}! Pesanan {order_no} sebesar {total} menunggu pembayaran via {method} sampai {expires}. Bayar: {pay_url}` |
| PAYMENT_PAID | `Pembayaran {order_no} sebesar {total} sudah kami terima. Pesanan sedang kami siapkan. Lacak: {track_url}` |
| PAYMENT_EXPIRED | `Pembayaran {order_no} sudah kedaluwarsa dan stok dilepas. Mau pesan lagi? {shop_url}` |
| ORDER_SHIPPED | `Pesanan {order_no} sudah dikirim via {courier}, resi {awb}. Lacak: {track_url}` |
| ORDER_DELIVERED | `Pesanan {order_no} sudah sampai. Semoga cocok di kaki! Ada kendala ukuran? Balas pesan ini.` |
| BACK_IN_STOCK | `Kabar baik! {name} {variant} sudah ready lagi. Pesan sekarang: {url}` |
| PAYMENT_INSTRUCTIONS | `Instruksi bayar {order_no}: {method} {va_or_qr_hint}, total {total}, batas {expires}.` |

## 7. Endpoint / Server Actions

| Nama | Tipe | Input → Output |
|---|---|---|
| `getCatalog(filters)` | server fn | filter, sort, page → products + facets |
| `getProduct(slug)` | server fn | → product + variants (dengan available & status) |
| `validateCart(items)` | action | [{sku, qty}] → items terkoreksi + notices |
| `getShippingRates(address, items)` | action | → ShippingRate[] |
| `applyVoucher(code, subtotal)` | action | → discount atau error |
| `createOrder(payload)` | action | kontak, alamat, shipping code, method/channel, items, voucher?, linkToken? → `{orderNo, payUrl}` atau error stok |
| `changePaymentMethod(orderNo, method)` | action | → PaymentInstruction baru |
| `getOrderPublic(orderNo, waLast4)` | action | → status, items, timeline (atau not found generik) |
| `requestBackInStock(sku, wa, locale)` | action | → ok |
| `POST /api/webhooks/payment` | route | webhook provider (mock/xendit) |
| `POST /api/demo/simulate-payment` | route (DEMO_MODE) | `{orderNo, outcome: 'PAID'|'EXPIRED'}` → kirim webhook mock bertanda tangan |
| `GET /api/cron/expire` | route (Vercel Cron) | expireOrders() |
| Admin actions | action | adjustStock, togglePreorder, transitionOrder, createCheckoutLink |
