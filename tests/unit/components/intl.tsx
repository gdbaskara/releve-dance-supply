import * as React from "react";
import { afterEach } from "vitest";
import { cleanup, render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import idCommon from "../../../messages/id/common.json";
import enCommon from "../../../messages/en/common.json";

// vitest runs without globals, so RTL auto-cleanup is off — unmount between tests here.
afterEach(() => cleanup());

/** Render inside NextIntlClientProvider with the `common` namespace (components' default labels). */
export function renderIntl(ui: React.ReactElement, locale: "id" | "en" = "id", options?: RenderOptions) {
  const messages = { common: locale === "id" ? idCommon : enCommon };
  return render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Jakarta">
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}
