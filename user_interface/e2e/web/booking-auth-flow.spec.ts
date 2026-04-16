import { expect, test, type Page } from '@playwright/test';

type BookingReservation = {
  id: string;
  property_id: string;
  user_id: string;
  guests: number;
  period_start: string;
  period_end: string;
  price: number;
  status: string;
  admin_group_id: string;
  payment_reference: string | null;
  created_at: string;
};

const reservations: BookingReservation[] = [
  {
    id: 'booking-1',
    property_id: 'prop-1',
    user_id: 'user-123',
    guests: 2,
    period_start: '2026-08-10',
    period_end: '2026-08-14',
    price: 620,
    status: 'CONFIRMED',
    admin_group_id: 'hotel-admins',
    payment_reference: 'pay-001',
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'booking-2',
    property_id: 'prop-2',
    user_id: 'user-123',
    guests: 1,
    period_start: '2026-09-03',
    period_end: '2026-09-05',
    price: 280,
    status: 'PENDING',
    admin_group_id: 'hotel-admins',
    payment_reference: null,
    created_at: '2026-07-02T14:30:00Z',
  },
];

const propertyDetailsById: Record<string, { name: string; city: string; country: string; photos: string[] }> = {
  'prop-1': {
    name: 'Andes Palace Hotel',
    city: 'Bogota',
    country: 'Colombia',
    photos: ['https://example.com/hotel-1.jpg'],
  },
  'prop-2': {
    name: 'Coffee Hills Lodge',
    city: 'Armenia',
    country: 'Colombia',
    photos: ['https://example.com/hotel-2.jpg'],
  },
};

function buildJwt(payload: Record<string, string>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encodedPayload}.signature`;
}

async function mockAuthAndBookingApis(
  page: Page,
  options?: { forceLoginFailure?: boolean },
): Promise<{ bookingRequestCount: () => number; propertyDetailRequestCount: () => number }> {
  let bookingRequestCount = 0;
  let propertyDetailRequestCount = 0;

  await page.route('**/auth/api/auth/login', async (route) => {
    if (options?.forceLoginFailure) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials' }),
      });
      return;
    }

    const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });

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

  await page.route('**/booking/api/booking**', async (route) => {
    bookingRequestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(reservations),
    });
  });

  await page.route('**/poc-properties/api/property/**', async (route) => {
    propertyDetailRequestCount += 1;
    const requestUrl = new URL(route.request().url());
    const propertyId = requestUrl.pathname.split('/').pop() ?? '';
    const detail = propertyDetailsById[propertyId];

    if (!detail) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Property not found' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: propertyId,
        name: detail.name,
        city: detail.city,
        country: detail.country,
        photos: detail.photos,
      }),
    });
  });

  return {
    bookingRequestCount: () => bookingRequestCount,
    propertyDetailRequestCount: () => propertyDetailRequestCount,
  };
}

async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  const loginPage = page.locator('app-login');
  await loginPage.locator('input[placeholder="Enter your email"]').fill(email);
  await loginPage.locator('input[placeholder="Enter your password"]').fill(password);
}

test.describe('Booking auth and booking-list journeys', () => {
  test('redirects unauthenticated users from booking-list to login with returnUrl', async ({ page }) => {
    const requestStats = await mockAuthAndBookingApis(page);

    await page.goto('/booking-list');

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fbooking-list/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    expect(requestStats.bookingRequestCount()).toBe(0);
  });

  test('logs in and returns to booking-list with one property detail request per card', async ({ page }) => {
    const requestStats = await mockAuthAndBookingApis(page);

    await page.goto('/booking-list');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fbooking-list/);

    await fillLoginForm(page, 'traveler@example.com', 'Test1234!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/booking-list/);
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();
    await expect(page.getByText('Coffee Hills Lodge')).toBeVisible();
    await expect(page.getByText('Bogota, Colombia')).toBeVisible();
    await expect(page.getByText('Armenia, Colombia')).toBeVisible();

    await expect
      .poll(() => requestStats.bookingRequestCount(), {
        message: 'booking list endpoint should be called at least once after successful login',
      })
      .toBeGreaterThan(0);

    await expect
      .poll(() => requestStats.propertyDetailRequestCount(), {
        message: 'property detail endpoint should be called once per reservation card',
      })
      .toBe(reservations.length);
  });

  test('keeps user in login and shows error alert when credentials are rejected', async ({ page }) => {
    await mockAuthAndBookingApis(page, { forceLoginFailure: true });

    await page.goto('/booking-list');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fbooking-list/);

    await fillLoginForm(page, 'traveler@example.com', 'WrongPassword!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fbooking-list/);
    await expect(page.getByText('Login Failed')).toBeVisible();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });
});