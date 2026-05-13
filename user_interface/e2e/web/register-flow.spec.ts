import { expect, test, type Page } from '@playwright/test';

async function fillRegistrationForm(page: Page, password = 'StrongPass1!'): Promise<void> {
  const form = page.locator('app-register');
  await form.locator('input[placeholder="Enter your full name"]').fill('Jane Traveler');
  await form.locator('input[placeholder="Enter your email"]').fill('jane@example.com');
  await form.locator('input[placeholder="Create a password"]').fill(password);
  await form.locator('input[placeholder="Confirm your password"]').fill(password);
  await form.locator('ion-checkbox').click();
}

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('th_locale', 'en');
    });
  });

  test('successful registration shows success popup and routes to login', async ({ page }) => {
    await page.route('**/auth/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Account created successfully.' }),
      });
    });

    await page.goto('/register');
    await fillRegistrationForm(page);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByRole('heading', { name: 'Account Created' })).toBeVisible();
    await expect(page.getByText('Account created successfully.')).toBeVisible();
    await page.locator('th-popup').getByRole('button', { name: 'Accept' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('duplicate email returns 409 and surfaces the email-in-use error', async ({ page }) => {
    await page.route('**/auth/api/auth/register', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Email is already in use.' }),
      });
    });

    await page.goto('/register');
    await fillRegistrationForm(page);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Registration Failed')).toBeVisible();
    await expect(page.getByText('Email is already in use.')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test('400 password-policy error surfaces the criteria message', async ({ page }) => {
    await page.route('**/auth/api/auth/register', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Password does not meet criteria.' }),
      });
    });

    await page.goto('/register');
    await fillRegistrationForm(page, 'weakpass');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Registration Failed')).toBeVisible();
    await expect(page.getByText('Password does not meet criteria.')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });
});
