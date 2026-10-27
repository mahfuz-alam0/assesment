# Frontend Guide

Stack: React + Vite + TypeScript, built to static assets and served by the same Worker (no CORS, one deploy). E2E with Playwright.

## Requirement Map

| Requirement | Frontend work |
|---|---|
| HR1 Workflow | Login, logout, vehicle list, admin edit form, reload persistence |
| HR1 Errors | Loading, invalid credentials, expiry, forbidden, API failure states |
| HR4 Conflict | Clear 409 message asking user to refresh before retrying |
| 5 Testing | One E2E: login, inventory display, allowed update |
| 5 Docs | How to reproduce the conflict state |
| 8 Loom | Show login, list, update, logout, conflict in deployed app |

## 1. Setup
1. Scaffold Vite React TS in `/web` (or root).
2. Configure build output to the Worker's static assets directory.
3. Dev proxy `/api` to local Worker (`wrangler dev`).
4. Add `react-router` (or simple state routing) and a small `api.ts` fetch wrapper.

## 2. Pages and Components
- `LoginPage`: email, password, submit, error text.
- `InventoryPage`: header (user email, dealership, role, logout) and vehicle table (make, model, year, status, version).
- `EditVehicleForm`: make, model, year, status select; shown only to admins; Save and Cancel.
- `ErrorBanner` / `Notice`: reusable message component.
- Route guard: no session → redirect to `/login`.

## 3. API Wrapper Behavior
- Always `credentials: 'include'`.
- Central response handling:
  - 401 → clear user state, redirect to login with "Session expired, please sign in again."
  - 403 → "You don't have permission to edit vehicles."
  - 404 → "Vehicle not found."
  - 409 → conflict state (see below).
  - 400 → show field validation messages.
  - Network/5xx → "Something went wrong. Please try again."

## 4. Data Flow
1. On load call `GET /api/me`; if 401 show login.
2. `GET /api/vehicles` with loading state.
3. Edit form preloads vehicle including `version`.
4. Submit `PUT /api/vehicles/:id` with fields + loaded `version`.
5. On success update the row with returned vehicle (new version) and show success note.
6. Reload page → data still there (server persisted).

## 5. Role Handling
- Viewer: no Edit buttons, read-only table.
- Admin: Edit button per row.
- Hiding controls is UX only; backend enforces permissions.

## 6. Conflict UX (HR4)
- On 409 show: "This vehicle was updated by someone else. Refresh and try again."
- Provide a Refresh button that reloads the vehicle, shows current values, and resets the form to the new version.
- Do not auto-retry or silently overwrite.

## 7. Reproduce Conflict (document in README)
1. Open two browsers (or one normal + one incognito).
2. Sign in as `admin1` and `admin2` of the same dealership.
3. Both open edit for the same vehicle.
4. Admin 1 saves; Admin 2 saves a different change.
5. Admin 2 sees the conflict message; click Refresh to see Admin 1's values.

## 8. E2E Test (Playwright)
One test: login as admin → inventory shows dealership's vehicles only → edit a vehicle → success shown → reload → new value persists. Optional extra: viewer sees no edit controls.
- Run against local `wrangler dev` with seeded DB; add to PR workflow.

## 9. Styling
Basic only: readable table, form spacing, colored error/success banners. Spend minimal time here.

## 10. Frontend Evidence for Loom
Login, scoped list, admin update, logout, expired session redirect, viewer view, conflict message and refresh.

## Frontend Done When
All error states visible and handled, conflict flow works with two admins, E2E passes in CI, deployed app works end to end.
