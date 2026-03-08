import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  // We assume the vite dev server runs on port 1420
  await page.goto('http://localhost:1420/');

  // Expect a title to be present in our app
  await expect(page).toHaveTitle(/Tauri \+ React \+ Typescript/);
});

test('app redirects unauthenticated users', async ({ page }) => {
  await page.goto('http://localhost:1420/');

  // Depending on whether profiles exist, it redirects to /setup or /profiles
  // We just check that the router kicked in
  await expect(page).toHaveURL(/http:\/\/localhost:1420\/.+/);
});
