# 15 — Demo deploy to `releve.gdbaskara.dev` (Mac + Cloudflare Tunnel + Access)

Same pattern as `reel.gdbaskara.dev`: the app runs on a Mac, is exposed through **Cloudflare Tunnel**, and is protected by **Cloudflare Access** (log in first before it can be opened).

```
Browser ──▶ Cloudflare (releve.gdbaskara.dev) ──Access login──▶ Tunnel ──▶ Mac: Next.js :3000 ──▶ Postgres 16 (local)
```

## 1. Prepare the Mac (one time only)

```bash
brew install node@22 pnpm postgresql@16 cloudflared
brew services start postgresql@16
createuser -s releve && psql postgres -c "ALTER USER releve WITH PASSWORD 'releve';"
createdb -O releve releve
```

## 2. Get the code & configure

```bash
git clone https://github.com/gdbaskara/releve-dance-supply.git ~/apps/releve
cd ~/apps/releve
cp .env.example .env.local
```

Change in `.env.local`:

| Var | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://releve.gdbaskara.dev` |
| `AUTH_SECRET`, `WEBHOOK_SECRET`, `CRON_SECRET` | each `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | demo admin password (not `releve-demo`) |
| `NEXT_PUBLIC_WA_NUMBER` | business WA number, format `628…` |
| `DEMO_MODE`, `NEXT_PUBLIC_DEMO_MODE` | `true` (payment simulation buttons) |

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm build
```

## 3. Keep it running (pm2)

```bash
npm i -g pm2
pm2 start "pnpm start -p 3000" --name releve --cwd ~/apps/releve
pm2 save && pm2 startup   # follow the printed command so it auto-starts when the Mac boots
```

Check: `curl -I http://localhost:3000/id` → 200.

> Don't let the Mac sleep during the demo: System Settings → Energy → "Prevent automatic sleeping when the display is off".

## 4. Cloudflare Tunnel

If this Mac **already has a tunnel** for Reel Studio, just add a new hostname to the same tunnel:

```bash
cloudflared tunnel list                       # see the name of the tunnel used by reel
cloudflared tunnel route dns <TUNNEL_NAME> releve.gdbaskara.dev
```

Then add to `~/.cloudflared/config.yml` (above the `http_status:404` rule):

```yaml
ingress:
  - hostname: reel.gdbaskara.dev
    service: http://localhost:<port-reel>
  - hostname: releve.gdbaskara.dev
    service: http://localhost:3000
  - service: http_status:404
```

```bash
sudo launchctl kickstart -k system/com.cloudflare.cloudflared   # or: brew services restart cloudflared
```

If the tunnel is managed from the **dashboard** (Zero Trust → Networks → Tunnels): open the reel tunnel → *Public Hostname* → *Add*: subdomain `releve`, domain `gdbaskara.dev`, service `HTTP` → `localhost:3000`.

## 5. Cloudflare Access (login protection)

Zero Trust → Access → Applications → *Add an application* → Self-hosted:
- Domain: `releve.gdbaskara.dev`
- Policy: copy the policy from the **reel** application (allowed emails, e.g. your email + the client's email).
- **Bypass** for webhooks (later, when Xendit goes live): path `releve.gdbaskara.dev/api/webhooks/*` with the *Bypass* action, because Xendit cannot log in through Access.

## 6. Updating the demo

```bash
cd ~/apps/releve && git pull && pnpm install && pnpm db:push && pnpm build && pm2 restart releve
pnpm db:reset    # clean demo data before a presentation (local DB only)
```

## Notes
- Expired orders are cleaned up automatically when read; for a periodic sweep add a Mac cron: `*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/expire`.
- DB backup: `pg_dump releve > releve-$(date +%F).sql`.
