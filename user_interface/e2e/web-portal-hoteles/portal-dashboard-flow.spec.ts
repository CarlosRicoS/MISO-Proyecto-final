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
      window.localStorage.setItem('th_auth_session', JSON.stringify(loginResponse));
      window.localStorage.setItem('th_locale', 'en');
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

  test('status filter limits the table to reservations matching the chosen status', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('#res-001')).toBeVisible();

    await page.evaluate(() => {
      const select = document.querySelector('[data-testid="status-filter"]');
      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'CONFIRMED' } }));
    });

    await expect(page.getByText('#res-002')).toBeVisible();
    await expect(page.getByText('#res-001')).not.toBeVisible();
    await expect(page.getByText('#res-003')).not.toBeVisible();
    await expect(page.getByText('Showing 1-1 of 1 reservations')).toBeVisible();
  });

  test('Previous button returns to the first page after going forward', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();

    await page.getByRole('button', { name: 'Previous' }).click();

    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(page.getByText('#res-001')).toBeVisible();
    await expect(page.getByText('#res-005')).not.toBeVisible();
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

  test('both buttons are disabled for completed reservations', async ({ page }) => {
    await page.goto('/dashboard/res-004');

    await expect(page.getByText('Completed')).toBeVisible();

    const acceptButton = page.getByRole('button', { name: 'Accept' });
    const rejectButton = page.getByRole('button', { name: 'Reject' });
    await expect(acceptButton).toBeDisabled();
    await expect(rejectButton).toBeDisabled();
  });

  test('reject sends the typed rejection reason in the admin-reject request', async ({ page }) => {
    let capturedBody: { reason?: string } | null = null;

    await page.route(/\/booking-orchestrator\/api\/reservations\/[^/]+\/admin-reject$/, async (route) => {
      capturedBody = JSON.parse(route.request().postData() || '{}') as { reason?: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'res-001', status: 'REJECTED' }),
      });
    });

    await page.goto('/dashboard/res-001');
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();

    await page.getByTestId('rejection-reason').fill('Property under maintenance until June.');
    await page.getByRole('button', { name: 'Reject' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.reason).toBe('Property under maintenance until June.');
  });

  test('both buttons are disabled for canceled reservations', async ({ page }) => {
    await page.goto('/dashboard/res-005');

    await expect(page.getByText('Canceled')).toBeVisible();

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

  // Gherkin: reject-booking.feature — "Rechazar una reserva confirmada cuando la política lo permite"
  test('rejects a CONFIRMED reservation when policy permits', async ({ page }) => {
    let capturedUrl = '';
    await page.route(/\/booking-orchestrator\/api\/reservations\/[^/]+\/admin-reject$/, async (route) => {
      capturedUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'res-002', status: 'REJECTED' }),
      });
    });

    await page.goto('/dashboard/res-002');
    await expect(page.getByText('Confirmed')).toBeVisible();

    const rejectButton = page.getByRole('button', { name: 'Reject' });
    // CONFIRMED is not terminal — reject must be enabled (policy permits).
    await expect(rejectButton).toBeEnabled();
    await rejectButton.click();

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(capturedUrl).toContain('/booking-orchestrator/api/reservations/res-002/admin-reject');
  });

  test('reject is blocked when the reservation is in a terminal state (policy disallows)', async ({ page }) => {
    // REJECTED, COMPLETED and CANCELED are terminal — reject must remain disabled.
    await page.goto('/dashboard/res-004');
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject' })).toBeDisabled();

    await page.goto('/dashboard/res-005');
    await expect(page.getByText('Canceled')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject' })).toBeDisabled();
  });
});

// -------------------------------------------------------------------------
// Executive dashboard — Gherkin: executive-dashboard.feature
// -------------------------------------------------------------------------

const mockExecutiveDashboardMetrics = {
  total_reservations: 28,
  monthly_revenue: 8350.0,
  avg_daily_revenue: 278.33,
  revenue_trend_pct: 23.0,
  today_checkins: 2,
  today_checkouts: 1,
};

const mockExecutiveRevenueOverview = {
  data: [
    { month: 11, year: 2025, label: 'Nov', total_revenue: 3665.0 },
    { month: 12, year: 2025, label: 'Dec', total_revenue: 7000.0 },
    { month: 1, year: 2026, label: 'Jan', total_revenue: 4310.0 },
    { month: 2, year: 2026, label: 'Feb', total_revenue: 5940.0 },
    { month: 3, year: 2026, label: 'Mar', total_revenue: 6790.0 },
    { month: 4, year: 2026, label: 'Apr', total_revenue: 8350.0 },
  ],
};

test.describe('Portal Hoteles — executive dashboard (KPIs, revenue chart, reservation trend)', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockBookingApis(page);
    await page.route('**/incomings-report/api/reports/dashboard-metrics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockExecutiveDashboardMetrics),
      });
    });
    await page.route('**/incomings-report/api/reports/revenue-overview**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockExecutiveRevenueOverview),
      });
    });
  });

  // "Visualizar el resumen ejecutivo de ocupación actual con KPIs clave"
  test('shows occupancy / revenue / reservations KPI cards', async ({ page }) => {
    await page.goto('/dashboard');

    const reservationsCard = page
      .locator('portal-hoteles-grid-card')
      .filter({ hasText: 'Total Reservations' });
    await expect(reservationsCard.locator('.portal-hoteles-dashboard-card__value')).toHaveText('28');

    const revenueCard = page
      .locator('portal-hoteles-grid-card')
      .filter({ hasText: 'Monthly Revenue' });
    await expect(revenueCard.locator('.portal-hoteles-dashboard-card__value')).toHaveText('$8,350.00');

    const checkinsCard = page.locator('portal-hoteles-grid-card').filter({ hasText: "Today's Check-ins" });
    await expect(checkinsCard.locator('.portal-hoteles-dashboard-card__value')).toHaveText('2');
  });

  // "Consultar la evolución de ingresos mensuales en la gráfica principal"
  // The travelhub-style monthly revenue chart lives on /reports — verify the page makes the
  // revenue-overview request and the chart card renders.
  test('monthly revenue chart loads on the reports page from revenue-overview API', async ({ page }) => {
    const overviewRequest = page.waitForRequest(/\/incomings-report\/api\/reports\/revenue-overview/);

    await page.route('**/incomings-report/api/reports/incoming**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ records: [], total_records: 0, total_gross: 0, total_net: 0 }),
      });
    });

    await page.goto('/reports');
    const request = await overviewRequest;
    expect(request.url()).toContain('/incomings-report/api/reports/revenue-overview');

    const chartCard = page.locator('portal-hoteles-revenue-chart-card');
    await expect(chartCard).toBeVisible();
    await expect(chartCard.getByText('Revenue Overview')).toBeVisible();
  });

  // "Revisar el estado y la tendencia de reservas activas y próximas"
  test('reservations table shows active and upcoming reservations with their status trend', async ({ page }) => {
    await page.goto('/dashboard');

    // The reservation table renders status badges for active (PENDING/CONFIRMED) and other
    // states — these represent the "estado y tendencia" of upcoming reservations.
    await expect(page.locator('.portal-hoteles-dashboard-status--pending')).toBeVisible();
    await expect(page.locator('.portal-hoteles-dashboard-status--confirmed')).toBeVisible();
    await expect(page.getByText('#res-001')).toBeVisible();
    await expect(page.getByText('#res-002')).toBeVisible();
  });
});
