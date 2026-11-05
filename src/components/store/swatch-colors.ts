/**
 * Product colour swatch fills.
 * These are PRODUCT DATA colours (what the shoe/garment looks like), not UI tokens, so they are applied
 * via inline `style` and are exempt from the "token colours only" rule. Approximations of Só Dança colour
 * names; replace with photo-sampled values when real product photos arrive (Q-09).
 */
const SWATCH: Record<string, string> = {
  "Ballet Pink": "#F2C9C1",
  "Theatrical Pink": "#E9B3A9",
  "Light Pink": "#F6D5D3",
  "Petal Pink": "#F4C7CC",
  Pink: "#EFB1B9",
  "04-Pink": "#EDB7B5",
  "1615-Perfect Pink": "#EBC0B4",
  "Pink 40": "#EAB8B0",
  "Dark Pink": "#D9809A",
  "Hot Pink": "#E0457B",
  Raspberry: "#B3305E",
  "Antique Rose": "#C99293",
  "Vintage Mauve": "#A97C88",
  Lilac: "#C5B3DA",
  Ube: "#7A5C99",
  "Dark Purple": "#4B2A5E",
  Suntan: "#D9A982",
  Sand: "#D8BE9C",
  Beige: "#E4D3BA",
  Tan: "#C29A72",
  Toast: "#B98760",
  "Light Toast": "#D3AA85",
  Caramel: "#A8693E",
  Mocha: "#7A4E35",
  Espresso: "#3E2A20",
  "Hot Chocolate": "#5A3526",
  Nude: "#E3C1A4",
  Black: "#141414",
  "Matte Black": "#262626",
  "Black Patent": "#0A0A0A",
  White: "#FFFFFF",
  "Light Grey": "#C9C7C4",
  Navy: "#1F2A44",
  "Oxford Blue": "#2B3A5C",
  "Sky Blue": "#9CC3E4",
  Peacock: "#1D6E7E",
  "Maltese Lagoon": "#2E8C93",
  "Emerald Green": "#1E7A55",
  "Hunter Green": "#2D4A36",
  "Mint Green": "#BDE3CF",
  "Tropic Green": "#3BAA8A",
  Burgundy: "#6B1E2E",
  Red: "#B8202A",
  Lava: "#C9452F",
};

const GRADIENTS: Record<string, string> = {
  "Black-White": "linear-gradient(135deg, #141414 0 50%, #FFFFFF 50% 100%)",
  "Sparkle Black": "radial-gradient(circle at 30% 30%, #6B6B6B 0 8%, transparent 9%), radial-gradient(circle at 70% 60%, #8A8A8A 0 6%, transparent 7%), #1A1A1A",
  "Sparkle Gold": "linear-gradient(135deg, #E7C66B, #B88A2E 60%, #F1DD9C)",
  "Sparkle Silver": "linear-gradient(135deg, #E4E4E4, #A9A9A9 60%, #F3F3F3)",
};

/** CSS `background` value for a colour name. Unknown names fall back to a neutral striped pattern. */
export function swatchBackground(color: string): string {
  if (GRADIENTS[color]) return GRADIENTS[color];
  if (SWATCH[color]) return SWATCH[color];
  return "repeating-linear-gradient(45deg, #E6E1DB 0 4px, #F7F4F0 4px 8px)";
}

/** True for very light fills that need a visible border on white. */
export function isLightSwatch(color: string): boolean {
  return ["White", "Light Grey", "Light Pink", "Beige", "Mint Green", "Sparkle Silver", "Petal Pink", "Ballet Pink"].includes(color);
}
