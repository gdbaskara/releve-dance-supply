# Components — API reference (WS-1)

Presentational only: props in, callbacks out. No data fetching, no server actions, no DB imports.
Live showcase with every variant/state: **`/id/design-system`** (or `/en/…`) — replaces Storybook (decision D-27).

```ts
import { Button, Input, Dialog, DialogContent, useToast } from "@/components/ui";
import { ProductCard, VariantPicker, WhatsAppButton } from "@/components/store";
import { PhoneInput, OrderSummary, QRISPanel } from "@/components/checkout";
```

## Conventions (read once)

- **i18n**: default labels come from the `common` namespace (`messages/{id,en}/common.json`, owned by WS-1). Most components accept a `label`/`title` override. Pass page-specific copy from your own namespace.
- **Links**: components render `<a>` by default. For internal routes pass next-intl's Link: `linkAs={Link}` (from `@/i18n/navigation`), or `<Button asChild><Link href="/cart">…</Link></Button>`. `linkAs` can only be passed from a client component (functions don't cross the server→client boundary); from a server component just pass hrefs.
- **Money**: every price is integer Rupiah rendered with `formatIDR`. Never format prices yourself in markup — use `<Price>`.
- **Variant label**: `"Ballet Pink · 7.5L · C"` → `variantLabel(variant)` from `@/components/store`.
- **Toast**: `ToastProvider` is already mounted in `src/app/[locale]/providers.tsx` and `src/app/admin/layout.tsx`. Call `const { toast } = useToast(); toast({ title, description?, variant: "success" | "error" | "info" })`. `StickyPayBar` automatically lifts toasts above itself on mobile; for other fixed bottom bars call `useToastOffset(px)`. `useToast()` is a safe no-op outside a provider.
- **Dialog vs Sheet vs Drawer**: `DialogContent variant="responsive"` (default) = bottom sheet < 768px, centred modal ≥ 768px — use for SizeGuide, confirmations, filters. `variant="center"` = always modal; `variant="sheet"`/`SheetContent` = always bottom sheet. `DrawerContent side="responsive"` = bottom on mobile, right 420px on desktop (cart); `side="left"` = mobile nav.
- **Breakpoints**: theme `sm` is **360px** (all phones). Use `md:` (768) for tablet and `lg:` (1024) for desktop.
- **Colours**: token classes only (`bg-ink`, `text-ink-muted`, …). Product colour swatches are data and use inline styles via `swatchBackground()`.

---

## `ui/` — primitives

| Export | Key props | Example |
|---|---|---|
| `Button`, `buttonVariants` | `variant: primary\|secondary\|ghost\|whatsapp\|danger`, `size: md(48)\|sm(36)`, `fullWidth`, `loading`, `leadingIcon`, `trailingIcon`, `asChild` | `<Button fullWidth loading={pending}>{t("payNow")}</Button>` |
| `IconButton` | `label` (required, aria), `variant: ghost\|outline`, `badge?: number` | `<IconButton label="Cari"><Search/></IconButton>` |
| `TextLink`, `linkStyles` | `variant: inline\|nav\|subtle`, `asChild` | `<Link className={linkStyles({variant:"nav"})} href="/c/pointe">POINTE</Link>` |
| `Field`, `controlBase` | render-prop wiring label/helper/error → `id`, `aria-*` | for custom controls |
| `Input` | `label`, `helper`, `error`, `optional`, `prefix`, `suffix`, `wrapperClassName` + native props | `<Input label="Kode pos" inputMode="numeric" error={e.postalCode}/>` |
| `Textarea` | same as Input (no prefix/suffix) | `<Textarea label="Alamat lengkap" {...register("line")}/>` |
| `Select`, `SelectOption` | `options`, `placeholder`, + Input props (native `<select>`) | `<Select label="Provinsi" options={opts} placeholder="Pilih" />` |
| `Combobox`, `ComboboxOption` | `options`, `value: string\|null`, `onChange`, `label`, `error`, `disabled`, `name`, `emptyText` | `<Combobox label="Kab/Kota" options={cities} value={city} onChange={setCity}/>` |
| `Checkbox` | Radix props (`checked`, `onCheckedChange`) + `label`, `description`, `error`, `aside` | `<Checkbox checked={optIn} onCheckedChange={(c)=>setOptIn(c===true)} label="…"/>` |
| `RadioGroup`, `Radio`, `RadioCard` | Group: Radix props + `legend`, `showLegend`, `error`. Card: `value`, `title`, `description`, `media`, `aside`, `hideIndicator` | `<RadioGroup value={v} onValueChange={setV}><RadioCard value="a" title="JNE YES" aside="Rp 18.000"/></RadioGroup>` |
| `Badge`, `badgeVariants` | `variant: neutral\|success\|warning\|error\|info\|accent\|solid\|outline` | `<Badge variant="accent">Baru</Badge>` |
| `Chip` | `selected`, `count`, button props | `<Chip selected={on} onClick={toggle}>7.5</Chip>` |
| `SegmentedControl`, `SegmentOption` | `options[{value,label,disabled,unavailable,srHint,marker}]`, `value`, `onChange`, `label`, `size`, `fullWidth` | `<SegmentedControl label="Width" options={o} value={w} onChange={setW}/>` |
| `Tabs`, `TabItem` | `items[{value,label,content}]`, `label`, `value/defaultValue/onValueChange`, `variant: underline\|pill` | `<Tabs label="Info" items={items}/>` |
| `Accordion` | `items[{value,title,content,meta?}]`, `type: single\|multiple`, `defaultOpen`, `headerStyle: eyebrow\|text` | `<Accordion items={[{value:"desc",title:"Deskripsi",content:…}]}/>` |
| `Dialog`, `DialogTrigger`, `DialogClose`, `DialogContent` | Content: `title` (required), `description`, `hideTitle`, `footer`, `flush`, `variant: responsive\|center\|sheet`, `size: sm\|md\|lg` | `<Dialog open={o} onOpenChange={setO}><DialogContent title="Panduan Ukuran">…</DialogContent></Dialog>` |
| `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent` | aliases; SheetContent = bottom sheet | |
| `Drawer`, `DrawerTrigger`, `DrawerClose`, `DrawerContent` | Content: `side: responsive\|right\|left\|bottom`, `title`, `footer` | `<DrawerContent side="left" title="Menu">…</DrawerContent>` |
| `ToastProvider`, `useToast`, `useToastOffset` | provider `mobileOffset`; `toast({title,description,variant,duration,action})`, `dismiss(id)`; `useToastOffset(px)` while mounted | `toast({ title: "Disalin", variant: "success" })` |
| `Skeleton` | `variant: text\|image\|card\|block`, `lines`, `className` | `<Skeleton variant="card"/>` |
| `Tooltip` | `content`, `children` (single element), `side` — hover/focus only, supplementary info | `<Tooltip content="…"><button>…</button></Tooltip>` |
| `InfoTip` | `label` (aria), `content`, `side` — tap-friendly ⓘ popover for glossary terms | `<InfoTip label="Apa itu shank?" content={…}/>` |
| `Breadcrumb` | `items[{label,href?}]`, `label` (aria), `linkAs` | `<Breadcrumb label={t("common.breadcrumb")} items={…} linkAs={Link}/>` |
| `Spinner` | `size`, `label?` (else decorative) | `<Spinner label="Memuat…"/>` |
| `CopyButton` | `value`, `label?`, `ariaLabel?`, `toastTitle?: string\|false`, `appearance: inline\|outline`, `onCopied` | `<CopyButton value={vaNumber} ariaLabel="Salin nomor VA"/>` |
| `Notice` | `tone: info\|success\|warning\|error\|neutral\|accent`, `title`, `actions`, `live` (role=alert) | `<Notice tone="info" title="Pointe sebaiknya difitting">…</Notice>` |
| `LoadMore` | `shown`, `total`, `onLoadMore` or `href`, `loading` | `<LoadMore shown={24} total={96} href="?page=2"/>` |

## `store/` — storefront

| Export | Key props | Example |
|---|---|---|
| `Price` | `value` (int IDR), `size: sm\|md\|lg\|xl`, `from`, `compareAt` | `<Price value={p.priceIdr} size="lg"/>` |
| `StockBadge`, `formatLead` | `status`, `available?` (LOW → "Sisa n"; omitted → "Stok terbatas"), `leadWeeks`, `appearance: badge\|inline` | `<StockBadge status="PREORDER" leadWeeks="4-6"/>` |
| `AvailabilityLine` | `status: StockStatus\|null` (null = no selection), `available`, `leadWeeks` | `<AvailabilityLine status={v?.status ?? null} available={v?.available}/>` |
| `ProductImage`, `ShoePlaceholderArt` | `src\|null`, `alt`, `modelCode`, `hoverSrc`, `sizes`, `priority`, `aspectClassName` — falls back to placeholder on null/error | `<ProductImage src={img?.url} alt={name} modelCode="SD16"/>` |
| `ProductCard` | `product: ProductSummary`, `href`, `lowStockCount?`, `hoverImageUrl?`, `priceFrom?`, `tag?`, `linkAs`, `priority` | `<ProductCard product={p} href={`/p/${p.slug}`} linkAs={Link}/>` |
| `ColorSwatch`, `ColorSwatches`, `ColorSelector` | swatch: `color`, `size`, `soldOut`; swatches: `colors`, `max=5`; selector: `options[{value,status}]`, `value`, `onChange` | `<ColorSwatches colors={p.colors}/>` |
| `swatchBackground`, `isLightSwatch` | colour name → CSS background | |
| `SizeSelector` | `options[{value,status,available,leadWeeks}]`, `value`, `onChange`, `onSizeGuide` or `sizeGuideHref`, `error` | usually via VariantPicker |
| `WidthSelector`, `ShankSelector` | `options[{value,status}]`, `value`, `onChange`, `label?`, `error?` (glossary InfoTip built-in) | usually via VariantPicker |
| `VariantPicker` | `product` (ProductDetail-like), `selection?` (controlled) / `defaultSelection?`, `onChange(state)`, `onSizeGuide`, `sizeGuideHref`, `showMissing` | `<VariantPicker product={p} onChange={setVs} onSizeGuide={()=>setSg(true)} showMissing={triedAdd}/>` |
| `resolveVariant`, `optionValueStates`, `reconcileSelection`, `optionKeys`, `optionValues`, `variantLabel`, `splitSize`, types `Selection`, `VariantState`, `OptionKey` | pure logic (server-safe). `resolveVariant(p, sel)` → `{selection, variant, sku, complete, missing}` | `const s = resolveVariant(p, { color: searchParams.color })` |
| `QtyStepper` | `value`, `onChange`, `max` (available or 5 for PO), `min=1`, `itemName`, `size` | `<QtyStepper value={q} max={line.maxQty} onChange={setQ}/>` |
| `CartLine` | `line: CartLineView`, `onQtyChange(sku,qty)`, `onRemove(sku)`, `href`, `linkAs`, `locked`, `error` | `<CartLine line={l} onQtyChange={upd} onRemove={rm}/>` |
| `CartDrawer` | `open`, `onOpenChange`, `lines`, `subtotalIdr`, `notices[{tone,message}]`, `onQtyChange`, `onRemove`, `checkoutHref`/`onCheckout`, `waHref`, `continueHref`, `lineHref`, `linkAs` — mixed pre-order notice is automatic | `<CartDrawer open={o} onOpenChange={setO} lines={cart.lines} subtotalIdr={cart.subtotalIdr} checkoutHref="/checkout" linkAs={Link}/>` |
| `WhatsAppButton`, `WhatsAppIcon` | `href` (ready wa.me link from `buildWaLink` in `@/lib/wa`), `variant: fab\|inline\|link`, `label?`, `fullWidth`, `size` | `<WhatsAppButton href={buildWaLink("pdp", vars, locale)}/>` |
| `LanguageToggle` | `locale`, `hrefs?: {id,en}` (preferred) or `onChange(locale)`, `linkAs` | `<LanguageToggle locale={locale} hrefs={{id:"/id/p/x",en:"/en/p/x"}}/>` |
| `TrustStrip` | `items?: ("original"\|"jakarta"\|"payment"\|"consult")[]`, `variant: full\|mini` | `<TrustStrip variant="mini" items={["jakarta","payment"]}/>` |
| `EmptyState` | `icon`, `title`, `description`, `actions` | `<EmptyState title="…" actions={<WhatsAppButton …/>}/>` |
| `DemoBanner` | `message?` — render only when `DEMO_MODE` | `{demo && <DemoBanner/>}` |
| `FilterPanel`, `FilterSheet`, types `FilterFacet`, `FilterSelection` | `facets[{key,label,kind: chips\|checkbox\|swatch,options[{value,label?,count}]}]`, `selected`, `onChange(next)`, `onClear`, `hideHeader`; Sheet adds `resultCount`, `open/onOpenChange`, `trigger` | desktop `<aside className="w-60"><FilterPanel …/></aside>`, mobile `<FilterSheet resultCount={total} …/>` |
| `SizeGuideContent`, `SizeGuideDialog` | `waHref`, `defaultCategory: balletJazz\|pointe\|tapCharacter\|ballroom\|dancewear`; Dialog adds `open`, `onOpenChange`, `trigger`. Tables are **approximate (Q-06)** | `<SizeGuideDialog open={sg} onOpenChange={setSg} waHref={wa} defaultCategory="pointe"/>` |
| `CompareStyles` | `items[{name,modelCode,imageUrl,href,sole,material,priceIdr,current?}]` (max 3), `title?`, `linkAs` | `<CompareStyles items={related}/>` |
| `Wordmark` | `size: sm\|md\|lg`, `compact` (no "DANCE SUPPLY"), `inverse` | `<Wordmark size="md"/>` |
| `LogoTile`, `LOGO_TEXT` | `code` ("BCA", "GOPAY", "JNE"…), `size`, `active` — neutral text tile, not trademark art | `<LogoTile code="QRIS"/>` |
| `Header`, `NavItem` | `navItems`, `homeHref`, `cartCount`, `onCartClick`/`cartHref`, `onSearchClick`/`searchHref`, `languageToggle` (slot), `mobileMenuFooter`, `topSlot`, `linkAs` | `<Header navItems={nav} cartCount={n} onCartClick={open} languageToggle={<LanguageToggle …/>} linkAs={Link}/>` |
| `Footer`, `FooterColumn` | `columns[{title,links[{label,href,external?}]}]`, `contact` (slot), `bottomSlot`, `paymentCodes?`, `courierCodes?`, `linkAs` — disclaimer included | `<Footer columns={cols} contact={…} bottomSlot={<LanguageToggle …/>}/>` |

## `checkout/` — checkout & pay page

| Export | Key props | Example |
|---|---|---|
| `CheckoutStep` | `number`, `title`, `status: active\|done\|locked`, `summary`, `onEdit`, `footer`, children (rendered when active) | `<CheckoutStep number={2} title="Pengiriman" status="active">…</CheckoutStep>` |
| `PhoneInput`, `toLocalDigits`, `formatLocalDigits` | `value` (store `change.local`), `onValueChange({local,e164,valid})`, `label?`, `helper?`, `error?`, `validateOnBlur=true`, `name` (hidden input with E.164) | `<PhoneInput value={wa} onValueChange={(c)=>{setWa(c.local); setE164(c.e164)}}/>` |
| `AddressForm`, `EMPTY_ADDRESS`, types `AddressValue`, `AddressErrors`, `AddressProvince` | `provinces` (from `data/shipping/java-areas.json`), `value`, `onChange`, `errors`, `outsideJavaHref`, `namePrefix`, `disabled`. Province change clears city | `<AddressForm provinces={areas.provinces} value={addr} onChange={setAddr} errors={errs}/>` |
| `CourierOptions`, `CourierOption` | `rates: ShippingRate[]`, `value: serviceCode\|null`, `onChange`, `loading` (skeleton), `error`, `emptyText` — grouped Instan/Express/Reguler | `<CourierOptions rates={rates} value={code} onChange={setCode} loading={pending}/>` |
| `InsuranceToggle` | `checked` (init true), `onCheckedChange`, `amountIdr` | `<InsuranceToggle checked={ins} onCheckedChange={setIns} amountIdr={rate.insuranceIdr}/>` |
| `PaymentMethodGroup`, `PaymentMethodTile`, `paymentKey`, `parsePaymentKey`, type `PaymentSelection` | Group: `value: {method,channel?}\|null`, `onChange`, `options = PAYMENT_OPTIONS`, `disabledKeys`, `error` | `<PaymentMethodGroup value={pm} onChange={setPm}/>` |
| `OrderSummary`, `VoucherField`, type `SummaryItem` | Summary: `items`, `subtotalIdr`, `shippingIdr\|null`, `insuranceIdr`, `discountIdr`, `totalIdr` (server values), `voucher` slot, `mode: responsive\|panel\|collapsible`. Voucher: `value`, `onValueChange`, `onApply(code)`, `appliedCode`, `onRemove`, `loading`, `error` (no nested `<form>`) | `<OrderSummary items={…} totalIdr={quote.total} voucher={<VoucherField …/>}/>` |
| `StickyPayBar` | `totalIdr`, `onPay` or `submit` + `form`, `loading`, `disabled`, `label`, `mobileOnly=true` — fixed; add `pb-24` to the page | `<StickyPayBar totalIdr={total} submit form="checkout"/>` |
| `Countdown`, `useCountdown`, `formatRemaining`, `WARNING_THRESHOLD_MS` | `expiresAt`, `onExpire` (once), `onRenew`/`renewHref` (expired CTA), `label`, `appearance: block\|inline` | `<Countdown expiresAt={p.expiresAt} onExpire={refresh} renewHref="/checkout"/>` |
| `QRISPanel`, `QRCodeSvg`, `qrSvgMarkup` | `qrString`, `amountIdr`, `expiresAt`, `onExpire`, `orderNo` (download filename). QR rendered synchronously with `qrcode` | `<QRISPanel qrString={pay.qrString} amountIdr={o.totalIdr} expiresAt={pay.expiresAt}/>` |
| `VAPanel`, `groupDigits` | `bank: VaChannel`, `vaNumber`, `amountIdr`, `expiresAt`, `onExpire` | `<VAPanel bank="BCA" vaNumber={pay.vaNumber} …/>` |
| `EwalletPanel` | `wallet: EwalletChannel`, `redirectUrl`, `amountIdr`, `expiresAt`, `onExpire`, `onSwitchToQris?` | `<EwalletPanel wallet="GOPAY" redirectUrl={pay.redirectUrl} …/>` |
| `CardForm`, `detectCardBrand`, `maskCardNumber`, `maskExpiry`, type `CardFormValues` | `amountIdr`, `onSubmit({number,expiry,cvv,brand})`, `loading`, `testCard` (note; default 4811…1114, "4000 0000 0000 0002" fails in the mock), `error` | `<CardForm amountIdr={total} onSubmit={(v)=>completeMockPaymentAction(no,{cardNumber:v.number})}/>` |
| `PaymentStatus` | `status: waiting\|paid\|expired\|failed`, `title?`, `description?`, `actions`, `appearance: full\|compact` (role=status) | `<PaymentStatus status="expired" actions={<Button>Pesan lagi</Button>}/>` |
| `DemoPaymentControls` | `onSimulatePaid`, `onSimulateExpired`, `loading: "paid"\|"expired"\|null` — render only in DEMO_MODE | `{demo && <DemoPaymentControls onSimulatePaid={…} onSimulateExpired={…}/>}` |
| `OrderTimeline` | `entries: OrderTimelineEntry[]`, `tracking?: {courier, awb}` (resi + Salin on SHIPPED). Dates in WIB | `<OrderTimeline entries={o.timeline} tracking={o.tracking}/>` |

## Assets

- `public/brand/wordmark.svg`, `public/brand/mark.svg` (favicon-style "R" in an ink square)
- `public/icons/whatsapp.svg`, `public/icons/product-placeholder.svg`
- `public/icons/payment/<code>.svg` + `<code>-active.svg`, `public/icons/courier/<code>.svg` + `-active` — neutral text badges (not trademark artwork)

## Tests

`tests/unit/components/*.test.tsx` (jsdom) — VariantPicker/variant logic, PhoneInput, Countdown, Price/StockBadge. Helper `renderIntl()` in `tests/unit/components/intl.tsx` wraps with `NextIntlClientProvider` + `common` messages.
