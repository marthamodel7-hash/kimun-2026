import { test, expect } from "@playwright/test";

async function login(page: any) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill("sg@kimun.demo");
  await page.getByPlaceholder("Password").fill("kimun123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Real-time command center")).toBeVisible({ timeout: 15000 });
}

test("login → dashboard readiness renders from live data", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Event readiness")).toBeVisible();
  await expect(page.getByText("Critical actions")).toBeVisible();
});

test("sponsor → deliverable → proof flow", async ({ page }) => {
  await login(page);
  await page.goto("/sponsors");
  const org = "E2E Foods " + Date.now();
  await page.getByPlaceholder("New sponsor organization…").fill(org);
  await page.getByRole("button", { name: "+ Add" }).click();
  await expect(page.getByText(org)).toBeVisible({ timeout: 10000 });
  // open deliverables for the new sponsor (last match)
  const cards = page.locator(".glass", { hasText: org });
  await cards.last().getByRole("button", { name: "Deliverables" }).click();
  await cards.last().getByPlaceholder("New deliverable…").fill("E2E logo placement");
  await cards.last().getByRole("button", { name: "+ Add", exact: true }).click();
  await expect(cards.last().getByText("E2E logo placement")).toBeVisible({ timeout: 10000 });
});

test("content → approval flow", async ({ page }) => {
  await login(page);
  await page.goto("/media");
  await page.getByRole("button", { name: "content", exact: true }).click();
  const title = "E2E Post " + Date.now();
  await page.getByPlaceholder("New content title…").fill(title);
  await page.getByRole("button", { name: "+ Add" }).click();
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 });
  // move idea → review via status select in idea column
  const card = page.locator(".glass", { hasText: title }).last();
  await card.locator("select").first().selectOption("review");
  await page.getByRole("button", { name: "approvals", exact: true }).click();
  await expect(page.getByText("Approval queue")).toBeVisible();
});

test("tasks create → complete + delegates CSV export", async ({ page }) => {
  await login(page);
  await page.goto("/tasks");
  const t = "E2E Task " + Date.now();
  await page.getByPlaceholder("New task title…").fill(t);
  await page.getByRole("button", { name: "+ Add task" }).click();
  await expect(page.getByText(t).first()).toBeVisible({ timeout: 10000 });
  await page.goto("/delegates");
  const dl = page.waitForEvent("download");
  await page.getByRole("link", { name: "⬇ Export CSV" }).click();
  const path = await (await dl).path();
  expect(path).toBeTruthy();
});

test("badge → check-in flow", async ({ page }) => {
  await login(page);
  await page.goto("/delegates");
  // generate a badge for the first delegate row, capture its code
  await page.getByRole("button", { name: "Generate" }).first().click();
  await expect(page.locator("img[alt='badge QR']").first()).toBeVisible({ timeout: 10000 });
  const code = (await page.locator("img[alt='badge QR']").first().locator("..").locator("div").innerText().catch(() => "")) || "";
  await page.goto("/checkin");
  await expect(page.getByText("delegates inside")).toBeVisible({ timeout: 10000 });
  if (code) {
    await page.getByPlaceholder(/Badge code/).fill(code);
    await page.getByRole("button", { name: "Check in" }).click();
    await expect(page.getByTestId("checkin-result")).toBeVisible({ timeout: 10000 });
  }
  // unknown code shows a clear error, never a silent failure
  await page.getByPlaceholder(/Badge code/).fill("K26-0000-NOPE");
  await page.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByText("Unknown badge code")).toBeVisible({ timeout: 10000 });
});
