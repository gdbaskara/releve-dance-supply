/** Tiny JSON-over-HTTP helper shared by the real providers (global fetch, timeout, typed errors). Server-only. */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class ProviderHttpError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
    readonly code: string | undefined,
    message: string,
    readonly body: unknown,
  ) {
    super(`${provider} HTTP ${status}${code ? ` ${code}` : ""}: ${message}`);
    this.name = "ProviderHttpError";
  }
}

export interface JsonRequest {
  provider: string;
  url: string;
  method?: "GET" | "POST" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  /** Pulls an error code/message out of the provider's error body. */
  errorOf?: (body: unknown) => { code?: string; message?: string };
}

export async function requestJson<T>(req: JsonRequest): Promise<T> {
  const doFetch = req.fetchImpl ?? ((input, init) => fetch(input, init));
  const headers: Record<string, string> = { accept: "application/json", ...req.headers };
  if (req.body !== undefined) headers["content-type"] = "application/json";
  let res: Response;
  try {
    res = await doFetch(req.url, {
      method: req.method ?? (req.body === undefined ? "GET" : "POST"),
      headers,
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
      signal: AbortSignal.timeout(req.timeoutMs ?? 15_000),
    });
  } catch (err) {
    throw new ProviderHttpError(req.provider, 0, "NETWORK_ERROR", err instanceof Error ? err.message : String(err), null);
  }
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const e = req.errorOf?.(body) ?? {};
    throw new ProviderHttpError(req.provider, res.status, e.code, e.message ?? res.statusText ?? "request failed", body);
  }
  return body as T;
}

/** Basic auth header value for `user:` (Xendit secret key, empty password). */
export function basicAuth(user: string, password = ""): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}
