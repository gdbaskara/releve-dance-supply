/** GET /api/cron/expire — Vercel Cron (Authorization: Bearer CRON_SECRET) or any caller when DEMO_MODE=true. STK-03 */
import { isDemoMode } from "@/lib/providers/env";
import { expireOrders } from "@/lib/services/expiry";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const authorized = (!!secret && request.headers.get("authorization") === `Bearer ${secret}`) || isDemoMode();
  if (!authorized) return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const result = await expireOrders(new Date());
  return Response.json({ ok: true, ...result });
}
