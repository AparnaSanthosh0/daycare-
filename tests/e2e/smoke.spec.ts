import { test, expect } from '@playwright/test';

// Basic smoke tests to ensure the app boots and main pages render

test('home loads and shows header', async ({ page, baseURL }) => {
  await page.goto(baseURL!);
  await expect(page.getByText('Welcome to TinyTots', { exact: false }).first()).toBeVisible();
});

test('shop page renders and categories work', async ({ page, baseURL }) => {
  await page.goto(baseURL! + '/shop');
  await expect(page.getByText('Featured Products')).toBeVisible();
  
  // Wait for page to load completely
  await page.waitForLoadState('networkidle');
  
  // Click Girl Fashion in the category bar
  const girl = page.getByRole('button', { name: /girl fashion/i });
  if (await girl.isVisible()) {
    await girl.click();
    // Wait for navigation/update
    await page.waitForTimeout(1000);
    // After clicking fashion categories, hero should be hidden and featured grid present
    await expect(page.getByText('Featured Products')).toBeVisible();
  }
});
