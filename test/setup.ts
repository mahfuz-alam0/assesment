import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Build the schema in the test database before any test runs.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
