# 02 — Requirements

Priority: **M** = must have for the demo · **S** = should have in the demo · **L** = later (not in the demo).
Every FR has testable acceptance criteria (AC). Agents must reference the FR ID in commits/PRs.

---

## A. Catalog (CAT)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| CAT-01 | M | Main navigation: **Shoes · Dancewear · Kids · Pointe** + search | Menu shown in the desktop header; on mobile via a drawer. Each item goes to the correct listing page |
| CAT-02 | M | Listing per discipline: Ballet, Pointe, Jazz, Tap, Character, Latin/Ballroom, Contemporary, Leotards, Skirts, Tops, Tights | URL `/[locale]/c/[discipline]`; product count matches `data/catalog/products.json` |
| CAT-03 | M | Filters: discipline, for (Adult/Kids/Men), size, width, color, price range, **availability** (Ready / Pre-order) | Filters can be combined; filter state in the query string (shareable); "Reset" button |
| CAT-04 | M | Sort: "Terbaru" (Newest, default), "Harga ↑" (Price ↑), "Harga ↓" (Price ↓) | Results are correctly ordered |
| CAT-05 | M | ProductCard: 1:1 photo, name, model code (SD16), price in Rp, color swatches (max 5 + "+N"), aggregate stock badge | Badge: "Ready" if any variant is READY/LOW; "Pre-order" if only PREORDER; "Habis" (Sold out) if all are SOLD_OUT |
| CAT-06 | M | Search by name / model code | "sd16" and "bliss" find Bliss Stretch Canvas SD16; no results → empty state + WA CTA |
| CAT-07 | S | Homepage: editorial hero, shop by discipline, ready-stock products, "Konsultasi ukuran via WA" (Size consultation via WA) banner, trust strip | — |
| CAT-08 | L | Wishlist, recently viewed | — |

## B. Product page (PDP)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| PDP-01 | M | Photo gallery (swipe on mobile), name, model code, brand "Só Dança", price | Price formatted `Rp 675.000` |
| PDP-02 | M | Variant picker: **Color → Size → Width → Shank** (only the options the product has) | Options whose combination is SOLD_OUT stay visible but struck through + "Habis" (Sold out) tooltip; selecting a color switches the photo (if available) |
| PDP-03 | M | Stock status **for the selected variant**: Ready (ships in 1–2 business days) / "Sisa N" (N left) / Pre-order (estimated 4–6 weeks) / "Habis" (Sold out) | Updates in real time when the variant changes; before a full variant is selected, "Pilih ukuran" (Select a size) is shown |
| PDP-04 | M | Primary CTA: "Tambah ke Keranjang" (Add to cart) (Ready/Sisa/Pre-order) or "Kabari Saya via WA" (Notify me on WhatsApp) (Habis) | Button disabled until a full variant is selected; max qty = stock (READY/LOW) or 5 (PREORDER) |
| PDP-05 | M | Secondary button **"Tanya via WA"** (Ask via WA) with a pre-filled message | Opens `wa.me/<WA_NUMBER>?text=` containing name, code, selected variant, product URL (see `05` §6) |
| PDP-06 | M | **Size guide** modal: size table per category (US → foot length in cm), how to measure your foot, CTA "Konsultasi ukuran via WA" | For Pointe, show the notice "Disarankan konsultasi/fitting sebelum membeli pointe" (Consultation/fitting recommended before buying pointe shoes) |
| PDP-07 | M | Description (EN from source + ID feature bullets), materials, care, brief shipping & payment info | — |
| PDP-08 | S | "Bandingkan model serupa" (Compare similar styles) (3 products from the same discipline) | — |
| PDP-09 | M | Trust label: "Produk original Só Dança · Impor resmi" (Original Só Dança product · Officially imported) — **without** the words official/authorized | Grep the codebase: no "official"/"authorized"/"resmi Só Dança" strings |

## C. Cart (CART)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| CART-01 | M | Cart drawer (opens after add) + `/cart` page | — |
| CART-02 | M | Change qty, remove, change variant; re-validate stock every time the cart is opened | If stock drops below qty → qty is adjusted + notice |
| CART-03 | M | Pre-order items are labeled + estimate; a mixed ready + pre-order cart ships **all at once** when everything is ready (v1) | Clear notice in the cart & checkout summary |
| CART-04 | M | Summary: subtotal, "Ongkir dihitung di checkout" (Shipping calculated at checkout), total | — |
| CART-05 | M | Cart stored in localStorage (guest) | Browser reload → cart contents persist |
| CART-06 | S | "Tanya keranjang ini via WA" (Ask about this cart via WA) button (message contains the item list) | — |

## D. Checkout (CHK)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| CHK-01 | M | Single-page guest checkout, 3 progressive sections: **Contact & Address → Shipping → Payment** | Mobile: the next section opens once the previous section is valid |
| CHK-02 | M | Contact: full name, **WA number** (required, normalized to `+62`), email (optional), checkbox "Kirim update pesanan via WhatsApp" (Send order updates via WhatsApp) (default ON) | `0812-3456-7890`, `62812…`, `+62 812…` → `+6281234567890`; reject if < 9 or > 13 digits after 62 |
| CHK-03 | M | Address: Province (6 Java provinces) → Kab/Kota (regency/city) (`data/shipping/java-areas.json`) → Kecamatan (district) (text) → Postal code (5 digits) → Full address → Courier notes | Provinces outside Java are not in the dropdown; link "Di luar Pulau Jawa? Hubungi kami via WA" (Outside Java? Contact us via WA) |
| CHK-04 | M | Shipping: list of services from the ShippingProvider (price, estimate), grouped as **Instant · Express · Regular**; insurance default ON | Instant only shown for zone Z1 (Jabodetabek) & before the cutoff |
| CHK-05 | M | Payment: method tiles (QRIS, e-wallets, VA per bank, cards), order per `05` §5 | **No COD option**; no installments |
| CHK-06 | M | Order summary sticky (desktop) / collapsible (mobile): items, subtotal, shipping, insurance, **total** | Total = subtotal + shipping + insurance; figures match the server |
| CHK-07 | M | "Bayar Sekarang" (Pay now) button → server creates order + stock reservation + payment → redirect to the payment page | If stock is insufficient: no order is created, the problem items are shown |
| CHK-08 | M | Consent: "Dengan membayar, kamu menyetujui Syarat & Ketentuan" (By paying, you agree to the Terms & Conditions) (link) | — |
| CHK-09 | S | Voucher/promo code (1 code, percentage or fixed amount) | Demo code: `RELEVE10` (10%, min Rp500.000) |
| CHK-10 | M | **Checkout link** from admin (see ADM-05) pre-fills the cart & contact | `/[locale]/checkout?link=<token>`; token expires after 48 hours |

## E. Payment (PAY)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| PAY-01 | M | All payments go through the `PaymentProvider` interface; the demo uses `MockPaymentProvider` | Switching provider = changing 1 env var `PAYMENT_PROVIDER` |
| PAY-02 | M | QRIS payment page: large QR, amount, 30-minute countdown, "Cara bayar" (How to pay), download QR button | QR contains a mock string (rendered via a QR lib) |
| PAY-03 | M | VA payment page: bank name, VA number (mono, **"Salin"** (Copy) button), amount (Salin), 24-hour countdown, per-channel instructions (ATM / mobile banking / internet banking) in an accordion | — |
| PAY-04 | M | E-wallet: "Buka GoPay/OVO/DANA/ShopeePay" (Open GoPay/OVO/DANA/ShopeePay) button (mock redirect to a confirmation page), 15-minute countdown | — |
| PAY-05 | M | Card: card number, exp, CVV form (mock, not stored), simulated 3DS step | Test card `4000 0000 0000 0002` fails, any other number succeeds |
| PAY-06 | M | Status polled every 5 seconds; on PAID → redirect to the success page | — |
| PAY-07 | M | **Demo mode**: "Simulasikan Pembayaran Berhasil" (Simulate successful payment) and "Simulasikan Kedaluwarsa" (Simulate expiry) buttons (only if `DEMO_MODE=true`) | Calls the same mock webhook as the production path |
| PAY-08 | M | Webhook is idempotent & verified (token/signature) | Webhook sent 2× → order is still 1×PAID, stock deducted 1× |
| PAY-09 | S | "Kirim instruksi pembayaran ke WA saya" (Send payment instructions to my WA) | Creates a message in the WA outbox (demo) |
| PAY-10 | M | Change payment method before paying | Old payment is cancelled, reservation is kept |
| PAY-11 | L | Xendit sandbox/live, installments, paylater | — |

## F. Stock (STK)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| STK-01 | M | Stock per variant: `on_hand`, `reserved`; `available = on_hand − reserved` | — |
| STK-02 | M | Status: READY (available > 3), LOW (1–3, shown as "Sisa N"), PREORDER (0 & `preorder_enabled`), SOLD_OUT (0 & not pre-order) | Threshold 3 is configurable |
| STK-03 | M | Reservation is created when the order is created, expiry = payment validity + 5 minutes | Order EXPIRED → reservation released automatically (job every 1 minute or lazily on read) |
| STK-04 | M | On PAID: `on_hand −= qty`, `reserved −= qty` in a single transaction | Never negative (DB constraint) |
| STK-05 | M | **No overselling**: two simultaneous checkouts for the last unit → only one succeeds | Concurrency test passes |
| STK-06 | M | Pre-orders do not reduce stock; recorded as `preorder` on the order item | — |
| STK-07 | M | Back-in-stock: store WA number + variant; when variant stock > 0 → WA message (outbox) | — |
| STK-08 | M | All stock changes are recorded in `stock_movements` (who, when, reason) | — |

## G. Shipping (SHP)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| SHP-01 | M | `ShippingProvider` interface; demo `MockShippingProvider` reads `data/shipping/mock-rates.json` | — |
| SHP-02 | M | Weight = Σ(variant weight × qty) + 150 g packaging, rounded up to the next kg | — |
| SHP-03 | M | Admin enters resi (tracking number) + courier → status SHIPPED → WA message | — |
| SHP-04 | S | Tracking page shows a mock timeline ("Dikemas" (Packed) → "Dikirim" (Shipped) → "Dalam perjalanan" (In transit) → "Terkirim" (Delivered)) | — |
| SHP-05 | L | Biteship live (rates, orders, tracking webhook) | — |

## H. WhatsApp (WA)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| WA-01 | M | One business number from env `NEXT_PUBLIC_WA_NUMBER` | — |
| WA-02 | M | Floating WA button (all store pages except the payment page) + inline on PDP, size guide, cart, checkout, success, tracking | — |
| WA-03 | M | Pre-filled message templates per context (see `05` §6), language follows the locale | — |
| WA-04 | M | Transactional notifications via `MessagingProvider`; demo = `OutboxMessagingProvider` (stored in the `wa_outbox` table, shown in admin) | Events: ORDER_CREATED, PAYMENT_PAID, ORDER_SHIPPED, ORDER_DELIVERED, PAYMENT_EXPIRED, BACK_IN_STOCK |
| WA-05 | M | Respect opt-in: notifications only if the checkbox is ON | — |
| WA-06 | L | WhatsApp Business API (BSP / Meta Cloud API) | — |

## I. Orders & tracking (ORD)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| ORD-01 | M | Order number format `RDS-YYMMDD-XXXX` (XXXX = random base32) | Unique |
| ORD-02 | M | Success page: order number, summary, "Konfirmasi dikirim ke WA kamu" (Confirmation sent to your WA), tracking & WA buttons | — |
| ORD-03 | M | Order tracking without login: enter order number + last 4 digits of the WA number | Wrong → generic message (does not reveal whether the order exists) |
| ORD-04 | M | Status timeline (see state machine `05` §3) | — |

## J. Admin (ADM) — Bahasa Indonesia only

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| ADM-01 | M | Admin login (1 account seeded from env) | `/admin/*` routes are protected |
| ADM-02 | M | Dashboard: today's orders, awaiting payment, to be shipped, low-stock variants | — |
| ADM-03 | M | Products & stock: table per product → variant grid (size × width) with stock input, pre-order toggle, lead time | Save → `stock_movements` recorded |
| ADM-04 | M | Orders: list + status filter, detail, change status ("Proses" (Process), "Kirim" (Ship) + resi, "Selesai" (Complete), "Batalkan" (Cancel)) | Transitions follow the state machine |
| ADM-05 | M | **Create checkout link**: pick variant + qty, fill in name/WA (optional), price fixed from the catalog → link + "Kirim via WA" (Send via WA) button | Link valid for 48 hours |
| ADM-06 | M | WA outbox: list of "sent" messages (demo) with preview | — |
| ADM-07 | S | Pricing: view the markup calculation (`06-pricing.md`), override price per product | — |
| ADM-08 | L | Multi-admin, roles, full audit | — |

## K. Language (I18N)

| ID | P | Requirement | Acceptance criteria |
|---|---|---|---|
| I18N-01 | M | Locales `id` (default) & `en`, URL prefix `/id/...`, `/en/...`; `/` → redirect to `/id` | — |
| I18N-02 | M | Language toggle in header & footer, keeping the current page | — |
| I18N-03 | M | All UI strings in `messages/id.json` & `messages/en.json`; **no hard-coded strings** | Lint/test: id & en keys are exactly the same |
| I18N-04 | M | Dance terms & Só Dança color names are **not translated** (`design-system/glossary.json`) | — |
| I18N-05 | M | Numbers & money always in Indonesian format in both locales (`Rp 1.250.000`), dates `5 Nov 2026` / `5 Nov 2026` | — |

---

## Non-functional (NFR)

| ID | Requirement |
|---|---|
| NFR-01 | **Mobile-first**; tested at 360×800, 390×844, 768×1024, 1280×800. No horizontal scroll |
| NFR-02 | **WCAG 2.1 AA**: contrast (tokens already checked), visible focus, keyboard navigation, form labels, touch targets ≥ 44px, `prefers-reduced-motion` |
| NFR-03 | Performance (Lighthouse mobile, listing pages & PDP): Performance ≥ 85, LCP < 2.5 s, CLS < 0.1 |
| NFR-04 | SEO: per-page metadata, `hreflang` id/en, sitemap, JSON-LD `Product` (offers IDR, availability) |
| NFR-05 | Security: prices & totals **always calculated on the server**; Zod validation on all input; webhooks verified; card data never stored; rate limiting on create-order & tracking |
| NFR-06 | Privacy (UU PDP, Indonesia's Personal Data Protection Law): WA numbers used only for orders & opted-in notifications; Privacy Policy page |
| NFR-07 | Time: all displays in WIB (Asia/Jakarta); store UTC |
| NFR-08 | Observability: structured logs for order/payment/stock events |
| NFR-09 | Money stored as **integer Rupiah** (no decimals) |
