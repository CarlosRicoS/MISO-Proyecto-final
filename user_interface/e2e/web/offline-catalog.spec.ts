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

async function mockPropertyApis(page: Page): Promise<void> {
  await page.route('**/pricing-orchestator/api/Property**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'hotel-1',
        name: 'Andes Palace Hotel',
        maxCapacity: 4,
        description: 'Test',
        urlBucketPhotos: 'https://example.com/hotel-1.jpg',
        checkInTime: '15:00:00',
        checkOutTime: '11:00:00',
        adminGroupId: 'hotel-admins',
        price: 420,
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
        body: JSON.stringify({
          id: 'hotel-1',
          name: 'Andes Palace Hotel',
          city: 'Bogota',
          country: 'Colombia',
          maxCapacity: 4,
          description: 'Test',
          photos: ['https://example.com/hotel-1.jpg'],
          checkInTime: '15:00:00',
          checkOutTime: '11:00:00',
          adminGroupId: 'hotel-admins',
          amenities: [],
          reviews: [],
        }),
      });
      return;
    }
    await route.fallback();
  });
}

test.describe('Offline catalog (web)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('th_locale', 'en');
    });
  });

  test('catalog request errors gracefully when the browser is offline', async ({ page, context }) => {
    await mockPropertyApis(page);

    // Seed by loading once online so any in-memory caches are populated
    await page.goto('/search-results?city=Bogota');
    await expect(page.getByText('1 hotel found')).toBeVisible();

    // Now disconnect and reload — the app should not crash and should surface an error
    // state (search-results renders "Unable to load hotels." on failure).
    await context.setOffline(true);
    await page.reload();

    await expect(page.locator('ion-content')).toBeVisible();
    // Either the cached list is still rendered OR an error message is shown; both are acceptable.
    const errorVisible = await page
      .getByText(/Unable to load hotels|hotels found/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBe(true);

    await context.setOffline(false);
  });

  // The current TravelHub web app caches images via ImageCacheService but does NOT cache the
  // catalog or property-detail JSON payloads. There is no offline catalog UI, no offline
  // empty-state message, and no offline detail page — search-results simply renders its
  // "Unable to load hotels." error when the API request fails. The scenarios below are
  // documented for Gherkin coverage and will be enabled once an offline catalog is built.
  test.skip('TODO: offline-catalog.feature — show cached properties in search results when offline — no catalog cache implemented', () => {});
  test.skip('TODO: offline-catalog.feature — open cached property detail offline — no property cache implemented', () => {});
  test.skip('TODO: offline-catalog.feature — see name/location/estimated price offline — depends on catalog cache', () => {});
  test.skip('TODO: offline-catalog.feature — empty-state message when cache empty and offline — no offline empty-state', () => {});
  test.skip('TODO: offline-catalog.feature — previously loaded properties remain visible if connection drops mid-navigation — no offline navigation cache', () => {});
});
