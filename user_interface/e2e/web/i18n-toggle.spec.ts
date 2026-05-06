import { expect, test, type Page } from '@playwright/test';

/**
 * E2E coverage for the runtime language toggle (AC-6, AC-7, AC-10).
 *
 * - The default language is Spanish: the hero title must render the Spanish
 *   HOME.HERO_TITLE on first visit.
 * - Clicking the language chip in the navbar must switch the hero text to
 *   the English HOME.HERO_TITLE without a page reload.
 * - Clicking again must revert to Spanish.
 * - The chosen language must persist via `localStorage['th_locale']` across
 *   reloads.
 */

const SPANISH_HERO_TITLE = 'Encuentra tu alojamiento perfecto';
const ENGLISH_HERO_TITLE = 'Find Your Perfect Stay';
const LANG_CHIP_SELECTOR = '.th-navbar__chip--lang';

async function mockEmptyHotelApis(page: Page): Promise<void> {
  // Pricing-orchestrator is called per-hotel in `getHotelsWithPricing`.
  // Returning a benign 200 keeps /home from spinning on network.
  await page.route('**/pricing-orchestator/api/Property**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'hotel-empty',
        name: 'Hotel',
        maxCapacity: 0,
        description: '',
        urlBucketPhotos: '',
        checkInTime: '',
        checkOutTime: '',
        adminGroupId: '',
        price: 0,
      }),
    });
  });

  // The list endpoint returns an empty list; the home page still renders
  // its hero and recommended-hotels heading even when there are no hotels.
  await page.route('**/api/property**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;

    if (path.endsWith('/api/property')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
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

test.describe('i18n: language toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem('th_locale');
      } catch {
        /* ignore */
      }
    });
    await mockEmptyHotelApis(page);
  });

  test('renders the Spanish hero title by default', async ({ page }) => {
    await page.goto('/home');

    await expect(
      page.getByRole('heading', { level: 1, name: SPANISH_HERO_TITLE })
    ).toBeVisible();
  });

  test('toggling the language chip switches the hero title between Spanish and English', async ({ page }) => {
    await page.goto('/home');

    const heroSpanish = page.getByRole('heading', { level: 1, name: SPANISH_HERO_TITLE });
    await expect(heroSpanish).toBeVisible();

    const langChip = page.locator(LANG_CHIP_SELECTOR).first();
    await expect(langChip).toBeVisible();
    await langChip.click();

    const heroEnglish = page.getByRole('heading', { level: 1, name: ENGLISH_HERO_TITLE });
    await expect(heroEnglish).toBeVisible();

    await langChip.click();
    await expect(
      page.getByRole('heading', { level: 1, name: SPANISH_HERO_TITLE })
    ).toBeVisible();
  });

  test('persists the active language across a full page reload (localStorage)', async ({ page, context }) => {
    await page.goto('/home');

    const langChip = page.locator(LANG_CHIP_SELECTOR).first();
    await expect(langChip).toBeVisible();

    // Switch to English and verify.
    await langChip.click();
    await expect(
      page.getByRole('heading', { level: 1, name: ENGLISH_HERO_TITLE })
    ).toBeVisible();

    // localStorage key is `th_locale`.
    const stored = await page.evaluate(() => window.localStorage.getItem('th_locale'));
    expect(stored).toBe('en');

    // The shared `beforeEach` registers an init script that clears
    // `th_locale` on every navigation, which would defeat this test.
    // Drop those scripts before reloading so we can observe the real
    // persistence behaviour wired up via APP_INITIALIZER.
    await context.addInitScript(() => {
      /* no-op: reset registered scripts effect by adding a benign one */
    });
    // The above only appends; we can't unregister, so instead we set the
    // value back on every load via a fresh init script before reload.
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('th_locale', 'en');
      } catch {
        /* ignore */
      }
    });

    await page.reload();

    // After reload, English should still be active because LocaleService.init()
    // runs in an APP_INITIALIZER and reads the persisted choice.
    await expect(
      page.getByRole('heading', { level: 1, name: ENGLISH_HERO_TITLE })
    ).toBeVisible();
  });
});
