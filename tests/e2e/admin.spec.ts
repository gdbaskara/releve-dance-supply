/**
 * WS-5 Admin e2e — ADM-01..06, D2 (admin side), D3, D7 (admin side).
 * Run: E2E_BASE_URL=http://localhost:3105 pnpm test:e2e tests/e2e/admin.spec.ts
 *
 * The tests mutate the dev DB; every test restores what it changed (stock, order status, back-in-stock requests,
 * created links/messages) so the seeded demo data stays usable and the spec can run on both projects.
 */
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

function envFromFile(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const line = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${key}=`));
    return line?.slice(key.length + 1).trim();
  } catch {
    return undefined;
  }
}

const ADMIN_EMAIL = envFromFile("ADMIN_EMAIL") ?? "admin@releve.test";
const ADMIN_PASSWORD = envFromFile("ADMIN_PASSWORD") ?? "releve-demo";
const sql = postgres(envFromFile("DATABASE_URL") ?? "postgres://releve:releve@localhost:5432/releve", { max: 2, onnotice: () => {} });

test.afterAll(async () => {
  await sql.end();
});

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("admin auth (ADM-01)", () => {
  test("unauthenticated /admin redirects to login", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
  });

  test("wrong password shows an error", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("salah-sekali");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Email atau password salah.")).toBeVisible();
  });

  test("login → dashboard with stats (ADM-02), logout", async ({ page }) => {
    await login(page);
    const stats = page.getByTestId("stats");
    for (const label of ["Menunggu bayar", "Perlu diproses", "Perlu dikirim", "Stok rendah"]) {
      await expect(stats.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(stats.getByTestId("stat-value")).toHaveCount(4);
    await expect(page.getByRole("heading", { name: "10 order terbaru" })).toBeVisible();

    // logout (sidebar on desktop, menu drawer on mobile)
    const menu = page.getByRole("button", { name: "Buka menu" });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole("button", { name: "Keluar" }).last().click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("admin flows", () => {
  // Log in once per project (loginAction is rate-limited to 10 attempts / 10 min per email) and reuse the cookie.
  let cookies: Awaited<ReturnType<import("@playwright/test").BrowserContext["cookies"]>> = [];
  test.beforeAll(async ({ browser }, testInfo) => {
    const ctx = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const page = await ctx.newPage();
    await login(page);
    cookies = await ctx.cookies();
    await ctx.close();
  });
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies(cookies);
  });

  test("adjust a variant's stock and see it saved (ADM-03, STK-08)", async ({ page }) => {
    const [v] = await sql<{ sku: string; on_hand: number; product_id: string }[]>`
      select sku, on_hand, product_id from variants where product_id = 'jocelyn-jz45a' and reserved = 0 order by sort_order limit 1`;
    const startedAt = new Date();
    try {
      await page.goto(`/admin/products/${v.product_id}`);
      await expect(page.getByRole("heading", { name: "Harga" })).toBeVisible();
      await expect(page.getByText("× MSRP")).toBeVisible();
      const [color] = await sql<{ color: string }[]>`select color from variants where sku = ${v.sku}`;
      const radio = page.getByRole("radio", { name: color.color, exact: true });
      if (await radio.count()) await radio.click();
      const cell = page.locator(`input[data-sku="${v.sku}"]`);
      await expect(cell).toHaveValue(String(v.on_hand));
      await cell.fill(String(v.on_hand + 2));
      await expect(page.getByText(/^1 perubahan/)).toBeVisible();
      await page.getByRole("button", { name: "Simpan stok" }).click();
      await expect(page.getByText("1 varian disimpan", { exact: true })).toBeVisible();
      await page.reload();
      if (await radio.count()) await radio.click();
      await expect(page.locator(`input[data-sku="${v.sku}"]`)).toHaveValue(String(v.on_hand + 2));
      await expect(page.getByTestId("movements")).toContainText("Penyesuaian admin");
      const [row] = await sql<{ on_hand: number }[]>`select on_hand from variants where sku = ${v.sku}`;
      expect(row.on_hand).toBe(v.on_hand + 2);

      // below-reserved / invalid values are flagged per cell
      await page.locator(`input[data-sku="${v.sku}"]`).fill("-1");
      await page.getByRole("button", { name: "Simpan stok" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "Angka tidak valid" })).toBeVisible();
    } finally {
      await sql`update variants set on_hand = ${v.on_hand} where sku = ${v.sku}`;
      await sql`delete from stock_movements where sku = ${v.sku} and created_at >= ${startedAt}`;
    }
  });

  test("D7 admin side: PAID → PROCESSING → SHIPPED with courier + AWB → ORDER_SHIPPED in outbox (ADM-04, SHP-03, ADM-06)", async ({ page }) => {
    const [o] = await sql<{ id: string; order_no: string; updated_at: Date }[]>`
      select id, order_no, updated_at from orders where status = 'PAID' and wa_opt_in order by created_at limit 1`;
    test.skip(!o, "no PAID order with WA opt-in in the DB");
    const awb = `E2E${Date.now().toString().slice(-8)}`;
    const startedAt = new Date();
    try {
      await page.goto(`/admin/orders?status=PAID`);
      await page.getByRole("link", { name: `Buka order ${o.order_no}` }).first().click();
      await expect(page).toHaveURL(new RegExp(`/admin/orders/${o.order_no}$`));
      await expect(page.getByRole("link", { name: "Chat pembeli" })).toHaveAttribute("href", /^https:\/\/wa\.me\/62\d+\?text=/);

      // only valid transitions are offered
      const select = page.getByLabel("Ubah status ke");
      const options = await select.locator("option:not([disabled])").allTextContents();
      expect(options.join("|")).toContain("Proses pesanan");
      expect(options.join("|")).not.toContain("Kirim");
      await select.selectOption("PROCESSING");
      await page.getByRole("button", { name: "Proses pesanan" }).click();
      await expect(page.getByText("Status: Diproses", { exact: true })).toBeVisible();

      await page.getByLabel("Ubah status ke").selectOption("SHIPPED");
      // AWB is required
      await page.getByLabel("Kurir").selectOption("JNE");
      await page.getByRole("button", { name: "Kirim (input resi)" }).click();
      await expect(page.getByText("Isi nomor resi")).toBeVisible();
      await page.getByLabel("Nomor resi (AWB)").fill(awb);
      await page.getByRole("button", { name: "Kirim (input resi)" }).click();
      await expect(page.getByText("Status: Dikirim", { exact: true })).toBeVisible();
      await expect(page.getByTestId("timeline")).toContainText(`JNE ${awb}`);
      await expect(page.getByTestId("order-messages")).toContainText(awb);

      await page.goto("/admin/outbox?template=ORDER_SHIPPED");
      const msg = page.locator(`[data-template="ORDER_SHIPPED"][data-order="${o.order_no}"]`).filter({ hasText: awb });
      await expect(msg).toBeVisible();
      await expect(msg).toContainText("JNE");
    } finally {
      await sql`update orders set status = 'PAID', processing_at = null, shipped_at = null, tracking = null, updated_at = ${o.updated_at} where id = ${o.id}`;
      await sql`delete from wa_outbox where order_id = ${o.id} and created_at >= ${startedAt}`;
    }
  });

  test("D2 admin side: build a checkout link (ADM-05)", async ({ page }) => {
    let token: string | null = null;
    try {
      await page.goto("/admin/checkout-links");
      const combo = page.getByRole("combobox", { name: "Produk" });
      await combo.click();
      await combo.fill("P88");
      await page.getByRole("option", { name: /Alina I Pointe Shoe/ }).click();
      const [v] = await sql<{ size: string; width: string }[]>`
        select size, width from variants where product_id = 'alina-i-pointe-shoe-p88' and on_hand - reserved > 1 order by sort_order limit 1`;
      await page.getByLabel("Ukuran").selectOption(v.size);
      await page.getByLabel("Width").selectOption(v.width);
      await page.getByRole("button", { name: "Tambah item" }).click();
      await expect(page.getByTestId("link-lines")).toContainText("Alina I Pointe Shoe");
      await page.getByLabel(/^Nama/).fill("Dinda E2E");
      await page.getByLabel(/^Nomor WhatsApp/).fill("0812 7777 0001");
      await page.getByRole("button", { name: "Buat checkout link" }).click();
      const url = page.getByTestId("checkout-link-url");
      await expect(url).toHaveValue(/\/id\/checkout\?link=[A-Za-z0-9_-]{24}$/);
      token = (await url.inputValue()).split("link=")[1];
      await expect(page.getByTestId("send-wa")).toHaveAttribute("href", /^https:\/\/wa\.me\/6281277770001\?text=.*checkout/);
      await expect(page.locator(`[data-token="${token}"]:visible`)).toContainText("Aktif");
    } finally {
      if (token) await sql`delete from checkout_links where token = ${token}`;
    }
  });

  test("D3: restock a sold-out variant with a back-in-stock request → BACK_IN_STOCK in outbox (STK-07)", async ({ page }) => {
    const sku = "BL104-BLACK-7.0LADULT-MEDIUM";
    const [before] = await sql<{ on_hand: number; reserved: number }[]>`select on_hand, reserved from variants where sku = ${sku}`;
    const seeded = await sql<{ id: string; notified_at: Date | null }[]>`select id, notified_at from back_in_stock_requests where sku = ${sku}`;
    const startedAt = new Date();
    const e2eWa = "+6281199900077";
    try {
      // precondition: sold out + one pending request
      await sql`update variants set on_hand = reserved where sku = ${sku}`;
      await sql`insert into back_in_stock_requests (sku, customer_wa, locale) values (${sku}, ${e2eWa}, 'id')`;

      await page.goto("/admin/back-in-stock");
      await expect(page.locator(`[data-sku="${sku}"]:visible`).first()).toBeVisible();

      await page.goto("/admin/products/roy-bl104");
      await page.getByRole("radio", { name: "Black", exact: true }).click();
      const cell = page.locator(`input[data-sku="${sku}"]`);
      await cell.fill(String(before.reserved + 2));
      await page.getByRole("button", { name: "Simpan stok" }).click();
      await expect(page.getByText(/^\d+ pembeli dikabari via WA/)).toBeVisible();

      await page.goto("/admin/outbox?template=BACK_IN_STOCK");
      await expect(page.locator('[data-template="BACK_IN_STOCK"]').filter({ hasText: "+62 811-9990-0077" }).first()).toContainText("Roy");
    } finally {
      await sql`update variants set on_hand = ${before.on_hand} where sku = ${sku}`;
      await sql`delete from stock_movements where sku = ${sku} and created_at >= ${startedAt}`;
      await sql`delete from back_in_stock_requests where sku = ${sku} and customer_wa = ${e2eWa}`;
      for (const r of seeded) await sql`update back_in_stock_requests set notified_at = ${r.notified_at} where id = ${r.id}`;
      await sql`delete from wa_outbox where template = 'BACK_IN_STOCK' and created_at >= ${startedAt}`;
    }
  });
});
