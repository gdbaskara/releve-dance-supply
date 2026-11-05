import catalog from "../../../../../data/catalog/products.json";
import areas from "../../../../../data/shipping/java-areas.json";
import {
  aggregateStockStatus,
  type CartLineView,
  type OrderTimelineEntry,
  type ProductDetail,
  type ProductSummary,
  type ShippingRate,
  type StockStatus,
  type VariantOption,
} from "@/lib/contracts";
import { variantLabel } from "@/components/store/variant-logic";

/** Mock data for the design-system showcase only (read straight from data/**; real pages use WS-2 services). */

interface RawVariant {
  sku: string;
  color?: string | null;
  size?: string | null;
  width?: string | null;
  shank?: string | null;
  stock_qty: number;
  stock_status: StockStatus;
  preorder_lead_weeks: string | null;
  weight_grams: number;
}
interface RawProduct {
  slug: string;
  model_code: string;
  name: string;
  brand: string;
  discipline: ProductDetail["discipline"];
  audience: ProductDetail["audience"];
  price_idr: number;
  options: VariantOption[];
  colors: string[];
  widths: string[];
  description_en_source: string;
  reference_image_url?: string | null;
  pricing: { group: ProductDetail["group"] };
  variants: RawVariant[];
}

const useRefImages = process.env.DEMO_USE_REFERENCE_IMAGES === "true";

function toDetail(p: RawProduct): ProductDetail {
  const variants = p.variants.map((v) => ({
    sku: v.sku,
    color: v.color ?? null,
    size: v.size ?? null,
    width: v.width ?? null,
    shank: v.shank ?? null,
    available: v.stock_qty,
    status: v.stock_status,
    preorderLeadWeeks: v.preorder_lead_weeks,
    weightGrams: v.weight_grams,
  }));
  const image = useRefImages && p.reference_image_url ? { url: p.reference_image_url, alt: p.name } : null;
  return {
    id: p.slug,
    slug: p.slug,
    modelCode: p.model_code,
    name: p.name,
    brand: p.brand,
    discipline: p.discipline,
    audience: p.audience,
    priceIdr: p.price_idr,
    colors: p.colors,
    status: aggregateStockStatus(variants.map((v) => v.status)),
    image,
    group: p.pricing.group,
    options: p.options,
    widths: p.widths,
    descriptionEn: p.description_en_source,
    descriptionId: null,
    featuresId: [],
    featuresEn: [],
    images: image ? [image] : [],
    variants,
  };
}

const bySlug = new Map((catalog.products as unknown as RawProduct[]).map((p) => [p.slug, p]));
function product(slug: string): ProductDetail {
  const p = bySlug.get(slug);
  if (!p) throw new Error(`showcase: missing product ${slug}`);
  return toDetail(p);
}

export function getShowcaseData() {
  const nowMs = Date.now();
  const claudia = product("claudia-satin-sd09"); // Color · Size · Width · Shank
  const jocelyn = product("jocelyn-jz45a"); // Narrow / Medium / Wide
  const diamond = product("diamond-sd140");
  const leather = product("sd60l-leather-sd60l");
  const briar = product("briar-sd110l");
  const roy = product("roy-bl104");
  const bliss = product("bliss-stretch-canvas-sd16-kids");
  const alina = product("alina-iii-pointe-shoe-p93");
  const farfalla = product("farfalla-sl243");
  const jive = product("jive-iii-bl302");

  const summary = (p: ProductDetail, status?: StockStatus): ProductSummary => ({
    id: p.id,
    slug: p.slug,
    modelCode: p.modelCode,
    name: p.name,
    brand: p.brand,
    discipline: p.discipline,
    audience: p.audience,
    priceIdr: p.priceIdr,
    colors: p.colors,
    status: status ?? p.status,
    image: p.image,
  });

  const line = (p: ProductDetail, idx: number, qty: number): CartLineView => {
    const v = p.variants[idx];
    return {
      sku: v.sku,
      productSlug: p.slug,
      name: p.name,
      modelCode: p.modelCode,
      variantLabel: variantLabel(v),
      imageUrl: p.image?.url ?? null,
      priceIdr: p.priceIdr,
      qty,
      maxQty: v.status === "PREORDER" ? 5 : Math.max(1, v.available),
      isPreorder: v.status === "PREORDER",
      preorderLeadWeeks: v.preorderLeadWeeks,
      status: v.status,
    };
  };
  const readyIdx = (p: ProductDetail) => Math.max(0, p.variants.findIndex((v) => v.status === "READY"));
  const preIdx = (p: ProductDetail) => Math.max(0, p.variants.findIndex((v) => v.status === "PREORDER"));

  const cart: CartLineView[] = [line(diamond, readyIdx(diamond), 1), line(farfalla, readyIdx(farfalla), 2), line(briar, preIdx(briar), 1)];

  const rates: ShippingRate[] = [
    { serviceCode: "gosend_instant", courier: "GoSend", service: "Instant", type: "instant", priceIdr: 38000, insuranceIdr: 6500, eta: "1-3", etaUnit: "hours", cutoff: "15:00 WIB" },
    { serviceCode: "grab_sameday", courier: "GrabExpress", service: "Same Day", type: "instant", priceIdr: 27000, insuranceIdr: 6500, eta: "6-8", etaUnit: "hours", cutoff: "14:00 WIB" },
    { serviceCode: "jne_yes", courier: "JNE", service: "YES", type: "express", priceIdr: 18000, insuranceIdr: 6500, eta: "1", etaUnit: "days" },
    { serviceCode: "jne_reg", courier: "JNE", service: "REG", type: "regular", priceIdr: 10000, insuranceIdr: 6500, eta: "1-2", etaUnit: "days" },
    { serviceCode: "jnt_ez", courier: "J&T", service: "EZ", type: "regular", priceIdr: 9000, insuranceIdr: 6500, eta: "1-2", etaUnit: "days" },
    { serviceCode: "sicepat_reg", courier: "SiCepat", service: "REG", type: "regular", priceIdr: 9500, insuranceIdr: 6500, eta: "1-2", etaUnit: "days" },
  ];

  const h = 3_600_000;
  const timeline: OrderTimelineEntry[] = [
    { status: "PENDING_PAYMENT", at: new Date(nowMs - 30 * h), done: true },
    { status: "PAID", at: new Date(nowMs - 29.8 * h), done: true, note: "QRIS" },
    { status: "PROCESSING", at: new Date(nowMs - 20 * h), done: true },
    { status: "SHIPPED", at: new Date(nowMs - 3 * h), done: true },
    { status: "DELIVERED", at: null, done: false },
  ];

  return {
    nowMs,
    picker: { claudia, jocelyn },
    stockCards: [summary(diamond), summary(leather, "LOW"), summary(briar), summary(roy)],
    grid: [summary(bliss), summary(alina), summary(farfalla), summary(jive)],
    cart,
    rates,
    timeline,
    provinces: areas.provinces,
    qrString:
      "00020101021226660014ID.CO.QRIS.WWW01189360091530000000000215ID10264758392810303UMI51440014ID.CO.QRIS.WWW0215ID10264758392810303UMI5204594153033605406875000.005802ID5920RELEVE DANCE SUPPLY6013JAKARTA SELAT61051219062140510RLV-2611056304A1B2",
    vaNumber: "8808120004571234",
    compare: [diamond, bliss, jocelyn].map((p, i) => ({
      name: p.name,
      modelCode: p.modelCode,
      imageUrl: p.image?.url ?? null,
      href: `#${p.slug}`,
      sole: i === 2 ? "Split sole" : i === 1 ? "Split sole · stretch canvas" : "Split sole · leather",
      material: i === 2 ? "Leather" : i === 1 ? "Stretch canvas" : "Leather & elastic",
      priceIdr: p.priceIdr,
      current: i === 0,
    })),
  };
}

export type ShowcaseData = ReturnType<typeof getShowcaseData>;
