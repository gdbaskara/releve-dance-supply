"""Build data/catalog/color_media.json (per-colour reference photos) from a compact dump.

The dump comes from scripts/collect_color_media.js (run in a browser on sodanca.com).

    python3 -I scripts/build_color_media.py --print-catalog-colors     # input for the browser snippet
    python3 -I scripts/build_color_media.py <compact-dump.json> [out]  # writes data/catalog/color_media.json

Cleaning rules (Shopify data on the source site is not always consistent):
  * A colour's photo whose file name names a *different* colour of the same product is dropped,
    unless it is the only photo for that colour (e.g. "*_Recolor.jpg" files reuse another colour's name).
  * Shared (untagged) photos: screenshots are dropped; a file naming one of the product's colours goes to
    that colour; a file naming any other known colour is dropped; the rest are neutral and shown for every colour.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "data/catalog/products.json"
DEFAULT_OUT = ROOT / "data/catalog/color_media.json"
CDN_PREFIX = "https://cdn.shopify.com/s/files/1/0525/4542/1474/"
# File-name spellings used on the source site for some colour names.
ALIASES = {"sparkle": "spk", "raspberry": "raspeberry", "huntergreen": "hunter"}
EXTRA_COLOR_WORDS = ["black", "white", "pink", "red", "mocha", "ube", "tan"]


def squash(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def tokens(color: str) -> set[str]:
    base = squash(color)
    alts = {base}
    for word, alias in ALIASES.items():
        if word in base:
            alts.add(base.replace(word, alias))
    return alts


def names_color(file_name: str, color: str) -> bool:
    f = squash(file_name)
    return any(t in f for t in tokens(color))


def file_of(path: str) -> str:
    return path.rsplit("/", 1)[-1]


def load_catalog() -> list[dict]:
    return json.loads(CATALOG.read_text())["products"]


def handle_of(product: dict) -> str:
    return product["source_url"].split("/products/")[1]


def clean_color_list(color: str, paths: list[str], colors: list[str]) -> list[str]:
    others = [c for c in colors if c != color]

    def wrong(p: str) -> bool:
        f = file_of(p)
        return any(names_color(f, o) for o in others if squash(o) not in squash(color)) and not names_color(f, color)

    kept = [p for p in paths if not wrong(p)]
    return kept if kept else list(paths)


def split_shared(shared: list[str], colors: list[str], known_colors: list[str]) -> tuple[dict[str, list[str]], list[str]]:
    to_color, neutral = {}, []
    for p in shared:
        f = file_of(p)
        if "screenshot" in f.lower():
            continue
        hit = next((c for c in sorted(colors, key=len, reverse=True) if names_color(f, c)), None)
        if hit:
            to_color[hit] = to_color.get(hit, []) + [p]
        elif not any(names_color(f, k) for k in known_colors):
            neutral.append(p)
    return to_color, neutral


def build(dump: dict, catalog: list[dict]) -> dict:
    known_colors = sorted({c for p in catalog for c in p["colors"]} | set(EXTRA_COLOR_WORDS))
    out = {}
    for product in catalog:
        entry = dump.get(handle_of(product))
        if entry is None:
            continue
        colors = product["colors"]
        extra, neutral = split_shared(entry.get("shared", []), colors, known_colors)
        by_color = {}
        for color in colors:
            paths = entry.get("by", {}).get(color, []) + extra.get(color, [])
            deduped = list(dict.fromkeys(paths))
            if deduped:
                by_color[color] = [CDN_PREFIX + p for p in clean_color_list(color, deduped, colors)]
        out[product["slug"]] = {"colors": by_color, "shared": [CDN_PREFIX + p for p in neutral]}
    return out


def main(argv: list[str]) -> int:
    catalog = load_catalog()
    if argv[1:2] == ["--print-catalog-colors"]:
        print(json.dumps({handle_of(p): p["colors"] for p in catalog}))
        return 0
    if len(argv) < 2:
        print(__doc__)
        return 2
    dump = json.loads(Path(argv[1]).read_text())
    out_file = Path(argv[2]) if len(argv) > 2 else DEFAULT_OUT
    products = build(dump, catalog)
    missing = [p["slug"] for p in catalog if p["slug"] not in products]
    doc = {
        "_note": "DEMO DATA. Per-colour reference photos from the public sodanca.com product JSON. "
        "Internal reference only (AGENTS.md rule 10); used by the seed only when DEMO_USE_REFERENCE_IMAGES=true. "
        "Regenerate with scripts/collect_color_media.js + scripts/build_color_media.py.",
        "products": products,
    }
    out_file.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
    photos = sum(len(v) for p in products.values() for v in p["colors"].values())
    print(f"{len(products)} products, {photos} colour photos -> {out_file}; missing: {missing or 'none'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
