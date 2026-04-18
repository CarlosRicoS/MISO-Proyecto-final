/// <reference types="jasmine" />

import { PortalHotelesDashboardPage } from './dashboard.page';
import { of, throwError } from 'rxjs';

type ReservationLike = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  status: string;
  user_email?: string;
};

type AuthSessionLike = {
  userEmail: string;
  idToken: string;
  userId: string;
};

type BookingServiceLike = {
  listReservations: jasmine.Spy;
};

describe('PortalHotelesDashboardPage', () => {
  const reservationFixture: ReservationLike[] = [
    {
      id: 'BK-1001',
      user_id: 'jane_doe',
      user_email: 'jane.doe@email.com',
      period_start: '2026-03-15T00:00:00Z',
      period_end: '2026-03-18T00:00:00Z',
      status: 'confirmed',
    },
    {
      id: 'BK-1002',
      user_id: 'john_smith',
      user_email: 'john.smith@email.com',
      period_start: '2026-03-20T00:00:00Z',
      period_end: '2026-03-22T00:00:00Z',
      status: 'pending',
    },
    {
      id: 'BK-1003',
      user_id: 'anna_bell',
      user_email: 'anna.bell@email.com',
      period_start: '2026-03-24T00:00:00Z',
      period_end: '2026-03-25T00:00:00Z',
      status: 'canceled',
    },
    {
      id: 'BK-1004',
      user_id: 'max_lee',
      user_email: 'max.lee@email.com',
      period_start: '2026-03-28T00:00:00Z',
      period_end: '2026-03-29T00:00:00Z',
      status: 'approved',
    },
    {
      id: 'BK-1005',
      user_id: 'nora_ray',
      user_email: 'nora.ray@email.com',
      period_start: '2026-03-30T00:00:00Z',
      period_end: '2026-04-01T00:00:00Z',
      status: 'rejected',
    },
  ];

  function createAuthSessionStub(overrides: Partial<AuthSessionLike> = {}): AuthSessionLike {
    return {
      userEmail: 'operator@travelhub.com',
      idToken: 'id-token-value',
      userId: 'user-123',
      ...overrides,
    };
  }

  function createBookingServiceStub(reservations: ReservationLike[] = reservationFixture): BookingServiceLike {
    return {
      listReservations: jasmine.createSpy('listReservations').and.returnValue(of(reservations)),
    };
  }

  it('returns the authenticated operator email', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    const operatorEmail = component.operatorEmail;

    // Assert
    expect(operatorEmail).toBe('operator@travelhub.com');
  });

  it('returns an empty string when no operator email exists', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub({ userEmail: '' });
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    const operatorEmail = component.operatorEmail;

    // Assert
    expect(operatorEmail).toBe('');
  });

  it('loads reservations and fills the grid rows on view enter', async () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    component.ionViewWillEnter();
    await Promise.resolve();

    // Assert
    expect(bookingServiceStub.listReservations).toHaveBeenCalledWith('id-token-value', 'user-123');
    expect(component.totalReservations).toBe(5);
    expect(component.visibleReservations.length).toBe(4);
    expect(component.visibleReservations[0].bookingId).toBe('BK-1001');
    expect(component.visibleReservations[0].bookingRoute).toEqual(['/dashboard', 'BK-1001']);
    expect(component.visibleReservations[0].guestName).toBe('Jane Doe');
    expect(component.visibleReservations[0].guestEmail).toBe('jane.doe@email.com');
    expect(component.visibleRangeLabel).toBe('Showing 1-4 of 5 reservations');
    expect(component.shouldShowPagination).toBeTrue();
    expect(component.paginationLabel).toBe('Page 1 of 2');
    expect(component.canGoToPreviousPage).toBeFalse();
    expect(component.canGoToNextPage).toBeTrue();
  });

  it('moves between pages when using next and previous pagination actions', async () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    component.ionViewWillEnter();
    await Promise.resolve();
    component.onNextPage();

    // Assert
    expect(component.paginationLabel).toBe('Page 2 of 2');
    expect(component.visibleReservations.length).toBe(1);
    expect(component.visibleReservations[0].bookingId).toBe('BK-1005');
    expect(component.visibleRangeLabel).toBe('Showing 5-5 of 5 reservations');
    expect(component.canGoToPreviousPage).toBeTrue();
    expect(component.canGoToNextPage).toBeFalse();

    // Act
    component.onPreviousPage();

    // Assert
    expect(component.paginationLabel).toBe('Page 1 of 2');
    expect(component.visibleReservations.length).toBe(4);
    expect(component.visibleReservations[0].bookingId).toBe('BK-1001');
  });

  it('does not change pagination when next/previous is not available', async () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub(reservationFixture.slice(0, 3));
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    component.ionViewWillEnter();
    await Promise.resolve();
    component.onPreviousPage();
    component.onNextPage();

    // Assert
    expect(component.paginationLabel).toBe('Page 1 of 1');
    expect(component.visibleReservations.length).toBe(3);
    expect(component.canGoToPreviousPage).toBeFalse();
    expect(component.canGoToNextPage).toBeFalse();
    expect(component.shouldShowPagination).toBeFalse();
  });

  it('uses fallback values when booking service fails', async () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub: BookingServiceLike = {
      listReservations: jasmine.createSpy('listReservations').and.returnValue(
        throwError(() => new Error('Network error')),
      ),
    };
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    component.ionViewWillEnter();
    await Promise.resolve();

    // Assert
    expect(component.totalReservations).toBe(0);
    expect(component.hasReservations).toBeFalse();
    expect(component.reservationsErrorMessage).toBe('Unable to load reservations.');
    expect(component.visibleRangeLabel).toBe('Showing 0-0 of 0 reservations');
  });

  it('returns status class variants for known and unknown statuses', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    const confirmedClass = component.getStatusClass('confirmed');
    const cancelledClass = component.getStatusClass('cancelled');
    const unknownClass = component.getStatusClass('');

    // Assert
    expect(confirmedClass).toContain('portal-hoteles-dashboard-status--confirmed');
    expect(cancelledClass).toContain('portal-hoteles-dashboard-status--canceled');
    expect(unknownClass).toContain('portal-hoteles-dashboard-status--default');
  });

  it('returns specific status classes for all supported statuses', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    const pending = component.getStatusClass('pending');
    const approved = component.getStatusClass('approved');
    const rejected = component.getStatusClass('rejected');
    const completed = component.getStatusClass('completed');
    const canceled = component.getStatusClass('canceled');

    // Assert
    expect(pending).toContain('--pending');
    expect(approved).toContain('--approved');
    expect(rejected).toContain('--rejected');
    expect(completed).toContain('--completed');
    expect(canceled).toContain('--canceled');
  });

  it('normalizes status before class lookup', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    const statusClass = component.getStatusClass('  CONFIRMED  ');

    // Assert
    expect(statusClass).toContain('--confirmed');
  });

  it('maps reservation fallback fields for booking id and guest info', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub({ userEmail: 'operator@travelhub.com' });
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);
    const reservation = {
      id: '',
      reservation_id: '  BK-FALLBACK  ',
      user_id: 'john_snow',
      period_start: 'not-a-date',
      period_end: '',
      status: '',
      user_email: '',
    };

    // Act
    const mapped = (component as unknown as { toDashboardReservation: (value: unknown) => any }).toDashboardReservation(
      reservation,
    );

    // Assert
    expect(mapped.bookingId).toBe('BK-FALLBACK');
    expect(mapped.guestName).toBe('John Snow');
    expect(mapped.guestEmail).toBe('operator@travelhub.com');
    expect(mapped.checkInLabel).toBe('not-a-date');
    expect(mapped.checkOutLabel).toBe('-');
    expect(mapped.statusLabel).toBe('Unknown');
  });

  it('uses dash fallback booking id when no id fields are usable', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub({ userEmail: 'operator@travelhub.com' });
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);
    const reservation = {
      id: '   ',
      user_id: '',
      period_start: '2026-01-01T00:00:00Z',
      period_end: '2026-01-03T00:00:00Z',
      status: 'pending',
      user_email: '',
    };

    // Act
    const mapped = (component as unknown as { toDashboardReservation: (value: unknown) => any }).toDashboardReservation(
      reservation,
    );

    // Assert
    expect(mapped.bookingId).toBe('-');
    expect(mapped.bookingRoute).toEqual(['/dashboard', '-']);
  });

  it('builds guest name from guest_name and email local part', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);
    const reservationWithGuestName = {
      guest_name: '  Mary Jane  ',
      user_email: 'mary.jane@email.com',
      user_id: 'ignored_id',
    };
    const reservationWithEmail = {
      user_email: 'anna-bell@email.com',
      user_id: 'ignored_id',
    };

    // Act
    const fromGuestName = (component as unknown as { getGuestName: (r: any, userId: string) => string }).getGuestName(
      reservationWithGuestName,
      reservationWithGuestName.user_id,
    );
    const fromEmail = (component as unknown as { getGuestName: (r: any, userId: string) => string }).getGuestName(
      reservationWithEmail,
      reservationWithEmail.user_id,
    );

    // Assert
    expect(fromGuestName).toBe('Mary Jane');
    expect(fromEmail).toBe('Anna Bell');
  });

  it('returns Guest when user id and derived parts are empty', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    const guest = (component as unknown as { getGuestName: (r: any, userId: string) => string }).getGuestName({}, '   ');

    // Assert
    expect(guest).toBe('Guest');
  });

  it('formats display names and returns empty for invalid raw values', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    const normalized = (component as unknown as { toDisplayName: (raw: string) => string }).toDisplayName(
      'john_snow-smith.test',
    );
    const emptyValue = (component as unknown as { toDisplayName: (raw: string) => string }).toDisplayName('...---___');

    // Assert
    expect(normalized).toBe('John Snow Smith Test');
    expect(emptyValue).toBe('');
  });

  it('formats status labels and keeps unknown fallback', () => {
    // Arrange
    const authSessionStub = createAuthSessionStub();
    const bookingServiceStub = createBookingServiceStub();
    const component = new PortalHotelesDashboardPage(authSessionStub as never, bookingServiceStub as never);

    // Act
    const known = (component as unknown as { formatStatusLabel: (status: string) => string }).formatStatusLabel('REJECTED');
    const unknown = (component as unknown as { formatStatusLabel: (status: string) => string }).formatStatusLabel('  ');

    // Assert
    expect(known).toBe('Rejected');
    expect(unknown).toBe('Unknown');
  });
});
