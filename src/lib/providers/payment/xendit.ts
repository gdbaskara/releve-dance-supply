/** XenditPaymentProvider — stub for production (PAY-11). Not configured in the demo. */
import type { PaymentInstruction, PaymentProvider, PaymentWebhookResult } from "@/lib/contracts";

export class XenditPaymentProvider implements PaymentProvider {
  readonly name = "xendit" as const;
  async createPayment(): Promise<PaymentInstruction> {
    throw new Error("Xendit payment provider is not configured");
  }
  async cancelPayment(): Promise<void> {
    throw new Error("Xendit payment provider is not configured");
  }
  async verifyAndParseWebhook(): Promise<PaymentWebhookResult> {
    throw new Error("Xendit payment provider is not configured");
  }
}
