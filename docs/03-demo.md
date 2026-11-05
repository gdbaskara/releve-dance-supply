# 03 — Demo: scope & scenarios

## 1. Demo goal
The client can try the **end-to-end sales flow** on a phone and a laptop: browse the catalog → pick a size → checkout → pay (simulated) → WA notification (simulated) → admin processes & ships → buyer tracks the order. Everything feels real, without any payment gateway / courier / WA API accounts.

## 2. Real vs simulated

| Part | In the demo | Later (production) |
|---|---|---|
| Catalog, stock, orders, admin | **Real** (Postgres) | Same |
| Payments | `MockPaymentProvider` — dummy QR & VA, "Simulasikan Bayar" (Simulate payment) button | `XenditProvider` |
| Shipping costs | `MockShippingProvider` — `data/shipping/mock-rates.json` | Biteship |
| Regions | `data/shipping/java-areas.json` (province + Kab./Kota (regency/city)), kecamatan (district) & postal code as free input | Biteship Area API |
| Outgoing WhatsApp (notifications) | `OutboxMessagingProvider` — stored & shown in Admin → WA Outbox | WhatsApp Business API |
| Incoming WhatsApp (questions) | **Real** — `wa.me` link to the demo number | Same |
| Product photos | Neutral placeholders (default). The flag `DEMO_USE_REFERENCE_IMAGES=true` uses sodanca.com reference URLs — **for internal presentations only** | Own photos |
| Prices | Markup model (`06-pricing.md`) | Client's final prices |

Small banner at the top of the page when `DEMO_MODE=true`: "Mode demo — pembayaran & pengiriman disimulasikan." (Demo mode — payments & shipping are simulated.)

## 3. Demo data

| Data | File | Contents |
|---|---|---|
| Products & variants | `data/catalog/products.json` | 40 models, 2.903 SKUs, prices, stock |
| Variants (table) | `data/catalog/variants.csv` | For the client to open in Sheets |
| Pricing assumptions | `data/catalog/pricing_config.json` | Exchange rate 18.500, duties, multipliers |
| Regions | `data/shipping/java-areas.json` | 6 provinces, 119 Kab./Kota, zones Z1–Z4 |
| Rates | `data/shipping/mock-rates.json` | 7 courier services, insurance |
| Additional seed (created by agent WS-2) | `src/db/seed/*` | 1 admin, 12 sample orders in various statuses, 3 back-in-stock requests, voucher `RELEVE10` |

Stock distribution is deliberately varied so every status is visible: READY 1.023 SKUs · LOW 680 · PREORDER 582 · SOLD_OUT 618. Key products for the demo:
- **Diamond SD140 (Adult)** — almost all sizes ready → happy-path flow.
- **Alina IV P95** — many "Sisa 1–3" (1–3 left) → stock urgency.
- **Briar SD110L, Jaxon JZ86L, Claudine SD155** — fully pre-order.
- **Roy BL104, Elsie SL248** — sold out → "Kabari saya via WA" (Notify me on WhatsApp).
- **SD09 / Toshie** — pointe with a **shank** option.

## 4. Demo scenarios (must pass — also serve as Playwright E2E tests)

| # | Scenario | Steps | Expected result |
|---|---|---|---|
| D1 | **Happy path QRIS + instant courier** | Phone → Ballet → Diamond SD140 → Ballet Pink, size, width → Add → Checkout, address Kota Jakarta Selatan → GoSend Instant → QRIS → Simulate payment | Success page, variant stock −1, WA outbox "Pembayaran diterima" (Payment received) |
| D2 | **Size consultation → checkout link → VA** | Alina PDP → "Tanya via WA" (Ask via WA) (pre-filled message) → Admin creates a checkout link for that variant → open the link → VA BCA → copy number → Simulate payment | Order PAID from the admin link |
| D3 | **Out of stock → notify me** | Roy BL104 → select a size → "Kabari Saya via WA" → enter WA → Admin adds stock for that variant | WA outbox "Stok sudah ready" (Back in stock) |
| D4 | **Mixed pre-order + ready** | Add Briar (pre-order) + Diamond (ready) → checkout | Pre-order label & 4–6 week estimate in the cart, summary, success page |
| D5 | **Outside Java** | Checkout → look for the Bali province | Not available; WA link "Di luar Pulau Jawa?" (Outside Java?) |
| D6 | **Expiry → stock returned** | Checkout an item with "Sisa 1" (1 left) → Simulate expiry | Order EXPIRED, available stock restored, WA outbox "Pembayaran kedaluwarsa" (Payment expired) |
| D7 | **Admin ships + tracking** | Admin → PAID order → Process → Ship (JNE, resi (tracking number)) → buyer opens Track (order number + 4 WA digits) | Timeline SHIPPED, WA outbox contains the resi |
| D8 | **Language** | Toggle EN on a pointe PDP | UI in English, terms (pointe, shank, vamp, Ballet Pink) & Rp format unchanged |
| D9 | **Race for the last unit** (automated test only) | 2 parallel checkouts for a variant with available=1 | One succeeds, one is rejected with "Stok tidak cukup" (Insufficient stock) |

## 5. Demo deployment
- Preview URL (Vercel) + Postgres (Neon). Admin: credentials from env, given to the client separately.
- Storybook deployed separately (`/storybook` or a second Vercel project) for design system review.
