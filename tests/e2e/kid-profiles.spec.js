import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

test.describe('Kid Profiles', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Kid Profiles
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Click Kid Profiles nav item
    await page.click('text=Kid Profiles');
  });

  test('should create a new kid profile', async ({ page }) => {
    // Click "Add Kid Profile" button
    await page.click('button:has-text("Add Kid")');
    
    // Fill in the form
    await page.fill('input[placeholder*="name"]', 'Test Kid');
    await page.fill('input[type="number"]', '7');
    
    // Submit
    await page.click('button:has-text("Create")');

    // Should see success message or new profile in list
    await expect(page.locator('text=Test Kid')).toBeVisible();
  });

  test('should display kid profiles list', async ({ page }) => {
    // Should have at least the heading
    await expect(page.locator('h1:has-text("Kid Profiles")')).toBeVisible();
    
    // Check if any profiles exist
    const profileCount = await page.locator('[class*="profile"]').count();
    console.log(`Found ${profileCount} kid profiles`);
  });

  test('should edit existing profile', async ({ page }) => {
    // Find first profile and click edit
    const firstProfile = page.locator('[class*="profile"]').first();
    
    if (await firstProfile.count() > 0) {
      await firstProfile.locator('button:has-text("Edit")').click();
      
      // Change the age
      await page.fill('input[type="number"]', '8');

      // Save
      await page.click('button:has-text("Update")');

      // Should show updated age
      await expect(page.locator('text=8 years')).toBeVisible();
    }
  });

  test('should delete profile with confirmation', async ({ page }) => {
    const initialCount = await page.locator('[class*="profile"]').count();
    
    if (initialCount > 0) {
      // Click delete on first profile
      await page.locator('[class*="profile"]').first().locator('button:has-text("Delete")').click();
      
      // Should show confirmation dialog
      await expect(page.locator('text=/Are you sure|confirm/i')).toBeVisible();
      
      // Cancel first
      await page.click('button:has-text("Cancel")');
      
      // Count should be the same
      expect(await page.locator('[class*="profile"]').count()).toBe(initialCount);
    }
  });
});
