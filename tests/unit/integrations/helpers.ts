import { vi } from "vitest";

export interface Call { url: string; method: string; headers: Record<string, string>; body: unknown }

/** A fetch mock that records calls and answers from a queue (or a router function). */
export function mockFetch(responder: (call: Call, i: number) => { status?: number; body?: unknown }) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: string, init?: RequestInit) => {
    const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    const call: Call = { url: input, method: init?.method ?? "GET", headers, body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    const r = responder(call, calls.length - 1);
    return new Response(r.body === undefined ? "" : JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  return { fetchImpl: fn as unknown as (input: string, init?: RequestInit) => Promise<Response>, calls };
}
