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

  test('password mismatch shows confirm-password error and does not submit', async ({ page }) => {
    let registerCalled = false;
    await page.route('**/auth/api/auth/register', async (route) => {
      registerCalled = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'ok' }),
      });
    });

    await page.goto('/register');
    const form = page.locator('app-register');
    await form.locator('input[placeholder="Enter your full name"]').fill('Jane Traveler');
    await form.locator('input[placeholder="Enter your email"]').fill('jane@example.com');
    await form.locator('input[placeholder="Create a password"]').fill('StrongPass1!');
    await form.locator('input[placeholder="Confirm your password"]').fill('DifferentPass1!');
    await form.locator('ion-checkbox').click();
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText(/Passwords do not match|mismatch|do not match/i).first()).toBeVisible();
    expect(registerCalled).toBe(false);
    await expect(page).toHaveURL(/\/register/);
  });

  test('invalid email format shows email-invalid error and does not submit', async ({ page }) => {
    let registerCalled = false;
    await page.route('**/auth/api/auth/register', async (route) => {
      registerCalled = true;
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/register');
    const form = page.locator('app-register');
    await form.locator('input[placeholder="Enter your full name"]').fill('Jane Traveler');
    await form.locator('input[placeholder="Enter your email"]').fill('not-an-email');
    await form.locator('input[placeholder="Create a password"]').fill('StrongPass1!');
    await form.locator('input[placeholder="Confirm your password"]').fill('StrongPass1!');
    await form.locator('ion-checkbox').click();
    await page.getByRole('button', { name: 'Create Account' }).click();

    // EMAIL_INVALID translation — must be visible and form must not submit
    await expect(page.locator('app-register').getByText(/invalid|valid email/i).first()).toBeVisible();
    expect(registerCalled).toBe(false);
  });

  test('required-fields validation prevents submission when fields are empty', async ({ page }) => {
    let registerCalled = false;
    await page.route('**/auth/api/auth/register', async (route) => {
      registerCalled = true;
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/register');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.locator('app-register').getByText(/required/i).first()).toBeVisible();
    expect(registerCalled).toBe(false);
  });

  test('weak password (no uppercase) is rejected client-side and does not call the API', async ({ page }) => {
    let registerCalled = false;
    await page.route('**/auth/api/auth/register', async (route) => {
      registerCalled = true;
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/register');
    await fillRegistrationForm(page, 'nouppercase1');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(
      page.locator('app-register').getByText('Password must contain at least one uppercase letter'),
    ).toBeVisible();
    expect(registerCalled).toBe(false);
    await expect(page).toHaveURL(/\/register/);
  });

  test('weak password (no number) is rejected client-side and does not call the API', async ({ page }) => {
    let registerCalled = false;
    await page.route('**/auth/api/auth/register', async (route) => {
      registerCalled = true;
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/register');
    await fillRegistrationForm(page, 'NoNumberHere');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(
      page.locator('app-register').getByText('Password must contain at least one number'),
    ).toBeVisible();
    expect(registerCalled).toBe(false);
    await expect(page).toHaveURL(/\/register/);
  });

  test('weak password (too short) is rejected client-side and does not call the API', async ({ page }) => {
    let registerCalled = false;
    await page.route('**/auth/api/auth/register', async (route) => {
      registerCalled = true;
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/register');
    await fillRegistrationForm(page, 'Ab1!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(
      page.locator('app-register').getByText('Password must be at least 8 characters'),
    ).toBeVisible();
    expect(registerCalled).toBe(false);
    await expect(page).toHaveURL(/\/register/);
  });

  test('future birthdate is rejected client-side', async ({ page }) => {
    let registerCalled = false;
    await page.route('**/auth/api/auth/register', async (route) => {
      registerCalled = true;
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/register');
    await fillRegistrationForm(page);
    // Set a date in the year 2099 via the date input's data-testid.
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="register-birthdate"]') as HTMLElement | null;
      if (!el) return;
      const inner = el.querySelector('input');
      if (inner) {
        (inner as HTMLInputElement).value = '2099-01-01';
      }
      el.dispatchEvent(new CustomEvent('ionInput', { detail: { value: '2099-01-01' }, bubbles: true }));
    });

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(
      page.locator('app-register').getByText('Date of birth cannot be in the future'),
    ).toBeVisible();
    expect(registerCalled).toBe(false);
    await expect(page).toHaveURL(/\/register/);
  });

  test('underage birthdate is rejected client-side', async ({ page }) => {
    let registerCalled = false;
    await page.route('**/auth/api/auth/register', async (route) => {
      registerCalled = true;
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/register');
    await fillRegistrationForm(page);
    // Pick a date 5 years ago — clearly underage.
    const today = new Date();
    const isoFiveYearsAgo = `${today.getFullYear() - 5}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await page.evaluate((iso) => {
      const el = document.querySelector('[data-testid="register-birthdate"]') as HTMLElement | null;
      if (!el) return;
      const inner = el.querySelector('input');
      if (inner) {
        (inner as HTMLInputElement).value = iso;
      }
      el.dispatchEvent(new CustomEvent('ionInput', { detail: { value: iso }, bubbles: true }));
    }, isoFiveYearsAgo);

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(
      page.locator('app-register').getByText('You must be at least 18 years old'),
    ).toBeVisible();
    expect(registerCalled).toBe(false);
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
