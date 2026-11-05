"use client";

import "./globals.css";
import idCommon from "../../messages/id/common.json";
import enCommon from "../../messages/en/common.json";

/** Last-resort error page when a root layout fails: no intl provider here, so pick the copy from the URL. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isEn = typeof window !== "undefined" && /^\/en(\/|$)/.test(window.location.pathname);
  const t = (isEn ? enCommon : idCommon).errorPage;
  const home = isEn ? "/en" : "/id";
  return (
    <html lang={isEn ? "en" : "id"}>
      <body>
        <main className="container-page flex min-h-screen flex-col items-center justify-center gap-3 py-16 text-center">
          <h1 className="text-lg font-semibold text-ink">{t.title}</h1>
          <p className="max-w-sm text-sm text-ink-muted">{t.body}</p>
          <div className="mt-3 flex flex-col items-center gap-3 md:flex-row">
            <button type="button" onClick={reset} className="inline-flex min-h-11 items-center rounded-sm bg-ink px-5 text-sm font-semibold text-ink-inverse">
              {t.retry}
            </button>
            <a href={home} className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-ink underline underline-offset-[3px]">
              {t.home}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
