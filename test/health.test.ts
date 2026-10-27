import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import app from "../src/index";

it("health check says ok", async () => {
  const res = await app.request("/api/health", {}, env);
  expect(await res.json()).toEqual({ status: "ok" });
});

it("the vehicles table exists after migrations", async () => {
  const { results } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE name = 'vehicles'").all();
  expect(results).toHaveLength(1);
});
