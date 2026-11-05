/**
 * WS-3 storefront E2E (CAT, PDP, CART, I18N; demo scenarios D1/D3/D4/D8 — storefront parts).
 * Run: E2E_BASE_URL=http://localhost:3103 pnpm test:e2e tests/e2e/storefront.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

/** Pick an option in a VariantPicker radiogroup ("Warna"/"Size"/"Width"…). Sold-out chips are aria-disabled but selectable. */
async function pick(page: Page, group: string | RegExp, option: RegExp) {
  const radio = page.locator("main").getByRole("radiogroup", { name: group }).getByRole("radio", { name: option }).first();
  await radio.scrollIntoViewIfNeeded();
  await radio.click({ force: true });
  await expect(radio).toHaveAttribute("data-state", "checked");
}

async function noHorizontalScroll(page: Page) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw);
}

test("home renders hero, disciplines, ready products and trust strip", async ({ page }) => {
  await page.goto("/id");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Setiap langkah");
  await expect(page.getByRole("link", { name: "Belanja Sepatu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ready di Jakarta" })).toBeVisible();
  await expect(page.locator('a[href^="/id/p/"]').first()).toBeVisible();
  await expect(page.getByText("Relevé Dance Supply adalah toko independen")).toBeVisible();
  await noHorizontalScroll(page);
});

test("listing /c/ballet filters by size via the query string", async ({ page }) => {
  await page.goto("/id/c/ballet");
  await expect(page.getByRole("heading", { level: 1, name: "Ballet" })).toBeVisible();
  const countText = page.getByText(/\d+ produk/).first();
  const before = Number((await countText.textContent())?.match(/\d+/)?.[0]);

  if (!isDesktop(page)) await page.getByRole("button", { name: /^Filter/ }).click();
  const scope = isDesktop(page) ? page.locator("aside") : page.getByRole("dialog");
  await scope.getByRole("button", { name: "7.5", exact: true }).click();
  await expect(page).toHaveURL(/size=7\.5L/);
  if (!isDesktop(page)) await page.getByRole("button", { name: /Tampilkan \d+ produk/ }).click();

  await expect(page.getByRole("button", { name: "Hapus filter 7.5" })).toBeVisible();
  const after = Number((await page.getByText(/\d+ produk/).first().textContent())?.match(/\d+/)?.[0]);
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThanOrEqual(before);
  await noHorizontalScroll(page);
});

test("PDP Diamond SD140: colour → size → width → Ready → add to cart → drawer", async ({ page }) => {
  await page.goto("/id/p/diamond-sd140");
  await expect(page.getByRole("heading", { level: 1, name: "Diamond" })).toBeVisible();
  await expect(page.getByText("Rp 660.000").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Tambah ke Keranjang" })).toBeDisabled();

  await pick(page, "Warna", /^Light Pink$/);
  await pick(page, "Size", /^7\.5(,|$)/);
  await pick(page, "Width", /^C(,|$)/);
  await expect(page.getByText("Ready · dikirim 1–2 hari kerja dari Jakarta")).toBeVisible();

  const wa = page.locator("main").getByRole("link", { name: "Tanya via WA" });
  const href = decodeURIComponent((await wa.getAttribute("href")) ?? "");
  expect(href).toContain("wa.me/");
  expect(href).toContain("Diamond (SD140) – Light Pink · 7.5 · C");

  await page.getByRole("button", { name: "Tambah ke Keranjang" }).click();
  const drawer = page.getByRole("dialog", { name: /Keranjang \(1\)/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Diamond")).toBeVisible();
  await expect(drawer.getByText("Light Pink · 7.5 · C")).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/id/checkout");

  // CART-05: survives reload; /cart shows it after server validation.
  await page.goto("/id/cart");
  await expect(page.getByText("Diamond").first()).toBeVisible();
  await expect(page.getByTestId("cart-total")).toHaveText("Rp 660.000");
});

test("sold-out variant on Roy BL104 offers “Kabari Saya via WA”", async ({ page }) => {
  await page.goto("/id/p/roy-bl104");
  await pick(page, "Warna", /^Black,/);
  await pick(page, "Size", /^7(,|$)/);
  await pick(page, "Width", /^Medium(,|$)/);
  await expect(page.getByText("Habis untuk ukuran ini")).toBeVisible();
  await page.getByRole("button", { name: "Kabari Saya via WA" }).click();
  await expect(page.getByLabel("Nomor WhatsApp")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tambah ke Keranjang" })).toHaveCount(0);
});

test("pre-order product Briar SD110L shows the pre-order label", async ({ page }) => {
  await page.goto("/id/p/briar-sd110l");
  await pick(page, "Warna", /^Pink 40/);
  await pick(page, "Size", /^4(,|$)/);
  await pick(page, "Width", /^A(,|$)/);
  await expect(page.getByText(/Pre-order · estimasi tiba 4–6 minggu/)).toBeVisible();
  await page.getByRole("button", { name: "Tambah ke Keranjang" }).click();
  const drawer = page.getByRole("dialog", { name: /Keranjang/ });
  await expect(drawer.getByText(/Pre-order · 4–6 minggu/)).toBeVisible();
});

test("EN toggle on a pointe PDP keeps dance terms, colour names and Rp prices", async ({ page }) => {
  await page.goto("/id/p/alina-iv-pointe-shoe-p95?color=Light%20Pink");
  if (!isDesktop(page)) {
    await page.getByRole("button", { name: "Buka menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "English" }).click();
  } else {
    await page.locator("header").getByRole("link", { name: "English" }).click();
  }
  await expect(page).toHaveURL(/\/en\/p\/alina-iv-pointe-shoe-p95\?color=Light(\+|%20)Pink/);
  await expect(page.getByRole("button", { name: "Add to Cart" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pointe", exact: true }).first()).toBeVisible();
  await expect(page.getByText("Light Pink").first()).toBeVisible();
  await expect(page.getByText(/^Rp \d{1,3}(\.\d{3})+$/).first()).toBeVisible();
  await expect(page.getByText("Pointe shoes are best fitted in person")).toBeVisible();
});
