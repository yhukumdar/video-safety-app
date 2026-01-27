import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

test.describe('Theme and Kid Filtering', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should filter by theme', async ({ page }) => {
    // Count initial reports
    const initialCount = await page.locator('[class*="report"]').count();
    
    if (initialCount > 0) {
      // Click a theme filter button (e.g., "Educational")
      await page.click('button:has-text("Educational")');
      
      // Button should be highlighted/selected
      const educationalBtn = page.locator('button:has-text("Educational")');
      await expect(educationalBtn).toHaveClass(/bg-blue-500/);
      
      // Results count should update
      await expect(page.locator('text=/Showing \\d+ of \\d+/')).toBeVisible();
      
      // Clear filter
      await page.click('button:has-text("Clear Filters")');
      
      // Should show all reports again
      expect(await page.locator('[class*="report"]').count()).toBe(initialCount);
    }
  });

  test('should filter by multiple themes', async ({ page }) => {
    // Click two theme filters
    await page.click('button:has-text("Educational")');
    await page.click('button:has-text("Animated")');
    
    // Both should be highlighted
    await expect(page.locator('button:has-text("Educational")')).toHaveClass(/bg-blue-500/);
    await expect(page.locator('button:has-text("Animated")')).toHaveClass(/bg-blue-500/);
    
    // Should show "Showing videos with: Educational, Animated"
    await expect(page.locator('p.text-sm.text-slate-400:has-text("Showing videos with:")')).toBeVisible();
  });

  test('should show kid profile filter dropdown', async ({ page }) => {
    // Should have "Show Warnings For" dropdown
    await expect(page.locator('text=Show Warnings For')).toBeVisible();
    
    // Should have "All Kids" option
    const dropdown = page.locator('select');
    await expect(dropdown).toBeVisible();
    
    // Default should be "All Kids"
    await expect(dropdown).toHaveValue('all');
  });

  test('should filter warnings by kid', async ({ page }) => {
    const dropdown = page.locator('select');
    
    // Get all options
    const options = await dropdown.locator('option').all();
    
    if (options.length > 1) {
      // Select a specific kid (not "All Kids")
      const kidOption = options[1];
      const kidValue = await kidOption.getAttribute('value');
      
      await dropdown.selectOption(kidValue);
      
      // Should show message about filtering for that kid
      const kidName = await kidOption.textContent();
      if (kidName) {
        await expect(page.locator(`text=Showing only videos suitable for`)).toBeVisible();
      }
    }
  });

  test('should show no matches message', async ({ page }) => {
    // Click a theme that likely has no matches
    await page.click('button:has-text("Political")');
    
    // If no videos match, should show appropriate message
    const noVideosMsg = page.locator('text=/No videos match|No reports/i');
    
    // Either we have matching videos OR we see the no-match message
    const hasVideos = await page.locator('[class*="report"]').count() > 0;
    const hasMessage = await noVideosMsg.isVisible();
    
    expect(hasVideos || hasMessage).toBeTruthy();
  });

  test('should clear all filters button work', async ({ page }) => {
    // Set multiple filters
    await page.click('button:has-text("Educational")');
    
    const dropdown = page.locator('select');
    const options = await dropdown.locator('option').all();
    if (options.length > 1) {
      const kidValue = await options[1].getAttribute('value');
      await dropdown.selectOption(kidValue);
    }
    
    // Click clear all filters (if no matches message appears)
    const clearBtn = page.locator('button:has-text("Clear All Filters")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      
      // Theme should be unselected
      await expect(page.locator('button:has-text("Educational")')).not.toHaveClass(/bg-blue-500/);
      
      // Dropdown should reset to "All Kids"
      await expect(dropdown).toHaveValue('all');
    }
  });
});
