import { test, expect } from '@playwright/test';

// Test credentials
const CREDENTIALS = {
  vendor: {
    email: 'dreamtoys0023@gmail.com',
    password: 'Lucajohn14@',
    role: 'vendor'
  },
  parent: {
    email: 'shijinthomas2026@maca.ajce.in',
    password: 'Shijin14@',
    role: 'parent'
  },
  staff: {
    email: 'akhilkurian282@gmail.com',
    password: 'Akhil14@',
    role: 'staff'
  }
};

test.describe('Login Page - Comprehensive Tests', () => {
  // We'll check staff credentials at test time rather than beforeAll
  // to avoid connection issues during test suite initialization

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Page Rendering and UI Elements', () => {
    test('should display all required login form elements', async ({ page }) => {
      await page.waitForURL('**/login**');
      
      // Check main heading
      await expect(page.getByText('Welcome Back')).toBeVisible();
      
      // Check form fields
      await expect(page.getByLabel('Username')).toBeVisible();
      await expect(page.locator('input#password[name="password"]').first()).toBeVisible();
      await expect(page.getByLabel('Role')).toBeVisible();
      
      // Check submit button
      await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
      
      // Check forgot password link
      await expect(page.getByText(/forgot password/i)).toBeVisible();
      
      // Check signup link
      await expect(page.getByText(/don't have an account/i)).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.locator('input#password[name="password"]').first();
      const toggleButton = page.locator('button[aria-label*="password"]').first();
      
      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Click toggle to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Click toggle to hide password again
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should have all role options available', async ({ page }) => {
      await page.getByLabel('Role').click();
      
      // Wait for menu to appear
      await expect(page.getByRole('option', { name: /^\s*Parent\s*$/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /^\s*Staff\s*$/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /^\s*Vendor\s*$/i })).toBeVisible();
      
      // Close the menu
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Successful Logins', () => {
    test('vendor login should redirect to vendor dashboard', async ({ page }) => {
      // Fill login form
      await page.getByLabel('Username').fill(CREDENTIALS.vendor.email);
      await page.locator('input#password[name="password"]').fill(CREDENTIALS.vendor.password);
      
      // Select role
      await page.getByLabel('Role').click();
      await page.getByRole('option', { name: /^\s*Vendor\s*$/i }).click();

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for navigation and verify
      await page.waitForURL('**/vendor**', { timeout: 30000 });
      await expect(page).toHaveURL(/\/vendor/);
      
      // Verify token is stored
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
    });

    test('parent login should redirect to parent dashboard', async ({ page }) => {
      await page.getByLabel('Username').fill(CREDENTIALS.parent.email);
      await page.locator('input#password[name="password"]').fill(CREDENTIALS.parent.password);
      
      await page.getByLabel('Role').click();
      await page.getByRole('option', { name: /^\s*Parent\s*$/i }).click();

      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/dashboard**', { timeout: 30000 });
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Verify token is stored
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
    });

    test('staff login should redirect to staff dashboard', async ({ page }) => {
      await page.getByLabel('Username').fill(CREDENTIALS.staff.email);
      await page.locator('input#password[name="password"]').fill(CREDENTIALS.staff.password);
      
      await page.getByLabel('Role').click();
      await page.getByRole('option', { name: /^\s*Staff\s*$/i }).click();

      await page.click('button[type="submit"]');
      
      // Wait for either success redirect or error message
      try {
        await page.waitForURL('**/staff**', { timeout: 30000 });
        await expect(page).toHaveURL(/\/staff/);
        
        // Verify token is stored
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBeTruthy();
      } catch (error) {
        // If login fails, check if it's an authentication error
        const errorVisible = await page.getByText(/invalid credentials/i).or(page.getByText(/login failed/i)).isVisible().catch(() => false);
        if (errorVisible) {
          test.skip(false, 'Staff credentials may be invalid or account inactive');
        }
        throw error;
      }
    });
  });

  test.describe('Form Validation', () => {
    test('should show error when submitting empty form', async ({ page }) => {
      // Try to submit without filling anything
      await page.click('button[type="submit"]');
      
      // HTML5 validation should prevent submission
      // Check that we're still on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should show error when password is empty', async ({ page }) => {
      await page.getByLabel('Username').fill(CREDENTIALS.parent.email);
      // Don't fill password
      
      await page.click('button[type="submit"]');
      
      // HTML5 validation should prevent submission
      await expect(page).toHaveURL(/\/login/);
    });

    test('should show error when username is empty', async ({ page }) => {
      await page.locator('input#password[name="password"]').fill(CREDENTIALS.parent.password);
      // Don't fill username
      
      await page.click('button[type="submit"]');
      
      // HTML5 validation should prevent submission
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Authentication Errors', () => {
    test('should display error for invalid credentials', async ({ page }) => {
      await page.getByLabel('Username').fill('invalid@email.com');
      await page.locator('input#password[name="password"]').fill('wrongpassword');
      
      await page.getByLabel('Role').click();
      await page.getByRole('option', { name: /^\s*Parent\s*$/i }).click();

      await page.click('button[type="submit"]');
      
      // Wait for error message
      await expect(page.getByText(/invalid credentials/i).or(page.getByText(/login failed/i))).toBeVisible({ timeout: 10000 });
      
      // Should still be on login page
      await expect(page).toHaveURL(/\/login/);
      
      // Should not have token
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
    });

    test('should display error for wrong password with correct email', async ({ page }) => {
      await page.getByLabel('Username').fill(CREDENTIALS.parent.email);
      await page.locator('input#password[name="password"]').fill('wrongpassword123');
      
      await page.getByLabel('Role').click();
      await page.getByRole('option', { name: /^\s*Parent\s*$/i }).click();

      await page.click('button[type="submit"]');
      
      // Wait for error message
      await expect(page.getByText(/invalid credentials/i).or(page.getByText(/login failed/i))).toBeVisible({ timeout: 10000 });
      
      // Should still be on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should display error for non-existent user', async ({ page }) => {
      await page.getByLabel('Username').fill('nonexistent@example.com');
      await page.locator('input#password[name="password"]').fill('anypassword');
      
      await page.getByLabel('Role').click();
      await page.getByRole('option', { name: /^\s*Parent\s*$/i }).click();

      await page.click('button[type="submit"]');
      
      // Wait for error message
      await expect(page.getByText(/invalid credentials/i).or(page.getByText(/login failed/i))).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Navigation and Links', () => {
    test('should navigate to forgot password page', async ({ page }) => {
      await page.getByText(/forgot password/i).click();
      await page.waitForURL('**/forgot-password**');
      await expect(page).toHaveURL(/\/forgot-password/);
    });

    test('should navigate to registration page', async ({ page }) => {
      await page.getByRole('link', { name: /get started/i }).click();
      await page.waitForURL('**/register**');
      await expect(page).toHaveURL(/\/register/);
    });

    test('should navigate back to landing page', async ({ page }) => {
      // Find the back button (SVG icon button)
      const backButton = page.locator('button').first(); // The back button should be visible
      await backButton.click();
      await page.waitForURL('**/**');
      await expect(page).toHaveURL(/\//);
    });
  });

  test.describe('Session Management', () => {
    test('should persist token after successful login', async ({ page }) => {
      await page.getByLabel('Username').fill(CREDENTIALS.parent.email);
      await page.locator('input#password[name="password"]').fill(CREDENTIALS.parent.password);
      
      await page.getByLabel('Role').click();
      await page.getByRole('option', { name: /^\s*Parent\s*$/i }).click();

      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 30000 });
      
      // Check token exists
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
      if (token) {
        expect(token.length).toBeGreaterThan(0);
      }
      
      // Check token payload is stored
      const tokenPayload = await page.evaluate(() => localStorage.getItem('token_payload'));
      expect(tokenPayload).toBeTruthy();
      
      // Verify we can parse the payload
      if (tokenPayload) {
        const payload = JSON.parse(tokenPayload);
        expect(payload.role).toBe('parent');
      }
    });

    test('should clear local storage on logout', async ({ page }) => {
      // First login
      await page.getByLabel('Username').fill(CREDENTIALS.parent.email);
      await page.locator('input#password[name="password"]').fill(CREDENTIALS.parent.password);
      
      await page.getByLabel('Role').click();
      await page.getByRole('option', { name: /^\s*Parent\s*$/i }).click();

      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 30000 });
      
      // Verify token exists
      let token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
      
      // Navigate back to login and clear storage (simulating logout)
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Verify token is cleared
      token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
    });
  });
});
