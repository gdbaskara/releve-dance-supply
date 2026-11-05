# 12 — Deploy demo: Vercel + Neon Postgres

Tujuan: satu URL demo (Vercel) dengan database Postgres (Neon) yang berisi data seed, siap dibuka klien di HP & laptop. Semua integrasi eksternal tetap **mock** (`03-demo.md` §2). Untuk menyambung integrasi asli lihat [`11-go-live-integrations.md`](11-go-live-integrations.md).

Ringkasan urutan:

1. Push repo ke GitHub (lihat [`14-backup-and-handover.md`](14-backup-and-handover.md) §2).
2. Buat database Neon → ambil connection string.
3. Isi skema & data ke Neon dari laptop (`pnpm db:push`, `pnpm db:seed`).
4. Import repo di Vercel, isi env vars, deploy.
5. Set `NEXT_PUBLIC_SITE_URL` ke URL final → redeploy.
6. Lindungi URL preview, uji cepat, bagikan ke klien.

---

## 1. Prasyarat

- Akun GitHub, Vercel, Neon (paket gratis cukup untuk demo).
- Di laptop: Node 22, pnpm 10 (`corepack enable`), repo sudah ter-install (`pnpm install`) dan punya `.env.local` (lihat `14` §3).
- `openssl` untuk membuat secret.

## 2. Buat database Neon

1. Neon Console → **New Project**. Nama: `releve-demo`. Postgres **16** (atau versi terbaru yang ditawarkan). Region: **AWS Asia Pacific (Singapore) `ap-southeast-1`** — dekat dengan pembeli Indonesia dan dengan region fungsi Vercel `sin1` yang dikunci di `vercel.json`.
2. Database default boleh diganti nama menjadi `releve` (opsional).
3. **Connect** → salin connection string. Ada dua jenis:
   - **Pooled** (host berisi `-pooler`) → dipakai **di Vercel** (fungsi serverless membuka banyak koneksi pendek).
   - **Direct** (tanpa `-pooler`) → dipakai **dari laptop** untuk `db:push` dan `db:seed`.
4. Pastikan string berakhiran `?sslmode=require`. Jika Neon menambahkan `&channel_binding=require`, **hapus bagian itu**: driver `postgres` (postgres.js) yang dipakai app meneruskan parameter URL yang tidak dikenal ke server dan koneksi bisa gagal. Contoh akhir:

   ```
   postgres://neondb_owner:xxxxx@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/releve?sslmode=require
   postgres://neondb_owner:xxxxx@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/releve?sslmode=require
   ```

> Catatan: proyek ini memakai `drizzle-kit push` (tanpa file migrasi, D-20). Itu cukup untuk demo. Sebelum produksi, buat migrasi dengan `pnpm db:generate` dan jalankan `pnpm db:migrate`.

## 3. Isi skema & data ke Neon (dari laptop)

Skrip yang relevan (`package.json`):

| Skrip | Isi | Catatan |
|---|---|---|
| `pnpm db:push` | `drizzle-kit push --force` | Membaca `DATABASE_URL` dari **environment shell** (`drizzle.config.ts`; tidak membaca `.env.local`). Default-nya DB lokal. |
| `pnpm db:seed` | `tsx --env-file=.env.local src/db/seed/index.ts` | **Wajib ada** `.env.local`. Variabel yang sudah ada di shell **menang** atas isi `.env.local`, jadi Neon bisa ditarget dengan prefix `DATABASE_URL=… pnpm db:seed`. Idempoten: TRUNCATE semua tabel lalu isi ulang. |
| `pnpm db:reset` | `reset.ts` (DROP SCHEMA) → push → seed | `src/db/seed/reset.ts` **menolak host non-lokal** kecuali `ALLOW_DB_RESET=true`. Untuk Neon biasanya tidak perlu — `db:seed` sudah menghapus semua data. |

Jalankan (pakai connection string **direct**):

```bash
export NEON_URL='postgres://neondb_owner:xxxxx@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/releve?sslmode=require'

# 1) skema
DATABASE_URL="$NEON_URL" pnpm db:push

# 2) data: 40 produk, 2.903 varian, 1 admin, voucher RELEVE10, 12 order contoh, 3 permintaan back-in-stock
DATABASE_URL="$NEON_URL" \
NEXT_PUBLIC_SITE_URL='https://releve-demo.vercel.app' \
ADMIN_EMAIL='admin@releve.test' \
ADMIN_PASSWORD='releve-demo' \
DEMO_USE_REFERENCE_IMAGES=false \
pnpm db:seed
```

Kenapa variabel selain `DATABASE_URL` ikut di-set saat seed:

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (atau `ADMIN_PASSWORD_HASH`) — admin **disimpan di tabel `admin_users` saat seed** (bcrypt). Login di Vercel membaca dari DB, bukan dari env Vercel. Ganti password = seed ulang dengan nilai baru.
- `NEXT_PUBLIC_SITE_URL` — link di pesan WA outbox milik 12 order contoh dibuat saat seed.
- `DEMO_USE_REFERENCE_IMAGES` — URL gambar produk ditulis ke DB saat seed. `true` hanya untuk presentasi internal (AGENTS.md aturan 10); untuk link yang dibagikan ke klien biarkan `false`.

Seed berhasil jika log terakhir menyebut jumlah produk, varian, admin, voucher, order, dan pesan outbox.

## 4. Hubungkan GitHub → Vercel

1. Vercel Dashboard → **Add New… → Project** → **Import Git Repository** → pilih repo (izinkan Vercel GitHub App mengakses repo itu).
2. Framework: **Next.js** (terdeteksi; juga dikunci di `vercel.json`). Root directory: `./`.
3. Install command `pnpm install --frozen-lockfile`, build command `pnpm build` (sudah di `vercel.json`). Versi pnpm diambil dari field `packageManager` (`pnpm@10.28.0`).
4. **Settings → General → Node.js Version: 22.x** (repo belum punya field `engines`).
5. Isi **Environment Variables** (§5) untuk environment **Production** dan **Preview** sebelum klik **Deploy**.
6. Setelah terhubung: setiap push ke `main` = deploy Production; setiap branch/PR = deploy Preview dengan URL sendiri. Preview memakai DB yang sama kecuali kamu memberi `DATABASE_URL` berbeda untuk environment Preview (disarankan: Neon **branch** terpisah untuk preview).

## 5. Environment variables

Semua nama di bawah diambil dari `.env.example` dan dari kode (`src/**`). Buat secret dengan:

```bash
openssl rand -hex 32
```

| Variabel | Isi di Vercel | Dipakai di | Catatan |
|---|---|---|---|
| `DATABASE_URL` | Connection string Neon **pooled** (`…-pooler…?sslmode=require`, tanpa `channel_binding`) | `src/db/index.ts` | Rahasia |
| `DEMO_MODE` | `true` | `src/lib/providers/env.ts` | Mengaktifkan tombol "Simulasikan Bayar/Kedaluwarsa", `POST /api/demo/simulate-payment`, dan membuka `/api/cron/expire` untuk semua pemanggil |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | layout `(store)` & `(checkout)` | Banner "Mode demo — pembayaran & pengiriman disimulasikan." **Dibaca saat build** → redeploy setelah diubah |
| `DEMO_USE_REFERENCE_IMAGES` | `false` | seed, provider env | Lihat §3; nilai yang menentukan adalah nilai **saat seed** |
| `PAYMENT_PROVIDER` | `mock` | `src/lib/providers` | `xendit` masih stub ("not configured") |
| `SHIPPING_PROVIDER` | `mock` | `src/lib/providers` | `biteship` masih stub |
| `MESSAGING_PROVIDER` | `outbox` | `src/lib/providers` | `waba` masih stub. Pesan WA keluar tampil di Admin → WA outbox |
| `NEXT_PUBLIC_WA_NUMBER` | Nomor WA demo, format `62…` tanpa `+` (mis. `6281200000000`) | `src/lib/wa` | Tombol "Tanya via WA" membuka wa.me ke nomor ini — pakai nomor yang benar-benar dipegang tim saat demo (Q-04). Build-time |
| `NEXT_PUBLIC_SITE_URL` | URL final tanpa `/` di akhir, mis. `https://releve-demo.vercel.app` | `src/lib/providers/env.ts` (link checkout admin, link bayar di WA, redirect e-wallet/3DS mock) | Build-time; lihat §6 |
| `ADMIN_EMAIL` | `admin@releve.test` | seed | Tidak dipakai saat runtime (login membaca DB) — boleh diisi agar konsisten |
| `ADMIN_PASSWORD` | Password admin demo | seed | Sama: hanya berpengaruh saat seed. Alternatif: `ADMIN_PASSWORD_HASH` (bcrypt) agar password polos tidak tersimpan |
| `AUTH_SECRET` | `openssl rand -hex 32` | `src/lib/auth/session.ts` | Tanda tangan cookie admin `rds_admin` (min. 16 karakter). Mengganti nilai = semua sesi admin logout |
| `WEBHOOK_SECRET` | `openssl rand -hex 32` | provider pembayaran mock | HMAC header `x-mock-signature` di `POST /api/webhooks/payment` |
| `CRON_SECRET` | `openssl rand -hex 32` | `GET /api/cron/expire` | Vercel Cron otomatis mengirim `Authorization: Bearer $CRON_SECRET` jika variabel ini ada (§7) |

Belum dibutuhkan untuk demo (disebut di `04-tech-stack.md`, belum dibaca kode): `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN`, `BITESHIP_API_KEY`. Hanya untuk skrip lokal: `ALLOW_DB_RESET`, `TEST_DATABASE_URL`, `E2E_BASE_URL`, `PW_CHROMIUM`, `NEXT_DIST_DIR`.

## 6. `NEXT_PUBLIC_SITE_URL` dan domain

1. Deploy pertama boleh memakai nilai sementara. Setelah deploy, Vercel memberi domain production `https://<project>.vercel.app` (Settings → Domains; bisa diganti nama, mis. `releve-demo.vercel.app`, atau pakai custom domain).
2. Isi `NEXT_PUBLIC_SITE_URL` dengan domain itu → **Deployments → … → Redeploy** (variabel `NEXT_PUBLIC_*` ditanam saat build).
3. Seed ulang Neon dengan `NEXT_PUBLIC_SITE_URL` yang sama (§3) agar link di pesan WA order contoh juga benar.
4. Untuk deploy **Preview**, link di pesan WA & checkout link tetap mengarah ke domain production — wajar untuk demo.

## 7. Vercel Cron → `/api/cron/expire`

`vercel.json`:

```json
"crons": [{ "path": "/api/cron/expire", "schedule": "0 20 * * *" }]
```

- `0 20 * * *` = sekali sehari pukul 20:00 UTC (**03:00 WIB**). Paket **Hobby** Vercel hanya mengizinkan cron **harian** (deploy gagal jika jadwal lebih sering), jadi ini jadwal yang aman di semua paket.
- Itu cukup karena order kedaluwarsa juga **disapu secara lazy** (`src/lib/services/expiry.ts`): setiap kali order dibaca (halaman bayar/sukses/lacak/admin), dan pada `getProduct` / `validateCart` (maks. sekali per 30 detik). Stok yang direservasi order kedaluwarsa sudah kembali sebelum pembeli berikutnya melihat PDP atau checkout. Cron hanya pembersih latar.
- Di paket **Pro**, ganti ke `*/5 * * * *` (tiap 5 menit) jika ingin dashboard admin selalu mutakhir tanpa menunggu ada yang membuka halaman. Jangan tiap menit — tidak perlu (keputusan D-28).
- Autentikasi: route menerima `Authorization: Bearer $CRON_SECRET`; **saat `DEMO_MODE=true` semua pemanggil diterima** (supaya bisa dipicu manual saat demo). Uji manual:

  ```bash
  curl -s -H "Authorization: Bearer $CRON_SECRET" https://releve-demo.vercel.app/api/cron/expire
  # {"ok":true,"expired":[]}
  ```

- Cron Vercel hanya berjalan di deployment **Production**. Riwayat: Project → Settings → Cron Jobs.

## 8. Lindungi URL demo

Toko demo tidak punya login pembeli; yang terkunci hanya `/admin` (login email + password dari seed). Pilihan, dari yang paling sederhana:

1. **Vercel Deployment Protection** (Settings → Deployment Protection):
   - **Vercel Authentication — Standard Protection**: semua deployment Preview dan URL deployment otomatis hanya bisa dibuka anggota tim Vercel yang login. Bisa dipakai di Hobby. Kurang cocok untuk klien yang tidak punya akun Vercel.
   - **Password Protection**: satu password untuk semua orang — paling cocok untuk klien. Tersedia di paket Pro (add-on) / Enterprise.
   - **Shareable Links** (Protection Bypass): dari halaman deployment → **Share** → salin link yang berisi token bypass; klien bisa membuka deployment yang diproteksi tanpa login. Cabut setelah demo.
2. **Tanpa paket berbayar**: pakai domain production yang tidak ditebak (mis. `releve-demo-7f3k.vercel.app`), jangan pasang link di mana pun, dan pastikan data hanya data contoh. Ini *obscurity*, bukan proteksi.
3. Password sederhana di level app (Basic Auth di `src/proxy.ts`) **belum ada** — lihat "Belum ada / TODO".

Hal lain:
- Jangan pakai password admin `releve-demo` untuk link yang dibagikan di luar meeting. Seed ulang dengan `ADMIN_PASSWORD` lain dan kirim kredensial ke klien terpisah (`03-demo.md` §5).
- Jika `DEMO_USE_REFERENCE_IMAGES=true` pernah dipakai, URL itu **hanya** untuk presentasi internal.
- `DEMO_MODE=true` berarti siapa pun yang punya URL bisa menyimulasikan pembayaran. Itu memang tujuan demo; **wajib `false` di produksi**.

## 9. Uji cepat setelah deploy

| Cek | Hasil |
|---|---|
| Buka `/` | Redirect ke `/id`, banner mode demo tampil |
| `/id/p/diamond-sd140` | Harga Rp, ukuran & stok tampil (DB terhubung) |
| `/en/p/claudia-satin-sd09` | UI Inggris, pilihan shank |
| `/admin/login` | Login dengan kredensial seed → Dashboard |
| `/id/design-system` | Showcase design system |
| `curl …/api/cron/expire` | `{"ok":true,…}` |
| Checkout D1 singkat → "Simulasikan Bayar Berhasil" | Halaman sukses; Admin → WA outbox berisi "Pembayaran diterima" |

Jika halaman error 500: cek **Deployments → Functions/Logs**. Penyebab paling umum: `DATABASE_URL` salah / masih berisi `channel_binding`, skema belum di-push, atau `AUTH_SECRET` kosong/pendek.

## 10. Re-seed sebelum meeting klien

Data demo berubah setiap kali dicoba (stok berkurang, order baru, pesan outbox). 30–60 menit sebelum meeting:

```bash
DATABASE_URL="$NEON_URL" NEXT_PUBLIC_SITE_URL='https://releve-demo.vercel.app' \
ADMIN_PASSWORD='releve-demo' pnpm db:seed
```

- Aman diulang: semua tabel di-TRUNCATE lalu diisi ulang (stok, 12 order contoh, voucher, admin).
- Order contoh dibuat relatif terhadap "sekarang" (10 hari terakhir), jadi dashboard "hari ini" terlihat hidup.
- Jika skema berubah setelah update kode: jalankan `DATABASE_URL="$NEON_URL" pnpm db:push` dulu. Untuk menghapus skema sepenuhnya (jarang perlu):

  ```bash
  ALLOW_DB_RESET=true DATABASE_URL="$NEON_URL" pnpm db:reset
  ```
  (`db:reset` memanggil `db:push` & `db:seed` lagi; pastikan variabel lain juga ada di shell/`.env.local`.)
- Alternatif Neon: buat **branch** `demo-baseline` tepat setelah seed, lalu sebelum meeting **Reset from parent**/restore branch — tidak perlu laptop.
- Tidak perlu redeploy Vercel setelah seed ulang. Admin perlu login ulang hanya jika `AUTH_SECRET` berubah. Keranjang di HP disimpan di `localStorage` — kosongkan dulu (atau buka tab incognito) agar mulai bersih.

Checklist presentasi lengkap: [`13-demo-script.md`](13-demo-script.md).

## 11. Belum ada / TODO

| Item | Dampak | Usulan |
|---|---|---|
| `.env.example` sempat ter-ignore oleh `.gitignore` (`.env*`) | Template env tidak ikut di repo / bundle | Diperbaiki oleh WS-8: `!.env.example` di `.gitignore` dan file di-commit |
| Field `engines` di `package.json` | Vercel tidak tahu Node 22 secara otomatis | Set Node 22.x di Project Settings (atau tambah `"engines": {"node": "22.x"}` lewat PR WS-0) |
| File migrasi (`src/db/migrations`) | Skema diterapkan dengan `push --force` | `pnpm db:generate` + `pnpm db:migrate` sebelum produksi |
| Proteksi password level app (Basic Auth) | Toko demo terbuka bagi yang punya URL di paket Hobby | Opsional: Basic Auth di `src/proxy.ts` dengan env `DEMO_BASIC_AUTH` (belum ada) |
| CI GitHub Actions (`04-tech-stack.md`) | Tidak ada cek otomatis di PR | `.github/workflows/ci.yml`: lint, typecheck, test (service Postgres 16), build |
| Rate limit in-memory (`src/lib/services/rate-limit.ts`) | Di serverless, batas per instance, bukan global | Cukup untuk demo; produksi pakai Redis/Upstash atau tabel DB |
| Storybook terpisah (`03-demo.md` §5) | Diganti halaman `/[locale]/design-system` (D-27) | — |
| Provider asli (Xendit, Biteship, WABA) | Masih stub "not configured" | Lihat `11-go-live-integrations.md` |
| Webhook pengiriman (`/api/webhooks/shipping` di `04`) | Route belum ada | Dibuat saat integrasi Biteship |
