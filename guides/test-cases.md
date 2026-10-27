# Test Cases

Derived from the assessment (Sections 4, 4.1, 5, 8). Each test resets the DB to seed data first.

## Seed Fixtures

| Dealership | Admin 1 | Admin 2 | Viewer |
|---|---|---|---|
| Alpha | admin1@alpha.test | admin2@alpha.test | viewer@alpha.test |
| Beta | admin1@beta.test | admin2@beta.test | viewer@beta.test |

Each dealership has 3+ vehicles. Use one Alpha vehicle (A1) and one Beta vehicle (B1) as targets.

## A. API Tests (Vitest, direct requests, no frontend)

### A1. Login
| ID | Case | Expected |
|---|---|---|
| L1 | Valid credentials | 200, session cookie set (HttpOnly) |
| L2 | Wrong password | 401, generic message, no cookie |
| L3 | Unknown email | 401, same message as L2 |
| L4 | Missing email or password | 400 |
| L5 | `GET /api/me` after login | 200, correct user, role, dealership |

### A2. Authentication (401)
| ID | Case | Expected |
|---|---|---|
| AU1 | `GET /api/vehicles` with no cookie | 401 |
| AU2 | `GET /api/vehicles/:id` with no cookie | 401 |
| AU3 | `PUT /api/vehicles/:id` with no cookie | 401, data unchanged |
| AU4 | Garbage/invalid session cookie | 401 |
| AU5 | Expired session (set `expires_at` in the past) | 401 |
| AU6 | Logout, then reuse old cookie | 401 |
| AU7 | `GET /api/me` with no cookie | 401 |
| AU8 | `GET /api/health` with no cookie | 200, no secrets in body |

### A3. Read and Scoping
| ID | Case | Expected |
|---|---|---|
| R1 | Alpha admin lists vehicles | Only Alpha vehicles |
| R2 | Alpha viewer lists vehicles | Only Alpha vehicles (read allowed) |
| R3 | Beta user lists vehicles | Only Beta vehicles |
| R4 | Alpha user `GET` Beta vehicle B1 | 404 |
| R5 | Client sends `dealershipId=Beta` in query/body/header | Ignored, still Alpha data |

### A4. Admin Update
| ID | Case | Expected |
|---|---|---|
| U1 | Admin updates make/model/year/status with correct version | 200, new values, version +1 |
| U2 | Re-read after U1 | New values persisted |
| U3 | Invalid year (non-integer, out of range) | 400, data unchanged |
| U4 | Empty make or model | 400, data unchanged |
| U5 | Invalid status value | 400, data unchanged |
| U6 | Missing `version` in body | 400, data unchanged |
| U7 | Extra fields (id, dealership_id, version override) | Ignored, ownership and version unaffected |

### A5. Role Enforcement (403)
| ID | Case | Expected |
|---|---|---|
| P1 | Viewer `PUT` own-dealership vehicle | 403, stored data unchanged |
| P2 | Viewer sends role=admin in body | Still 403, data unchanged |
| P3 | Viewer can still `GET` list and detail | 200 |

### A6. Cross-Dealership Writes
| ID | Case | Expected |
|---|---|---|
| X1 | Alpha admin `PUT` Beta vehicle B1 | 404, B1 unchanged |
| X2 | Alpha admin sets `dealership_id=Beta` in body for A1 | Ignored, A1 stays in Alpha |
| X3 | Beta viewer `PUT` Alpha vehicle | 403 or 404, A1 unchanged |

### A7. Concurrency (core, Section 4.1)
| ID | Case | Expected |
|---|---|---|
| C1 | Alpha admin1 and admin2 load A1 at version N, submit different changes via `Promise.all` | Exactly one 200, exactly one 409 |
| C2 | Read A1 after C1 | Values equal the winner's request, version = N+1 |
| C3 | Loser's fields | Not present in stored record |
| C4 | Stale `PUT` sequentially after a successful update (old version N) | 409, record unchanged |
| C5 | Retry with refreshed version after 409 | 200 |
| C6 | 409 response body | Includes clear message (and current record if designed so) |
| C7 | Run C1 repeatedly (e.g. 20 times) | Always exactly one 200 and one 409 |

### A8. Health
| ID | Case | Expected |
|---|---|---|
| H1 | `GET /api/health` | 200, `{status:"ok"}`, no env values, tokens or DB IDs |

## B. Regression Demonstration (Section 4.1 and 8)

| Step | Action | Result |
|---|---|---|
| 1 | Checkout defective commit/branch (read version, compare in JS, delayed unconditional UPDATE) | Code in place |
| 2 | Run C1/C2/C3 | **Fail** (two 200s or loser overwrites) |
| 3 | Checkout fixed commit (single `UPDATE ... WHERE id AND dealership_id AND version`) | Code in place |
| 4 | Run C1/C2/C3 | **Pass** |
| 5 | Record both commit SHAs and outputs in README | Evidence |

The defective variant is never deployed.

## C. Frontend E2E (Playwright, at least one required)

| ID | Case | Expected |
|---|---|---|
| E1 | Login as Alpha admin | Redirect to inventory |
| E2 | Inventory display | Only Alpha vehicles shown |
| E3 | Edit vehicle and save | Success message, row shows new values |
| E4 | Reload page | New values persist |
| E5 | Wrong password | Invalid credentials message |
| E6 | Viewer login | No edit controls visible |
| E7 | Two admin contexts edit same vehicle, second saves stale | Conflict message with refresh prompt |
| E8 | Refresh after conflict, retry | Success |
| E9 | Logout | Back to login, protected page redirects |

E1 to E4 are the required minimum. E5 to E9 are recommended.

## D. Frontend Error States (manual check or E2E)

| State | Trigger | Expected UI |
|---|---|---|
| Loading | Slow list request | Loading indicator |
| Invalid credentials | Wrong password | Clear error message |
| Session expired | Delete session row, then act | Redirect to login with message |
| Forbidden | Force a PUT as viewer | "No permission" message |
| API failure | Stop backend or 500 | Generic retry message |
| Conflict | Stale PUT | "Updated by someone else. Refresh and try again." |

## E. Deployed Smoke Test (Section 5)

Run against the deployed URL after each deploy:

| Step | Action | Expected |
|---|---|---|
| S1 | `GET /api/health` | 200 |
| S2 | Login as admin1 (Alpha) | 200 |
| S3 | Allowed update on an Alpha vehicle | 200, version +1 |
| S4 | Rejected access (viewer PUT or Alpha reading Beta vehicle) | 403 or 404 |
| S5 | Stale-edit conflict (admin2 submits old version) | 409 |
| S6 | Final read | Matches S3 values |

Restore smoke-test data afterward or use a dedicated vehicle so results stay repeatable.

## F. CI Verification

| Case | Expected |
|---|---|
| PR with passing tests | Checks green, no deploy |
| Push to main with failing test | Deploy job skipped |
| Push to main with passing checks | Deploy runs, health check passes |

## G. Results Summary Template (for README)

| Suite | Command | Result |
|---|---|---|
| API tests | `npm test` | X passed / Y failed |
| E2E | `npm run test:e2e` | X passed |
| Build | `npm run build` | success |
| Smoke (deployed) | `npm run smoke` | success |
| Regression (defective) | commit `<sha>` | fails as expected |
| Regression (fixed) | commit `<sha>` | passes |

State clearly any check you could not run.
