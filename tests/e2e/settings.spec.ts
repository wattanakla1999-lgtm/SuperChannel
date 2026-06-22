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

async function apiRequest<T>(
  page: Page,
  input: {
    body?: unknown;
    method: "PATCH" | "POST";
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

async function openMobileSettingsPage(
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
  await page.goto("/settings");

  return { context, page };
}

test.describe("settings", () => {
  test("unauthenticated access redirects to /login", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("navigation and active sidebar state work", async ({ page }) => {
    await loginAs(page);
    await page.getByRole("link", { name: "Settings" }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId("settings-page")).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("all Settings sections render and switch correctly", async ({ page }) => {
    await loginAs(page);
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Workspace Profile" })).toBeVisible();
    await page.getByRole("button", { name: "Business Hours Coverage windows, holidays, and after-hours message handling." }).click();
    await expect(page.getByRole("heading", { name: "Business Hours" })).toBeVisible();
    await page.getByRole("button", { name: "Inbox Preferences Default ownership, status, and closeout preferences for Inbox." }).click();
    await expect(page.getByRole("heading", { name: "Inbox Preferences" })).toBeVisible();
    await page.getByRole("button", { name: "Saved Replies Reusable shortcuts shared with the Inbox composer." }).click();
    await expect(page.getByTestId("saved-reply-list")).toBeVisible();
    await page.getByRole("button", { name: "Notifications Alert routing for messages, mentions, publishing, and integrations." }).click();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await page.getByRole("button", { name: "Security Session visibility and mock security controls." }).click();
    await expect(page.getByText("Two-factor authentication", { exact: true })).toBeVisible();
  });

  test("Workspace Profile and Business Hours validation work", async ({ page }) => {
    await loginAs(page);
    await page.goto("/settings");

    await page.getByLabel("Business name").fill("");
    await page.getByTestId("save-settings-button").click();
    await expect(page.getByText("Business name is required.")).toBeVisible();

    await page.getByLabel("Business name").fill("SuperChannel Demo Workspace");
    await page.getByRole("button", { name: "Business Hours Coverage windows, holidays, and after-hours message handling." }).click();
    await page.getByLabel("Closes").first().fill("08:00");
    await page.getByTestId("save-settings-button").click();
    await expect(page.getByText("Closing time must be after opening time.")).toBeVisible();
  });

  test("saving and resetting settings update mock state correctly", async ({ page }) => {
    await loginAs(page);
    await page.goto("/settings");

    await page.getByLabel("Business name").fill("SuperChannel Night Shift");
    await page.getByLabel("Workspace email").fill("night.ops@superchannel.local");
    await page.getByTestId("save-settings-button").click();
    await expect(page.getByText("Settings saved")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Business name")).toHaveValue("SuperChannel Night Shift");
    await expect(page.getByLabel("Workspace email")).toHaveValue("night.ops@superchannel.local");

    await page.getByLabel("Business name").fill("Temporary Draft Name");
    await page.getByTestId("reset-settings-button").click();
    await page.getByRole("button", { name: "Reset section" }).click();
    await expect(page.getByText("Unsaved changes cleared")).toBeVisible();
    await expect(page.getByLabel("Business name")).toHaveValue("SuperChannel Night Shift");
  });

  test("unsaved-change warning prevents accidental loss", async ({ page }) => {
    await loginAs(page);
    await page.goto("/settings");

    await page.getByLabel("Business name").fill("Unsaved Workspace Name");
    await page.getByRole("button", { name: "Notifications Alert routing for messages, mentions, publishing, and integrations." }).click();

    await expect(page.getByText("Discard unsaved changes?")).toBeVisible();
    await page.getByRole("button", { name: "Stay here" }).click();
    await expect(page.getByRole("heading", { name: "Workspace Profile" })).toBeVisible();
    await expect(page.getByLabel("Business name")).toHaveValue("Unsaved Workspace Name");

    await page.getByRole("button", { name: "Notifications Alert routing for messages, mentions, publishing, and integrations." }).click();
    await page.getByRole("button", { name: "Discard changes" }).click();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  });

  test("Saved Reply create, edit, search, and delete work", async ({ page }) => {
    await loginAs(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "Saved Replies Reusable shortcuts shared with the Inbox composer." }).click();
    await page.getByTestId("add-saved-reply-button").click();
    await expect(page.getByTestId("saved-reply-dialog")).toBeVisible();

    await page.getByLabel("Title").fill("Thai holiday coverage");
    await page.getByLabel("Category").fill("Support");
    await page.getByLabel("Shortcut").fill("/holiday");
    await page.getByLabel("Message").fill(
      "Thanks for checking in. Holiday coverage is active and I’ll confirm the next response window now.",
    );
    await page.getByRole("button", { name: "Create Saved Reply" }).click();

    await expect(page.getByText("Saved Reply created")).toBeVisible();
    await page.getByPlaceholder("Search by title, shortcut, category, or message").fill("/holiday");
    await expect(page.getByTestId("saved-reply-list")).toContainText("Thai holiday coverage");

    await page.getByRole("button", { name: "Edit" }).first().click();
    await page.getByLabel("Title").fill("Thai holiday support");
    await page.getByRole("button", { name: "Save Saved Reply" }).click();
    await expect(page.getByText("Saved Reply updated")).toBeVisible();
    await expect(page.getByTestId("saved-reply-list")).toContainText("Thai holiday support");

    await page.getByRole("button", { name: "Delete" }).first().click();
    await page.getByRole("button", { name: "Delete" }).last().click();
    await expect(page.getByText("Saved Reply deleted")).toBeVisible();
    await expect(page.getByText("Thai holiday support")).toHaveCount(0);
  });

  test("Saved Replies appear in the Inbox composer", async ({ page }) => {
    await loginAs(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "Saved Replies Reusable shortcuts shared with the Inbox composer." }).click();
    await page.getByTestId("add-saved-reply-button").click();
    await page.getByLabel("Title").fill("Escalation bridge");
    await page.getByLabel("Category").fill("Ops");
    await page.getByLabel("Shortcut").fill("/bridge");
    await page.getByLabel("Message").fill(
      "I’m opening the escalation bridge now and will share the mitigation summary in this thread.",
    );
    await page.getByRole("button", { name: "Create Saved Reply" }).click();
    await expect(page.getByText("Saved Reply created")).toBeVisible();

    await page.goto("/inbox");
    await page.getByTestId("conversation-item-conv-line-001").click();
    await page.getByRole("button", { name: "Saved replies" }).click();
    await page.getByPlaceholder("Search saved replies").fill("/bridge");
    await page.getByRole("button", { name: /Escalation bridge/ }).click();

    await expect(page.getByTestId("message-input")).toHaveValue(
      "I’m opening the escalation bridge now and will share the mitigation summary in this thread.",
    );
  });

  test("Notification toggles persist in mock state", async ({ page }) => {
    await loginAs(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "Notifications Alert routing for messages, mentions, publishing, and integrations." }).click();
    await page.getByLabel("New message").uncheck();
    await page.getByLabel("Email").uncheck();
    await page.getByTestId("save-settings-button").click();
    await expect(page.getByText("Settings saved")).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Notifications Alert routing for messages, mentions, publishing, and integrations." }).click();
    await expect(page.getByLabel("New message")).not.toBeChecked();
    await expect(page.getByLabel("Email")).not.toBeChecked();
  });

  test("read-only roles cannot update settings through the UI or mock API", async ({
    page,
  }) => {
    await loginAs(page, "supervisor@superchannel.local");
    await page.goto("/settings");

    await expect(page.getByText("read-only access", { exact: false })).toBeVisible();
    await expect(page.getByTestId("save-settings-button")).toHaveCount(0);
    await page.getByRole("button", { name: "Saved Replies Reusable shortcuts shared with the Inbox composer." }).click();
    await expect(page.getByTestId("add-saved-reply-button")).toBeDisabled();

    const sectionResponse = await apiRequest<{ message: string }>(page, {
      body: {
        assignment: false,
        desktop: true,
        email: true,
        expiredConnection: true,
        failedPublishing: true,
        mention: true,
        newMessage: true,
        sound: true,
      },
      method: "PATCH",
      path: "/api/settings/notifications",
    });

    expect(sectionResponse.status).toBe(403);
    expect(sectionResponse.body.message).toBe(
      "Only Owners and Admins can update workspace settings.",
    );

    const replyResponse = await apiRequest<{ message: string }>(page, {
      body: {
        category: "General",
        message: "Nope",
        shortcut: "/nope",
        title: "Nope",
      },
      method: "POST",
      path: "/api/settings/saved-replies",
    });

    expect(replyResponse.status).toBe(403);
    expect(replyResponse.body.message).toBe(
      "Only Owners and Admins can update workspace settings.",
    );
  });

  test("mobile navigation, forms, and dialogs work without clipping", async ({ browser }) => {
    const { context, page } = await openMobileSettingsPage(browser);

    await expect(page.getByTestId("settings-navigation")).toBeVisible();
    await page.getByRole("button", { name: "Saved Replies Reusable shortcuts shared with the Inbox composer." }).click();
    await page.getByTestId("add-saved-reply-button").click();
    await expect(page.getByTestId("saved-reply-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    await page.getByRole("button", { name: "Business Hours Coverage windows, holidays, and after-hours message handling." }).click();
    await expect(page.getByRole("heading", { name: "Business Hours" })).toBeVisible();

    await context.close();
  });
});
