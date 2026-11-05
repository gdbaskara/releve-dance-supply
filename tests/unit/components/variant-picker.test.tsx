// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import type { VariantView } from "@/lib/contracts";
import { VariantPicker } from "@/components/store/variant-picker";
import { optionValueStates, resolveVariant, variantLabel } from "@/components/store/variant-logic";
import { renderIntl } from "./intl";

function v(color: string, size: string, width: string, available: number, status: VariantView["status"]): VariantView {
  return { sku: `X-${color}-${size}-${width}`, color, size, width, shank: null, available, status, preorderLeadWeeks: status === "PREORDER" ? "4-6" : null, weightGrams: 300 };
}

// Black: 6/7/8 in M (8 also N). Ballet Pink: 6 ready, 7 sold out, 8 does not exist.
const product = {
  options: ["Color", "Size", "Width"] as ("Color" | "Size" | "Width")[],
  colors: ["Black", "Ballet Pink"],
  widths: ["N", "M"],
  variants: [
    v("Black", "6", "M", 8, "READY"),
    v("Black", "7", "M", 2, "LOW"),
    v("Black", "8", "M", 0, "PREORDER"),
    v("Black", "8", "N", 5, "READY"),
    v("Ballet Pink", "6", "M", 6, "READY"),
    v("Ballet Pink", "7", "M", 0, "SOLD_OUT"),
  ],
};

describe("variant logic", () => {
  it("computes per-value status in cascade order", () => {
    const sizes = optionValueStates(product, "size", { color: "Ballet Pink" });
    expect(sizes.map((s) => [s.value, s.status])).toEqual([
      ["6", "READY"],
      ["7", "SOLD_OUT"],
      ["8", null],
    ]);
  });
  it("drops invalid later selections and auto-selects single values", () => {
    const st = resolveVariant(product, { color: "Ballet Pink", size: "8", width: "N" });
    expect(st.selection).toEqual({ color: "Ballet Pink", width: "M" }); // size 8 dropped; M is the only width
    const st2 = resolveVariant(product, { color: "Ballet Pink", size: "6" });
    expect(st2.selection.width).toBe("M"); // only width for that combo
    expect(st2.sku).toBe("X-Ballet Pink-6-M");
  });
  it("formats the variant label", () => {
    expect(variantLabel({ color: "Ballet Pink", size: "7.5L (adult)", width: "M", shank: null })).toBe("Ballet Pink · 7.5L · M");
  });
});

describe("<VariantPicker>", () => {
  it("disables non-existent combos and marks sold-out sizes aria-disabled (still focusable)", () => {
    const onChange = vi.fn();
    renderIntl(<VariantPicker product={product} defaultSelection={{ color: "Ballet Pink" }} onChange={onChange} />);
    const sizeGroup = screen.getByRole("radiogroup", { name: "Size" });
    const soldOut = within(sizeGroup).getByRole("radio", { name: /^7, Habis/ });
    expect(soldOut).toHaveAttribute("aria-disabled", "true");
    expect(soldOut).not.toBeDisabled();
    const missing = within(sizeGroup).getByRole("radio", { name: "8" });
    expect(missing).toBeDisabled();
    fireEvent.click(within(sizeGroup).getByRole("radio", { name: "6" }));
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.sku).toBe("X-Ballet Pink-6-M");
    expect(last.complete).toBe(true);
  });

  it("re-enables sizes after switching colour and keeps still-valid selections", () => {
    const onChange = vi.fn();
    renderIntl(<VariantPicker product={product} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Ballet Pink" }));
    expect(within(screen.getByRole("radiogroup", { name: "Size" })).getByRole("radio", { name: "8" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "Black" }));
    const sizeGroup = screen.getByRole("radiogroup", { name: "Size" });
    expect(within(sizeGroup).getByRole("radio", { name: /^8/ })).not.toBeDisabled();
    fireEvent.click(within(sizeGroup).getByRole("radio", { name: /^8/ }));
    const last = onChange.mock.calls.at(-1)?.[0];
    // width M carried over from Ballet Pink is still valid for Black 8 → complete (pre-order variant)
    expect(last.sku).toBe("X-Black-8-M");
    fireEvent.click(screen.getByRole("radio", { name: "N" }));
    expect(onChange.mock.calls.at(-1)?.[0].sku).toBe("X-Black-8-N");
  });
});
