import { TestBed } from '@angular/core/testing';
import { PendingBookingService } from './pending-booking.service';

describe('PendingBookingService', () => {
  let service: PendingBookingService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PendingBookingService);
  });

  it('stores and consumes pending booking for matching property', () => {
    service.setPendingBooking({
      returnUrl: '/propertydetail/prop-1',
      propertyId: 'prop-1',
      checkInValue: '20/04/2026',
      checkOutValue: '21/04/2026',
      guestsValue: '2',
    });

    const consumed = service.consumePendingBookingForProperty('prop-1');

    expect(consumed).not.toBeNull();
    expect(consumed?.propertyId).toBe('prop-1');
    expect(consumed?.guestsValue).toBe('2');
    expect(service.consumePendingBookingForProperty('prop-1')).toBeNull();
  });

  it('does not consume pending booking for non-matching property', () => {
    service.setPendingBooking({
      returnUrl: '/propertydetail/prop-1',
      propertyId: 'prop-1',
      checkInValue: '20/04/2026',
      checkOutValue: '21/04/2026',
      guestsValue: '2',
    });

    const consumed = service.consumePendingBookingForProperty('prop-2');

    expect(consumed).toBeNull();
    expect(service.consumePendingBookingForProperty('prop-1')).not.toBeNull();
  });

  it('clears pending booking state', () => {
    service.setPendingBooking({
      returnUrl: '/propertydetail/prop-1',
      propertyId: 'prop-1',
      checkInValue: '20/04/2026',
      checkOutValue: '21/04/2026',
      guestsValue: '2',
    });

    service.clearPendingBooking();

    expect(service.consumePendingBookingForProperty('prop-1')).toBeNull();
  });

  describe('sessionStorage edge cases', () => {
    it('handles missing sessionStorage gracefully when setting', () => {
      const originalSessionStorage = (window as any).sessionStorage;
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true,
      });

      expect(() => {
        service.setPendingBooking({
          returnUrl: '/propertydetail/prop-1',
          propertyId: 'prop-1',
          checkInValue: '20/04/2026',
          checkOutValue: '21/04/2026',
          guestsValue: '2',
        });
      }).not.toThrow();

      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        writable: true,
      });
    });

    it('handles missing sessionStorage gracefully when clearing', () => {
      const originalSessionStorage = (window as any).sessionStorage;
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true,
      });

      expect(() => {
        service.clearPendingBooking();
      }).not.toThrow();

      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        writable: true,
      });
    });
  });

  describe('TTL expiration', () => {
    it('clears expired pending booking (older than 2 hours)', () => {
      const oldTime = Date.now() - (3 * 60 * 60 * 1000); // 3 hours ago

      const bookingState = {
        returnUrl: '/propertydetail/prop-1',
        propertyId: 'prop-1',
        checkInValue: '20/04/2026',
        checkOutValue: '21/04/2026',
        guestsValue: '2',
        createdAt: oldTime,
      };

      sessionStorage.setItem('th_pending_booking', JSON.stringify(bookingState));

      const consumed = service.consumePendingBookingForProperty('prop-1');

      expect(consumed).toBeNull();
      expect(sessionStorage.getItem('th_pending_booking')).toBeNull();
    });

    it('returns pending booking if not yet expired (within 2 hours)', () => {
      const recentTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago

      const bookingState = {
        returnUrl: '/propertydetail/prop-1',
        propertyId: 'prop-1',
        checkInValue: '20/04/2026',
        checkOutValue: '21/04/2026',
        guestsValue: '2',
        createdAt: recentTime,
      };

      sessionStorage.setItem('th_pending_booking', JSON.stringify(bookingState));

      const consumed = service.consumePendingBookingForProperty('prop-1');

      expect(consumed).not.toBeNull();
      expect(consumed?.propertyId).toBe('prop-1');
    });
  });

  describe('corrupted data handling', () => {
    it('clears corrupted JSON in storage', () => {
      sessionStorage.setItem('th_pending_booking', 'invalid json {]');

      const consumed = service.consumePendingBookingForProperty('prop-1');

      expect(consumed).toBeNull();
      expect(sessionStorage.getItem('th_pending_booking')).toBeNull();
    });

    it('clears booking missing propertyId', () => {
      sessionStorage.setItem(
        'th_pending_booking',
        JSON.stringify({
          returnUrl: '/propertydetail/prop-1',
          checkInValue: '20/04/2026',
          checkOutValue: '21/04/2026',
          guestsValue: '2',
          createdAt: Date.now(),
        })
      );

      const consumed = service.consumePendingBookingForProperty('prop-1');

      expect(consumed).toBeNull();
      expect(sessionStorage.getItem('th_pending_booking')).toBeNull();
    });

    it('clears booking missing createdAt', () => {
      sessionStorage.setItem(
        'th_pending_booking',
        JSON.stringify({
          returnUrl: '/propertydetail/prop-1',
          propertyId: 'prop-1',
          checkInValue: '20/04/2026',
          checkOutValue: '21/04/2026',
          guestsValue: '2',
        })
      );

      const consumed = service.consumePendingBookingForProperty('prop-1');

      expect(consumed).toBeNull();
      expect(sessionStorage.getItem('th_pending_booking')).toBeNull();
    });

    it('returns null when no booking exists', () => {
      const consumed = service.consumePendingBookingForProperty('prop-1');

      expect(consumed).toBeNull();
    });
  });
});
