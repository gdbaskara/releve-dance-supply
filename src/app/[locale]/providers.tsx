"use client";
import { ToastProvider } from "@/components/ui/toast";

/** Global client providers for all locale routes (WS-0). */
export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
