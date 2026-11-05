/** BiteshipShippingProvider — stub for production (SHP-05). Not configured in the demo. */
import type { ShippingProvider, ShippingRate } from "@/lib/contracts";

export class BiteshipShippingProvider implements ShippingProvider {
  readonly name = "biteship" as const;
  async getRates(): Promise<ShippingRate[]> {
    throw new Error("Biteship shipping provider is not configured");
  }
}
