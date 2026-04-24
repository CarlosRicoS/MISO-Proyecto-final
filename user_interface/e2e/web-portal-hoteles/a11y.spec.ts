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
      window.sessionStorage.setItem('th_auth_session', JSON.stringify(loginResponse));
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
});
