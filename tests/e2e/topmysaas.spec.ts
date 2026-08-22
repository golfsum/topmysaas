import { expect, test } from "@playwright/test";

test("renders the launch auction without layout overflow", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "The weekly Top 5 SaaS auction is launching soon.",
    }),
  ).toBeVisible();
  await expect(page.getByText(/Bidding is open now/)).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Current launch bids" }),
  ).toBeVisible();
  await expect(page.getByText("NexusFlow").first()).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "CloudBolt" })).toBeVisible();
  await expect(page.getByText("Preview data")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  expect(pageErrors).toEqual([]);
});

test("submits a complete bid form to the checkout endpoint", async ({ page }) => {
  let submittedBody: Record<string, unknown> | undefined;
  await page.route("**/api/checkout", async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        checkoutUrl: "http://127.0.0.1:3107/terms?checkout_test=1",
        chargedTodayCents: 24_800,
        targetTotalCents: 24_800,
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Take #1 for $248" }).click();
  await expect(page.getByRole("dialog", { name: "Place your bid" })).toBeVisible();

  await page.getByLabel("Product name").fill("Test Pilot");
  await page.getByLabel("Website URL").fill("testpilot.example");
  await page
    .getByLabel("Short description")
    .fill("A focused SaaS product used to verify the checkout path.");
  await page.getByLabel("New total bid").fill("248");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to secure checkout" }).click();

  await expect(page).toHaveURL(/\/terms\?checkout_test=1$/);
  expect(submittedBody).toEqual({
    name: "Test Pilot",
    url: "https://testpilot.example/",
    description: "A focused SaaS product used to verify the checkout path.",
    targetTotalCents: 24_800,
  });
});

test("publishes the required legal protections", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1, name: "Terms" })).toBeVisible();
  await expect(page.getByText("Bidding is final. All payments are non-refundable.")).toBeVisible();
  await expect(
    page.getByText("Your listing can be outbid at any time and may lose its rank immediately."),
  ).toBeVisible();
  await expect(
    page.getByText("The Top 5 board resets every Monday at 00:00 UTC. All rankings are cleared."),
  ).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByText(/We do not sell personal data/).first()).toBeVisible();
});

test("keeps the admin dashboard behind the login route", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});
