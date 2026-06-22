import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@superchannel.local");
  await page.getByLabel("Password").fill("SuperChannel123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
}

test.describe("inbox", () => {
  test("unauthenticated access redirects to /login", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("valid login redirects to and displays /inbox", async ({ page }) => {
    await login(page);
    await expect(page.getByTestId("inbox-page")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Welcome, SuperChannel Admin" }),
    ).toBeVisible();
  });

  test("conversation list and mock channels render", async ({ page }) => {
    await login(page);

    await expect(page.getByTestId("conversation-list")).toBeVisible();
    await expect(page.getByTestId("conversation-item-conv-line-001")).toContainText(
      "LINE",
    );
    await expect(page.getByTestId("conversation-item-conv-fb-002")).toContainText(
      "Facebook",
    );
    await expect(page.getByTestId("conversation-item-conv-ig-003")).toContainText(
      "Instagram",
    );
    await expect(page.getByTestId("conversation-item-conv-tg-004")).toContainText(
      "Telegram",
    );
  });

  test("selecting a conversation displays its messages and customer", async ({
    page,
  }) => {
    await login(page);

    await page.getByTestId("conversation-item-conv-fb-002").click();

    await expect(page.getByTestId("message-thread")).toContainText(
      "Can you share your bulk publishing rates for six brands?",
    );
    await expect(page.getByTestId("customer-panel")).toContainText(
      "Marco Rivera",
    );
    await expect(page.getByTestId("customer-panel")).toContainText(
      "Jules Carter",
    );
  });

  test("search and status filters work", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "Resolved" }).click();
    await expect(page.getByTestId("conversation-item-conv-ig-003")).toBeVisible();
    await expect(
      page.getByTestId("conversation-item-conv-line-001"),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "All" }).click();
    await page.getByTestId("conversation-search").fill("telegram");
    await expect(page.getByTestId("conversation-item-conv-tg-004")).toBeVisible();
    await expect(page.getByTestId("conversation-item-conv-line-001")).toHaveCount(0);
  });

  test("sending a mock message shows loading and appends the message once", async ({
    page,
  }) => {
    await login(page);

    await page.getByTestId("conversation-item-conv-line-001").click();
    await page.getByTestId("message-input").fill("Following up with the pickup ETA.");
    await page.getByTestId("send-message-button").click();

    await expect(
      page.getByRole("button", { name: "Sending..." }),
    ).toBeDisabled();
    await expect(page.getByTestId("message-thread")).toContainText(
      "Following up with the pickup ETA.",
    );
    await expect(page.getByTestId("message-thread").getByText("Following up with the pickup ETA.")).toHaveCount(1);
  });

  test("empty search state appears", async ({ page }) => {
    await login(page);

    await page.getByTestId("conversation-search").fill("zzzz-no-match");
    await expect(
      page.getByText("No conversations match your search."),
    ).toBeVisible();
  });

  test("logout clears the session and redirects to /login", async ({ page }) => {
    await login(page);

    await page.getByTestId("logout-button").click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("mobile conversation navigation works without clipping", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await login(page);
    await expect(page.getByTestId("conversation-list")).toBeVisible();

    await page.getByTestId("conversation-item-conv-tg-004").click();
    await expect(page.getByTestId("message-thread")).toBeVisible();
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();

    await page.getByRole("button", { name: "Customer" }).click();
    await expect(page.getByTestId("customer-panel").last()).toContainText(
      "Jonas Holt",
    );

    await page.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByTestId("conversation-list")).toBeVisible();

    await context.close();
  });

  test("orders tab loads the correct customer purchase summary and detail", async ({
    page,
  }) => {
    await login(page);

    await page.getByTestId("conversation-item-conv-line-001").click();
    const customerPanel = page.getByTestId("customer-panel");

    await customerPanel.getByTestId("customer-orders-tab").click();

    await expect(page.getByText("Loading customer commerce...")).toBeVisible();
    await expect(page.getByTestId("purchase-summary")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("purchase-summary")).toContainText("Total orders");
    await expect(page.getByTestId("purchase-summary")).toContainText("3");
    await expect(page.getByTestId("order-history")).toContainText("SC-1003");
    await expect(page.getByTestId("order-history")).toContainText("Shopee");
    await expect(page.getByTestId("order-details")).toContainText("SC Messenger Hub Annual");
    await expect(page.getByTestId("order-details")).toContainText("LINE Pay");

    const initialPanelBox = await customerPanel.boundingBox();
    if (!initialPanelBox) {
      throw new Error("Customer panel was not measurable.");
    }

    await page.getByTestId("order-row-order-nina-1002").click();
    await expect(page.getByTestId("order-details")).toContainText("SC-TRIAGE-PACK");
    const orderPanelBox = await customerPanel.boundingBox();
    if (!orderPanelBox) {
      throw new Error("Customer panel was not measurable after opening an order.");
    }
    expect(Math.abs(orderPanelBox.height - initialPanelBox.height)).toBeLessThanOrEqual(1);

    await page.getByTestId("view-invoice-order-nina-1003").click();
    await expect(page.getByTestId("invoice-preview")).toContainText("INV-2026-1003", {
      timeout: 15000,
    });
    const invoicePanelBox = await customerPanel.boundingBox();
    if (!invoicePanelBox) {
      throw new Error("Customer panel was not measurable after opening an invoice.");
    }
    expect(Math.abs(invoicePanelBox.height - initialPanelBox.height)).toBeLessThanOrEqual(1);
  });

  test("order sorting and status filtering work without duplicates", async ({ page }) => {
    await login(page);

    await page.getByTestId("conversation-item-conv-line-001").click();
    await page.getByTestId("customer-panel").getByTestId("customer-orders-tab").click();
    await expect(page.getByTestId("purchase-summary")).toBeVisible({ timeout: 15000 });

    await page.getByLabel("Order sort").selectOption("oldest");
    await expect(page.getByTestId("order-row-order-nina-1001")).toBeVisible();
    await expect(page.getByTestId("order-row-order-nina-1001")).toContainText("LZD-88214");

    await page.getByLabel("Order status filter").selectOption("Shipped");
    await expect(page.getByTestId("order-row-order-nina-1002")).toBeVisible();
    await expect(page.getByTestId("order-row-order-nina-1002")).toHaveCount(1);
    await expect(page.getByTestId("order-row-order-nina-1003")).toHaveCount(0);
  });

  test("invoice preview and no-invoice state render correctly", async ({ page }) => {
    await login(page);

    await page.getByTestId("conversation-item-conv-line-001").click();
    await page.getByTestId("customer-panel").getByTestId("customer-orders-tab").click();
    await expect(page.getByTestId("purchase-summary")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("view-invoice-order-nina-1003").click();

    await expect(page.getByTestId("invoice-preview")).toContainText("INV-2026-1003", {
      timeout: 15000,
    });
    await expect(page.getByTestId("invoice-preview")).toContainText("Nina Tan");
    await expect(page.getByTestId("invoice-preview")).toContainText("Tax (7%)");

    await page.getByTestId("conversation-item-conv-ig-003").click();
    await page.getByTestId("customer-panel").getByTestId("customer-orders-tab").click();
    await expect(page.getByTestId("purchase-summary")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("order-row-order-aya-2002").click();

    await expect(page.getByTestId("invoice-preview")).toContainText(
      "No invoice available",
    );
  });

  test("customers without orders and conversation switches do not retain prior commerce data", async ({
    page,
  }) => {
    await login(page);

    await page.getByTestId("conversation-item-conv-line-001").click();
    await page.getByTestId("customer-panel").getByTestId("customer-orders-tab").click();
    await expect(page.getByTestId("purchase-summary")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("order-history")).toContainText("SC-1003");

    await page.getByTestId("conversation-item-conv-fb-002").click();
    await page.getByTestId("customer-panel").getByTestId("customer-orders-tab").click();
    await expect(page.getByTestId("purchase-summary")).toBeVisible({ timeout: 15000 });

    await expect(page.getByTestId("purchase-summary")).toContainText("Total orders");
    await expect(page.getByTestId("purchase-summary")).toContainText("THB");
    await expect(page.getByTestId("order-history")).toContainText("No purchase history yet");
    await expect(page.getByTestId("order-history")).not.toContainText("SC-1003");
  });

  test("unauthorized commerce API requests are rejected", async ({ page }) => {
    const response = await page.request.get("/api/customers/cust-line-nina/orders");
    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  test("orders retry flow recovers from a temporary mock API failure", async ({
    page,
  }) => {
    await login(page);

    await page.getByTestId("conversation-item-conv-tg-004").click();
    await page.getByTestId("customer-panel").getByTestId("customer-orders-tab").click();

    await expect(page.getByText("Orders unavailable")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("orders-retry-button").click();

    await expect(page.getByTestId("purchase-summary")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("purchase-summary")).toContainText("Total orders");
    await expect(page.getByTestId("order-history")).toContainText("SC-3001");
    await expect(page.getByTestId("order-details")).toContainText("Incident Dashboard Plus");
  });

  test("mobile orders drawer shows details and invoice preview without clipping", async ({
    browser,
  }) => {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 375, height: 667 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      await login(page);
      await page.getByTestId("conversation-item-conv-line-001").click();
      await page.getByRole("button", { name: "Customer" }).click();
      const customerPanel = page.getByTestId("customer-panel").last();

      await customerPanel.getByTestId("customer-orders-tab").click();

      await expect(page.getByTestId("purchase-summary").last()).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("order-history").last()).toContainText("SC-1003");
      const initialPanelBox = await customerPanel.boundingBox();
      if (!initialPanelBox) {
        throw new Error("Mobile customer panel was not measurable.");
      }

      await customerPanel.getByTestId("order-row-order-nina-1002").click();
      const orderDetails = page.getByTestId("order-details").last();
      const timelineCard = orderDetails.getByTestId("fulfillment-timeline-card");
      const chargesCard = orderDetails.getByTestId("charges-card");
      await expect(orderDetails).toContainText("SC-TRIAGE-PACK");
      await expect(chargesCard).toContainText("Charges");
      await expect(timelineCard).toBeVisible();
      await expect(chargesCard).toBeVisible();

      const [detailsBox, timelineBox, chargesBox] = await Promise.all([
        orderDetails.boundingBox(),
        timelineCard.boundingBox(),
        chargesCard.boundingBox(),
      ]);
      if (!detailsBox || !timelineBox || !chargesBox) {
        throw new Error("Mobile order detail cards were not measurable.");
      }

      expect(chargesBox.y).toBeGreaterThanOrEqual(timelineBox.y + timelineBox.height - 1);
      expect(Math.abs(chargesBox.x - timelineBox.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(chargesBox.width - timelineBox.width)).toBeLessThanOrEqual(1);
      expect(timelineBox.x).toBeGreaterThanOrEqual(detailsBox.x);
      expect(timelineBox.x + timelineBox.width).toBeLessThanOrEqual(
        detailsBox.x + detailsBox.width + 1,
      );

      const overflow = await orderDetails.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      const headingStyles = await orderDetails
        .getByTestId("fulfillment-timeline-heading")
        .evaluate((element) => {
          const styles = window.getComputedStyle(element);
          return {
            overflowWrap: styles.overflowWrap,
            wordBreak: styles.wordBreak,
          };
        });
      expect(headingStyles.wordBreak).not.toBe("break-all");
      expect(headingStyles.overflowWrap).not.toBe("anywhere");
      const orderPanelBox = await customerPanel.boundingBox();
      if (!orderPanelBox) {
        throw new Error("Mobile customer panel was not measurable after opening an order.");
      }
      expect(Math.abs(orderPanelBox.height - initialPanelBox.height)).toBeLessThanOrEqual(1);

      await customerPanel.getByTestId("view-invoice-order-nina-1003").click();
      await expect(page.getByTestId("invoice-preview").last()).toContainText("INV-2026-1003", {
        timeout: 15000,
      });
      const invoicePanelBox = await customerPanel.boundingBox();
      if (!invoicePanelBox) {
        throw new Error("Mobile customer panel was not measurable after opening an invoice.");
      }
      expect(Math.abs(invoicePanelBox.height - initialPanelBox.height)).toBeLessThanOrEqual(1);
      await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

      await context.close();
    }
  });
});
