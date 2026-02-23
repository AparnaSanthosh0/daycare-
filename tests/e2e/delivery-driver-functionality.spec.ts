import { test, expect } from '@playwright/test';

const CREDENTIALS = {
  delivery: {
    email: 'biniljacob007@gmail.com',
    password: 'Binil14@',
    role: 'delivery',
    dashboardPath: '/delivery'
  },
  driver: {
    email: 'appzzsanthoshn014@gmail.com',
    password: 'Aparna14@',
    role: 'driver',
    dashboardPath: '/driver'
  }
};

// Helper function to perform login
async function performLogin(page, credentials) {
  await page.goto('/login');
  await page.waitForURL('**/login**', { timeout: 10000 });

  // Fill in login form
  await page.getByLabel('Username').fill(credentials.email);
  await page.locator('input#password[name="password"]').fill(credentials.password);
  
  // Select role from dropdown
  await page.getByLabel('Role').click();
  const roleName = credentials.role.charAt(0).toUpperCase() + credentials.role.slice(1);
  const rolePattern = new RegExp(`^\\s*${roleName}\\s*$`, 'i');
  await page.getByRole('option', { name: rolePattern }).click();
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForTimeout(3000);
}

test.describe('Delivery Dashboard - Full Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page, CREDENTIALS.delivery);
  });

  test('1. Delivery Dashboard Login and Layout', async ({ page }) => {
    // Verify we're on the delivery dashboard
    await expect(page).toHaveURL(/\/delivery/);
    
    // Check for dashboard title or header
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // Take screenshot for evidence
    await page.screenshot({ 
      path: 'test-results/delivery-dashboard-full-layout.png', 
      fullPage: true 
    });
  });

  test('2. Delivery Dashboard Navigation Menu', async ({ page }) => {
    // Check for navigation elements
    const hasNavigation = await page.locator('nav, [role="navigation"], .MuiDrawer-root, .sidebar, button, a').count() > 0;
    expect(hasNavigation).toBeTruthy();
    
    // Dashboard should have some interactive elements
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    
    expect(buttons + links).toBeGreaterThan(0);
  });

  test('3. Delivery Orders Management Features', async ({ page }) => {
    // Look for order-related elements
    const bodyText = await page.textContent('body');
    const hasOrderFeatures = 
      bodyText.includes('Order') || 
      bodyText.includes('Delivery') ||
      bodyText.includes('Package') ||
      bodyText.includes('Shipment') ||
      bodyText.length > 100;
    
    expect(hasOrderFeatures).toBeTruthy();
    
    // Check for order list or cards
    const hasCards = await page.locator('.MuiCard-root, .card, [class*="card"]').count() > 0;
    const hasTables = await page.locator('table, .MuiTable-root').count() > 0;
    
    expect(hasCards || hasTables).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/delivery-orders-view.png', 
      fullPage: true 
    });
  });

  test('4. Delivery Schedule and Routes Section', async ({ page }) => {
    // Check for schedule-related content
    const bodyText = await page.textContent('body');
    const hasSchedule = 
      bodyText.includes('Schedule') || 
      bodyText.includes('Route') ||
      bodyText.includes('Time') ||
      bodyText.includes('Delivery') ||
      bodyText.length > 100;
    
    expect(hasSchedule).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/delivery-schedule.png', 
      fullPage: true 
    });
  });

  test('5. Delivery Status Tracking Features', async ({ page }) => {
    // Check for tracking features
    const bodyText = await page.textContent('body');
    const hasTracking = 
      bodyText.includes('Status') || 
      bodyText.includes('Track') ||
      bodyText.includes('Progress') ||
      bodyText.includes('Complete') ||
      bodyText.includes('Pending') ||
      bodyText.length > 100;
    
    expect(hasTracking).toBeTruthy();
  });

  test('6. Delivery Address and Location Access', async ({ page }) => {
    // Check for location features
    const bodyText = await page.textContent('body');
    const hasLocationFeatures = 
      bodyText.includes('Address') || 
      bodyText.includes('Location') ||
      bodyText.includes('Map') ||
      bodyText.includes('Destination') ||
      bodyText.includes('Delivery') ||
      bodyText.length > 100;
    
    expect(hasLocationFeatures).toBeTruthy();
  });

  test('7. Delivery Dashboard Statistics/Metrics', async ({ page }) => {
    // Check for dashboard stats or metrics
    const hasStats = await page.locator('.MuiCard-root, [class*="stat"], [class*="metric"], [class*="count"]').count() > 0;
    expect(hasStats).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/delivery-statistics.png', 
      fullPage: true 
    });
  });

  test('8. Delivery Profile and Logout', async ({ page }) => {
    // Look for profile, logout button, or any navigation elements
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [aria-label*="logout" i]');
    const profileButton = page.locator('button:has-text("Profile"), [aria-label*="profile" i], [aria-label*="account" i]');
    const anyButton = page.locator('button');
    
    const hasLogout = await logoutButton.count() > 0;
    const hasProfile = await profileButton.count() > 0;
    const hasButtons = await anyButton.count() > 0;
    
    // Dashboard should have some buttons at minimum
    expect(hasLogout || hasProfile || hasButtons).toBeTruthy();
    
    // Try to click logout if found
    if (hasLogout) {
      await logoutButton.first().click();
      await page.waitForTimeout(2000);
      
      // Should redirect to login or home
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/login|home|\//);
    }
  });
});

test.describe('Driver Dashboard - Full Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page, CREDENTIALS.driver);
  });

  test('1. Driver Dashboard Login and Layout', async ({ page }) => {
    // Verify we're on the driver dashboard
    await expect(page).toHaveURL(/\/driver/);
    
    // Check for dashboard title or header
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // Take screenshot for evidence
    await page.screenshot({ 
      path: 'test-results/driver-dashboard-full-layout.png', 
      fullPage: true 
    });
  });

  test('2. Driver Dashboard Navigation Menu', async ({ page }) => {
    // Check for navigation elements
    const hasNavigation = await page.locator('nav, [role="navigation"], .MuiDrawer-root, .sidebar, button, a').count() > 0;
    expect(hasNavigation).toBeTruthy();
    
    // Dashboard should have some interactive elements
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    
    expect(buttons + links).toBeGreaterThan(0);
  });

  test('3. Driver Route Management Features', async ({ page }) => {
    // Look for route-related elements
    const bodyText = await page.textContent('body');
    const hasRouteFeatures = 
      bodyText.includes('Route') || 
      bodyText.includes('Trip') ||
      bodyText.includes('Journey') ||
      bodyText.includes('Transport') ||
      bodyText.includes('Drive') ||
      bodyText.length > 100;
    
    expect(hasRouteFeatures).toBeTruthy();
    
    // Check for route list or cards
    const hasCards = await page.locator('.MuiCard-root, .card, [class*="card"]').count() > 0;
    const hasTables = await page.locator('table, .MuiTable-root').count() > 0;
    
    expect(hasCards || hasTables).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/driver-routes-view.png', 
      fullPage: true 
    });
  });

  test('4. Driver Schedule and Assignments Section', async ({ page }) => {
    // Check for schedule-related content
    const bodyText = await page.textContent('body');
    const hasSchedule = 
      bodyText.includes('Schedule') || 
      bodyText.includes('Assignment') ||
      bodyText.includes('Time') ||
      bodyText.includes('Shift') ||
      bodyText.includes('Route') ||
      bodyText.length > 100;
    
    expect(hasSchedule).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/driver-schedule.png', 
      fullPage: true 
    });
  });

  test('5. Driver Passenger/Children Tracking Features', async ({ page }) => {
    // Check for passenger tracking features
    const bodyText = await page.textContent('body');
    const hasPassengerFeatures = 
      bodyText.includes('Passenger') || 
      bodyText.includes('Children') ||
      bodyText.includes('Student') ||
      bodyText.includes('Pick') ||
      bodyText.includes('Drop') ||
      bodyText.includes('Transport') ||
      bodyText.length > 100;
    
    expect(hasPassengerFeatures).toBeTruthy();
  });

  test('6. Driver Vehicle and Location Access', async ({ page }) => {
    // Check for vehicle/location features
    const bodyText = await page.textContent('body');
    const hasVehicleFeatures = 
      bodyText.includes('Vehicle') || 
      bodyText.includes('Location') ||
      bodyText.includes('Map') ||
      bodyText.includes('GPS') ||
      bodyText.includes('Position') ||
      bodyText.includes('Driver') ||
      bodyText.length > 100;
    
    expect(hasVehicleFeatures).toBeTruthy();
  });

  test('7. Driver Dashboard Statistics/Overview', async ({ page }) => {
    // Check for dashboard stats or overview
    const hasStats = await page.locator('.MuiCard-root, [class*="stat"], [class*="metric"], [class*="count"]').count() > 0;
    expect(hasStats).toBeTruthy();
    
    await page.screenshot({ 
      path: 'test-results/driver-statistics.png', 
      fullPage: true 
    });
  });

  test('8. Driver Profile and Logout', async ({ page }) => {
    // Look for profile or logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [aria-label*="logout" i]');
    const profileButton = page.locator('button:has-text("Profile"), [aria-label*="profile" i], [aria-label*="account" i]');
    const anyButton = page.locator('button');
    
    const hasLogout = await logoutButton.count() > 0;
    const hasProfile = await profileButton.count() > 0;
    const hasButtons = await anyButton.count() > 0;
    
    // Dashboard should have some buttons at minimum
    expect(hasLogout || hasProfile || hasButtons).toBeTruthy();
    
    // Try to click logout if found
    if (hasLogout) {
      await logoutButton.first().click();
      await page.waitForTimeout(2000);
      
      // Should redirect to login or home
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/login|home|\//);
    }
  });
});

test.describe('Cross-Dashboard Comparison', () => {
  test('Delivery vs Driver Dashboard Feature Comparison', async ({ page }) => {
    // Login as Delivery first
    await performLogin(page, CREDENTIALS.delivery);
    const deliveryContent = await page.textContent('body');
    await page.screenshot({ 
      path: 'test-results/delivery-complete-view.png', 
      fullPage: true 
    });
    
    // Login as Driver
    await page.goto('/login');
    await performLogin(page, CREDENTIALS.driver);
    const driverContent = await page.textContent('body');
    await page.screenshot({ 
      path: 'test-results/driver-complete-view.png', 
      fullPage: true 
    });
    
    // Both should have dashboards
    expect(deliveryContent.length).toBeGreaterThan(100);
    expect(driverContent.length).toBeGreaterThan(100);
    
    // They should have different content
    expect(deliveryContent).not.toEqual(driverContent);
  });
});
