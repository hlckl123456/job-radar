import { test, expect } from '@playwright/test';

const COMPANIES = ['Anthropic', 'OpenAI', 'Amazon', 'Stripe', 'Apple', 'Databricks', 'Glean', 'Google', 'Meta', 'Sentry'];

test.describe('Job Radar Smoke Tests', () => {
  test('should load the page with default preferences', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page.locator('h1')).toContainText('Job Radar');

    // Check preferences section is visible with default content
    await expect(page.locator('.preferences-section')).toBeVisible();
    await expect(page.locator('.preferences-section').getByText('Looking for:').first()).toBeVisible();
    await expect(page.getByText('Senior / Staff level AI engineering')).toBeVisible();
    await expect(page.locator('.preferences-section').getByText('Not looking for:').first()).toBeVisible();
    await expect(page.getByText('Pure AI research')).toBeVisible();
  });

  test('should edit and persist preferences after refresh', async ({ page }) => {
    await page.goto('/');

    // Click Edit Preferences
    await page.getByRole('button', { name: 'Edit Preferences' }).click();

    // Check textareas are visible
    const lookingForTextarea = page.locator('textarea').first();
    const notLookingForTextarea = page.locator('textarea').last();
    await expect(lookingForTextarea).toBeVisible();
    await expect(notLookingForTextarea).toBeVisible();

    // Modify preferences
    await lookingForTextarea.clear();
    await lookingForTextarea.fill('Test preference: looking for ML engineers');
    await notLookingForTextarea.clear();
    await notLookingForTextarea.fill('Test preference: not looking for managers');

    // Save preferences
    await page.getByRole('button', { name: 'Save Preferences' }).click();

    // Verify preferences are displayed
    await expect(page.getByText('Test preference: looking for ML engineers')).toBeVisible();
    await expect(page.getByText('Test preference: not looking for managers')).toBeVisible();

    // Refresh page
    await page.reload();

    // Verify preferences persisted
    await expect(page.getByText('Test preference: looking for ML engineers')).toBeVisible();
    await expect(page.getByText('Test preference: not looking for managers')).toBeVisible();
  });

  test('should update jobs and display results', async ({ page }) => {
    await page.goto('/');

    // Click Update Jobs button
    const updateButton = page.getByRole('button', { name: 'Update Jobs' });
    await updateButton.click();

    // Wait for completion - Playwright scraping now takes ~18-20 seconds with all companies
    await expect(updateButton).toContainText('Update Jobs', { timeout: 30000 });
    await expect(updateButton).toBeEnabled();

    // Check that results section is visible
    await expect(page.locator('.results-section')).toBeVisible();

    // Check last updated timestamp is shown
    await expect(page.locator('.last-updated')).toBeVisible();
  });

  test('should display all 10 company sections', async ({ page }) => {
    await page.goto('/');

    // Update jobs first
    await page.getByRole('button', { name: 'Update Jobs' }).click();
    await expect(page.getByRole('button', { name: 'Update Jobs' })).toBeEnabled({ timeout: 30000 });

    // Verify all 10 companies have sections
    for (const company of COMPANIES) {
      const companySection = page.locator(`.company-section[data-company="${company}"]`);
      await expect(companySection).toBeVisible();
      await expect(companySection.locator('h3')).toContainText(company);
    }
  });

  test('should show jobs with valid links', async ({ page }) => {
    await page.goto('/');

    // Update jobs
    await page.getByRole('button', { name: 'Update Jobs' }).click();
    await expect(page.getByRole('button', { name: 'Update Jobs' })).toBeEnabled({ timeout: 30000 });

    // Check if any jobs are displayed
    const jobLinks = page.locator('.company-section table a[href]');
    const count = await jobLinks.count();

    if (count > 0) {
      // Verify each link has a non-empty href
      for (let i = 0; i < count; i++) {
        const href = await jobLinks.nth(i).getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).not.toBe('');
      }
    }
  });

  test('should persist job results after refresh', async ({ page }) => {
    await page.goto('/');

    // Update jobs
    await page.getByRole('button', { name: 'Update Jobs' }).click();
    await expect(page.getByRole('button', { name: 'Update Jobs' })).toBeEnabled({ timeout: 30000 });

    // Wait for last updated to appear
    await expect(page.locator('.last-updated')).toBeVisible({ timeout: 30000 });

    // Refresh page
    await page.reload();

    // Verify last updated is still there after refresh
    await expect(page.locator('.last-updated')).toContainText('Last updated:');

    // Should still show results sections
    await expect(page.locator('.results-section')).toBeVisible();
  });
});
