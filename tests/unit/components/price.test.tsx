// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Price } from "@/components/store/price";
import { StockBadge } from "@/components/store/stock-badge";
import { renderIntl } from "./intl";

describe("Price", () => {
  it("formats integer Rupiah with formatIDR", () => {
    renderIntl(<Price value={675000} />);
    expect(screen.getByText("Rp 675.000")).toBeInTheDocument();
  });
  it("supports the 'from' prefix in both locales", () => {
    renderIntl(<Price value={3005000} from />);
    expect(screen.getByText("Mulai Rp 3.005.000")).toBeInTheDocument();
    renderIntl(<Price value={1250000} from />, "en");
    expect(screen.getByText("From Rp 1.250.000")).toBeInTheDocument();
  });
  it("uses tabular numerals and ink colour", () => {
    const { container } = renderIntl(<Price value={1000} size="lg" />);
    expect(container.firstChild).toHaveClass("tabular", "text-ink", "text-2xl");
  });
});

describe("StockBadge", () => {
  it("renders the 4 states", () => {
    renderIntl(
      <>
        <StockBadge status="READY" />
        <StockBadge status="LOW" available={2} />
        <StockBadge status="PREORDER" leadWeeks="4-6" />
        <StockBadge status="SOLD_OUT" />
      </>,
    );
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Sisa 2")).toBeInTheDocument();
    expect(screen.getByText("Pre-order · 4–6 minggu")).toBeInTheDocument();
    expect(screen.getByText("Habis")).toBeInTheDocument();
  });
});
