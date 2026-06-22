import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@superchannel.local");
  await page.getByLabel("Password").fill("SuperChannel123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
}

test.describe("integrations", () => {
  test("unauthenticated access redirects to /login", async ({ page }) => {
    await page.goto("/integrations");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("navigation and active sidebar state work", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Integrations" }).click();

    await expect(page).toHaveURL(/\/integrations$/);
    await expect(page.getByTestId("integrations-page")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Integrations" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("provider cards, capabilities, and statuses render", async ({ page }) => {
    await login(page);
    await page.goto("/integrations");

    await expect(page.getByTestId("integration-card-facebook")).toContainText(
      "Facebook Page",
    );
    await expect(page.getByTestId("integration-card-facebook")).toContainText(
      "connected",
    );
    await expect(page.getByTestId("integration-card-line")).toContainText(
      "disconnected",
    );
    await expect(page.getByTestId("integration-card-x")).toContainText(
      "expired",
    );
    await expect(page.getByTestId("integration-card-tiktok")).toContainText(
      "error",
    );
  });

  test("search and status filters work", async ({ page }) => {
    await login(page);
    await page.goto("/integrations");

    await page.getByTestId("integration-search").fill("telegram");
    await expect(page.getByTestId("integration-card-telegram")).toBeVisible();
    await expect(page.getByTestId("integration-card-facebook")).toHaveCount(0);

    await page.getByTestId("integration-search").fill("");
    await page.getByTestId("integration-status-filter").selectOption("expired");
    await expect(page.getByTestId("integration-card-x")).toBeVisible();
    await expect(page.getByTestId("integration-card-facebook")).toHaveCount(0);
  });

  test("connect flow changes a provider to Connected", async ({ page }) => {
    await login(page);
    await page.goto("/integrations");

    await page.getByTestId("connect-line").click();
    await expect(page.getByTestId("connection-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Connect and test" }).click();

    await expect(page.getByText("LINE Official Account connected successfully")).toBeVisible();
    await expect(page.getByTestId("integration-card-line")).toContainText(
      "connected",
    );
  });

  test("connection test shows successful feedback", async ({ page }) => {
    await login(page);
    await page.goto("/integrations");

    await page.getByTestId("test-facebook").click();
    await expect(
      page.getByText("Facebook Page test completed successfully"),
    ).toBeVisible();
  });

  test("disconnect confirmation changes the provider to Disconnected", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/integrations");

    await page.getByTestId("disconnect-facebook").click();
    await page.getByTestId("confirm-disconnect-button").click();

    await expect(page.getByText("Facebook Page disconnected")).toBeVisible();
    await expect(page.getByTestId("integration-card-facebook")).toContainText(
      "disconnected",
    );
  });

  test("expired and Error states show Reconnect or Retry actions", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/integrations");

    await expect(
      page.getByTestId("integration-card-x").getByRole("button", { name: "Reconnect" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("integration-card-tiktok").getByRole("button", { name: "Retry" }),
    ).toBeVisible();

    await page.getByTestId("integration-card-tiktok").getByRole("button", { name: "Retry" }).click();
    await expect(
      page.getByText("TikTok reconnected successfully"),
    ).toBeVisible();
  });

  test("coming-soon providers cannot be connected", async ({ page }) => {
    await login(page);
    await page.goto("/integrations");

    await expect(page.getByTestId("integration-card-shopee")).toContainText(
      "coming soon",
    );
    await expect(
      page.getByTestId("integration-card-shopee").getByRole("button", { name: "Coming soon" }),
    ).toBeDisabled();
  });

  test("mobile cards and connection dialog work without clipping", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await login(page);
    await page.goto("/integrations");
    await expect(page.getByTestId("integration-card-line")).toBeVisible();

    await page.getByTestId("connect-line").click();
    await expect(page.getByTestId("connection-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await context.close();
  });
});
