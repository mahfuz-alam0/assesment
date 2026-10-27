import { expect, test, type Page } from "@playwright/test";

// Seeded by scripts/seed.ts: 4 vehicles per dealership, one shared synthetic password.
const PASSWORD = "Dealer#2026";
const VEHICLES_PER_DEALERSHIP = 4;

async function login(page: Page, email: string) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/); // route guard
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Vehicle inventory" })).toBeVisible();
}

function row(page: Page, model: string) {
  return page.getByRole("row", { name: new RegExp(model) });
}

async function statusOf(page: Page, model: string) {
  const cells = row(page, model).getByRole("cell");
  return cells.nth(3).textContent();
}

test("admin sees only their own cars, edits one, and it's still changed after a refresh", async ({ page }) => {
  await login(page, "admin1@alpha.test");
  await expect(page.getByRole("banner")).toContainText("Alpha Motors");
  await expect(page.getByRole("banner")).toContainText("admin1@alpha.test");
  // header row + this dealership's vehicles; the other dealership's would double it
  await expect(page.getByRole("row")).toHaveCount(VEHICLES_PER_DEALERSHIP + 1);

  const nextStatus = (await statusOf(page, "Corolla")) === "reserved" ? "available" : "reserved"; // re-runnable without a reset
  await page.getByRole("button", { name: "Edit Toyota Corolla" }).click();
  await page.getByLabel("Status").selectOption(nextStatus);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved Toyota Corolla" })).toBeVisible();
  await expect(row(page, "Corolla")).toContainText(nextStatus);

  await page.reload();
  await expect(row(page, "Corolla")).toContainText(nextStatus);
});

test("viewer can look at the cars but not edit them, and can log out", async ({ page }) => {
  await login(page, "viewer@alpha.test");
  await expect(page.getByRole("row")).toHaveCount(VEHICLES_PER_DEALERSHIP + 1);
  await expect(page.getByRole("button", { name: /^Edit/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("when two admins edit the same car, the second gets a conflict, refreshes and tries again", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await login(pageA, "admin1@alpha.test");
  await login(pageB, "admin2@alpha.test");
  await pageA.getByRole("button", { name: "Edit Honda Civic" }).click();
  await pageB.getByRole("button", { name: "Edit Honda Civic" }).click();

  const currentStatus = await statusOf(pageA, "Civic");
  const [firstStatus, secondStatus] = ["available", "reserved", "sold"].filter((status) => status !== currentStatus);

  await pageA.getByLabel("Status").selectOption(firstStatus);
  await pageA.getByRole("button", { name: "Save changes" }).click();
  await expect(pageA.getByRole("status").filter({ hasText: "Saved Honda Civic" })).toBeVisible();

  await pageB.getByLabel("Status").selectOption(secondStatus);
  await pageB.getByRole("button", { name: "Save changes" }).click();
  await expect(pageB.getByRole("alert")).toContainText("This vehicle was updated by someone else. Refresh and try again.");
  await expect(pageB.getByRole("button", { name: "Save changes" })).toBeDisabled(); // no blind retry

  await pageB.getByRole("button", { name: "Refresh" }).click();
  await expect(pageB.getByLabel("Status")).toHaveValue(firstStatus);
  await expect(row(pageB, "Civic")).toContainText(firstStatus);

  await pageB.getByLabel("Status").selectOption(secondStatus); // retry on the fresh version
  await pageB.getByRole("button", { name: "Save changes" }).click();
  await expect(pageB.getByRole("status").filter({ hasText: "Saved Honda Civic" })).toBeVisible();
  await expect(row(pageB, "Civic")).toContainText(secondStatus);

  await Promise.all([contextA.close(), contextB.close()]);
});

test("wrong password shows an error and stays on the login page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin1@alpha.test");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("Invalid email or password.");
  await expect(page).toHaveURL(/\/login$/);
});

test("car list shows loading, then an error with a retry button when the API fails", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/vehicles", async (route) => {
    if (calls++) {
      return route.continue();
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.fulfill({ status: 500, json: { error: "boom" } });
  });

  await login(page, "admin1@alpha.test");
  await expect(page.getByText("Loading vehicles…")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Something went wrong. Please try again.");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("row")).toHaveCount(VEHICLES_PER_DEALERSHIP + 1);
});

test("saving without permission shows a permission message", async ({ page }) => {
  await page.route("**/api/vehicles/*", (route) =>
    route.request().method() === "PUT" ? route.fulfill({ status: 403, json: { error: "Forbidden" } }) : route.continue(),
  );
  await login(page, "admin1@alpha.test");
  await page.getByRole("button", { name: "Edit Ford Focus" }).click();
  await page.getByLabel("Model").fill("Focus X");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert")).toContainText("You don't have permission to edit vehicles.");
});

test("if the session expires while saving, you go back to login with a message", async ({ page, context }) => {
  await login(page, "admin1@alpha.test");
  await page.getByRole("button", { name: "Edit Mazda CX-5" }).click();
  await page.getByLabel("Model").fill("CX-5 X");
  await context.clearCookies(); // server now sees no session -> real 401
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("alert")).toContainText("Session expired, please sign in again.");
});
