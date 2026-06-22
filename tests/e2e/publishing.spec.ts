import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@superchannel.local");
  await page.getByLabel("Password").fill("SuperChannel123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
}

test.describe("publishing", () => {
  test("unauthenticated access redirects to /login", async ({ page }) => {
    await page.goto("/publishing");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("publishing navigation and active state work", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Publishing" }).click();

    await expect(page).toHaveURL(/\/publishing$/);
    await expect(page.getByTestId("publishing-page")).toBeVisible();
    await expect(page.getByRole("link", { name: "Publishing" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("mock post list and status filters render correctly", async ({ page }) => {
    await login(page);
    await page.goto("/publishing");

    await expect(page.getByTestId("post-list")).toContainText("scheduled");
    await page.getByRole("button", { name: "Drafts" }).click();
    await expect(page.getByTestId("post-list")).toContainText(
      "Drafting the next creator toolkit drop",
    );
    await expect(page.getByText("Weekend launch checklist is live")).toHaveCount(0);
  });

  test("required caption/media and channel validation work", async ({ page }) => {
    await login(page);
    await page.goto("/publishing");

    await page.getByTestId("create-post-button").click();
    await page.getByTestId("submit-post-button").click();
    await expect(page.getByText("Add a caption or media")).toBeVisible();

    await page.getByTestId("post-caption-field").fill("Validation check post");
    await page.getByTestId("submit-post-button").click();
    await expect(page.getByText("Select at least one channel")).toBeVisible();
  });

  test("saving a draft adds one draft post", async ({ page }) => {
    await login(page);
    await page.goto("/publishing");

    await page.getByTestId("create-post-button").click();
    await page.getByTestId("post-caption-field").fill("Draft approval queue check");
    await page.getByTestId("channel-selector").getByRole("button", { name: "Facebook" }).click();
    await page.getByTestId("save-draft-button").click();

    await expect(page.getByText("Draft saved")).toBeVisible();
    await page.getByRole("button", { name: "Drafts" }).click();
    await expect(page.getByTestId("post-list")).toContainText(
      "Draft approval queue check",
    );
  });

  test("publishing now adds one published post", async ({ page }) => {
    await login(page);
    await page.goto("/publishing");

    await page.getByTestId("create-post-button").click();
    await page.getByTestId("post-caption-field").fill("Publish now launch marker");
    await page
      .getByTestId("channel-selector")
      .getByRole("button", { name: "Telegram" })
      .click();
    await page.getByTestId("submit-post-button").click();

    await expect(page.getByText("Post published")).toBeVisible();
    await page.getByRole("button", { name: "Published" }).click();
    await expect(page.getByTestId("post-list")).toContainText(
      "Publish now launch marker",
    );
  });

  test("scheduling requires a future time and adds one scheduled post", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/publishing");

    await page.getByTestId("create-post-button").click();
    await page.getByTestId("post-caption-field").fill("Schedule the creator recap");
    await page
      .getByTestId("channel-selector")
      .getByRole("button", { name: "Instagram" })
      .click();
    await page.getByTestId("schedule-toggle").click();
    await page.locator('input[type="date"]').fill("2020-01-01");
    await page.locator('input[type="time"]').fill("09:00");
    await page.getByTestId("submit-post-button").click();
    await expect(page.getByText("Choose a future date and time")).toBeVisible();

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dateValue = tomorrow.toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(dateValue);
    await page.locator('input[type="time"]').fill("10:30");
    await page.getByTestId("submit-post-button").click();

    await expect(page.getByText("Post scheduled")).toBeVisible();
    await page.getByRole("button", { name: "Scheduled" }).click();
    await expect(page.getByTestId("post-list")).toContainText(
      "Schedule the creator recap",
    );
  });

  test("search and channel filters work", async ({ page }) => {
    await login(page);
    await page.goto("/publishing");

    await page.getByPlaceholder("Search posts").fill("courier cutoffs");
    await expect(page.getByTestId("post-list")).toContainText(
      "Shipping notice: same-day courier cutoffs now update automatically in the workspace.",
    );

    await page.getByPlaceholder("Search posts").fill("");
    await page.getByRole("combobox").selectOption("TikTok");
    await expect(page.getByTestId("post-list")).toContainText("creator toolkit");
  });

  test("mobile composer and post list work without clipping", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await login(page);
    await page.goto("/publishing");
    await expect(page.getByTestId("post-list")).toBeVisible();

    await page.getByTestId("create-post-button").click();
    await expect(page.getByRole("heading", { name: "Create post" })).toBeVisible();
    await page.getByTestId("post-caption-field").fill("Mobile publishing pass");
    await page
      .getByTestId("channel-selector")
      .getByRole("button", { name: "X" })
      .click();
    await page.getByTestId("submit-post-button").click();

    await expect(page.getByText("Post published")).toBeVisible();
    await context.close();
  });
});
