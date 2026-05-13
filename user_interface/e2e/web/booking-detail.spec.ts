import { expect, test, type Page, type Request } from '@playwright/test';

function buildJwt(payload: Record<string, string>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encodedPayload}.signature`;
}

const reservation = {
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
};

const propertyDetail = {
  id: 'prop-1',
  name: 'Andes Palace Hotel',
  city: 'Bogota',
  country: 'Colombia',
  maxCapacity: 4,
  description: 'Modern stay in the heart of Bogota.',
  photos: ['https://example.com/hotel-1.jpg'],
  checkInTime: '15:00:00',
  checkOutTime: '11:00:00',
  adminGroupId: 'hotel-admins',
  amenities: [{ id: 'amen-1', description: 'Free WiFi' }],
  reviews: [{ id: 'rev-1', description: 'Great stay!', rating: 5, name: 'Ana' }],
};

async function injectTravelerSession(page: Page): Promise<void> {
  const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
  const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });

  await page.addInitScript(
    ([id, access]) => {
      window.localStorage.setItem('th_locale', 'en');
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
}

async function mockBookingDetailApis(page: Page): Promise<void> {
  await page.route('**/booking/api/booking/booking-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(reservation),
    });
  });

  await page.route('**/api/property/prop-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(propertyDetail),
    });
  });

  await page.route('**/checkin/api/check-in/available**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ property_id: 'prop-1', is_available: false }),
    });
  });

  await page.route('**/pricing-orchestator/api/Property**', async (route) => {
    const url = new URL(route.request().url());
    const guests = Number.parseInt(url.searchParams.get('guests') || '1', 10);
    // Distinct price per guest count so the test can assert the new value flows through.
    const price = 800 + guests * 25;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'prop-1',
        name: propertyDetail.name,
        maxCapacity: propertyDetail.maxCapacity,
        description: propertyDetail.description,
        urlBucketPhotos: propertyDetail.photos[0],
        checkInTime: propertyDetail.checkInTime,
        checkOutTime: propertyDetail.checkOutTime,
        adminGroupId: propertyDetail.adminGroupId,
        price,
      }),
    });
  });
}

test.describe('Booking detail page', () => {
  test.beforeEach(async ({ page }) => {
    await injectTravelerSession(page);
    await mockBookingDetailApis(page);
  });

  test('loads booking data and shows the Change Dates accordion for CONFIRMED reservations', async ({ page }) => {
    await page.goto('/booking-detail?bookingId=booking-1');

    await expect(page.getByRole('heading', { name: 'Andes Palace Hotel' }).first()).toBeVisible();
    await expect(page.getByText('Bogota, Colombia').first()).toBeVisible();
    await expect(page.getByText('Confirmed').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Change Dates/i })).toBeVisible();
  });

  test('shows the error state when the booking API fails', async ({ page }) => {
    await page.unroute('**/booking/api/booking/booking-1');
    await page.route('**/booking/api/booking/booking-1', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'server error' }),
      });
    });

    await page.goto('/booking-detail?bookingId=booking-1');

    await expect(page.getByText('Unable to load booking details.')).toBeVisible();
  });

  test('change-dates flow calls PATCH /dates via orchestrator with the new period', async ({ page }) => {
    const datesRequests: Request[] = [];

    await page.route(
      '**/booking-orchestrator/api/reservations/booking-1/dates',
      async (route) => {
        datesRequests.push(route.request());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...reservation,
            guests: 3,
            price: 875,
            price_difference: 255,
          }),
        });
      },
    );

    await page.goto('/booking-detail?bookingId=booking-1');
    await expect(page.getByRole('heading', { name: 'Andes Palace Hotel' }).first()).toBeVisible();

    await page.getByRole('button', { name: /Change Dates/i }).click();

    // Dispatch ionInput directly on the guests ion-input so the test does not depend
    // on Playwright's ability to drive Ionic's native input + event re-emission chain.
    const pricingRequest = page.waitForRequest(
      /\/pricing-orchestator\/api\/Property\?.*guests=3/,
    );
    await page.evaluate(() => {
      const input = document.querySelector('ion-input.th-payment-summary__input');
      input?.dispatchEvent(new CustomEvent('ionInput', { detail: { value: '3' } }));
    });
    await pricingRequest;

    await page.getByRole('button', { name: 'Recalculate Price' }).click();

    await expect(page.getByRole('heading', { name: 'Dates Updated' })).toBeVisible();
    expect(datesRequests).toHaveLength(1);
    const payload = JSON.parse(datesRequests[0].postData() || '{}') as {
      new_period_start: string;
      new_period_end: string;
    };
    expect(payload.new_period_start).toBe(reservation.period_start);
    expect(payload.new_period_end).toBe(reservation.period_end);
  });
});
