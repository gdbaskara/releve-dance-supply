# 07 — Design system: Relevé v1.0

Token source: `design-system/tokens.json` (source of truth) → `design-system/tokens.css`. Glossary: `design-system/glossary.json`.

## 1. Principles

1. **The product is the stage.** The UI is monochrome & calm; color comes from the product photos. No marketplace flash-sale style (glaring red, promo countdowns, stacked badges).
2. **Ballet-like precision.** Thin lines, sharp corners (2–4px radius), a tidy grid, generous spacing.
3. **Honest about stock.** Per-size status is always visible before the shopper presses a button.
4. **WhatsApp is always one tap away.** But WA green is only for WA — it is not used for other actions.
5. **Friendly language, technical terms unchanged.** "Kamu" (informal "you"), concise, warm; dance terms in English.

**The feel borrowed from Só Dança:** white background, clean sans typography with letter-spaced UPPERCASE labels, large 1:1 photos, navigation by discipline. **What differs (our own identity):** our own wordmark, a Ballet Pink accent, an editorial serif for taglines, local WA & payment patterns.

## 2. Identity

- **Wordmark (demo):** "RELEVÉ" — Plus Jakarta Sans 600, UPPERCASE, letter-spacing 0.24em, color `ink`; sub-label "DANCE SUPPLY" 12px, 0.24em, `ink-muted`. Built as a text SVG at `public/brand/wordmark.svg`. Favicon: the letter "R" in an `ink` square.
- Hero tagline (display serif italic): *"Setiap langkah dimulai dari sepatu yang tepat."* / *"Every step begins with the right shoe."*
- Trust line: "Produk original Só Dança · Dikirim dari Jakarta · Bayar QRIS, VA & e-wallet" (Original Só Dança products · Shipped from Jakarta · Pay with QRIS, VA & e-wallet).

## 3. Color

| Token | Hex | Used for | Contrast |
|---|---|---|---|
| `bg` / `surface` | #FFFFFF | Background, card | — |
| `surface-alt` | #F7F4F0 | Alternating sections, summary panel, footer | — |
| `ink` | #141414 | Main text, **primary button**, icons | 18.4:1 |
| `ink-muted` | #5E5852 | Secondary text, labels, meta | 7.0:1 (6.4 on alt) |
| `ink-subtle` | #8A837C | Placeholder, non-essential text ≥18px | 3.7:1 ⚠️ not for body |
| `border` | #E6E1DB | Decorative divider | decorative |
| `border-strong` | #8A837C | Input/checkbox/size chip border | 3.7:1 (non-text ≥3 ✓) |
| `accent` | #F3E1DD | Ballet Pink: "Baru" (New) badge background, hero tint, highlight | background only |
| `accent-strong` | #9A4A57 | Link hover, accent icons, hero eyebrow | 6.0:1 |
| `accent-ink` | #7E3845 | Text on top of `accent` | 6.55:1 |
| `success` / `-bg` | #1F7A4D / #E7F4EC | Ready, payment successful | 5.3 / 4.7:1 |
| `warning` / `-bg` | #8A5A00 / #FBF1DC | N left, Pre-order, countdown < 5 min | 5.9 / 5.3:1 |
| `error` / `-bg` | #B3261E / #FBE9E7 | Form errors, sold out, failed | 6.5 / 5.6:1 |
| `info` / `-bg` | #2A5DB0 / #E8EFFA | Informational notices (demo mode, mixed pre-order) | 6.4:1 |
| `whatsapp` + `whatsapp-ink` | #25D366 + #0B2A17 | WA buttons/icons **only** | 7.8:1 (white text forbidden: 2:1) |

Rule: at most **one** primary (`ink`) button per screen/section. Prices are always `ink`, never accent.

## 4. Typography

| Role | Font | Size / line-height | Weight | Notes |
|---|---|---|---|---|
| Display hero | Cormorant Garamond | 36/44 mobile · 64/68 desktop | 500 (italic optional) | Hero tagline & testimonial quotes only |
| H1 | Plus Jakarta Sans | 30/36 mobile · 48/56 desktop | 600 | tracking −0.01em |
| H2 | Plus Jakarta Sans | 24/32 · 30/36 | 600 | |
| H3 | Plus Jakarta Sans | 20/28 · 24/32 | 600 | |
| Eyebrow / nav / category label | Plus Jakarta Sans | 12/16 | 600 | UPPERCASE, tracking 0.12em |
| Body | Plus Jakarta Sans | 16/24 | 400 | Max line length 70ch |
| Body small / meta | Plus Jakarta Sans | 14/20 | 400–500 | |
| Caption / legal | Plus Jakarta Sans | 12/16 | 400 | `ink-muted` |
| PDP price | Plus Jakarta Sans | 24/32 | 600 | tabular-nums |
| Card price | Plus Jakarta Sans | 14/20 · 16/24 | 600 | tabular-nums |
| VA / order / SKU number | mono | 20/28 (VA) · 14/20 | 500 | letter-spacing 0.04em, grouped in 4 digits |

Inputs are always ≥ 16px (prevents iOS auto-zoom).

## 5. Layout, spacing, shape

- Grid: 4 columns (mobile, gutter 16) · 8 (tablet, 24) · 12 (desktop, 32). Max container 1280px.
- Vertical rhythm between sections: 48px mobile, 80px desktop. Spacing within components: multiples of 4.
- Radius: button/input/badge **2px**, card/tile **4px**, modal/drawer **8px**, swatch/chip/FAB **pill**. Product photos **0**.
- Shadows only for overlays (drawer, modal, popover). Cards are distinguished by a `border` line, not a shadow.
- Product listing: 2 columns mobile, 3 tablet, 4 desktop. Gap 16/24/32.
- Header: 56px mobile, 72px desktop, sticky, white background + `border` bottom line on scroll.

## 6. Photos & icons

- Products: **1:1** ratio, plain `#F7F4F0` or white background, product centered, ≥ 1200px. 2nd image: side/sole view. Lifestyle (hero/category): 4:5 mobile, 16:9 desktop.
- Demo placeholder: `surface-alt` block + line-art shoe silhouette (SVG) + model code in the corner, color `ink-subtle`.
- Icons: lucide, stroke 1.5, 20px (24px in nav). Payment logos: official SVG in grayscale when not selected, in color when selected.

## 7. Components

Every component must have: Storybook stories for **all variants & states**, the a11y addon with no violations, text via i18n.

### 7.1 Primitives (`src/components/ui`)

| Component | Variants | States | Specification |
|---|---|---|---|
| **Button** | `primary` (ink/white), `secondary` (1px ink outline), `ghost` (text), `whatsapp` (green + WA icon, `whatsapp-ink` text), `danger` (admin) | default, hover (primary: #2B2B2B; secondary: bg surface-alt), active, focus-visible (2px ink ring, offset 2), disabled (opacity .4, cursor not-allowed), loading (spinner, label stays) | Size `md` 48px tall (default, mobile), `sm` 36px (admin/inline). Label 14px 600 UPPERCASE tracking 0.08em. `fullWidth` for mobile CTAs |
| **IconButton** | ghost, outline | same | 44×44 minimum |
| **Link** | inline, nav | hover underline, visited unchanged | Inline: 1px underline, offset 3px |
| **Input / Textarea** | default, with prefix (`+62`), with suffix | default, focus (2px ink border), error (error border + message), disabled, readOnly | Height 48px, label above (14px 500), helper/error below (12–14px) |
| **Select / Combobox** | native-style, searchable (regency/city) | same as Input | Combobox for the 119 regencies/cities |
| **Checkbox / Radio** | — | checked, unchecked, focus, disabled, error | 20px control, 44px click area |
| **Badge** | `neutral`, `success`, `warning`, `error`, `info`, `accent` | — | 12px 600 UPPERCASE tracking .08em, padding 4×8, radius 2 |
| **Chip (filter)** | toggle | selected (ink bg, white text), unselected (outline), disabled | Pill, 36px |
| **Tabs / SegmentedControl** | — | — | For ID/EN, payment method groups |
| **Accordion** | — | open/closed | Payment instructions, FAQ, PDP description |
| **Dialog / Sheet** | center modal (desktop), bottom sheet (mobile) | — | Radix Dialog; focus trapped; Esc closes |
| **Drawer** | right (cart, desktop), bottom (mobile) | — | 420px wide on desktop |
| **Toast** | success, error, info | — | Bottom corner (mobile: above the sticky button), auto-hide 4s, dismissible |
| **Skeleton** | text, card, image | — | Shimmer animation disabled under reduced-motion |
| **Tooltip** | — | — | Supplementary info only, never required info |
| **Breadcrumb** | — | — | PDP & desktop listing |
| **Pagination / LoadMore** | — | — | Listing: "Muat lebih banyak" (Load more) button (24/page) |

### 7.2 Store components (`src/components/store`)

| Component | Content & behavior |
|---|---|
| **Price** | `formatIDR(value)` → `Rp 675.000`; size `sm/md/lg`; tabular-nums; `from` prop → "Mulai Rp …" (From Rp …) |
| **StockBadge** | Input: status + available + lead. READY → `success` "Ready" · LOW → `warning` "Sisa {n}" ({n} left) · PREORDER → `warning` "Pre-order · {lead} minggu" ({lead} weeks) · SOLD_OUT → `neutral` "Habis" (Sold out). Has an inline version (text + 8px dot) for the PDP |
| **ProductCard** | 1:1 image (desktop hover: 2nd image), discipline eyebrow, name (max 2 lines), model code in `ink-muted`, Price, swatches (max 5 + "+N"), aggregate StockBadge. The whole card = 1 link. No add button on the card (size selection is required on the PDP) |
| **ColorSwatch** | 28px circle, 1px `border-strong` border; selected = 2px ink ring, offset 2; color name shown in the label above it ("Warna: Ballet Pink" (Color: Ballet Pink)); sold out = diagonal line |
| **SizeSelector** | Grid of 48×48 square chips (radius 2), US size label; selected = ink bg, white text; LOW = small warning dot in the corner; SOLD_OUT = struck-through text + `ink-subtle`, still focusable (aria-disabled) and shows a "Kabari saya" (Notify me) option; PREORDER = small "PO" label. "Panduan ukuran" (Size guide) link at top right |
| **WidthSelector / ShankSelector** | Segmented. Width: Narrow/Medium/Wide or A–EE (depending on the model). Shank (SD09, SD40VC): Full Soft / Full Normal / Full Reinforced / Full Extra Reinforced. Tooltip explaining the terms from the glossary |
| **VariantPicker** | Composes Color → Size → Width → Shank according to `product.options`; computes combination availability; emits `selectedSku` |
| **AvailabilityLine** | Below the VariantPicker: icon + text: "Ready · dikirim 1–2 hari kerja dari Jakarta" (Ready · ships in 1–2 business days from Jakarta) / "Sisa 2 — segera habis" (2 left — selling out soon) / "Pre-order · estimasi tiba 4–6 minggu" (Pre-order · est. arrival 4–6 weeks) / "Habis untuk ukuran ini" (Sold out in this size) |
| **SizeGuide** | Sheet/Dialog: category tabs (Ballet & Jazz / Pointe / Tap & Character / Ballroom / Dancewear), US ↔ foot length in cm table, how-to-measure illustration, pointe callout, WA button "Konsultasi ukuran" (Size consultation) |
| **CompareStyles** | 3-column table: photo, name, sole, material, price, link |
| **CartLine** | 64px thumb, name, variant ("Ballet Pink · 7.5 · M"), pre-order badge, qty stepper (−/+, 44px), price, remove |
| **CartDrawer** | Header "Keranjang (n)" (Cart (n)), list of CartLines, notices (stock changed / mixed pre-order), subtotal, "Checkout" CTA, secondary WA button |
| **QtyStepper** | min 1, max = available or 5 (pre-order); disabled at the limits |
| **WhatsAppButton** | Variants `fab` (56px pill, bottom-right, "Chat" label appears on desktop), `inline` (whatsapp Button), `link` (text + icon). `context` + `vars` props → builds the text from the template |
| **LanguageToggle** | "ID / EN" segmented, 12px UPPERCASE |
| **TrustStrip** | 3–4 icon + text items: Original Só Dança · Dikirim dari Jakarta · QRIS/VA/e-wallet · Konsultasi ukuran via WA (Original Só Dança · Shipped from Jakarta · QRIS/VA/e-wallet · Size consultation via WA) |
| **EmptyState** | Line-art icon, title, description, CTA (back to shopping / WA) |
| **DemoBanner** | 32px `info-bg` bar: "Mode demo — pembayaran & pengiriman disimulasikan" (Demo mode — payment & shipping are simulated) |
| **FilterPanel** | Mobile: bottom Sheet with an accordion per facet + "Tampilkan {n} produk" (Show {n} products) button; desktop: 240px sidebar |

### 7.3 Checkout components (`src/components/checkout`)

| Component | Content & behavior |
|---|---|
| **CheckoutStep** | Round number + title + status (active / done ✓ with summary & "Ubah" (Edit) / locked) |
| **PhoneInput** | Fixed `+62` prefix, `inputmode="tel"`, auto-format `812-3456-7890`, accepts 08… / 62… / +62… input |
| **AddressForm** | Province (select of 6) → Regency/City (combobox, filtered by province) → District (text) → Postal code (`inputmode="numeric"`, 5 digits) → Full address (textarea) → Courier note. WA link "Di luar Pulau Jawa?" (Outside Java?) |
| **CourierOption** | Radio card: courier logo, service name, estimate, price (right); group headings Instan / Express / Reguler (Instant / Express / Regular); instant shows the cutoff |
| **InsuranceToggle** | Checkbox default ON + amount |
| **PaymentMethodTile** | Radio card with 4px radius: logo, name, short description ("Bayar dari semua e-wallet & m-banking" (Pay from any e-wallet & m-banking)); selected = 2px ink border; groups: QRIS · E-wallet · Virtual Account · Kartu (Card) |
| **OrderSummary** | Compact item list, voucher field, subtotal/shipping/insurance/discount rows, **Total** (20px 600); sticky on the right on desktop, collapsible "Lihat ringkasan (Rp …)" (View summary (Rp …)) on mobile |
| **StickyPayBar** | Mobile: bottom bar with total + primary Button "Bayar Sekarang" (Pay Now) |
| **QRISPanel** | QRIS logo, 240px QR (white, padding 16), amount (Salin (Copy)), Countdown, "Unduh QR" (Download QR), short 1-2-3 steps, logos of supported e-wallets/banks |
| **VAPanel** | Bank logo, label "Nomor Virtual Account" (Virtual Account number), 20px mono number grouped in 4 + **Salin** button (toast "Disalin" (Copied)), amount + Salin, Countdown, Accordion with ATM / m-banking / internet banking instructions |
| **EwalletPanel** | Logo, "Buka {wallet}" (Open {wallet}) button, text "Selesaikan di aplikasi dalam {mm:ss}" (Complete in the app within {mm:ss}) |
| **CardForm** | Card number (4-4-4-4 mask, Visa/MC/JCB detection), MM/YY, CVV; note "Data kartu tidak disimpan" (Card data is not stored) |
| **Countdown** | `HH:MM:SS`; < 5 minutes → warning color; expired → expired state + CTA "Buat pembayaran baru" (Create a new payment) |
| **PaymentStatus** | Waiting (subtle spinner "Menunggu pembayaran…" (Waiting for payment…)), Successful (success), Expired, Failed |
| **DemoPaymentControls** | `DEMO_MODE` only: dashed `info` box, buttons "Simulasikan Bayar Berhasil" (Simulate Successful Payment) & "Simulasikan Kedaluwarsa" (Simulate Expiry) |
| **OrderTimeline** | Vertical: Dibuat → Dibayar → Diproses → Dikirim (resi + Salin) → Terkirim (Created → Paid → Processing → Shipped (tracking number + Copy) → Delivered); active dot ink, completed success, upcoming border |

### 7.4 Admin (`src/components/admin`)
Uses the same primitives at a tighter density (Button `sm`, 14px tables). Components: DataTable (sort, filter, pagination), StatCard, VariantStockGrid (size × width, numeric inputs, change highlighting), StatusSelect (valid transitions only), CheckoutLinkBuilder, OutboxList (WA chat bubble preview).

## 8. Copy & glossary

**Voice:** "kamu" (informal "you"), short sentences, positive, no excessive exclamation marks. EN: friendly, plain.

| Key | ID | EN |
|---|---|---|
| cta.addToCart | Tambah ke Keranjang | Add to Cart |
| cta.notifyMe | Kabari Saya via WA | Notify Me on WhatsApp |
| cta.askWa | Tanya via WA | Ask on WhatsApp |
| cta.sizeConsult | Konsultasi Ukuran via WA | Size Consultation on WhatsApp |
| cta.checkout | Checkout | Checkout |
| cta.payNow | Bayar Sekarang | Pay Now |
| cta.copy / copied | Salin / Disalin | Copy / Copied |
| stock.ready | Ready · dikirim 1–2 hari kerja | In stock · ships in 1–2 business days |
| stock.low | Sisa {n} | Only {n} left |
| stock.preorder | Pre-order · estimasi {lead} minggu | Pre-order · est. {lead} weeks |
| stock.soldout | Habis | Sold out |
| checkout.waLabel | Nomor WhatsApp | WhatsApp number |
| checkout.waHelp | Konfirmasi & update pesanan dikirim ke nomor ini | Order confirmation & updates go to this number |
| checkout.outsideJava | Di luar Pulau Jawa? Hubungi kami via WA | Outside Java? Contact us on WhatsApp |
| pay.waiting | Menunggu pembayaran… | Waiting for payment… |
| pay.expiresIn | Bayar dalam | Pay within |
| error.stock | Stok {item} tidak cukup. Kami sudah menyesuaikan keranjangmu. | Not enough stock for {item}. We've updated your cart. |

**Not translated** (`design-system/glossary.json`): disciplines & products (Ballet, Pointe, Jazz, Tap, Character, Latin, Ballroom, Contemporary, Leotard, Tights, Body Liner, Skirt, Warm-up), anatomy (shank, box, vamp, platform, split sole, full sole, drawstring, demi-pointe, heel), width (Narrow, Medium, Wide, A–EE), shank (Full Soft, Full Normal, Full Reinforced, Full Extra Reinforced), Só Dança color names, model names & codes. "Pre-order", "Ready", "Checkout" are also kept as-is in the ID version (common in Indonesia).

**Forbidden:** "Official", "Authorized", "Resmi Só Dança", "Só Dança Indonesia", "COD", "Bayar di tempat", "Cicilan" (v1).

## 9. Token implementation (Tailwind v4)

```css
/* src/styles/globals.css */
@import "tailwindcss";
@import "../../design-system/tokens.css";
@theme inline {
  --color-bg: var(--color-bg);
  --color-surface-alt: var(--color-surface-alt);
  --color-ink: var(--color-ink);
  --color-ink-muted: var(--color-ink-muted);
  /* … map all color, font and radius tokens from tokens.css */
  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --radius-sm: var(--radius-sm);
}
```
Lint rule: forbid Tailwind's built-in color classes (`bg-gray-*`, `text-red-*`, etc.) and arbitrary hex values (`bg-[#...]`) in `src/components/**`.

## 10. Storybook — definition of done

- **Foundations** page: Colors (with contrast ratios), Typography, Spacing, Radius, Icons.
- Every §7 component: a story per variant + state, prop controls, mobile & desktop viewports, a11y addon with 0 violations.
- **Patterns** page: Stock (4 statuses on card, PDP, size chip), Price, WhatsApp (all contexts), Checkout (full flow with mock data), Payment page (QRIS/VA/e-wallet/card × waiting/successful/expired).
- ID/EN locale toggle in the Storybook toolbar.
