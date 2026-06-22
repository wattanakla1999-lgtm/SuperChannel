import { expect, test, type Browser, type Page } from "@playwright/test";

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

async function openTeamMember(page: Page, memberId: string) {
  const member = page.locator(`[data-testid="team-member-${memberId}"]:visible`).first();
  const actionButton = page
    .locator(`[data-testid="team-member-${memberId}"]:visible button`)
    .last();

  if (await actionButton.count()) {
    await actionButton.click();
  } else {
    await member.click();
  }

  await expect(page.getByTestId("team-member-drawer")).toBeVisible();
}

function visibleMember(page: Page, memberId: string) {
  return page.locator(`[data-testid="team-member-${memberId}"]:visible`).first();
}

async function apiRequest<T>(
  page: Page,
  input: {
    body?: unknown;
    method: "DELETE" | "PATCH" | "POST";
    path: string;
  },
): Promise<{ body: T; status: number }> {
  return page.evaluate(async ({ body, method, path }) => {
    const response = await fetch(path, {
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      headers: body ? { "content-type": "application/json" } : undefined,
      method,
    });

    return {
      body: (await response.json()) as T,
      status: response.status,
    };
  }, input);
}

async function openMobileTeamPage(
  browser: Browser,
  email:
    | "admin@superchannel.local"
    | "owner@superchannel.local"
    | "supervisor@superchannel.local"
    | "agent@superchannel.local" = "admin@superchannel.local",
) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  await loginAs(page, email);
  await page.goto("/team");

  return { context, page };
}

test.describe("team", () => {
  test("unauthenticated access redirects to /login", async ({ page }) => {
    await page.goto("/team");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("navigation and active sidebar state work", async ({ page }) => {
    await loginAs(page);
    await page.getByRole("link", { name: "Team" }).click();

    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByTestId("team-page")).toBeVisible();
    await expect(page.getByRole("link", { name: "Team" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("members, roles, statuses, and workload render", async ({ page }) => {
    await loginAs(page);
    await page.goto("/team");

    await expect(page.getByTestId("team-member-list")).toBeVisible();
    await expect(visibleMember(page, "member-agent-005")).toContainText(
      "Celine Leung",
    );
    await expect(visibleMember(page, "member-supervisor-001")).toContainText(
      "Supervisor",
    );
    await expect(visibleMember(page, "member-agent-001")).toContainText(
      "limit 12",
    );
    await expect(visibleMember(page, "member-agent-008")).toContainText("inactive");
  });

  test("search, filters, and pagination work without duplicates", async ({ page }) => {
    await loginAs(page);
    await page.goto("/team");

    await page.getByTestId("team-search").fill("Mina");
    await expect(visibleMember(page, "member-agent-001")).toBeVisible();
    await expect(visibleMember(page, "member-agent-002")).toHaveCount(0);

    await page.getByTestId("team-search").fill("");
    await page.getByLabel("Role").selectOption("Supervisor");
    await expect(visibleMember(page, "member-supervisor-001")).toBeVisible();
    await expect(visibleMember(page, "member-agent-001")).toHaveCount(0);

    await page.getByLabel("Role").selectOption("all");
    await page.getByLabel("Account status").selectOption("inactive");
    await expect(visibleMember(page, "member-agent-008")).toBeVisible();
    await expect(visibleMember(page, "member-owner-001")).toHaveCount(0);

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(visibleMember(page, "member-agent-005")).toBeVisible();

    await page.getByTestId("team-pagination").getByRole("button", { name: "Next" }).click();
    await expect(visibleMember(page, "member-owner-001")).toBeVisible();
    await expect(visibleMember(page, "member-agent-005")).toHaveCount(0);
  });

  test("valid invitation creates one pending invitation", async ({ page }) => {
    await loginAs(page);
    await page.goto("/team");

    await expect(page.getByText("3 pending", { exact: true })).toBeVisible();
    await page.getByTestId("invite-member-button").click();
    await expect(page.getByTestId("invite-member-dialog")).toBeVisible();

    await page
      .getByTestId("invite-member-dialog")
      .getByPlaceholder("new.member@superchannel.local")
      .fill("new.owner@superchannel.local");
    await page.getByTestId("invite-member-dialog").getByLabel("Role").selectOption("Admin");
    await page.getByTestId("invite-member-dialog").getByLabel("Team").selectOption("Leadership");
    await page.getByRole("button", { name: "Send invitation" }).click();

    await expect(page.getByText("Invitation created")).toBeVisible();
    await expect(page.getByText("4 pending", { exact: true })).toBeVisible();
    await expect(page.getByText("new.owner@superchannel.local")).toBeVisible();
  });

  test("invalid or duplicate email shows validation feedback", async ({ page }) => {
    await loginAs(page);
    await page.goto("/team");

    await page.getByTestId("invite-member-button").click();
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(
      page.getByText("Enter a valid email and team before inviting."),
    ).toBeVisible();

    await page
      .getByTestId("invite-member-dialog")
      .getByPlaceholder("new.member@superchannel.local")
      .fill("owner@superchannel.local");
    await page.getByRole("button", { name: "Send invitation" }).click();

    await expect(
      page.getByText("That email already belongs to a member or pending invitation."),
    ).toBeVisible();
  });

  test("authorized role and team updates persist in mock state", async ({ browser }) => {
    const { context, page } = await openMobileTeamPage(browser);

    await page.getByTestId("team-search").fill("Jules Carter");
    await openTeamMember(page, "member-agent-002");
    await page.getByTestId("team-member-drawer").getByLabel("Role").selectOption("Supervisor");
    await page.getByTestId("team-member-drawer").getByLabel("Team").selectOption("Growth");
    await page.getByTestId("team-member-drawer").getByLabel("Workload limit").fill("16");
    await page.getByTestId("save-team-member-button").click();

    await expect(page.getByText("Member saved")).toBeVisible();
    await expect(page.getByTestId("team-member-drawer")).toContainText("Jules Carter");
    await expect(page.getByTestId("team-member-drawer")).toContainText("Assigned conversations");

    await page.getByRole("button", { name: "Close" }).click();
    await openTeamMember(page, "member-agent-002");
    await expect(page.getByTestId("team-member-drawer").getByLabel("Role")).toHaveValue(
      "Supervisor",
    );
    await expect(page.getByTestId("team-member-drawer").getByLabel("Team")).toHaveValue(
      "Growth",
    );
    await expect(
      page.getByTestId("team-member-drawer").getByLabel("Workload limit"),
    ).toHaveValue("16");

    await context.close();
  });

  test("self-deactivation and removal are blocked", async ({ browser }) => {
    const { context, page } = await openMobileTeamPage(browser);

    await page.getByTestId("team-search").fill("SuperChannel Admin");
    await openTeamMember(page, "member-admin-001");
    await page.getByRole("button", { name: "Deactivate member" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("You cannot deactivate your own account.")).toBeVisible();

    await page.getByRole("button", { name: "Remove member" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("You cannot remove your own account.")).toBeVisible();

    await context.close();
  });

  test("deactivating the final owner is blocked", async ({ browser }) => {
    const { context, page } = await openMobileTeamPage(browser);

    await page.getByTestId("team-search").fill("Olivia Owens");
    await openTeamMember(page, "member-owner-001");
    await page.getByRole("button", { name: "Deactivate member" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(
      page.getByText("At least one active Owner must remain in the workspace."),
    ).toBeVisible();

    await context.close();
  });

  test("read-only roles cannot mutate members through the UI or mock API", async ({
    browser,
  }) => {
    const { context, page } = await openMobileTeamPage(
      browser,
      "supervisor@superchannel.local",
    );

    await expect(page.getByTestId("invite-member-button")).toBeDisabled();
    await page.getByTestId("team-search").fill("Mina Ortiz");
    await openTeamMember(page, "member-agent-001");
    await expect(page.getByTestId("save-team-member-button")).toHaveCount(0);
    await expect(
      page.getByText("only Owners and Admins can save changes.", { exact: false }),
    ).toBeVisible();

    const response = await apiRequest<{ message: string }>(page, {
      body: { role: "Supervisor" },
      method: "PATCH",
      path: "/api/team/members/member-agent-001",
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Only Owners and Admins can manage team members.");

    await context.close();
  });

  test("team updates appear in Inbox and Customer assignment controls", async ({
    browser,
  }) => {
    const { context, page } = await openMobileTeamPage(browser);

    await page.getByTestId("team-search").fill("Mina Ortiz");
    await openTeamMember(page, "member-agent-001");
    await page.getByRole("button", { name: "Deactivate member" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("Member deactivated")).toBeVisible();

    await page.goto("/customers");
    await expect(
      page.getByLabel("Assigned agent").locator("option").filter({ hasText: "Mina Ortiz (Inactive)" }),
    ).toHaveCount(1);

    await page.goto("/inbox?conversation=conv-line-001");
    await expect(page.getByTestId("customer-panel")).toContainText("Mina Ortiz (Inactive)");

    await context.close();
  });

  test("mobile list, invitation dialog, and member drawer work without clipping", async ({
    browser,
  }) => {
    const { context, page } = await openMobileTeamPage(browser);

    await expect(visibleMember(page, "member-agent-001")).toBeVisible();
    await page.getByTestId("invite-member-button").click();
    await expect(page.getByTestId("invite-member-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await openTeamMember(page, "member-agent-001");
    await expect(page.getByTestId("team-member-drawer")).toBeVisible();

    await context.close();
  });

  test("read-only API removal is forbidden", async ({ page }) => {
    await loginAs(page, "agent@superchannel.local");
    await page.goto("/team");

    const response = await apiRequest<{ message: string }>(page, {
      method: "DELETE",
      path: "/api/team/members/member-agent-002",
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Only Owners and Admins can manage team members.");
  });
});
