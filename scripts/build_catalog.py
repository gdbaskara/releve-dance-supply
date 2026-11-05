import json, glob, csv, random, re, sys
src = sys.argv[1]; out = sys.argv[2]
ps = []
for f in sorted(glob.glob(src + '/p*.json')): ps += json.load(open(f))['products']
by = {p['title']: p for p in ps}
PICK = [
 # (title, discipline, audience)
 ("SD16 - (child)", "Ballet", "Kids"),
 ("Diamond - SD140 (Adult)", "Ballet", "Adult"),
 ("Diamond - SD140 (Child)", "Ballet", "Kids"),
 ("Briar - SD110L (Adult)", "Ballet", "Adult"),
 ("SD60L (Adult)", "Ballet", "Adult"),
 ("Brio - SD120 (Child)", "Ballet", "Kids"),
 ("Verde - SD122VG (Child)", "Ballet", "Kids"),
 ("Alina I Pointe Shoe - P88", "Pointe", "Adult"),
 ("Alina II Pointe Shoe - P90", "Pointe", "Adult"),
 ("Alina III Pointe Shoe - P93", "Pointe", "Adult"),
 ("Alina IV Pointe Shoe - P95", "Pointe", "Adult"),
 ("SD09 - Satin", "Pointe", "Adult"),
 ("Toshie - SD40VC - Stretch Canvas", "Pointe", "Adult"),
 ("Jocelyn - JZ45A II Suede Sole (Adult)", "Jazz", "Adult"),
 ("Janus - JZ45 II Rubber Sole (Adult)", "Jazz", "Adult"),
 ("Jaxon - JZ86L (Adult)", "Jazz", "Adult"),
 ("Jace - JZ85 (Adult)", "Jazz", "Adult"),
 ("Theo - TA75 (Adult)", "Tap", "Adult"),
 ("Teo - TA74 (Child)", "Tap", "Kids"),
 ("Tazer - TA88 (Adult)", "Tap", "Adult"),
 ("Tate - TA28L (Adult)", "Tap", "Adult"),
 ("Courtney - CH95", "Character", "Adult"),
 ("Claudine - SD155", "Character", "Adult"),
 ("Jive III - BL302 (Adult)", "Latin/Ballroom", "Adult"),
 ("Bolero II - BL308 (Adult)", "Latin/Ballroom", "Adult"),
 ("Raphaela - BL504", "Latin/Ballroom", "Adult"),
 ("Roy - BL104 (Men)", "Latin/Ballroom", "Men"),
 ("Vernon - MD22", "Contemporary", "Adult"),
 ("Adult Shimmer Footed Tights - TS102", "Tights", "Adult"),
 ("Adult Mock Seamed Convertible Tights - TS100", "Tights", "Adult"),
 ("Elsie - SL248", "Leotards", "Adult"),
 ("Elise - SL247", "Leotards", "Adult"),
 ("Farfalla - SL243", "Leotards", "Adult"),
 ("Kiki - SL240", "Leotards", "Adult"),
 ("Deborah - SL239", "Leotards", "Adult"),
 ("Bess Body Liner - D345", "Leotards", "Adult"),
 ("BE YOU® Alicia Pull On Skirt - BY75", "Skirts", "Adult"),
 ("BE YOU® Elis Wrap Skirt - BY97", "Skirts", "Adult"),
 ("Naya Top - SL222", "Tops", "Adult"),
 ("Sloane Kid's Top - SL220", "Tops", "Kids"),
]
# stock profiles -> make the demo show every badge state clearly
PROFILES = ["ready"]*19 + ["low"]*8 + ["mixed"]*7 + ["preorder"]*4 + ["soldout"]*2
rnd = random.Random(42); rnd.shuffle(PROFILES)
import math
CFG = json.load(open(sys.argv[3]))
def group(disc):
    for g, ds in CFG["category_groups"].items():
        if disc in ds: return g
    return "shoes"
def price(usd, disc):
    c = CFG; g = group(disc); msrp = float(usd)
    fob = msrp * c["buy_price_pct_of_msrp"]
    cif = fob * (1 + c["freight_insurance_pct"])
    bm = cif * c["bea_masuk"][g]
    ppn = (cif + bm) * c["ppn_impor_effective"]
    handling = cif * c["ppjk_handling_pct"]
    landed_usd = cif + bm + handling + (0 if c["pkp"] else ppn)
    landed = landed_usd * c["kurs_planning"]
    sell = math.ceil(landed * c["multiplier"][g] / c["round_to"]) * c["round_to"]
    if c["pkp"]: sell = math.ceil(sell * (1 + c["ppn_jual_effective"]) / c["round_to"]) * c["round_to"]
    net_sales = sell / (1 + c["ppn_jual_effective"]) if c["pkp"] else sell
    opex = net_sales * (c["payment_fee_pct"] + c["overhead_pct"] + c["stock_risk_pct"] + (0 if c["pkp"] else c["pph_final_umkm"]))
    profit = net_sales - landed - opex
    return {"group": g, "msrp_usd": msrp, "msrp_idr_spot": round(msrp * c["kurs_spot"]),
            "landed_cost_idr": round(landed), "price_idr": int(sell),
            "price_vs_msrp_idr": round(sell / (msrp * c["kurs_spot"]), 2),
            "gross_margin_pct": round((net_sales - landed) / net_sales * 100, 1),
            "est_net_profit_idr": round(profit), "est_net_margin_pct": round(profit / net_sales * 100, 1)}
def clean_size(s):
    """Same rules as src/lib/data/size-normalize.ts: drop stray ')' and add the missing adult 'L'."""
    s = re.sub(r'\)+$', ')', s.strip())
    return re.sub(r'^(\d+(?:\.\d+)?)\s+\(adult\)$', r'\1L (adult)', s)
def strip_html(h): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h or '')).strip()
products, rows = [], []
KIDS_DUP = {"SD140"}
NICE = {"SD16 - (child)": "Bliss Stretch Canvas", "SD09 - Satin": "Claudia Satin", "SD60L (Adult)": "SD60L Leather"}
for i, (title, disc, aud) in enumerate(PICK):
    p = by[title]; prof = PROFILES[i]
    m = re.search(r'\b([A-Z]{1,3}\d{2,3}[A-Z]*)\b', title); code = m.group(1) if m else p['handle'].upper()
    opt_names = [o['name'] for o in p['options']]
    combined = len(opt_names) == 1 and '//' in opt_names[0]
    names = [n.strip() for n in opt_names[0].split('//')] if combined else opt_names
    variants = []
    for v in p['variants']:
        vals = [x.strip() for x in v['option1'].split('//')] if combined else [v.get('option%d' % k) for k in range(1, len(names)+1)]
        attrs = {n.lower(): val for n, val in zip(names, vals) if val}
        if 'size' in attrs: attrs['size'] = clean_size(attrs['size'])
        r = rnd.random()
        if prof == "ready":   q = 0 if r < .15 else rnd.randint(3, 10)
        elif prof == "low":   q = 0 if r < .5 else rnd.randint(1, 3)
        elif prof == "mixed": q = 0 if r < .35 else rnd.randint(1, 8)
        else: q = 0
        preorder = prof == "preorder" or (prof in ("mixed",) and q == 0)
        status = ("READY" if q > 3 else "LOW" if q > 0 else "PREORDER" if preorder else "SOLD_OUT")
        sku = f"{code}{'-K' if aud == 'Kids' and code in KIDS_DUP else ''}-" + "-".join(re.sub(r'[^A-Za-z0-9.]+', '', str(x)).upper() for x in vals if x)
        variants.append({"sku": sku, "source_variant_sku": v.get('sku'), **attrs,
                         "stock_qty": q, "stock_status": status,
                         "preorder_lead_weeks": "4-6" if status == "PREORDER" else None,
                         "weight_grams": v.get('grams') or (900 if disc in ("Tap","Character","Latin/Ballroom") else 400)})
        rows.append({"model_code": code, "name": title, "discipline": disc, "audience": aud, "price_idr": price(p["variants"][0]["price"], disc)["price_idr"], "sku": sku, **{k: attrs.get(k, '') for k in ("color","size","width","shank")},
                     "stock_qty": q, "stock_status": status, "preorder_lead_weeks": variants[-1]["preorder_lead_weeks"] or ""})
    tot = sum(v['stock_qty'] for v in variants)
    nm = NICE.get(title) or (title.split(' - ')[0] if ' - ' in title else title)
    slug = re.sub(r'[^a-z0-9]+', '-', f"{nm} {code} {'kids' if aud == 'Kids' else ''}".lower().replace('®', '')).strip('-')
    products.append({"id": slug, "slug": slug, "model_code": code, "name": nm,
        "full_title": title, "brand": "Só Dança", "discipline": disc, "audience": aud,
        "pricing": price(p['variants'][0]['price'], disc), "price_idr": price(p['variants'][0]['price'], disc)["price_idr"],
        "options": names, "colors": sorted({v.get('color') for v in variants if v.get('color')}),
        "widths": sorted({v.get('width') for v in variants if v.get('width')}),
        "description_en_source": strip_html(p.get('body_html'))[:600],
        "reference_image_url": (p['images'][0]['src'] if p.get('images') else None),
        "source_url": "https://www.sodanca.com/products/" + p['handle'],
        "stock_profile": prof, "stock_total": tot,
        "variant_count": len(variants), "variants": variants})
meta = {"_note": "DEMO DATA. Models/colors/sizes from the public sodanca.com catalog (5 Nov 2026). Stock = DUMMY. IDR prices = output of the markup model in docs/06-pricing.md (assumptions, not yet verified by a customs broker/tax advisor). Photos/descriptions are internal reference only; do not use in production without permission.", "pricing_config": CFG,
        "products": products}
json.dump(meta, open(out + '/products.json', 'w'), ensure_ascii=False, indent=2)
with open(out + '/variants.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
# summary
from collections import Counter
L = ["# Demo Catalog — 40 models (30 shoes / tights + 10 dancewear)\n", meta["_note"] + "\n",
     "| # | Code | Name | Discipline | For | US MSRP | Landed cost | Selling price | × MSRP | Est. net | Variants | Stock | Ready / Low / PO / Sold out |",
     "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
def rp(x): return "Rp " + f"{x:,}".replace(",", ".")
for i, p in enumerate(products, 1):
    c = Counter(v['stock_status'] for v in p['variants'])
    q = p['pricing']
    L.append(f"| {i} | {p['model_code']} | {p['name']} | {p['discipline']} | {p['audience']} | ${q['msrp_usd']:.2f} | {rp(q['landed_cost_idr'])} | **{rp(q['price_idr'])}** | {q['price_vs_msrp_idr']}× | {q['est_net_margin_pct']}% | {p['variant_count']} | {p['stock_total']} | {c['READY']} / {c['LOW']} / {c['PREORDER']} / {c['SOLD_OUT']} |")
allc = Counter(r['stock_status'] for r in rows)
L += ["", f"**Total:** {len(products)} models, {len(rows)} variant SKUs, {sum(r['stock_qty'] for r in rows)} units in stock. "
      f"SKU status: READY {allc['READY']}, LOW {allc['LOW']}, PREORDER {allc['PREORDER']}, SOLD_OUT {allc['SOLD_OUT']}.",
      "", "Status rules: `READY` stock > 3 · `LOW` 1–3 (shows \"Sisa N\") · `PREORDER` 0 but orderable (4–6 weeks) · `SOLD_OUT` 0 and not orderable (shows \"Kabari Saya via WA\")."]
open(out + '/README.md', 'w').write("\n".join(L) + "\n")
print("\n".join(L[-3:]))
