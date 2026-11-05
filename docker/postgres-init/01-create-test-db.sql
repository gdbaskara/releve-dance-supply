-- Runs once, on the first start of an empty volume (docker-entrypoint-initdb.d).
-- `releve` is created by POSTGRES_DB; unit tests use `releve_test` (tests/unit/services/helpers/env.ts).
CREATE DATABASE releve_test OWNER releve;
