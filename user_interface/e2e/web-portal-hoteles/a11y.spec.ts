import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
];

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
    },
    [idToken, accessToken],
  );
}

async function mockBookingApi(page: Page): Promise<void> {
  await page.route('**/booking/api/booking**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(reservations),
    });
  });
}

const pricingPropertyResponse = {
  id: '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33',
  name: 'Stub Property',
  city: 'Bogota',
  country: 'Colombia',
  price: 240,
  maxCapacity: 4,
  description: 'Stub property used to populate the pricing-configuration page.',
  urlBucketPhotos: '',
  checkInTime: '14:00',
  checkOutTime: '11:00',
  adminGroupId: 'hotel-admins',
};

async function mockPricingApi(page: Page): Promise<void> {
  // PricingEngineService tries pricing-engine first, then falls back to pricing-orchestator.
  // Stubbing the pricing-engine endpoint is sufficient because the page uses whichever resolves first.
  const fulfill = async (route: Parameters<Parameters<Page['route']>[1]>[0]) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pricingPropertyResponse),
    });
  };
  await page.route('**/pricing-engine/api/PropertyPrice**', fulfill);
  await page.route('**/pricing-orchestator/api/Property**', fulfill);
}

const incomingReportResponse = {
  records: [
    {
      id: 'report-001',
      booking_id: 'booking-1',
      payment_reference: 'PAY-001',
      payment_date: '2026-04-01',
      gross_value: 1000,
      taxes: 75,
      commission: 50,
      net_income: 875,
      status: 'CONFIRMED',
    },
  ],
  total_records: 1,
  total_gross: 1000,
  total_net: 875,
};

const revenueOverviewResponse = {
  data: [
    { month: 1, year: 2026, label: 'Jan 2026', total_revenue: 12000 },
    { month: 2, year: 2026, label: 'Feb 2026', total_revenue: 15000 },
  ],
};

const dashboardMetricsResponse = {
  total_reservations: 12,
  monthly_revenue: 18500,
  avg_daily_revenue: 620,
  revenue_trend_pct: 12.5,
  today_checkins: 3,
  today_checkouts: 2,
};

async function mockReportsApi(page: Page): Promise<void> {
  await page.route('**/incomings-report/api/reports/incoming**', async (route) => {
    const url = route.request().url();
    if (url.includes('/incoming/csv')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv; charset=utf-8',
        body: 'date,booking,amount\n',
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(incomingReportResponse),
    });
  });

  await page.route('**/incomings-report/api/reports/revenue-overview**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(revenueOverviewResponse),
    });
  });

  await page.route('**/incomings-report/api/reports/dashboard-metrics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dashboardMetricsResponse),
    });
  });
}

function buildViolationSummary(violations: { id: string; impact: string | null | undefined; nodes: { html: string }[] }[]): string {
  return violations
    .map((v) => `[${v.impact ?? 'unknown'}] ${v.id}: ${v.nodes[0]?.html ?? ''}`)
    .join('\n');
}

test.describe('Accessibility — portal-hoteles (AC-42)', () => {
  test('login page has no axe violations', async ({ page }) => {
    await page.goto('/login');

    const results = await new AxeBuilder({ page }).analyze();

    if (results.violations.length > 0) {
      const summary = buildViolationSummary(results.violations);
      expect(results.violations, `Axe violations found on portal-hoteles /login:\n${summary}`).toHaveLength(0);
    }

    expect(results.violations).toHaveLength(0);
  });

  test('dashboard page has no axe violations (authenticated)', async ({ page }) => {
    await injectAuthSession(page);
    await mockBookingApi(page);
    await page.goto('/dashboard');

    // Wait for the reservation table or fallback content
    await page
      .waitForSelector('.portal-hoteles-dashboard-table, .portal-hoteles-dashboard__empty', { timeout: 10000 })
      .catch(() => {
        // Continue axe scan even if neither selector appeared
      });

    const results = await new AxeBuilder({ page }).analyze();

    if (results.violations.length > 0) {
      const summary = buildViolationSummary(results.violations);
      expect(results.violations, `Axe violations found on portal-hoteles /dashboard:\n${summary}`).toHaveLength(0);
    }

    expect(results.violations).toHaveLength(0);
  });

  test('pricing page has no axe violations (authenticated) (AC-14, AC-15)', async ({ page }) => {
    await injectAuthSession(page);
    await mockPricingApi(page);
    await page.goto('/pricing');

    // Wait for the pricing table or its fallback message to render before scanning
    await page
      .waitForSelector(
        'table.portal-hoteles-pricing-table, p.portal-hoteles-pricing-table__message',
        { timeout: 10000 },
      )
      .catch(() => {
        // Continue axe scan even if neither selector appeared
      });

    const results = await new AxeBuilder({ page }).analyze();

    if (results.violations.length > 0) {
      const summary = buildViolationSummary(results.violations);
      expect(results.violations, `Axe violations found on portal-hoteles /pricing:\n${summary}`).toHaveLength(0);
    }

    expect(results.violations).toHaveLength(0);
  });

  test('reports page has no axe violations (authenticated) (AC-14, AC-15)', async ({ page }) => {
    await injectAuthSession(page);
    await mockReportsApi(page);
    await page.goto('/reports');

    // Wait for either the reports table or its fallback empty/loading paragraph to render
    await page
      .waitForSelector(
        'table.portal-hoteles-reports-table, p.portal-hoteles-reports-table__message',
        { timeout: 10000 },
      )
      .catch(() => {
        // Continue axe scan even if neither selector appeared
      });

    const results = await new AxeBuilder({ page }).analyze();

    if (results.violations.length > 0) {
      const summary = buildViolationSummary(results.violations);
      expect(results.violations, `Axe violations found on portal-hoteles /reports:\n${summary}`).toHaveLength(0);
    }

    expect(results.violations).toHaveLength(0);
  });
});
