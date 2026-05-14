import { expect, test, type Page } from '@playwright/test';

function buildJwt(payload: Record<string, string>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encodedPayload}.signature`;
}

const confirmedReservation = {
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

const pendingReservation = { ...confirmedReservation, id: 'booking-pending', status: 'PENDING' };

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
  reviews: [],
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

async function mockApis(
  page: Page,
  options: { reservation: typeof confirmedReservation; available: boolean },
): Promise<void> {
  await page.route(`**/booking/api/booking/${options.reservation.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options.reservation),
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
      body: JSON.stringify({ property_id: 'prop-1', is_available: options.available }),
    });
  });

  await page.route('**/pricing-orchestator/api/Property**', async (route) => {
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
        price: 620,
      }),
    });
  });
}

test.describe('Digital check-in (web)', () => {
  test.beforeEach(async ({ page }) => {
    await injectTravelerSession(page);
  });

  test('availability endpoint is queried when viewing a CONFIRMED booking', async ({ page }) => {
    let availabilityCalled = false;
    await page.route('**/checkin/api/check-in/available**', async (route) => {
      availabilityCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ property_id: 'prop-1', is_available: true }),
      });
    });

    await mockApis(page, { reservation: confirmedReservation, available: true });
    await page.goto('/booking-detail?bookingId=booking-1');

    await expect(page.getByRole('heading', { name: 'Andes Palace Hotel' }).first()).toBeVisible();
    await expect.poll(() => availabilityCalled).toBe(true);
  });

  test('booking detail loads cleanly for a non-CONFIRMED booking (check-in unavailable)', async ({
    page,
  }) => {
    await mockApis(page, { reservation: pendingReservation, available: false });

    await page.goto('/booking-detail?bookingId=booking-pending');

    await expect(page.getByRole('heading', { name: 'Andes Palace Hotel' }).first()).toBeVisible();
    // No "Confirmed" label since status is PENDING
    await expect(page.getByText('Confirmed').first()).toHaveCount(0);
  });

  // The successful end-to-end check-in flow scans a QR code via @capacitor/barcode-scanner —
  // that plugin is not available in the Playwright web context and cannot be triggered without
  // a native camera. The Espresso suite covers this on Android. WireMock stubs for
  // /checkin/api/check-in/available + /checkin/api/check-in/ are documented below.
  test.skip('TODO: digital-checkin.feature — successful check-in via QR (booking -> COMPLETED) — requires @capacitor/barcode-scanner, run from Espresso suite', () => {});
  test.skip('TODO: digital-checkin.feature — reject check-in when booking is not CONFIRMED — server-side guard exercised in checkin service tests', () => {});
});
