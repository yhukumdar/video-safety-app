import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,  // Run setup first, then tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,  // Use 1 worker to avoid conflicts during setup
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },

  projects: [
    // Setup project - runs first
    {
      name: 'setup',
      testMatch: '**/tests/setup.spec.js',
    },

    // Test projects - run after setup
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/tests/e2e/**/*.spec.js',
      dependencies: ['setup'],  // Wait for setup to complete
    },
  ],

  webServer: {
    command: 'cd frontend && npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
