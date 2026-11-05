/** POST /api/webhooks/payment — provider webhook (mock: HMAC-SHA256 in x-mock-signature). PAY-08: idempotent. */
import { handlePaymentWebhook } from "@/lib/services/payment";

export async function POST(request: Request): Promise<Response> {
  const result = await handlePaymentWebhook(request);
  if (!result.ok) {
    const status = result.error === "INVALID_SIGNATURE" ? 401 : 404;
    return Response.json(result, { status });
  }
  return Response.json(result);
}
