# Pricing & Markup Model — Relevé Dance Supply (demo)

Status: **research + working assumptions**, 5 Nov 2026. Tax/duty figures **must be verified** with a PPJK (customs broker) & a tax consultant before being used for live prices.
The configuration can be changed in `data/catalog/pricing_config.json` → regenerate the catalog.

---

## 1. Exchange rate

- Spot USD/IDR **± Rp18.140** (mid-market 4 Nov 2026; the rupiah moved between Rp18.100–18.180 during the day). Sources: [CNBC Indonesia](https://cnbcindonesia.com/market/20261104150643-17-782298/rupiah-ditutup-di-level-rp18155-per-dolar-as), [Pluang](https://pluang.com/en/tools/currency-converter/usd-idr), [Bisnis.com](https://market.bisnis.com/kurs).
- **Planning rate: Rp18.500** (spot + ±2% buffer for bank/international transfer spreads & fluctuation while goods are in transit).
- Rule: review prices if the rate moves > 3% from the planning rate.

## 2. Import cost components (official import route, using NPWP (tax ID) + NIB/API (importer/business ID))

| Component | Assumption | Notes |
|---|---|---|
| Purchase price (FOB) | **50% of US retail price (MSRP)** | Industry-standard wholesale/B2B price (keystone). See §5 — this is the most critical assumption |
| International shipping + insurance | **12% of FOB** | Air cargo from the US/Brazil, small-to-medium shipments |
| **Bea Masuk (import duty, BM)** | **25% of CIF** | Footwear HS 64xx is generally 20–30% (depending on sub-heading); apparel HS 61 ±25%. No FTA with the US/Brazil → MFN rate. **Check the 8-digit HS at [INSW/BTKI](https://insw.go.id)** |
| **PPN impor (import VAT)** | **11% effective** on (CIF + BM) | 12% rate × 11/12 tax base. So it is a **cost** if the store is not yet PKP (VAT-registered business); it becomes a **tax credit** once PKP |
| **PPh 22 impor (import income-tax prepayment)** | **2.5%** (with API) / 7.5% (without API) | **Not a cost** — prepaid tax, credited against annual income tax. But it ties up cash flow. Some consumer goods may be subject to 10% → check |
| PPJK, handling, warehouse, trucking | **4% of CIF** | Broker services, airport fees, delivery to the Jakarta warehouse |
| Lartas (restricted-goods rules) / import permit | — | Footwear & apparel may fall under prohibited/restricted goods (Import Approval / surveyor report). **Must be checked with the PPJK** |

General calculation sources: [ARMOCargo](https://armocargo.com/blog/cara-menghitung-bea-masuk-nilai-impor-cif-rumus-contoh-lengkap-2026/), [Klikpajak](https://klikpajak.id/blog/pajak-bea-cukai-2021-menghitung-bea-masuk-dan-pajak-impor-belanja-online/), [Indo Express (2026 regulations)](https://www.indoexpress.co.id/regulasi-impor-indonesia.html), [ImportResmi (PPh 22)](https://www.importresmi.com/post/pajakimpornaik). These sources are blogs/vendors and their figures sometimes differ → **verify**.

### Formula

```
FOB         = MSRP_USD × 50%
CIF         = FOB × 1.12
BM          = CIF × 25%
PPN impor   = (CIF + BM) × 11%          ← cost if non-PKP
Handling    = CIF × 4%
Landed (USD)= CIF + BM + Handling (+ PPN impor if non-PKP)
Landed (IDR)= Landed USD × 18.500
Selling price = Landed IDR × Multiplier, rounded up to Rp5.000
```

Result: **landed cost ≈ 0.80 × MSRP** (non-PKP) → per $1 MSRP ≈ **Rp14.790** of cost.

## 3. A proper markup

Fashion/sports retail benchmarks: **gross margin 35–50%**, **net profit 10–25%**. "Multiple times" (2×) is usually calculated from the **wholesale price**, not from landed cost. Measured from landed cost, importing already eats up ±60% of the wholesale price.

Operating costs the margin must cover:

| Cost | % of sales |
|---|---|
| Payment gateway (Xendit; QRIS ±0.7%, VA flat, card ±2.9%) | ±2% (blended) |
| Overhead (Jakarta warehouse rent, WA admin, photography, ads, packaging) | ±12% |
| Stock risk (sizes that don't sell, damage, returns) | ±5% |
| SME final income tax (PP 55/2022, the final 0.5% SME tax, if turnover < Rp4,8 M (billion)/year) | 0.5% |

**Multipliers used (on landed cost):**

| Group | Multiplier | Gross margin | Est. net profit | Rationale |
|---|---|---|---|---|
| Pointe | **1.45×** | ±31% | **±12%** | Consumable item (dancers replace them every few weeks/months), heavily price-compared → thin margin, serves as a traffic & repeat-order magnet |
| Other shoes (ballet, jazz, tap, character, latin) | **1.65×** | ±39% | **±20%** | Core business |
| Leotards, skirts, tops | **1.80×** | ±44% | **±25%** | Fashion, less price-compared, many color variants |
| Tights & accessories | **1.80×** | ±44% | **±25%** | Add-on items, low value |

Seen relative to US prices: **shoes ≈ 1.35× MSRP**, **dancewear ≈ 1.47×**, **pointe ≈ 1.18×** (in Rupiah at the spot rate).

## 4. Worked examples

**SD16 Stretch Canvas Ballet (Kids) — MSRP $27.50**
FOB $13.75 → CIF $15.40 → BM $3.85 → PPN impor $2.12 → handling $0.62 → landed **$21.98 = Rp406.700**
× 1.65 = **Rp675.000**. Gross margin 40%, est. net ±20% (± Rp135.000/pair).

**Alina I Pointe P88 — MSRP $140**
landed **Rp2.070.000** × 1.45 = **Rp3.005.000**. Est. net ±12% (± Rp350.000/pair).

Full table of 40 models: `data/catalog/README.md`.

## 5. Market price check (Indonesian marketplaces)

| Product | US price | Price in Indonesia (listing) | Our model |
|---|---|---|---|
| Só Dança SD16 stretch canvas | $27.50 (≈Rp499rb; rb = thousand) | **Rp460rb – Rp555rb** (Tokopedia) | Rp675rb |
| Bloch Suprima pointe | ±$126–151 | **Rp1,2 – 1,5 jt** (jt = million) | — |
| Bloch Triomphe pointe | — | Rp1,6 jt | — |
| Capezio Contempora / Pavlowa pointe | ±$112 | Rp1,55 jt / Rp1,1 jt (Shopee) | — |
| Só Dança Alina pointe | $140 | (not found) | **Rp3,0 jt** |
| Tap shoes (other brands) | — | Rp1,07 – 1,2 jt | Theo Rp930rb |

Sources: [Tokopedia SD16 – Mainstream](https://www.tokopedia.com/mainstream/sepatu-ballet-so-danca-canvas-elastic-premium-6-5-c-standart), [Tokopedia "bloch"](https://www.tokopedia.com/find/bloch), [Tokopedia "pointe shoes"](https://www.tokopedia.com/find/pointe-shoes), [Tokopedia BDS Indonesia](https://www.tokopedia.com/bdsindonesiaofficial), [BigGo](https://biggo.id/s/pointe+shoes+ballet/), [ThePointeShop](https://thepointeshop.com/collections/bloch). Marketplace listings may have changed since.

**Market conclusions:**
1. **Non-pointe shoes & dancewear**: our prices are ±20–25% above marketplace listings. Still reasonable for the premium segment (clear stock, size consultation, fast shipping from Jakarta, guaranteed original goods), but **do not go any higher**.
2. **Pointe = a problem.** Bloch/Capezio pointe shoes sell in Indonesia for **Rp1,1–1,6 jt** — cheaper than their US price. This means the official distributors get purchase prices well below 50% of MSRP. Alina at Rp3 jt will not be competitive. Options: (a) Só Dança pointe as a **pre-order/niche** item for dancers whose feet genuinely suit them, not a flagship; (b) find a cheaper purchase price (buy from Brazil/the country of origin, volume); (c) lower the pointe multiplier to ±1.25× (net approaching 0–5%).
3. **Local resellers selling SD16 at Rp460–555rb** probably get a cheaper purchase price than we assume, or do not use the official import route (personal shoppers/hand-carried goods). We stay on the official route (NPWP) — that is a selling point (legal goods, with an invoice).

## 6. The most critical factor: purchase price

| Scenario | Purchase price | Landed cost | SD16 sold at | Viable? |
|---|---|---|---|---|
| **A. Wholesale/B2B account** (model assumption) | 50% MSRP | ±0.80× MSRP | Rp675rb | ✅ |
| B. Buy retail during a promo/sale | ±75% MSRP | ±1.20× MSRP | ±Rp1,0 jt | ⚠️ difficult |
| C. Buy retail at normal price | 100% MSRP | ±1.60× MSRP | ±Rp1,34 jt | ❌ 2.5× market price |

So even though it is **not an official reseller**, the store **must get wholesale pricing** (Só Dança has a B2B portal for retailers — it usually requires business details, but you don't have to be an official distributor). Without it, prices will not be competitive. **This needs to be confirmed with the client.**

## 7. PKP or non-PKP

- **Non-PKP (model default)**: turnover < Rp4,8 M/year, pay 0.5% final income tax on turnover. PPN impor becomes a cost. The selling price does **not** add PPN (VAT).
- **PKP**: PPN impor can be credited → cost drops ±10%, but the selling price must include 11% effective PPN → the price to the consumer is almost the same, and tax administration is heavier (e-Faktur). Set `"pkp": true` in the config to see the result.
- Recommendation: start **non-PKP** until turnover approaches the threshold.

## 8. To verify before prices go live

1. 8-digit HS code for each category (canvas ballet flats, leather shoes, tap, leotards) & its BM rate — via the PPJK / INSW.
2. Lartas for footwear & apparel (Import Approval, surveyor report) — whether general import is possible with NIB/API-U.
3. PPh 22 rate for those HS codes (2.5% vs 7.5% vs 10%).
4. Actual purchase price from Só Dança (B2B) or a supplier + actual cargo shipping cost.
5. Só Dança's minimum advertised price (MAP) policy, if any.
