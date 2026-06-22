import { expect, test, type Browser, type Page, type Route } from "@playwright/test";
import type {
  DashboardAgentsResponse,
  DashboardOverviewResponse,
} from "@/features/dashboard/types/dashboard";

async function loginAs(
  page: Page,
  email:
    | "admin@superchannel.local"
    | "owner@superchannel.local"
    | "supervisor@superchannel.local"
    | "agent@superchannel.local" = "admin@superchannel.local",
) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("SuperChannel123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
}

async function getJson<T>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (requestPath) => {
    const response = await fetch(requestPath, { credentials: "include" });
    return (await response.json()) as T;
  }, path);
}

async function openMobileDashboard(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  await loginAs(page);
  await page.goto("/dashboard");

  return { context, page };
}

test.describe("dashboard", () => {
  test("unauthenticated access redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("navigation and active sidebar state work", async ({ page }) => {
    await loginAs(page);
    await page.getByRole("link", { name: "Dashboard" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("desktop sidebar stays fixed while the page scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await loginAs(page);
    await page.goto("/settings");

    const sidebar = page.getByTestId("authenticated-sidebar");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveCSS("position", "sticky");

    await page.getByTestId("settings-page").evaluate((element) => {
      element.style.minHeight = "1600px";
    });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox?.y).toBeGreaterThanOrEqual(0);
    expect(sidebarBox?.y).toBeLessThanOrEqual(1);
    expect(sidebarBox?.height).toBeLessThanOrEqual(700);
  });

  test("KPI values, charts, and agent rows render from shared mock data", async ({
    page,
  }) => {
    await loginAs(page);
    await page.goto("/dashboard");

    const overview = await getJson<DashboardOverviewResponse>(
      page,
      "/api/dashboard/overview?dateRange=last7",
    );
    const agents = await getJson<DashboardAgentsResponse>(
      page,
      "/api/dashboard/agents?dateRange=last7",
    );

    await expect(page.getByTestId("dashboard-kpis")).toContainText(
      overview.overview.kpis.totalConversations.valueDisplay,
    );
    await expect(page.getByTestId("dashboard-kpis")).toContainText(
      overview.overview.kpis.slaCompliancePercent.valueDisplay,
    );
    await expect(page.getByTestId("conversation-trend-chart")).toBeVisible();
    await expect(page.getByTestId("channel-distribution-chart")).toBeVisible();
    await expect(page.getByTestId("sla-chart")).toBeVisible();
    await expect(page.getByTestId("agent-performance-table")).toContainText(
      agents.agents[0]?.agentName ?? "Harper Quinn",
    );
  });

  test("date, channel, team, and agent filters update every dashboard section", async ({
    page,
  }) => {
    await loginAs(page);
    await page.goto("/dashboard");

    await page.getByLabel("Channel").selectOption("Telegram");
    const telegram = await getJson<DashboardOverviewResponse>(
      page,
      "/api/dashboard/overview?dateRange=last7&channel=Telegram",
    );
    await expect(page.getByTestId("dashboard-kpis")).toContainText(
      telegram.overview.kpis.totalConversations.valueDisplay,
    );
    await expect(page.getByTestId("agent-performance-table")).toContainText(
      "Harper Quinn",
    );

    await page.getByLabel("Team").selectOption("Support");
    const support = await getJson<DashboardOverviewResponse>(
      page,
      "/api/dashboard/overview?dateRange=last7&channel=Telegram&team=Support",
    );
    if (support.overview.isEmpty) {
      await expect(page.getByText("No dashboard data for this filter set")).toBeVisible();
    }

    await page.getByLabel("Channel").selectOption("all");
    await page.getByLabel("Team").selectOption("Support");
    await page.getByLabel("Agent").selectOption("Jules Carter");
    const jules = await getJson<DashboardOverviewResponse>(
      page,
      "/api/dashboard/overview?dateRange=last7&team=Support&agent=Jules%20Carter",
    );
    await expect(page.getByTestId("dashboard-kpis")).toContainText(
      jules.overview.kpis.totalConversations.valueDisplay,
    );
    await expect(page.getByTestId("agent-performance-table")).toContainText(
      "Jules Carter",
    );

    await page.getByLabel("Date range").selectOption("custom");
    await page.getByLabel("Start date").fill("2026-06-19");
    await page.getByLabel("End date").fill("2026-06-19");
    const custom = await getJson<DashboardOverviewResponse>(
      page,
      "/api/dashboard/overview?dateRange=custom&team=Support&agent=Jules%20Carter&startDate=2026-06-19&endDate=2026-06-19",
    );
    if (custom.overview.isEmpty) {
      await expect(page.getByText("No dashboard data for this filter set")).toBeVisible();
    } else {
      await expect(page.getByTestId("dashboard-kpis")).toContainText(
        custom.overview.kpis.averageFirstResponseMinutes.valueDisplay,
      );
    }
  });

  test("custom dropdown and date picker support pointer interaction", async ({ page }) => {
    await loginAs(page);
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Last 7 days" }).click();
    await page.getByRole("listbox", { name: "Date range" }).getByRole("option", { name: "Custom" }).click();
    await expect(page.getByLabel("Start date")).toBeAttached();

    await page.getByRole("button", { name: "Start date" }).click();
    const calendar = page.getByRole("dialog", { name: "Start date" });
    await expect(calendar).toBeVisible();
    await calendar.getByRole("button", { name: "19", exact: true }).click();
    await expect(page.getByLabel("Start date")).toHaveValue(/2026-06-19/);
  });

  test("empty, loading, error, and retry states work", async ({ page }) => {
    await loginAs(page);

    const delayedRoute = async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const response = await route.fetch();
      await route.fulfill({ response });
    };
    await page.route("**/api/dashboard/**", delayedRoute);
    await page.goto("/dashboard");
    await expect(page.getByText("Loading dashboard...")).toBeVisible();
    await expect(page.getByTestId("dashboard-kpis")).toBeVisible();
    await page.unroute("**/api/dashboard/**", delayedRoute);

    let failedOnce = false;
    await page.route("**/api/dashboard/overview**", async (route) => {
      if (!failedOnce) {
        failedOnce = true;
        await route.fulfill({
          body: JSON.stringify({
            code: "INTERNAL_ERROR",
            message: "Unable to load dashboard overview.",
          }),
          contentType: "application/json",
          status: 500,
        });
        return;
      }

      await route.continue();
    });
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-retry-button")).toBeVisible();
    await page.getByTestId("dashboard-retry-button").click();
    await expect(page.getByTestId("dashboard-kpis")).toBeVisible();
    await page.unroute("**/api/dashboard/overview**");

    await page.getByLabel("Date range").selectOption("today");
    await expect(page.getByText("No dashboard data for this filter set")).toBeVisible();
  });

  for (const email of [
    "owner@superchannel.local",
    "admin@superchannel.local",
    "supervisor@superchannel.local",
  ] as const) {
    test(`${email} can view permitted team analytics`, async ({ page }) => {
      await loginAs(page, email);
      await page.goto("/dashboard");

      await expect(page.getByTestId("dashboard-page")).toBeVisible();
      await expect(page.getByLabel("Team")).toBeEnabled();
      await expect(page.getByLabel("Agent")).toBeEnabled();
      await expect(page.getByTestId("agent-performance-table")).toBeVisible();
    });
  }

  test("agent users cannot access another agent's analytics through UI or mock API", async ({
    page,
  }) => {
    await loginAs(page, "agent@superchannel.local");
    await page.goto("/dashboard");

    await expect(page.getByLabel("Team")).toBeDisabled();
    await expect(page.getByLabel("Agent")).toBeDisabled();
    await expect(page.getByTestId("agent-performance-table")).toContainText(
      "Mina Ortiz",
    );

    const response = await page.evaluate(async () => {
      const result = await fetch("/api/dashboard/agents?agent=Jules%20Carter", {
        credentials: "include",
      });

      return {
        body: (await result.json()) as { message: string },
        status: result.status,
      };
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("own analytics");
  });

  test("metric rules handle unreplied conversations and no eligible data correctly", async ({
    page,
  }) => {
    await loginAs(page);
    await page.goto("/dashboard");

    await page.getByLabel("Date range").selectOption("custom");
    await page.getByLabel("Start date").fill("2026-06-19");
    await page.getByLabel("End date").fill("2026-06-19");
    await page.getByLabel("Agent").selectOption("Mina Ortiz");

    await expect(page.getByTestId("dashboard-kpis")).toContainText("No data");
    await expect(page.getByTestId("dashboard-kpis")).toContainText("1");
  });

  test("mobile cards, charts, filters, and table do not clip or overlap", async ({
    browser,
  }) => {
    const { context, page } = await openMobileDashboard(browser);

    await expect(page.getByTestId("dashboard-filters")).toBeVisible();
    await expect(page.getByTestId("conversation-trend-chart")).toBeVisible();
    await expect(page.getByTestId("channel-distribution-chart")).toBeVisible();
    await expect(page.getByTestId("agent-performance-table")).toBeVisible();

    const fitsViewport = await page.evaluate(() => {
      const pageElement = document.querySelector("[data-testid='dashboard-page']");

      if (!pageElement) {
        return false;
      }

      return pageElement.scrollWidth <= window.innerWidth + 8;
    });

    expect(fitsViewport).toBe(true);
    await context.close();
  });
});
