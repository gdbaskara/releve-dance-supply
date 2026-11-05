# 04 — Tech stack (locked)

Use the **latest stable version at the time the build starts** for each package below, then pin it in the lockfile. Do not add major frameworks/libraries outside this list without recording it in `10-decisions.md`.

| Layer | Choice | Notes |
|---|---|---|
| Language | **TypeScript** (strict) | |
| Framework | **Next.js** (App Router, Server Components, Server Actions, Route Handlers) | Single app (not a monorepo) |
| Runtime | Node.js LTS | |
| Package manager | **pnpm** | |
| Styling | **Tailwind CSS v4** + `design-system/tokens.css` | No hard-coded color/spacing values in components |
| UI primitives | **Radix UI** via the **shadcn/ui** pattern (code copied into `src/components/ui`, then adapted to the tokens) | |
| Icons | **lucide-react** (+ WhatsApp & payment logo SVGs in `public/icons`) | |
| Fonts | `next/font/google`: Plus Jakarta Sans (400/500/600/700), Cormorant Garamond (500, 500 italic) | |
| i18n | **next-intl** | `messages/id.json`, `messages/en.json` |
| Forms | **React Hook Form** + **Zod** | Zod schemas reused on the server |
| Client state | Zustand (cart, persisted to localStorage) | Cart only |
| DB | **PostgreSQL** (Neon for deploy, Docker locally) | |
| ORM / migrations | **Drizzle ORM** + drizzle-kit | |
| Admin auth | Signed session cookie (**jose**) + **bcryptjs**, 1 admin from env (D-19) | Shoppers do not log in |
| QR | `qrcode` (renders the mock QR string) | |
| Dates | `date-fns` + `date-fns-tz` (Asia/Jakarta) | |
| Unit testing | **Vitest** + Testing Library | |
| E2E testing | **Playwright** (scenarios D1–D9) | |
| Design system docs | **Storybook** (Next.js framework, a11y addon) | |
| Lint/format | ESLint + Prettier | |
| CI | GitHub Actions: lint, typecheck, unit, build, E2E (Postgres service) | |
| Hosting | **Vercel** (app + Storybook), **Neon** (DB) | |
| Payment (later) | Xendit | Via `PaymentProvider` |
| Shipping (later) | Biteship | Via `ShippingProvider` |
| WA (later) | WhatsApp Business API via BSP | Via `MessagingProvider` |

## Repo structure

```
/
├─ AGENTS.md                  # rules for agents (must read)
├─ README.md
├─ docs/                      # specification (source of truth)
├─ data/                      # catalog, regions, rates (seed input)
├─ design-system/             # tokens.json, tokens.css, glossary.json
├─ scripts/                   # build_catalog.py, other generators
├─ messages/                  # id.json, en.json
├─ public/icons/              # whatsapp.svg, qris.svg, bank & e-wallet logos
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ (store)/          # home, c/[discipline], p/[slug], cart, search
│  │  │  ├─ checkout/         # checkout, pay/[orderNo], success/[orderNo]
│  │  │  └─ track/
│  │  ├─ admin/               # no locale prefix; id/en via admin_locale cookie (D-31)
│  │  └─ api/                 # webhooks/payment, webhooks/shipping, cron/expire
│  ├─ components/
│  │  ├─ ui/                  # design system components (primitive + pattern)
│  │  ├─ store/               # store-specific components (ProductCard, VariantPicker, …)
│  │  ├─ checkout/
│  │  └─ admin/
│  ├─ lib/
│  │  ├─ contracts/           # shared types & interfaces (WRITTEN FIRST, see 05)
│  │  ├─ format/              # money, phone, date
│  │  ├─ wa/                  # templates & wa.me link builder
│  │  ├─ services/            # catalog, stock, order, checkout-link, back-in-stock
│  │  └─ providers/           # payment/{mock,xendit}, shipping/{mock,biteship}, messaging/{outbox,waba}
│  ├─ db/                     # schema.ts, migrations, seed/
│  └─ styles/globals.css      # @import tokens.css + @theme
├─ stories/                   # Storybook stories (or co-located *.stories.tsx)
└─ tests/{unit,e2e}/
```

## Conventions

- Components: PascalCase, one component per file, explicitly typed props, **no hard-coded UI strings** (use `useTranslations`).
- Server: business logic in `lib/services`, not in components/routes. Routes/Server Actions only validate (Zod) + call a service.
- Money: integer Rupiah `number`; formatted only via `formatIDR()`.
- Phone numbers: store as E.164 (`+62…`); format via `formatPhoneID()`.
- Branch: `ws-<n>/<short>`; commit: `feat(CHK-02): normalize WA number`.
- Every PR: passes lint, typecheck, tests; include a mobile screenshot for UI changes.

## Environment variables

| Var | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://…` | |
| `DEMO_MODE` | `true` | Simulation buttons & demo banner |
| `DEMO_USE_REFERENCE_IMAGES` | `false` | `true` = sodanca.com reference images (internal only) |
| `PAYMENT_PROVIDER` | `mock` \| `xendit` | |
| `SHIPPING_PROVIDER` | `mock` \| `biteship` | |
| `MESSAGING_PROVIDER` | `outbox` \| `waba` | |
| `NEXT_PUBLIC_WA_NUMBER` | `6281200000000` | Format without `+` for wa.me |
| `NEXT_PUBLIC_SITE_URL` | `https://…` | For links in WA messages |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | | Admin seed |
| `AUTH_SECRET` | | Auth.js |
| `WEBHOOK_SECRET` | | Mock/xendit webhook verification |
| `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN` | | Later |
| `BITESHIP_API_KEY` | | Later |
