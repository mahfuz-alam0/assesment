import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { deleteSession, findSession } from "../db/auth";
import type { AppEnv } from "../types";

export const COOKIE = "sid";
export const cookieOpts = { path: "/", httpOnly: true, secure: true, sameSite: "Lax" } as const;

// 401 unless the cookie maps to an unexpired session; attaches the session to the context.
export const auth = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId = getCookie(c, COOKIE);
  if (!sessionId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = await findSession(c.env.DB, sessionId);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) {
      await deleteSession(c.env.DB, sessionId); // lazy expiry cleanup
    }
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("session", session);
  await next();
});

// 403 for non-admins. Runs after `auth`, before any handler touches the database.
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get("session").role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});
