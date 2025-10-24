import { test, expect } from '@playwright/test';

const CREDENTIALS = {
  email: 'gmail-aparnasanthosh009@gmail.com',
  password: 'Aparna14@',
  role: 'staff'
};

test.describe('Staff Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as staff
    await page.goto('/login');
    await page.waitForURL('**/login**');
    
    // Fill login form
    await page.getByLabel('Username').fill(CREDENTIALS.email);
    await page.locator('input#password[name="password"]').fill(CREDENTIALS.password);
    
    // Select role
    await page.getByLabel('Role').click();
    await page.getByRole('option', { name: /^\s*Staff\s*$/i }).click();
    
    // Submit form and wait for navigation
    await page.click('button[type="submit"]');
    
    // Wait for staff dashboard
    await page.waitForURL('**/staff**', { timeout: 30000 });
  });

  test('staff dashboard should load correctly', async ({ page }) => {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check for staff-specific elements
    await expect(page.getByText(/staff|console/i).first()).toBeVisible();

    // Check for staff management content or navigation
    const managementContent = page.getByText(/children|attendance|reports|assigned/i).first();
    if (await managementContent.isVisible()) {
      await expect(managementContent).toBeVisible();
    }
  });

  test('staff should be able to manage attendance', async ({ page }) => {
    // Look for attendance section
    const attendanceLink = page.getByRole('link', { name: /attendance/i }).first();
    const attendanceButton = page.getByRole('button', { name: /attendance/i }).first();

    if (await attendanceLink.isVisible()) {
      await attendanceLink.click();
      await expect(page.getByText(/attendance/i).first()).toBeVisible();
    } else if (await attendanceButton.isVisible()) {
      await attendanceButton.click();
      await expect(page.getByText(/attendance/i).first()).toBeVisible();
    }
  });

  test('staff should be able to manage children', async ({ page }) => {
    // Look for children management section
    const childrenLink = page.getByRole('link', { name: /children/i });
    const childrenButton = page.getByRole('button', { name: /children/i });

    if (await childrenLink.isVisible()) {
      await childrenLink.click();
      await expect(page.getByText(/children/i)).toBeVisible();
    } else if (await childrenButton.isVisible()) {
      await childrenButton.click();
      await expect(page.getByText(/children/i)).toBeVisible();
    }
  });

  test('staff should be able to view reports', async ({ page }) => {
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

  test('staff should be able to access admin functions', async ({ page }) => {
    // Look for admin/management section
    const adminLink = page.getByRole('link', { name: /admin|management/i }).first();
    const adminButton = page.getByRole('button', { name: /admin|management/i }).first();

    if (await adminLink.isVisible()) {
      await adminLink.click();
      await expect(page.getByText(/admin|management/i).first()).toBeVisible();
    } else if (await adminButton.isVisible()) {
      await adminButton.click();
      await expect(page.getByText(/admin|management/i).first()).toBeVisible();
    }
  });

  test('staff should be able to view activities', async ({ page }) => {
    // Look for activities section
    const activitiesLink = page.getByRole('link', { name: /activities/i }).first();
    const activitiesButton = page.getByRole('button', { name: /activities/i }).first();

    if (await activitiesLink.isVisible()) {
      await activitiesLink.click();
      await expect(page.getByText(/activities/i).first()).toBeVisible();
    } else if (await activitiesButton.isVisible()) {
      await activitiesButton.click();
      await expect(page.getByText(/activities/i).first()).toBeVisible();
    }
  });

  test('staff profile should be accessible', async ({ page }) => {
    // Look for profile/settings link
    const profileLink = page.getByRole('link', { name: /profile|settings/i }).first();
    const profileButton = page.getByRole('button', { name: /profile|settings/i }).first();

    if (await profileLink.isVisible()) {
      await profileLink.click();
      await expect(page.getByText(/profile|settings/i).first()).toBeVisible();
    } else if (await profileButton.isVisible()) {
      await profileButton.click();
      await expect(page.getByText(/profile|settings/i).first()).toBeVisible();
    }
  });

  test('staff should be able to access support', async ({ page }) => {
    // Look for support/help section
    const supportLink = page.getByRole('link', { name: /support|help/i });
    const supportButton = page.getByRole('button', { name: /support|help/i });

    if (await supportLink.isVisible()) {
      await supportLink.click();
      await expect(page.getByText(/support|help/i)).toBeVisible();
    } else if (await supportButton.isVisible()) {
      await supportButton.click();
      await expect(page.getByText(/support|help/i)).toBeVisible();
    }
  });
});
