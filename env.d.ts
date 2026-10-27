declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
    SESSION_TTL_HOURS: string;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
