import { test as setup } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

setup('create test data', async ({ page }) => {
  console.log('🔧 Setting up test data...');
  
  // 1. Login
  console.log('  → Logging in...');
  await page.goto('/');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  await page.waitForLoadState('networkidle');
  
  console.log('  ✓ Logged in successfully');
  
  // 2. Create kid profiles (if they don't exist)
  console.log('  → Creating kid profiles...');
  await page.click('button:has-text("Kid Profiles")');
  await page.waitForLoadState('networkidle');
  
  // Create first kid: Emma (7 years old)
  try {
    await page.click('button:has-text("Add Kid")', { timeout: 5000 });
    await page.fill('input[placeholder*="name"]', 'Emma');
    await page.fill('input[type="number"]', '7');
    await page.click('button:has-text("Create")');

    // Wait for Emma to appear in the list (modal closed)
    await page.waitForSelector('text=Emma', { timeout: 5000 });
    await page.waitForTimeout(500);
    console.log('  ✓ Created kid profile: Emma');
  } catch (e) {
    console.log('  ⚠ Kid profile Emma might already exist:', e.message);
  }

  // Create second kid: Jake (4 years old)
  try {
    await page.click('button:has-text("Add Kid")', { timeout: 5000 });
    await page.fill('input[placeholder*="name"]', 'Jake');
    await page.fill('input[type="number"]', '4');
    await page.click('button:has-text("Create")');

    // Wait for Jake to appear in the list (modal closed)
    await page.waitForSelector('text=Jake', { timeout: 5000 });
    await page.waitForTimeout(500);
    console.log('  ✓ Created kid profile: Jake');
  } catch (e) {
    console.log('  ⚠ Kid profile Jake might already exist:', e.message);
  }
  
  // 3. Set content preferences
  console.log('  → Setting content preferences...');
  // Click user dropdown to open menu
  await page.click('button:has(div.bg-gradient-to-br)');
  await page.waitForTimeout(500);
  // Click "Content Preferences" in dropdown
  await page.click('text=Content Preferences');
  await page.waitForLoadState('networkidle');
  
  // Select Emma
  const dropdown = page.locator('select').first();
  const options = await dropdown.locator('option').all();
  let emmaValue = null;
  for (const option of options) {
    const text = await option.textContent();
    if (text && text.includes('Emma')) {
      emmaValue = await option.getAttribute('value');
      break;
    }
  }
  if (emmaValue) {
    await dropdown.selectOption(emmaValue);
  }
  await page.waitForTimeout(1000);
  
  // Set allowed themes
  await page.click('button:has-text("Educational")').catch(() => {});
  await page.click('button:has-text("Animated")').catch(() => {});
  
  // Set blocked themes (in second section)
  const blockedSection = page.locator('text=Blocked Themes').locator('..');
  await blockedSection.locator('button:has-text("Scary")').click().catch(() => {});
  
  // Adjust sliders
  const violenceSlider = page.locator('input[type="range"]').first();
  await violenceSlider.fill('20');
  
  // Save preferences
  await page.click('button:has-text("Save Preferences")');
  await page.waitForTimeout(2000);
  
  console.log('  ✓ Set preferences for Emma');
  
  // 4. Submit a test video for analysis
  console.log('  → Submitting test video...');
  await page.click('button:has-text("Dashboard")');
  await page.waitForLoadState('networkidle');
  
  const urlInput = page.locator('input[placeholder*="youtube"]');
  await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await page.click('button:has-text("Analyze")');
  await page.waitForTimeout(2000);
  
  console.log('  ✓ Submitted test video (analysis will complete in background)');
  
  console.log('✅ Test data setup complete!');
  console.log('');
  console.log('Test environment ready:');
  console.log('  • User: test@example.com');
  console.log('  • Kid profiles: Emma (7), Jake (4)');
  console.log('  • Preferences: Set for Emma');
  console.log('  • Test video: Submitted');
  console.log('');
});
