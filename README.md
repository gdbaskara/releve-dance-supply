# Relevé Dance Supply — spesifikasi demo

Web toko sepatu dansa & dancewear **Só Dança** untuk pasar Indonesia (reseller independen). Repo ini saat ini berisi **paket spesifikasi lengkap — belum ada kode aplikasi.**

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
