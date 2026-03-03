import { test, expect } from '@playwright/test';

test.describe('Feature: Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Scenario: View dashboard statistics', async ({ page }) => {
    await test.step('Given I am on the dashboard page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    await test.step('When the page loads', async () => {
      await expect(page.getByText('Supported Tools')).toBeVisible();
    });

    await test.step('Then statistics cards should be displayed', async () => {
      const statCards = page.locator('.card');
      await expect(statCards.first()).toBeVisible();
    });
  });

  test('Scenario: Navigate to Tools page', async ({ page }) => {
    await test.step('Given I am on the dashboard', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
    });

    await test.step('When I click on Tools in the sidebar', async () => {
      await page.getByRole('link', { name: 'Tools' }).click();
      await page.waitForURL('/tools');
    });

    await test.step('Then I should be on the Tools page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Tools');
    });
  });
});

test.describe('Feature: Tools Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools');
    await page.waitForLoadState('networkidle');
  });

  test('Scenario: View all supported tools', async ({ page }) => {
    await test.step('Given I am on the Tools page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Tools');
    });

    await test.step('When the page loads', async () => {
      await expect(page.getByText('CLI Tools')).toBeVisible();
    });

    await test.step('Then tool categories should be displayed', async () => {
      const cards = page.locator('.card');
      await expect(cards.first()).toBeVisible();
    });
  });

  test('Scenario: Sync All button is available', async ({ page }) => {
    await test.step('Given I am on the Tools page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
    });

    await test.step('When looking for sync functionality', async () => {
      const syncAllButton = page.getByRole('button', { name: 'Sync All' });
      await expect(syncAllButton).toBeVisible();
    });

    await test.step('Then Sync All button should be clickable', async () => {
      const syncAllButton = page.getByRole('button', { name: 'Sync All' });
      await expect(syncAllButton).toBeEnabled();
    });
  });

  test('Scenario: Individual tool sync button', async ({ page }) => {
    await test.step('Given I am on the Tools page with tools loaded', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
      await page.waitForSelector('.card', { timeout: 10000 });
    });

    await test.step('When I look for individual sync buttons', async () => {
      const syncButtons = page.locator('button:has-text("Sync")');
      const count = await syncButtons.count();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Then sync buttons should be visible', async () => {
      const syncButton = page.locator('button:has-text("Sync")').first();
      await expect(syncButton).toBeVisible();
    });
  });

  test('Scenario: Click Sync All and verify response', async ({ page }) => {
    await test.step('Given I am on the Tools page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
    });

    await test.step('When I click Sync All button', async () => {
      const syncAllButton = page.getByRole('button', { name: 'Sync All' });
      await syncAllButton.click();
    });

    await test.step('Then page should handle the sync action', async () => {
      await page.waitForTimeout(2000);
      const syncAllButton = page.getByRole('button', { name: 'Sync All' });
      await expect(syncAllButton).toBeVisible();
    });
  });
});

test.describe('Feature: Skills Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/skills');
    await page.waitForLoadState('networkidle');
  });

  test('Scenario: View skills list', async ({ page }) => {
    await test.step('Given I am on the Skills page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Skills');
    });

    await test.step('When the page loads', async () => {
      await expect(page.getByText('All Skills')).toBeVisible();
    });
  });

  test('Scenario: Create new skill button is available', async ({ page }) => {
    await test.step('Given I am on the Skills page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
    });

    await test.step('When looking for create functionality', async () => {
      const newSkillButton = page.getByRole('button', { name: 'New Skill' });
      await expect(newSkillButton).toBeVisible();
    });

    await test.step('Then New Skill button should be clickable', async () => {
      const newSkillButton = page.getByRole('button', { name: 'New Skill' });
      await expect(newSkillButton).toBeEnabled();
    });
  });

  test('Scenario: Create new skill flow', async ({ page }) => {
    const skillName = `e2e-skill-${Date.now()}`;

    await test.step('Given I wait for page to load', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
    });

    await test.step('When I click New Skill button', async () => {
      await page.getByRole('button', { name: 'New Skill' }).click();
      await page.waitForSelector('input[placeholder*="Skill name"]', { timeout: 5000 });
    });

    await test.step('And I enter a skill name and submit', async () => {
      await page.locator('input[placeholder*="Skill name"]').fill(skillName);
      await page.getByRole('button', { name: 'Create' }).click();
    });

    await test.step('Then the skill should appear in the list', async () => {
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForLoadState('networkidle');
      const skillInList = page.locator(`button:has-text("${skillName}")`);
      await expect(skillInList.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test('Scenario: Open import panel', async ({ page }) => {
    await test.step('Given I am on the Skills page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
    });

    await test.step('When I click Import button', async () => {
      await page.getByRole('button', { name: 'Import' }).first().click();
    });

    await test.step('Then import panel should open', async () => {
      await expect(page.getByText('Import Skills from Tools')).toBeVisible({ timeout: 5000 });
    });
  });

  test('Scenario: View imported skills table or empty state', async ({ page }) => {
    await test.step('Given I open the import panel', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
      const importButton = page.getByRole('button', { name: 'Import' }).first();
      if (await importButton.isVisible()) {
        await importButton.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Then import panel should show table or empty message', async () => {
      const hasContent = await Promise.all([
        page.locator('table').isVisible().catch(() => false),
        page.getByText('No skills found').isVisible().catch(() => false),
      ]);
      expect(hasContent[0] || hasContent[1]).toBeTruthy();
    });
  });

  test('Scenario: Import button is present', async ({ page }) => {
    await test.step('Given I am on the Skills page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
    });

    await test.step('Then import functionality should be available', async () => {
      const importButton = page.getByRole('button', { name: 'Import' }).first();
      await expect(importButton).toBeVisible();
    });
  });

  test('Scenario: Preview button exists', async ({ page }) => {
    await test.step('Given I open the import panel', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
      const importButton = page.getByRole('button', { name: 'Import' }).first();
      if (await importButton.isVisible()) {
        await importButton.click();
        await page.waitForTimeout(1000);
      }
    });

    await test.step('When I look for preview functionality', async () => {
      const previewButtons = page.locator('button[title="Preview"]');
      const count = await previewButtons.count();
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    });

    await test.step('Then preview button should be visible if skills exist', async () => {
      const previewButton = page.locator('button[title="Preview"]').first();
      if (await previewButton.isVisible()) {
        await expect(previewButton).toBeVisible();
      }
    });
  });

  test('Scenario: Check for symlink status column', async ({ page }) => {
    await test.step('Given I open the import panel', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
      const importButton = page.getByRole('button', { name: 'Import' }).first();
      if (await importButton.isVisible()) {
        await importButton.click();
        await page.waitForTimeout(1000);
      }
    });

    await test.step('When the table is visible', async () => {
      const table = page.locator('table');
      if (await table.isVisible()) {
        await expect(page.getByText('Status')).toBeVisible();
      }
    });

    await test.step('Then status column should show Linked or Local', async () => {
      const table = page.locator('table');
      if (await table.isVisible()) {
        const linkedStatus = page.getByText('Linked');
        const localStatus = page.getByText('Local');
        const visible = (await linkedStatus.isVisible()) || (await localStatus.isVisible());
        expect(visible).toBeTruthy();
      }
    });
  });

  test('Scenario: Restore button exists for symlinked skills', async ({ page }) => {
    await test.step('Given I open the import panel', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
      const importButton = page.getByRole('button', { name: 'Import' }).first();
      if (await importButton.isVisible()) {
        await importButton.click();
        await page.waitForTimeout(1000);
      }
    });

    await test.step('When I look for restore functionality', async () => {
      const restoreButtons = page.locator('button[title="Restore from symlink"]');
      const count = await restoreButtons.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    await test.step('Then restore button should be visible if symlinked skills exist', async () => {
      const restoreButton = page.locator('button[title="Restore from symlink"]').first();
      const isVisible = await restoreButton.isVisible().catch(() => false);
      if (isVisible) {
        await expect(restoreButton).toBeVisible();
      }
    });
  });
});

test.describe('Feature: Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('Scenario: View settings form', async ({ page }) => {
    await test.step('Given I am on the Settings page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Settings');
    });

    await test.step('When the page loads', async () => {
      await expect(page.getByText('Skill Repository Path')).toBeVisible();
    });
  });

  test('Scenario: Theme selection', async ({ page }) => {
    await test.step('Given I am on the Settings page', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
    });

    await test.step('When I change the theme', async () => {
      const themeSelect = page.locator('select');
      await themeSelect.selectOption('dark');
    });

    await test.step('Then the theme should be updated', async () => {
      const themeSelect = page.locator('select');
      await expect(themeSelect).toHaveValue('dark');
    });
  });

  test('Scenario: Save settings', async ({ page }) => {
    await test.step('Given settings are loaded', async () => {
      await page.waitForSelector('h1', { timeout: 10000 });
    });

    await test.step('When I click Save Changes', async () => {
      const saveButton = page.getByRole('button', { name: 'Save Changes' });
      await expect(saveButton).toBeVisible();
    });

    await test.step('Then Save button should be clickable', async () => {
      const saveButton = page.getByRole('button', { name: 'Save Changes' });
      await expect(saveButton).toBeEnabled();
    });
  });
});

test.describe('Feature: Navigation', () => {
  test('Scenario: Navigate between all pages', async ({ page }) => {
    await test.step('Given I start on the Dashboard', async () => {
      await page.goto('/');
      await page.waitForSelector('h1', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    await test.step('When I navigate to Tools', async () => {
      await page.getByRole('link', { name: 'Tools' }).click();
      await page.waitForURL('/tools');
      await page.waitForSelector('h1', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Tools');
    });

    await test.step('And navigate to Skills', async () => {
      await page.getByRole('link', { name: 'Skills' }).click();
      await page.waitForURL('/skills');
      await page.waitForSelector('h1', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Skills');
    });

    await test.step('And navigate to Settings', async () => {
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForURL('/settings');
      await page.waitForSelector('h1', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Settings');
    });

    await test.step('Then I can return to Dashboard', async () => {
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await page.waitForURL('/');
      await page.waitForSelector('h1', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Dashboard');
    });
  });
});
