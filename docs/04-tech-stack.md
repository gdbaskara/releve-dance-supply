# 04 — Tech stack (terkunci)

Gunakan **versi stable terbaru saat build dimulai** untuk tiap paket di bawah, lalu pin di lockfile. Jangan menambah framework/library besar di luar daftar tanpa mencatatnya di `10-decisions.md`.

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Bahasa | **TypeScript** (strict) | |
| Framework | **Next.js** (App Router, Server Components, Server Actions, Route Handlers) | Satu app (bukan monorepo) |
| Runtime | Node.js LTS | |
| Package manager | **pnpm** | |
| Styling | **Tailwind CSS v4** + `design-system/tokens.css` | Tidak ada nilai warna/spacing hard-coded di komponen |
| Primitive UI | **Radix UI** via pola **shadcn/ui** (kode disalin ke `src/components/ui`, lalu disesuaikan dengan token) | |
| Ikon | **lucide-react** (+ SVG WhatsApp & logo pembayaran di `public/icons`) | |
| Font | `next/font/google`: Plus Jakarta Sans (400/500/600/700), Cormorant Garamond (500, 500 italic) | |
| i18n | **next-intl** | `messages/id.json`, `messages/en.json` |
| Form | **React Hook Form** + **Zod** | Skema Zod dipakai ulang di server |
| State klien | Zustand (keranjang, persist localStorage) | Hanya untuk cart |
| DB | **PostgreSQL** (Neon untuk deploy, Docker lokal) | |
| ORM / migrasi | **Drizzle ORM** + drizzle-kit | |
| Auth admin | Session cookie bertanda tangan (**jose**) + **bcryptjs**, 1 admin dari env (D-19) | Pembeli tidak login |
| QR | `qrcode` (render QR string mock) | |
| Tanggal | `date-fns` + `date-fns-tz` (Asia/Jakarta) | |
| Testing unit | **Vitest** + Testing Library | |
| Testing E2E | **Playwright** (skenario D1–D9) | |
| Design system docs | **Storybook** (Next.js framework, a11y addon) | |
| Lint/format | ESLint + Prettier | |
| CI | GitHub Actions: lint, typecheck, unit, build, E2E (Postgres service) | |
| Hosting | **Vercel** (app + Storybook), **Neon** (DB) | |
| Payment (nanti) | Xendit | Lewat `PaymentProvider` |
| Shipping (nanti) | Biteship | Lewat `ShippingProvider` |
| WA (nanti) | WhatsApp Business API via BSP | Lewat `MessagingProvider` |

## Struktur repo

```
/
├─ AGENTS.md                  # aturan untuk agent (wajib dibaca)
├─ README.md
├─ docs/                      # spesifikasi (sumber kebenaran)
├─ data/                      # katalog, wilayah, tarif (input seed)
├─ design-system/             # tokens.json, tokens.css, glossary.json
├─ scripts/                   # build_catalog.py, generator lain
├─ messages/                  # id.json, en.json
├─ public/icons/              # whatsapp.svg, qris.svg, bank & e-wallet logos
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ (store)/          # home, c/[discipline], p/[slug], cart, search
│  │  │  ├─ checkout/         # checkout, pay/[orderNo], success/[orderNo]
│  │  │  └─ track/
│  │  ├─ admin/               # tidak ber-locale (ID saja)
│  │  └─ api/                 # webhooks/payment, webhooks/shipping, cron/expire
│  ├─ components/
│  │  ├─ ui/                  # komponen design system (primitive + pattern)
│  │  ├─ store/               # komponen khusus toko (ProductCard, VariantPicker, …)
│  │  ├─ checkout/
│  │  └─ admin/
│  ├─ lib/
│  │  ├─ contracts/           # types & interface bersama (DITULIS PERTAMA, lihat 05)
│  │  ├─ format/              # money, phone, date
│  │  ├─ wa/                  # template & builder link wa.me
│  │  ├─ services/            # catalog, stock, order, checkout-link, back-in-stock
│  │  └─ providers/           # payment/{mock,xendit}, shipping/{mock,biteship}, messaging/{outbox,waba}
│  ├─ db/                     # schema.ts, migrations, seed/
│  └─ styles/globals.css      # @import tokens.css + @theme
├─ stories/                   # Storybook stories (atau co-located *.stories.tsx)
└─ tests/{unit,e2e}/
```

## Konvensi

- Komponen: PascalCase, satu komponen per file, props bertipe eksplisit, **tanpa string UI hard-coded** (pakai `useTranslations`).
- Server: logika bisnis di `lib/services`, bukan di komponen/route. Route/Server Action hanya validasi (Zod) + panggil service.
- Uang: `number` integer Rupiah; format hanya lewat `formatIDR()`.
- Nomor HP: simpan E.164 (`+62…`); format lewat `formatPhoneID()`.
- Branch: `ws-<n>/<ringkas>`; commit: `feat(CHK-02): normalisasi nomor WA`.
- Setiap PR: lulus lint, typecheck, test; sertakan screenshot mobile untuk perubahan UI.

## Environment variables

| Var | Contoh | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgres://…` | |
| `DEMO_MODE` | `true` | Tombol simulasi & banner demo |
| `DEMO_USE_REFERENCE_IMAGES` | `false` | `true` = gambar referensi sodanca.com (internal saja) |
| `PAYMENT_PROVIDER` | `mock` \| `xendit` | |
| `SHIPPING_PROVIDER` | `mock` \| `biteship` | |
| `MESSAGING_PROVIDER` | `outbox` \| `waba` | |
| `NEXT_PUBLIC_WA_NUMBER` | `6281200000000` | Format tanpa `+` untuk wa.me |
| `NEXT_PUBLIC_SITE_URL` | `https://…` | Untuk link di pesan WA |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | | Seed admin |
| `AUTH_SECRET` | | Auth.js |
| `WEBHOOK_SECRET` | | Verifikasi webhook mock/xendit |
| `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN` | | Nanti |
| `BITESHIP_API_KEY` | | Nanti |
