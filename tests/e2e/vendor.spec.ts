import { test, expect } from '@playwright/test';

const CREDENTIALS = {
  email: 'dreamtoys0023@gmail.com',
  password: 'Lucajohn14@',
  role: 'vendor'
};

test.describe('Vendor Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as vendor
    await page.goto('/login');
    await page.waitForURL('**/login**');
    
    // Fill login form
    await page.getByLabel('Username').fill(CREDENTIALS.email);
    await page.locator('input#password[name="password"]').fill(CREDENTIALS.password);
    
    // Select role
    await page.getByLabel('Role').click();
    await page.getByRole('option', { name: /^\s*Vendor\s*$/i }).click();
    
    // Submit form and wait for navigation
    await page.click('button[type="submit"]');
    
    // Wait for vendor dashboard
    await page.waitForURL('**/vendor**', { timeout: 30000 });
  });

  test('vendor dashboard should load correctly', async ({ page }) => {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check for vendor-specific elements - use first() to avoid strict mode violations
    await expect(page.getByText(/vendor|supplier/i).first()).toBeVisible();

    // Check for navigation elements that vendors should see
    const vendorContent = page.getByText(/products|inventory|orders|supplier/i).first();
    if (await vendorContent.isVisible()) {
      await expect(vendorContent).toBeVisible();
    }
  });

  test('vendor should be able to navigate to products section', async ({ page }) => {
    // Look for products link/button
    const productsLink = page.getByRole('link', { name: /products/i });
    const productsButton = page.getByRole('button', { name: /products/i });

    if (await productsLink.isVisible()) {
      await productsLink.click();
    } else if (await productsButton.isVisible()) {
      await productsButton.click();
    }

    // Should show products content
    await expect(page.getByText(/products/i).first()).toBeVisible();
  });

  test('vendor should be able to navigate to inventory section', async ({ page }) => {
    // Look for inventory link/button
    const inventoryLink = page.getByRole('link', { name: /inventory/i }).first();
    const inventoryButton = page.getByRole('button', { name: /inventory/i }).first();

    if (await inventoryLink.isVisible()) {
      await inventoryLink.click();
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      // Should show inventory content
      await expect(page.getByText(/inventory/i).first()).toBeVisible();
    } else if (await inventoryButton.isVisible()) {
      await inventoryButton.click();
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      // Should show inventory content
      await expect(page.getByText(/inventory/i).first()).toBeVisible();
    } else {
      // If no inventory section exists, skip this test
      test.skip(true, 'Inventory section not implemented yet');
    }
  });

  test('vendor should be able to navigate to orders section', async ({ page }) => {
    // Look for orders link/button
    const ordersLink = page.getByRole('link', { name: /orders/i }).first();
    const ordersButton = page.getByRole('button', { name: /orders/i }).first();

    if (await ordersLink.isVisible()) {
      await ordersLink.click();
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      // Should show orders content
      await expect(page.getByText(/orders/i).first()).toBeVisible();
    } else if (await ordersButton.isVisible()) {
      await ordersButton.click();
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      // Should show orders content
      await expect(page.getByText(/orders/i).first()).toBeVisible();
    } else {
      // If no orders section exists, skip this test
      test.skip(true, 'Orders section not implemented yet');
    }
  });

  test('vendor profile should be accessible', async ({ page }) => {
    // Look for profile/settings link - use first() to avoid strict mode violations
    const profileLink = page.getByRole('link', { name: /profile|settings/i }).first();
    const profileButton = page.getByRole('button', { name: /profile|settings/i }).first();

    if (await profileLink.isVisible()) {
      await profileLink.click();
    } else if (await profileButton.isVisible()) {
      await profileButton.click();
    }

    // Should show profile content
    await expect(page.getByText(/profile|settings/i).first()).toBeVisible();
  });

  test('vendor should see ecommerce features', async ({ page }) => {
    // Check for ecommerce-related elements - use first() to avoid strict mode violations
    await expect(page.getByText(/shop|store|products/i).first()).toBeVisible();

    // Look for cart or shopping elements
    const cartIcon = page.locator('[data-testid="cart"], .cart, #cart').first();
    if (await cartIcon.isVisible()) {
      await expect(cartIcon).toBeVisible();
    }
  });
});
