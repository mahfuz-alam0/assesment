import { Hono } from "hono";
import type { AppEnv } from "../types";

export const health = new Hono<AppEnv>().get("/", (c) => c.json({ status: "ok" }));
