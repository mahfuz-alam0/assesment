# Stack and Environment

## Stack

| Layer | Choice | Why |
|---|---|---|
| Hosting | Cloudflare Workers (one Worker for API + frontend) | One deploy, no CORS, easy rollback |
| Backend | Hono (TypeScript) | Small, Workers-native |
| Database | Cloudflare D1 (SQLite) | Free tier, atomic conditional UPDATE |
| Frontend | React + Vite (TypeScript) | Simple, built to static assets |
| Auth | Session table in D1, HttpOnly cookie, PBKDF2 (WebCrypto) | No external service, real logout/expiry |
| Validation | zod | Typed request validation |
| API tests | Vitest + `@cloudflare/vitest-pool-workers` | Runs against real Workers runtime and D1 |
| E2E test | Playwright | Login, list, update flow |
| CI/CD | GitHub Actions + `cloudflare/wrangler-action` | Gated deploy, secrets in GitHub |

Next.js alternative: `@opennextjs/cloudflare` adapter, same Worker + D1 model. Heavier build and harder API testing.

## Tools to Install
- Node.js 20+ and npm
- Git and a GitHub account
- Wrangler (installed as dev dependency): `npm i -D wrangler`
- Playwright browsers: `npx playwright install chromium`

## Suggested Structure
```
/
  src/               Worker (Hono app, routes, auth, db)
  web/               React + Vite app
  migrations/        D1 SQL migrations
  scripts/           seed and reset scripts
  test/              Vitest API tests
  e2e/               Playwright tests
  .github/workflows/ ci.yml, deploy.yml
  wrangler.toml
  .env.example
  README.md
```

## Environment Variables
Names only. Never commit values.

| Name | Where | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub secret | Deploy and run remote migrations |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub secret | Target account |
| `SESSION_TTL_HOURS` | wrangler `[vars]` | Session lifetime (not secret) |
| `APP_URL` | GitHub variable | Deployed URL for health check and smoke test |

`.env.example`:
```
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
SESSION_TTL_HOURS=8
APP_URL=
```

## Cloudflare Setup Guide

### 1. Create the account
1. Sign up at dashboard.cloudflare.com (free plan, no domain needed).
2. Verify email.

### 2. Log in with Wrangler
```
npx wrangler login
npx wrangler whoami
```

### 3. Create the D1 database
```
npx wrangler d1 create dealership-db
```
Copy the printed `database_id` into `wrangler.toml`.

### 4. Configure wrangler.toml
```toml
name = "dealership-app"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[assets]
directory = "./web/dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*"]

[[d1_databases]]
binding = "DB"
database_name = "dealership-db"
database_id = "<paste-id>"
migrations_dir = "migrations"

[vars]
SESSION_TTL_HOURS = "8"
```

### 5. Migrations and seed
```
npx wrangler d1 migrations create dealership-db init
npx wrangler d1 migrations apply dealership-db --local
npx wrangler d1 migrations apply dealership-db --remote
npx wrangler d1 execute dealership-db --local --file=scripts/seed.sql
npx wrangler d1 execute dealership-db --remote --file=scripts/seed.sql
```
Reset: drop and recreate tables via a reset SQL file, then migrate and seed again.

### 6. Local development
```
npm run build:web
npx wrangler dev
```
Local D1 is stored in `.wrangler/state`, separate from remote.

### 7. First manual deploy
```
npm run build:web
npx wrangler deploy
```
On first deploy Wrangler asks you to register a `workers.dev` subdomain. Your URL becomes `https://dealership-app.<subdomain>.workers.dev`.

Check: `curl https://<your-url>/api/health`

### 8. Create the API token for CI
1. Dashboard → My Profile → API Tokens → Create Token.
2. Use the "Edit Cloudflare Workers" template, then confirm D1 Edit permission is included (add it if not).
3. Scope it to your account. Copy the token once.

### 9. Find the Account ID
Dashboard → Workers & Pages → Overview, shown in the right sidebar.

### 10. Add GitHub secrets
Repo → Settings → Secrets and variables → Actions:
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Variable: `APP_URL`

### 11. Workflow shape
`ci.yml` (pull_request): install, typecheck, API tests, build, E2E.

`deploy.yml` (push to main):
```yaml
jobs:
  checks:
    runs-on: ubuntu-latest
    steps: [checkout, setup-node, npm ci, typecheck, test, build]
  deploy:
    needs: [checks]
    runs-on: ubuntu-latest
    steps:
      - checkout, setup-node, npm ci, build web
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          preCommands: npx wrangler d1 migrations apply dealership-db --remote
          command: deploy
      - run: curl --fail "$APP_URL/api/health"
      - run: npm run smoke
```
Optional: enable branch protection requiring the CI check on PRs.

### 12. Release recovery
- Redeploy previous commit: re-run the deploy workflow on the old commit or revert and push.
- Or: `npx wrangler rollback` (restores the previous Worker version).
- Database changes are not reverted by rollback. Keep migrations additive and backward-compatible.
- Data restore: `npx wrangler d1 time-travel restore dealership-db --timestamp=<ISO time>`.

### 13. Free tier notes
Workers free plan, D1 free plan, and static assets fit this app. Don't enable paid features or custom domains.

## Security Reminders
- Never commit `.env`, tokens, or `.dev.vars`; add them to `.gitignore`.
- Don't print secrets in CI logs or show them in the Loom.
- Use only synthetic reviewer credentials in the README.
