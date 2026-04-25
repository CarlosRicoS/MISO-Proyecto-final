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
  {
    id: 'hotel-2',
    name: 'Caribe Sunset Resort',
    city: 'Cartagena',
    country: 'Colombia',
    pricePerNight: 280,
    currency: '$',
    rating: 4.4,
    imageUrl: 'https://example.com/hotel-2.jpg',
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

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Not found' }),
    });
  });
}

async function triggerInfiniteScrollLoad(page: Page): Promise<void> {
  await page.evaluate(() => {
    const infinite = document.querySelector('ion-infinite-scroll');
    infinite?.dispatchEvent(new CustomEvent('ionInfinite', { bubbles: true, composed: true }));
  });
}

test.describe('TravelHub core journeys', () => {
  test.beforeEach(async ({ page }) => {
    await mockPropertyApis(page);
  });

  test('home page shows hero and recommended hotels', async ({ page }) => {
    await page.goto('/home');

    await expect(page.getByRole('heading', { name: 'Find Your Perfect Stay' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recommended Hotels' })).toBeVisible();
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();
    await expect(page.getByText('Caribe Sunset Resort')).toBeVisible();
  });

  test('search flow navigates to results with query params', async ({ page }) => {
    await page.goto('/home');

    await page.getByPlaceholder('Where are you going?').fill('Bogota');
    await page.getByPlaceholder('1 Guest').fill('2');
    await page.getByRole('button', { name: 'Search Hotels' }).click();

    await expect(page).toHaveURL(/\/search-results/);
    await expect(page).toHaveURL(/city=Bogota/);
    await expect(page).toHaveURL(/capacity=2/);
    await expect(page.getByText('2 hotels found')).toBeVisible();
  });

  test('view details loads property detail data', async ({ page }) => {
    await page.goto('/search-results?city=Bogota');

    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(page).toHaveURL(/\/propertydetail\/hotel-1/);
    await expect(page.getByRole('heading', { level: 1, name: 'Andes Palace Hotel' })).toBeVisible();
    await expect(page.getByText('Free WiFi').first()).toBeVisible();
    await expect(page.getByText('Book Now').first()).toBeVisible();
  });

  test('book now success redirects to booking list', async ({ page }) => {
    const idToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });
    const accessToken = buildJwt({ email: 'traveler@example.com', sub: 'user-123' });

    await page.addInitScript(([id, access]) => {
      const loginResponse = {
        id_token: id,
        access_token: access,
        refresh_token: 'refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      window.sessionStorage.setItem('th_auth_session', JSON.stringify(loginResponse));
    }, [idToken, accessToken]);

    await page.route('**/booking-orchestrator/api/reservations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reservation_id: 'r-1' }),
      });
    });

    await page.route('**/booking/api/booking**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/search-results?city=Bogota&startDate=2026-05-10&endDate=2026-05-12&capacity=2');
    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(page).toHaveURL(/\/propertydetail\//);
    await page.getByRole('button', { name: 'Book Now' }).click();

    await expect(page.getByText('Reservation Created')).toBeVisible();
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page).toHaveURL(/\/booking-list/);
  });

  test('search results shows empty state for no matches', async ({ page }) => {
    await page.route('**/api/property**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const path = requestUrl.pathname;

      if (!path.endsWith('/api/property')) {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/search-results?city=NoMatchCity');

    await expect(page.getByText('0 hotels found')).toBeVisible();
    await expect(page.getByText('Page 1')).toBeVisible();
    await expect(page.getByText('No hotels available for this search.')).toBeVisible();
  });

  test('search results loads more hotels when scrolling down', async ({ page }) => {
    await page.route('**/api/property**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const path = requestUrl.pathname;

      if (!path.endsWith('/api/property')) {
        await route.fallback();
        return;
      }

      const pageParam = Number.parseInt(requestUrl.searchParams.get('page') ?? '0', 10);
      const sizeParam = Number.parseInt(requestUrl.searchParams.get('size') ?? '10', 10);
      const pageIndex = Number.isNaN(pageParam) ? 0 : pageParam;
      const pageSize = Number.isNaN(sizeParam) ? 10 : sizeParam;

      const allHotels = Array.from({ length: 30 }, (_, index) => ({
        id: `hotel-${index + 1}`,
        name: `Infinite Hotel ${index + 1}`,
        city: 'Bogota',
        country: 'Colombia',
        pricePerNight: 120 + index,
        currency: '$',
        rating: 4.2,
        imageUrl: `https://example.com/hotel-${index + 1}.jpg`,
      }));

      const start = pageIndex * pageSize;
      const end = start + pageSize;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(allHotels.slice(start, end)),
      });
    });

    await page.goto('/search-results?city=Bogota');

    await expect(page.getByText('10 hotels found')).toBeVisible();
    await expect(page.getByText('Infinite Hotel 10')).toBeVisible();

    await page.evaluate(() => {
      const content = document.querySelector('ion-content');
      const scrollContainer = content?.shadowRoot?.querySelector('.inner-scroll') as HTMLElement | null;
      scrollContainer?.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'instant' as ScrollBehavior });
    });

    await expect(page.getByRole('heading', { name: 'Infinite Hotel 20', exact: true })).toBeVisible();
    await expect(page.getByText('20 hotels found')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Infinite Hotel 1', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Infinite Hotel 20', exact: true })).toHaveCount(1);

    await page.evaluate(() => {
      const content = document.querySelector('ion-content');
      const scrollContainer = content?.shadowRoot?.querySelector('.inner-scroll') as HTMLElement | null;
      scrollContainer?.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'instant' as ScrollBehavior });
    });

    await page.evaluate(() => {
      const infinite = document.querySelector('ion-infinite-scroll');
      infinite?.dispatchEvent(new CustomEvent('ionInfinite', { bubbles: true, composed: true }));
    });

    await expect(page.getByRole('heading', { name: 'Infinite Hotel 30', exact: true })).toBeVisible();
    await expect(page.getByText('20 hotels found')).toBeVisible();
    await expect(page.getByText('Infinite Hotel 11')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Infinite Hotel 30', exact: true })).toHaveCount(1);

    await page.evaluate(() => {
      const content = document.querySelector('ion-content');
      const scrollContainer = content?.shadowRoot?.querySelector('.inner-scroll') as HTMLElement | null;
      scrollContainer?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });

    await expect(page.getByRole('heading', { name: 'Infinite Hotel 1', exact: true })).toBeVisible();
  });

  test('search results can advance beyond 3 pages', async ({ page }) => {
    let highestRequestedPage = 0;

    await page.route('**/api/property**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const path = requestUrl.pathname;

      if (!path.endsWith('/api/property')) {
        await route.fallback();
        return;
      }

      const pageParam = Number.parseInt(requestUrl.searchParams.get('page') ?? '0', 10);
      const sizeParam = Number.parseInt(requestUrl.searchParams.get('size') ?? '10', 10);
      const pageIndex = Number.isNaN(pageParam) ? 0 : pageParam;
      const pageSize = Number.isNaN(sizeParam) ? 10 : sizeParam;

      highestRequestedPage = Math.max(highestRequestedPage, pageIndex);

      const allHotels = Array.from({ length: 70 }, (_, index) => ({
        id: `hotel-${index + 1}`,
        name: `Infinite Hotel ${index + 1}`,
        city: 'Bogota',
        country: 'Colombia',
        pricePerNight: 120 + index,
        currency: '$',
        rating: 4.2,
        imageUrl: `https://example.com/hotel-${index + 1}.jpg`,
      }));

      const start = pageIndex * pageSize;
      const end = start + pageSize;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(allHotels.slice(start, end)),
      });
    });

    await page.goto('/search-results?city=Bogota');
    await expect(page.getByText('10 hotels found')).toBeVisible();

    for (let i = 0; i < 4; i += 1) {
      const expectedPage = i + 1;
      const pageBoundaryHotelHeading = page.getByRole('heading', {
        name: `Infinite Hotel ${(expectedPage + 1) * 10}`,
        exact: true,
      });

      await triggerInfiniteScrollLoad(page);

      await expect
        .poll(() => highestRequestedPage, {
          message: `Expected API page ${expectedPage} to be requested`,
        })
        .toBeGreaterThanOrEqual(expectedPage);

      await expect(pageBoundaryHotelHeading).toBeVisible({ timeout: 10000 });
    }

    await expect(page.getByText('20 hotels found')).toBeVisible();
    await expect(page.getByText(/Pages \d+-\d+/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Infinite Hotel 31', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Infinite Hotel 50', exact: true })).toHaveCount(1);
  });

  test('search results sends query params to API request', async ({ page }) => {
    let firstRequestUrl = '';

    await page.route('**/api/property**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const path = requestUrl.pathname;

      if (!path.endsWith('/api/property')) {
        await route.fallback();
        return;
      }

      if (!firstRequestUrl) {
        firstRequestUrl = requestUrl.toString();
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockedHotels),
      });
    });

    await page.goto('/search-results?city=Medellin&startDate=2026-05-10&endDate=2026-05-12&capacity=3');

    await expect(page.getByText('2 hotels found')).toBeVisible();
    await expect(page.getByText('Page 1')).toBeVisible();

    expect(firstRequestUrl).not.toBe('');
    if (!firstRequestUrl) {
      throw new Error('Expected the search results endpoint to be called at least once.');
    }

    const capturedUrl = new URL(firstRequestUrl);

    expect(capturedUrl.searchParams.get('city')).toBe('Medellin');
    expect(capturedUrl.searchParams.get('startDate')).toBe('2026-05-10');
    expect(capturedUrl.searchParams.get('endDate')).toBe('2026-05-12');
    expect(capturedUrl.searchParams.get('capacity')).toBe('3');
    expect(capturedUrl.searchParams.get('page')).toBe('0');
    expect(capturedUrl.searchParams.get('size')).toBe('10');
  });

  test('search results renders singular count for one hotel', async ({ page }) => {
    await page.route('**/api/property**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const path = requestUrl.pathname;

      if (!path.endsWith('/api/property')) {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockedHotels[0]]),
      });
    });

    await page.goto('/search-results?city=Bogota');

    await expect(page.getByText('1 hotel found')).toBeVisible();
    await expect(page.getByText('Page 1')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Andes Palace Hotel', exact: true })).toBeVisible();
  });

  test('search results shows error message when hotels API fails', async ({ page }) => {
    await page.route('**/api/property**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const path = requestUrl.pathname;

      if (!path.endsWith('/api/property')) {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error' }),
      });
    });

    await page.goto('/search-results?city=Bogota');

    await expect(page.getByText('Unable to load hotels.')).toBeVisible();
    await expect(page.getByText('No hotels available for this search.')).not.toBeVisible();
  });

  test('view details stays on page and shows error when hotel id is missing', async ({ page }) => {
    await page.route('**/api/property**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const path = requestUrl.pathname;

      if (!path.endsWith('/api/property')) {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            ...mockedHotels[0],
            id: '',
          },
        ]),
      });
    });

    await page.goto('/search-results?city=Bogota');
    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(page).toHaveURL(/\/search-results/);
    await expect(page.getByText('Unable to load property details.')).toBeVisible();
  });

  test('view details shows error when property detail API fails', async ({ page }) => {
    await page.route('**/api/property**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const path = requestUrl.pathname;

      if (path.endsWith('/api/property')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockedHotels[0]]),
        });
        return;
      }

      if (path.includes('/api/property/')) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Detail not available' }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/search-results?city=Bogota');
    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(page).toHaveURL(/\/search-results/);
    await expect(page.getByText('Unable to load property details.')).toBeVisible();
  });
});
