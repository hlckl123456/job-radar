import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60000, // 60 seconds per test (scraping with retries takes ~40s)
  reporter: [
    ['html', { outputFolder: 'artifacts/html-report' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'artifacts/test-results',
});
