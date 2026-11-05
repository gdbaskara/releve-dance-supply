# 09 — Work plan (ready for single- or multi-agent execution)

Principle: **contracts first, then parallel.** WS-0 writes the foundations + contracts; after that WS-1…WS-5 can be worked on by different agents because each workstream owns its own folders. WS-6 closes out.

## Dependency graph

```
WS-0 Foundations & contracts
 ├─▶ WS-1 Design system + Storybook ──┐
 ├─▶ WS-2 Data, DB & services ────────┼─▶ WS-3 Storefront ─┐
 │                                    ├─▶ WS-4 Checkout & payment ─┼─▶ WS-6 QA, E2E, demo deploy
 │                                    └─▶ WS-5 Admin ───────┘
```
WS-3/4/5 may start with minimal primitive components + mock data from the contracts, then switch to WS-1 components & WS-2 services as soon as they are ready.

## Workstreams

### WS-0 — Foundations & contracts (1 agent, must finish first)
**Folders:** root config, `src/lib/contracts`, `src/lib/format`, `src/styles`, `messages/` (skeleton), `src/db/schema.ts`
- Init Next.js + TS strict + pnpm + Tailwind v4 + ESLint/Prettier + Vitest + Playwright + Storybook.
- `globals.css` imports `design-system/tokens.css` + `@theme` mapping; lint rule forbidding non-token colors.
- next-intl (id default, en), locale middleware, `messages/id.json` & `en.json` with empty namespaces + a key-parity test.
- `src/lib/contracts/*` exactly as in `05` §5 + domain types (Product, Variant, StockStatus, Order, OrderStatus, …).
- `formatIDR`, `formatPhoneID`, `normalizePhoneID`, `formatDateWIB` + unit tests.
- Drizzle schema (`05` §1) + migrations + docker-compose Postgres.
- GitHub Actions CI.
- **DoD:** `pnpm dev`, `pnpm test`, `pnpm storybook`, `pnpm build` all run; contracts reviewed.

### WS-1 — Design system (FR: all UI; spec in `07`)
**Folders:** `src/components/ui`, `src/components/store` (presentational), `src/components/checkout` (presentational), `stories/`, `public/brand`, `public/icons`
- Foundations stories (colors + contrast, typography, spacing, radius, icons).
- Primitives §7.1, store components §7.2, checkout components §7.3 — **presentational** (props in, events out; no fetching).
- Wordmark SVG, product placeholder SVG, WA icon & payment/courier logos (grayscale + color).
- **DoD:** §10 of `07-design-system.md` met; 0 a11y violations; mobile & desktop story screenshots.

### WS-2 — Data, DB & services (FR: STK, PAY-01/08, SHP-01/02, WA-04, ORD-01, CHK-07/10)
**Folders:** `src/db`, `src/lib/services`, `src/lib/providers`, `src/lib/wa`, `src/app/api`
- Seed from `data/catalog/products.json`, `data/shipping/*`; seed admin, 12 sample orders, voucher `RELEVE10`, 3 back-in-stock requests.
- Services: catalog (filter/facets/search), stock (reserve/consume/release/adjust), order (create/transition/expire), checkout-link, back-in-stock, voucher.
- Providers: `MockPaymentProvider`, `MockShippingProvider`, `OutboxMessagingProvider` + factory from env; stub `XenditProvider`/`BiteshipProvider` (throw "not configured").
- Idempotent payment webhook, `/api/demo/simulate-payment`, `/api/cron/expire`.
- WA templates (`05` §6) id/en + `wa.me` builder.
- **DoD:** service unit tests ≥ 80% line coverage; STK-05 concurrency test passes; duplicate webhooks are safe.

### WS-3 — Storefront (FR: CAT, PDP, CART, WA-02/03, I18N)
**Folders:** `src/app/[locale]/(store)`, `src/app/[locale]/info`, `src/app/[locale]/size-guide`, container components in `src/components/store/containers`
- Header/Footer/mega menu, Home, Listing + filters, Search, PDP + VariantPicker + SizeGuide, Cart (Zustand persist) + drawer, info pages, SEO (metadata, hreflang, JSON-LD, sitemap).
- **DoD:** CAT/PDP/CART ACs pass; Lighthouse mobile ≥ 85 on listing & PDP.

### WS-4 — Checkout, payment, tracking (FR: CHK, PAY, ORD)
**Folders:** `src/app/[locale]/checkout`, `pay`, `success`, `track`, containers in `src/components/checkout/containers`
- 3-step checkout, server actions (`createOrder`, `getShippingRates`, `applyVoucher`), payment page for 4 methods, polling, change method, success, tracking.
- **DoD:** scenarios D1, D2 (shopper part), D4, D5, D6 pass manually + E2E.

### WS-5 — Admin (FR: ADM)
**Folders:** `src/app/admin`, `src/components/admin`
- Auth.js credentials, dashboard, products & stock grid, orders + transitions + tracking numbers, checkout link builder, outbox, back-in-stock.
- **DoD:** D2 (admin part), D3, D7 pass.

### WS-6 — QA, E2E, demo deploy
**Folders:** `tests/e2e`, `docs/` (updates), Vercel configuration
- Playwright D1–D9 (mobile viewport 390×844 + desktop), a11y check (axe) on the main pages, grep for forbidden strings (`design-system/glossary.json`).
- Deploy app + Storybook + Neon; seed; README on how to run the demo; presentation checklist for the client.
- **DoD:** all E2E green in CI; demo URL + Storybook can be opened by the client.

## Multi-agent coordination rules
1. One agent = one workstream = one branch `ws-<n>/…`. Do not edit other workstreams' folders; if you need a change there → leave a note in the PR / an issue.
2. **Contract** changes (`src/lib/contracts`, `src/db/schema.ts`, new `messages/*` keys in a namespace owned by someone else, `design-system/*`) only via a small separate PR approved by the WS-0 owner.
3. i18n text is split per file `messages/{id,en}/<namespace>.json`. Namespaces: `common`, `nav`, `catalog`, `pdp`, `cart`, `checkout`, `pay`, `order`, `admin`, `wa`. Owners: WS-1 (`common`, `designSystem`), WS-3 (`nav`, `catalog`, `pdp`, `cart`), WS-4 (`checkout`, `pay`, `order`), WS-2 (`wa`), WS-3 also `info`. Admin = Indonesian written directly in the code (no i18n).
4. Rebase onto `main` every agent working day; small PRs (< 500 lines where possible).
5. Every PR lists the FR IDs it completes and mobile screenshots for UI.

## Milestones

| M | Scope | Done when |
|---|---|---|
| M0 | WS-0 | Foundations + contracts merged |
| M1 | WS-1 foundations + primitives; WS-2 seed + catalog service | Storybook foundations live; catalog read from the DB |
| M2 | WS-3 listing & PDP; WS-2 stock/order; WS-1 store components | Can browse & add to cart |
| M3 | WS-4 checkout & payment; WS-5 core admin | D1, D6 pass |
| M4 | Remaining M FRs + WS-6 | D1–D9 pass, demo deployed |

## Definition of Done (global)
- All priority **M** FRs pass their ACs; NFR-01…09 checked.
- No forbidden strings (glossary) and no COD option anywhere.
- ID & EN complete; Rp & WIB formatting consistent.
- Lint, typecheck, unit, E2E green.
