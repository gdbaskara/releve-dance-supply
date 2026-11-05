# 12 — Demo deploy: Vercel + Neon Postgres

Goal: a single demo URL (Vercel) with a Postgres database (Neon) holding seed data, ready for the client to open on phone & laptop. All external integrations remain **mock** (`03-demo.md` §2). To connect the real integrations, see [`11-go-live-integrations.md`](11-go-live-integrations.md).

Summary of the order:

1. Push the repo to GitHub (see [`14-backup-and-handover.md`](14-backup-and-handover.md) §2).
2. Create a Neon database → get the connection string.
3. Load the schema & data into Neon from the laptop (`pnpm db:push`, `pnpm db:seed`).
4. Import the repo into Vercel, fill in env vars, deploy.
5. Set `NEXT_PUBLIC_SITE_URL` to the final URL → redeploy.
6. Protect the preview URL, run a quick test, share with the client.

---

## 1. Prerequisites

- GitHub, Vercel, and Neon accounts (the free plans are enough for the demo).
- On the laptop: Node 22, pnpm 10 (`corepack enable`), the repo installed (`pnpm install`) and a `.env.local` (see `14` §3).
- `openssl` for generating secrets.

## 2. Create the Neon database

1. Neon Console → **New Project**. Name: `releve-demo`. Postgres **16** (or the latest version offered). Region: **AWS Asia Pacific (Singapore) `ap-southeast-1`** — close to Indonesian buyers and to the Vercel function region `sin1` pinned in `vercel.json`.
2. The default database may be renamed to `releve` (optional).
3. **Connect** → copy the connection string. There are two kinds:
   - **Pooled** (host contains `-pooler`) → used **on Vercel** (serverless functions open many short connections).
   - **Direct** (without `-pooler`) → used **from the laptop** for `db:push` and `db:seed`.
4. Make sure the string ends with `?sslmode=require`. If Neon appends `&channel_binding=require`, **remove that part**: the `postgres` driver (postgres.js) used by the app forwards unknown URL parameters to the server and the connection may fail. Final example:

   ```
   postgres://neondb_owner:xxxxx@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/releve?sslmode=require
   postgres://neondb_owner:xxxxx@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/releve?sslmode=require
   ```

> Note: this project uses `drizzle-kit push` (no migration files, D-20). That is enough for the demo. Before production, create migrations with `pnpm db:generate` and run `pnpm db:migrate`.

## 3. Load schema & data into Neon (from the laptop)

Relevant scripts (`package.json`):

| Script | Content | Notes |
|---|---|---|
| `pnpm db:push` | `drizzle-kit push --force` | Reads `DATABASE_URL` from the **shell environment** (`drizzle.config.ts`; does not read `.env.local`). Defaults to the local DB. |
| `pnpm db:seed` | `tsx --env-file=.env.local src/db/seed/index.ts` | `.env.local` **must exist**. Variables already set in the shell **win** over `.env.local`, so Neon can be targeted with the prefix `DATABASE_URL=… pnpm db:seed`. Idempotent: TRUNCATEs all tables and then refills them. |
| `pnpm db:reset` | `reset.ts` (DROP SCHEMA) → push → seed | `src/db/seed/reset.ts` **refuses non-local hosts** unless `ALLOW_DB_RESET=true`. Usually not needed for Neon — `db:seed` already wipes all data. |

Run (using the **direct** connection string):

```bash
export NEON_URL='postgres://neondb_owner:xxxxx@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/releve?sslmode=require'

# 1) schema
DATABASE_URL="$NEON_URL" pnpm db:push

# 2) data: 40 products, 2.903 variants, 1 admin, voucher RELEVE10, 12 sample orders, 3 back-in-stock requests
DATABASE_URL="$NEON_URL" \
NEXT_PUBLIC_SITE_URL='https://releve-demo.vercel.app' \
ADMIN_EMAIL='admin@releve.test' \
ADMIN_PASSWORD='releve-demo' \
DEMO_USE_REFERENCE_IMAGES=false \
pnpm db:seed
```

Why variables other than `DATABASE_URL` are also set during seeding:

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_HASH`) — the admin is **stored in the `admin_users` table at seed time** (bcrypt). Login on Vercel reads from the DB, not from the Vercel env. Changing the password = re-seed with the new value.
- `NEXT_PUBLIC_SITE_URL` — the links in the WA outbox messages of the 12 sample orders are created at seed time.
- `DEMO_USE_REFERENCE_IMAGES` — product image URLs are written to the DB at seed time. `true` only for internal presentations (AGENTS.md rule 10); for links shared with the client, leave it `false`.

The seed succeeded if the last log line reports the number of products, variants, admins, vouchers, orders, and outbox messages.

## 4. Connect GitHub → Vercel

1. Vercel Dashboard → **Add New… → Project** → **Import Git Repository** → choose the repo (allow the Vercel GitHub App to access that repo).
2. Framework: **Next.js** (detected; also pinned in `vercel.json`). Root directory: `./`.
3. Install command `pnpm install --frozen-lockfile`, build command `pnpm build` (already in `vercel.json`). The pnpm version is taken from the `packageManager` field (`pnpm@10.28.0`).
4. **Settings → General → Node.js Version: 22.x** (the repo does not yet have an `engines` field).
5. Fill in the **Environment Variables** (§5) for the **Production** and **Preview** environments before clicking **Deploy**.
6. Once connected: every push to `main` = a Production deploy; every branch/PR = a Preview deploy with its own URL. Preview uses the same DB unless you give the Preview environment a different `DATABASE_URL` (recommended: a separate Neon **branch** for preview).

## 5. Environment variables

All names below are taken from `.env.example` and from the code (`src/**`). Generate secrets with:

```bash
openssl rand -hex 32
```

| Variable | Value on Vercel | Used in | Notes |
|---|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (`…-pooler…?sslmode=require`, without `channel_binding`) | `src/db/index.ts` | Secret |
| `DEMO_MODE` | `true` | `src/lib/providers/env.ts` | Enables the "Simulasikan Bayar/Kedaluwarsa" (Simulate Payment/Expiry) buttons, `POST /api/demo/simulate-payment`, and opens `/api/cron/expire` to all callers |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | `(store)` & `(checkout)` layouts | Banner "Mode demo — pembayaran & pengiriman disimulasikan." (Demo mode — payment & shipping are simulated.) **Read at build time** → redeploy after changing |
| `DEMO_USE_REFERENCE_IMAGES` | `false` | seed, provider env | See §3; the value that counts is the value **at seed time** |
| `PAYMENT_PROVIDER` | `mock` | `src/lib/providers` | `xendit` is still a stub ("not configured") |
| `SHIPPING_PROVIDER` | `mock` | `src/lib/providers` | `biteship` is still a stub |
| `MESSAGING_PROVIDER` | `outbox` | `src/lib/providers` | `waba` is still a stub. Outgoing WA messages appear in Admin → WA outbox |
| `NEXT_PUBLIC_WA_NUMBER` | Demo WA number, format `62…` without `+` (e.g. `6281200000000`) | `src/lib/wa` | The "Tanya via WA" (Ask via WA) button opens wa.me to this number — use a number the team actually holds during the demo (Q-04). Build-time |
| `NEXT_PUBLIC_SITE_URL` | Final URL without a trailing `/`, e.g. `https://releve-demo.vercel.app` | `src/lib/providers/env.ts` (admin checkout link, payment link in WA, mock e-wallet/3DS redirect) | Build-time; see §6 |
| `ADMIN_EMAIL` | `admin@releve.test` | seed | Not used at runtime (login reads the DB) — may be set for consistency |
| `ADMIN_PASSWORD` | Demo admin password | seed | Same: only matters at seed time. Alternative: `ADMIN_PASSWORD_HASH` (bcrypt) so the plain password is not stored |
| `AUTH_SECRET` | `openssl rand -hex 32` | `src/lib/auth/session.ts` | Signs the `rds_admin` admin cookie (min. 16 characters). Changing the value = all admin sessions are logged out |
| `WEBHOOK_SECRET` | `openssl rand -hex 32` | mock payment provider | HMAC for the `x-mock-signature` header on `POST /api/webhooks/payment` |
| `CRON_SECRET` | `openssl rand -hex 32` | `GET /api/cron/expire` | Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` if this variable exists (§7) |

Not needed yet for the demo (mentioned in `04-tech-stack.md`, not yet read by the code): `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN`, `BITESHIP_API_KEY`. Only for local scripts: `ALLOW_DB_RESET`, `TEST_DATABASE_URL`, `E2E_BASE_URL`, `PW_CHROMIUM`, `NEXT_DIST_DIR`.

## 6. `NEXT_PUBLIC_SITE_URL` and domain

1. The first deploy may use a temporary value. After deploying, Vercel assigns a production domain `https://<project>.vercel.app` (Settings → Domains; it can be renamed, e.g. `releve-demo.vercel.app`, or use a custom domain).
2. Set `NEXT_PUBLIC_SITE_URL` to that domain → **Deployments → … → Redeploy** (`NEXT_PUBLIC_*` variables are baked in at build time).
3. Re-seed Neon with the same `NEXT_PUBLIC_SITE_URL` (§3) so the links in the sample orders' WA messages are correct too.
4. For **Preview** deploys, links in WA messages & checkout links still point to the production domain — that is fine for the demo.

## 7. Vercel Cron → `/api/cron/expire`

`vercel.json`:

```json
"crons": [{ "path": "/api/cron/expire", "schedule": "0 20 * * *" }]
```

- `0 20 * * *` = once a day at 20:00 UTC (**03:00 WIB**). Vercel's **Hobby** plan only allows **daily** crons (the deploy fails if the schedule is more frequent), so this schedule is safe on every plan.
- That is enough because expired orders are also **swept lazily** (`src/lib/services/expiry.ts`): every time an order is read (payment/success/tracking/admin pages), and on `getProduct` / `validateCart` (at most once every 30 seconds). Stock reserved by an expired order is already back before the next buyer sees the PDP or checkout. The cron is only a background cleaner.
- On the **Pro** plan, change it to `*/5 * * * *` (every 5 minutes) if you want the admin dashboard to always be up to date without waiting for someone to open a page. Not every minute — unnecessary (decision D-28).
- Authentication: the route accepts `Authorization: Bearer $CRON_SECRET`; **when `DEMO_MODE=true` all callers are accepted** (so it can be triggered manually during the demo). Manual test:

  ```bash
  curl -s -H "Authorization: Bearer $CRON_SECRET" https://releve-demo.vercel.app/api/cron/expire
  # {"ok":true,"expired":[]}
  ```

- Vercel Cron only runs on the **Production** deployment. History: Project → Settings → Cron Jobs.

## 8. Protect the demo URL

The demo store has no buyer login; only `/admin` is locked (email + password login from the seed). Options, from simplest:

1. **Vercel Deployment Protection** (Settings → Deployment Protection):
   - **Vercel Authentication — Standard Protection**: all Preview deployments and automatic deployment URLs can only be opened by logged-in Vercel team members. Available on Hobby. Not well suited to a client without a Vercel account.
   - **Password Protection**: one password for everyone — best suited to the client. Available on the Pro plan (add-on) / Enterprise.
   - **Shareable Links** (Protection Bypass): from the deployment page → **Share** → copy the link containing a bypass token; the client can open the protected deployment without logging in. Revoke it after the demo.
2. **Without a paid plan**: use a hard-to-guess production domain (e.g. `releve-demo-7f3k.vercel.app`), do not post the link anywhere, and make sure the data is sample data only. This is *obscurity*, not protection.
3. A simple app-level password (Basic Auth in `src/proxy.ts`) **does not exist yet** — see "Not yet available / TODO".

Other points:
- Do not use the admin password `releve-demo` for links shared outside the meeting. Re-seed with a different `ADMIN_PASSWORD` and send the credentials to the client separately (`03-demo.md` §5).
- If `DEMO_USE_REFERENCE_IMAGES=true` was ever used, that URL is **only** for internal presentations.
- `DEMO_MODE=true` means anyone with the URL can simulate payments. That is the point of the demo; it **must be `false` in production**.

## 9. Quick test after deploy

| Check | Result |
|---|---|
| Open `/` | Redirects to `/id`, demo mode banner shown |
| `/id/p/diamond-sd140` | Price in Rp, sizes & stock shown (DB connected) |
| `/en/p/claudia-satin-sd09` | English UI, shank options |
| `/admin/login` | Log in with the seed credentials → Dashboard |
| `/id/design-system` | Design system showcase |
| `curl …/api/cron/expire` | `{"ok":true,…}` |
| Short D1 checkout → "Simulasikan Bayar Berhasil" (Simulate Successful Payment) | Success page; Admin → WA outbox contains "Pembayaran diterima" (Payment received) |

If a page returns error 500: check **Deployments → Functions/Logs**. Most common causes: wrong `DATABASE_URL` / still contains `channel_binding`, schema not pushed, or `AUTH_SECRET` empty/too short.

## 10. Re-seed before the client meeting

Demo data changes every time it is tried (stock decreases, new orders, outbox messages). 30–60 minutes before the meeting:

```bash
DATABASE_URL="$NEON_URL" NEXT_PUBLIC_SITE_URL='https://releve-demo.vercel.app' \
ADMIN_PASSWORD='releve-demo' pnpm db:seed
```

- Safe to repeat: all tables are TRUNCATEd and refilled (stock, 12 sample orders, voucher, admin).
- Sample orders are created relative to "now" (the last 10 days), so the "today" dashboard looks alive.
- If the schema changed after a code update: run `DATABASE_URL="$NEON_URL" pnpm db:push` first. To drop the schema entirely (rarely needed):

  ```bash
  ALLOW_DB_RESET=true DATABASE_URL="$NEON_URL" pnpm db:reset
  ```
  (`db:reset` calls `db:push` & `db:seed` again; make sure the other variables are also in the shell/`.env.local`.)
- Neon alternative: create a `demo-baseline` **branch** right after seeding, then before the meeting **Reset from parent**/restore the branch — no laptop needed.
- No Vercel redeploy is needed after re-seeding. The admin only needs to log in again if `AUTH_SECRET` changed. The cart on the phone is stored in `localStorage` — clear it first (or open an incognito tab) to start clean.

Full presentation checklist: [`13-demo-script.md`](13-demo-script.md).

## 11. Not yet available / TODO

| Item | Impact | Proposal |
|---|---|---|
| `.env.example` was ignored by `.gitignore` (`.env*`) | The env template was not included in the repo / bundle | Fixed by WS-8: `!.env.example` in `.gitignore` and the file committed |
| `engines` field in `package.json` | Vercel does not know about Node 22 automatically | Set Node 22.x in Project Settings (or add `"engines": {"node": "22.x"}` via a WS-0 PR) |
| Migration files (`src/db/migrations`) | Schema is applied with `push --force` | `pnpm db:generate` + `pnpm db:migrate` before production |
| App-level password protection (Basic Auth) | The demo store is open to anyone with the URL on the Hobby plan | Optional: Basic Auth in `src/proxy.ts` with a `DEMO_BASIC_AUTH` env (does not exist yet) |
| GitHub Actions CI (`04-tech-stack.md`) | No automated checks on PRs | `.github/workflows/ci.yml`: lint, typecheck, test (Postgres 16 service), build |
| In-memory rate limit (`src/lib/services/rate-limit.ts`) | On serverless, the limit is per instance, not global | Enough for the demo; production should use Redis/Upstash or a DB table |
| Separate Storybook (`03-demo.md` §5) | Replaced by the `/[locale]/design-system` page (D-27) | — |
| Real providers (Xendit, Biteship, WABA) | Still "not configured" stubs | See `11-go-live-integrations.md` |
| Shipping webhook (`/api/webhooks/shipping` in `04`) | Route does not exist yet | To be built during the Biteship integration |
