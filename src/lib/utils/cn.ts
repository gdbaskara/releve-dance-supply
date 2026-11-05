import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: ["bg","surface","surface-alt","ink","ink-hover","ink-muted","ink-subtle","ink-inverse","border","border-strong","focus","accent","accent-strong","accent-ink","success","success-bg","warning","warning-bg","error","error-bg","info","info-bg","whatsapp","whatsapp-ink","overlay","white","transparent","current"],
      radius: ["none","sm","md","lg","pill"],
      text: ["xs","sm","base","md","lg","xl","2xl","3xl","4xl","5xl","6xl"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
