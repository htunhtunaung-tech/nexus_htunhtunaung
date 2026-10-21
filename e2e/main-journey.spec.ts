import { expect, test, type Page } from "@playwright/test";

const email = process.env.TEST_OUTSIDER_EMAIL;
const password = process.env.TEST_OUTSIDER_PASSWORD;

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard");
}

test("landing page shows the headline and sign-up button", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your projects. Your workflow. Your universe." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Launch Your Workspace" })).toHaveAttribute("href", "/signup");
});

test("logged-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test.describe("signed-in journey", () => {
  test.skip(!email || !password, "Add test accounts to .env.test.local");

  test("create a workspace, project and task, then finish the task", async ({ page }) => {
    const stamp = Date.now().toString().slice(-6);
    const workspaceName = `E2E workspace ${stamp}`;
    const projectName = `E2E project ${stamp}`;
    const taskTitle = `E2E task ${stamp}`;

    await logIn(page);

    // Create a workspace and open it
    await page.getByLabel("New workspace").fill(workspaceName);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.getByRole("link", { name: new RegExp(workspaceName) }).click();
    await expect(page.getByRole("heading", { name: new RegExp(workspaceName) })).toBeVisible();

    // Create a project and open it
    await page.getByLabel("Name", { exact: true }).fill(projectName);
    await page.getByRole("button", { name: "Create project" }).click();
    await page.getByRole("link", { name: new RegExp(projectName) }).first().click();
    await page.getByRole("link", { name: "Open task board" }).click();
    await page.waitForURL("**/tasks");

    // Add a task
    await page.getByLabel("Title").fill(taskTitle);
    await page.getByRole("button", { name: "Add task" }).click();
    const card = page.locator("article", { hasText: taskTitle });
    await expect(card).toBeVisible();

    // Move it to Done
    await card.getByLabel("Move task to column").selectOption("done");

    // After a refresh it must still be in Done, which proves it was saved
    await expect(async () => {
      await page.reload();
      await expect(
        page.locator("article", { hasText: taskTitle }).getByLabel("Move task to column")
      ).toHaveValue("done", { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  });

  test("a non-member can't open someone else's workspace", async ({ page }) => {
    await logIn(page);
    // A random id that doesn't belong to this user
    await page.goto("/workspace/00000000-0000-4000-8000-000000000000");

    // The "not found" page shows, and none of the workspace's content does
    await expect(page.getByText(/could not be found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Members/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create project" })).toHaveCount(0);
  });
});