# 11 — Integration go-live (Xendit, Biteship, WhatsApp Business)

The demo uses mock providers (`PAYMENT_PROVIDER=mock`, `SHIPPING_PROVIDER=mock`, `MESSAGING_PROVIDER=outbox`).
The real providers already exist in `src/lib/providers/**`; going live = filling in env + switching 3 variables. No code changes.

> **Secrets are never committed.** Put them in `.env.local` (local) or the hosting secret manager. `.env.example` only contains variable names (commented out).

Sections marked **VERIFY** are assumptions about the API shape that must be checked in sandbox/test mode before going live.

---

## 0. Quick checklist

| # | Step | Done |
|---|---|---|
| 1 | Public HTTPS domain (`NEXT_PUBLIC_SITE_URL=https://…`) — Xendit rejects non-HTTPS return URLs | ☐ |
| 2 | Xendit: verified account, payment methods active, secret key + webhook token, webhook URL | ☐ |
| 3 | Test Xendit in test mode (all tiles: QRIS, 4 e-wallets, 5 VAs, card) | ☐ |
| 4 | Biteship: API key, warehouse postal code/area + coordinates, balance | ☐ |
| 5 | Meta WABA: business number, System User token, 7 templates × 2 languages **Approved** | ☐ |
| 6 | `validateProviderEnv()` reports no problems (see §5) | ☐ |
| 7 | Set `PAYMENT_PROVIDER=xendit`, `SHIPPING_PROVIDER=biteship`, `MESSAGING_PROVIDER=waba`, `DEMO_MODE=false`, `NEXT_PUBLIC_DEMO_MODE=false` | ☐ |
| 8 | Production smoke test with a small amount (QRIS Rp10.000), then a manual refund in the dashboard | ☐ |

Providers can be switched one at a time (e.g. Biteship first, Xendit later).

---

## 1. Xendit (payments)

### 1.1 Integration used
Xendit **Payments API v3** (`POST /v3/payment_requests`, header `api-version: 2024-11-11`) — the unified API that
replaces the old QR Codes API, E-Wallet Charges, and Fixed VA API. Cards use a hosted **Payment Session**
(`POST /sessions`, `mode: PAYMENT_LINK`, `allowed_payment_channels: ["CARDS"]`) so card data never
touches our server (full PCI DSS is not required).

| Tile | `channel_code` | Result |
|---|---|---|
| QRIS | `QRIS` | `qrString` from the `QR_STRING` action, expires in 30 min |
| GoPay / OVO / DANA / ShopeePay | `GOPAY` / `OVO` / `DANA` / `SHOPEEPAY` | `redirectUrl` from the `WEB_URL` action (or `DEEPLINK_URL`) |
| VA BCA / Mandiri / BNI / BRI / Permata | `BCA_VIRTUAL_ACCOUNT`, `MANDIRI_…`, `BNI_…`, `BRI_…`, `PERMATA_…` | `vaNumber` from the `VIRTUAL_ACCOUNT_NUMBER` action; `type: PAY` = closed, single-use VA with exact amount; 24 hours |
| Card | Payment Session | `redirectUrl` = `payment_link_url` (3DS on the Xendit page), 15 min |

`reference_id` = `<orderNo>-<METHOD>-<random>`; it is also sent as the `idempotency-key`. `providerRef` = the Xendit id (`pr-…` or `ps-…`).
Changing method → `POST /v3/payment_requests/{id}/cancel` or `POST /sessions/{id}/cancel`.

### 1.2 Account & keys
1. Sign up at <https://dashboard.xendit.co>, complete business verification (Indonesian documents), then activate the payment methods: QRIS, GoPay, OVO, DANA, ShopeePay, VA BCA/Mandiri/BNI/BRI/Permata, Cards. Activating some channels (GoPay, cards) requires partner review — start early.
2. **Settings → API keys** → *Generate secret key* with the **Money-in: Write** permission (Payments API / Sessions). Test mode: `xnd_development_…`; live: `xnd_production_…`.
3. **Settings → Webhooks** → copy the **Webhook verification token** → `XENDIT_CALLBACK_TOKEN`.
4. On the same Webhooks page, set the URL for the **Payments API** events (payment / payment_request) **and** **Payment Session**:
   `https://<domain>/api/webhooks/payment`

### 1.3 Env
| Var | Required | Value |
|---|---|---|
| `PAYMENT_PROVIDER` | ✓ | `xendit` |
| `XENDIT_SECRET_KEY` | ✓ | secret key (Basic auth, empty password) |
| `XENDIT_CALLBACK_TOKEN` | ✓ | webhook verification token |
| `XENDIT_BASE_URL` | – | default `https://api.xendit.co` |
| `XENDIT_API_VERSION` | – | default `2024-11-11` |

`WEBHOOK_SECRET` is still required for mock/demo; Xendit does not use it.

### 1.4 Webhook → order status
The `x-callback-token` header must exactly match `XENDIT_CALLBACK_TOKEN` (constant-time comparison); otherwise → 401.

| Xendit event | Our status | `eventId` (idempotent) |
|---|---|---|
| `payment.capture` | PAID | `xendit:payment.capture:<payment_id>` |
| `payment.failure` | FAILED (the order stays pending; the buyer can switch methods) | `xendit:payment.failure:<payment_id>` |
| `payment_request.expiry` | EXPIRED | `xendit:payment_request.expiry:<payment_request_id>` |
| `payment_session.completed` | PAID (card) | `xendit:payment_session.completed:<payment_session_id>` |
| `payment_session.expired` | EXPIRED (card) | `xendit:payment_session.expired:<payment_session_id>` |
| other events (refund, token, authorization…) | ignored, answered with **200** | – |

Xendit retries (up to 6× within 24 hours) send the same payload → same `eventId` → `payment_events` rejects the duplicate.
The local expiry sweep (`/api/cron/expire`) keeps running as a safety net in case the expiry webhook never arrives.

**VERIFY in test mode**
- QRIS & VA accept `channel_properties.expires_at`; e-wallets use the partner expiry (OVO 15 min, GoPay 30 min).
- OVO requires `channel_properties.account_mobile_number` (E.164) and works via push notification — it may come **without** a `redirectUrl`; the payment page must show "open the OVO app".
- The payment request inside a card Payment Session inherits the session's `reference_id` (`…-CARD-…`), so its `payment.*` events are ignored (what is tracked is `payment_session.completed`). If it does not inherit it, those events will be answered with 404 (unknown payment) and retried by Xendit — no data damage, but it needs adjusting.
- `idempotency-key` is honored by both endpoints.
- An inline `customer` object in the Payment Session is accepted (reference_id `wa_<WA digits>`).

### 1.5 Testing in test mode
1. Fill env with the `xnd_development_…` key, `PAYMENT_PROVIDER=xendit`, run the app on a public HTTPS URL (e.g. an ngrok/cloudflared tunnel) and set `NEXT_PUBLIC_SITE_URL` to that URL; register the tunnel webhook URL in the test-mode dashboard.
2. Create an order for each tile. Simulate payment:
   - **QRIS / VA**: Dashboard (test mode) → transaction → *Simulate payment*, or the Xendit simulation endpoint for payment requests (see docs.xendit.co → "Simulate payment").
   - **E-wallet**: open the `redirectUrl`; the partner sandbox page provides success/failure buttons.
   - **Card**: the Payment Session page with Xendit test cards (docs: "Simulate card scenarios (test cards)").
3. Check: order → PAID, stock deducted, a `PAYMENT_PAID` message in the WA Outbox; resend the webhook from the Dashboard → response `duplicate: true`.
4. Let one QRIS expire → order EXPIRED, stock released.
5. Change method on the payment page → the old payment shows status CANCELED in the dashboard.

---

## 2. Biteship (shipping rates & tracking)

### 2.1 What is used
- `POST /v1/rates/couriers` with couriers `jne,jnt,sicepat,anteraja` based on **postal code** (origin ↔ destination). If the buyer has not entered a postal code or the warehouse uses an area id → `GET /v1/maps/areas?countries=ID&input=…&type=single` (cached).
- Instant couriers `gojek,grab` are priced using **coordinates**: the warehouse pin + the center point of the destination city (`shipping/biteship-areas.ts`, Z1 only). Instant prices are city-level estimates until checkout has a map pin.
- Store rules still apply on top of Biteship: instant only in Z1, before the WIB cutoff (GoSend Instant 16:00 / ≤20 kg, Grab Same Day 14:00 / ≤7 kg), freight/cargo dropped, ordering Instant → Express → Regular.
- Types: `service_type` `instant`/`same_day` → Instant (hours), `overnight` + `jne_yes`, `sicepat_best`, `anteraja_next_day` → Express, everything else → Regular. `serviceCode` = `<courier_code>_<service_code>` (e.g. `jne_reg`).
- Insurance: our rule by default, max(Rp2.500, 0.25% of goods value). `BITESHIP_USE_COURIER_INSURANCE=true` → send `courier_insurance` and use Biteship's `insurance_fee`.
- Tracking: `GET /v1/trackings/{awb}/couriers/{courier_code}` (courier names from admin are normalized: "J&T" → `jnt`, "GoSend" → `gojek`).

### 2.2 Steps
1. Sign up at <https://dashboard.biteship.com>, verify the account, top up the balance (needed later when creating shipping orders; rate checks also consume API quota/fees depending on the plan — check <https://biteship.com/id/harga>).
2. **Integrasi → API Key** (Integration → API Key) → create a test key (`biteship_test.…`) and a live key (`biteship_live.…`).
3. Jakarta warehouse (demo assumption: Kota Jakarta Selatan): enter the warehouse postal code, and get the warehouse pin coordinates (Google Maps → right-click → copy lat,lng).
   Optional: look up the area id via `GET https://api.biteship.com/v1/maps/areas?countries=ID&input=<postal_code>&type=single` with the header `authorization: <key>`.
4. Enable the JNE, J&T, SiCepat, AnterAja, GoSend, GrabExpress couriers in the dashboard.

### 2.3 Env
| Var | Required | Value |
|---|---|---|
| `SHIPPING_PROVIDER` | ✓ | `biteship` |
| `BITESHIP_API_KEY` | ✓ | API key |
| `BITESHIP_ORIGIN_POSTAL_CODE` **or** `BITESHIP_ORIGIN_AREA_ID` | ✓ | warehouse |
| `BITESHIP_ORIGIN_LATITUDE`, `BITESHIP_ORIGIN_LONGITUDE` | for instant | warehouse pin; without these, instant couriers are not offered |
| `BITESHIP_COURIERS` | – | default `jne,jnt,sicepat,anteraja,gojek,grab` |
| `BITESHIP_USE_COURIER_INSURANCE` | – | default `false` |
| `BITESHIP_BASE_URL` | – | default `https://api.biteship.com` |

**VERIFY with a test key**: the `service_type` values, the `shipment_duration_range` format ("1 - 2"), `shipping_type` "parcel", and the contents of tracking `history[]` (`status`, `note`, `updated_at`). Compare the list of services returned with the checkout tiles; add/remove codes in `EXPRESS_SERVICES` if needed.

### 2.4 Test
Checkout → enter a Jakarta Barat (Z1) address before 14:00 WIB → Instant, Express, Regular appear. A Semarang (Z3) address → no Instant. Ship an order with a real tracking number → `getTracking` returns the history.

---

## 3. WhatsApp Business (Meta Cloud API)

### 3.1 What is used
`POST https://graph.facebook.com/{WABA_API_VERSION}/{WABA_PHONE_NUMBER_ID}/messages` with `Authorization: Bearer WABA_TOKEN`,
**template** messages (`type: template`) with positional BODY parameters `{{1}}…{{n}}`, language `id` / `en` according to the order locale.
Every send is also recorded in `wa_outbox` (status `SENT` if Meta returns a `wamid`, `FAILED` on error) → Admin → WA Outbox keeps working.
A WA failure never fails the order (logged as `wa.failed`).

### 3.2 Meta setup
1. <https://business.facebook.com> → create/verify a Business Portfolio (business verification raises the message limit).
2. <https://developers.facebook.com> → *Create app* → type Business → add the **WhatsApp** product.
3. WhatsApp → API Setup → add the **business number** (a number not yet registered in the regular WhatsApp app; it can be the same number as `NEXT_PUBLIC_WA_NUMBER` after migration) → copy the **Phone number ID** → `WABA_PHONE_NUMBER_ID`.
4. Business Settings → Users → **System users** → create a system user (Admin) → *Assign assets*: app + WhatsApp account → *Generate token* with the `whatsapp_business_messaging` and `whatsapp_business_management` permissions, expiry *Never* → `WABA_TOKEN`. (The temporary token in API Setup expires in 24 hours — do not use it in production.)
5. Set the display name "Relevé Dance Supply" (without an "Official/Resmi" claim — see `design-system/glossary.json`).
6. WhatsApp Manager → **Message templates** → create the 7 templates below, each in **Indonesian (id)** and **English (en)**.

### 3.3 Templates
Name = `WABA_TEMPLATE_PREFIX` (default `releve_`) + the name in the table. Category **Utility**, except `back_in_stock`, which Meta will likely classify as **Marketing** (marketing pricing & opt-in rules).
Content matches docs/05 §6. Meta rejects templates that **end with a parameter**, so templates ending in a URL get a closing line `Relevé Dance Supply`.

| Template (code) | Meta name | Parameters |
|---|---|---|
| ORDER_CREATED | `releve_order_created` | 1 name · 2 order_no · 3 total · 4 method · 5 expires · 6 pay_url |
| PAYMENT_PAID | `releve_payment_paid` | 1 order_no · 2 total · 3 track_url |
| PAYMENT_EXPIRED | `releve_payment_expired` | 1 order_no · 2 shop_url |
| ORDER_SHIPPED | `releve_order_shipped` | 1 order_no · 2 courier · 3 awb · 4 track_url |
| ORDER_DELIVERED | `releve_order_delivered` | 1 order_no |
| BACK_IN_STOCK | `releve_back_in_stock` | 1 name · 2 variant · 3 url |
| PAYMENT_INSTRUCTIONS | `releve_payment_instructions` | 1 order_no · 2 method · 3 va_or_qr_hint · 4 total · 5 expires |
| LOW_STOCK_ALERT | `releve_low_stock_alert` (category *Utility*, sent to the admin) | 1 state · 2 product · 3 code · 4 variant · 5 available · 6 admin_url |

Parameter order is defined in `src/lib/providers/messaging/waba-templates.ts`; a language may use a different order (`{{2}}` before `{{1}}`).

**Suggested content**

`releve_order_created`
- id: `Terima kasih, {{1}}! Pesanan {{2}} sebesar {{3}} menunggu pembayaran via {{4}} sampai {{5}}. Bayar: {{6}}` + line `Relevé Dance Supply`
- en: `Thank you, {{1}}! Order {{2}} for {{3}} is awaiting payment via {{4}} until {{5}}. Pay: {{6}}` + line `Relevé Dance Supply`

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

When submitting, fill in sample values (e.g. `Siti`, `RDS-261105-AB12`, `Rp685.000`, `QRIS`, `5 Nov 2026 10.30 WIB`, `https://<domain>/id/pay/RDS-261105-AB12`).
Empty parameters are sent as `-`; newlines/tabs in parameters are stripped (Meta rule).

### 3.4 Opt-in rules (WA-05)
- Order notifications (`ORDER_CREATED`, `PAYMENT_PAID`, `PAYMENT_EXPIRED`, `ORDER_SHIPPED`, `ORDER_DELIVERED`) are only sent if the buyer ticked the WA opt-in at checkout (`notifyOrder` checks `waOptIn`).
- `LOW_STOCK_ALERT` goes to the store's own number (`ADMIN_WA_NUMBER`), not to buyers. Testing with the Cloud API test number: add that number as a test recipient in API Setup. Suggested body (id): `{{1}}: {{2}} ({{3}}) {{4}}, sisa {{5}}. Restock: {{6}}` · (en): `{{1}}: {{2}} ({{3}}) {{4}}, {{5}} left. Restock: {{6}}`.
- `PAYMENT_INSTRUCTIONS` is sent because the buyer pressed "Kirim instruksi ke WA" (Send instructions to WA); `BACK_IN_STOCK` because the buyer signed up via "Kabari saya" (Notify me).
- The opt-in text at checkout must mention the business name and that the buyer will receive WhatsApp messages (a Meta policy requirement). Honor stop requests: "STOP" replies are currently handled manually by the admin.
- Template messages may be sent outside the 24-hour window; free-form (non-template) replies from the admin still go through `wa.me` / the WhatsApp Business app.

### 3.5 Env
| Var | Required | Value |
|---|---|---|
| `MESSAGING_PROVIDER` | ✓ | `waba` |
| `WABA_TOKEN` | ✓ | System User token |
| `WABA_PHONE_NUMBER_ID` | ✓ | Phone number ID |
| `WABA_API_VERSION` | – | default `v26.0` (latest Graph API as of July 2026; **VERIFY** in the Meta changelog) |
| `WABA_TEMPLATE_PREFIX` | – | default `releve_` |
| `WABA_LANG_ID`, `WABA_LANG_EN` | – | default `id`, `en` (use `en_US` if the template was created as English (US)) |

### 3.6 Test
In API Setup, add your phone number as a test recipient, create an order with opt-in → the `releve_order_created` message is received, WA Outbox shows SENT.
Wrong template name/language → Outbox `FAILED`, the `wa.failed` log contains the Meta code (e.g. `132001`).

**VERIFY**: status `SENT` = accepted by Meta (has a `wamid`), not necessarily delivered/read; the Meta status webhook is not set up yet.

---

## 4. Production env summary

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
- Unknown provider name (e.g. `PAYMENT_PROVIDER=midtrans`) → immediate error when called.
- Real provider without env → `ProviderConfigError: "<provider> is not configured: missing X, Y"` on the first call.
- Check everything at once before deploying: `validateProviderEnv()` from `@/lib/providers` → `{ ok, problems[] }`, e.g.
  `pnpm tsx --env-file=.env.local -e 'import("./src/lib/providers/config.ts").then(m => console.log(m.validateProviderEnv()))'`.
- Rollback: set the variables back to `mock` / `outbox`. Xendit payments still PENDING can still be paid by the buyer; their webhooks are only processed again once `PAYMENT_PROVIDER=xendit` (manual reconciliation via the dashboard if the rollback lasts long).
