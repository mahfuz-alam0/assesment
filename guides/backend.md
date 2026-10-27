# Backend Guide

Stack: Cloudflare Worker + Hono (TypeScript), D1 (SQLite), Vitest with `@cloudflare/vitest-pool-workers`.

## Requirement Map

| Requirement | Backend work |
|---|---|
| HR1 Workflow | Login, logout, me, list, update endpoints; persisted updates |
| HR2 Access boundaries | Auth middleware, role check, dealership scoping, API tests |
| HR3 CI/CD | Tests + build in Actions, gated deploy, migrations, health |
| HR4 Lost updates | Atomic versioned UPDATE, 409, regression test, defective variant |
| 3.1 Core constraint | Trusted session context only; no read-then-write |
| 5 Test data | Seed + reset scripts, hashed passwords |
| 6.1-6.3 Services | D1, health endpoint, auth/session explanation |

## 1. Project Setup
1. Create Cloudflare free account and GitHub repo.
2. `npm create hono@latest` (Cloudflare Workers template), add TypeScript.
3. `wrangler d1 create dealership-db`, put binding in `wrangler.toml`.
4. Add `.env.example` (names only: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SESSION_TTL_HOURS`).
5. Commit lockfile.

## 2. Schema (migrations/0001_init.sql)
- `dealerships(id, name)`
- `users(id, email UNIQUE, password_hash, role CHECK IN ('admin','viewer'), dealership_id)`
- `sessions(id, user_id, expires_at, created_at)`
- `vehicles(id, dealership_id, make, model, year, status, version INTEGER NOT NULL DEFAULT 1)`

## 3. Authentication
- Login: lookup user, verify PBKDF2 hash (WebCrypto), create session row with random ID, set HttpOnly + Secure + SameSite=Lax cookie.
- Middleware: read cookie, join `sessions` and `users`, reject if missing, unknown, or `expires_at` passed (401). Attach `{userId, role, dealershipId}` to context.
- Logout: delete session row, clear cookie. Old cookie must then return 401.
- Expiry: fixed TTL, checked on every request; expired rows deleted lazily.
- Invalid credentials: same generic 401 message for wrong email or password.

## 4. Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/login | none | 200 / 401 |
| POST | /api/logout | session | deletes session |
| GET | /api/me | session | user, role, dealership |
| GET | /api/vehicles | session | scoped by session dealership |
| GET | /api/vehicles/:id | session | other dealership → 404 |
| PUT | /api/vehicles/:id | admin | requires `version` |
| GET | /api/health | none | `{status:"ok"}`, no secrets |

## 5. Access Rules
- `dealershipId` and `role` come only from the session, never body, query, or headers.
- Every vehicle query includes `AND dealership_id = ?`.
- Status codes: 401 no/invalid/expired auth, 403 viewer write, 404 other dealership's vehicle, 409 stale version, 400 invalid input.
- Validate input (zod): make, model non-empty strings, year integer in sane range, status from allowed enum.
- Role check runs before touching the database.

## 6. Atomic Concurrency (core)
```sql
UPDATE vehicles
SET make=?, model=?, year=?, status=?, version=version+1
WHERE id=? AND dealership_id=? AND version=?
```
- If `meta.changes === 0`: check whether the vehicle exists in the user's dealership; return 404 if not, otherwise 409 with current record.
- On success return the updated vehicle with new version.
- Client sends the version it loaded; server never reads version then writes unconditionally.

## 7. Seed and Reset
- `scripts/seed.ts` generates hashed passwords and SQL inserts.
- Commands (document in README): `npm run db:migrate`, `npm run db:seed`, `npm run db:reset` (local and `--remote`).
- Data: 2 dealerships, 6 users (2 admins + 1 viewer each), 3+ vehicles each.
- Predictable synthetic emails, e.g. `admin1@alpha.test`, `admin2@alpha.test`, `viewer@alpha.test`, same for beta.

## 8. API Tests (Vitest)
Reset DB before each test.
- Login valid, wrong password, unknown user.
- Missing cookie, garbage cookie, expired session → 401.
- After logout, old cookie → 401.
- Admin update succeeds, persisted on re-read, version incremented.
- Viewer PUT → 403 and data unchanged.
- Cross-dealership GET → 404.
- Cross-dealership PUT → 404 and data unchanged.
- Invalid payload → 400 and data unchanged.
- Concurrent: two admins, same version, `Promise.all` → exactly one 200, one 409, final values equal winner's, loser's fields absent.

## 9. Regression Demonstration
1. Defective variant (branch `defect/lost-update`): SELECT version, compare in JS, `await` a tick, then unconditional `UPDATE ... WHERE id=?`.
2. Run concurrency test: it fails (two 200s or loser overwrites).
3. Fix commit: single conditional UPDATE. Test passes.
4. Record both commit SHAs and outputs in README. Never deploy the defective variant.

## 10. CI/CD
- `ci.yml` on pull_request: install, typecheck, API tests, build.
- `deploy.yml` on push to `main`: job `checks`, then job `deploy` with `needs: [checks]`.
- Deploy steps: apply remote D1 migrations, `wrangler deploy` via `cloudflare/wrangler-action`, curl `/api/health`, run smoke test.
- Secrets in GitHub: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Prove gating: show a run where a failing test blocks deploy.

## 11. Smoke Test Against Deployed URL
Login → allowed admin update → viewer/cross-dealership rejection → stale-edit conflict. Save output as evidence.

## 12. Recovery Notes (README)
- Redeploy previous commit via Actions re-run, or `wrangler rollback`.
- D1 schema changes are not auto-reverted: keep migrations additive/backward-compatible; use D1 Time Travel for data restore.

## Backend Done When
All backend tests green in CI, deployed health returns ok, smoke test passes, defective-vs-fixed evidence recorded.
