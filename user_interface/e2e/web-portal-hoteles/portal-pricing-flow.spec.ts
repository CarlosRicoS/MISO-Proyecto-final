import { expect, test, type Page } from '@playwright/test';

function buildJwt(payload: Record<string, string>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encodedPayload}.signature`;
}

const idToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });
const accessToken = buildJwt({ email: 'admin@hotel.com', sub: 'admin-123' });

const pricingEntries = [
  { id: 1, propertyId: 'prop-1', basePrice: 240 },
  { id: 2, propertyId: 'prop-2', basePrice: 410 },
];

const properties = [
  { id: 'prop-1', name: 'Andes Palace Hotel', city: 'Bogota', maxCapacity: 2 },
  { id: 'prop-2', name: 'Coffee Hills Lodge', city: 'Armenia', maxCapacity: 4 },
];

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
  await page.route('**/pricing-engine/api/propertyprice/pricing', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pricingEntries),
    });
  });

  await page.route('**/poc-properties/api/property**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(properties),
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

  test('authenticated page renders the pricing table from the pricing and properties APIs', async ({ page }) => {
    await injectAuthSession(page);
    await mockPricingApis(page);

    const pricingRequest = page.waitForRequest(
      (req) => /\/pricing-engine\/api\/propertyprice\/pricing$/.test(req.url()),
    );

    await page.goto('/pricing');
    await pricingRequest;

    await expect(page.getByRole('columnheader', { name: 'Property' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Base Rate' })).toBeVisible();
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();
    await expect(page.getByText('Coffee Hills Lodge')).toBeVisible();
    await expect(page.getByText('$240.00')).toBeVisible();
    await expect(page.getByText('$410.00')).toBeVisible();
  });

  // Gherkin: pricing-management.feature — "Editar un precio existente y guardar correctamente"
  test('edits an existing base price and saves successfully (PUT to pricing-engine)', async ({ page }) => {
    await injectAuthSession(page);
    await mockPricingApis(page);

    let capturedUrl = '';
    let capturedBody: { basePrice?: number; PropertyId?: string } | null = null;
    await page.route(/\/pricing-engine\/api\/propertyprice\/pricing\/\d+$/, async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.fallback();
        return;
      }
      capturedUrl = route.request().url();
      capturedBody = JSON.parse(route.request().postData() || '{}') as {
        basePrice?: number;
        PropertyId?: string;
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, propertyId: 'prop-1', basePrice: 275.5 }),
      });
    });

    await page.goto('/pricing');
    await expect(page.getByText('Andes Palace Hotel')).toBeVisible();
    await expect(page.getByText('$240.00')).toBeVisible();

    // Open the edit modal for the first property row.
    await page
      .locator('.portal-hoteles-pricing-table__row')
      .first()
      .getByRole('button')
      .first()
      .click();

    const modalInput = page.locator('.portal-hoteles-pricing-modal__input');
    await expect(modalInput).toBeVisible();
    await modalInput.fill('275.50');

    const saveButton = page.getByRole('button', { name: 'Save' }).or(
      page.locator('.portal-hoteles-pricing-modal__save-button'),
    );
    await saveButton.first().click();

    // Updated value reflected in the list.
    await expect(page.getByText('$275.50')).toBeVisible();
    expect(capturedUrl).toMatch(/\/pricing-engine\/api\/propertyprice\/pricing\/1$/);
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.basePrice).toBe(275.5);
    expect(capturedBody!.PropertyId).toBe('prop-1');
  });

  test('shows the error state when the pricing API fails', async ({ page }) => {
    await injectAuthSession(page);
    await page.route('**/pricing-engine/api/propertyprice/pricing', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'server error' }),
      });
    });
    await page.route('**/poc-properties/api/property**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(properties),
      });
    });

    await page.goto('/pricing');

    await expect(page.getByText('Unable to load pricing data.')).toBeVisible();
  });
});
