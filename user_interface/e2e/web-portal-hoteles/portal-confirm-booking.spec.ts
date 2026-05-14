import { expect, test, type Page } from '@playwright/test';

// Gherkin coverage — confirm-booking.feature
// - "Confirmar una reserva pendiente exitosamente"  (PENDING -> CONFIRMED via admin-confirm)
// - "Confirmar una reserva aprobada cuando aplique" (APPROVED -> CONFIRMED via admin-confirm)
// - "Evitar confirmar dos veces la misma reserva"   (already CONFIRMED: Accept button disabled)

function buildJwt(payload: Record<string, string>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encodedPayload}.signature`;
}

const idToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });
const accessToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });

const reservations = [
  {
    id: 'res-pending-001',
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
    id: 'res-approved-001',
    property_id: 'prop-1',
    user_id: 'traveler-2',
    guests: 1,
    period_start: '2026-08-20',
    period_end: '2026-08-22',
    price: 320,
    status: 'APPROVED',
    admin_group_id: 'hotel-admins',
    payment_reference: null,
    created_at: '2026-07-02T10:00:00Z',
  },
  {
    id: 'res-confirmed-001',
    property_id: 'prop-2',
    user_id: 'traveler-3',
    guests: 2,
    period_start: '2026-09-03',
    period_end: '2026-09-05',
    price: 280,
    status: 'CONFIRMED',
    admin_group_id: 'hotel-admins',
    payment_reference: 'pay-001',
    created_at: '2026-07-03T14:30:00Z',
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

async function mockBookingApis(page: Page): Promise<void> {
  await page.route('**/booking/api/booking/**', async (route) => {
    const url = new URL(route.request().url());
    const pathSegments = url.pathname.replace(/\/$/, '').split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];

    if (lastSegment && lastSegment !== 'booking' && !lastSegment.includes('admin')) {
      const reservation = reservations.find((r) => r.id === lastSegment);
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

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(reservations),
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

test.describe('Portal Hoteles — confirm booking (admin-confirm)', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockBookingApis(page);
    await mockPropertyDetailApi(page);
  });

  test('confirms a PENDING reservation successfully', async ({ page }) => {
    let capturedUrl = '';
    await page.route(/\/booking-orchestrator\/api\/reservations\/[^/]+\/admin-confirm$/, async (route) => {
      capturedUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'res-pending-001',
          status: 'CONFIRMED',
          payment_reference: 'ADMIN-ABCD1234',
        }),
      });
    });

    await page.goto('/dashboard/res-pending-001');
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();

    const acceptButton = page.getByRole('button', { name: 'Accept' });
    await expect(acceptButton).toBeEnabled();
    await acceptButton.click();

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(capturedUrl).toContain('/booking-orchestrator/api/reservations/res-pending-001/admin-confirm');
  });

  test('confirms an APPROVED reservation when policy applies', async ({ page }) => {
    await page.route(/\/booking-orchestrator\/api\/reservations\/[^/]+\/admin-confirm$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'res-approved-001',
          status: 'CONFIRMED',
          payment_reference: 'ADMIN-XYZ',
        }),
      });
    });

    await page.goto('/dashboard/res-approved-001');
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();

    const acceptButton = page.getByRole('button', { name: 'Accept' });
    // APPROVED is not 'confirmed' nor terminal — the Accept button must be enabled.
    await expect(acceptButton).toBeEnabled();
    await acceptButton.click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('prevents confirming an already-CONFIRMED reservation (idempotency via disabled button)', async ({ page }) => {
    await page.goto('/dashboard/res-confirmed-001');
    await expect(page.getByText('Coffee Hills Lodge')).toBeVisible();
    await expect(page.getByText('Confirmed')).toBeVisible();

    const acceptButton = page.getByRole('button', { name: 'Accept' });
    await expect(acceptButton).toBeDisabled();
  });
});
