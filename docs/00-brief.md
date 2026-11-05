# 00 — Brief (read this first)

**Project:** Online store for **Relevé Dance Supply** (working name) — an **unofficial** reseller of **Só Dança** products (dance shoes & dancewear) in Indonesia.
**Phase:** **Client demo.** Functional end to end, but payments, shipping costs, and WhatsApp are **simulated** (ready to be connected to the real services).
**Document status:** v1.0 — 5 Nov 2026. Requirements are locked except those listed in `10-decisions.md` → "Open".

## In one sentence
A premium dance store that feels like Só Dança (clean, monochrome, large photos, catalog by discipline), but shops the Indonesian way: Bahasa Indonesia/English, WhatsApp-first, QRIS/VA/e-wallets, local courier shipping across Java from Jakarta, and honest per-size stock.

## Key decisions (non-negotiable)

1. **No COD.** Not in the UI, not in the backend, not on the roadmap.
2. **100% digital payments:** QRIS, e-wallets (GoPay, OVO, DANA, ShopeePay), Virtual Accounts (BCA, Mandiri, BNI, BRI, Permata), credit/debit cards (paid in full). **No installments/paylater** in v1.
3. **WhatsApp-first:** WA buttons on the product page, size guide, cart, checkout, payment page, and order tracking. WA number is required at checkout; email is optional.
4. **Shipping within Java only**, warehouse in **Jakarta**. Instant/same-day for Jabodetabek (Greater Jakarta) only.
5. **Bilingual ID (default) + EN.** Dance terms are **not translated** (glossary in `07-design-system.md` §8).
6. **Unofficial reseller:** claims of "Official", "Authorized", "Só Dança Indonesia" are prohibited; the Só Dança logo may not be used as the store logo. Saying "Produk original Só Dança (impor)" (Original Só Dança product (imported)) is allowed.
7. **Per-variant stock** (model × color × size × width × shank), reserved at payment, deducted once paid.
8. **Guest checkout** (no shopper accounts). Admin login.
9. **Light mode only** in v1.
10. Price = **markup on the official import landed cost** (see `06-pricing.md`).

## Package contents

| File | Contents |
|---|---|
| `01-research.md` | Research on Só Dança, market, payments, shipping, localization principles |
| `02-requirements.md` | Functional requirements (IDs `FR-*`) + non-functional (`NFR-*`) + acceptance criteria |
| `03-demo.md` | Demo scope, what is mocked, 8 demo scenarios |
| `04-tech-stack.md` | Locked stack, repo structure, code conventions, environment |
| `05-data-and-contracts.md` | DB schema, order state machine, stock logic, provider interfaces, API |
| `06-pricing.md` | Exchange rate, import taxes, markup, market price check |
| `07-design-system.md` | Principles, tokens, typography, components + states, copy & glossary |
| `08-pages-and-flows.md` | Sitemap, per-page specifications, checkout flow |
| `09-work-plan.md` | Workstreams (multi-agent ready), order, dependencies, Definition of Done |
| `10-decisions.md` | Decision log + open questions |
| `../messages/{id,en}/<namespace>.json` | UI text per namespace (owner per namespace: `09`) |
| `../data/` | Catalog of 40 models / 2.903 SKUs, Java regions, simulated shipping rates |
| `../design-system/` | `tokens.json`, `tokens.css`, `glossary.json` |
