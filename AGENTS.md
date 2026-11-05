# AGENTS.md — aturan untuk agent yang membangun proyek ini

Baca berurutan sebelum menulis kode: `docs/00-brief.md` → `docs/09-work-plan.md` (cari workstream kamu) → dokumen yang dirujuk workstream itu.

## Sumber kebenaran
| Hal | File |
|---|---|
| Apa yang dibangun & AC | `docs/02-requirements.md` |
| Lingkup demo & skenario uji | `docs/03-demo.md` |
| Stack, struktur, konvensi, env | `docs/04-tech-stack.md` |
| Skema DB, state machine, kontrak provider, template WA | `docs/05-data-and-contracts.md` |
| Token, komponen, copy | `docs/07-design-system.md`, `design-system/*` |
| Halaman & alur | `docs/08-pages-and-flows.md` |
| Data seed | `data/**` (jangan diedit manual; regenerasi lewat `scripts/build_catalog.py`) |

Jika dokumen saling bertentangan: `00-brief` > `02-requirements` > dokumen lain. Catat konflik & keputusanmu di `docs/10-decisions.md`.

## Aturan keras (gagal review jika dilanggar)
1. **Tidak ada COD** — tidak ada enum, opsi, teks, atau kode untuk COD/bayar di tempat.
2. **Tidak ada cicilan/paylater** di v1.
3. **Tidak ada klaim** "Official", "Authorized", "Resmi Só Dança", "Só Dança Indonesia"; logo Só Dança tidak dipakai sebagai logo toko. Daftar lengkap: `design-system/glossary.json` → `forbidden_strings`.
4. **Harga & total dihitung di server.** Jangan percaya angka dari klien.
5. **Stok tidak boleh oversell** — reservasi atomik (`05` §4).
6. **Tidak ada string UI hard-coded** — semua lewat next-intl; key id & en harus sama.
7. **Hanya token** untuk warna/spasi/radius/font. Hijau WhatsApp hanya untuk elemen WA.
8. Uang = integer Rupiah; tampilan lewat `formatIDR()`; waktu tampil WIB.
9. Semua integrasi eksternal lewat interface provider; demo memakai mock; secret tidak pernah di-commit.
10. Gambar referensi sodanca.com hanya jika `DEMO_USE_REFERENCE_IMAGES=true` (presentasi internal).

## Cara kerja
- Kerjakan hanya folder milik workstream-mu (`09-work-plan.md`). Kontrak bersama diubah lewat PR terpisah.
- Commit: `feat(<FR-ID>): …` / `fix(<FR-ID>): …`. PR menyebut FR yang selesai + screenshot mobile (390×844) untuk UI.
- Sebelum PR: `pnpm lint && pnpm typecheck && pnpm test` (dan `pnpm test:e2e` untuk WS-4/5/6).
- Ragu soal perilaku → ikuti AC di `02-requirements.md`; tidak ada AC → pilih yang paling sederhana & catat di `10-decisions.md`.
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
