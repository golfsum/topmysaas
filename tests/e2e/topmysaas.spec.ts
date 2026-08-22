import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/favicon?**", async (route) => {
    await route.fulfill({ status: 204 });
  });
});

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
  await expect(page.getByText("Leaderboard goes live in")).toBeVisible();
  await expect(
    page.getByText(
      "All paid pre-launch listings and totals carry into the opening board.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Current launch bids" }),
  ).toBeVisible();
  await expect(page.getByText("ClientPlot.com").first()).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "AppsResolve.com" })).toBeVisible();
  await expect(page.locator("#leaderboard").getByText("Open for bids")).toHaveCount(3);
  await expect(page.locator("footer").getByRole("link", { name: "Admin" })).toHaveCount(0);
  await expect(page.getByLabel("Take #1 for")).toHaveValue("7");
  await expect(page.getByRole("button", { name: "Claim", exact: true })).toBeVisible();

  const clientPlotRow = page
    .getByRole("listitem")
    .filter({ hasText: "ClientPlot.com" })
    .first();
  await clientPlotRow.hover();
  await expect(
    clientPlotRow.getByRole("button", { name: "Claim rank 1 for $7" }),
  ).toBeVisible();

  const clientPlotLink = clientPlotRow.getByRole("link", {
    name: /Visit ClientPlot\.com/,
  });
  await expect(clientPlotLink).toHaveClass(/listing-row-link/);

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
        chargedTodayCents: 700,
        targetTotalCents: 700,
      }),
    });
  });

  await page.goto("/");
  await page
    .getByRole("button", { name: "Claim this spot for $7" })
    .first()
    .click();
  await expect(page.getByRole("dialog", { name: "Place your bid" })).toBeVisible();

  await page.getByLabel("Product name").fill("Test Pilot");
  await page.getByLabel("Website URL").fill("testpilot.example");
  await page
    .getByLabel("Short description")
    .fill("A focused SaaS product used to verify the checkout path.");
  await page.getByLabel("New total bid").fill("7");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to secure checkout" }).click();

  await expect(page).toHaveURL(/\/terms\?checkout_test=1$/);
  expect(submittedBody).toEqual({
    name: "Test Pilot",
    url: "https://testpilot.example/",
    description: "A focused SaaS product used to verify the checkout path.",
    targetTotalCents: 700,
    targetRank: 1,
  });
});

test("accepts a lower hero total and lets the server place it at its actual rank", async ({ page }) => {
  let submittedBody: Record<string, unknown> | undefined;
  await page.route("**/api/checkout", async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        checkoutUrl: "http://127.0.0.1:3107/terms?hero_checkout_test=1",
        chargedTodayCents: 500,
        targetTotalCents: 500,
      }),
    });
  });

  await page.goto("/");
  await page.getByLabel("Take #1 for").fill("5");
  await expect(page.getByText(/Estimated new-listing rank: #3/)).toBeVisible();
  await page.getByRole("button", { name: "Claim", exact: true }).click();

  await expect(page.getByRole("dialog", { name: "Place your bid" })).toBeVisible();
  await expect(page.getByLabel("New total bid")).toHaveValue("5");
  await page.getByLabel("Product name").fill("Hero Bid Test");
  await page.getByLabel("Website URL").fill("herobid.example");
  await page
    .getByLabel("Short description")
    .fill("A SaaS listing used to verify general bid placement.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to secure checkout" }).click();

  await expect(page).toHaveURL(/\/terms\?hero_checkout_test=1$/);
  expect(submittedBody).toEqual({
    name: "Hero Bid Test",
    url: "https://herobid.example/",
    description: "A SaaS listing used to verify general bid placement.",
    targetTotalCents: 500,
  });
});

test("searches every active listing and keeps its true rank", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search listings" }).fill("appsresolve");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/\?q=appsresolve/);
  const leaderboard = page.locator("#leaderboard");
  await expect(
    leaderboard.getByRole("link", { name: /Visit AppsResolve\.com/ }),
  ).toBeVisible();
  await expect(
    leaderboard.getByRole("link", { name: /Visit ClientPlot/ }),
  ).toHaveCount(0);
  await expect(leaderboard.getByText("#2", { exact: true })).toBeVisible();

  await leaderboard.getByRole("link", { name: "Clear" }).click();
  await expect(page).toHaveURL(/\/#leaderboard$/);
  await expect(
    leaderboard.getByRole("link", { name: /Visit ClientPlot/ }).first(),
  ).toBeVisible();
});

test("celebrates a confirmed payment and shows the resulting place", async ({ page }) => {
  await page.route("**/api/bid/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "fulfilled",
        listing: {
          id: "test-pilot",
          name: "Test Pilot",
          url: "https://testpilot.example/",
          description: "A focused SaaS product.",
          bidAmountCents: 700,
          createdAt: "2026-08-22T00:00:00.000Z",
          updatedAt: "2026-08-22T00:00:00.000Z",
        },
        rank: 3,
        message: "Payment confirmed. The listing is currently ranked #3.",
      }),
    });
  });

  await page.goto("/bid/success?session_id=cs_test_success123");

  await expect(page.getByText("Payment successful")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "You're now in 3rd place." }),
  ).toBeVisible();
  await expect(page.getByText("Current rank")).toBeVisible();
  await expect(page.getByText("#3")).toBeVisible();
  await expect(page.locator("[data-success-confetti]")).toBeAttached();
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
