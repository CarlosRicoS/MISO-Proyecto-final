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
});
