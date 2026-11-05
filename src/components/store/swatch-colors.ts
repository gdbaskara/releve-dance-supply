/**
 * Product colour swatch fills.
 * These are PRODUCT DATA colours (what the shoe/garment looks like), not UI tokens, so they are applied
 * via inline `style` and are exempt from the "token colours only" rule.
 * Values are the average colour of the source site's own swatch images (sodanca.com/cdn/shop/files/<colour>_small.png,
 * sampled 5 Nov 2026, Q-09). "Matte Black" has no source swatch and keeps a hand-picked value.
 */
const SWATCH: Readonly<Record<string, string>> = {
  "04-Pink": "#EBCEBF",
  "1615-Perfect Pink": "#E2BEAE",
  "Antique Rose": "#F6D4CB",
  Beige: "#F1DBD0",
  Black: "#272727",
  "Black Patent": "#100E0B",
  Burgundy: "#83253F",
  Caramel: "#BE9A79",
  "Dark Pink": "#D95795",
  "Dark Purple": "#482F59",
  "Emerald Green": "#24A1A9",
  "Hot Chocolate": "#6A455B",
  "Hot Pink": "#FD208C",
  "Hunter Green": "#014634",
  Lava: "#8C5236",
  "Light Grey": "#A6A8AA",
  "Light Pink": "#FBEBE6",
  "Light Toast": "#EAB990",
  Lilac: "#AAA8CD",
  "Maltese Lagoon": "#5EC2CE",
  "Matte Black": "#262626",
  "Mint Green": "#76D2BC",
  Mocha: "#816559",
  Navy: "#313D6D",
  "Oxford Blue": "#3E4092",
  Peacock: "#265F8D",
  "Petal Pink": "#FABEAF",
  Pink: "#EFB1B9",
  "Pink 40": "#F7DBD0",
  Raspberry: "#9D3E79",
  Red: "#B8202A",
  Sand: "#F4DBBD",
  "Sky Blue": "#3081BA",
  Suntan: "#AB7356",
  Tan: "#C3AD89",
  Toast: "#D69C6C",
  "Tropic Green": "#01686D",
  Ube: "#656195",
  "Vintage Mauve": "#C084A8",
  White: "#F0F0F0",
};

/** Multi-tone colours: a flat average would read as a different colour (Black-White averages to grey). */
const GRADIENTS: Readonly<Record<string, string>> = {
  "Black-White": "linear-gradient(135deg, #272727 0 50%, #F0F0F0 50% 100%)",
  "Sparkle Black": "radial-gradient(circle at 30% 30%, #6B6B6B 0 8%, transparent 9%), radial-gradient(circle at 70% 60%, #8A8A8A 0 6%, transparent 7%), #272324",
  "Sparkle Gold": "linear-gradient(135deg, #D9C29E, #AC937B 60%, #E8D8BC)",
  "Sparkle Silver": "linear-gradient(135deg, #E4E6E3, #BDC1BC 60%, #F3F4F2)",
};

/** Base colour used for the light/dark decision of gradient swatches. */
const GRADIENT_BASE: Readonly<Record<string, string>> = {
  "Black-White": "#272727",
  "Sparkle Black": "#272324",
  "Sparkle Gold": "#AC937B",
  "Sparkle Silver": "#BDC1BC",
};

const FALLBACK = "repeating-linear-gradient(45deg, #E6E1DB 0 4px, #F7F4F0 4px 8px)";

/** CSS `background` value for a colour name. Unknown names fall back to a neutral striped pattern. */
export function swatchBackground(color: string): string {
  return GRADIENTS[color] ?? SWATCH[color] ?? FALLBACK;
}

/** Relative luminance (WCAG) of a #RRGGBB colour, 0..1. */
export function relativeLuminance(hex: string): number {
  const channel = (i: number): number => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Light fills (luminance > 0.5) need a stronger border to stay visible on the white page; unknown names too. */
export function isLightSwatch(color: string): boolean {
  const hex = SWATCH[color] ?? GRADIENT_BASE[color];
  return hex ? relativeLuminance(hex) > 0.5 : true;
}
