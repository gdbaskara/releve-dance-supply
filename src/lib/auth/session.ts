/**
 * Admin session (ADM-01, D-19): jose HS256 JWT in httpOnly cookie `rds_admin`, 12 h. Server-only.
 * Use requireAdmin() at the top of every admin page/layout and every admin server action.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";

export const ADMIN_COOKIE = "rds_admin";
export const ADMIN_SESSION_HOURS = 12;

export interface AdminSession { sub: string; email: string; name: string }

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is not set (min 16 chars)");
  return new TextEncoder().encode(s);
}

/** Returns the admin user (without hash) or null. Constant-ish time: always runs bcrypt. */
export async function verifyCredentials(email: string, password: string): Promise<AdminSession | null> {
  const [u] = await db.select().from(adminUsers).where(eq(adminUsers.email, email.trim().toLowerCase())).limit(1);
  const hash = u?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
  const ok = await bcrypt.compare(password, hash);
  return u && ok ? { sub: u.id, email: u.email, name: u.name } : null;
}

export async function signAdminToken(session: AdminSession, now: Date = new Date()): Promise<string> {
  return new SignJWT({ email: session.email, name: session.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(now.getTime() / 1000) + ADMIN_SESSION_HOURS * 3600)
    .setIssuer("releve-admin")
    .sign(secretKey());
}

export async function verifyAdminToken(token: string | undefined | null): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: "releve-admin", algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email, name: typeof payload.name === "string" ? payload.name : "" };
  } catch {
    return null;
  }
}

/** Sets the session cookie. Call only from a Server Action or Route Handler. */
export async function createAdminSession(session: AdminSession): Promise<void> {
  const token = await signAdminToken(session);
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}

/** Returns the session or redirects to /admin/login (redirect throws — don't wrap in try/catch). */
export async function requireAdmin(): Promise<AdminSession> {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");
  return s;
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
