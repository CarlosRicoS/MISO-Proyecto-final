import { expect, test, type Page } from '@playwright/test';

type HotelApiRecord = {
  id: string;
  name: string;
  city: string;
  country: string;
  pricePerNight: number;
  currency: string;
  rating: number;
  imageUrl: string;
};

const mockedHotels: HotelApiRecord[] = [
  {
    id: 'hotel-1',
    name: 'Andes Palace Hotel',
    city: 'Bogota',
    country: 'Colombia',
    pricePerNight: 420,
    currency: '$',
    rating: 4.8,
    imageUrl: 'https://example.com/hotel-1.jpg',
  },
];

const mockedPropertyDetail = {
  id: 'hotel-1',
  name: 'Andes Palace Hotel',
  maxCapacity: 4,
  description: 'Modern stay in the heart of Bogota.',
  photos: ['https://example.com/hotel-1.jpg'],
  checkInTime: '15:00:00',
  checkOutTime: '11:00:00',
  adminGroupId: 'hotel-admins',
  amenities: [{ id: 'amen-1', description: 'Free WiFi' }],
  reviews: [{ id: 'rev-1', description: 'Great stay!', rating: 5, name: 'Ana' }],
};

function buildJwt(payload: Record<string, string>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encodedPayload}.signature`;
}

async function mockPropertyApis(page: Page): Promise<void> {
  await page.route('**/pricing-orchestator/api/Property**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const propertyId = requestUrl.searchParams.get('propertyId') || 'unknown';
    const matchedHotel = mockedHotels.find((h) => h.id === propertyId);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: propertyId,
        name: matchedHotel?.name || 'Hotel',
        maxCapacity: 4,
        description: 'Test property',
        urlBucketPhotos: matchedHotel?.imageUrl || '',
        checkInTime: '15:00:00',
        checkOutTime: '11:00:00',
        adminGroupId: 'hotel-admins',
        price: matchedHotel?.pricePerNight || 100,
      }),
    });
  });

  await page.route('**/api/property**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;

    if (path.endsWith('/api/property')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockedHotels),
      });
      return;
    }

    if (path.includes('/api/property/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockedPropertyDetail),
      });
      return;
    }

    await route.fallback();
  });
}

async function injectTravelerSession(page: Page): Promise<void> {
  const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
  const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });

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

test.describe('Property detail — booking error paths', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('th_locale', 'en');
    });
    await mockPropertyApis(page);
  });

  test('unauthenticated Book Now redirects to /login with returnUrl', async ({ page }) => {
    await page.goto(
      '/search-results?city=Bogota&startDate=2026-05-10&endDate=2026-05-12&capacity=2',
    );
    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(page).toHaveURL(/\/propertydetail\/hotel-1/);
    await page.getByRole('button', { name: 'Book Now' }).click();

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fpropertydetail%2Fhotel-1/);
  });

  test('409 property_unavailable shows the unavailable error popup', async ({ page }) => {
    await injectTravelerSession(page);

    await page.route('**/booking-orchestrator/api/reservations', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'property_unavailable' }),
      });
    });

    await page.goto(
      '/search-results?city=Bogota&startDate=2026-05-10&endDate=2026-05-12&capacity=2',
    );
    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(page).toHaveURL(/\/propertydetail\/hotel-1/);
    await page.getByRole('button', { name: 'Book Now' }).click();

    await expect(page.getByText('Booking Error')).toBeVisible();
    await expect(
      page.getByText('This property is no longer available. Please select another property.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/propertydetail\/hotel-1/);
  });

  test('5xx orchestrator failure shows the generic error popup', async ({ page }) => {
    await injectTravelerSession(page);

    await page.route('**/booking-orchestrator/api/reservations', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'internal_error' }),
      });
    });

    await page.goto(
      '/search-results?city=Bogota&startDate=2026-05-10&endDate=2026-05-12&capacity=2',
    );
    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(page).toHaveURL(/\/propertydetail\/hotel-1/);
    await page.getByRole('button', { name: 'Book Now' }).click();

    await expect(page.getByText('Booking Error')).toBeVisible();
    await expect(page.getByText('internal_error')).toBeVisible();
    await expect(page).toHaveURL(/\/propertydetail\/hotel-1/);
  });
});
