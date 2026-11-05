# 08 — Pages & flows

## 1. Sitemap

```
/                         → redirect /id
/[locale]                 Home
/[locale]/c/[discipline]  Listing (ballet, pointe, jazz, tap, character, latin-ballroom, contemporary,
                          leotards, skirts, tops, tights) + /c/shoes, /c/dancewear, /c/kids (aggregate)
/[locale]/p/[slug]        PDP
/[locale]/search?q=       Search results
/[locale]/cart            Cart
/[locale]/checkout        Checkout (?link=<token> from admin)
/[locale]/pay/[orderNo]   Payment page
/[locale]/success/[orderNo]
/[locale]/track           Track order (form) → /[locale]/track/[orderNo]
/[locale]/size-guide      Size guide (full page, same content as the modal)
/[locale]/info/{shipping|payment|faq|terms|privacy|about}
/admin/login · /admin · /admin/products · /admin/products/[id] · /admin/orders · /admin/orders/[orderNo]
/admin/checkout-links · /admin/outbox · /admin/back-in-stock
```

## 2. Global

- **Header** (sticky): wordmark on the left · center nav (desktop): SHOES · POINTE · DANCEWEAR · KIDS · TRACK ORDER · right: search, LanguageToggle, cart (count badge). Mobile: hamburger on the left, wordmark in the center, search + cart on the right.
- **Shoes mega menu** (desktop): discipline column + "Kids" column + photo tile "Konsultasi ukuran via WA" (Size consultation via WA).
- **Footer** (`surface-alt`): columns Belanja / Bantuan (Pengiriman, Pembayaran, FAQ, Lacak) / Tentang / Kontak (Shop / Help (Shipping, Payment, FAQ, Track) / About / Contact) (WA, Jakarta address, opening hours) · row of payment logos (QRIS, GoPay, OVO, DANA, ShopeePay, BCA, Mandiri, BNI, BRI, Permata, Visa, Mastercard) · courier logos · LanguageToggle · disclaimer: "Relevé Dance Supply adalah toko independen dan tidak berafiliasi dengan Só Dança." (Relevé Dance Supply is an independent store and is not affiliated with Só Dança.)
- **WA FAB** on all store pages except `/pay/*` & `/checkout` (WA is inline there).
- **DemoBanner** when `DEMO_MODE`.

## 3. Home
1. Hero: lifestyle photo, eyebrow "SÓ DANÇA · ORIGINAL", display tagline, primary CTA "Belanja Sepatu" (Shop Shoes) + secondary "Konsultasi Ukuran" (Size Consultation).
2. Shop by discipline: 6 tiles (Ballet, Pointe, Jazz, Tap, Ballroom, Dancewear).
3. "Ready di Jakarta" (Ready in Jakarta): carousel of 8 ProductCards with READY status.
4. Split `accent` banner: "Bingung ukuran? Ukur kaki, kirim ke kami, kami bantu pilih." (Unsure about size? Measure your foot, send it to us, we'll help you choose.) + WA.
5. Kids: 4 children's products.
6. TrustStrip.
7. How to shop in 3 steps: Pilih ukuran → Bayar QRIS/VA/e-wallet → Dikirim dari Jakarta (instan Jabodetabek) (Choose your size → Pay with QRIS/VA/e-wallet → Shipped from Jakarta (instant within Jabodetabek)).

## 4. Listing
Breadcrumb · discipline H1 + a short 1-sentence description · bar: product count, "Filter" (mobile) / sidebar (desktop), Sort · ProductCard grid · "Muat lebih banyak" (Load more) · empty state (with WA).

## 5. PDP
Mobile order: gallery (swipe + dots) → discipline eyebrow → name (H1) → model code → Price → VariantPicker (Color, Size + "Panduan ukuran" (Size guide), Width, Shank) → AvailabilityLine → CTA (Tambah / Kabari (Add / Notify me)) full-width → "Tanya via WA" (Ask via WA) → mini TrustStrip (Dikirim dari Jakarta · QRIS/VA/e-wallet) → accordion: Deskripsi · Fitur · Material & perawatan · Pengiriman · Pembayaran (Description · Features · Material & care · Shipping · Payment) → CompareStyles → "Kamu mungkin suka" (You may also like).
Desktop: gallery on the left (2-column thumbnail grid), sticky info on the right.
Pointe: `info` callout above the CTA: "Pointe sebaiknya dicoba/difitting. Konsultasikan dulu via WA." (Pointe shoes should be tried on/fitted. Consult us via WA first.)

## 6. Checkout (single page, 3 steps)

```
[Summary (collapsible on mobile)]
① Contact & Address  → name, WA (+62), optional email, WA opt-in, AddressForm
② Shipping           → CourierOption list (Instant / Express / Regular), insurance
③ Payment            → PaymentMethodTile groups QRIS / E-wallet / VA / Card, voucher
[StickyPayBar: Total Rp … | Bayar Sekarang]
```
- Per-step validation, a "Lanjut" (Continue) button per step on mobile; on desktop all steps are open in sequence.
- Stock error on submit → error banner at the top + affected items flagged + "Perbarui keranjang" (Update cart) button.
- From a checkout link: `info` banner "Pesanan disiapkan oleh admin Relevé" (Order prepared by a Relevé admin), items locked (qty cannot be changed).

## 7. Payment page `/pay/[orderNo]`
Minimal header (wordmark + "Butuh bantuan? WA" (Need help? WA)) · order number (Salin (Copy)) · Total · panel for the method (QRISPanel / VAPanel / EwalletPanel / CardForm) · Countdown · "Ganti metode pembayaran" (Change payment method) · "Kirim instruksi ke WA saya" (Send instructions to my WA) · DemoPaymentControls (demo) · poll status every 5 s → success.
Expired: expired PaymentStatus + "Stok sudah dilepas" (Stock has been released) + CTA "Pesan lagi" (Order again).

## 8. Success `/success/[orderNo]`
Success icon · "Pembayaran berhasil" (Payment successful) · order number · "Konfirmasi sudah dikirim ke WA +62 812-•••-7890" (Confirmation has been sent to WA +62 812-•••-7890) · summary · shipping estimate (pre-order: estimated arrival) · OrderTimeline · CTA "Lacak Pesanan" (Track Order) + "Lanjut Belanja" (Continue Shopping) + WA.

## 9. Track
Form: order number + last 4 digits of WA → OrderTimeline + items + courier/tracking number info (Salin) + WA "Tanya pesanan ini" (Ask about this order).

## 10. Admin
- Simple **Login**.
- **Dashboard**: StatCards (Awaiting payment, To be processed, To be shipped, Low stock), table of the 10 latest orders.
- **Products**: DataTable (name, code, discipline, price, total stock, status), detail → pricing info (MSRP, landed cost, price, margin from `pricing`) + VariantStockGrid per color (size rows, width columns) with stock inputs, pre-order toggle, lead time; Save.
- **Orders**: status filter, detail (contact, address, items, payment, history), StatusSelect (valid transitions only), courier + tracking number inputs when Shipping, "Chat pembeli" (Chat with buyer) button (wa.me to the buyer's number).
- **Checkout link**: search product → choose variant + qty → optional name/WA → Create → link + "Salin" + "Kirim via WA" (Send via WA) (wa.me to the buyer's number with text containing the link).
- **WA Outbox**: list of messages with chat bubble preview, template filter.
- **Back-in-stock**: list of requests per variant, notified status.

## 11. Main flows (summary)

```
Browse ─▶ PDP ─▶ choose variant ─┬─ READY/LOW/PO ─▶ Cart ─▶ Checkout ─▶ Pay ─▶ (webhook PAID) ─▶ Success ─▶ WA: PAYMENT_PAID
                                 ├─ SOLD_OUT ─▶ Notify via WA ─▶ (admin restock) ─▶ WA: BACK_IN_STOCK
                                 └─ unsure of size ─▶ wa.me ─▶ admin creates checkout link ─▶ Checkout(?link) ─▶ Pay …
Pay ─(expired)─▶ EXPIRED, stock released ─▶ WA: PAYMENT_EXPIRED
Admin: PAID ─▶ PROCESSING ─▶ SHIPPED(resi) ─▶ WA: ORDER_SHIPPED ─▶ DELIVERED ─▶ WA: ORDER_DELIVERED
```
