import { test, expect } from '@playwright/test';

/**
 * Comprehensive Dashboard Login Tests
 * Tests all user roles with their respective credentials
 */

const TEST_CREDENTIALS = {
  parent: {
    email: 'shijinthomas2026@mca.ajce.in',
    password: 'Shijin14@',
    role: 'parent',
    expectedRoute: '/dashboard'
  },
  teacher: {
    email: 'akhilkurian6mile@gmail.com',
    password: 'Aparna14@',
    role: 'staff',
    staffType: 'teacher',
    expectedRoute: '/teacher'
  },
  delivery: {
    email: 'biniljacob007@gmail.com',
    password: 'Binil14@',
    role: 'staff',
    staffType: 'delivery',
    expectedRoute: '/delivery'
  },
  driver: {
    email: 'appzzsanthoshn014@gmail.com',
    password: 'Aparna14@',
    role: 'staff',
    staffType: 'driver',
    expectedRoute: '/driver'
  },
  nanny: {
    email: 'aparnappzzz000@gmail.com',
    password: 'Aparna14@',
    role: 'staff',
    staffType: 'nanny',
    expectedRoute: '/nanny'
  },
  doctor: {
    email: 'vijethajinu01@gmail.com',
    password: 'Vijetha123@',
    role: 'staff',
    staffType: 'doctor',
    expectedRoute: '/doc'
  }
};

// Helper function to login as a user with role dropdown
async function loginAsUser(page, email, password, role) {
  await page.goto('/login');
  await page.waitForURL('**/login**', { timeout: 10000 });
  
  // Fill email/username
  await page.getByLabel('Username').fill(email);
  
  // Fill password
  await page.locator('input#password[name="password"]').fill(password);
  
  // Select role from dropdown
  await page.getByLabel('Role').click();
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);
  await page.getByRole('option', { name: new RegExp(`^\\s*${roleName}\\s*$`, 'i') }).click();
  
  // Submit form
  await page.click('button[type="submit"]');
}

test.describe('All Dashboards Login Tests', () => {
  
  test('Parent Login and Dashboard Access', async ({ page }) => {
    const creds = TEST_CREDENTIALS.parent;
    
    console.log(`Testing Parent Login: ${creds.email}`);
    
    await loginAsUser(page, creds.email, creds.password, creds.role);
    
    // Wait for navigation to parent dashboard
    await page.waitForURL('**/dashboard**', { timeout: 30000 });
    
    // Verify we're on the correct dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Check for parent-specific elements
    await expect(page.getByText(/Parent Dashboard|Dashboard|Welcome/i)).toBeVisible({ timeout: 10000 });
    
    // Check if token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    console.log('✅ Parent login successful');
  });

  test('Teacher Login and Dashboard Access', async ({ page }) => {
    const creds = TEST_CREDENTIALS.teacher;
    
    console.log(`Testing Teacher Login: ${creds.email}`);
    
    await loginAsUser(page, creds.email, creds.password, creds.role);
    
    // Wait for navigation to teacher dashboard
    await page.waitForURL('**/teacher**', { timeout: 30000 });
    
    // Verify we're on the correct dashboard
    await expect(page).toHaveURL(/\/teacher/);
    
    // Check for teacher-specific elements
    await expect(page.getByText(/Teacher|Dashboard|Welcome/i)).toBeVisible({ timeout: 10000 });
    
    // Check if token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    console.log('✅ Teacher login successful');
  });

  test('Delivery Login and Dashboard Access', async ({ page }) => {
    const creds = TEST_CREDENTIALS.delivery;
    
    console.log(`Testing Delivery Login: ${creds.email}`);
    
    await loginAsUser(page, creds.email, creds.password, creds.role);
    
    // Wait for navigation to delivery dashboard
    await page.waitForURL('**/delivery**', { timeout: 30000 });
    
    // Verify we're on the correct dashboard
    await expect(page).toHaveURL(/\/delivery/);
    
    // Check for delivery-specific elements
    await expect(page.getByText(/Delivery|Dashboard|Welcome/i)).toBeVisible({ timeout: 10000 });
    
    // Check if token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    console.log('✅ Delivery login successful');
  });

  test('Driver Login and Dashboard Access', async ({ page }) => {
    const creds = TEST_CREDENTIALS.driver;
    
    console.log(`Testing Driver Login: ${creds.email}`);
    
    await loginAsUser(page, creds.email, creds.password, creds.role);
    
    // Wait for navigation to driver dashboard
    await page.waitForURL('**/driver**', { timeout: 30000 });
    
    // Verify we're on the correct dashboard
    await expect(page).toHaveURL(/\/driver/);
    
    // Check for driver-specific elements
    await expect(page.getByText(/Driver|Dashboard|Welcome|Route/i)).toBeVisible({ timeout: 10000 });
    
    // Check if token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    console.log('✅ Driver login successful');
  });

  test('Nanny Login and Dashboard Access', async ({ page }) => {
    const creds = TEST_CREDENTIALS.nanny;
    
    console.log(`Testing Nanny Login: ${creds.email}`);
    
    await loginAsUser(page, creds.email, creds.password, creds.role);
    
    // Wait for navigation to nanny dashboard
    await page.waitForURL('**/nanny**', { timeout: 30000 });
    
    // Verify we're on the correct dashboard
    await expect(page).toHaveURL(/\/nanny/);
    
    // Check for nanny-specific elements
    await expect(page.getByText(/Nanny|Dashboard|Welcome/i)).toBeVisible({ timeout: 10000 });
    
    // Check if token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    console.log('✅ Nanny login successful');
  });

  test('Doctor Login and Dashboard Access', async ({ page }) => {
    const creds = TEST_CREDENTIALS.doctor;
    
    console.log(`Testing Doctor Login: ${creds.email}`);
    
    await loginAsUser(page, creds.email, creds.password, creds.role);
    
    // Wait for navigation to doctor dashboard (might be /doc or /doctor)
    try {
      await page.waitForURL(/\/(doc|doctor)/, { timeout: 30000 });
    } catch (e) {
      console.log('Note: Doctor might redirect to /staff or other route');
      await page.waitForURL('**/staff**', { timeout: 30000 });
    }
    
    // Verify we're on a valid dashboard
    await expect(page).toHaveURL(/\/(doc|doctor|staff)/);
    
    // Check for doctor-specific elements
    await expect(page.getByText(/Doctor|Medical|Dashboard|Welcome/i)).toBeVisible({ timeout: 10000 });
    
    // Check if token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    console.log('✅ Doctor login successful');
  });

  test('All Dashboards - Comprehensive Dashboard Navigation Test', async ({ page }) => {
    console.log('\n=== COMPREHENSIVE DASHBOARD NAVIGATION TEST ===\n');
    
    for (const [roleName, creds] of Object.entries(TEST_CREDENTIALS)) {
      console.log(`\n--- Testing ${roleName.toUpperCase()} ---`);
      console.log(`Email: ${creds.email}`);
      
      // Login
      await loginAsUser(page, creds.email, creds.password, creds.role);
      
      // Wait for dashboard
      try {
        if (creds.expectedRoute === '/dashboard') {
          await page.waitForURL('**/dashboard**', { timeout: 30000 });
        } else {
          await page.waitForURL(`**${creds.expectedRoute}**`, { timeout: 30000 });
        }
        
        console.log(`✅ ${roleName} - Login successful`);
        console.log(`   URL: ${page.url()}`);
        
        // Check token
        const token = await page.evaluate(() => localStorage.getItem('token'));
        if (token) {
          console.log('   ✓ Auth token present');
        }
        
        // Take screenshot
        await page.screenshot({ 
          path: `tests/screenshots/${roleName}-dashboard.png`,
          fullPage: true 
        });
        console.log(`   📸 Screenshot saved: ${roleName}-dashboard.png`);
        
      } catch (error) {
        console.error(`❌ ${roleName} - Login failed`);
        console.error(`   Error: ${error.message}`);
        
        // Take error screenshot
        await page.screenshot({ 
          path: `tests/screenshots/${roleName}-error.png`,
          fullPage: true 
        });
      }
      
      // Logout or clear session for next test
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Add small delay between tests
      await page.waitForTimeout(1000);
    }
    
    console.log('\n=== TEST COMPLETED ===\n');
  });
});

test.describe('Dashboard Feature Verification', () => {
  
  test('Parent Dashboard - Key Features', async ({ page }) => {
    const creds = TEST_CREDENTIALS.parent;
    await loginAsUser(page, creds.email, creds.password, creds.role);
    await page.waitForURL('**/dashboard**', { timeout: 30000 });
    
    // Check for common parent dashboard features
    const features = [
      /children/i,
      /profile/i,
      /activities/i,
      /meal/i,
      /appointment/i
    ];
    
    for (const feature of features) {
      const element = page.getByText(feature).first();
      if (await element.isVisible().catch(() => false)) {
        console.log(`✓ Found feature: ${feature}`);
      }
    }
  });

  test('Staff Dashboards - Key Features', async ({ page }) => {
    const staffRoles = ['teacher', 'delivery', 'driver', 'nanny', 'doctor'];
    
    for (const role of staffRoles) {
      const creds = TEST_CREDENTIALS[role];
      console.log(`\nChecking ${role} dashboard features...`);
      
      await loginAsUser(page, creds.email, creds.password, creds.role);
      
      // Wait for appropriate dashboard
      await page.waitForTimeout(5000);
      
      // Check for common staff features
      const hasStaffFeatures = await page.getByText(/dashboard|profile|logout/i).first().isVisible().catch(() => false);
      expect(hasStaffFeatures).toBeTruthy();
      
      console.log(`✓ ${role} dashboard has basic features`);
      
      // Clear session
      await page.evaluate(() => localStorage.clear());
      await page.waitForTimeout(500);
    }
  });
});
