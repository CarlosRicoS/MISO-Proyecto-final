/// <reference types="jasmine" />
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BookingDetailPage } from './booking-detail.page';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { BookingService } from '../../core/services/booking.service';
import { PropertyDetailService } from '../../core/services/property-detail.service';

describe('BookingDetailPage', () => {
  let component: BookingDetailPage;
  let fixture: ComponentFixture<BookingDetailPage>;
  let routerMock: RouterMock;
  const routeMock = {
    snapshot: {
      queryParamMap: convertToParamMap({}),
      paramMap: convertToParamMap({}),
    },
  };

  const mockPropertyDetail = {
    id: 'prop-1',
    name: 'Casa Playa Cartagena',
    city: 'Cartagena',
    country: 'CO',
    maxCapacity: 4,
    description: 'Great property',
    photos: ['https://example.com/photo.jpg'],
    checkInTime: '15:00:00',
    checkOutTime: '11:00:00',
    adminGroupId: 'group-1',
    amenities: [{ id: 'a-1', description: 'Pool' }],
    reviews: [{ id: 'r-1', description: 'Excellent', rating: 4.5, name: 'Ana' }],
  };

  const mockReservation = {
    id: 'res-1',
    property_id: 'prop-1',
    user_id: 'user-1',
    guests: 2,
    period_start: '2026-04-26',
    period_end: '2026-04-29',
    price: 300,
    status: 'PENDING',
    admin_group_id: 'group-1',
    payment_reference: null,
    created_at: '2026-04-18T00:00:00Z',
  };

  class RouterMock {
    url = '/booking-detail';
    returnNavigation = true;
    navigationState: Record<string, unknown> = {
      reservation: mockReservation,
      propertyDetail: mockPropertyDetail,
    };
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);

    getCurrentNavigation() {
      if (!this.returnNavigation) {
        return null;
      }

      return {
        extras: {
          state: this.navigationState,
        },
      };
    }
  }

  class PropertyDetailServiceMock {
    getPropertyDetail = jasmine.createSpy('getPropertyDetail').and.returnValue(of(mockPropertyDetail));
  }

  class BookingServiceMock {
    getReservation = jasmine.createSpy('getReservation').and.returnValue(of(mockReservation));
    cancelReservation = jasmine.createSpy('cancelReservation').and.returnValue(of(mockReservation));
  }

  class AuthSessionServiceMock {
    isLoggedIn = true;
    idToken = 'id-token';
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingDetailPage],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: PropertyDetailService, useClass: PropertyDetailServiceMock },
        { provide: BookingService, useClass: BookingServiceMock },
        { provide: AuthSessionService, useClass: AuthSessionServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingDetailPage);
    component = fixture.componentInstance;
    routerMock = TestBed.inject(Router) as unknown as RouterMock;
    routeMock.snapshot.queryParamMap = convertToParamMap({});
    routeMock.snapshot.paramMap = convertToParamMap({});
  });

  it('creates', async () => {
    await component.ngOnInit();
    expect(component).toBeTruthy();
  });

  it('maps pending reservation status to Upcoming and pending variant', async () => {
    routerMock.navigationState = {
      reservation: { ...mockReservation, status: 'PENDING' },
      propertyDetail: mockPropertyDetail,
    };

    await component.ngOnInit();

    expect(component.bookingStatus).toBe('Upcoming');
    expect(component.bookingStatusVariant).toBe('pending');
    expect(component.bookingDateRange).toContain('Apr');
    expect(component.bookingNights).toBe('3 nights');
  });

  it('maps cancelled reservation status to Canceled and canceled variant', async () => {
    routerMock.navigationState = {
      reservation: { ...mockReservation, status: 'CANCELLED' },
      propertyDetail: mockPropertyDetail,
    };

    await component.ngOnInit();

    expect(component.bookingStatus).toBe('Canceled');
    expect(component.bookingStatusVariant).toBe('canceled');
  });

  it('uses bookingStatus from navigation state as fallback', async () => {
    routerMock.navigationState = {
      bookingStatus: 'Canceled',
      reservation: { ...mockReservation, status: '' },
      propertyDetail: mockPropertyDetail,
    };

    await component.ngOnInit();

    expect(component.bookingStatus).toBe('Canceled');
    expect(component.bookingStatusVariant).toBe('canceled');
  });

  it('redirects to login when session is logged out', async () => {
    const authSession = TestBed.inject(AuthSessionService) as unknown as AuthSessionServiceMock;
    authSession.isLoggedIn = false;

    await component.ngOnInit();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: {
        returnUrl: '/booking-detail',
      },
    });
  });

  it('shows not available alert when cancel action is requested without reservation', () => {
    component.onCancelBooking();

    expect(component.isAlertOpen).toBeTrue();
    expect(component.alertTitle).toBe('Cancellation unavailable');
  });

  it('opens cancel confirmation for active reservations', () => {
    (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = {
      ...mockReservation,
      status: 'CONFIRMED',
    };

    component.onCancelBooking();

    expect(component.isCancelConfirmOpen).toBeTrue();
  });

  it('returns early from cancel confirmation when reservation is already canceled', async () => {
    const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
    (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = {
      ...mockReservation,
      status: 'CANCELED',
    };

    await component.onCancelConfirmed();

    expect(bookingService.cancelReservation).not.toHaveBeenCalled();
  });

  it('cancels reservation and prepares navigation back to booking list', async () => {
    const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
    (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = {
      ...mockReservation,
      status: 'CONFIRMED',
    };

    await component.onCancelConfirmed();

    expect(bookingService.cancelReservation).toHaveBeenCalledWith('res-1', 'id-token');
    expect(component.shouldNavigateToBookingList).toBeTrue();
    expect(component.alertTitle).toBe('Reservation Cancelled');
    expect(component.isCancelling).toBeFalse();
  });

  it('uses backend error message when cancellation fails', async () => {
    const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
    bookingService.cancelReservation.and.returnValue(
      throwError(() => ({ error: { message: 'Already canceled by host' } })),
    );
    (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = {
      ...mockReservation,
      status: 'CONFIRMED',
    };

    await component.onCancelConfirmed();

    expect(component.alertTitle).toBe('Cancellation Error');
    expect(component.alertMessage).toBe('Already canceled by host');
    expect(component.isCancelling).toBeFalse();
  });

  it('navigates to booking list after success alert is dismissed', async () => {
    component.shouldNavigateToBookingList = true;

    component.onAlertDismissed();

    expect(component.shouldNavigateToBookingList).toBeFalse();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/booking-list']);
  });

  it('loads reservation from query booking id when navigation state is missing', async () => {
    const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
    const propertyDetailService = TestBed.inject(PropertyDetailService) as unknown as PropertyDetailServiceMock;
    routeMock.snapshot.queryParamMap = convertToParamMap({ bookingId: 'res-1' });
    routerMock.returnNavigation = false;

    await component.ngOnInit();

    expect(bookingService.getReservation).toHaveBeenCalledWith('res-1', 'id-token');
    expect(propertyDetailService.getPropertyDetail).toHaveBeenCalledWith('prop-1');
    expect(component.errorMessage).toBe('');
  });

  it('sets error message when booking id cannot be resolved', async () => {
    routeMock.snapshot.queryParamMap = convertToParamMap({});
    routeMock.snapshot.paramMap = convertToParamMap({});
    routerMock.returnNavigation = false;

    await component.ngOnInit();

    expect(component.errorMessage).toBe('Unable to load booking details.');
  });

  it('maps helper labels for confirmed, completed and default statuses', () => {
    const getBookingStatusLabel = (
      component as unknown as {
        getBookingStatusLabel: (status: string) => string;
      }
    ).getBookingStatusLabel.bind(component);

    expect(getBookingStatusLabel('CONFIRMED')).toBe('Confirmed');
    expect(getBookingStatusLabel('COMPLETED')).toBe('Completed');
    expect(getBookingStatusLabel('ARCHIVED')).toBe('Archived');
    expect(getBookingStatusLabel('')).toBe('Upcoming');
  });

  it('maps helper variants for pending, confirmed, completed, canceled and default', () => {
    const getBookingStatusVariant = (
      component as unknown as {
        getBookingStatusVariant: (status: string) => string;
      }
    ).getBookingStatusVariant.bind(component);

    expect(getBookingStatusVariant('UPCOMING')).toBe('pending');
    expect(getBookingStatusVariant('CONFIRMED')).toBe('confirmed');
    expect(getBookingStatusVariant('COMPLETED')).toBe('completed');
    expect(getBookingStatusVariant('CANCELLED')).toBe('canceled');
    expect(getBookingStatusVariant('UNKNOWN')).toBe('default');
  });

  it('formats booking date ranges for same month, same year and cross-year periods', () => {
    const formatBookingDateRange = (
      component as unknown as {
        formatBookingDateRange: (start: string, end: string) => string;
      }
    ).formatBookingDateRange.bind(component);

    expect(formatBookingDateRange('2026-04-26', '2026-04-29')).toContain('Apr');
    expect(formatBookingDateRange('2026-04-26', '2026-04-29')).toContain(' - ');
    expect(formatBookingDateRange('2026-04-30', '2026-05-02')).toContain('May');
    expect(formatBookingDateRange('2026-12-30', '2027-01-02')).toContain('2027');
    expect(formatBookingDateRange('invalid', '2026-01-02')).toBe('invalid - 2026-01-02');
  });

  it('computes nights between dates and handles invalid ranges', () => {
    const getNightsBetween = (
      component as unknown as {
        getNightsBetween: (start?: string, end?: string) => number;
      }
    ).getNightsBetween.bind(component);

    expect(getNightsBetween('2026-04-26', '2026-04-29')).toBe(3);
    expect(getNightsBetween('2026-04-29', '2026-04-26')).toBe(0);
    expect(getNightsBetween('invalid', '2026-04-26')).toBe(0);
    expect(getNightsBetween(undefined, undefined)).toBe(0);
  });

  it('returns score labels across all ranges', () => {
    const getScoreLabel = (
      component as unknown as {
        getScoreLabel: (score: number) => string;
      }
    ).getScoreLabel.bind(component);

    expect(getScoreLabel(4.8)).toBe('Exceptional');
    expect(getScoreLabel(4.3)).toBe('Excellent');
    expect(getScoreLabel(3.7)).toBe('Very good');
    expect(getScoreLabel(3.1)).toBe('Good');
    expect(getScoreLabel(2.5)).toBe('Fair');
  });

  it('maps amenity icons with fitness fallback branch included', () => {
    const getAmenityIcon = (
      component as unknown as {
        getAmenityIcon: (description?: string) => string;
      }
    ).getAmenityIcon.bind(component);

    expect(getAmenityIcon('WiFi included')).toBe('wifi-outline');
    expect(getAmenityIcon('Car parking')).toBe('car-outline');
    expect(getAmenityIcon('Infinity pool')).toBe('water-outline');
    expect(getAmenityIcon('Fitness room')).toBe('barbell-outline');
    expect(getAmenityIcon('Restaurant buffet')).toBe('restaurant-outline');
    expect(getAmenityIcon('Spa access')).toBe('flower-outline');
    expect(getAmenityIcon('Air conditioning')).toBe('snow-outline');
    expect(getAmenityIcon('Room service')).toBe('cafe-outline');
    expect(getAmenityIcon('Unknown amenity')).toBe('checkmark-circle-outline');
  });
});
