# 13 — Client demo presentation script (±15 minutes)

This script is for the presenter. The **"Say"** sections are talking points (feel free to paraphrase); the **steps** sections are the exact clicks. The scenarios follow `03-demo.md` §4 (D1–D8; D9 is automated tests only). The button text below matches the text in the Indonesian version of the UI.

> The URLs in this script use `https://releve-demo.vercel.app` — replace them with the actual demo URL (`12-deploy.md` §6). For a local demo: `http://localhost:3000`.

---

## 0. Preparation (30–60 minutes before the meeting)

### Reset data
- [ ] Re-seed the demo database (`12-deploy.md` §10):
  ```bash
  DATABASE_URL="$NEON_URL" NEXT_PUBLIC_SITE_URL='https://releve-demo.vercel.app' ADMIN_PASSWORD='releve-demo' pnpm db:seed
  ```
  Local: `pnpm db:seed` (or `pnpm db:reset` if the schema changed).
- [ ] Make sure `DEMO_MODE=true` and `NEXT_PUBLIC_DEMO_MODE=true` (the banner "Mode demo — pembayaran & pengiriman disimulasikan." (Demo mode — payment & shipping are simulated.) is visible).
- [ ] Meeting time: **GoSend Instant only appears before 16:00 WIB** (Grab Same Day before 14:00 WIB) and only for Jabodetabek (zone Z1). If the meeting is in the afternoon, D1 uses JNE YES/Regular — present the cutoff rule as a feature.

### Devices & tabs
- [ ] **Phone (store, buyer view)** — incognito mode / empty cart:
  1. `https://releve-demo.vercel.app/id`
  2. `…/id/p/diamond-sd140`
- [ ] **Laptop (admin + big screen)**:
  1. `…/admin/login` → log in as **admin@releve.test / releve-demo**, leave the Dashboard open
  2. `…/admin/outbox` (WA outbox)
  3. `…/admin/checkout-links`
  4. `…/id/design-system` (design system showcase, for the closing / if asked)
- [ ] Mirror the phone screen to the projector/Zoom (or open the store on the laptop with DevTools mobile mode 390×844 as a fallback).
- [ ] WhatsApp ready on the presenter's phone (the "Tanya via WA" (Ask via WA) button opens wa.me to `NEXT_PUBLIC_WA_NUMBER`).
- [ ] Sample buyer WA number to type: `0812-3456-7890`. Address: DKI Jakarta → Kota Jakarta Selatan → Kebayoran Baru → 12160 → "Jl. Senopati No. 10".

### Products used (all in `data/catalog/products.json`)

| Slug | Name | Role in the demo |
|---|---|---|
| `diamond-sd140` | Diamond SD140 (Rp660.000) | Almost every size **ready** → happy path D1, D4 |
| `alina-iv-pointe-shoe-p95` | Alina IV Pointe Shoe P95 | Low stock **"Sisa 1–3"** (1–3 left) → D2, D6 |
| `briar-sd110l`, `jaxon-jz86l`, `claudine-sd155` | Briar SD110L, Jaxon JZ86L, Claudine SD155 | Fully **pre-order** (estimate 4–6 weeks) → D4 |
| `roy-bl104`, `elsie-sl248` | Roy BL104, Elsie SL248 | **Habis** (Sold out) in every size → "Kabari Saya via WA" (Notify Me via WA) → D3 |
| `claudia-satin-sd09`, `toshie-sd40vc` | Claudia Satin SD09, Toshie SD40VC | Pointe with **shank** options → D8 |

> The admin credentials `admin@releve.test / releve-demo` are **for the demo only**. For a link left with the client, re-seed with a different password and send it separately.

---

## 1. Opening (1 minute)

**Say:**
- "This is Relevé Dance Supply — an online store for Só Dança dance shoes & dancewear for the Indonesian market, as an independent reseller. The name and logo are still working names."
- "What you are seeing really works: the catalog, per-size stock, orders, and admin all use a real database. Only three things are **simulated**: payment, courier shipping rates, and automatic WhatsApp messages — because the Xendit, Biteship, and WhatsApp Business accounts have not been created yet. The code is already prepared to be connected."
- "Let's try it like a real buyer, on a phone."

## 2. D1 — Shopping through to payment with QRIS + instant courier (3 minutes)

**Steps (phone):**
1. Home `/id` → menu/category **Ballet** → **Diamond SD140**.
2. Show: price in Rp, per-size stock labels (Ready / Sisa N (N left) / Habis (Sold out)).
3. Choose color **Light Pink**, size **7.0L (adult)**, width **C** → **Tambah ke Keranjang** (Add to Cart) → **Lihat keranjang** (View cart) → Checkout.
4. Fill in **Nama lengkap** (Full name), **Nomor WhatsApp** (WhatsApp number) `0812-3456-7890`, **Provinsi** (Province) DKI Jakarta, **Kabupaten/Kota** (Regency/City) Kota Jakarta Selatan, **Kecamatan** (District) Kebayoran Baru, **Kode pos** (Postal code) 12160, **Alamat lengkap** (Full address) → **Lanjut ke Pengiriman** (Continue to Shipping).
5. Choose **GoSend Instant** (or the first courier if it is past 16:00 WIB) → show **Asuransi pengiriman** (Shipping insurance) → **Lanjut ke Pembayaran** (Continue to Payment).
6. In the summary, enter **Kode voucher** (Voucher code) `RELEVE10` → **Pakai** (Apply) → "Voucher dipakai — hemat …" (Voucher applied — you save …) appears (10% discount, minimum spend Rp500.000).
7. The **QRIS** method is already selected → **Bayar Sekarang** (Pay Now) → payment page with the QR & a 30-minute countdown.
8. Click **Simulasikan Bayar Berhasil** (Simulate Successful Payment) → "Pembayaran berhasil" (Payment successful) page.
9. **Laptop:** open **WA outbox** → a "Pembayaran diterima" (Payment received) message for that order. Open **Dashboard** → the new order in "10 order terbaru" (10 latest orders).

**Say:**
- "The buyer doesn't need to create an account — just a name, WA number, and address. **WhatsApp is the main channel**: confirmation, payment status, and tracking number are sent via WA."
- "Shipping is **Java only**, from a warehouse in **Jakarta**. Instant couriers automatically appear only for Jabodetabek and before the cutoff time."
- "Payment is **fully digital**: QRIS, e-wallets, Virtual Account, cards. **No COD** — in line with the decision for the upper-middle segment, and to avoid the risk of rejected parcels."
- "Prices and totals are always recalculated on the server — they can't be tampered with from the browser. Stock for this variant immediately drops by 1."
- "This 'Simulasikan' (Simulate) button only exists in demo mode. Later it will be replaced by the real notification from Xendit."

## 3. D2 — Size consultation via WA → admin sends a checkout link → pay by VA (3 minutes)

**Steps:**
1. **Phone:** open **Alina IV Pointe Shoe P95** → show the callout "Pointe sebaiknya dicoba/difitting" (Pointe shoes should be tried on/fitted) and the many "Sisa 1–3" sizes.
2. Click **Tanya via WA** → WhatsApp opens with a prefilled message (product name + model code). No need to send it; go back to the browser.
3. **Laptop:** **Checkout link** → **Produk** (Product): type `P95` → choose **Alina IV Pointe Shoe P95** → **Ukuran** (Size) 6.0L (adult) → **Width** C → **Tambah item** (Add item).
4. Fill in **Nama** (Name) "Sari Dewi" and the buyer's **Nomor WhatsApp** → **Buat checkout link** (Create checkout link).
5. Show the link `…/id/checkout?link=…` and the send-via-WA button (opens WA to the buyer with a message + link). Copy the link → open it on the **phone**.
6. **Phone:** "Pesanan disiapkan oleh admin Relevé" (Order prepared by Relevé admin) appears, with name & WA prefilled. Fill in the address → **Lanjut ke Pengiriman** → choose a courier → **Lanjut ke Pembayaran**.
7. Choose **BCA Virtual Account** → **Bayar Sekarang** → show the VA number (starting with 39108) → **Salin nomor Virtual Account** (Copy Virtual Account number) → open the **ATM BCA** guide.
8. **Simulasikan Bayar Berhasil** → success. **Laptop:** **Checkout link** → link status "Terpakai" (Used) with its order number.

**Say:**
- "For pointe shoes, buyers usually ask about sizing first. We designed the flow **WA-first**: the buyer chats, the admin helps choose size/width/shank, then **the admin creates a checkout link** containing the right product and sends it via WA."
- "The link is valid for 48 hours and can only be used once. The buyer just fills in the address and pays — no need to search for the product again."
- "The stock shown is **honest per size**: 'Sisa 1' (1 left) really means there is only one pair left in the warehouse."

## 4. D3 — Out of stock → "Kabari Saya via WA" (2 minutes)

**Steps:**
1. **Phone:** open **Roy BL104** (or **Elsie SL248**) → every size is **Habis**.
2. Choose color **Black**, size **7.0L (adult)**, width **Medium** → **Kabari Saya via WA** → enter a WA number → **Kabari Saya** (Notify Me) → "Siap! Kami kabari via WhatsApp saat … ready." (Done! We'll let you know via WhatsApp when … is ready.)
3. **Laptop:** **Back-in-stock** → the new request appears (the seed already contains 2 Roy requests + 1 Elsie).
4. **Produk & stok** (Products & stock) → **Roy BL104** → choose **Black** → in the grid, set the stock of variant 7.0L (adult) / Medium to `2` → **Simpan stok** (Save stock) → "N pembeli dikabari via WA" (N buyers notified via WA).
5. **WA outbox** → a "Stok ready lagi" (Back in stock) message to that number.

**Say:**
- "Instead of letting the buyer leave, we keep their number. As soon as the admin adds stock, everyone waiting is **automatically notified via WA** — each only once."
- "This is also demand data: the admin can see which models & sizes are most wanted before restocking."

## 5. D4 — Pre-order mixed with ready items (1.5 minutes)

**Steps:**
1. **Phone:** open **Briar SD110L** (or Jaxon JZ86L / Claudine SD155) → every size is labeled **Pre-order**. Choose Pink 40, size 7.0L (adult), width C → **Tambah ke Keranjang**.
2. Also add a ready **Diamond SD140**.
3. **Cart:** show the notice "Keranjang berisi item pre-order. Semua item dikirim sekaligus setelah item pre-order tiba (estimasi 4–6 minggu)." (Your cart contains pre-order items. All items ship together once the pre-order items arrive (estimate 4–6 weeks).)
4. Continue checkout to the summary → show the pre-order label again. (Paying is optional; the success page also shows "Estimasi tiba 4–6 minggu" (Estimated arrival 4–6 weeks).)

**Say:**
- "Models not yet in the warehouse can still be sold as **pre-order**, with a clear estimate from the start. The admin can enable/disable pre-order per variant or per product."
- "For the first version, mixed orders ship together — simple and saves on shipping. Split shipments can be added later."

## 6. D5 — Address outside Java (30 seconds)

**Steps:** at checkout, open the **Provinsi** dropdown → only the 6 Java provinces (DKI Jakarta, Banten, Jawa Barat, Jawa Tengah, DI Yogyakarta, Jawa Timur); **Bali is not there**. Show the link **"Di luar Pulau Jawa? Hubungi kami via WA"** (Outside Java? Contact us via WA).

**Say:** "As decided at the start, automatic checkout is for Java only. Buyers outside Java are not turned away — they are directed to WA to be handled manually. Once Biteship is connected, coverage can be expanded with just configuration."

## 7. D6 — Payment expires → stock returns (1.5 minutes)

**Steps:**
1. **Phone:** open **Alina IV Pointe Shoe P95** → choose a size labeled **Sisa 1** (e.g. 7.5L (adult), width C) → **Tambah ke Keranjang** → checkout → **Bayar Sekarang** (any method).
2. (Optional) Open the Alina PDP in another tab → that size is now **Habis** — its stock is being held for this buyer.
3. Click **Simulasikan Kedaluwarsa** (Simulate Expiry) → "Pembayaran kedaluwarsa" (Payment expired), "Stok sudah dilepas" (Stock has been released), **Pesan lagi** (Order again) button.
4. Refresh the PDP → that size is back to **Sisa 1**. **Laptop:** WA outbox → "Pembayaran kedaluwarsa".

**Say:**
- "As soon as the buyer presses pay, the stock is **locked** for them — two people can't pay for the same last pair of shoes. We have tested the race for the last item automatically: one succeeds, one is rejected."
- "If it isn't paid by the deadline (QRIS 30 minutes, VA 24 hours), the order expires and the stock automatically goes back on sale."

**Optional — card declined (30 seconds):** at checkout choose **Kartu kredit/debit** (Credit/debit card) → **Bayar Sekarang** → **Nomor kartu** (Card number) `4000 0000 0000 0002`, expiry `12/30`, CVV `123` → **Bayar Rp…** (Pay Rp…) → any 6-digit OTP → **Verifikasi** (Verify) → "Kartu ditolak oleh bank penerbit" (Card declined by the issuing bank) → **Ganti metode pembayaran** (Change payment method) → QRIS → **Pakai metode ini** (Use this method). "The order isn't lost; the buyer just switches methods."

## 8. D7 — Admin processes & ships, buyer tracks (2 minutes)

**Steps:**
1. **Laptop:** **Order** → filter status **Dibayar** (Paid) → open the order for **Sekar Ayu Larasati** (a sample order from the seed; or the D1 order from earlier).
2. Show the details: items, address, payment, timeline, WA messages, the **Chat pembeli** (Chat with buyer) button.
3. **Ubah status ke** (Change status to) → **Proses pesanan** (Process order) → status "Diproses" (Processing).
4. **Ubah status ke** → **Kirim (input resi)** (Ship (enter tracking number)) → **Kurir** (Courier) JNE → **Nomor resi (AWB)** (Tracking number (AWB)) e.g. `JNE1234567890` → **Kirim (input resi)** → status "Dikirim" (Shipped); the timeline contains the tracking number; the WA outbox contains a message with the tracking number.
5. **Phone:** `…/id/track` → **Nomor pesanan** (Order number) (copy from admin) + **4 digit terakhir nomor WA** (Last 4 digits of WA number) (`5432` for Sekar; `7890` for the D1 order) → **Lacak** (Track) → timeline "Dikirim", the tracking number can be copied, "Tanya pesanan ini" (Ask about this order) button.

**Say:**
- "The admin only sees buttons that are valid for the current status — they can't jump straight to 'Dikirim' before 'Diproses', and the tracking number is mandatory."
- "The 'Dibayar' status can only come from the payment gateway, not clicked by the admin — preventing mistakes and fraud."
- "Buyers track without logging in: just the order number + the last 4 digits of their WA."

## 9. D8 — Bilingual (1 minute)

**Steps:** **Phone:** open **Claudia Satin SD09** (or **Toshie SD40VC**) → show the **shank** options (Full Normal / Full Extra Reinforced; Toshie has 4 shanks) → tap **EN** in the header → the UI is in English, prices stay in **Rp** format, the terms *pointe, shank, vamp* are not translated. Switch back to **ID**.

**Say:** "Indonesian is the default, English for expatriate customers and international studios. Dance terms are left as they are because dancers use them that way."

## 10. Closing (1.5 minutes)

Briefly show **`/id/design-system`** on the laptop: "All the colors, buttons, and components are collected here, so changing the brand name/logo/colors later is quick and consistent."

### Ready to be connected
| Part | In the demo | Later | Needed from the client |
|---|---|---|---|
| **Payments — Xendit** | Simulated QRIS, e-wallets, VA for 5 banks, cards (+3DS) | Real Xendit; webhooks & signatures already go through the same path | A verified Xendit business account (KYC for a company/individual) |
| **Shipping rates & tracking — Biteship** | Rates from a table of 7 courier services | Real-time rates & areas, tracking-number tracking | A Biteship account, the Jakarta warehouse address |
| **Notifications — WhatsApp Business API** | Messages stored in the "WA outbox" | Sent automatically via a BSP (e.g. Qontak/Wati/360dialog) | A dedicated business WA number, Meta verification, approved message templates |

"All three are already built as 'plugs' in the code — switching from simulation to the real thing is configuration and testing work, not a rebuild." (Technical details: `11-go-live-integrations.md`.)

### Decisions needed from the client
1. **Wholesale price (Q-01):** can you get a wholesale price (±50% of the retail price) from Só Dança? Without it, our selling price is about 2× the market price.
2. **Pointe strategy (Q-02):** Só Dança pointe shoes are around Rp3 million, while Bloch locally is Rp1,1–1,6 million. Should pointe shoes be sold normally, made pre-order/niche, or should the margin be lowered?
3. **Name & logo (Q-03):** will "Relevé Dance Supply" be used, or is there a final name & logo?
4. **Business WhatsApp number (Q-04):** which number will be used for the store (preferably a dedicated number, since it will be registered with the WhatsApp Business API)?
5. **Jakarta warehouse address (Q-05):** the full address, for the instant-courier pickup point and the store footer.
6. **Size chart (Q-06):** is there an official size chart (cm) per category? We currently copied it from the Só Dança size chart and it needs checking.
7. **Import duties & taxes (Q-07):** can you help confirm the HS code, import duty, lartas (import restrictions), and PPh 22 with a PPJK/forwarder? This affects the selling price.
8. **Returns & size exchanges (Q-08):** what is the policy? For now we have written "via WA, case by case".
9. **Product photos (Q-09):** when will our own product photos be available? Required before the store goes live (the demo uses placeholders).

**Close:** "Once these decisions and the accounts above are ready, the next step is connecting the real integrations, filling in final photos & prices, then a limited trial before go-live."

---

## If something goes wrong during the demo
| Symptom | Action |
|---|---|
| GoSend Instant doesn't appear | It's past 16:00 WIB or the city is not Jabodetabek — use JNE, explain the cutoff |
| "Stok tidak cukup" (Insufficient stock) at checkout | The data was used up by a previous session — choose another size, or re-seed after the meeting |
| Cart contains old items | Open an incognito tab |
| Admin kicked back to login | The 12-hour session expired — log in again |
| Voucher "Minimal belanja …" (Minimum spend …) | Subtotal is below Rp500.000 — add an item |
