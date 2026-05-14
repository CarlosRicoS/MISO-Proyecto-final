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

  // The current th-notifications-list component renders cards but does not expose a click handler
  // that navigates to /booking-detail. Tapping a notification updates internal state only.
  test.skip('TODO: notifications.feature — opening a notification navigates to booking detail with updated status — navigation handler not implemented on th-notifications-list', () => {});
});
