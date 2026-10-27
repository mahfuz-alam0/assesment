import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../src/index";
import { hashPassword } from "../src/lib/password";

const PASSWORD = "Dealer#2026";

// ids: users 1,2 alpha admins, 3 alpha viewer, 4 beta admin, 5 beta viewer; vehicles 1,2 alpha, 3 beta
const ALPHA_VEHICLE_ID = 1;
const BETA_VEHICLE_ID = 3;
const edit = { make: "Tesla", model: "3", year: 2024, status: "sold" };

let passwordHash: string;
beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(async () => {
  const run = (statement: string) => env.DB.prepare(statement);
  await env.DB.batch([
    run("DELETE FROM sessions"),
    run("DELETE FROM vehicles"),
    run("DELETE FROM users"),
    run("DELETE FROM dealerships"),
    run("INSERT INTO dealerships (id, name) VALUES (1, 'Alpha Motors'), (2, 'Beta Autos')"),
    run(
      `INSERT INTO users (id, email, password_hash, role, dealership_id) VALUES
       (1, 'admin1@alpha.test', ?1, 'admin', 1), (2, 'admin2@alpha.test', ?1, 'admin', 1),
       (3, 'viewer@alpha.test', ?1, 'viewer', 1), (4, 'admin1@beta.test', ?1, 'admin', 2),
       (5, 'viewer@beta.test', ?1, 'viewer', 2)`,
    ).bind(passwordHash),
    run(
      `INSERT INTO vehicles (id, dealership_id, make, model, year, status) VALUES
       (1, 1, 'Toyota', 'Corolla', 2022, 'available'), (2, 1, 'Honda', 'Civic', 2021, 'reserved'),
       (3, 2, 'Ford', 'Focus', 2020, 'sold')`,
    ),
  ]);
});

function call(path: string, cookie = "", init: RequestInit = {}) {
  return app.request(path, { ...init, headers: { cookie, "content-type": "application/json" } }, env);
}

function post(path: string, body: unknown, cookie = "") {
  return call(path, cookie, { method: "POST", body: JSON.stringify(body) });
}

function put(cookie: string, id: number, body: unknown) {
  return call(`/api/vehicles/${id}`, cookie, { method: "PUT", body: JSON.stringify(body) });
}

async function read(cookie: string, id: number) {
  return (await call(`/api/vehicles/${id}`, cookie)).json<any>();
}

async function login(email: string) {
  const response = await post("/api/login", { email, password: PASSWORD });
  return response.headers.get("set-cookie")!.split(";")[0];
}

describe("login and sessions", () => {
  it("logging in gives me a cookie and /me knows who I am", async () => {
    const response = await post("/api/login", { email: "admin1@alpha.test", password: PASSWORD });
    expect(response.status).toBe(200);

    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await call("/api/me", cookie.split(";")[0]);
    expect(await me.json()).toEqual({ email: "admin1@alpha.test", role: "admin", dealership: "Alpha Motors" });
  });

  it("wrong password and unknown email fail the same way", async () => {
    const wrongPassword = await post("/api/login", { email: "admin1@alpha.test", password: "nope" });
    const unknownEmail = await post("/api/login", { email: "ghost@alpha.test", password: "nope" });
    expect([wrongPassword.status, unknownEmail.status]).toEqual([401, 401]);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
    expect(wrongPassword.headers.get("set-cookie")).toBeNull();
    expect(unknownEmail.headers.get("set-cookie")).toBeNull();
  });

  it("login without an email or password is rejected", async () => {
    expect((await post("/api/login", { email: "admin1@alpha.test" })).status).toBe(400);
    expect((await post("/api/login", { password: PASSWORD })).status).toBe(400);
    expect((await post("/api/login", {})).status).toBe(400);
    expect((await call("/api/login", "", { method: "POST", body: "not json" })).status).toBe(400);
  });

  it("no cookie, a fake cookie or an expired one all get kicked out", async () => {
    for (const path of ["/api/me", "/api/vehicles", `/api/vehicles/${ALPHA_VEHICLE_ID}`]) {
      expect((await call(path)).status).toBe(401);
    }
    expect((await put("", ALPHA_VEHICLE_ID, { ...edit, version: 1 })).status).toBe(401);
    expect(await env.DB.prepare("SELECT make FROM vehicles WHERE id = ?").bind(ALPHA_VEHICLE_ID).first("make")).toBe("Toyota");
    expect((await call("/api/me", "sid=garbage")).status).toBe(401);

    const cookie = await login("admin1@alpha.test");
    await env.DB.prepare("UPDATE sessions SET expires_at = 0").run();
    expect((await call("/api/me", cookie)).status).toBe(401);
  });

  it("old cookie stops working after logout", async () => {
    const cookie = await login("admin1@alpha.test");
    expect((await post("/api/logout", {}, cookie)).status).toBe(200);
    expect((await call("/api/me", cookie)).status).toBe(401);
  });

  it("health check works without logging in and says nothing extra", async () => {
    const response = await call("/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});

describe("vehicles", () => {
  it("I only see my own dealership's cars, even if I ask for another one", async () => {
    const alpha = await login("viewer@alpha.test");
    const list = await (
      await call("/api/vehicles?dealershipId=2", alpha, { headers: { "x-dealership-id": "2", cookie: alpha } })
    ).json<any[]>();
    expect(list.map((vehicle) => vehicle.id)).toEqual([1, 2]);
    expect(list[0]).toEqual({ id: 1, make: "Toyota", model: "Corolla", year: 2022, status: "available", version: 1 });
    expect((await call(`/api/vehicles/${BETA_VEHICLE_ID}`, alpha)).status).toBe(404);
    expect((await call("/api/vehicles/abc", alpha)).status).toBe(404);
  });

  it("beta users see beta cars, and viewers can still read the list and details", async () => {
    const beta = await login("viewer@beta.test");
    expect((await (await call("/api/vehicles", beta)).json<any[]>()).map((vehicle) => vehicle.id)).toEqual([BETA_VEHICLE_ID]);
    expect((await call(`/api/vehicles/${BETA_VEHICLE_ID}`, beta)).status).toBe(200);
    expect((await call(`/api/vehicles/${ALPHA_VEHICLE_ID}`, beta)).status).toBe(404);
    expect((await call(`/api/vehicles/${ALPHA_VEHICLE_ID}`, await login("viewer@alpha.test"))).status).toBe(200);
  });

  it("admin can edit a car, the version goes up, and extra fields are ignored", async () => {
    const cookie = await login("admin1@alpha.test");
    const response = await put(cookie, ALPHA_VEHICLE_ID, { ...edit, version: 1, id: 99, dealership_id: 2 });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: ALPHA_VEHICLE_ID, ...edit, version: 2 });
    expect(await read(cookie, ALPHA_VEHICLE_ID)).toEqual({ id: ALPHA_VEHICLE_ID, ...edit, version: 2 });
    expect(await env.DB.prepare("SELECT dealership_id FROM vehicles WHERE id = ?").bind(ALPHA_VEHICLE_ID).first("dealership_id")).toBe(1);
  });

  it("viewer can't edit a car", async () => {
    const viewer = await login("viewer@alpha.test");
    expect((await put(viewer, ALPHA_VEHICLE_ID, { ...edit, version: 1, role: "admin" })).status).toBe(403);
    expect((await read(viewer, ALPHA_VEHICLE_ID)).make).toBe("Toyota");
  });

  it("admin can't edit a car from another dealership", async () => {
    const alpha = await login("admin1@alpha.test");
    expect((await put(alpha, BETA_VEHICLE_ID, { ...edit, version: 1 })).status).toBe(404);

    const beta = await login("admin1@beta.test");
    expect((await read(beta, BETA_VEHICLE_ID)).make).toBe("Ford");
  });

  it("beta viewer can't edit an alpha car", async () => {
    const beta = await login("viewer@beta.test");
    expect((await put(beta, ALPHA_VEHICLE_ID, { ...edit, version: 1 })).status).toBe(403);
    expect((await read(await login("admin1@alpha.test"), ALPHA_VEHICLE_ID)).make).toBe("Toyota");
  });

  it("editing a car that doesn't exist says not found", async () => {
    expect((await put(await login("admin1@alpha.test"), 999, { ...edit, version: 1 })).status).toBe(404);
  });

  it("bad input is rejected and the car stays the same", async () => {
    const cookie = await login("admin1@alpha.test");
    const badBodies = [
      { ...edit, version: 1, year: 1800 },
      { ...edit, version: 1, year: 2020.5 },
      { ...edit, version: 1, make: "  " },
      { ...edit, version: 1, model: "" },
      { ...edit, version: 1, status: "stolen" },
      edit, // no version
      { ...edit, version: "1" },
      { ...edit, version: 0 },
    ];
    for (const body of badBodies) {
      expect((await put(cookie, ALPHA_VEHICLE_ID, body)).status).toBe(400);
    }

    const response = await put(cookie, ALPHA_VEHICLE_ID, { ...edit, version: 1, year: 1800 });
    expect(Object.keys((await response.json<any>()).fields)).toEqual(["year"]);
    expect(await read(cookie, ALPHA_VEHICLE_ID)).toEqual({
      id: ALPHA_VEHICLE_ID,
      make: "Toyota",
      model: "Corolla",
      year: 2022,
      status: "available",
      version: 1,
    });
  });
});

describe("two admins editing the same car", () => {
  it("both save at the same time, one wins and the other gets a conflict", async () => {
    const [firstCookie, secondCookie] = await Promise.all([login("admin1@alpha.test"), login("admin2@alpha.test")]);
    const firstEdit = { make: "One", model: "A", year: 2001, status: "sold", version: 1 };
    const secondEdit = { make: "Two", model: "B", year: 2002, status: "reserved", version: 1 };

    const [firstResponse, secondResponse] = await Promise.all([
      put(firstCookie, ALPHA_VEHICLE_ID, firstEdit),
      put(secondCookie, ALPHA_VEHICLE_ID, secondEdit),
    ]);
    expect([firstResponse.status, secondResponse.status].sort()).toEqual([200, 409]);

    const [winner, loserEdit, loserResponse] =
      firstResponse.status === 200 ? [firstEdit, secondEdit, secondResponse] : [secondEdit, firstEdit, firstResponse];

    const stored = await read(firstCookie, ALPHA_VEHICLE_ID);
    expect(stored).toMatchObject({ make: winner.make, model: winner.model, year: winner.year, status: winner.status, version: 2 });
    expect(stored.make).not.toBe(loserEdit.make);

    const body = await loserResponse.json<any>();
    expect(body.error).toBe("This vehicle was updated by someone else. Refresh and try again.");
    expect(body.current).toEqual(stored);
  });

  it("same race 20 times, always one winner and one conflict", async () => {
    const [firstCookie, secondCookie] = await Promise.all([login("admin1@alpha.test"), login("admin2@alpha.test")]);
    for (let attempt = 0; attempt < 20; attempt++) {
      const { version } = await read(firstCookie, ALPHA_VEHICLE_ID);
      const responses = await Promise.all([
        put(firstCookie, ALPHA_VEHICLE_ID, { ...edit, make: `One${attempt}`, version }),
        put(secondCookie, ALPHA_VEHICLE_ID, { ...edit, make: `Two${attempt}`, version }),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect((await read(firstCookie, ALPHA_VEHICLE_ID)).version).toBe(version + 1);
    }
  });

  it("saving with an old version fails, saving again with the new one works", async () => {
    const cookie = await login("admin1@alpha.test");
    expect((await put(cookie, ALPHA_VEHICLE_ID, { ...edit, version: 1 })).status).toBe(200);
    expect((await put(cookie, ALPHA_VEHICLE_ID, { ...edit, make: "Late", version: 1 })).status).toBe(409);
    expect((await read(cookie, ALPHA_VEHICLE_ID)).make).toBe("Tesla");
    expect((await put(cookie, ALPHA_VEHICLE_ID, { ...edit, make: "Retry", version: 2 })).status).toBe(200);
    expect((await put(cookie, ALPHA_VEHICLE_ID, { ...edit, make: "Ahead", version: 99 })).status).toBe(409);
  });
});
