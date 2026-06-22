import { expect, test } from "@playwright/test";

test.describe("login", () => {
  test("successful login redirects to inbox", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email address").fill("admin@superchannel.local");
    await page.getByLabel("Password").fill("SuperChannel123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/inbox$/);
    await expect(
      page.getByRole("heading", { name: "Welcome, SuperChannel Admin" }),
    ).toBeVisible();
    await expect(page.getByText("admin@superchannel.local")).toBeVisible();
  });

  test("invalid credentials show an error", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email address").fill("admin@superchannel.local");
    await page.getByLabel("Password").fill("WrongPassword!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("empty and invalid fields are validated in the browser", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText("Please enter your email address"),
    ).toBeVisible();
    await expect(page.getByText("Please enter your password")).toBeVisible();

    await page.getByLabel("Email address").fill("not-an-email");
    await page.getByLabel("Password").fill("SuperChannel123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText("Please enter a valid email address"),
    ).toBeVisible();
  });

  test("password visibility can be toggled", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.getByLabel("Password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("loading state prevents duplicate submission", async ({ page }) => {
    let loginRequests = 0;

    await page.route("**/api/auth/login", async (route) => {
      loginRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto("/login");

    await page.getByLabel("Email address").fill("admin@superchannel.local");
    await page.getByLabel("Password").fill("SuperChannel123!");

    const submitButton = page.getByRole("button", { name: "Sign in" });
    await submitButton.click();

    await expect(
      page.getByRole("button", { name: "Signing in..." }),
    ).toBeDisabled();

    await expect(page).toHaveURL(/\/inbox$/);
    expect(loginRequests).toBe(1);
  });

  test("forgot password shows mock feedback", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Forgot password?" }).click();

    await expect(
      page.getByText(
        "Password reset is unavailable in the mock environment. Use the demo credentials provided in the spec.",
      ),
    ).toBeVisible();
  });
});
