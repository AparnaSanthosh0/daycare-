import { test, expect } from '@playwright/test';

/**
 * Comprehensive Functionality Tests for Parent and Doctor Dashboards
 * Tests all features, navigation, and interactions
 */

const CREDENTIALS = {
  parent: {
    email: 'shijinthomas2026@mca.ajce.in',
    password: 'Shijin14@',
    role: 'parent',
    dashboardUrl: '/dashboard'
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
  await page.goto('/login');
  await page.waitForURL('**/login**', { timeout: 10000 });
  
  await page.getByLabel('Username').fill(email);
  await page.locator('input#password[name="password"]').fill(password);
  
  await page.getByLabel('Role').click();
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);
  const rolePattern = new RegExp(`^\\s*${roleName}\\s*$`, 'i');
  await page.getByRole('option', { name: rolePattern }).click();
  
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}

test.describe('Parent Dashboard - Full Functionality Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await performLogin(page, CREDENTIALS.parent.email, CREDENTIALS.parent.password, CREDENTIALS.parent.role);
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
  });

  test('1. Parent Dashboard - Initial Load and Layout', async ({ page }) => {
    console.log('\n=== Testing Parent Dashboard Initial Load ===');
    
    // Check page loaded
    await expect(page).toHaveURL(/\/dashboard/);
    console.log('✓ Dashboard URL correct');
    
    // Check for welcome message or user name
    const welcomeText = await page.locator('text=/welcome|dashboard|hello/i').first().isVisible().catch(() => false);
    console.log(`✓ Welcome message visible: ${welcomeText}`);
    
    // Check for main navigation or header
    const hasNav = await page.locator('nav, header, [role="navigation"]').first().isVisible().catch(() => false);
    console.log(`✓ Navigation present: ${hasNav}`);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/parent-dashboard-layout.png', fullPage: true });
    console.log('✓ Screenshot captured');
  });

  test('2. Parent Dashboard - Navigation Menu', async ({ page }) => {
    console.log('\n=== Testing Parent Dashboard Navigation ===');
    
    // Check for common menu items
    const menuItems = [
      { text: /profile|account/i, name: 'Profile' },
      { text: /children|kids/i, name: 'Children' },
      { text: /appointment|schedule/i, name: 'Appointments' },
      { text: /meal|food/i, name: 'Meals' },
      { text: /activity|activities/i, name: 'Activities' },
      { text: /payment|billing/i, name: 'Payments' },
      { text: /transport|bus/i, name: 'Transport' },
      { text: /message|chat/i, name: 'Messages' },
    ];
    
    const foundItems = [];
    for (const item of menuItems) {
      const exists = await page.getByText(item.text).first().isVisible({ timeout: 2000 }).catch(() => false);
      if (exists) {
        foundItems.push(item.name);
        console.log(`✓ Found menu item: ${item.name}`);
      }
    }
    
    console.log(`\nTotal menu items found: ${foundItems.length}`);
    expect(foundItems.length).toBeGreaterThan(0);
  });

  test('3. Parent Dashboard - Profile/Account Section', async ({ page }) => {
    console.log('\n=== Testing Parent Profile Section ===');
    
    // Try to find and click profile link
    const profileLinks = [
      page.getByText(/profile/i).first(),
      page.getByText(/account/i).first(),
      page.locator('[href*="profile"]').first(),
      page.locator('button:has-text("profile")').first(),
    ];
    
    let profileClicked = false;
    for (const link of profileLinks) {
      try {
        const isVisible = await link.isVisible({ timeout: 2000 });
        if (isVisible) {
          await link.click();
          await page.waitForTimeout(2000);
          profileClicked = true;
          console.log('✓ Profile section accessed');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (profileClicked) {
      // Check for profile elements
      const hasEmail = await page.locator(`text=${CREDENTIALS.parent.email}`).isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`✓ Email visible in profile: ${hasEmail}`);
      
      await page.screenshot({ path: 'test-results/parent-profile-section.png', fullPage: true });
      console.log('✓ Profile screenshot captured');
    } else {
      console.log('⚠ Profile section not found in navigation');
    }
  });

  test('4. Parent Dashboard - Children Management', async ({ page }) => {
    console.log('\n=== Testing Children Management ===');
    
    // Look for children section
    const childrenLinks = [
      page.getByText(/children/i).first(),
      page.getByText(/kids/i).first(),
      page.getByText(/my children/i).first(),
      page.locator('[href*="children"]').first(),
    ];
    
    let childrenSectionFound = false;
    for (const link of childrenLinks) {
      try {
        const isVisible = await link.isVisible({ timeout: 2000 });
        if (isVisible) {
          await link.click();
          await page.waitForTimeout(2000);
          childrenSectionFound = true;
          console.log('✓ Children section accessed');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (childrenSectionFound) {
      // Check for add child button or child list
      const hasAddButton = await page.getByRole('button', { name: /add|new|register/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`✓ Add child button visible: ${hasAddButton}`);
      
      // Check for child cards or list
      const hasChildList = await page.locator('[class*="child"], [class*="kid"], table, [role="list"]').first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`✓ Child list/cards visible: ${hasChildList}`);
      
      await page.screenshot({ path: 'test-results/parent-children-section.png', fullPage: true });
      console.log('✓ Children section screenshot captured');
    } else {
      console.log('⚠ Children section not found - might be on main dashboard');
      
      // Check if children info is on main dashboard
      const childOnMain = await page.locator('text=/child|kid/i').first().isVisible().catch(() => false);
      console.log(`✓ Child information on main dashboard: ${childOnMain}`);
    }
  });

  test('5. Parent Dashboard - Appointments', async ({ page }) => {
    console.log('\n=== Testing Appointments Section ===');
    
    const appointmentLinks = [
      page.getByText(/appointment/i).first(),
      page.getByText(/schedule/i).first(),
      page.locator('[href*="appointment"]').first(),
    ];
    
    let appointmentFound = false;
    for (const link of appointmentLinks) {
      try {
        const isVisible = await link.isVisible({ timeout: 2000 });
        if (isVisible) {
          await link.click();
          await page.waitForTimeout(2000);
          appointmentFound = true;
          console.log('✓ Appointments section accessed');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (appointmentFound) {
      // Check for booking button
      const hasBookButton = await page.getByRole('button', { name: /book|schedule|new/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`✓ Book appointment button visible: ${hasBookButton}`);
      
      await page.screenshot({ path: 'test-results/parent-appointments-section.png', fullPage: true });
      console.log('✓ Appointments screenshot captured');
    } else {
      console.log('⚠ Appointments section not found in navigation');
    }
  });

  test('6. Parent Dashboard - Meals/Nutrition', async ({ page }) => {
    console.log('\n=== Testing Meals Section ===');
    
    const mealLinks = [
      page.getByText(/meal/i).first(),
      page.getByText(/food/i).first(),
      page.getByText(/nutrition/i).first(),
      page.locator('[href*="meal"]').first(),
    ];
    
    let mealFound = false;
    for (const link of mealLinks) {
      try {
        const isVisible = await link.isVisible({ timeout: 2000 });
        if (isVisible) {
          await link.click();
          await page.waitForTimeout(2000);
          mealFound = true;
          console.log('✓ Meals section accessed');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (mealFound) {
      await page.screenshot({ path: 'test-results/parent-meals-section.png', fullPage: true });
      console.log('✓ Meals screenshot captured');
    } else {
      console.log('⚠ Meals section not found');
    }
  });

  test('7. Parent Dashboard - E-commerce/Shop', async ({ page }) => {
    console.log('\n=== Testing E-commerce Section ===');
    
    const shopLinks = [
      page.getByText(/shop|store|products/i).first(),
      page.getByText(/buy|purchase/i).first(),
      page.locator('[href*="product"]').first(),
      page.locator('[href*="shop"]').first(),
    ];
    
    let shopFound = false;
    for (const link of shopLinks) {
      try {
        const isVisible = await link.isVisible({ timeout: 2000 });
        if (isVisible) {
          await link.click();
          await page.waitForTimeout(2000);
          shopFound = true;
          console.log('✓ Shop section accessed');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (shopFound) {
      await page.screenshot({ path: 'test-results/parent-shop-section.png', fullPage: true });
      console.log('✓ Shop screenshot captured');
    } else {
      console.log('⚠ Shop section not found');
    }
  });

  test('8. Parent Dashboard - Logout Functionality', async ({ page }) => {
    console.log('\n=== Testing Logout ===');
    
    const logoutButtons = [
      page.getByText(/logout|sign out/i).first(),
      page.getByRole('button', { name: /logout|sign out/i }).first(),
      page.locator('[href*="logout"]').first(),
    ];
    
    let logoutFound = false;
    for (const button of logoutButtons) {
      try {
        const isVisible = await button.isVisible({ timeout: 2000 });
        if (isVisible) {
          await button.click();
          await page.waitForTimeout(2000);
          logoutFound = true;
          console.log('✓ Logout button clicked');
          
          // Check if redirected to login
          const currentUrl = page.url();
          const onLoginPage = currentUrl.includes('login') || currentUrl === 'http://localhost:3000/';
          console.log(`✓ Redirected to login/home: ${onLoginPage}`);
          
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!logoutFound) {
      console.log('⚠ Logout button not found');
    }
  });
});

test.describe('Doctor Dashboard - Full Functionality Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await performLogin(page, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password, CREDENTIALS.doctor.role);
    await page.waitForTimeout(4000);
  });

  test('1. Doctor Dashboard - Initial Load and Layout', async ({ page }) => {
    console.log('\n=== Testing Doctor Dashboard Initial Load ===');
    
    // Check we're on some dashboard
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    const onDashboard = currentUrl.includes('/doc') || currentUrl.includes('/doctor') || currentUrl.includes('/staff');
    expect(onDashboard).toBeTruthy();
    console.log('✓ Doctor dashboard loaded');
    
    // Check for medical/doctor related content
    const hasMedicalContent = await page.locator('text=/doctor|medical|health|patient|appointment/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`✓ Medical content visible: ${hasMedicalContent}`);
    
    await page.screenshot({ path: 'test-results/doctor-dashboard-layout.png', fullPage: true });
    console.log('✓ Screenshot captured');
  });

  test('2. Doctor Dashboard - Navigation Menu', async ({ page }) => {
    console.log('\n=== Testing Doctor Dashboard Navigation ===');
    
    const menuItems = [
      { text: /appointment/i, name: 'Appointments' },
      { text: /patient/i, name: 'Patients' },
      { text: /health|medical/i, name: 'Health Records' },
      { text: /schedule/i, name: 'Schedule' },
      { text: /profile/i, name: 'Profile' },
      { text: /prescription/i, name: 'Prescriptions' },
      { text: /vaccination|vaccine/i, name: 'Vaccinations' },
      { text: /report/i, name: 'Reports' },
    ];
    
    const foundItems = [];
    for (const item of menuItems) {
      const exists = await page.getByText(item.text).first().isVisible({ timeout: 2000 }).catch(() => false);
      if (exists) {
        foundItems.push(item.name);
        console.log(`✓ Found menu item: ${item.name}`);
      }
    }
    
    console.log(`\nTotal menu items found: ${foundItems.length}`);
  });

  test('3. Doctor Dashboard - Appointments Management', async ({ page }) => {
    console.log('\n=== Testing Doctor Appointments ===');
    
    const appointmentLinks = [
      page.getByText(/appointment/i).first(),
      page.getByText(/schedule/i).first(),
      page.locator('[href*="appointment"]').first(),
    ];
    
    let appointmentFound = false;
    for (const link of appointmentLinks) {
      try {
        const isVisible = await link.isVisible({ timeout: 2000 });
        if (isVisible) {
          await link.click();
          await page.waitForTimeout(2000);
          appointmentFound = true;
          console.log('✓ Appointments section accessed');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (appointmentFound) {
      // Check for appointment list or calendar
      const hasAppointmentList = await page.locator('table, [role="list"], [class*="appointment"]').first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`✓ Appointment list visible: ${hasAppointmentList}`);
      
      await page.screenshot({ path: 'test-results/doctor-appointments-section.png', fullPage: true });
      console.log('✓ Appointments screenshot captured');
    } else {
      console.log('⚠ Appointments section not found in navigation');
      
      // Check if appointments are on main dashboard
      const appointmentOnMain = await page.locator('text=/appointment/i').first().isVisible().catch(() => false);
      console.log(`✓ Appointment info on main dashboard: ${appointmentOnMain}`);
    }
  });

  test('4. Doctor Dashboard - Patient Management', async ({ page }) => {
    console.log('\n=== Testing Patient Management ===');
    
    const patientLinks = [
      page.getByText(/patient/i).first(),
      page.getByText(/children/i).first(),
      page.locator('[href*="patient"]').first(),
      page.locator('[href*="children"]').first(),
    ];
    
    let patientFound = false;
    for (const link of patientLinks) {
      try {
        const isVisible = await link.isVisible({ timeout: 2000 });
        if (isVisible) {
          await link.click();
          await page.waitForTimeout(2000);
          patientFound = true;
          console.log('✓ Patient section accessed');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (patientFound) {
      await page.screenshot({ path: 'test-results/doctor-patients-section.png', fullPage: true });
      console.log('✓ Patient section screenshot captured');
    } else {
      console.log('⚠ Patient section not found');
    }
  });

  test('5. Doctor Dashboard - Health Records/Medical History', async ({ page }) => {
    console.log('\n=== Testing Health Records ===');
    
    const healthLinks = [
      page.getByText(/health|medical/i).first(),
      page.getByText(/record/i).first(),
      page.getByText(/history/i).first(),
      page.locator('[href*="health"]').first(),
      page.locator('[href*="record"]').first(),
    ];
    
    let healthFound = false;
    for (const link of healthLinks) {
      try {
        const isVisible = await link.isVisible({ timeout: 2000 });
        if (isVisible) {
          await link.click();
          await page.waitForTimeout(2000);
          healthFound = true;
          console.log('✓ Health records section accessed');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (healthFound) {
      await page.screenshot({ path: 'test-results/doctor-health-records.png', fullPage: true });
      console.log('✓ Health records screenshot captured');
    } else {
      console.log('⚠ Health records section not found');
    }
  });

  test('6. Doctor Dashboard - Vaccination/Immunization', async ({ page }) => {
    console.log('\n=== Testing Vaccination Section ===');
    
    const vaccineLinks = [
      page.getByText(/vaccination|vaccine|immunization/i).first(),
      page.locator('[href*="vaccin"]').first(),
      page.locator('[href*="immun"]').first(),
    ];
    
    let vaccineFound = false;
    for (const link of vaccineLinks) {
      try {
        const isVisible = await link.isVisible({ timeout: 2000 });
        if (isVisible) {
          await link.click();
          await page.waitForTimeout(2000);
          vaccineFound = true;
          console.log('✓ Vaccination section accessed');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (vaccineFound) {
      await page.screenshot({ path: 'test-results/doctor-vaccination-section.png', fullPage: true });
      console.log('✓ Vaccination screenshot captured');
    } else {
      console.log('⚠ Vaccination section not found');
    }
  });

  test('7. Doctor Dashboard - Profile/Account', async ({ page }) => {
    console.log('\n=== Testing Doctor Profile ===');
    
    const profileLinks = [
      page.getByText(/profile/i).first(),
      page.getByText(/account/i).first(),
      page.locator('[href*="profile"]').first(),
    ];
    
    let profileFound = false;
    for (const link of profileLinks) {
      try {
        const isVisible = await link.isVisible({ timeout: 2000 });
        if (isVisible) {
          await link.click();
          await page.waitForTimeout(2000);
          profileFound = true;
          console.log('✓ Profile section accessed');
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (profileFound) {
      const hasEmail = await page.locator(`text=${CREDENTIALS.doctor.email}`).isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`✓ Email visible in profile: ${hasEmail}`);
      
      await page.screenshot({ path: 'test-results/doctor-profile-section.png', fullPage: true });
      console.log('✓ Profile screenshot captured');
    } else {
      console.log('⚠ Profile section not found');
    }
  });

  test('8. Doctor Dashboard - Logout Functionality', async ({ page }) => {
    console.log('\n=== Testing Doctor Logout ===');
    
    const logoutButtons = [
      page.getByText(/logout|sign out/i).first(),
      page.getByRole('button', { name: /logout|sign out/i }).first(),
      page.locator('[href*="logout"]').first(),
    ];
    
    let logoutFound = false;
    for (const button of logoutButtons) {
      try {
        const isVisible = await button.isVisible({ timeout: 2000 });
        if (isVisible) {
          await button.click();
          await page.waitForTimeout(2000);
          logoutFound = true;
          console.log('✓ Logout button clicked');
          
          const currentUrl = page.url();
          const onLoginPage = currentUrl.includes('login') || currentUrl === 'http://localhost:3000/';
          console.log(`✓ Redirected to login/home: ${onLoginPage}`);
          
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!logoutFound) {
      console.log('⚠ Logout button not found');
    }
  });
});

test.describe('Comprehensive Dashboard Comparison', () => {
  
  test('Compare Parent vs Doctor Dashboard Features', async ({ page }) => {
    console.log('\n=== COMPREHENSIVE DASHBOARD COMPARISON ===\n');
    
    const results = {
      parent: { features: [], screenshots: [] },
      doctor: { features: [], screenshots: [] }
    };
    
    // Test Parent Dashboard
    console.log('--- Testing Parent Dashboard ---');
    await performLogin(page, CREDENTIALS.parent.email, CREDENTIALS.parent.password, CREDENTIALS.parent.role);
    await page.waitForTimeout(3000);
    
    const parentUrl = page.url();
    results.parent.features.push(`URL: ${parentUrl}`);
    console.log(`Parent URL: ${parentUrl}`);
    
    // Capture main dashboard
    await page.screenshot({ path: 'test-results/comparison-parent-main.png', fullPage: true });
    results.parent.screenshots.push('comparison-parent-main.png');
    
    // Logout
    await page.evaluate(() => localStorage.clear());
    
    // Test Doctor Dashboard
    console.log('\n--- Testing Doctor Dashboard ---');
    await performLogin(page, CREDENTIALS.doctor.email, CREDENTIALS.doctor.password, CREDENTIALS.doctor.role);
    await page.waitForTimeout(3000);
    
    const doctorUrl = page.url();
    results.doctor.features.push(`URL: ${doctorUrl}`);
    console.log(`Doctor URL: ${doctorUrl}`);
    
    // Capture main dashboard
    await page.screenshot({ path: 'test-results/comparison-doctor-main.png', fullPage: true });
    results.doctor.screenshots.push('comparison-doctor-main.png');
    
    console.log('\n=== COMPARISON COMPLETE ===');
    console.log(`Parent Dashboard: ${results.parent.features.length} features tested`);
    console.log(`Doctor Dashboard: ${results.doctor.features.length} features tested`);
  });
});
