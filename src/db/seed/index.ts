/**
 * `pnpm db:seed` — products/variants from data/catalog/products.json, stock movements, admin user,
 * voucher RELEVE10, 12 sample orders and 3 back-in-stock requests.
 * Idempotent: truncates every table first, so it can run on a fresh or an already-seeded DB.
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pgClient, type DB } from "@/db";
import { adminUsers, backInStockRequests, products, stockMovements, variants, vouchers, waOutbox } from "@/db/schema";
import { loadRawCatalog } from "@/lib/data/catalog";
import { referenceImagesEnabled } from "@/lib/providers/env";
import { buildProductCopy } from "./content";
import { seedOrders } from "./orders";

const TABLES = [
  "payment_events", "wa_outbox", "back_in_stock_requests", "stock_reservations", "payments", "order_items", "orders",
  "checkout_links", "stock_movements", "variants", "products", "vouchers", "admin_users",
];

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

export async function truncateAll(conn: DB = db): Promise<void> {
  await conn.execute(sql.raw(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`));
}

export async function seedCatalog(conn: DB = db): Promise<{ products: number; variants: number; movements: number }> {
  const raw = loadRawCatalog();
  const refImages = referenceImagesEnabled();
  const now = new Date();
  const productRows = raw.map((p, i) => {
    const copy = buildProductCopy(p);
    return {
      id: p.slug,
      modelCode: p.model_code,
      name: p.name,
      brand: p.brand || "Só Dança",
      discipline: p.discipline,
      audience: p.audience,
      group: p.pricing.group,
      priceIdr: p.price_idr,
      msrpUsd: p.pricing.msrp_usd.toFixed(2),
      landedCostIdr: p.pricing.landed_cost_idr,
      descriptionEn: p.description_en_source ?? "",
      descriptionId: copy.descriptionId,
      featuresId: copy.featuresId,
      featuresEn: copy.featuresEn,
      colors: p.colors ?? [],
      widths: p.widths ?? [],
      options: p.options ?? [],
      images: refImages && p.reference_image_url ? [{ url: p.reference_image_url, alt: `${p.name} ${p.model_code}` }] : [],
      referenceImageUrl: p.reference_image_url,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    };
  });
  const variantRows = raw.flatMap((p) =>
    p.variants.map((v, i) => ({
      sku: v.sku,
      productId: p.slug,
      color: v.color ?? null,
      size: v.size ?? null,
      width: v.width ?? null,
      shank: v.shank ?? null,
      sortOrder: i,
      weightGrams: v.weight_grams,
      onHand: Math.max(0, v.stock_qty ?? 0),
      reserved: 0,
      preorderEnabled: v.stock_status === "PREORDER",
      preorderLeadWeeks: v.stock_status === "PREORDER" ? (v.preorder_lead_weeks ?? "4-6") : null,
      createdAt: now,
      updatedAt: now,
    })),
  );
  const movementRows = variantRows
    .filter((v) => v.onHand > 0)
    .map((v) => ({ sku: v.sku, delta: v.onHand, reason: "seed" as const, ref: "products.json", actor: "seed", createdAt: now }));

  await conn.insert(products).values(productRows);
  await chunked(variantRows, 500, (c) => conn.insert(variants).values(c));
  await chunked(movementRows, 500, (c) => conn.insert(stockMovements).values(c));
  return { products: productRows.length, variants: variantRows.length, movements: movementRows.length };
}

export async function seedAdminAndVoucher(conn: DB = db): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? "admin@releve.test").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const hash = process.env.ADMIN_PASSWORD_HASH ?? (password ? await bcrypt.hash(password, 10) : null);
  if (!hash) throw new Error("Set ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) to seed the admin user");
  await conn.insert(adminUsers).values({ email, passwordHash: hash, name: "Admin Relevé" });
  await conn.insert(vouchers).values({ code: "RELEVE10", type: "percent", value: 10, minSubtotalIdr: 500_000, active: true });
}

export async function seedBackInStock(conn: DB = db): Promise<number> {
  const pick = async (productId: string, n: number) =>
    conn.execute<{ sku: string }>(
      sql`select sku from variants where product_id = ${productId} and on_hand - reserved <= 0 and not preorder_enabled order by sort_order limit ${n}`,
    );
  const roy = await pick("roy-bl104", 2);
  const elsie = await pick("elsie-sl248", 1);
  const rows = [
    { sku: roy[0]?.sku, customerWa: "+6281233344455", locale: "id" as const, createdAt: new Date(Date.now() - 3 * 86_400_000) },
    { sku: roy[1]?.sku, customerWa: "+6285799900011", locale: "en" as const, createdAt: new Date(Date.now() - 1 * 86_400_000) },
    { sku: elsie[0]?.sku, customerWa: "+6281366677788", locale: "id" as const, createdAt: new Date(Date.now() - 2 * 86_400_000) },
  ].filter((r): r is { sku: string; customerWa: string; locale: "id" | "en"; createdAt: Date } => !!r.sku);
  if (rows.length) await conn.insert(backInStockRequests).values(rows);
  return rows.length;
}

async function main() {
  const t0 = Date.now();
  await truncateAll();
  const catalog = await seedCatalog();
  await seedAdminAndVoucher();
  const orderCount = await seedOrders(db);
  const bis = await seedBackInStock();
  const [{ n: outbox }] = await db.select({ n: sql<number>`count(*)::int` }).from(waOutbox);
  console.log(
    `Seeded: ${catalog.products} products, ${catalog.variants} variants, ${catalog.movements} stock movements, ` +
      `1 admin (${process.env.ADMIN_EMAIL}), 1 voucher, ${orderCount} orders, ${outbox} WA outbox messages, ` +
      `${bis} back-in-stock requests in ${Date.now() - t0} ms`,
  );
}

if (process.argv[1] && /seed[\\/]index\.ts$/.test(process.argv[1])) {
  main()
    .then(() => pgClient.end())
    .catch(async (err) => {
      console.error(err);
      await pgClient.end();
      process.exit(1);
    });
}
