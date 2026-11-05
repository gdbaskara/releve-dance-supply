// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { PhoneInput, toLocalDigits, type PhoneChange } from "@/components/checkout/phone-input";
import { renderIntl } from "./intl";

function Harness({ onE164 }: { onE164: (c: PhoneChange) => void }) {
  const [value, setValue] = React.useState("");
  return (
    <PhoneInput
      value={value}
      onValueChange={(c) => {
        setValue(c.local);
        onE164(c);
      }}
    />
  );
}

describe("PhoneInput", () => {
  it.each([
    ["081234567890", "+6281234567890"],
    ["6281234567890", "+6281234567890"],
    ["+62 812-3456-7890", "+6281234567890"],
    ["81234567890", "+6281234567890"],
  ])("normalises %s → %s and formats 812-3456-7890", (typed, e164) => {
    const spy = vi.fn();
    renderIntl(<Harness onE164={spy} />);
    const input = screen.getByLabelText("Nomor WhatsApp");
    fireEvent.change(input, { target: { value: typed } });
    expect(spy.mock.calls.at(-1)?.[0]).toMatchObject({ e164, valid: true });
    expect(input).toHaveValue("812-3456-7890");
  });

  it("reports invalid numbers and shows an error after blur", () => {
    const spy = vi.fn();
    renderIntl(<Harness onE164={spy} />);
    const input = screen.getByLabelText("Nomor WhatsApp");
    fireEvent.change(input, { target: { value: "0212345" } });
    expect(spy.mock.calls.at(-1)?.[0]).toMatchObject({ e164: null, valid: false });
    fireEvent.blur(input);
    expect(screen.getByText(/Nomor WhatsApp belum valid/)).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("toLocalDigits strips prefixes", () => {
    expect(toLocalDigits("0812")).toBe("812");
    expect(toLocalDigits("+62812")).toBe("812");
  });
});
