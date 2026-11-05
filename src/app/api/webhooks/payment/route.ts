/**
 * POST /api/webhooks/payment — provider webhook (mock: HMAC-SHA256 in x-mock-signature;
 * xendit: x-callback-token). PAY-08: idempotent.
 */
import { handlePaymentWebhook } from "@/lib/services/payment";
import { xenditWebhookPreflight } from "@/lib/providers/payment/xendit-webhook";

export async function POST(request: Request): Promise<Response> {
  if (process.env.PAYMENT_PROVIDER === "xendit") {
    // Authentic Xendit events we don't track (refunds, tokens, card-session inner payments) → 200, so Xendit stops retrying.
    const early = await xenditWebhookPreflight(request, process.env.XENDIT_CALLBACK_TOKEN);
    if (early) return early;
  }
  const result = await handlePaymentWebhook(request);
  if (!result.ok) {
    const status = result.error === "INVALID_SIGNATURE" ? 401 : 404;
    return Response.json(result, { status });
  }
  return Response.json(result);
}
