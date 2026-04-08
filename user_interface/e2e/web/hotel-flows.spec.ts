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

async function mockPropertyApis(page: Page): Promise<void> {
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
});
