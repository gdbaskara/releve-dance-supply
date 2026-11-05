/** WhatsApp Business API provider — stub for production (WA-06). Not configured in the demo. */
import type { MessagingProvider } from "@/lib/contracts";

export class WabaMessagingProvider implements MessagingProvider {
  readonly name = "waba" as const;
  async send(): Promise<void> {
    throw new Error("WhatsApp Business API messaging provider is not configured");
  }
}
