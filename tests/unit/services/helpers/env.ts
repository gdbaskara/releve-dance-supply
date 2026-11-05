/**
 * Import FIRST in every DB-backed test file: points the app at the `releve_test` database
 * and sets deterministic secrets before "@/db" is evaluated.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://releve:releve@localhost:5432/releve_test";
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.WEBHOOK_SECRET = "test-webhook-secret";
process.env.AUTH_SECRET = "test-auth-secret-0123456789abcdef";
process.env.NEXT_PUBLIC_SITE_URL = "http://shop.test";
process.env.NEXT_PUBLIC_WA_NUMBER = "6281200000000";
process.env.PAYMENT_PROVIDER = "mock";
process.env.SHIPPING_PROVIDER = "mock";
process.env.MESSAGING_PROVIDER = "outbox";
process.env.DEMO_MODE = "true";
process.env.CRON_SECRET = "test-cron";
process.env.ADMIN_EMAIL = "admin@releve.test";
process.env.ADMIN_PASSWORD = "secret-pass";
// make "@/db" build a fresh pool for this file (a previous file may have ended the cached one)
delete (globalThis as { pgClient?: unknown }).pgClient;
