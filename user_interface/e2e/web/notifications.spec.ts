import { expect, test } from '@playwright/test';

test.describe('Notifications page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('th_locale', 'en');
    });
  });

  test('renders the empty state when no notifications are stored', async ({ page }) => {
    await page.goto('/notifications');

    await expect(page.getByRole('heading', { name: 'No notifications yet' })).toBeVisible();
    await expect(
      page.getByText('New booking alerts, payment updates, and reservation changes appear here as they arrive.'),
    ).toBeVisible();
  });

  test('renders seeded notification entries from local storage', async ({ page }) => {
    const receivedAt = new Date().toISOString();
    const stored = [
      {
        id: 'notif-1',
        type: 'BOOKING_CONFIRMED',
        title: 'Booking confirmed',
        subtitle: 'Reservation #booking-1',
        message: 'Your reservation at Andes Palace Hotel is confirmed.',
        receivedAt,
        iconName: 'checkmark-circle-outline',
        iconColor: '#16A34A',
        data: { bookingId: 'booking-1' },
      },
      {
        id: 'notif-2',
        type: 'PAYMENT_CONFIRMED',
        title: 'Payment confirmed',
        subtitle: 'Reservation #booking-2',
        message: 'We received your payment for Coffee Hills Lodge.',
        receivedAt,
        iconName: 'card-outline',
        iconColor: '#14B8A6',
        data: { bookingId: 'booking-2' },
      },
    ];

    await page.addInitScript((items) => {
      window.localStorage.setItem('th_notifications_history', JSON.stringify(items));
    }, stored);

    await page.goto('/notifications');

    const list = page.locator('th-notifications-list');
    await expect(list).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Booking confirmed' })).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible();
    await expect(list.getByText('Your reservation at Andes Palace Hotel is confirmed.')).toBeVisible();
    await expect(list.getByText('We received your payment for Coffee Hills Lodge.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No notifications yet' })).toHaveCount(0);
  });

  test('renders BOOKING_CONFIRMED notification with the updated status', async ({ page }) => {
    const stored = [
      {
        id: 'notif-confirmed',
        type: 'BOOKING_CONFIRMED',
        title: 'Booking confirmed',
        subtitle: 'Reservation #booking-1',
        message: 'Your reservation is now CONFIRMED.',
        receivedAt: new Date().toISOString(),
        iconName: 'checkmark-circle-outline',
        iconColor: '#16A34A',
        data: { bookingId: 'booking-1', status: 'CONFIRMED' },
      },
    ];

    await page.addInitScript((items) => {
      window.localStorage.setItem('th_notifications_history', JSON.stringify(items));
    }, stored);

    await page.goto('/notifications');

    const list = page.locator('th-notifications-list');
    await expect(list.getByRole('heading', { name: 'Booking confirmed' })).toBeVisible();
    await expect(list.getByText('Your reservation is now CONFIRMED.')).toBeVisible();
  });

  test('tapping a notification navigates to /booking-detail with the bookingId query param', async ({ page }) => {
    const stored = [
      {
        id: 'notif-tap',
        type: 'BOOKING_CONFIRMED',
        title: 'Booking confirmed',
        subtitle: 'Reservation #booking-1',
        message: 'Your reservation at Andes Palace Hotel is confirmed.',
        receivedAt: new Date().toISOString(),
        iconName: 'checkmark-circle-outline',
        iconColor: '#16A34A',
        data: { bookingId: 'booking-1' },
      },
    ];

    await page.addInitScript((items) => {
      window.localStorage.setItem('th_notifications_history', JSON.stringify(items));
    }, stored);

    // The booking-detail page fetches data once navigated; stub the endpoints so we don't 404.
    await page.route('**/booking/api/booking/booking-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      });
    });
    await page.route('**/api/property/prop-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'prop-1',
          name: 'Andes Palace Hotel',
          city: 'Bogota',
          country: 'Colombia',
          maxCapacity: 4,
          description: 'Stay',
          photos: ['https://example.com/h.jpg'],
          checkInTime: '15:00:00',
          checkOutTime: '11:00:00',
          adminGroupId: 'hotel-admins',
          amenities: [],
          reviews: [],
        }),
      });
    });

    await page.goto('/notifications');

    const list = page.locator('th-notifications-list');
    await expect(list).toBeVisible();

    await list.locator('[data-testid="notification-item"]').first().click();

    await expect(page).toHaveURL(/\/booking-detail\?bookingId=booking-1/);
  });
});
