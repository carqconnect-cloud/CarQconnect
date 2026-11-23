import { test, expect } from '@playwright/test';

test.describe('Fioner CRM Automated Test Suite', () => {

  test('Step 1: Login to CRM and verify authentication', async ({ page }) => {
    await page.goto('/');

    // Check if we are on the login page
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button:has-text("Sign In"), button[type="submit"]').first();

    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Logging in with admin@carqconnect.com...');
      await emailInput.fill('admin@carqconnect.com');
      await passwordInput.fill('Admin@123');
      await submitBtn.click();

      // Wait for dashboard or navigation to complete
      await page.waitForTimeout(3000);
    }

    // Verify authenticated state
    const token = await page.evaluate(() => localStorage.getItem('fioner_auth_token'));
    console.log('Auth token present:', !!token);
    expect(page.url()).not.toContain('login');
  });

  test('Step 2: Verify Customers List and Customer 360 View Data', async ({ page }) => {
    await page.goto('/');

    // Auto-login if prompted
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('admin@carqconnect.com');
      await page.locator('input[type="password"]').first().fill('Admin@123');
      await page.locator('button:has-text("Sign In"), button[type="submit"]').first().click();
      await page.waitForTimeout(3000);
    }

    // Find and navigate to Customers section if not already on it
    const customersMenu = page.locator('text="Customers"').first();
    if (await customersMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
      await customersMenu.click();
      await page.waitForTimeout(1500);
    }

    // Verify customers table has records
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
    const count = await tableRows.count();
    console.log(`Found ${count} customer rows in table.`);
    expect(count).toBeGreaterThan(0);

    // Click on Akshit Nannaware or first customer row
    const targetCustomerRow = page.locator('tr:has-text("Akshit Nannaware"), tr:has-text("admin@fioner.test")').first();
    if (await targetCustomerRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await targetCustomerRow.click();
    } else {
      await tableRows.first().click();
    }

    // Wait for Customer 360 View to open
    await page.waitForTimeout(2000);
    await expect(page.locator('button:has-text("360 View")').first()).toBeVisible({ timeout: 10000 });
    console.log('Customer detail 360 view opened successfully.');

    // 1. Check Vehicles & Hardware tab
    const vehiclesTab = page.locator('button:has-text("Vehicles & Hardware")').first();
    if (await vehiclesTab.isVisible()) {
      await vehiclesTab.click();
      await page.waitForTimeout(1000);
      const vehicleTable = page.locator('table:has-text("Vehicle Model")');
      console.log('Vehicles tab opened. Checking vehicle list...');
      await expect(vehicleTable).toBeVisible({ timeout: 5000 });
    }

    // 2. Check Documents tab
    const docsTab = page.locator('button:has-text("Documents")').first();
    if (await docsTab.isVisible()) {
      await docsTab.click();
      await page.waitForTimeout(1000);
      const docHeader = page.locator('h3:has-text("Customer Documents")');
      await expect(docHeader).toBeVisible({ timeout: 5000 });
      console.log('Documents tab opened successfully.');
    }

    // 3. Check SOS tab
    const sosTab = page.locator('button:has-text("SOS")').first();
    if (await sosTab.isVisible()) {
      await sosTab.click();
      await page.waitForTimeout(1000);
      const sosHeader = page.locator('h3:has-text("SOS Data")');
      await expect(sosHeader).toBeVisible({ timeout: 5000 });
      console.log('SOS tab opened successfully.');
    }

    // 4. Check Trips tab
    const tripsTab = page.locator('button:has-text("Trips")').first();
    if (await tripsTab.isVisible()) {
      await tripsTab.click();
      await page.waitForTimeout(1000);
      console.log('Trips tab opened successfully.');
    }

    // 5. Check Orders tab
    const ordersTab = page.locator('button:has-text("Orders")').first();
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      await page.waitForTimeout(1000);
      console.log('Orders tab opened successfully.');
    }

    // 6. Check AI ChatBot tab
    const chatsTab = page.locator('button:has-text("AI ChatBot")').first();
    if (await chatsTab.isVisible()) {
      await chatsTab.click();
      await page.waitForTimeout(1000);
      console.log('AI ChatBot tab opened successfully.');
    }

    // Capture final verification screenshot
    await page.screenshot({ path: 'tests/customer-360-verified.png', fullPage: true });
    console.log('Verification screenshot saved at tests/customer-360-verified.png');
  });

});
