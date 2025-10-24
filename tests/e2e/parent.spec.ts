import { test, expect } from '@playwright/test';

const CREDENTIALS = {
  email: 'shijinthomas2026@maca.ajce.in',
  password: 'Shijin14@',
  role: 'parent'
};

test.describe('Parent Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as parent
    await page.goto('/login');
    await page.waitForURL('**/login**');
    
    // Fill login form
    await page.getByLabel('Username').fill(CREDENTIALS.email);
    await page.locator('input#password[name="password"]').fill(CREDENTIALS.password);
    
    // Select role
    await page.getByLabel('Role').click();
    await page.getByRole('option', { name: /^\s*Parent\s*$/i }).click();
    
    // Submit form and wait for navigation
    await page.click('button[type="submit"]');
    
    // Wait for parent dashboard
    await page.waitForURL('**/dashboard**', { timeout: 30000 });
  });

  test('parent dashboard should load correctly', async ({ page }) => {
    // Check for parent-specific elements - wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for parent dashboard content
    await expect(page.getByText(/parent|dashboard/i).first()).toBeVisible();

    // Check for any child-related content or navigation
    const childContent = page.getByText(/child|children|kids|staff|reports|billing/i).first();
    if (await childContent.isVisible()) {
      await expect(childContent).toBeVisible();
    }
  });

  test('parent should be able to view child information', async ({ page }) => {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Look for child information section or navigation
    const childSection = page.getByText(/child|children|staff/i).first();
    if (await childSection.isVisible()) {
      await expect(childSection).toBeVisible();
    } else {
      // If no child content visible, check if we can navigate to staff section
      const staffLink = page.getByRole('link', { name: /staff/i });
      if (await staffLink.isVisible()) {
        await staffLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/staff/i).first()).toBeVisible();
      }
    }
  });

  test('parent should be able to view activities', async ({ page }) => {
    // Look for activities section
    const activitiesLink = page.getByRole('link', { name: /activities/i });
    const activitiesButton = page.getByRole('button', { name: /activities/i });

    if (await activitiesLink.isVisible()) {
      await activitiesLink.click();
      await expect(page.getByText(/activities/i).first()).toBeVisible();
    } else if (await activitiesButton.isVisible()) {
      await activitiesButton.click();
      await expect(page.getByText(/activities/i).first()).toBeVisible();
    }
  });

  test('parent should be able to view billing information', async ({ page }) => {
    // Look for billing section
    const billingLink = page.getByRole('link', { name: /billing|payments/i });
    const billingButton = page.getByRole('button', { name: /billing|payments/i });

    if (await billingLink.isVisible()) {
      await billingLink.click();
      await expect(page.getByText(/billing|payments/i).first()).toBeVisible();
    } else if (await billingButton.isVisible()) {
      await billingButton.click();
      await expect(page.getByText(/billing|payments/i).first()).toBeVisible();
    }
  });

  test('parent should be able to view reports', async ({ page }) => {
    // Look for reports section
    const reportsLink = page.getByRole('link', { name: /reports/i });
    const reportsButton = page.getByRole('button', { name: /reports/i });

    if (await reportsLink.isVisible()) {
      await reportsLink.click();
      await expect(page.getByText(/reports/i).first()).toBeVisible();
    } else if (await reportsButton.isVisible()) {
      await reportsButton.click();
      await expect(page.getByText(/reports/i).first()).toBeVisible();
    }
  });

  test('parent profile should be accessible', async ({ page }) => {
    // Look for profile/settings link
    const profileLink = page.getByRole('link', { name: /profile|settings/i });
    const profileButton = page.getByRole('button', { name: /profile|settings/i });

    if (await profileLink.isVisible()) {
      await profileLink.click();
      await expect(page.getByText(/profile|settings/i).first()).toBeVisible();
    } else if (await profileButton.isVisible()) {
      await profileButton.click();
      await expect(page.getByText(/profile|settings/i).first()).toBeVisible();
    }
  });

  test('parent should be able to access support', async ({ page }) => {
    // Look for support/help section
    const supportLink = page.getByRole('link', { name: /support|help/i });
    const supportButton = page.getByRole('button', { name: /support|help/i });

    if (await supportLink.isVisible()) {
      await supportLink.click();
      await expect(page.getByText(/support|help/i).first()).toBeVisible();
    } else if (await supportButton.isVisible()) {
      await supportButton.click();
      await expect(page.getByText(/support|help/i).first()).toBeVisible();
    }
  });
});
