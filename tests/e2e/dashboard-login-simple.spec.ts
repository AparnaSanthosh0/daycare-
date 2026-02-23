import { test, expect } from '@playwright/test';

/**
 * Simple Dashboard Login Tests
 * Tests all user roles with provided credentials
 */

const CREDENTIALS = {
  parent: {
    email: 'shijinthomas2026@mca.ajce.in',
    password: 'Shijin14@',
    role: 'parent',
    dashboardUrl: '/dashboard'
  },
  teacher: {
    email: 'akhilkurian6mile@gmail.com',
    password: 'Aparna14@',
    role: 'teacher',
    dashboardUrl: '/teacher'
  },
  delivery: {
    email: 'biniljacob007@gmail.com',
    password: 'Binil14@',
    role: 'delivery',
    dashboardUrl: '/delivery'
  },
  driver: {
    email: 'appzzsanthoshn014@gmail.com',
    password: 'Aparna14@',
    role: 'driver',
    dashboardUrl: '/driver'
  },
  nanny: {
    email: 'aparnappzzz000@gmail.com',
    password: 'Aparna14@',
    role: 'nanny',
    dashboardUrl: '/nanny'
  },
  doctor: {
    email: 'vijethajinu01@gmail.com',
    password: 'Vijetha123@',
    role: 'doctor',
    dashboardUrl: '/doc'
  }
};

// Helper function to perform login
async function performLogin(page, email, password, role) {
  try {
    await page.goto('/login');
    await page.waitForURL('**/login**', { timeout: 10000 });
    
    // Fill username
    await page.getByLabel('Username').fill(email);
    
    // Fill password
    await page.locator('input#password[name="password"]').fill(password);
    
    // Select role from MUI dropdown
    await page.getByLabel('Role').click();
    const roleName = role.charAt(0).toUpperCase() + role.slice(1);
    const rolePattern = role === 'nanny' ? /nanny/i : new RegExp(`^\\s*${roleName}\\s*$`, 'i');
    await page.getByRole('option', { name: rolePattern }).click();
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    return true;
  } catch (error) {
    console.error(`Login failed: ${error.message}`);
    return false;
  }
}

test.describe('Dashboard Login Tests - All Roles', () => {
  
  test('1. Parent Dashboard Login', async ({ page }) => {
    const { email, password, role, dashboardUrl } = CREDENTIALS.parent;
    
    console.log(`\n--- Testing PARENT Login ---`);
    console.log(`Email: ${email}`);
    
    const loginSuccess = await performLogin(page, email, password, role);
    expect(loginSuccess).toBeTruthy();
    
    // Check if we're on a dashboard
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    expect(currentUrl).toContain('dashboard');
    
    // Check for token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    console.log('✅ PARENT login successful');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/parent-dashboard.png', fullPage: true });
  });
  
  test('2. Teacher Dashboard Login', async ({ page }) => {
    const { email, password, role, dashboardUrl } = CREDENTIALS.teacher;
    
    console.log(`\n--- Testing TEACHER Login ---`);
    console.log(`Email: ${email}`);
    
    const loginSuccess = await performLogin(page, email, password, role);
    expect(loginSuccess).toBeTruthy();
    
    // Wait for any dashboard
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check for token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    console.log('✅ TEACHER login successful');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/teacher-dashboard.png', fullPage: true });
  });
  
  test('3. Delivery Dashboard Login', async ({ page }) => {
    const { email, password, role, dashboardUrl } = CREDENTIALS.delivery;
    
    console.log(`\n--- Testing DELIVERY Login ---`);
    console.log(`Email: ${email}`);
    
    const loginSuccess = await performLogin(page, email, password, role);
    expect(loginSuccess).toBeTruthy();
    
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    console.log('✅ DELIVERY login successful');
    
    await page.screenshot({ path: 'test-results/delivery-dashboard.png', fullPage: true });
  });
  
  test('4. Driver Dashboard Login', async ({ page }) => {
    const { email, password, role, dashboardUrl } = CREDENTIALS.driver;
    
    console.log(`\n--- Testing DRIVER Login ---`);
    console.log(`Email: ${email}`);
    
    const loginSuccess = await performLogin(page, email, password, role);
    expect(loginSuccess).toBeTruthy();
    
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    console.log('✅ DRIVER login successful');
    
    await page.screenshot({ path: 'test-results/driver-dashboard.png', fullPage: true });
  });
  
  test('5. Nanny Dashboard Login', async ({ page }) => {
    const { email, password, role, dashboardUrl } = CREDENTIALS.nanny;
    
    console.log(`\n--- Testing NANNY Login ---`);
    console.log(`Email: ${email}`);
    
    const loginSuccess = await performLogin(page, email, password, role);
    expect(loginSuccess).toBeTruthy();
    
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    console.log('✅ NANNY login successful');
    
    await page.screenshot({ path: 'test-results/nanny-dashboard.png', fullPage: true });
  });
  
  test('6. Doctor Dashboard Login', async ({ page }) => {
    const { email, password, role, dashboardUrl } = CREDENTIALS.doctor;
    
    console.log(`\n--- Testing DOCTOR Login ---`);
    console.log(`Email: ${email}`);
    
    const loginSuccess = await performLogin(page, email, password, role);
    expect(loginSuccess).toBeTruthy();
    
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    console.log('✅ DOCTOR login successful');
    
    await page.screenshot({ path: 'test-results/doctor-dashboard.png', fullPage: true });
  });
  
  test('7. All Dashboards Comprehensive Test', async ({ page }) => {
    console.log('\n========================================');
    console.log('   COMPREHENSIVE LOGIN TEST - ALL ROLES');
    console.log('========================================\n');
    
    const results = [];
    
    for (const [roleName, creds] of Object.entries(CREDENTIALS)) {
      console.log(`\n--- Testing ${roleName.toUpperCase()} ---`);
      console.log(`Email: ${creds.email}`);
      
      try {
        const loginSuccess = await performLogin(page, creds.email, creds.password, creds.role);
        
        if (loginSuccess) {
          await page.waitForTimeout(2000);
          const currentUrl = page.url();
          const token = await page.evaluate(() => localStorage.getItem('token'));
          
          if (token) {
            console.log(`✅ ${roleName.toUpperCase()} - Login SUCCESSFUL`);
            console.log(`   URL: ${currentUrl}`);
            console.log(`   Token: Present`);
            
            results.push({
              role: roleName,
              status: 'PASSED',
              url: currentUrl
            });
            
            // Screenshot
            await page.screenshot({ 
              path: `test-results/${roleName}-comprehensive.png`, 
              fullPage: true 
            });
          } else {
            console.log(`❌ ${roleName.toUpperCase()} - No token found`);
            results.push({
              role: roleName,
              status: 'FAILED',
              reason: 'No token'
            });
          }
        } else {
          console.log(`❌ ${roleName.toUpperCase()} - Login failed`);
          results.push({
            role: roleName,
            status: 'FAILED',
            reason: 'Login error'
          });
        }
        
        // Clear session for next test
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        
      } catch (error) {
        console.log(`❌ ${roleName.toUpperCase()} - Error: ${error.message}`);
        results.push({
          role: roleName,
          status: 'FAILED',
          reason: error.message
        });
      }
    }
    
    // Print summary
    console.log('\n========================================');
    console.log('           TEST SUMMARY');
    console.log('========================================');
    
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    
    console.log(`\nTotal Tests: ${results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log('\nDetailed Results:');
    
    results.forEach(r => {
      const icon = r.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${r.role.toUpperCase()}: ${r.status}`);
      if (r.url) console.log(`   └─ URL: ${r.url}`);
      if (r.reason) console.log(`   └─ Reason: ${r.reason}`);
    });
    
    console.log('\n========================================\n');
    
    // Assert all passed
    expect(passed).toBe(results.length);
  });
});
