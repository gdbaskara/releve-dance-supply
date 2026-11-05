# 09 — Rencana kerja (siap single- atau multi-agent)

Prinsip: **kontrak dulu, lalu paralel.** WS-0 menulis fondasi + kontrak; setelah itu WS-1…WS-5 bisa dikerjakan agent berbeda karena tiap workstream punya folder sendiri. WS-6 menutup.

## Graf dependency

```
WS-0 Fondasi & kontrak
 ├─▶ WS-1 Design system + Storybook ──┐
 ├─▶ WS-2 Data, DB & services ────────┼─▶ WS-3 Storefront ─┐
 │                                    ├─▶ WS-4 Checkout & bayar ─┼─▶ WS-6 QA, E2E, deploy demo
 │                                    └─▶ WS-5 Admin ───────┘
```
WS-3/4/5 boleh mulai dengan komponen primitive minimal + data mock dari kontrak, lalu ganti ke komponen WS-1 & service WS-2 begitu siap.

## Workstream

### WS-0 — Fondasi & kontrak (1 agent, harus selesai dulu)
**Folder:** root config, `src/lib/contracts`, `src/lib/format`, `src/styles`, `messages/` (kerangka), `src/db/schema.ts`
- Init Next.js + TS strict + pnpm + Tailwind v4 + ESLint/Prettier + Vitest + Playwright + Storybook.
- `globals.css` mengimpor `design-system/tokens.css` + `@theme` mapping; aturan lint larang warna non-token.
- next-intl (id default, en), middleware locale, `messages/id.json` & `en.json` dengan namespace kosong + test kesamaan key.
- `src/lib/contracts/*` persis seperti `05` §5 + tipe domain (Product, Variant, StockStatus, Order, OrderStatus, …).
- `formatIDR`, `formatPhoneID`, `normalizePhoneID`, `formatDateWIB` + unit test.
- Drizzle schema (`05` §1) + migrasi + docker-compose Postgres.
- CI GitHub Actions.
- **DoD:** `pnpm dev`, `pnpm test`, `pnpm storybook`, `pnpm build` jalan; kontrak ter-review.

### WS-1 — Design system (FR: semua UI; spesifikasi `07`)
**Folder:** `src/components/ui`, `src/components/store` (presentational), `src/components/checkout` (presentational), `stories/`, `public/brand`, `public/icons`
- Foundations stories (warna + kontras, tipografi, spasi, radius, ikon).
- Primitive §7.1, komponen toko §7.2, komponen checkout §7.3 — **presentational** (props in, events out; tanpa fetch).
- Wordmark SVG, placeholder produk SVG, ikon WA & logo pembayaran/kurir (grayscale + warna).
- **DoD:** §10 `07-design-system.md` terpenuhi; 0 a11y violation; screenshot story mobile & desktop.

### WS-2 — Data, DB & services (FR: STK, PAY-01/08, SHP-01/02, WA-04, ORD-01, CHK-07/10)
**Folder:** `src/db`, `src/lib/services`, `src/lib/providers`, `src/lib/wa`, `src/app/api`
- Seed dari `data/catalog/products.json`, `data/shipping/*`; seed admin, 12 order contoh, voucher `RELEVE10`, 3 back-in-stock.
- Services: catalog (filter/facets/search), stock (reserve/consume/release/adjust), order (create/transition/expire), checkout-link, back-in-stock, voucher.
- Providers: `MockPaymentProvider`, `MockShippingProvider`, `OutboxMessagingProvider` + factory dari env; stub `XenditProvider`/`BiteshipProvider` (throw "not configured").
- Webhook payment idempoten, `/api/demo/simulate-payment`, `/api/cron/expire`.
- Template WA (`05` §6) id/en + builder `wa.me`.
- **DoD:** unit test service ≥ 80% line coverage; test konkurensi STK-05 lulus; webhook ganda aman.

### WS-3 — Storefront (FR: CAT, PDP, CART, WA-02/03, I18N)
**Folder:** `src/app/[locale]/(store)`, `src/app/[locale]/info`, `src/app/[locale]/size-guide`, container components di `src/components/store/containers`
- Header/Footer/mega menu, Home, Listing + filter, Search, PDP + VariantPicker + SizeGuide, Cart (Zustand persist) + drawer, info pages, SEO (metadata, hreflang, JSON-LD, sitemap).
- **DoD:** AC CAT/PDP/CART lulus; Lighthouse mobile ≥ 85 di listing & PDP.

### WS-4 — Checkout, bayar, lacak (FR: CHK, PAY, ORD)
**Folder:** `src/app/[locale]/checkout`, `pay`, `success`, `track`, container di `src/components/checkout/containers`
- Checkout 3 step, server actions (`createOrder`, `getShippingRates`, `applyVoucher`), halaman bayar 4 metode, polling, ganti metode, sukses, lacak.
- **DoD:** skenario D1, D2(bagian pembeli), D4, D5, D6 lulus manual + E2E.

### WS-5 — Admin (FR: ADM)
**Folder:** `src/app/admin`, `src/components/admin`
- Auth.js credentials, dashboard, produk & stok grid, order + transisi + resi, checkout link builder, outbox, back-in-stock.
- **DoD:** D2(bagian admin), D3, D7 lulus.

### WS-6 — QA, E2E, deploy demo
**Folder:** `tests/e2e`, `docs/` (update), konfigurasi Vercel
- Playwright D1–D9 (mobile viewport 390×844 + desktop), a11y check (axe) di halaman utama, grep forbidden strings (`design-system/glossary.json`).
- Deploy app + Storybook + Neon; seed; README cara demo; checklist presentasi untuk klien.
- **DoD:** semua E2E hijau di CI; URL demo + Storybook bisa dibuka klien.

## Aturan koordinasi multi-agent
1. Satu agent = satu workstream = satu branch `ws-<n>/…`. Jangan mengedit folder workstream lain; butuh perubahan di sana → buat catatan di PR / issue.
2. Perubahan **kontrak** (`src/lib/contracts`, `src/db/schema.ts`, `messages/*` key baru di namespace milik orang lain, `design-system/*`) hanya lewat PR kecil terpisah yang disetujui owner WS-0.
3. Key i18n per namespace: `common`, `nav`, `catalog`, `pdp`, `cart`, `checkout`, `pay`, `order`, `admin`, `wa`. Owner: WS-1 (`common`), WS-3 (`nav`, `catalog`, `pdp`, `cart`), WS-4 (`checkout`, `pay`, `order`), WS-5 (`admin`), WS-2 (`wa`).
4. Rebase ke `main` setiap hari kerja agent; PR kecil (< 500 baris bila bisa).
5. Setiap PR mencantumkan ID FR yang diselesaikan dan screenshot mobile untuk UI.

## Milestone

| M | Isi | Selesai jika |
|---|---|---|
| M0 | WS-0 | Fondasi + kontrak merged |
| M1 | WS-1 foundations + primitive; WS-2 seed + catalog service | Storybook foundations live; katalog terbaca dari DB |
| M2 | WS-3 listing & PDP; WS-2 stock/order; WS-1 komponen toko | Bisa browse & add to cart |
| M3 | WS-4 checkout & bayar; WS-5 admin inti | D1, D6 lulus |
| M4 | Sisa FR M + WS-6 | D1–D9 lulus, demo ter-deploy |

## Definition of Done (global)
- Semua FR prioritas **M** lulus AC; NFR-01…09 dicek.
- Tidak ada string terlarang (glosarium) dan tidak ada opsi COD di mana pun.
- ID & EN lengkap; format Rp & WIB konsisten.
- Lint, typecheck, unit, E2E hijau.
