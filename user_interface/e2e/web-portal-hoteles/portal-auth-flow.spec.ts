import { expect, test, type Page } from '@playwright/test';

function buildJwt(payload: Record<string, string>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encodedPayload}.signature`;
}

async function mockLoginApi(
  page: Page,
  options?: { forceLoginFailure?: boolean },
): Promise<void> {
  await page.route('**/auth/api/auth/login', async (route) => {
    if (options?.forceLoginFailure) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials' }),
      });
      return;
    }

    const idToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });
    const accessToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id_token: idToken,
        access_token: accessToken,
        refresh_token: 'refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    });
  });
}

async function mockBookingListApi(page: Page): Promise<void> {
  await page.route('**/booking/api/booking**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(reservations),
    });
  });
}

async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  const loginPage = page.locator('portal-hoteles-login');
  await loginPage.locator('input[placeholder="Enter your email"]').fill(email);
  await loginPage.locator('input[placeholder="Enter your password"]').fill(password);
}

const reservations = [
  {
    id: 'res-001',
    property_id: 'prop-1',
    user_id: 'traveler-1',
    guests: 2,
    period_start: '2026-08-10',
    period_end: '2026-08-14',
    price: 620,
    status: 'PENDING',
    admin_group_id: 'hotel-admins',
    payment_reference: null,
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'res-002',
    property_id: 'prop-2',
    user_id: 'traveler-2',
    guests: 1,
    period_start: '2026-09-03',
    period_end: '2026-09-05',
    price: 280,
    status: 'CONFIRMED',
    admin_group_id: 'hotel-admins',
    payment_reference: 'pay-001',
    created_at: '2026-07-02T14:30:00Z',
  },
  {
    id: 'res-003',
    property_id: 'prop-1',
    user_id: 'traveler-3',
    guests: 3,
    period_start: '2026-10-01',
    period_end: '2026-10-03',
    price: 400,
    status: 'REJECTED',
    admin_group_id: 'hotel-admins',
    payment_reference: null,
    created_at: '2026-07-03T09:00:00Z',
  },
];

test.describe('Portal Hoteles — authentication flow', () => {
  test('redirects unauthenticated users from dashboard to login', async ({ page }) => {
    await mockLoginApi(page);
    await mockBookingListApi(page);

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fdashboard/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });

  test('logs in and reaches the dashboard with reservation table', async ({ page }) => {
    await mockLoginApi(page);
    await mockBookingListApi(page);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    await fillLoginForm(page, 'admin@hotel.com', 'Admin1234!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Dashboard Overview')).toBeVisible();
    await expect(page.getByText('#res-001')).toBeVisible();
    await expect(page.getByText('#res-002')).toBeVisible();
    await expect(page.getByText('#res-003')).toBeVisible();
  });

  test('shows error alert when login credentials are rejected', async ({ page }) => {
    await mockLoginApi(page, { forceLoginFailure: true });

    await page.goto('/login');

    await fillLoginForm(page, 'admin@hotel.com', 'WrongPassword!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Login Failed')).toBeVisible();
  });

  test('displays operator email on dashboard after login', async ({ page }) => {
    await mockLoginApi(page);
    await mockBookingListApi(page);

    await page.goto('/dashboard');
    await fillLoginForm(page, 'admin@hotel.com', 'Admin1234!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('strong').filter({ hasText: 'admin@hotel.com' })).toBeVisible();
  });
});
