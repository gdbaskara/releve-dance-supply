/* eslint-disable @typescript-eslint/no-require-imports */
// Usage: BASE=http://localhost:3000 OUT=/path node scripts/qa-screenshots.mjs
// Walks the demo happy path (D1) + key pages and saves screenshots (mobile 390x844 @2x, desktop 1280x800 @2x).
const { chromium } = require("playwright");
const fs = require("node:fs");

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "./qa-shots";
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

(async () => {
const browser = await chromium.launch();
const errors = [];
async function shoot(page, name) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  log("shot", name);
}

for (const vp of [{ n: "m", w: 390, h: 844 }, { n: "d", w: 1280, h: 800 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${vp.n} pageerror ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${vp.n} console ${m.text().slice(0, 200)}`));
  for (const [name, path] of [
    ["01-home", "/id"],
    ["02-listing-ballet", "/id/c/ballet"],
    ["03-pdp-diamond", "/id/p/diamond-sd140"],
    ["04-pdp-pointe-en", "/en/p/alina-iv-pointe-shoe-p95"],
    ["05-pdp-soldout", "/id/p/roy-bl104"],
    ["06-design-system", "/id/design-system"],
    ["07-track", "/id/track"],
  ]) {
    const r = await page.goto(BASE + path).catch((e) => ({ status: () => String(e) }));
    if (r?.status && r.status() !== 200) errors.push(`${vp.n} ${path} status ${r.status()}`);
    await shoot(page, `${vp.n}-${name}`);
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/errors.txt`, errors.join("\n"));
log("done; errors:", errors.length);
})();
