/**
 * Template-generated Indonesian description + id/en feature bullets for seeded products.
 * Rule-based on discipline + keywords in the English source text. Dance terms stay untranslated (glossary).
 */
import type { Discipline } from "@/lib/contracts";
import type { RawProduct } from "@/lib/data/catalog";

const DISCIPLINE_ID: Record<Discipline, string> = {
  Ballet: "Ballet flats untuk latihan harian maupun ujian",
  Pointe: "Pointe shoes untuk penari yang sudah siap naik pointe",
  Jazz: "Jazz shoes yang ringan untuk gerak cepat dan lantai studio",
  Tap: "Tap shoes dengan bunyi taps yang jelas dan konsisten",
  Character: "Character shoes untuk panggung dan kelas karakter",
  "Latin/Ballroom": "Sepatu Latin/Ballroom dengan pijakan stabil untuk putaran",
  Contemporary: "Sepatu Contemporary yang mengikuti bentuk kaki",
  Leotards: "Leotard nyaman untuk kelas dan panggung",
  Skirts: "Skirt ringan yang jatuh rapi saat bergerak",
  Tops: "Top latihan yang ringan dan pas di badan",
  Tights: "Tights halus dan elastis untuk kelas maupun pertunjukan",
};

interface Rule { test: RegExp; id: string; en: string }

const MATERIAL_RULES: Rule[] = [
  { test: /canvas/i, id: "bahan kanvas stretch", en: "stretch canvas" },
  { test: /leather/i, id: "bahan kulit", en: "leather" },
  { test: /satin/i, id: "bahan satin", en: "satin" },
  { test: /microfiber|micro-fiber/i, id: "bahan microfiber", en: "microfiber" },
  { test: /mesh/i, id: "bahan mesh", en: "mesh" },
  { test: /nylon/i, id: "bahan nylon-spandex", en: "nylon-spandex" },
  { test: /cotton/i, id: "bahan katun", en: "cotton" },
  { test: /microfleece/i, id: "bahan microfleece", en: "microfleece" },
];

const FEATURE_RULES: Rule[] = [
  { test: /split[- ]sole/i, id: "Split sole — lebih lentur, lengkung kaki terlihat lebih indah", en: "Split sole for flexibility and a beautiful arch line" },
  { test: /pre-sewn/i, id: "Elastis sudah terpasang — tidak perlu menjahit", en: "Pre-sewn elastics — no needle and thread needed" },
  { test: /no break-in/i, id: "Tanpa masa break-in — nyaman sejak dipakai pertama", en: "No break-in period required" },
  { test: /vegan/i, id: "Material vegan", en: "Vegan materials" },
  { test: /duo sole/i, id: "Duo sole: suede + karet untuk kontrol putaran", en: "Duo sole: suede with a rubber insert for turn control" },
  { test: /taps?\b/i, id: "Taps terpasang untuk bunyi yang jernih", en: "Attached taps for a clear, consistent sound" },
  { test: /(\d(?:\.\d)?)-inch heel/i, id: "Hak stabil untuk pijakan percaya diri", en: "Stable heel for confident footing" },
  { test: /four-way stretch|4-way stretch/i, id: "Four-way stretch — bebas bergerak ke segala arah", en: "Four-way stretch for full freedom of movement" },
  { test: /elastic casing|drawstring/i, id: "Elastic casing untuk tampilan rapi", en: "Elastic casing for a streamlined look" },
  { test: /suede/i, id: "Pad suede di area tumpuan untuk grip yang pas", en: "Suede pads for just-right grip" },
  { test: /lace/i, id: "Detail lace yang elegan", en: "Elegant lace detail" },
  { test: /shank/i, id: "Tersedia beberapa pilihan shank", en: "Available in several shank strengths" },
];

const FALLBACK: Record<"shoes" | "pointe" | "apparel" | "tights", { id: string; en: string }[]> = {
  pointe: [
    { id: "Disarankan konsultasi/fitting sebelum membeli pointe", en: "We recommend a consultation/fitting before buying pointe shoes" },
    { id: "Box dan platform menopang keseimbangan di atas pointe", en: "Box and platform support balance en pointe" },
  ],
  shoes: [
    { id: "Pas di kaki dan ringan untuk latihan panjang", en: "Snug, lightweight fit for long rehearsals" },
    { id: "Tersedia ukuran dan width lengkap — cek size guide", en: "Wide range of sizes and widths — see the size guide" },
  ],
  apparel: [
    { id: "Jahitan rapi dan nyaman dipakai seharian", en: "Clean finish, comfortable all day" },
    { id: "Cuci tangan dengan air dingin, jangan diperas", en: "Hand wash cold, do not wring" },
  ],
  tights: [
    { id: "Lembut di kulit dan tidak mudah melar", en: "Soft on the skin and holds its shape" },
    { id: "Cuci tangan dengan air dingin, keringkan diangin-anginkan", en: "Hand wash cold, line dry" },
  ],
};

export function buildProductCopy(p: RawProduct): { descriptionId: string; featuresId: string[]; featuresEn: string[] } {
  const src = p.description_en_source ?? "";
  const material = MATERIAL_RULES.find((r) => r.test.test(src));
  const audience = p.audience === "Kids" ? " Ukuran anak." : p.audience === "Men" ? " Model pria." : "";
  const descriptionId =
    `${DISCIPLINE_ID[p.discipline]}${material ? `, dibuat dari ${material.id}` : ""}. ` +
    `${p.name} (${p.model_code}) adalah produk original Só Dança (impor).${audience} ` +
    `Ragu ukuran? Konsultasi gratis via WhatsApp sebelum membeli.`;

  const features: { id: string; en: string }[] = [];
  for (const r of FEATURE_RULES) {
    if (features.length >= 3) break;
    if (r.test.test(src)) features.push({ id: r.id, en: r.en });
  }
  if (material && features.length < 4) {
    features.unshift({ id: `Material: ${material.id.replace(/^bahan /, "")}`, en: `Material: ${material.en}` });
  }
  for (const f of FALLBACK[p.pricing.group]) {
    if (features.length >= 4) break;
    features.push(f);
  }
  const top = features.slice(0, 4);
  return { descriptionId, featuresId: top.map((f) => f.id), featuresEn: top.map((f) => f.en) };
}
