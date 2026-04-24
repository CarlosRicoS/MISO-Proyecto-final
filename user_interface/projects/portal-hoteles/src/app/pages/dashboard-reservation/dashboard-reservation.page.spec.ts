/// <reference types="jasmine" />

import { of, throwError } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { PortalHotelesDashboardReservationPage } from './dashboard-reservation.page';

type RouteStub = {
  snapshot: {
    paramMap: ReturnType<typeof convertToParamMap>;
  };
};

type AuthSessionStub = {
  idToken: string;
  userEmail: string;
};

type RouterStub = {
  navigate: jasmine.Spy;
};

type BookingServiceStub = {
  getReservation: jasmine.Spy;
  adminConfirmReservation: jasmine.Spy;
  adminRejectReservation: jasmine.Spy;
};

type PropertyDetailServiceStub = {
  getPropertyDetail: jasmine.Spy;
};

describe('PortalHotelesDashboardReservationPage', () => {
  function createRouteStub(reservationId = 'BK-2047'): RouteStub {
    return {
      snapshot: {
        paramMap: convertToParamMap({ reservationId }),
      },
    };
  }

  function createAuthSessionStub(): AuthSessionStub {
    return {
      idToken: 'id-token',
      userEmail: 'sarah.johnson@email.com',
    };
  }

  function createRouterStub(): RouterStub {
    return {
      navigate: jasmine.createSpy('navigate').and.resolveTo(true),
    };
  }

  function createBookingServiceStub(): BookingServiceStub {
    return {
      getReservation: jasmine.createSpy('getReservation').and.returnValue(
        of({
          id: 'BK-2047',
          property_id: 'prop-10',
          user_id: 'sarah_johnson',
          guests: 1,
          period_start: '2024-12-20T00:00:00Z',
          period_end: '2024-12-25T00:00:00Z',
          price: 897,
          status: 'pending',
          admin_group_id: 'admin-1',
          payment_reference: null,
          created_at: '2024-12-01T00:00:00Z',
        }),
      ),
      adminConfirmReservation: jasmine.createSpy('adminConfirmReservation').and.returnValue(of({})),
      adminRejectReservation: jasmine.createSpy('adminRejectReservation').and.returnValue(of({})),
    };
  }

  function createPropertyServiceStub(): PropertyDetailServiceStub {
    return {
      getPropertyDetail: jasmine.createSpy('getPropertyDetail').and.returnValue(
        of({
          id: 'prop-10',
          name: 'The Grand Plaza Hotel',
          city: 'Manhattan, New York, NY 10001',
          country: 'USA',
          maxCapacity: 2,
          description: '...',
          photos: [
            'https://example.com/photo-1.jpg',
            'https://example.com/photo-2.jpg',
            'https://example.com/photo-3.jpg',
          ],
          checkInTime: '15:00',
          checkOutTime: '11:00',
          adminGroupId: 'admin-1',
          amenities: [],
          reviews: [],
        }),
      ),
    };
  }

  it('loads reservation and property data for dashboard detail view', async () => {
    // Arrange
    const routeStub = createRouteStub();
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    const propertyServiceStub = createPropertyServiceStub();

    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );

    // Act
    component.ionViewWillEnter();
    await Promise.resolve();
    await Promise.resolve();

    // Assert
    expect(bookingServiceStub.getReservation).toHaveBeenCalledWith('BK-2047', 'id-token');
    expect(propertyServiceStub.getPropertyDetail).toHaveBeenCalledWith('prop-10', 'id-token');
    expect(component.overview.hotelName).toBe('The Grand Plaza Hotel');
    expect(component.overview.statusLabel).toBe('Pending');
    expect(component.paymentSummary.totalAmount).toBe('$1,009');
    expect(component.summaryItems.length).toBe(3);
  });

  it('shows error message when reservation cannot be loaded', async () => {
    // Arrange
    const routeStub = createRouteStub();
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    bookingServiceStub.getReservation.and.returnValue(throwError(() => new Error('fail')));
    const propertyServiceStub = createPropertyServiceStub();

    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );

    // Act
    component.ionViewWillEnter();
    await Promise.resolve();

    // Assert
    expect(component.errorMessage).toBe('Unable to load reservation detail.');
  });

  it('redirects to dashboard after accepting reservation', async () => {
    // Arrange
    const routeStub = createRouteStub();
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    const propertyServiceStub = createPropertyServiceStub();

    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );

    component.reservationId = 'BK-2047';

    // Act
    await component.onAcceptReservation();

    // Assert
    expect(bookingServiceStub.adminConfirmReservation).toHaveBeenCalledWith(
      'BK-2047',
      { traveler_email: 'sarah.johnson@email.com' },
      'id-token',
    );
    expect(routerStub.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('redirects to dashboard after rejecting reservation', async () => {
    // Arrange
    const routeStub = createRouteStub();
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    const propertyServiceStub = createPropertyServiceStub();

    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );

    component.reservationId = 'BK-2047';

    // Act
    await component.onRejectReservation();

    // Assert
    expect(bookingServiceStub.adminRejectReservation).toHaveBeenCalledWith(
      'BK-2047',
      { traveler_email: 'sarah.johnson@email.com', reason: 'Rejected from dashboard' },
      'id-token',
    );
    expect(routerStub.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('disables only accept button when reservation status is confirmed', () => {
    // Arrange
    const routeStub = createRouteStub();
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    const propertyServiceStub = createPropertyServiceStub();

    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );

    component.overview.statusLabel = 'Confirmed';

    // Act
    const acceptDisabled = component.isAcceptButtonDisabled;
    const rejectDisabled = component.isRejectButtonDisabled;

    // Assert
    expect(acceptDisabled).toBeTrue();
    expect(rejectDisabled).toBeFalse();
  });

  it('disables both admin buttons when reservation status is rejected', () => {
    // Arrange
    const routeStub = createRouteStub();
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    const propertyServiceStub = createPropertyServiceStub();

    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );

    component.overview.statusLabel = 'Rejected';

    // Act
    const acceptDisabled = component.isAcceptButtonDisabled;
    const rejectDisabled = component.isRejectButtonDisabled;

    // Assert
    expect(acceptDisabled).toBeTrue();
    expect(rejectDisabled).toBeTrue();
  });

  it('does not trigger accept flow when status is confirmed', async () => {
    // Arrange
    const routeStub = createRouteStub();
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    const propertyServiceStub = createPropertyServiceStub();

    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );

    component.reservationId = 'BK-2047';
    component.overview.statusLabel = 'Confirmed';

    // Act
    await component.onAcceptReservation();

    // Assert
    expect(bookingServiceStub.adminConfirmReservation).not.toHaveBeenCalled();
    expect(routerStub.navigate).not.toHaveBeenCalled();
  });

  it('does not trigger reject flow when status is canceled', async () => {
    // Arrange
    const routeStub = createRouteStub();
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    const propertyServiceStub = createPropertyServiceStub();

    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );

    component.reservationId = 'BK-2047';
    component.overview.statusLabel = 'Canceled';

    // Act
    await component.onRejectReservation();

    // Assert
    expect(bookingServiceStub.adminRejectReservation).not.toHaveBeenCalled();
    expect(routerStub.navigate).not.toHaveBeenCalled();
  });

  it('sets invalid id error when reservation id is missing', async () => {
    // Arrange
    const routeStub = createRouteStub('   ');
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    const propertyServiceStub = createPropertyServiceStub();
    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );

    // Act
    component.ionViewWillEnter();
    await Promise.resolve();

    // Assert
    expect(component.errorMessage).toBe('Invalid reservation id.');
  });

  it('shows accept/reject disabled while loading', () => {
    // Arrange
    const component = new PortalHotelesDashboardReservationPage(
      createRouteStub() as never,
      createRouterStub() as never,
      createAuthSessionStub() as never,
      createBookingServiceStub() as never,
      createPropertyServiceStub() as never,
    );
    component.isLoading = true;
    component.overview.statusLabel = 'Pending';

    // Act
    const acceptDisabled = component.isAcceptButtonDisabled;
    const rejectDisabled = component.isRejectButtonDisabled;

    // Assert
    expect(acceptDisabled).toBeTrue();
    expect(rejectDisabled).toBeTrue();
  });

  it('disables both actions for cancelled spelling variant', () => {
    // Arrange
    const component = new PortalHotelesDashboardReservationPage(
      createRouteStub() as never,
      createRouterStub() as never,
      createAuthSessionStub() as never,
      createBookingServiceStub() as never,
      createPropertyServiceStub() as never,
    );
    component.overview.statusLabel = 'Cancelled';

    // Act
    const acceptDisabled = component.isAcceptButtonDisabled;
    const rejectDisabled = component.isRejectButtonDisabled;

    // Assert
    expect(acceptDisabled).toBeTrue();
    expect(rejectDisabled).toBeTrue();
  });

  it('does not trigger accept/reject when reservation id is empty', async () => {
    // Arrange
    const routeStub = createRouteStub();
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    const propertyServiceStub = createPropertyServiceStub();
    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );
    component.reservationId = '';

    // Act
    await component.onAcceptReservation();
    await component.onRejectReservation();

    // Assert
    expect(bookingServiceStub.adminConfirmReservation).not.toHaveBeenCalled();
    expect(bookingServiceStub.adminRejectReservation).not.toHaveBeenCalled();
    expect(routerStub.navigate).not.toHaveBeenCalled();
  });

  it('shows errors when accept/reject service calls fail', async () => {
    // Arrange
    const routeStub = createRouteStub();
    const authSessionStub = createAuthSessionStub();
    const routerStub = createRouterStub();
    const bookingServiceStub = createBookingServiceStub();
    bookingServiceStub.adminConfirmReservation.and.returnValue(throwError(() => new Error('confirm fail')));
    bookingServiceStub.adminRejectReservation.and.returnValue(throwError(() => new Error('reject fail')));
    const propertyServiceStub = createPropertyServiceStub();
    const component = new PortalHotelesDashboardReservationPage(
      routeStub as never,
      routerStub as never,
      authSessionStub as never,
      bookingServiceStub as never,
      propertyServiceStub as never,
    );
    component.reservationId = 'BK-2047';

    // Act
    await component.onAcceptReservation();
    const acceptError = component.errorMessage;
    await component.onRejectReservation();

    // Assert
    expect(acceptError).toBe('Unable to accept reservation.');
    expect(component.errorMessage).toBe('Unable to reject reservation.');
  });

  it('covers helper branches for invalid values and fallbacks', () => {
    // Arrange
    const component = new PortalHotelesDashboardReservationPage(
      createRouteStub() as never,
      createRouterStub() as never,
      createAuthSessionStub() as never,
      createBookingServiceStub() as never,
      createPropertyServiceStub() as never,
    );

    // Act
    const safePriceFromNaN = (component as unknown as { getSafePrice: (price: number) => number }).getSafePrice(Number.NaN);
    const safePriceFromNegative = (component as unknown as { getSafePrice: (price: number) => number }).getSafePrice(-20);
    const locationFallback = (component as unknown as { getLocationText: (city: string, country: string) => string }).getLocationText(
      '  ',
      '',
    );
    const singleLocation = (component as unknown as { getLocationText: (city: string, country: string) => string }).getLocationText(
      'Bogota',
      ' ',
    );
    const invalidNights = (component as unknown as { getNightsCount: (start: string, end: string) => number }).getNightsCount(
      'x',
      'y',
    );
    const reverseNights = (component as unknown as { getNightsCount: (start: string, end: string) => number }).getNightsCount(
      '2026-02-10T00:00:00Z',
      '2026-02-01T00:00:00Z',
    );
    const invalidDate = (component as unknown as { formatDate: (value: string) => string }).formatDate('bad-date');
    const invalidIso = (component as unknown as { toIsoDate: (value: string) => string }).toIsoDate('bad-date');
    const defaultStatus = (component as unknown as { formatStatusLabel: (status: string) => string }).formatStatusLabel('');
    const unknownGuest = (component as unknown as { getGuestLabel: (reservation: any) => string }).getGuestLabel({
      user_id: '',
      user_email: '',
      guest_name: '',
    });
    const emailGuest = (component as unknown as { getGuestLabel: (reservation: any) => string }).getGuestLabel({
      user_id: '',
      user_email: 'guest@email.com',
    });

    // Assert
    expect(safePriceFromNaN).toBe(0);
    expect(safePriceFromNegative).toBe(0);
    expect(locationFallback).toBe('Location unavailable');
    expect(singleLocation).toBe('Bogota');
    expect(invalidNights).toBe(1);
    expect(reverseNights).toBe(1);
    expect(invalidDate).toBe('bad-date');
    expect(invalidIso).toBe('bad-date');
    expect(defaultStatus).toBe('Pending');
    expect(unknownGuest).toBe('sarah.johnson@email.com');
    expect(emailGuest).toBe('guest@email.com');
  });

  it('limits mosaic images to six and supports empty arrays', () => {
    // Arrange
    const component = new PortalHotelesDashboardReservationPage(
      createRouteStub() as never,
      createRouterStub() as never,
      createAuthSessionStub() as never,
      createBookingServiceStub() as never,
      createPropertyServiceStub() as never,
    );
    const photos = [
      '1.jpg',
      '2.jpg',
      '3.jpg',
      '4.jpg',
      '5.jpg',
      '6.jpg',
      '7.jpg',
    ];

    // Act
    const limited = (component as unknown as { toMosaicImages: (p: string[], name: string) => Array<{ alt: string }> }).toMosaicImages(
      photos,
      'Hotel Name',
    );
    const empty = (component as unknown as { toMosaicImages: (p: string[], name: string) => Array<{ alt: string }> }).toMosaicImages(
      [],
      'Hotel Name',
    );

    // Assert
    expect(limited.length).toBe(6);
    expect(limited[0].alt).toBe('Hotel Name photo 1');
    expect(empty.length).toBe(0);
  });

  it('generates date range and nights label through helper paths', () => {
    // Arrange
    const component = new PortalHotelesDashboardReservationPage(
      createRouteStub() as never,
      createRouterStub() as never,
      createAuthSessionStub() as never,
      createBookingServiceStub() as never,
      createPropertyServiceStub() as never,
    );

    // Act
    const rangeLabel = (component as unknown as { getDateRangeLabel: (s: string, e: string) => string }).getDateRangeLabel(
      '2026-02-01T00:00:00Z',
      '2026-02-02T00:00:00Z',
    );
    const oneNight = (component as unknown as { getNightsLabel: (s: string, e: string) => string }).getNightsLabel(
      '2026-02-01T00:00:00Z',
      '2026-02-02T00:00:00Z',
    );
    const manyNights = (component as unknown as { getNightsLabel: (s: string, e: string) => string }).getNightsLabel(
      '2026-02-01T00:00:00Z',
      '2026-02-05T00:00:00Z',
    );

    // Assert
    expect(rangeLabel).toContain(' - ');
    expect(oneNight).toBe('1 night');
    expect(manyNights).toBe('4 nights');
  });
});
