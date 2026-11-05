/**
 * WS-4 — checkout, pay, success, track (docs/03 D1, D2 buyer side, D4, D5, D6, D7 tracking side).
 * Runs against a dev server with the seeded DB and DEMO_MODE=true:
 *   E2E_BASE_URL=http://localhost:3104 pnpm test:e2e tests/e2e/checkout.spec.ts
 */
import { randomBytes } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL ?? "postgres://releve:releve@localhost:5432/releve", { max: 2, onnotice: () => {} });
test.afterAll(async () => {
  await sql.end({ timeout: 2 });
});

interface SeedItem {
  sku: string;
  qty: number;
  productSlug: string;
  name: string;
  modelCode: string;
  variantLabel: string;
  priceIdr: number;
  imageUrl: null;
  isPreorder: boolean;
}

/** A variant matching `where` (SQL on v = variants, p = products), shaped as a cart item. */
async function pickVariant(where: string, opts: { isPreorder?: boolean } = {}): Promise<SeedItem & { available: number }> {
  const rows = await sql.unsafe(
    `select v.sku, v.color, v.size, v.width, v.shank, v.on_hand - v.reserved as available, p.id, p.name, p.model_code, p.price_idr
       from variants v join products p on p.id = v.product_id
      where p.is_active and ${where}
      order by v.sku limit 1`,
  );
  const r = rows[0];
  if (!r) throw new Error(`no variant for: ${where}`);
  return {
    sku: r.sku,
    qty: 1,
    productSlug: r.id,
    name: r.name,
    modelCode: r.model_code,
    variantLabel: [r.color, r.size, r.width, r.shank].filter(Boolean).join(" · "),
    priceIdr: r.price_idr,
    imageUrl: null,
    isPreorder: opts.isPreorder ?? false,
    available: Number(r.available),
  };
}

const readyDiamond = () => pickVariant(`p.id = 'diamond-sd140' and v.on_hand - v.reserved > 5`);

async function seedCart(page: Page, items: SeedItem[]) {
  await page.addInitScript((state) => {
    window.localStorage.setItem("rds-cart", JSON.stringify({ state, version: 1 }));
  }, { items });
}

async function fillContactAndAddress(page: Page, city = "Kota Jakarta Selatan", province = "DKI Jakarta") {
  await page.getByLabel("Nama lengkap").fill("Rina Pratiwi");
  await page.getByLabel("Nomor WhatsApp").fill("0812-3456-7890");
  await page.getByLabel("Provinsi").selectOption(province);
  const cityBox = page.getByRole("combobox", { name: "Kabupaten/Kota" });
  await cityBox.click();
  await cityBox.fill(city.replace(/^(Kota|Kab\.) /, ""));
  await page.getByRole("option", { name: city }).click();
  await page.getByLabel("Kecamatan").fill("Kebayoran Baru");
  await page.getByLabel("Kode pos").fill("12160");
  await page.getByLabel("Alamat lengkap").fill("Jl. Senopati No. 10, RT 01/RW 02");
  await page.getByRole("button", { name: "Lanjut ke Pengiriman" }).click();
}

/** Prefer GoSend Instant (only offered in Z1 before 16:00 WIB), else the first courier. */
async function chooseCourier(page: Page, preferInstant = true) {
  const radios = page.getByRole("radiogroup", { name: "Pilih pengiriman" }).getByRole("radio");
  await expect(radios.first()).toBeVisible();
  const instant = page.getByRole("radio", { name: /GoSend Instant/ });
  if (preferInstant && (await instant.count())) await instant.click();
  else await radios.first().click();
  await expect(page.getByText("Asuransi pengiriman")).toBeVisible();
  await page.getByRole("button", { name: "Lanjut ke Pembayaran" }).click();
}

async function pay(page: Page) {
  await page.locator("button:visible", { hasText: "Bayar Sekarang" }).click();
  await page.waitForURL(/\/id\/pay\/RDS-\d{6}-[0-9A-Z]{4}$/, { timeout: 30_000 });
  return page.url().split("/").pop()!;
}

test.describe("checkout → pay → success", () => {
  test("D1: QRIS + kurir instan → simulate paid → success page", async ({ page }) => {
    const item = await readyDiamond();
    await seedCart(page, [item]);
    await page.goto("/id/checkout");
    await expect(page.getByRole("heading", { name: "Checkout", level: 1 })).toBeVisible();
    await fillContactAndAddress(page);
    await chooseCourier(page);
    // QRIS is first and preselected; no COD / installments anywhere.
    await expect(page.getByRole("radio", { name: /^QRIS/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("body")).not.toContainText(/COD|bayar di tempat|cicilan/i);
    await expect(page.getByText(/Dengan membayar, kamu menyetujui/)).toBeVisible();
    const orderNo = await pay(page);

    await expect(page.getByTestId("order-no")).toHaveText(orderNo);
    await expect(page.getByRole("img", { name: /Kode QRIS/ })).toBeVisible();
    await expect(page.getByRole("timer")).toBeVisible();
    // cart was cleared after the order was created
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("rds-cart") ?? "{}").state?.items?.length)).toBe(0);

    await page.getByRole("button", { name: "Simulasikan Bayar Berhasil" }).click();
    await page.waitForURL(new RegExp(`/id/success/${orderNo}$`));
    await expect(page.getByRole("heading", { name: "Pembayaran berhasil" })).toBeVisible();
    await expect(page.getByText(/Konfirmasi sudah dikirim ke WA \+62 812-•••-7890/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Lacak Pesanan" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lanjut Belanja" })).toBeVisible();

    const [o] = await sql`select status from orders where order_no = ${orderNo}`;
    expect(o.status).toBe("PAID");
    const msgs = await sql`select template from wa_outbox w join orders o on o.id = w.order_id where o.order_no = ${orderNo}`;
    expect(msgs.map((m) => m.template)).toContain("PAYMENT_PAID");
  });

  test("D4 + VA BCA: pre-order & ready mixed, copy VA number, simulate paid", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const ready = await readyDiamond();
    const po = await pickVariant(`v.on_hand - v.reserved = 0 and v.preorder_enabled and p.id = 'briar-sd110l'`, { isPreorder: true });
    await seedCart(page, [ready, po]);
    await page.goto("/id/checkout");
    await expect(page.getByText(/berisi item pre-order \(estimasi tiba 4–6 minggu\)/)).toBeVisible();
    await fillContactAndAddress(page, "Kota Bandung", "Jawa Barat");
    await expect(page.getByRole("radio", { name: /GoSend Instant/ })).toHaveCount(0); // instant is Z1 only
    await chooseCourier(page, false);
    await page.getByRole("radio", { name: /BCA Virtual Account/ }).click();
    const orderNo = await pay(page);

    await expect(page.getByText("Nomor Virtual Account")).toBeVisible();
    const va = (await page.locator(".font-mono.text-xl").first().innerText()).replace(/\s/g, "");
    expect(va).toMatch(/^39108\d{10}$/);
    await page.getByRole("button", { name: "Salin nomor Virtual Account" }).click();
    await expect(page.getByRole("button", { name: "Salin nomor Virtual Account" })).toContainText("Disalin");
    await page.getByRole("button", { name: "ATM BCA" }).click();
    await expect(page.getByText("Masukkan kartu & PIN ATM BCA.")).toBeVisible();

    await page.getByRole("button", { name: "Simulasikan Bayar Berhasil" }).click();
    await page.waitForURL(new RegExp(`/id/success/${orderNo}$`));
    await expect(page.getByText(/Estimasi tiba 4–6 minggu/)).toBeVisible();
  });

  test("D5: no Bali in provinces; outside-Java WA link", async ({ page }) => {
    await seedCart(page, [await readyDiamond()]);
    await page.goto("/id/checkout");
    await expect(page.getByLabel("Provinsi")).toBeVisible();
    const options = await page.getByLabel("Provinsi").locator("option").allInnerTexts();
    expect(options).not.toContain("Bali");
    expect(options).toEqual(expect.arrayContaining(["DKI Jakarta", "Banten", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur"]));
    const wa = page.getByRole("link", { name: "Di luar Pulau Jawa? Hubungi kami via WA" });
    await expect(wa).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=/);
  });

  test("D6: last item → simulate expired → expired state, stock released", async ({ page }) => {
    const item = await pickVariant(`v.on_hand - v.reserved = 1 and not v.preorder_enabled`);
    await seedCart(page, [item]);
    await page.goto("/id/checkout");
    await fillContactAndAddress(page);
    await chooseCourier(page, false);
    const orderNo = await pay(page);
    const [held] = await sql`select on_hand - reserved as a from variants where sku = ${item.sku}`;
    expect(Number(held.a)).toBe(0);

    await page.getByRole("button", { name: "Simulasikan Kedaluwarsa" }).click();
    await expect(page.getByRole("heading", { name: "Pembayaran kedaluwarsa" })).toBeVisible();
    await expect(page.getByText("Stok sudah dilepas", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pesan lagi" })).toBeVisible();
    const [o] = await sql`select status from orders where order_no = ${orderNo}`;
    expect(o.status).toBe("EXPIRED");
    const [back] = await sql`select on_hand - reserved as a from variants where sku = ${item.sku}`;
    expect(Number(back.a)).toBe(1);
  });

  test("card 4000 0000 0000 0002 fails → switch method → QRIS", async ({ page }) => {
    await seedCart(page, [await readyDiamond()]);
    await page.goto("/id/checkout");
    await fillContactAndAddress(page);
    await chooseCourier(page, false);
    await page.getByRole("radio", { name: /Kartu kredit\/debit/ }).click();
    const orderNo = await pay(page);

    await page.getByLabel("Nomor kartu").fill("4000000000000002");
    await page.getByLabel("Berlaku hingga (MM/YY)").fill("1230");
    await page.getByLabel("CVV").fill("123");
    await page.getByRole("button", { name: /^Bayar Rp/ }).click();
    await expect(page.getByRole("heading", { name: "Verifikasi 3D Secure" })).toBeVisible();
    expect(page.url()).toContain("step=3ds");
    await page.getByLabel("Kode OTP").fill("123456");
    await page.getByRole("button", { name: "Verifikasi" }).click();
    await expect(page.getByText(/Kartu ditolak oleh bank penerbit/)).toBeVisible();

    await page.getByRole("button", { name: "Ganti metode pembayaran" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: /^QRIS/ }).click();
    await dialog.getByRole("button", { name: "Pakai metode ini" }).click();
    await expect(page.getByRole("img", { name: /Kode QRIS/ })).toBeVisible();
    const pays = await sql`select p.method, p.status from payments p join orders o on o.id = p.order_id where o.order_no = ${orderNo} order by p.created_at`;
    expect(pays.map((p) => `${p.method}:${p.status}`)).toEqual(["CARD:FAILED", "QRIS:PENDING"]);

    await page.getByRole("button", { name: "Kirim instruksi ke WA saya" }).click();
    await expect(page.getByText("Instruksi pembayaran dikirim ke WhatsApp-mu", { exact: true })).toBeVisible();
  });

  test("D2 buyer side: checkout link prefill (locked) → VA → paid", async ({ page }) => {
    const item = await readyDiamond();
    const token = randomBytes(18).toString("base64url");
    await sql`insert into checkout_links (token, items, customer_name, customer_wa, created_by, expires_at)
              values (${token}, ${sql.json([{ sku: item.sku, qty: 2 }])}, ${"Sari Dewi"}, ${"+6281298765432"}, ${"e2e"}, now() + interval '48 hours')`;
    await page.goto(`/id/checkout?link=${token}`);
    await expect(page.getByText("Pesanan disiapkan oleh admin Relevé")).toBeVisible();
    await expect(page.getByLabel("Nama lengkap")).toHaveValue("Sari Dewi");
    await expect(page.getByLabel("Nomor WhatsApp")).toHaveValue("812-9876-5432");
    await page.getByLabel("Provinsi").selectOption("DKI Jakarta");
    const cityBox = page.getByRole("combobox", { name: "Kabupaten/Kota" });
    await cityBox.click();
    await cityBox.fill("Jakarta Barat");
    await page.getByRole("option", { name: "Kota Jakarta Barat" }).click();
    await page.getByLabel("Kecamatan").fill("Kembangan");
    await page.getByLabel("Kode pos").fill("11610");
    await page.getByLabel("Alamat lengkap").fill("Jl. Puri Indah Raya Blok A");
    await page.getByRole("button", { name: "Lanjut ke Pengiriman" }).click();
    await chooseCourier(page, false);
    await page.getByRole("radio", { name: /BCA Virtual Account/ }).click();
    const orderNo = await pay(page);
    await page.getByRole("button", { name: "Simulasikan Bayar Berhasil" }).click();
    await page.waitForURL(new RegExp(`/id/success/${orderNo}$`));
    const [link] = await sql`select o.order_no from checkout_links l join orders o on o.id = l.used_order_id where l.token = ${token}`;
    expect(link.order_no).toBe(orderNo);

    // a used link cannot be opened again
    await page.goto(`/id/checkout?link=${token}`);
    await expect(page.getByText("Link checkout tidak berlaku")).toBeVisible();
    await expect(page.getByRole("link", { name: "Minta link baru via WA" })).toBeVisible();
  });

  test("empty cart shows the empty state", async ({ page }) => {
    await page.goto("/id/checkout");
    await expect(page.getByText("Keranjangmu masih kosong")).toBeVisible();
    await expect(page.getByRole("link", { name: "Kembali belanja" })).toBeVisible();
  });
});

test.describe("track (ORD-03, D7 buyer side)", () => {
  test("shipped order: timeline, AWB copy, WA; wrong digits → generic message", async ({ page }) => {
    const [o] = await sql`select order_no, customer_wa, tracking from orders where status = 'SHIPPED' order by order_no limit 1`;
    const last4 = String(o.customer_wa).slice(-4);
    await page.goto("/id/track");
    await page.getByLabel("Nomor pesanan").fill(o.order_no);
    await page.getByLabel("4 digit terakhir nomor WA").fill(last4 === "0000" ? "1111" : "0000");
    await page.getByRole("button", { name: "Lacak" }).click();
    await expect(page.getByText(/Pesanan tidak ditemukan/)).toBeVisible();

    await page.getByLabel("4 digit terakhir nomor WA").fill(last4);
    await page.getByRole("button", { name: "Lacak" }).click();
    await expect(page.getByTestId("order-status")).toHaveText("Dikirim");
    await expect(page.getByTestId("awb")).toHaveText(o.tracking.awb);
    await expect(page.getByRole("button", { name: "Salin nomor resi" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Tanya pesanan ini" })).toHaveAttribute("href", new RegExp(encodeURIComponent(o.order_no)));
  });
});
