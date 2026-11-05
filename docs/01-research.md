# 01 — Research

Research date: 5 Nov 2026. Many market figures come from vendor blogs → treat them as estimates.

## 1. Reference: Só Dança (sodanca.com)

- A **dance shoe & dancewear** brand (US/Brazil): ballet, pointe, jazz, tap, character, latin/ballroom, contemporary + leotards, tights, skirts, warm-ups.
- Shopify website. Top-level navigation: **Shoes · Dancewear · Children · Sale** + blog/loyalty, B2B login, store locator ("Find a Retailer").
- Catalog by **discipline**; filters: gender, availability, price, color (shoe color names: Ballet Pink, Theatrical Pink, Suntan, Caramel, Mocha…).
- Variants are **color × size × width** (pointe + **shank**); SKU & barcode per variant; **backorder** label ("delivery in 4–6 weeks"); **Compare Similar Styles** table; size chart (image).
- Copy: warm, aspirational, inclusive ("Everything you need to move, grow, and find your place in ballet"); product copy is technical & benefit-led.
- Photos: products on plain backgrounds (square) + studio/class lifestyle shots.

Sources: [sodanca.com](https://www.sodanca.com/), [FAQ](https://www.sodanca.com/pages/faq), [Store locator](https://www.sodanca.com/pages/store-locator-2), public catalog `products.json` (used for `data/catalog`).

## 2. Indonesian market

- Ballet shoes are mostly sold on **marketplaces** (Tokopedia/Shopee/Lazada), mostly cheap generics (Rp100–400rb; rb = thousand). Premium specialist dance stores with their own website **barely exist** → a gap.
- There are brand distributors (example: Ballet and Dance Shop Indonesia for Bloch) with Bloch/Capezio pointe prices of **Rp1,1–1,6 jt** (jt = million).
- Só Dança SD16 is sold by marketplace resellers for **Rp460–555rb**.
- Target: **upper-middle class** — parents of students at sanggar (dance studios)/ballet schools, adult dancers, teachers. "Intermediate" digital literacy: comfortable with QRIS/mobile banking, dislikes cluttered UIs.
- **Mobile >70%** of online shopping → mobile-first.
- **WhatsApp** = the main seller–buyer channel in Indonesia (email is weak).

Sources: [Tokopedia "balet"](https://www.tokopedia.com/find/balet), [Tokopedia "bloch"](https://www.tokopedia.com/find/bloch), [Tokopedia SD16](https://www.tokopedia.com/mainstream/sepatu-ballet-so-danca-canvas-elastic-premium-6-5-c-standart), [BDS Indonesia](https://www.tokopedia.com/bdsindonesiaofficial), [Mekari Qontak](https://mekari.com/en/qontak/whatsapp-business-api/).

## 3. Digital payments

- E-wallets ±35–42% of e-commerce transactions, bank transfer / Virtual Account ±23–34%, cards ±10%. **QRIS** = Bank Indonesia's QR standard, payable from any e-wallet & mobile banking app.
- COD still exists in the mass market — **deliberately not used** (premium segment, owner's decision).

Sources: [Antom](https://www.antom.com/markets/indonesia), [Shoplazza](https://www.shoplazza.com/blog/indonesian-payment-methods), [Xendit](https://www.xendit.co/en-id/blog/7-most-popular-payment-methods-in-indonesia/), [Tazapay](https://tazapay.com/en-sg/blog/local-payment-methods-in-indonesia-dana).

## 4. Shipping

- **Biteship** aggregator: one API for JNE, J&T, SiCepat, AnterAja, GoSend, Grab (rates, orders, tracking, Area API). Sources: [Biteship](https://biteship.com/en/produk/shipping), [guide](https://help.biteship.com/hc/id/articles/58144517272089).

## 5. Localization: "local, not a clone"

iBox/Erafone look like Apple because they are official resellers bound by brand guidelines. We are an **unofficial reseller** → we may not claim to be official, and there is no need to copy 1:1. What we localize is **shopping behavior**:

| Area | Global style | Our version |
|---|---|---|
| Language | English | **ID default + EN**, dance terms not translated |
| Contact | Email | **WhatsApp at every decision point** |
| Payment | Cards | **QRIS, e-wallets, VA, cards** — no COD |
| Sizing | US size chart | Size chart + **cm** + size consultation via WA |
| Shipping | Flat rate | Per-courier shipping cost, **instant in Jabodetabek** |
| Pricing | USD | **Rp 1.250.000** |
| Trust | Brand name | Genuine officially imported goods, honest stock, Jakarta address, testimonials from sanggar |
