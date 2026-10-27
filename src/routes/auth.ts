import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { createSession, deleteSession, findUserByEmail } from "../db/auth";
import { fieldErrors } from "../lib/validation";
import { verifyPassword } from "../lib/password";
import { auth, COOKIE, cookieOpts } from "../middleware/auth";
import type { AppEnv } from "../types";

// Hash of nothing, verified when the email is unknown so timing doesn't reveal which emails exist.
const DUMMY_HASH = `pbkdf2$100000$${"A".repeat(22)}==$${"A".repeat(43)}=`;

const Login = z.object({
  email: z.string("Required").trim().toLowerCase().min(1, "Required"),
  password: z.string("Required").min(1, "Required"),
});

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/login", async (c) => {
  const body = Login.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: "Email and password are required.", fields: fieldErrors(body.error) }, 400);
  }

  const { email, password } = body.data;
  const user = await findUserByEmail(c.env.DB, email);
  const passwordMatches = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !passwordMatches) {
    return c.json({ error: "Invalid email or password." }, 401);
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const ttlSeconds = (Number(c.env.SESSION_TTL_HOURS) || 8) * 3600;
  await createSession(c.env.DB, sessionId, user.id, now, now + ttlSeconds * 1000);
  setCookie(c, COOKIE, sessionId, { ...cookieOpts, maxAge: ttlSeconds });
  return c.json({ ok: true });
});

authRoutes.post("/logout", auth, async (c) => {
  await deleteSession(c.env.DB, getCookie(c, COOKIE)!);
  deleteCookie(c, COOKIE, cookieOpts);
  return c.json({ ok: true });
});

authRoutes.get("/me", auth, (c) => {
  const { email, role, dealership } = c.get("session");
  return c.json({ email, role, dealership });
});
