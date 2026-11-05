/**
 * POST /api/demo/simulate-payment — DEMO_MODE only (PAY-07).
 * Body { orderNo, outcome: "PAID" | "EXPIRED" | "FAILED" } → builds a signed mock webhook and runs it
 * through the same handler as POST /api/webhooks/payment.
 */
import { z } from "zod";
import { isDemoMode } from "@/lib/providers/env";
import { simulatePayment } from "@/lib/services/payment";
import { orderNoSchema } from "@/lib/services/schemas";

const bodySchema = z.object({ orderNo: orderNoSchema, outcome: z.enum(["PAID", "EXPIRED", "FAILED"]) });

export async function POST(request: Request): Promise<Response> {
  if (!isDemoMode()) return Response.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  const result = await simulatePayment(parsed.data.orderNo, parsed.data.outcome);
  if (!result.ok) {
    const status = result.error === "NOT_FOUND" ? 404 : result.error === "INVALID_SIGNATURE" ? 401 : 409;
    return Response.json(result, { status });
  }
  return Response.json(result);
}
