import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) {
    // Admin auth is enforced in src/app/admin/(protected)/layout.tsx (session cookie check).
    return NextResponse.next();
  }
  return intl(request);
}

export const config = {
  // Skip api, Next internals, static files
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
