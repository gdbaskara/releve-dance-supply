# 14 — Backup, serah terima & setup lokal

Cara pekerjaan ini disimpan, dipindahkan ke repo GitHub baru, dan dijalankan dari nol di mesin lain.

## 1. Backup: git bundle

Seluruh riwayat git bisa dibawa sebagai satu file `releve-backup.bundle` (file ini **tidak** di-commit; ada di `.gitignore`).

**Membuat / memperbarui bundle** (di folder repo):

```bash
git bundle create releve-backup.bundle --all
git bundle verify releve-backup.bundle
git bundle list-heads releve-backup.bundle   # cek commit terbaru ikut
```

Buat ulang setelah setiap sesi kerja — bundle hanya berisi commit yang sudah ada saat dibuat. Perubahan yang belum di-commit **tidak** ikut.

**Restore dari bundle:**

```bash
git clone releve-backup.bundle releve
cd releve
git log --oneline | head     # pastikan riwayat lengkap
```

Yang **tidak** ada di bundle (sengaja): `node_modules/`, `.next/`, `.env.local` (secret), isi database. Database dibuat ulang dari seed (`pnpm db:seed`) — semua data demo berasal dari `data/**` dan `src/db/seed/*`.

## 2. Push ke repo GitHub baru

1. GitHub → **New repository** → nama mis. `releve-dance-supply`, **Private**, **tanpa** README/.gitignore/license (repo harus kosong).
2. Dari hasil clone bundle:

   ```bash
   cd releve
   git remote remove origin          # origin menunjuk ke file bundle
   git remote add origin git@github.com:<akun>/releve-dance-supply.git
   git push -u origin main
   git push origin --tags            # jika ada tag
   ```
   Atau dengan GitHub CLI: `gh repo create <akun>/releve-dance-supply --private --source=. --push`.
3. Pastikan tidak ada secret yang ikut: `git ls-files | grep -E '^\.env'` hanya boleh menampilkan `.env.example`.
4. Hubungkan ke Vercel: [`12-deploy.md`](12-deploy.md) §4.

## 3. Setup lokal dari nol

### Prasyarat
- **Node.js 22** (LTS). Cek: `node -v`.
- **pnpm 10** — versi dikunci di `package.json` (`packageManager: pnpm@10.28.0`): `corepack enable` lalu `pnpm -v`.
- **PostgreSQL 16**: instal native, **atau** Docker `postgres:16` (paling mudah, lihat di bawah).
- (Untuk E2E) Chromium untuk Playwright.

### Langkah

```bash
# 1. Database (pilih salah satu)
docker compose up -d                 # postgres:16 dari docker-compose.yml: user/pass/db = releve, plus DB releve_test
# — atau tanpa compose —
docker run -d --name releve-pg -p 5432:5432 \
  -e POSTGRES_USER=releve -e POSTGRES_PASSWORD=releve -e POSTGRES_DB=releve postgres:16
docker exec releve-pg createdb -U releve releve_test
# — atau Postgres native —
#   createuser -P releve   (password: releve)
#   createdb -O releve releve && createdb -O releve releve_test

# 2. Env
cp .env.example .env.local
# ganti AUTH_SECRET, WEBHOOK_SECRET, CRON_SECRET dengan: openssl rand -hex 32

# 3. Dependensi
pnpm install

# 4. Skema + data
pnpm db:push        # drizzle-kit push; memakai DATABASE_URL dari shell, default postgres://releve:releve@localhost:5432/releve
pnpm db:seed        # membaca .env.local; 40 produk, 2.903 varian, admin, voucher RELEVE10, 12 order, 3 back-in-stock

# 5. Jalankan
pnpm dev            # http://localhost:3000 → /id ; admin: /admin/login (admin@releve.test / releve-demo)
```

Catatan:
- `pnpm db:push` **tidak** membaca `.env.local`. Jika DB lokalmu bukan URL default, jalankan `DATABASE_URL=postgres://… pnpm db:push`.
- `pnpm db:reset` = drop schema + push + seed. Hanya untuk DB lokal (`localhost`/`127.0.0.1`/`::1`); host lain ditolak kecuali `ALLOW_DB_RESET=true`.
- Beberapa dev server paralel: `NEXT_DIST_DIR=.next-ws3 pnpm next dev -p 3103` (lihat `next.config.ts`).
- Variabel env lengkap & artinya: [`12-deploy.md`](12-deploy.md) §5.

## 4. Menjalankan test

| Perintah | Isi | Butuh |
|---|---|---|
| `pnpm lint` | ESLint | — |
| `pnpm typecheck` | `tsc --noEmit` | — |
| `pnpm test` | Vitest: `tests/unit/**`, `src/**/*.test.ts(x)` | Postgres dengan DB **`releve_test`** (atau `TEST_DATABASE_URL`). Skema dibuat otomatis saat pertama kali (`drizzle-kit push`); file test DB dijalankan bergantian lewat advisory lock. Env test di-set sendiri oleh `tests/unit/services/helpers/env.ts` — tidak memakai `.env.local` |
| `pnpm test:e2e` | Playwright: `tests/e2e/*.spec.ts` (skenario D1–D7), project `mobile` (Pixel 7) & `desktop` (1280×800), 1 worker | Dev server yang **sudah berjalan** dengan DB ter-seed dan `DEMO_MODE=true` |

Playwright tidak menyalakan server sendiri (tidak ada `webServer` di `playwright.config.ts`). Variabel yang dibaca:

| Variabel | Default | Fungsi |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:3000` | URL app yang diuji |
| `PW_CHROMIUM` | `/opt/pw-browsers/chromium` | Path executable Chromium. Di mesin biasa: jalankan `pnpm exec playwright install chromium` lalu arahkan ke binary itu, mis. `PW_CHROMIUM=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome \| head -1)` (macOS: `…/chrome-mac/Chromium.app/Contents/MacOS/Chromium`) |
| `DATABASE_URL` | URL lokal default | Spec membaca/mengembalikan data langsung ke DB (spec admin juga membaca `.env.local`) |

Contoh:

```bash
pnpm db:seed
pnpm dev &                                   # atau di terminal lain
E2E_BASE_URL=http://localhost:3000 PW_CHROMIUM=/path/to/chromium pnpm test:e2e
E2E_BASE_URL=http://localhost:3000 pnpm test:e2e tests/e2e/admin.spec.ts --project=desktop
```

Test E2E mengubah data DB dev (dan berusaha mengembalikannya). Seed ulang sebelum demo.

## 5. Daftar serah terima

- [ ] Repo GitHub private berisi `main` terbaru (atau bundle terbaru + `git bundle verify` OK).
- [ ] `.env.example` ada di repo; `.env.local` / secret **tidak** ada.
- [ ] Neon project + connection string (direct & pooled) dicatat di password manager.
- [ ] Vercel project terhubung ke repo, env vars terisi (`12-deploy.md` §5), Cron aktif.
- [ ] Kredensial admin demo diserahkan terpisah dari URL.
- [ ] Dokumen: `00`–`10` spesifikasi, `11` integrasi go-live, `12` deploy, `13` naskah demo, `14` ini.
- [ ] Pertanyaan terbuka Q-01..Q-09 (`10-decisions.md`) dikirim ke klien.
