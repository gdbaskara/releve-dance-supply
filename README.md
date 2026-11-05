# Relevé Dance Supply — spesifikasi demo

Web toko sepatu dansa & dancewear **Só Dança** untuk pasar Indonesia (reseller independen). Repo ini berisi **paket spesifikasi lengkap** dan **aplikasi demo** (Next.js 16 + PostgreSQL).

**Mulai di sini:** [`docs/00-brief.md`](docs/00-brief.md). Untuk agent: [`AGENTS.md`](AGENTS.md).

```
docs/
  00-brief.md               ringkasan & keputusan kunci
  01-research.md            riset Só Dança, pasar, pembayaran, pengiriman
  02-requirements.md        FR & NFR dengan acceptance criteria
  03-demo.md                lingkup demo, mock vs asli, skenario D1–D9
  04-tech-stack.md          stack terkunci, struktur repo, env
  05-data-and-contracts.md  skema DB, state machine, kontrak provider, template WA
  06-pricing.md             kurs, pajak impor, markup, harga pasar
  07-design-system.md       prinsip, token, komponen, copy
  08-pages-and-flows.md     sitemap & spesifikasi halaman
  09-work-plan.md           workstream multi-agent, milestone, DoD
  10-decisions.md           log keputusan & pertanyaan terbuka
  11-go-live-integrations.md  menyambung Xendit, Biteship, WhatsApp Business API
  12-deploy.md              deploy demo ke Vercel + Neon
  13-demo-script.md         naskah presentasi klien (±15 menit)
  14-backup-and-handover.md backup bundle, repo baru, setup lokal, test
design-system/
  tokens.json · tokens.css · glossary.json
data/
  catalog/    products.json (40 model, 2.903 SKU) · variants.csv · pricing_config.json · README.md
  shipping/   java-areas.json (6 provinsi, 119 kab/kota) · mock-rates.json
scripts/
  build_catalog.py          regenerasi katalog & harga dari pricing_config.json
```

## Regenerasi katalog
Membutuhkan dump katalog publik Só Dança (`products.json?page=N`) di satu folder:
```bash
python3 -I scripts/build_catalog.py <folder-dump> data/catalog data/catalog/pricing_config.json
```

## Menjalankan secara lokal

Butuh Node 22, pnpm 10 (`corepack enable`), dan PostgreSQL 16 (atau Docker).

```bash
docker compose up -d          # postgres:16 — db releve + releve_test (user/pass releve)
cp .env.example .env.local    # ganti AUTH_SECRET, WEBHOOK_SECRET, CRON_SECRET: openssl rand -hex 32
pnpm install
pnpm db:push                  # skema (Drizzle)
pnpm db:seed                  # katalog, admin, voucher RELEVE10, order contoh
pnpm dev                      # http://localhost:3000/id · admin: /admin/login
```

Admin demo: `admin@releve.test` / `releve-demo` (dari `.env.local`, hanya untuk demo). Test: `pnpm test` (butuh DB `releve_test`), `pnpm test:e2e` (Playwright, terhadap dev server yang berjalan). Detail: [`docs/14-backup-and-handover.md`](docs/14-backup-and-handover.md).

## Deploy, demo & serah terima

| Dokumen | Isi |
|---|---|
| [`docs/11-go-live-integrations.md`](docs/11-go-live-integrations.md) | Menyambung integrasi asli: Xendit, Biteship, WhatsApp Business API |
| [`docs/12-deploy.md`](docs/12-deploy.md) | Deploy demo ke Vercel + Neon Postgres, env vars, cron, proteksi URL, seed ulang |
| [`docs/13-demo-script.md`](docs/13-demo-script.md) | Naskah presentasi klien D1–D8 + keputusan yang dibutuhkan dari klien |
| [`docs/14-backup-and-handover.md`](docs/14-backup-and-handover.md) | Git bundle, push ke GitHub baru, setup lokal dari nol, menjalankan test |
