/**
 * `pnpm db:reset` step 1: drop & recreate the public schema (then package.json runs db:push and db:seed).
 * Refuses to run against a non-local database unless ALLOW_DB_RESET=true.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://releve:releve@localhost:5432/releve";
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host) && process.env.ALLOW_DB_RESET !== "true") {
  console.error(`Refusing to reset non-local database at ${host}. Set ALLOW_DB_RESET=true to override.`);
  process.exit(1);
}

async function main() {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
    console.log(`Reset schema public on ${host}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
