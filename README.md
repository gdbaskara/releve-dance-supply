# Relevé Dance Supply — demo specification

Online store for **Só Dança** dance shoes & dancewear for the Indonesian market (independent reseller). This repo contains the **complete specification package** and the **demo application** (Next.js 16 + PostgreSQL).

**Start here:** [`docs/00-brief.md`](docs/00-brief.md). For agents: [`AGENTS.md`](AGENTS.md).

```
docs/
  00-brief.md               summary & key decisions
  01-research.md            research on Só Dança, market, payments, shipping
  02-requirements.md        FRs & NFRs with acceptance criteria
  03-demo.md                demo scope, mock vs real, scenarios D1–D9
  04-tech-stack.md          locked stack, repo structure, env
  05-data-and-contracts.md  DB schema, state machine, provider contracts, WA templates
  06-pricing.md             exchange rate, import taxes, markup, market prices
  07-design-system.md       principles, tokens, components, copy
  08-pages-and-flows.md     sitemap & page specifications
  09-work-plan.md           multi-agent workstreams, milestones, DoD
  10-decisions.md           decision log & open questions
  11-go-live-integrations.md  connecting Xendit, Biteship, WhatsApp Business API
  12-deploy.md              deploying the demo to Vercel + Neon
  13-demo-script.md         client presentation script (±15 minutes)
  14-backup-and-handover.md backup bundle, new repo, local setup, tests
design-system/
  tokens.json · tokens.css · glossary.json
data/
  catalog/    products.json (40 models, 2.903 SKUs) · variants.csv · pricing_config.json · README.md
  shipping/   java-areas.json (6 provinces, 119 Kab./Kota (regencies/cities)) · mock-rates.json
scripts/
  build_catalog.py          regenerates catalog & prices from pricing_config.json
```

## Regenerating the catalog
Requires a dump of the public Só Dança catalog (`products.json?page=N`) in a single folder:
```bash
python3 -I scripts/build_catalog.py <folder-dump> data/catalog data/catalog/pricing_config.json
```

## Running locally

Requires Node 22, pnpm 10 (`corepack enable`), and PostgreSQL 16 (or Docker).

```bash
docker compose up -d          # postgres:16 — db releve + releve_test (user/pass releve)
cp .env.example .env.local    # replace AUTH_SECRET, WEBHOOK_SECRET, CRON_SECRET: openssl rand -hex 32
pnpm install
pnpm db:push                  # schema (Drizzle)
pnpm db:seed                  # catalog, admin, voucher RELEVE10, sample orders
pnpm dev                      # http://localhost:3000/id · admin: /admin/login
```

Demo admin: `admin@releve.test` / `releve-demo` (from `.env.local`, demo only). Tests: `pnpm test` (requires the `releve_test` DB), `pnpm test:e2e` (Playwright, against a running dev server). Details: [`docs/14-backup-and-handover.md`](docs/14-backup-and-handover.md).

## Deploy, demo & handover

| Document | Contents |
|---|---|
| [`docs/11-go-live-integrations.md`](docs/11-go-live-integrations.md) | Connecting the real integrations: Xendit, Biteship, WhatsApp Business API |
| [`docs/12-deploy.md`](docs/12-deploy.md) | Deploying the demo to Vercel + Neon Postgres, env vars, cron, URL protection, re-seeding |
| [`docs/13-demo-script.md`](docs/13-demo-script.md) | Client presentation script D1–D8 + decisions needed from the client |
| [`docs/14-backup-and-handover.md`](docs/14-backup-and-handover.md) | Git bundle, pushing to a new GitHub repo, local setup from scratch, running tests |
