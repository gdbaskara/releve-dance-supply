// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import { Countdown, formatRemaining } from "@/components/checkout/countdown";
import { renderIntl } from "./intl";

describe("Countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T07:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("formats HH:MM:SS", () => {
    expect(formatRemaining(3_723_000)).toBe("01:02:03");
    expect(formatRemaining(65_000, true)).toBe("01:05");
  });

  it("ticks, turns warning under 5 minutes, then expires once", () => {
    const onExpire = vi.fn();
    const expiresAt = Date.now() + 5 * 60_000 + 2_000;
    renderIntl(<Countdown expiresAt={expiresAt} onExpire={onExpire} onRenew={() => {}} />);
    const timer = screen.getByRole("timer");
    expect(timer).toHaveTextContent("00:05:02");
    expect(timer.parentElement).not.toHaveClass("text-warning");
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByRole("timer")).toHaveTextContent("00:04:59");
    expect(screen.getByRole("timer").parentElement).toHaveClass("text-warning");
    act(() => vi.advanceTimersByTime(5 * 60_000));
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Waktu pembayaran habis")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buat pembayaran baru" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10_000));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("fires onExpire immediately when already expired", () => {
    const onExpire = vi.fn();
    renderIntl(<Countdown expiresAt={Date.now() - 1000} onExpire={onExpire} />);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
