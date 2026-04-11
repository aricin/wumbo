import { expect, test } from "@playwright/test";

test("renders the auth foundation landing page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Prove Cognito cleanly first, then build the real product with confidence.",
    }),
  ).toBeVisible();

  await expect(page.getByText("Create smoke user")).toBeVisible();
  await expect(page.getByText("Sign in with Cognito")).toBeVisible();
});
