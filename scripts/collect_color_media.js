/*
 * Browser snippet: collects per-colour product photos from the public sodanca.com product JSON.
 * sodanca.com rate-limits non-browser clients (HTTP 429), so this runs in a normal browser tab.
 *
 * Usage (see data/catalog/README.md, "Per-colour photos"):
 *   1. python3 -I scripts/build_color_media.py --print-catalog-colors   -> copy the printed JSON
 *   2. Open https://www.sodanca.com in a browser, open DevTools console.
 *   3. Paste this file, then run:  await collectColorMedia(<printed JSON>)
 *   4. Save the returned string as a .json file (the "compact dump") and run:
 *      python3 -I scripts/build_color_media.py <compact-dump.json>
 *
 * Output shape: { [shopifyHandle]: { by: { [catalogColor]: [imagePath] }, shared: [imagePath] } }
 * where imagePath is relative to https://cdn.shopify.com/s/files/1/0525/4542/1474/.
 */
// Called by hand from the browser console, so nothing in the repo references it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function collectColorMedia(catalogColors, delayMs = 700) {
  const PREFIX = "https://cdn.shopify.com/s/files/1/0525/4542/1474/";
  const shortSrc = (s) => s.split("?")[0].replace(PREFIX, "");
  const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};

  for (const [handle, colors] of Object.entries(catalogColors)) {
    let res;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      res = await fetch(`/products/${handle}.json`);
      if (res.status !== 429) break;
      await sleep(3000 * (attempt + 1));
    }
    if (!res.ok) throw new Error(`${handle}: HTTP ${res.status}`);
    const p = (await res.json()).product;

    // Variant colour = the catalog colour found among its option values ("Pink // 4.0L // EE" style titles included).
    const colorOf = (v) => {
      const values = [v.option1, v.option2, v.option3]
        .filter(Boolean)
        .flatMap((x) => String(x).split(" // ").map((s) => s.trim()));
      return colors.find((c) => values.includes(c)) ?? null;
    };
    const variantColor = new Map(p.variants.map((v) => [v.id, colorOf(v)]));
    const images = [...p.images].sort((a, b) => a.position - b.position);
    const by = {};
    const tagged = new Set();
    const add = (color, src) => {
      const list = by[color] ?? [];
      by[color] = list.includes(src) ? list : [...list, src];
    };

    // 1. The image Shopify shows when a variant is selected.
    for (const v of p.variants) {
      const color = variantColor.get(v.id);
      const img = v.image_id ? images.find((i) => i.id === v.image_id) : null;
      if (color && img) {
        add(color, shortSrc(img.src));
        tagged.add(img.id);
      }
    }
    // 2. Extra images linked to variants of exactly one colour.
    for (const img of images) {
      const linked = new Set(img.variant_ids.map((id) => variantColor.get(id)).filter(Boolean));
      if (linked.size === 1) {
        add([...linked][0], shortSrc(img.src));
        tagged.add(img.id);
      }
    }
    // 3. Untagged images: match the colour name in the file name, else keep as shared.
    const longestFirst = [...colors].sort((a, b) => b.length - a.length);
    const shared = [];
    for (const img of images.filter((i) => !tagged.has(i.id))) {
      const file = squash(shortSrc(img.src).split("/").pop());
      const hit = longestFirst.find((c) => file.includes(squash(c)));
      if (hit) add(hit, shortSrc(img.src));
      else shared.push(shortSrc(img.src));
    }
    out[handle] = { by, shared };
    await sleep(delayMs);
  }
  return JSON.stringify(out);
}
