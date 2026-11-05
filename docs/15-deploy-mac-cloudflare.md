# 15 — Deploy demo ke `releve.gdbaskara.dev` (Mac + Cloudflare Tunnel + Access)

Pola yang sama dengan `reel.gdbaskara.dev`: aplikasi jalan di Mac, diekspos lewat **Cloudflare Tunnel**, dan dilindungi **Cloudflare Access** (login dulu sebelum bisa buka).

```
Browser ──▶ Cloudflare (releve.gdbaskara.dev) ──Access login──▶ Tunnel ──▶ Mac: Next.js :3000 ──▶ Postgres 16 (lokal)
```

## 1. Siapkan Mac (sekali saja)

```bash
brew install node@22 pnpm postgresql@16 cloudflared
brew services start postgresql@16
createuser -s releve && psql postgres -c "ALTER USER releve WITH PASSWORD 'releve';"
createdb -O releve releve
```

## 2. Ambil kode & konfigurasi

```bash
git clone https://github.com/gdbaskara/releve-dance-supply.git ~/apps/releve
cd ~/apps/releve
cp .env.example .env.local
```

Ubah di `.env.local`:

| Var | Nilai |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://releve.gdbaskara.dev` |
| `AUTH_SECRET`, `WEBHOOK_SECRET`, `CRON_SECRET` | masing-masing `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | password admin demo (bukan `releve-demo`) |
| `NEXT_PUBLIC_WA_NUMBER` | nomor WA bisnis, format `628…` |
| `DEMO_MODE`, `NEXT_PUBLIC_DEMO_MODE` | `true` (tombol simulasi bayar) |

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm build
```

## 3. Jalankan terus-menerus (pm2)

```bash
npm i -g pm2
pm2 start "pnpm start -p 3000" --name releve --cwd ~/apps/releve
pm2 save && pm2 startup   # ikuti perintah yang dicetak agar auto-start saat Mac nyala
```

Cek: `curl -I http://localhost:3000/id` → 200.

> Mac jangan sleep saat demo: System Settings → Energy → "Prevent automatic sleeping when the display is off".

## 4. Cloudflare Tunnel

Kalau Mac ini **sudah punya tunnel** untuk Reel Studio, cukup tambah hostname baru ke tunnel yang sama:

```bash
cloudflared tunnel list                       # lihat nama tunnel yang dipakai reel
cloudflared tunnel route dns <NAMA_TUNNEL> releve.gdbaskara.dev
```

Lalu tambahkan ke `~/.cloudflared/config.yml` (di atas aturan `http_status:404`):

```yaml
ingress:
  - hostname: reel.gdbaskara.dev
    service: http://localhost:<port-reel>
  - hostname: releve.gdbaskara.dev
    service: http://localhost:3000
  - service: http_status:404
```

```bash
sudo launchctl kickstart -k system/com.cloudflare.cloudflared   # atau: brew services restart cloudflared
```

Kalau tunnel dikelola dari **dashboard** (Zero Trust → Networks → Tunnels): buka tunnel reel → *Public Hostname* → *Add*: subdomain `releve`, domain `gdbaskara.dev`, service `HTTP` → `localhost:3000`.

## 5. Cloudflare Access (proteksi login)

Zero Trust → Access → Applications → *Add an application* → Self-hosted:
- Domain: `releve.gdbaskara.dev`
- Policy: salin policy dari aplikasi **reel** (email yang diizinkan, mis. email kamu + email klien).
- **Bypass** untuk webhook (nanti saat Xendit live): path `releve.gdbaskara.dev/api/webhooks/*` dengan action *Bypass*, karena Xendit tidak bisa login Access.

## 6. Update demo

```bash
cd ~/apps/releve && git pull && pnpm install && pnpm db:push && pnpm build && pm2 restart releve
pnpm db:reset    # data demo bersih sebelum presentasi (hanya DB lokal)
```

## Catatan
- Expired order dibersihkan otomatis saat dibaca; untuk sweep berkala tambahkan cron Mac: `*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/expire`.
- Backup DB: `pg_dump releve > releve-$(date +%F).sql`.
