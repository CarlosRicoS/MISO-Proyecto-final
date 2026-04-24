import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Reuse the same hotel mock data and pattern from hotel-flows.spec.ts
const mockedHotels = [
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

async function mockPropertyApi(page: Page): Promise<void> {
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
          maxCapacity: 4,
          description: 'Modern stay.',
          photos: ['https://example.com/hotel-1.jpg'],
          checkInTime: '15:00:00',
          checkOutTime: '11:00:00',
          adminGroupId: 'hotel-admins',
          amenities: [{ id: 'amen-1', description: 'Free WiFi' }],
          reviews: [],
        }),
      });
      return;
    }

    await route.fulfill({ status: 404 });
  });
}

function buildViolationSummary(violations: { id: string; impact: string | null | undefined; nodes: { html: string }[] }[]): string {
  return violations
    .map((v) => `[${v.impact ?? 'unknown'}] ${v.id}: ${v.nodes[0]?.html ?? ''}`)
    .join('\n');
}

test.describe('Accessibility — travelhub (AC-41)', () => {
  test('home page has no axe violations', async ({ page }) => {
    await mockPropertyApi(page);
    await page.goto('/home');

    // Wait for hotels to load so the page is fully rendered
    await page.waitForSelector('.th-hotel-card', { timeout: 10000 }).catch(() => {
      // Hotels may not load in all configurations — run axe regardless
    });

    const results = await new AxeBuilder({ page }).analyze();

    if (results.violations.length > 0) {
      const summary = buildViolationSummary(results.violations);
      expect(results.violations, `Axe violations found on /home:\n${summary}`).toHaveLength(0);
    }

    expect(results.violations).toHaveLength(0);
  });

  test('login page has no axe violations', async ({ page }) => {
    await page.goto('/login');

    const results = await new AxeBuilder({ page }).analyze();

    if (results.violations.length > 0) {
      const summary = buildViolationSummary(results.violations);
      expect(results.violations, `Axe violations found on /login:\n${summary}`).toHaveLength(0);
    }

    expect(results.violations).toHaveLength(0);
  });

  test('register page has no axe violations', async ({ page }) => {
    await page.goto('/register');

    const results = await new AxeBuilder({ page }).analyze();

    if (results.violations.length > 0) {
      const summary = buildViolationSummary(results.violations);
      expect(results.violations, `Axe violations found on /register:\n${summary}`).toHaveLength(0);
    }

    expect(results.violations).toHaveLength(0);
  });

  test('search-results page has no axe violations', async ({ page }) => {
    await mockPropertyApi(page);
    await page.goto('/search-results?city=Bogota');

    // Wait for results to appear
    await page.waitForSelector('.th-hotel-card', { timeout: 10000 }).catch(() => {
      // Continue with axe scan even if cards did not appear
    });

    const results = await new AxeBuilder({ page }).analyze();

    if (results.violations.length > 0) {
      const summary = buildViolationSummary(results.violations);
      expect(results.violations, `Axe violations found on /search-results:\n${summary}`).toHaveLength(0);
    }

    expect(results.violations).toHaveLength(0);
  });
});
