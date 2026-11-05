# `src/lib` — data, services, providers (WS-2)

API reference for phase-2 agents (storefront WS-3, checkout WS-4, admin WS-5).
Types not defined here come from `@/lib/contracts`.

**Rules**
- Server Components may call **services** directly (`@/lib/services/*`). Client Components call **actions** (`@/lib/actions/*`).
- Services are server-only (DB). Client-safe modules: `@/lib/wa`, `@/lib/data/areas`, `@/lib/data/rates`, `@/lib/services/schemas`, `@/lib/services/labels`, `@/lib/format`, `@/lib/contracts`.
- Money is integer Rupiah. Every price and total is recomputed on the server; client numbers are ignored.
- Dates come back as `Date` objects, in services and in actions alike (React serializes `Date` across the action boundary).
- Errors are returned as discriminated unions (`{ ok: false, error }`). Services throw only on unexpected failures (DB down).
- Expired orders are swept lazily: on every order read, on `getProduct`/`validateCart` (throttled to once per 30 s), and by `GET /api/cron/expire`.

---

## Actions (`"use server"`)

### `@/lib/actions/storefront`
| Action | Returns |
|---|---|
| `validateCartAction(items: {sku, qty, isPreorder?}[])` | `ValidatedCart`. An invalid payload returns an empty cart. Pass `isPreorder` (what the client currently shows) to get `NOW_PREORDER` notices. |
| `requestBackInStockAction({sku, wa, locale})` | `{ok:true, alreadyRequested}` · `{ok:false, error:"INVALID_WA"\|"NOT_FOUND"\|"INVALID_INPUT"}` |

### `@/lib/actions/checkout`
| Action | Returns |
|---|---|
| `getShippingRatesAction({province, city, postalCode?}, items)` | `ShippingQuoteResult`: `{ok:true, zone, rates: ShippingRate[], weightGrams, billableKg, itemValueIdr}` · `{ok:false, error:"OUTSIDE_JAVA"\|"UNKNOWN_CITY"\|"EMPTY_CART"\|"INVALID_INPUT"}`. Rates come sorted Instan → Express → Reguler, cheapest first in each group. Instant rates appear only for Z1, before the cutoff in WIB, and within `max_kg`. |
| `applyVoucherAction(code, items)` | `{ok:true, code, type, value, discountIdr}` · `{ok:false, error:"NOT_FOUND"\|"INACTIVE"\|"EXPIRED"\|"MIN_SUBTOTAL"\|"INVALID_INPUT", minSubtotalIdr?}`. The subtotal is recomputed from `items`. |
| `createOrderAction(payload: CreateOrderInput)` | `CreateOrderResult` (contracts) or `{ok:false, error:"RATE_LIMITED"}` (10 per minute per IP). On `ok`, navigate to `payUrl` (`/<locale>/pay/<orderNo>`). |
| `changePaymentMethodAction(orderNo, method, channel?)` | `{ok:true, payment}` (same shape as `OrderPublicView.payment`) · `{ok:false, error:"NOT_FOUND"\|"NOT_PENDING"\|"INVALID_INPUT"}` |
| `sendPaymentInstructionsAction(orderNo)` | `{ok:true}` · `{ok:false, error:"NOT_FOUND"\|"NOT_PENDING"\|"RATE_LIMITED"}`. Sends even when the buyer did not opt in, because they asked for it. |
| `getOrderStatusAction(orderNo)` | `{orderNo, status, payment} \| null`. Use for the 5 s poll. |
| `trackOrderAction(orderNo, waLast4)` | `OrderPublicView \| null \| {error:"RATE_LIMITED"}`. `null` is the generic not-found, also returned for a wrong WA. |
| `resolveCheckoutLinkAction(token)` | `{ok:true, token, cart: ValidatedCart, prefill:{name, wa}, expiresAt}` · `{ok:false, error:"LINK_EXPIRED"}` (unknown, used or expired) |
| `completeMockPaymentAction(orderNo, {cardNumber?})` | For the mock pay page steps: e-wallet "confirm" (no `cardNumber`) and card 3DS (`cardNumber`). `4000 0000 0000 0002` gives a FAILED payment; any other number gives PAID. Uses the same signed webhook path. Returns `WebhookOutcome`, or `{ok:false, error:"NOT_MOCK"\|"NOT_FOUND"\|"NO_PENDING_PAYMENT"\|"INVALID_INPUT"}`. |

`CreateOrderInput` notes:
- `contact.wa` accepts any common format (`0812-…`, `62…`, `+62 …`) and is normalised to E.164.
- `address.zone` is never sent by the client; the server derives it.
- With `checkoutLinkToken`, the link's items are used and `items` is ignored. The link is marked used inside the order transaction.
- An item whose variant has available = 0 and pre-order enabled becomes `isPreorder` with no reservation (max qty 5). Anything else that is short goes into `OUT_OF_STOCK.skus`, and no order is created.
- `INVALID_INPUT.message` is `"<path>: <code>"`, for example `contact.wa: INVALID_WA` or `items: UNKNOWN_SKU X,Y`.
- `INVALID_SHIPPING.message` is `SERVICE_UNAVAILABLE` (the code is not offered right now, e.g. instant after the cutoff).

### `@/lib/actions/admin`
Every action calls `requireAdmin()` first.

| Action | Returns |
|---|---|
| `loginAction(prevState, formData{email,password,next?})` | Built for `useActionState`. Redirects on success; otherwise returns `{ok:false, error:"INVALID_CREDENTIALS"\|"RATE_LIMITED"}`. |
| `logoutAction()` | Redirects to `/admin/login` |
| `adjustStockAction(sku, newOnHand)` | `AdjustStockResult`: `{ok:true, variant: VariantAdminView, delta, notified}` · `{ok:false, error:"NOT_FOUND"\|"INVALID_QTY"\|"BELOW_RESERVED"\|"INVALID_INPUT", reserved?}` |
| `setPreorderAction({target:{sku}\|{productId}, enabled, lead?})` | `{ok:true, updated}` · `{ok:false, error:"NOT_FOUND"\|"INVALID_LEAD"\|"INVALID_INPUT"}` |
| `transitionOrderAction({orderNo, to, courier?, awb?})` | `{ok:true, orderNo, status}` · `{ok:false, error:"NOT_FOUND"\|"INVALID_TRANSITION"\|"TRACKING_REQUIRED"\|"INVALID_INPUT"}` |
| `createCheckoutLinkAction({items, customerName?, customerWa?, locale?})` | `{ok:true, token, url, expiresAt, waLink}` · `{ok:false, error:"INVALID_INPUT"\|"UNKNOWN_SKU"\|"INVALID_WA", skus?}`. `waLink` is a wa.me link to the customer with the message pre-filled; it is null when no WA was given. |
| `getProductAdminAction(productId)` | `ProductAdminDetail \| null` |

---

## Services (`@/lib/services`, server-only; also re-exported from `@/lib/services/index.ts`)

**Catalog** (`catalog.ts`)
- `getCatalog(filters: CatalogFilters): Promise<CatalogResult>`. Defaults: page size 24, sort `newest` (catalog file order).
  - `q` matches name, model code or discipline, case- and accent-insensitive: `"sd16"` and `"bliss"` both work.
  - Variant filters (`sizes`, `widths`, `colors`, `availability`) must all be satisfied by the same variant.
  - `availability: READY` covers READY and LOW variants.
  - Facets are disjunctive: each facet's counts ignore that facet's own filter.
  - Size values are the raw data strings (e.g. `"7.5L (adult)"`, `"8.0s (toddler)"`), sorted toddler → child → adult → apparel.
- `getProduct(slug): Promise<ProductDetail | null>`. Variants are in catalog order, each with `available` and the derived `status`.
- `getRelated(slug, n = 3): Promise<ProductSummary[]>`. Same discipline first, then the same price group.
- `getCollections(limit = 8): Promise<{readyStock, kids, disciplineCounts: Facet[], disciplineImages, heroImage}>` (photos for the home hero and discipline tiles; empty/null without product photos)
- `toVariantView(row)` and `compareSizes(a, b)` are helpers.

**Cart / shipping / voucher**
- `validateCart(items: {sku, qty, isPreorder?}[]): Promise<ValidatedCart>`. It merges duplicate SKUs, clamps qty to `available` (or 5 for pre-order), and removes SOLD_OUT and unknown SKUs, emitting a notice for each change. `weightGrams` excludes packaging.
- `getShippingRates(address: {province, city, postalCode?}, items, now?): Promise<ShippingQuoteResult>`
- `lookupZone(province, city)` → `{ok:true, zone}` · `{ok:false, error:"OUTSIDE_JAVA"|"UNKNOWN_CITY"}`
- `applyVoucher(code, subtotalIdr, now?): Promise<VoucherResult>`. `computeDiscount(type, value, subtotal)` is pure.

**Orders, buyer side** (`order.ts`)
- `createOrder(input: CreateOrderInput | unknown, {now?}): Promise<CreateOrderResult>`. Follows docs/05 §4:
  - Zod validation, then the zone, link, re-pricing, voucher and shipping re-quote.
  - One transaction holds the atomic conditional `UPDATE … reserved = reserved + qty WHERE on_hand - reserved >= qty`, plus the order, items, reservations and the link marked used.
  - After commit it creates the payment, then sends `ORDER_CREATED` if the buyer opted in.
  - Reservations expire at payment expiry + 5 min.
- `getOrderPublic(orderNo, waLast4): Promise<OrderPublicView | null>`
- `getOrderForPayPage(orderNo): Promise<OrderPublicView | null>`. For the pay and success pages; needs no WA digits. `payment` is the latest payment.
- `getOrderStatus(orderNo): Promise<{orderNo, status, payment} | null>`
- `changePaymentMethod(orderNo, method, channel?)`. Cancels the PENDING payment, creates a new one, keeps the reservations and extends their expiry.
- `sendPaymentInstructions(orderNo)`
- `generateOrderNo(now?)` → `RDS-YYMMDD-XXXX`. The date is in WIB; the suffix is Crockford base32.

**Payments** (`payment.ts`)
- `handlePaymentWebhook(req: Request): Promise<WebhookOutcome>`. Verifies through the provider, then processes.
- `processPaymentEvent(provider, PaymentWebhookResult, now?)`. Idempotent on `payment_events.event_id`. What each status does:
  - **PAID**: consumes the reservations (`on_hand -= qty`, `reserved -= qty`, `stock_movements` reason `order_paid`). The order becomes PAID, other pending payments are cancelled, and `PAYMENT_PAID` is sent.
  - **EXPIRED**: applies only when this is the current payment. It releases the reservations, the order becomes EXPIRED, and `PAYMENT_EXPIRED` is sent.
  - **FAILED**: the payment becomes FAILED and the order stays pending, so the buyer can change method.
  - A PAID event for an order that is no longer pending is recorded with `ignored: "ORDER_NOT_PENDING"`; stock is left untouched.
- `WebhookOutcome` = `{ok:true, duplicate, orderNo?, orderStatus?, ignored?: "ALREADY_PROCESSED"|"ORDER_NOT_PENDING"|"NOT_CURRENT_PAYMENT"}` · `{ok:false, error:"INVALID_SIGNATURE"|"UNKNOWN_PAYMENT"}`
- `simulatePayment(orderNo, "PAID"|"EXPIRED"|"FAILED")` and `simulateCardPayment(orderNo, cardNumber)`. Mock provider only. They build a signed webhook and send it through the same path.

**Expiry** (`expiry.ts`)
- `expireOrders(now = new Date(), {orderNo?}): Promise<{expired: string[]}>`. Expires PENDING_PAYMENT orders whose `expires_at + 5 min < now`.
- `maybeSweepExpiredOrders()` is the throttled global sweep.

**Orders, admin side** (`order-admin.ts`)
- `listOrders({status?: OrderStatus|OrderStatus[], q?, page?, pageSize? = 25})` → `{items: OrderAdminRow[], total, page, pageSize}`
- `getOrderAdmin(orderNo): Promise<OrderAdminView | null>`. Contains the public view plus: full `customerWa`, email, `waOptIn`, `voucherCode`, `fromCheckoutLink`, `items[].sku`, `payments[]`, `reservations[]`, `messages[]` (WA outbox) and `allowedTransitions`.
- `transitionOrder(orderNo, to, {courier?, awb?, actor?})`. The allowed moves:
  - `PAID→PROCESSING`
  - `PROCESSING→SHIPPED`: needs `courier` and `awb`; sends `ORDER_SHIPPED`.
  - `SHIPPED→DELIVERED`: sends `ORDER_DELIVERED`.
  - `PENDING→CANCELLED`: releases the reservations and cancels the payment.
  - `PAID|PROCESSING→REFUND_PENDING`: puts the stock back with movement `order_cancel` and triggers back-in-stock messages.
  - `REFUND_PENDING→CANCELLED`
  - PAID and EXPIRED are system-only and return `INVALID_TRANSITION`.
- `adminTransitionsFor(status)` lists the buttons to show for a status.
- `getDashboardStats()` → `{ordersToday, revenueTodayIdr, pendingPayment, toShip, shipped, lowStockVariants, soldOutVariants, pendingBackInStock, recentOrders}`. "Today" is the current WIB day.

**Stock** (`stock.ts`)
- `adjustStock(sku, newOnHand, actor, reason = "admin_adjust")`. Rejects values below `reserved`, writes a movement, and when available goes from 0 to more than 0 it sends `BACK_IN_STOCK` to pending requests (each request is notified once).
- `setPreorder({sku}|{productId}, enabled, lead = "4-6")`
- `requestBackInStock(sku, wa, locale)`. De-duplicated per (sku, wa) while the request is pending.
- `listBackInStock({pendingOnly?})`, `listLowStock({threshold?, limit?})`, `listProductsAdmin()`, `getProductAdmin(id)`, `listStockMovements({skus?, limit?})`

**Checkout links** (`checkout-link.ts`)
- `createCheckoutLink({items, customerName?, customerWa?, locale?}, actor)`. The token is 24 url-safe characters, valid for 48 h, single use. The URL is `${SITE}/<locale>/checkout?link=<token>`.
- `resolveCheckoutLink(token)`, `listCheckoutLinks(limit?)` → rows with `status: "ACTIVE"|"USED"|"EXPIRED"` and `usedOrderNo`

**Outbox** (`outbox.ts`)
- `listOutbox({template?, orderNo?, to?, page?, pageSize? = 50})` → `{items: {id, toWa, template, locale, body, orderNo, status, createdAt}[], total, page, pageSize}`

**Pure helpers**
- `schemas.ts` holds the Zod schemas: `createOrderInputSchema`, `contactSchema`, `phoneSchema`, `paymentMethodSchema` (QRIS|EWALLET|VA|CARD only), `orderNoSchema`, and others. These can be reused in React Hook Form.
- `labels.ts`: `variantLabel(v)` → `"Ballet Pink · 7.5 · M"`; `paymentMethodLabel(method, channel, locale)`; `channelName(channel)`.

---

## Auth (`@/lib/auth/session`, server-only)
- `verifyCredentials(email, password): Promise<AdminSession | null>`
- `createAdminSession(session)`. Sets the httpOnly cookie `rds_admin`: a jose HS256 JWT with `AUTH_SECRET`, valid 12 h. Call it only from an action or route handler.
- `getAdminSession(): Promise<AdminSession | null>`
- `requireAdmin(): Promise<AdminSession>`. Redirects to `/admin/login`. Do not wrap it in try/catch.
- `destroyAdminSession()`
- `signAdminToken` and `verifyAdminToken` are the pure JWT helpers.
- The demo admin comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env.local`, or `ADMIN_PASSWORD_HASH`.

## WhatsApp (`@/lib/wa`, client-safe)
- `buildWaLink(context, vars, locale)` builds `https://wa.me/<NEXT_PUBLIC_WA_NUMBER>?text=…`. `vars` depends on the context:
  - `pdp`: `{name, modelCode, variant?, url?}`
  - `sizeGuide`: `{name, modelCode}`
  - `cart`: `{lines: {name, variant?, qty}[]}`
  - `outsideJava`: `{province?}`
  - `order`: `{orderNo}`
  - `soldOut`: `{name, variant?}`
  - `general`: `undefined`
- `buildWaText(...)` returns the same text without the URL.
- `buildWaLinkTo(customerE164, text)` is for admin → buyer.
- `NOTIFICATION_TEMPLATES` holds the store → buyer templates (id/en), rendered with `renderNotification(template, locale, vars)`.

## Providers (`@/lib/providers`, server-only)
- `getPaymentProvider()`, `getShippingProvider()` and `getMessagingProvider()` read `PAYMENT_PROVIDER=mock|xendit`, `SHIPPING_PROVIDER=mock|biteship` and `MESSAGING_PROVIDER=outbox|waba`. The xendit, biteship and waba providers are stubs that throw "not configured".
- `MockPaymentProvider`:
  - QRIS `qrString = "MOCKQRIS|<orderNo>|<amount>"`.
  - VA number = bank prefix + 10 digits. Prefixes: BCA 39108, Mandiri 88908, BNI 8808, BRI 26215, Permata 8215.
  - E-wallet and card `redirectUrl` = `${SITE}/<locale>/pay/<orderNo>?step=ewallet|3ds`.
  - Expiry: QRIS 30 min, e-wallet 15 min, VA 24 h, card 15 min.
  - Webhooks are signed with HMAC-SHA256 (hex) of the raw body using `WEBHOOK_SECRET`, sent in header `x-mock-signature`. `buildMockWebhookRequest(body)` and `signMockPayload(raw)` produce them.
- `MockShippingProvider` reads `data/shipping/mock-rates.json`. Helpers: `billableKg(grams)` (adds the 150 g packaging, min 1) and `insuranceFor(value)`.
- `OutboxMessagingProvider` inserts into `wa_outbox`.

## Data (`@/lib/data`)
- `areas.ts` (client-safe): `JAVA_PROVINCES`, `JAVA_AREAS`, `getCities(province)`, `resolveZone(province, city)`, `isJavaProvince`, `ORIGIN`
- `rates.ts`: `MOCK_RATES`
- `catalog.ts`: `loadRawCatalog()`, used by the seed only.

## Routes
| Route | Notes |
|---|---|
| `POST /api/webhooks/payment` | Responses: 200 `WebhookOutcome` · 401 bad signature · 404 unknown payment |
| `POST /api/demo/simulate-payment` | Only when `DEMO_MODE=true` (otherwise 404). Body `{orderNo, outcome:"PAID"\|"EXPIRED"\|"FAILED"}`. Responses: 200 · 400 · 404 · 409 (no pending payment) |
| `GET /api/cron/expire` | Needs `Authorization: Bearer $CRON_SECRET`; any caller is allowed when `DEMO_MODE=true`. Returns `{ok, expired: orderNo[]}` |

## DB scripts
- `pnpm db:reset`: drops and recreates the schema, then runs push and seed. Refuses to run on a non-local host unless `ALLOW_DB_RESET=true`.
- `pnpm db:seed`: truncates all tables, then seeds. It is idempotent. The seed contains:
  - 40 products and 2,903 variants
  - 1 admin
  - voucher `RELEVE10`
  - 12 orders covering every status
  - 3 back-in-stock requests (Roy BL104 ×2, Elsie SL248)
- Tests use the `releve_test` DB (`tests/unit/services/helpers`). DB test files are serialised with a Postgres advisory lock.
