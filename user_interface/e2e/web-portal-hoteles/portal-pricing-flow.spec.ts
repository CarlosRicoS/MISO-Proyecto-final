import { expect, test, type Page } from '@playwright/test';

function buildJwt(payload: Record<string, string>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encodedPayload}.signature`;
}

const idToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });
const accessToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });

const pricingPropertyResponse = {
  id: 'prop-1',
  name: 'Andes Palace Hotel',
  city: 'Bogota',
  country: 'Colombia',
  price: 275,
  maxCapacity: 4,
  description: 'Modern stay in the heart of Bogota.',
  urlBucketPhotos: 'https://example.com/hotel-1.jpg',
  checkInTime: '15:00:00',
  checkOutTime: '11:00:00',
  adminGroupId: 'hotel-admins',
};

async function injectAuthSession(page: Page): Promise<void> {
  await page.addInitScript(
    ([id, access]) => {
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
      window.localStorage.setItem('th_locale', 'en');
    },
    [idToken, accessToken],
  );
}

async function mockPricingApis(page: Page): Promise<void> {
  await page.route('**/pricing-engine/api/PropertyPrice**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pricingPropertyResponse),
    });
  });

  await page.route('**/pricing-orchestator/api/Property**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pricingPropertyResponse),
    });
  });
}

test.describe('Portal Hoteles — pricing configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('th_locale', 'en');
    });
  });

  test('unauthenticated access redirects to /login with returnUrl=%2Fpricing', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fpricing/);
  });

  test('authenticated page loads the pricing table and fetches current property pricing', async ({ page }) => {
    await injectAuthSession(page);
    await mockPricingApis(page);

    const pricingRequest = page.waitForRequest((req) =>
      /\/pricing-engine\/api\/PropertyPrice/.test(req.url()),
    );

    await page.goto('/pricing');
    await pricingRequest;

    await expect(page.getByRole('columnheader', { name: 'Room Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Final Rate' })).toBeVisible();
    // After the API resolves, the first row's base rate reflects the API price.
    await expect(page.getByText('$275.00').first()).toBeVisible();
  });

  test('falls back to pricing-orchestrator when pricing-engine returns 5xx', async ({ page }) => {
    await injectAuthSession(page);
    await page.route('**/pricing-engine/api/PropertyPrice**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'engine down' }),
      });
    });
    await page.route('**/pricing-orchestator/api/Property**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...pricingPropertyResponse, price: 310 }),
      });
    });

    await page.goto('/pricing');

    await expect(page.getByText('$310.00').first()).toBeVisible();
  });
});
