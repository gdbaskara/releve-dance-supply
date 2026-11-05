# 10 — Decision log & open questions

## Decisions (locked)

| # | Date | Decision | Reason / source |
|---|---|---|---|
| D-01 | 5 Nov 2026 | Products: Só Dança dance shoes & dancewear (not ice skating) | Owner confirmation |
| D-02 | 5 Nov 2026 | **Unofficial** reseller → no official/authorized claims, own logo & name | Owner confirmation |
| D-03 | 5 Nov 2026 | Visual tone similar to Só Dança (the feel, not a copy) | Client request |
| D-04 | 5 Nov 2026 | Working name: **Relevé Dance Supply** | Temporary |
| D-05 | 5 Nov 2026 | Bilingual ID (default) + EN; dance terms not translated | Owner confirmation |
| D-06 | 5 Nov 2026 | **No COD** ever; digital only; installments/paylater postponed | Owner: upper-middle segment |
| D-07 | 5 Nov 2026 | Payment gateway: **Xendit** (demo: mock) | All methods in 1 API, payment links for WA |
| D-08 | 5 Nov 2026 | Shipping within Java, warehouse in **Jakarta**, instant in Jabodetabek | Owner confirmation |
| D-09 | 5 Nov 2026 | 1 WA business number; WA-first; email optional | Owner confirmation |
| D-10 | 5 Nov 2026 | Returns/size exchanges: **postponed**, handled via WA for now | Owner |
| D-11 | 5 Nov 2026 | B2B (studios/sanggar): not in the demo | Owner undecided |
| D-12 | 5 Nov 2026 | Demo catalog of 40 models (30 shoes/tights + 10 dancewear), dummy stock per variant | Owner asked for ≥ 30, dancewear included |
| D-13 | 5 Nov 2026 | Price = official import landed cost × multiplier (pointe 1.45 / shoes 1.65 / dancewear & tights 1.8), planning exchange rate Rp18.500 | `06-pricing.md` |
| D-14 | 5 Nov 2026 | Tech stack `04-tech-stack.md` | Locked |
| D-15 | 5 Nov 2026 | Light mode only in v1 | Simple, matches the reference |
| D-16 | 5 Nov 2026 | Guest checkout, single admin | Demo |
| D-17 | 5 Nov 2026 | Mixed ready + pre-order cart ships all at once (v1) | Simple; split shipments later |
| D-18 | 5 Nov 2026 | Next.js 16.4: `cacheComponents`/`partialPrefetching` **disabled**; all pages dynamic | Stock must always be fresh; simpler for the demo |
| D-19 | 5 Nov 2026 | Admin auth: **signed session cookie (jose) + bcryptjs**, not Auth.js | 1 admin, fewer dependencies on Next 16 |
| D-20 | 5 Nov 2026 | Local dev/demo: PostgreSQL 16 in a container; `drizzle-kit push` for the schema (migration files when moving to production) | Docker not required |
| D-21 | 5 Nov 2026 | Next 16: `middleware` → `src/proxy.ts`; separate root layouts for `[locale]` and `admin` | Next 16 convention |
| D-22 | 5 Nov 2026 | Order expiry = payment `expires_at` + 5 min grace (same as the reservation); an EXPIRED webhook expires immediately if that payment is the latest one | `05` §4; a PAID webhook within the grace period is still accepted |
| D-23 | 5 Nov 2026 | Admin cannot trigger PAID/EXPIRED manually (webhook/expiry only). Cancelling from PAID/PROCESSING → REFUND_PENDING returns the stock (movement `order_cancel`) | Goods have not left the warehouse; manual refunds in v1 |
| D-24 | 5 Nov 2026 | FAILED webhook (test card 4000…0002) → payment FAILED, order stays PENDING so the buyer can switch methods | PAY-05/PAY-10 |
| D-25 | 5 Nov 2026 | Items for variants with available=0 & pre-order enabled automatically become pre-orders at createOrder (max 5); variants with insufficient partial stock → OUT_OF_STOCK | `05` §4 step 3 |
| D-26 | 5 Nov 2026 | WA templates (links & notifications) live in code `src/lib/wa` (client-safe), not in `messages/*/wa.json` | Used by the server (outbox) & client (wa.me) without next-intl |
| D-27 | 5 Nov 2026 | Showcase page /[locale]/design-system replaces Storybook for the demo | WS-1; no Storybook dependency, shown in the same app (ID/EN) |
| D-28 | 5 Nov 2026 | Vercel Cron `/api/cron/expire` **daily** (`0 20 * * *` = 03:00 WIB) in `vercel.json`; on the Pro plan `*/5 * * * *` is allowed, not every minute | Hobby only allows daily crons; orders are also expired lazily on read & in getProduct/validateCart (`12-deploy.md` §7) |
| D-29 | 5 Nov 2026 | Vercel functions in region `sin1`, Neon in `ap-southeast-1`; the app uses the **pooled** Neon connection string without `channel_binding` | Low DB latency from Indonesia; postgres.js passes through unrecognized URL parameters |
| D-30 | 5 Nov 2026 | `docker-compose.yml` (postgres:16 + DB `releve_test`) provided for local setup; `.env.example` whitelisted in `.gitignore`, `*.bundle` ignored | Handover from scratch (`14-backup-and-handover.md`); D-20 still holds: Docker optional |

## Open (not blocking the demo)

| # | Question | Interim default | Impact |
|---|---|---|---|
| Q-01 | Can the client get **wholesale pricing** (±50% MSRP) from Só Dança? | Assumed yes | Without it, prices are ±2× higher than the market (`06` §6) |
| Q-02 | **Pointe** strategy (Rp3 jt vs local Bloch Rp1,1–1,6 jt) | Multiplier 1.45, displayed normally | Could become niche/pre-order, or margin drops |
| Q-03 | Final name & logo | Relevé Dance Supply | Replace wordmark & copy |
| Q-04 | Demo WA number | `NEXT_PUBLIC_WA_NUMBER` placeholder | — |
| Q-05 | Jakarta warehouse address (for instant couriers & footer) | Kota Jakarta Selatan | Instant rates |
| Q-06 | Official cm size table per category | Copied from the Só Dança size chart (image) during build — needs manual checking | Size guide accuracy |
| Q-07 | Verify HS code, import duty, lartas (import restrictions), PPh 22 (import income-tax prepayment) with a PPJK (customs broker) | Assumptions in `06` §2 | Live prices |
| Q-08 | Return/size exchange policy | Via WA, case by case | FAQ/terms page |
| Q-09 | Own product photos | Placeholder | Required before going live |
