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

function buildJwt(payload: Record<string, string | number>): string {
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
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('th_locale', 'en');
    });
  });

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

  test('register link navigates to /register', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page).toHaveURL(/\/register/);
  });

  test('login page exposes the forgot password link', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: 'Forgot Password?' })).toBeVisible();
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

  test('shows the empty state when the user has no reservations', async ({ page }) => {
    const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    await page.addInitScript(
      ([id, access]) => {
        window.localStorage.setItem(
          'th_auth_session',
          JSON.stringify({
            id_token: id,
            access_token: access,
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        );
      },
      [idToken, accessToken],
    );

    await page.route('**/booking/api/booking**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    });

    await page.goto('/booking-list');

    await expect(page).toHaveURL(/\/booking-list/);
    await expect(page.getByText('No reservations available.')).toBeVisible();
  });

  test('shows an error message when the booking list API fails', async ({ page }) => {
    const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    await page.addInitScript(
      ([id, access]) => {
        window.localStorage.setItem(
          'th_auth_session',
          JSON.stringify({
            id_token: id,
            access_token: access,
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        );
      },
      [idToken, accessToken],
    );

    await page.route('**/booking/api/booking**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'server error' }),
      });
    });

    await page.goto('/booking-list');

    await expect(page.getByText('Unable to load reservations.')).toBeVisible();
  });

  test('shows generic 401 error for wrong password with valid email (no email-existence leak)', async ({ page }) => {
    await mockAuthAndBookingApis(page, { forceLoginFailure: true });

    await page.goto('/login');
    await fillLoginForm(page, 'usuario@valido.com', 'WrongPassword!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Login Failed')).toBeVisible();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    // generic message must NOT mention the email existing or not
    await expect(page.getByText(/email .*exist|account .*exist/i)).toHaveCount(0);
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows generic 401 error for non-existent email (no existence leak)', async ({ page }) => {
    await mockAuthAndBookingApis(page, { forceLoginFailure: true });

    await page.goto('/login');
    await fillLoginForm(page, 'noexiste@travelhub.com', 'Password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Login Failed')).toBeVisible();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page.getByText(/does not exist|no such account/i)).toHaveCount(0);
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows required-field validation when login is submitted empty', async ({ page }) => {
    let loginCalled = false;
    await page.route('**/auth/api/auth/login', async (route) => {
      loginCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Required-field helper messages from LOGIN.EMAIL_REQUIRED / PASSWORD_REQUIRED translations
    await expect(page.locator('app-login').getByText(/required/i).first()).toBeVisible();
    // The form must not call the API when required fields are missing
    expect(loginCalled).toBe(false);
    await expect(page).toHaveURL(/\/login/);
  });

  test('login rejects too-short password client-side and does not call the API', async ({ page }) => {
    let loginCalled = false;
    await page.route('**/auth/api/auth/login', async (route) => {
      loginCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/login');
    await fillLoginForm(page, 'traveler@example.com', 'Sh0rt');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(
      page.locator('app-login').getByText('Password must be at least 8 characters'),
    ).toBeVisible();
    expect(loginCalled).toBe(false);
    await expect(page).toHaveURL(/\/login/);
  });

  test('login rejects password with no uppercase client-side and does not call the API', async ({ page }) => {
    let loginCalled = false;
    await page.route('**/auth/api/auth/login', async (route) => {
      loginCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/login');
    await fillLoginForm(page, 'traveler@example.com', 'nouppercase1');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(
      page.locator('app-login').getByText('Password must contain at least one uppercase letter'),
    ).toBeVisible();
    expect(loginCalled).toBe(false);
    await expect(page).toHaveURL(/\/login/);
  });

  test('login rejects password with no number client-side and does not call the API', async ({ page }) => {
    let loginCalled = false;
    await page.route('**/auth/api/auth/login', async (route) => {
      loginCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/login');
    await fillLoginForm(page, 'traveler@example.com', 'NoNumberHere');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(
      page.locator('app-login').getByText('Password must contain at least one number'),
    ).toBeVisible();
    expect(loginCalled).toBe(false);
    await expect(page).toHaveURL(/\/login/);
  });

  test('expired JWT redirects /booking-list to /login (booking-list-auth.guard checks exp)', async ({ page }) => {
    // exp: 1 (1970) is well in the past — guard must redirect.
    const expiredIdToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123', exp: 1 });
    const expiredAccessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123', exp: 1 });

    await page.addInitScript(
      ([id, access]) => {
        window.localStorage.setItem(
          'th_auth_session',
          JSON.stringify({
            id_token: id,
            access_token: access,
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        );
      },
      [expiredIdToken, expiredAccessToken],
    );

    let bookingFetched = false;
    await page.route('**/booking/api/booking**', async (route) => {
      bookingFetched = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/booking-list');

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fbooking-list/);
    expect(bookingFetched).toBe(false);
  });

  test('my-bookings filter by status hides reservations whose status does not match', async ({ page }) => {
    const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    await page.addInitScript(
      ([id, access]) => {
        window.localStorage.setItem(
          'th_auth_session',
          JSON.stringify({
            id_token: id,
            access_token: access,
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        );
      },
      [idToken, accessToken],
    );

    await page.route('**/booking/api/booking**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reservations),
      });
    });
    await page.route('**/poc-properties/api/property/**', async (route) => {
      const propertyId = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      const detail = propertyDetailsById[propertyId];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: propertyId, ...(detail ?? { name: '', city: '', country: '', photos: [] }) }),
      });
    });

    await page.goto('/booking-list');
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();
    await expect(page.getByText('Coffee Hills Lodge')).toBeVisible();

    // Switch the status filter to PENDING via the ion-select ionChange event.
    await page.evaluate(() => {
      const select = document.querySelector('[data-testid="booking-list-status-filter"]');
      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'PENDING' } }));
    });

    // booking-2 has status PENDING (Coffee Hills Lodge); booking-1 CONFIRMED should be hidden.
    await expect(page.getByText('Coffee Hills Lodge')).toBeVisible();
    await expect(page.getByText('Andes Palace Hotel')).toHaveCount(0);
  });

  test('my-bookings filter by date-range only shows reservations whose period falls inside', async ({ page }) => {
    const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    await page.addInitScript(
      ([id, access]) => {
        window.localStorage.setItem(
          'th_auth_session',
          JSON.stringify({
            id_token: id,
            access_token: access,
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        );
      },
      [idToken, accessToken],
    );

    await page.route('**/booking/api/booking**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reservations),
      });
    });
    await page.route('**/poc-properties/api/property/**', async (route) => {
      const propertyId = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      const detail = propertyDetailsById[propertyId];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: propertyId, ...(detail ?? { name: '', city: '', country: '', photos: [] }) }),
      });
    });

    await page.goto('/booking-list');
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();
    await expect(page.getByText('Coffee Hills Lodge')).toBeVisible();

    // booking-1: 2026-08-10 → 2026-08-14, booking-2: 2026-09-03 → 2026-09-05.
    // Filter from 2026-09-01 → only booking-2 should remain.
    await page.evaluate(() => {
      const fromEl = document.querySelector('[data-testid="booking-list-date-from"]') as HTMLElement | null;
      fromEl?.dispatchEvent(new CustomEvent('ionInput', { detail: { value: '2026-09-01' }, bubbles: true }));
      // Some Ionic events read from event.target.value — set value on inner input too.
      const inner = fromEl?.querySelector('input');
      if (inner) {
        (inner as HTMLInputElement).value = '2026-09-01';
      }
      fromEl?.dispatchEvent(new Event('ionInput', { bubbles: true }));
    });
    // Apply the filter directly through Ionic's event target shape used in the handler.
    await page.evaluate(() => {
      const fromEl = document.querySelector('[data-testid="booking-list-date-from"]') as HTMLElement & {
        value?: string;
      } | null;
      if (fromEl) {
        (fromEl as unknown as { value: string }).value = '2026-09-01';
        fromEl.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
      }
    });

    await expect(page.getByText('Coffee Hills Lodge')).toBeVisible();
    await expect(page.getByText('Andes Palace Hotel')).toHaveCount(0);
  });

  test('my-bookings shows the distinct no-match message when filters exclude every reservation', async ({ page }) => {
    const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    await page.addInitScript(
      ([id, access]) => {
        window.localStorage.setItem(
          'th_auth_session',
          JSON.stringify({
            id_token: id,
            access_token: access,
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        );
      },
      [idToken, accessToken],
    );

    await page.route('**/booking/api/booking**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reservations),
      });
    });
    await page.route('**/poc-properties/api/property/**', async (route) => {
      const propertyId = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      const detail = propertyDetailsById[propertyId];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: propertyId, ...(detail ?? { name: '', city: '', country: '', photos: [] }) }),
      });
    });

    await page.goto('/booking-list');
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();

    // Pick a status that no reservation matches — REJECTED.
    await page.evaluate(() => {
      const select = document.querySelector('[data-testid="booking-list-status-filter"]');
      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'REJECTED' } }));
    });

    await expect(page.locator('[data-testid="booking-list-no-match"]')).toBeVisible();
    await expect(page.getByText('No reservations match the selected filters.')).toBeVisible();
  });

  test('my-bookings refreshes data on revisit (recent status change reflected after refresh)', async ({ page }) => {
    const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    await page.addInitScript(
      ([id, access]) => {
        window.localStorage.setItem(
          'th_auth_session',
          JSON.stringify({
            id_token: id,
            access_token: access,
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        );
      },
      [idToken, accessToken],
    );

    let bookingFetchCount = 0;
    await page.route('**/booking/api/booking**', async (route) => {
      bookingFetchCount += 1;
      const payload =
        bookingFetchCount === 1
          ? [{ ...reservations[1] }] // PENDING
          : [{ ...reservations[1], status: 'CONFIRMED' }]; // status changed after refresh
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    await page.route('**/poc-properties/api/property/**', async (route) => {
      const propertyId = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      const detail = propertyDetailsById[propertyId];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: propertyId, ...(detail ?? { name: '', city: '', country: '', photos: [] }) }),
      });
    });

    await page.goto('/booking-list');
    await expect(page.getByText('Upcoming').first()).toBeVisible();

    await page.reload();
    await expect(page.getByText('Confirmed').first()).toBeVisible();
    expect(bookingFetchCount).toBeGreaterThanOrEqual(2);
  });

  test('renders status labels for CONFIRMED and PENDING reservations', async ({ page }) => {
    const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    await page.addInitScript(
      ([id, access]) => {
        window.localStorage.setItem(
          'th_auth_session',
          JSON.stringify({
            id_token: id,
            access_token: access,
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        );
      },
      [idToken, accessToken],
    );

    await page.route('**/booking/api/booking**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reservations),
      });
    });

    await page.route('**/poc-properties/api/property/**', async (route) => {
      const propertyId = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      const detail = propertyDetailsById[propertyId];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: propertyId, ...(detail ?? { name: '', city: '', country: '', photos: [] }) }),
      });
    });

    await page.goto('/booking-list');

    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();
    // booking-1 status CONFIRMED, booking-2 status PENDING (label "Upcoming")
    await expect(page.getByText('Confirmed').first()).toBeVisible();
    await expect(page.getByText('Upcoming').first()).toBeVisible();
  });
});