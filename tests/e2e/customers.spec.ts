import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@superchannel.local");
  await page.getByLabel("Password").fill("SuperChannel123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
}

test.describe("customers", () => {
  test("unauthenticated access redirects to /login", async ({ page }) => {
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("navigation and active sidebar state work", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Customers" }).click();

    await expect(page).toHaveURL(/\/customers$/);
    await expect(page.getByTestId("customers-page")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Customers" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("customer list and channel badges render", async ({ page }) => {
    await login(page);
    await page.goto("/customers");

    await expect(page.getByTestId("customer-list")).toBeVisible();
    await expect(page.getByTestId("customer-row-cust-line-nina")).toContainText(
      "Nina Tan",
    );
    await expect(
      page.locator("tbody").getByText("Facebook", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.locator("tbody").getByText("Telegram", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByTestId("customer-row-cust-fb-lila")).toContainText(
      "Lila Perez",
    );
    await expect(page.getByTestId("customer-row-cust-tg-jonas")).toContainText(
      "Jonas Holt",
    );
  });

  test("search returns matching customers and shows no-results state", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/customers");

    await page.getByTestId("customer-search").fill("jonas.holt@example.com");
    await expect(page.getByTestId("customer-row-cust-tg-jonas")).toBeVisible();
    await expect(page.getByTestId("customer-row-cust-line-nina")).toHaveCount(0);

    await page.getByTestId("customer-search").fill("zzzz-no-match");
    await expect(page.getByText("No customers match your search.")).toBeVisible();
  });

  test("channel, tag, agent, and status filters work", async ({ page }) => {
    await login(page);
    await page.goto("/customers");

    await page.getByLabel("Channel").selectOption("Facebook");
    await expect(page.getByTestId("customer-row-cust-fb-lila")).toBeVisible();
    await expect(page.getByTestId("customer-row-cust-line-nina")).toHaveCount(0);

    await page.getByLabel("Channel").selectOption("all");
    await page.getByLabel("Tag").selectOption("Creative");
    await expect(page.getByTestId("customer-row-cust-ig-aya")).toBeVisible();
    await expect(page.getByTestId("customer-row-cust-fb-lila")).toHaveCount(0);

    await page.getByLabel("Tag").selectOption("all");
    await page.getByLabel("Assigned agent").selectOption("Harper Quinn");
    await expect(page.getByTestId("customer-row-cust-tg-jonas")).toBeVisible();
    await expect(page.getByTestId("customer-row-cust-line-nina")).toHaveCount(0);

    await page.getByLabel("Assigned agent").selectOption("all");
    await page.getByLabel("Status").selectOption("resolved");
    await expect(page.getByTestId("customer-row-cust-ig-aya")).toBeVisible();
    await expect(page.getByTestId("customer-row-cust-line-nina")).toHaveCount(0);
  });

  test("pagination changes the visible customer set without duplicates", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/customers");

    await expect(page.getByTestId("customer-row-cust-line-nina")).toBeVisible();
    await page.getByTestId("customer-pagination").getByRole("button", { name: "Next" }).click();

    await expect(page.getByTestId("customer-row-cust-line-hana")).toBeVisible();
    await expect(page.getByTestId("customer-row-cust-line-nina")).toHaveCount(0);
  });

  test("selecting a customer opens the correct detail drawer", async ({ page }) => {
    await login(page);
    await page.goto("/customers");

    await page.getByTestId("customer-row-cust-line-nina").click();

    await expect(page.getByTestId("customer-drawer")).toBeVisible();
    await expect(page.getByTestId("customer-drawer")).toContainText(
      "Bangkok, Thailand",
    );
    await expect(page.getByTestId("open-conversation-button")).toBeEnabled();
  });

  test("updating tags and notes persists in the mock UI", async ({ page }) => {
    await login(page);
    await page.goto("/customers");

    await page.getByTestId("customer-row-cust-line-nina").click();
    await page.getByRole("button", { name: "FAQ" }).click();
    await page
      .getByTestId("customer-notes-field")
      .fill("Customer asked for a midnight shipping cutoff update.");
    await page.getByTestId("save-customer-button").click();

    await expect(page.getByText("Customer details saved")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await expect(page.getByTestId("customer-row-cust-line-nina")).toContainText(
      "FAQ",
    );

    await page.getByTestId("customer-row-cust-line-nina").click();
    await expect(page.getByTestId("customer-drawer")).toContainText(
      "Customer asked for a midnight shipping cutoff update.",
    );
  });

  test("open conversation navigates to the related Inbox thread", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/customers");

    await page.getByTestId("customer-row-cust-fb-marco").click();
    await page.getByTestId("open-conversation-button").click();

    await expect(page).toHaveURL(/\/inbox\?conversation=conv-fb-002$/);
    await expect(page.getByTestId("message-thread")).toContainText(
      "Can you share your bulk publishing rates for six brands?",
    );
    await expect(page.getByTestId("customer-panel")).toContainText(
      "Marco Rivera",
    );
  });

  test("mobile list, filters, pagination, and drawer work without clipping", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await login(page);
    await page.goto("/customers");

    await page.getByLabel("Status").selectOption("resolved");
    await expect(
      page.locator("button:visible", { hasText: "Aya Lim" }).first(),
    ).toBeVisible();
    await page.getByLabel("Status").selectOption("all");
    await page.getByTestId("customer-pagination").getByRole("button", { name: "Next" }).click();
    await expect(
      page.locator("button:visible", { hasText: "Hana Tanaka" }).first(),
    ).toBeVisible();

    await page.locator("button:visible", { hasText: "Hana Tanaka" }).first().click();
    await expect(page.getByTestId("customer-drawer")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await context.close();
  });
});
