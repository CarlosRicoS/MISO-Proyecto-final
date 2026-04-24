import { expect, test, type Page } from '@playwright/test';

function buildJwt(payload: Record<string, string>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encodedPayload}.signature`;
}

const idToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });
const accessToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });

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
  {
    id: 'res-004',
    property_id: 'prop-2',
    user_id: 'traveler-4',
    guests: 2,
    period_start: '2026-11-15',
    period_end: '2026-11-18',
    price: 510,
    status: 'COMPLETED',
    admin_group_id: 'hotel-admins',
    payment_reference: 'pay-002',
    created_at: '2026-07-04T08:00:00Z',
  },
  {
    id: 'res-005',
    property_id: 'prop-1',
    user_id: 'traveler-5',
    guests: 1,
    period_start: '2026-12-20',
    period_end: '2026-12-22',
    price: 180,
    status: 'CANCELED',
    admin_group_id: 'hotel-admins',
    payment_reference: null,
    created_at: '2026-07-05T16:00:00Z',
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

async function injectAuthSession(page: Page): Promise<void> {
  await page.addInitScript(
    ([id, access]) => {
      const loginResponse = {
        id_token: id,
        access_token: access,
        refresh_token: 'refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      window.sessionStorage.setItem('th_auth_session', JSON.stringify(loginResponse));
    },
    [idToken, accessToken],
  );
}

async function mockBookingApis(page: Page, data = reservations): Promise<void> {
  await page.route('**/booking/api/booking/**', async (route) => {
    const url = new URL(route.request().url());
    const pathSegments = url.pathname.replace(/\/$/, '').split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Detail endpoint: /api/booking/{uuid-like-id}
    if (lastSegment && lastSegment !== 'booking' && !lastSegment.includes('admin')) {
      const reservation = data.find((r) => r.id === lastSegment);
      if (!reservation) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"Not found"}' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reservation),
      });
      return;
    }

    // List endpoint: /api/booking/
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}

async function mockPropertyDetailApi(page: Page): Promise<void> {
  await page.route('**/poc-properties/api/property/**', async (route) => {
    const url = new URL(route.request().url());
    const propertyId = url.pathname.split('/').pop() ?? '';
    const detail = propertyDetailsById[propertyId];

    if (!detail) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"Not found"}' });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: propertyId, ...detail }),
    });
  });
}

async function mockAdminConfirmApi(page: Page): Promise<void> {
  await page.route(/\/booking-orchestrator\/api\/reservations\/[^/]+\/admin-confirm$/, async (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/');
    const bookingId = parts[parts.length - 2];
    const reservation = reservations.find((r) => r.id === bookingId);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...reservation, status: 'CONFIRMED', payment_reference: 'ADMIN-ABCD1234' }),
    });
  });
}

async function mockAdminRejectApi(page: Page): Promise<void> {
  await page.route(/\/booking-orchestrator\/api\/reservations\/[^/]+\/admin-reject$/, async (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/');
    const bookingId = parts[parts.length - 2];
    const reservation = reservations.find((r) => r.id === bookingId);
    const body = JSON.parse(route.request().postData() || '{}') as { reason?: string };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...reservation, status: 'REJECTED', rejection_reason: body.reason || 'Rejected' }),
    });
  });
}

test.describe('Portal Hoteles — dashboard reservations', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockBookingApis(page);
  });

  test('displays reservation table with booking IDs and statuses', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('#res-001')).toBeVisible();
    await expect(page.getByText('#res-002')).toBeVisible();
    await expect(page.getByText('#res-003')).toBeVisible();
    await expect(page.getByText('#res-004')).toBeVisible();
    await expect(page.locator('.portal-hoteles-dashboard-status--pending')).toBeVisible();
    await expect(page.locator('.portal-hoteles-dashboard-status--confirmed')).toBeVisible();
  });

  test('paginates when more than 4 reservations', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('Showing 1-4 of 5 reservations')).toBeVisible();
    await expect(page.getByText('Page 1 of 2')).toBeVisible();

    await expect(page.getByText('#res-005')).not.toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('#res-005')).toBeVisible();
    await expect(page.getByText('Showing 5-5 of 5 reservations')).toBeVisible();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
  });

  test('shows empty state when no reservations', async ({ page }) => {
    await mockBookingApis(page, []);
    await page.goto('/dashboard');

    await expect(page.getByText('No reservations available.')).toBeVisible();
  });

  test('shows error state when booking API fails', async ({ page }) => {
    await page.route('**/booking/api/booking/**', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Server error"}' });
    });

    await page.goto('/dashboard');

    await expect(page.getByText('Unable to load reservations.')).toBeVisible();
  });

  test('navigates to reservation detail when clicking booking ID', async ({ page }) => {
    await mockPropertyDetailApi(page);

    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Open booking res-001' }).click();

    await expect(page).toHaveURL(/\/dashboard\/res-001/);
  });
});

test.describe('Portal Hoteles — reservation detail', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockBookingApis(page);
    await mockPropertyDetailApi(page);
  });

  test('displays reservation overview with hotel name and location', async ({ page }) => {
    await page.goto('/dashboard/res-001');

    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();
    await expect(page.getByText('Bogota, Colombia')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
  });

  test('shows payment summary with calculated fees', async ({ page }) => {
    await page.goto('/dashboard/res-001');

    const summary = page.locator('th-payment-summary');
    await expect(summary).toBeVisible();
    await expect(summary.getByText('Service fee')).toBeVisible();
    await expect(summary.getByText('Taxes')).toBeVisible();
    await expect(summary.getByText('Total')).toBeVisible();
  });

  test('accept button confirms a pending reservation and redirects to dashboard', async ({ page }) => {
    await mockAdminConfirmApi(page);

    await page.goto('/dashboard/res-001');
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();

    await page.getByRole('button', { name: 'Accept' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('reject button rejects a pending reservation and redirects to dashboard', async ({ page }) => {
    await mockAdminRejectApi(page);

    await page.goto('/dashboard/res-001');
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();

    await page.getByRole('button', { name: 'Reject' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('accept button is disabled for already confirmed reservations', async ({ page }) => {
    await page.goto('/dashboard/res-002');

    await expect(page.getByText('Coffee Hills Lodge')).toBeVisible();
    await expect(page.getByText('Confirmed')).toBeVisible();

    const acceptButton = page.getByRole('button', { name: 'Accept' });
    await expect(acceptButton).toBeDisabled();
  });

  test('both buttons are disabled for rejected reservations', async ({ page }) => {
    await page.goto('/dashboard/res-003');

    await expect(page.getByText('Rejected')).toBeVisible();

    const acceptButton = page.getByRole('button', { name: 'Accept' });
    const rejectButton = page.getByRole('button', { name: 'Reject' });
    await expect(acceptButton).toBeDisabled();
    await expect(rejectButton).toBeDisabled();
  });

  test('shows error when reservation detail fails to load', async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await injectAuthSession(page);
    await page.route('**/booking/api/booking/**', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Error"}' });
    });

    await page.goto('/dashboard/res-001');

    await expect(page.getByText('Unable to load reservation detail.')).toBeVisible();
  });
});
