import type { Role } from "../web/src/types";

// Trusted request context, built from the session row only (never body, query or headers).
export interface Session {
  userId: number;
  email: string;
  role: Role;
  dealershipId: number;
  dealership: string;
}

export type AppEnv = { Bindings: Cloudflare.Env; Variables: { session: Session } };
