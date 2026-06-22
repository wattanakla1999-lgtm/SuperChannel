import { expect, test, type Browser, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@superchannel.local");
  await page.getByLabel("Password").fill("SuperChannel123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
}

async function switchToThai(page: Page) {
  await page.getByTestId("language-switcher").first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expect(page.getByPlaceholder("ค้นหาการสนทนา")).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test.describe("localization", () => {
  test("English is the safe fallback for missing and unsupported locales", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "superchannel_locale",
        value: "unsupported",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    const response = await page.request.patch("/api/settings/locale", {
      data: { locale: "jp" },
    });
    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "UNSUPPORTED_LOCALE",
    });
  });

  test("Thai updates immediately and persists across refresh and navigation", async ({
    page,
  }) => {
    await login(page);
    await switchToThai(page);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(page.getByPlaceholder("ค้นหาการสนทนา")).toBeVisible();

    const routes = [
      ["/dashboard", "dashboard-page", "แดชบอร์ด"],
      ["/publishing", "publishing-page", "การเผยแพร่"],
      ["/integrations", "integrations-page", "การเชื่อมต่อ"],
      ["/customers", "customers-page", "ลูกค้า"],
      ["/team", "team-page", "ทีม"],
      ["/settings", "settings-page", "การตั้งค่า"],
    ] as const;

    for (const [route, testId, text] of routes) {
      await page.goto(route);
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "th");
    }
  });

  test("Inbox Orders use Thai dates, numbers, and THB currency", async ({ page }) => {
    await login(page);
    const localeResponse = await page.request.patch("/api/settings/locale", {
      data: { locale: "th" },
    });
    expect(localeResponse.status()).toBe(200);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await page.getByTestId("conversation-item-conv-line-001").click();
    await page.getByTestId("customer-panel").getByTestId("customer-orders-tab").click();

    const summary = page.getByTestId("purchase-summary");
    await expect(summary).toBeVisible({ timeout: 15000 });
    await expect(summary).toContainText("ยอดใช้จ่ายทั้งหมด");
    await expect(summary).toContainText("฿");
    await expect(page.getByTestId("order-history")).toContainText("2569");
    await expect(page.getByTestId("order-details")).toContainText("ยอดเรียกเก็บ");
  });

  test("Thai layouts do not overflow on desktop or mobile", async ({ browser }) => {
    await verifyThaiLayout(browser, { width: 1440, height: 900 });
    await verifyThaiLayout(browser, { width: 390, height: 844 });
  });
});

async function verifyThaiLayout(
  browser: Browser,
  viewport: { width: number; height: number },
) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await login(page);
  const localeResponse = await page.request.patch("/api/settings/locale", {
    data: { locale: "th" },
  });
  expect(localeResponse.status()).toBe(200);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expectNoHorizontalOverflow(page);

  await page.goto("/settings");
  await expect(page.getByTestId("settings-page")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await context.close();
}
