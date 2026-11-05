# 14 — Backup, handover & local setup

How this work is stored, moved to a new GitHub repo, and run from scratch on another machine.

## 1. Backup: git bundle

The entire git history can be carried as a single file `releve-backup.bundle` (this file is **not** committed; it is in `.gitignore`).

**Creating / updating the bundle** (in the repo folder):

```bash
git bundle create releve-backup.bundle --all
git bundle verify releve-backup.bundle
git bundle list-heads releve-backup.bundle   # check the latest commit is included
```

Recreate it after every work session — the bundle only contains the commits that existed when it was created. Uncommitted changes are **not** included.

**Restoring from the bundle:**

```bash
git clone releve-backup.bundle releve
cd releve
git log --oneline | head     # make sure the history is complete
```

What is **not** in the bundle (intentionally): `node_modules/`, `.next/`, `.env.local` (secrets), database contents. The database is recreated from the seed (`pnpm db:seed`) — all demo data comes from `data/**` and `src/db/seed/*`.

## 2. Push to a new GitHub repo

1. GitHub → **New repository** → name e.g. `releve-dance-supply`, **Private**, **without** README/.gitignore/license (the repo must be empty).
2. From the bundle clone:

   ```bash
   cd releve
   git remote remove origin          # origin points to the bundle file
   git remote add origin git@github.com:<akun>/releve-dance-supply.git
   git push -u origin main
   git push origin --tags            # if there are tags
   ```
   Or with the GitHub CLI: `gh repo create <akun>/releve-dance-supply --private --source=. --push`.
3. Make sure no secrets are included: `git ls-files | grep -E '^\.env'` must only show `.env.example`.
4. Connect to Vercel: [`12-deploy.md`](12-deploy.md) §4.

## 3. Local setup from scratch

### Prerequisites
- **Node.js 22** (LTS). Check: `node -v`.
- **pnpm 10** — the version is pinned in `package.json` (`packageManager: pnpm@10.28.0`): `corepack enable` then `pnpm -v`.
- **PostgreSQL 16**: native install, **or** Docker `postgres:16` (easiest, see below).
- (For E2E) Chromium for Playwright.

### Steps

```bash
# 1. Database (pick one)
docker compose up -d                 # postgres:16 from docker-compose.yml: user/pass/db = releve, plus DB releve_test
# — or without compose —
docker run -d --name releve-pg -p 5432:5432 \
  -e POSTGRES_USER=releve -e POSTGRES_PASSWORD=releve -e POSTGRES_DB=releve postgres:16
docker exec releve-pg createdb -U releve releve_test
# — or native Postgres —
#   createuser -P releve   (password: releve)
#   createdb -O releve releve && createdb -O releve releve_test

# 2. Env
cp .env.example .env.local
# replace AUTH_SECRET, WEBHOOK_SECRET, CRON_SECRET with: openssl rand -hex 32

# 3. Dependencies
pnpm install

# 4. Schema + data
pnpm db:push        # drizzle-kit push; uses DATABASE_URL from the shell, default postgres://releve:releve@localhost:5432/releve
pnpm db:seed        # reads .env.local; 40 products, 2.903 variants, admin, voucher RELEVE10, 12 orders, 3 back-in-stock

# 5. Run
pnpm dev            # http://localhost:3000 → /id ; admin: /admin/login (admin@releve.test / releve-demo)
```

Notes:
- `pnpm db:push` does **not** read `.env.local`. If your local DB is not the default URL, run `DATABASE_URL=postgres://… pnpm db:push`.
- `pnpm db:reset` = drop schema + push + seed. Only for a local DB (`localhost`/`127.0.0.1`/`::1`); other hosts are refused unless `ALLOW_DB_RESET=true`.
- Several dev servers in parallel: `NEXT_DIST_DIR=.next-ws3 pnpm next dev -p 3103` (see `next.config.ts`).
- Full list of env variables & their meaning: [`12-deploy.md`](12-deploy.md) §5.

## 4. Running tests

| Command | Content | Requires |
|---|---|---|
| `pnpm lint` | ESLint | — |
| `pnpm typecheck` | `tsc --noEmit` | — |
| `pnpm test` | Vitest: `tests/unit/**`, `src/**/*.test.ts(x)` | Postgres with a **`releve_test`** DB (or `TEST_DATABASE_URL`). The schema is created automatically the first time (`drizzle-kit push`); DB test files run one at a time via an advisory lock. The test env is set by `tests/unit/services/helpers/env.ts` itself — it does not use `.env.local` |
| `pnpm test:e2e` | Playwright: `tests/e2e/*.spec.ts` (scenarios D1–D7), projects `mobile` (Pixel 7) & `desktop` (1280×800), 1 worker | A dev server **already running** with a seeded DB and `DEMO_MODE=true` |

Playwright does not start its own server (there is no `webServer` in `playwright.config.ts`). Variables read:

| Variable | Default | Purpose |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:3000` | URL of the app under test |
| `PW_CHROMIUM` | `/opt/pw-browsers/chromium` | Path to the Chromium executable. On a regular machine: run `pnpm exec playwright install chromium` and point to that binary, e.g. `PW_CHROMIUM=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome \| head -1)` (macOS: `…/chrome-mac/Chromium.app/Contents/MacOS/Chromium`) |
| `DATABASE_URL` | default local URL | Specs read/restore data directly in the DB (the admin spec also reads `.env.local`) |

Examples:

```bash
pnpm db:seed
pnpm dev &                                   # or in another terminal
E2E_BASE_URL=http://localhost:3000 PW_CHROMIUM=/path/to/chromium pnpm test:e2e
E2E_BASE_URL=http://localhost:3000 pnpm test:e2e tests/e2e/admin.spec.ts --project=desktop
```

E2E tests modify the dev DB data (and try to restore it). Re-seed before a demo.

## 5. Handover checklist

- [ ] A private GitHub repo containing the latest `main` (or the latest bundle + `git bundle verify` OK).
- [ ] `.env.example` is in the repo; `.env.local` / secrets are **not**.
- [ ] Neon project + connection strings (direct & pooled) recorded in the password manager.
- [ ] Vercel project connected to the repo, env vars filled in (`12-deploy.md` §5), Cron active.
- [ ] Demo admin credentials handed over separately from the URL.
- [ ] Documents: `00`–`10` specifications, `11` go-live integrations, `12` deploy, `13` demo script, `14` this one.
- [ ] Open questions Q-01..Q-09 (`10-decisions.md`) sent to the client.
