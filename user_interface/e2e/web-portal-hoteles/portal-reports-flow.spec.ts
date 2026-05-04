import { expect, test, type Page } from '@playwright/test';

function buildJwt(payload: Record<string, string>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encodedPayload}.signature`;
}

const idToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });
const accessToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });

const mockIncomingReport = {
  records: [
    {
      id: 'rpt-001',
      booking_id: 'bk000001-0000-0000-0000-000000000001',
      payment_reference: 'PAY-APR-001',
      payment_date: '2026-04-07T10:00:00',
      gross_value: 1750.0,
      taxes: 131.25,
      commission: 87.5,
      net_income: 1531.25,
      status: 'CONFIRMED',
    },
    {
      id: 'rpt-002',
      booking_id: 'bk000002-0000-0000-0000-000000000002',
      payment_reference: 'PAY-APR-002',
      payment_date: '2026-04-14T13:00:00',
      gross_value: 920.0,
      taxes: 69.0,
      commission: 46.0,
      net_income: 805.0,
      status: 'CONFIRMED',
    },
    {
      id: 'rpt-003',
      booking_id: 'bk000003-0000-0000-0000-000000000003',
      payment_reference: null,
      payment_date: '2026-04-21T08:30:00',
      gross_value: 1480.0,
      taxes: 111.0,
      commission: 74.0,
      net_income: 1295.0,
      status: 'PENDING',
    },
  ],
  total_records: 3,
  total_gross: 4150.0,
  total_net: 3631.25,
};

const mockRevenueOverview = {
  data: [
    { month: 11, year: 2025, label: 'Nov', total_revenue: 3665.0 },
    { month: 12, year: 2025, label: 'Dec', total_revenue: 7000.0 },
    { month: 1, year: 2026, label: 'Jan', total_revenue: 4310.0 },
    { month: 2, year: 2026, label: 'Feb', total_revenue: 5940.0 },
    { month: 3, year: 2026, label: 'Mar', total_revenue: 6790.0 },
    { month: 4, year: 2026, label: 'Apr', total_revenue: 8350.0 },
  ],
};

const mockDashboardMetrics = {
  total_reservations: 28,
  monthly_revenue: 8350.0,
  avg_daily_revenue: 278.33,
  revenue_trend_pct: 23.0,
  today_checkins: 2,
  today_checkouts: 1,
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

// Route ordering: register the GENERIC `incoming**` pattern FIRST so it is checked LAST
// (Playwright matches routes LIFO — last registered, first checked).
// The specific `incoming/csv` route is registered SECOND so it is checked FIRST on CSV requests.
async function mockReportsApis(page: Page): Promise<void> {
  await page.route('**/incomings-report/api/reports/incoming**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockIncomingReport),
    });
  });

  await page.route('**/incomings-report/api/reports/incoming/csv', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/csv; charset=utf-8',
      body: '﻿Date,Booking Code,Gross Rate,Taxes (7.5%),TravelHub Commission (5%),Net Income,Status\n2026-04-07,bk000001,1750.00,131.25,87.50,1531.25,CONFIRMED\n',
    });
  });

  await page.route('**/incomings-report/api/reports/revenue-overview**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRevenueOverview),
    });
  });

  await page.route('**/incomings-report/api/reports/dashboard-metrics', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDashboardMetrics),
    });
  });
}

test.describe('Portal Hoteles — reports page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockReportsApis(page);
  });

  test('shows KPI cards with values from dashboard-metrics API', async ({ page }) => {
    await page.goto('/reports');

    await expect(page.getByText('Avg. Daily Revenue')).toBeVisible();
    await expect(page.getByText('Monthly Revenue')).toBeVisible();
    await expect(page.getByText('$278')).toBeVisible();
    await expect(page.getByText('$8,350')).toBeVisible();
    // Trend label appears once per KPI card — use first() to avoid strict-mode violation.
    await expect(page.getByText('+23.0% from previous month').first()).toBeVisible();
  });

  test('shows report table with records from incoming API', async ({ page }) => {
    await page.goto('/reports');

    await expect(page.getByRole('cell', { name: '#bk000001' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '#bk000002' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '#bk000003' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'PAY-APR-001' })).toBeVisible();
    // CONFIRMED appears in two rows — pick the first for visibility.
    await expect(page.getByText('CONFIRMED').first()).toBeVisible();
    await expect(page.getByText('PENDING')).toBeVisible();
  });

  test('shows empty state when no report records', async ({ page }) => {
    await page.route('**/incomings-report/api/reports/incoming**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ records: [], total_records: 0, total_gross: 0, total_net: 0 }),
      });
    });

    await page.goto('/reports');

    await expect(page.getByText('No revenue transactions available.')).toBeVisible();
  });

  test('shows error state when incoming API fails', async ({ page }) => {
    await page.route('**/incomings-report/api/reports/incoming**', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Server error"}' });
    });

    await page.goto('/reports');

    await expect(page.getByText('Unable to load report data.')).toBeVisible();
  });

  test('Excel button triggers CSV request to backend', async ({ page }) => {
    await page.goto('/reports');
    // Wait for the report rows to render so the Excel button is interactable.
    await expect(page.getByRole('cell', { name: '#bk000001' })).toBeVisible();

    // Using createObjectURL + synthetic anchor click does not fire Playwright's download event.
    // Instead verify that the Angular HttpClient makes the correct network request to the backend.
    const csvRequestPromise = page.waitForRequest(/\/incomings-report\/api\/reports\/incoming\/csv/);
    await page.getByRole('button', { name: 'Excel' }).click();
    const csvRequest = await csvRequestPromise;

    expect(csvRequest.url()).toContain('/incomings-report/api/reports/incoming/csv');
  });

  test('shows correct table columns for financial data', async ({ page }) => {
    await page.goto('/reports');

    await expect(page.getByRole('columnheader', { name: 'Booking Code' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Payment Ref' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Gross Value' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Net Income' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  });
});

test.describe('Portal Hoteles — dashboard KPI metrics', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockReportsApis(page);

    await page.route('**/booking/api/booking/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
  });

  test('shows live total reservations count from API', async ({ page }) => {
    await page.goto('/dashboard');

    const reservationsCard = page
      .locator('portal-hoteles-grid-card')
      .filter({ hasText: 'Total Reservations' });
    await expect(reservationsCard.locator('.portal-hoteles-dashboard-card__value')).toHaveText('28');
  });

  test('shows live monthly revenue from API', async ({ page }) => {
    await page.goto('/dashboard');

    const revenueCard = page
      .locator('portal-hoteles-grid-card')
      .filter({ hasText: 'Monthly Revenue' });
    await expect(revenueCard.locator('.portal-hoteles-dashboard-card__value')).toHaveText('$8,350');
  });

  test('shows live check-in and check-out counts', async ({ page }) => {
    await page.goto('/dashboard');

    const checkinsCard = page.locator('portal-hoteles-grid-card').filter({ hasText: "Today's Check-ins" });
    await expect(checkinsCard.locator('.portal-hoteles-dashboard-card__value')).toHaveText('2');

    const checkoutsCard = page.locator('portal-hoteles-grid-card').filter({ hasText: "Today's Check-outs" });
    await expect(checkoutsCard.locator('.portal-hoteles-dashboard-card__value')).toHaveText('1');
  });

  test('shows dash placeholders when metrics API fails', async ({ page }) => {
    await page.route('**/incomings-report/api/reports/dashboard-metrics', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"error"}' });
    });

    await page.goto('/dashboard');

    const reservationsCard = page
      .locator('portal-hoteles-grid-card')
      .filter({ hasText: 'Total Reservations' });
    await expect(reservationsCard.locator('.portal-hoteles-dashboard-card__value')).toHaveText('—');
  });
});
