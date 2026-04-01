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

async function mockPropertySearchApi(page: Page): Promise<void> {
  await page.route('**/api/property**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockedHotels),
    });
  });
}

test.describe('TravelHub core journeys', () => {
  test.beforeEach(async ({ page }) => {
    await mockPropertySearchApi(page);
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

  test('property detail page renders key booking information', async ({ page }) => {
    await page.goto('/propertydetail');

    await expect(page).toHaveURL(/\/propertydetail/);
    await expect(page.getByRole('heading', { level: 1, name: 'Grand Luxury Resort & Spa' })).toBeVisible();
    await expect(page.getByText('Book Now').first()).toBeVisible();
  });
});
