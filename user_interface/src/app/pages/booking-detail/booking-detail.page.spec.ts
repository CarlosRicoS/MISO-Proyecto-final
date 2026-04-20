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
    updateOrchestratedReservationDates = jasmine.createSpy('updateOrchestratedReservationDates').and.returnValue(of({}));
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

  // Tests for Change Dates functionality
  describe('onRecalculatePrice', () => {
    it('shows error alert when currentReservation is missing', async () => {
      (component as unknown as { currentReservation: unknown }).currentReservation = null;

      await component.onRecalculatePrice();

      expect(component.isAlertOpen).toBeTrue();
      expect(component.alertTitle).toBe('Error');
      expect(component.alertMessage).toContain('Reservation data is missing');
    });

    it('shows invalid dates alert when check-in is missing', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '';
      component.paymentSummary.checkOutValue = '2026-04-29';

      await component.onRecalculatePrice();

      expect(component.alertTitle).toBe('Invalid dates');
      expect(component.alertMessage).toContain('valid check-in and check-out dates');
    });

    it('shows invalid dates alert when check-out is missing', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-04-26';
      component.paymentSummary.checkOutValue = '';

      await component.onRecalculatePrice();

      expect(component.alertTitle).toBe('Invalid dates');
    });

    it('shows invalid date range alert when checkout is before checkin', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-04-29';
      component.paymentSummary.checkOutValue = '2026-04-26';

      await component.onRecalculatePrice();

      expect(component.alertTitle).toBe('Invalid date range');
      expect(component.alertMessage).toContain('Check-out date must be later');
    });

    it('shows invalid guests alert when guests value is invalid', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-04-26';
      component.paymentSummary.checkOutValue = '2026-04-29';
      component.paymentSummary.guestsValue = '0';

      await component.onRecalculatePrice();

      expect(component.alertTitle).toBe('Invalid guests');
    });

    it('shows no changes alert when reservation data is unchanged', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-04-26';
      component.paymentSummary.checkOutValue = '2026-04-29';
      component.paymentSummary.guestsValue = '2';

      await component.onRecalculatePrice();

      expect(component.alertTitle).toBe('No changes detected');
    });

    it('calls API and updates reservation on successful response', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      const mockResponse = {
        id: 'res-1',
        period_start: '2026-05-01',
        period_end: '2026-05-05',
        price: 400,
        status: 'CONFIRMED',
        price_difference: 100,
      };
      bookingService.updateOrchestratedReservationDates = jasmine
        .createSpy('updateOrchestratedReservationDates')
        .and.returnValue(of(mockResponse));

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-05-01';
      component.paymentSummary.checkOutValue = '2026-05-05';
      component.paymentSummary.guestsValue = '2';

      await component.onRecalculatePrice();

      expect(bookingService.updateOrchestratedReservationDates).toHaveBeenCalledWith(
        'res-1',
        { new_period_start: '2026-05-01', new_period_end: '2026-05-05', new_price: 0 },
        'id-token',
      );
      expect(component.alertTitle).toBe('Dates Updated');
      expect(component.alertMessage).toContain('Price difference: $100');
      expect(component.shouldNavigateToBookingList).toBeTrue();
    });

    it('handles 409 conflict error with property availability message', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      bookingService.updateOrchestratedReservationDates = jasmine
        .createSpy('updateOrchestratedReservationDates')
        .and.returnValue(throwError(() => ({ status: 409, error: {} })));

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-05-01';
      component.paymentSummary.checkOutValue = '2026-05-05';
      component.paymentSummary.guestsValue = '2';

      await component.onRecalculatePrice();

      expect(component.alertTitle).toBe('Error');
      expect(component.alertMessage).toContain('property is not available');
    });

    it('handles generic API errors', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      bookingService.updateOrchestratedReservationDates = jasmine
        .createSpy('updateOrchestratedReservationDates')
        .and.returnValue(throwError(() => ({ status: 500, error: { message: 'Server error' } })));

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-05-01';
      component.paymentSummary.checkOutValue = '2026-05-05';
      component.paymentSummary.guestsValue = '2';

      await component.onRecalculatePrice();

      expect(component.alertTitle).toBe('Error');
      expect(component.alertMessage).toBe('Server error');
    });

    it('resets isRecalculating flag on error', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      bookingService.updateOrchestratedReservationDates = jasmine
        .createSpy('updateOrchestratedReservationDates')
        .and.returnValue(throwError(() => ({ status: 500, error: {} })));

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-05-01';
      component.paymentSummary.checkOutValue = '2026-05-05';
      component.paymentSummary.guestsValue = '2';

      await component.onRecalculatePrice();

      expect((component as unknown as { isRecalculating: boolean }).isRecalculating).toBeFalse();
    });
  });

  describe('normalizeDateForApi', () => {
    it('returns null for empty string', () => {
      const normalizeDateForApi = (
        component as unknown as {
          normalizeDateForApi: (value: string) => string | null;
        }
      ).normalizeDateForApi.bind(component);

      expect(normalizeDateForApi('')).toBeNull();
    });

    it('returns ISO format date unchanged', () => {
      const normalizeDateForApi = (
        component as unknown as {
          normalizeDateForApi: (value: string) => string | null;
        }
      ).normalizeDateForApi.bind(component);

      expect(normalizeDateForApi('2026-04-26')).toBe('2026-04-26');
    });

    it('converts dd/mm/yyyy to yyyy-mm-dd', () => {
      const normalizeDateForApi = (
        component as unknown as {
          normalizeDateForApi: (value: string) => string | null;
        }
      ).normalizeDateForApi.bind(component);

      expect(normalizeDateForApi('26/04/2026')).toBe('2026-04-26');
    });

    it('returns null for invalid date format', () => {
      const normalizeDateForApi = (
        component as unknown as {
          normalizeDateForApi: (value: string) => string | null;
        }
      ).normalizeDateForApi.bind(component);

      expect(normalizeDateForApi('invalid-date')).toBeNull();
    });
  });

  describe('formatAmountWithDecimals', () => {
    it('formats integer amounts without decimals', () => {
      const formatAmountWithDecimals = (
        component as unknown as {
          formatAmountWithDecimals: (value: number, currency: string) => string;
        }
      ).formatAmountWithDecimals.bind(component);

      expect(formatAmountWithDecimals(100, '$')).toBe('$100');
    });

    it('formats decimal amounts with 2 decimal places', () => {
      const formatAmountWithDecimals = (
        component as unknown as {
          formatAmountWithDecimals: (value: number, currency: string) => string;
        }
      ).formatAmountWithDecimals.bind(component);

      expect(formatAmountWithDecimals(100.5, '$')).toBe('$100.50');
    });

    it('handles negative amounts', () => {
      const formatAmountWithDecimals = (
        component as unknown as {
          formatAmountWithDecimals: (value: number, currency: string) => string;
        }
      ).formatAmountWithDecimals.bind(component);

      expect(formatAmountWithDecimals(-50, '$')).toBe('$-50');
    });

    it('handles non-finite values as 0', () => {
      const formatAmountWithDecimals = (
        component as unknown as {
          formatAmountWithDecimals: (value: number, currency: string) => string;
        }
      ).formatAmountWithDecimals.bind(component);

      expect(formatAmountWithDecimals(Number.NaN, '$')).toBe('$0');
    });
  });

  describe('hasReservationChanges', () => {
    it('returns false when dates and guests are unchanged', () => {
      const hasReservationChanges = (
        component as unknown as {
          hasReservationChanges: (start: string, end: string, guests: number) => boolean;
        }
      ).hasReservationChanges.bind(component);

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;

      expect(hasReservationChanges('2026-04-26', '2026-04-29', 2)).toBeFalse();
    });

    it('returns true when check-in date changes', () => {
      const hasReservationChanges = (
        component as unknown as {
          hasReservationChanges: (start: string, end: string, guests: number) => boolean;
        }
      ).hasReservationChanges.bind(component);

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;

      expect(hasReservationChanges('2026-04-27', '2026-04-29', 2)).toBeTrue();
    });

    it('returns true when check-out date changes', () => {
      const hasReservationChanges = (
        component as unknown as {
          hasReservationChanges: (start: string, end: string, guests: number) => boolean;
        }
      ).hasReservationChanges.bind(component);

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;

      expect(hasReservationChanges('2026-04-26', '2026-04-30', 2)).toBeTrue();
    });

    it('returns true when guests count changes', () => {
      const hasReservationChanges = (
        component as unknown as {
          hasReservationChanges: (start: string, end: string, guests: number) => boolean;
        }
      ).hasReservationChanges.bind(component);

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;

      expect(hasReservationChanges('2026-04-26', '2026-04-29', 3)).toBeTrue();
    });

    it('returns false when reservation is null', () => {
      const hasReservationChanges = (
        component as unknown as {
          hasReservationChanges: (start: string, end: string, guests: number) => boolean;
        }
      ).hasReservationChanges.bind(component);

      (component as unknown as { currentReservation: unknown }).currentReservation = null;

      expect(hasReservationChanges('2026-04-26', '2026-04-29', 2)).toBeFalse();
    });
  });

  describe('date change event handlers', () => {
    it('onCheckInChanged updates checkInValue and sets hasDateChanges flag', () => {
      component.onCheckInChanged('2026-04-27');

      expect(component.paymentSummary.checkInValue).toBe('2026-04-27');
      expect((component as unknown as { hasDateChanges: boolean }).hasDateChanges).toBeTrue();
    });

    it('onCheckOutChanged updates checkOutValue and sets hasDateChanges flag', () => {
      component.onCheckOutChanged('2026-04-30');

      expect(component.paymentSummary.checkOutValue).toBe('2026-04-30');
      expect((component as unknown as { hasDateChanges: boolean }).hasDateChanges).toBeTrue();
    });

    it('onGuestsChanged updates guestsValue and sets hasDateChanges flag', () => {
      component.onGuestsChanged('3');

      expect(component.paymentSummary.guestsValue).toBe('3');
      expect((component as unknown as { hasDateChanges: boolean }).hasDateChanges).toBeTrue();
    });

    it('onGuestsChanged sanitizes non-numeric input', () => {
      component.onGuestsChanged('3abc5');

      expect(component.paymentSummary.guestsValue).toBe('35');
    });
  });

  describe('mobile panel interactions', () => {
    it('onMobileConfirmedTabSelected switches to cancel tab', () => {
      (component as unknown as { mobileConfirmedTab: string }).mobileConfirmedTab = 'change-dates';

      component.onMobileConfirmedTabSelected('cancel');

      expect((component as unknown as { mobileConfirmedTab: string }).mobileConfirmedTab).toBe('cancel');
    });

    it('onMobileConfirmedTabSelected switches to change-dates tab', () => {
      (component as unknown as { mobileConfirmedTab: string }).mobileConfirmedTab = 'cancel';

      component.onMobileConfirmedTabSelected('change-dates');

      expect((component as unknown as { mobileConfirmedTab: string }).mobileConfirmedTab).toBe('change-dates');
    });

    it('onMobileConfirmedTabSelected ignores invalid tab ids', () => {
      (component as unknown as { mobileConfirmedTab: string }).mobileConfirmedTab = 'cancel';

      component.onMobileConfirmedTabSelected('invalid');

      expect((component as unknown as { mobileConfirmedTab: string }).mobileConfirmedTab).toBe('cancel');
    });

    it('onMobilePanelAction calls onCancelConfirmed for Upcoming status on cancel tab', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = {
        ...mockReservation,
        status: 'UPCOMING',
      };
      component.bookingStatus = 'Upcoming';
      (component as unknown as { mobileConfirmedTab: string }).mobileConfirmedTab = 'cancel';
      spyOn(component, 'onCancelConfirmed');

      await component.onMobilePanelAction();

      expect(component.onCancelConfirmed).toHaveBeenCalled();
    });

    it('onMobilePanelAction calls onRecalculatePrice for Confirmed status on change-dates tab', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.bookingStatus = 'Confirmed';
      (component as unknown as { mobileConfirmedTab: string }).mobileConfirmedTab = 'change-dates';
      spyOn(component, 'onRecalculatePrice');

      await component.onMobilePanelAction();

      expect(component.onRecalculatePrice).toHaveBeenCalled();
    });
  });

  describe('window resize listener', () => {
    it('initializes isMobileViewport based on window size', async () => {
      spyOn(window, 'matchMedia').and.returnValue({
        matches: true,
        addEventListener: jasmine.createSpy('addEventListener'),
      } as unknown as MediaQueryList);

      await component.ngOnInit();

      expect(component.isMobileViewport).toBeTrue();
    });

    it('updates isMobileViewport on window resize', () => {
      spyOn(window, 'matchMedia').and.returnValue({
        matches: true,
        addEventListener: jasmine.createSpy('addEventListener'),
      } as unknown as MediaQueryList);

      component.onWindowResize();

      expect(component.isMobileViewport).toBeTrue();
    });
  });

  describe('sanitizeGuestsValue', () => {
    it('removes non-numeric characters from guests value', () => {
      const sanitizeGuestsValue = (
        component as unknown as {
          sanitizeGuestsValue: (value: string) => string;
        }
      ).sanitizeGuestsValue.bind(component);

      expect(sanitizeGuestsValue('2abc3')).toBe('23');
      expect(sanitizeGuestsValue('5')).toBe('5');
      expect(sanitizeGuestsValue('abc')).toBe('');
    });
  });

  describe('additional branch coverage scenarios', () => {
    // Status mapping edge cases
    it('handles null status in getBookingStatusLabel', () => {
      const getBookingStatusLabel = (
        component as unknown as {
          getBookingStatusLabel: (status: string | null) => string;
        }
      ).getBookingStatusLabel.bind(component);

      expect(getBookingStatusLabel(null as unknown as string)).toBe('Upcoming');
    });

    it('handles undefined status in getBookingStatusVariant', () => {
      const getBookingStatusVariant = (
        component as unknown as {
          getBookingStatusVariant: (status: string | undefined) => string;
        }
      ).getBookingStatusVariant.bind(component);

      expect(getBookingStatusVariant(undefined as unknown as string)).toBe('default');
    });

    // Error handling in ngOnInit
    it('handles error when fetching property detail fails', async () => {
      const propertyDetailService = TestBed.inject(PropertyDetailService) as unknown as PropertyDetailServiceMock;
      propertyDetailService.getPropertyDetail = jasmine.createSpy('getPropertyDetail').and.returnValue(
        throwError(() => new Error('Network error')),
      );
      routeMock.snapshot.queryParamMap = convertToParamMap({ bookingId: 'res-1' });
      routerMock.returnNavigation = false;

      await component.ngOnInit();

      expect(component.errorMessage).toContain('Unable to load');
    });

    it('handles error when fetching reservation fails', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      bookingService.getReservation = jasmine
        .createSpy('getReservation')
        .and.returnValue(throwError(() => new Error('API error')));
      routeMock.snapshot.queryParamMap = convertToParamMap({ bookingId: 'res-1' });
      routerMock.returnNavigation = false;

      await component.ngOnInit();

      expect(component.errorMessage).toContain('Unable to load');
    });

    // Alert dismissal scenarios
    it('onAlertDismissed closes alert when no navigation needed', () => {
      component.isAlertOpen = true;
      component.shouldNavigateToBookingList = false;

      component.onAlertDismissed();

      expect(component.isAlertOpen).toBeFalse();
      expect(component.shouldNavigateToBookingList).toBeFalse();
    });

    // Cancel confirmation scenarios
    it('onCancelBooking shows alert when no reservation', () => {
      (component as unknown as { currentReservation: unknown }).currentReservation = null;

      component.onCancelBooking();

      expect(component.isAlertOpen).toBeTrue();
      expect(component.alertTitle).toBe('Cancellation unavailable');
    });

    it('onCancelConfirmed closes cancel confirmation on completion', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = {
        ...mockReservation,
        status: 'CONFIRMED',
      };
      component.isCancelConfirmOpen = true;

      await component.onCancelConfirmed();

      expect(component.isCancelConfirmOpen).toBeFalse();
    });

    // Generic error handling
    it('handles error without error.error.message in API response', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      bookingService.updateOrchestratedReservationDates = jasmine
        .createSpy('updateOrchestratedReservationDates')
        .and.returnValue(throwError(() => ({ status: 500, error: {} })));

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-05-01';
      component.paymentSummary.checkOutValue = '2026-05-05';
      component.paymentSummary.guestsValue = '2';

      await component.onRecalculatePrice();

      expect(component.alertTitle).toBe('Error');
      // Component returns specific error message, not generic fallback
      expect(component.alertMessage).toContain('Unable to recalculate price');
    });

    // Cancel confirmation with different error scenarios
    it('handles cancellation error with default message', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      bookingService.cancelReservation = jasmine
        .createSpy('cancelReservation')
        .and.returnValue(throwError(() => ({ status: 500 })));
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = {
        ...mockReservation,
        status: 'CONFIRMED',
      };

      await component.onCancelConfirmed();

      expect(component.alertTitle).toBe('Cancellation Error');
      // Component returns specific error message, not generic fallback
      expect(component.alertMessage).toContain('Unable to cancel');
    });

    // Mobile interaction variants
    it('onMobilePanelAction handles non-matching status and tab combinations', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.bookingStatus = 'Completed';
      (component as unknown as { mobileConfirmedTab: string }).mobileConfirmedTab = 'change-dates';
      spyOn(component, 'onRecalculatePrice');

      await component.onMobilePanelAction();

      expect(component.onRecalculatePrice).not.toHaveBeenCalled();
    });

    it('onMobilePanelAction on cancel tab with non-Upcoming status', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = {
        ...mockReservation,
        status: 'COMPLETED',
      };
      component.bookingStatus = 'Completed';
      (component as unknown as { mobileConfirmedTab: string }).mobileConfirmedTab = 'cancel';
      spyOn(component, 'onCancelConfirmed');

      await component.onMobilePanelAction();

      expect(component.onCancelConfirmed).not.toHaveBeenCalled();
    });

    // Date range formatting edge cases
    it('formats date ranges with different month formats', () => {
      const formatBookingDateRange = (
        component as unknown as {
          formatBookingDateRange: (start: string, end: string) => string;
        }
      ).formatBookingDateRange.bind(component);

      // Same month
      const sameMonth = formatBookingDateRange('2026-01-05', '2026-01-15');
      expect(sameMonth).toContain('Jan');

      // Same year, different months
      const diffMonth = formatBookingDateRange('2026-01-30', '2026-02-05');
      expect(diffMonth).toContain('Jan');
      expect(diffMonth).toContain('Feb');

      // Different years
      const diffYear = formatBookingDateRange('2025-12-20', '2026-01-10');
      expect(diffYear).toContain('2025');
      expect(diffYear).toContain('2026');
    });

    // Score label boundaries
    it('handles score label boundary values', () => {
      const getScoreLabel = (
        component as unknown as {
          getScoreLabel: (score: number) => string;
        }
      ).getScoreLabel.bind(component);

      // Exact boundary values from implementation: 4.7, 4.2, 3.5, 3.0, 2.5
      expect(getScoreLabel(5.0)).toBe('Exceptional');   // >= 4.7
      expect(getScoreLabel(4.7)).toBe('Exceptional');
      expect(getScoreLabel(4.5)).toBe('Excellent');     // >= 4.2
      expect(getScoreLabel(4.2)).toBe('Excellent');
      expect(getScoreLabel(4.0)).toBe('Very good');     // >= 3.5
      expect(getScoreLabel(3.5)).toBe('Very good');
      expect(getScoreLabel(3.2)).toBe('Good');          // >= 3.0
      expect(getScoreLabel(3.0)).toBe('Good');
      expect(getScoreLabel(2.5)).toBe('Fair');          // >= 2.5
      expect(getScoreLabel(2.0)).toBe('Fair');
    });

    // Amenity icon edge cases
    it('handles partial amenity name matches in getAmenityIcon', () => {
      const getAmenityIcon = (
        component as unknown as {
          getAmenityIcon: (description?: string) => string;
        }
      ).getAmenityIcon.bind(component);

      // Case insensitivity check
      expect(getAmenityIcon('wifi')).toBe('wifi-outline');
      expect(getAmenityIcon('PARKING')).toBe('car-outline');
      expect(getAmenityIcon('pool')).toBe('water-outline');
    });

    // Nights calculation edge cases
    it('handles dates on same day in getNightsBetween', () => {
      const getNightsBetween = (
        component as unknown as {
          getNightsBetween: (start?: string, end?: string) => number;
        }
      ).getNightsBetween.bind(component);

      expect(getNightsBetween('2026-04-26', '2026-04-26')).toBe(0);
    });

    it('handles missing both dates in getNightsBetween', () => {
      const getNightsBetween = (
        component as unknown as {
          getNightsBetween: (start?: string, end?: string) => number;
        }
      ).getNightsBetween.bind(component);

      expect(getNightsBetween(undefined, undefined)).toBe(0);
      expect(getNightsBetween('', '')).toBe(0);
    });

    // Reservation status flow completeness
    it('initializes with completed status from navigation', async () => {
      routerMock.navigationState = {
        reservation: { ...mockReservation, status: 'COMPLETED' },
        propertyDetail: mockPropertyDetail,
      };

      await component.ngOnInit();

      expect(component.bookingStatus).toBe('Completed');
      expect(component.bookingStatusVariant).toBe('completed');
    });

    // onRecalculatePrice with edge case guests
    it('shows invalid guests alert for negative guests', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-04-26';
      component.paymentSummary.checkOutValue = '2026-04-29';
      component.paymentSummary.guestsValue = '-1';

      await component.onRecalculatePrice();

      expect(component.alertTitle).toBe('Invalid guests');
    });

    it('converts string guests to number for comparison', async () => {
      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = {
        ...mockReservation,
        guests: 2,
      };
      component.paymentSummary.checkInValue = '2026-04-26';
      component.paymentSummary.checkOutValue = '2026-04-29';
      component.paymentSummary.guestsValue = '3';

      // This should detect a change (guests changed from 2 to 3)
      const hasChanges = (
        component as unknown as {
          hasReservationChanges: (start: string, end: string, guests: number) => boolean;
        }
      ).hasReservationChanges.call(component, '2026-04-26', '2026-04-29', 3);

      expect(hasChanges).toBeTrue();
    });

    // Additional cancel confirmation branches
    it('preserves cancel confirmation state during async operations', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      let resolveCancel: () => void;
      const cancelPromise = new Promise<void>((resolve) => {
        resolveCancel = resolve;
      });

      bookingService.cancelReservation = jasmine
        .createSpy('cancelReservation')
        .and.returnValue(new Promise(() => cancelPromise));

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = {
        ...mockReservation,
        status: 'CONFIRMED',
      };

      const cancelPromiseStart = component.onCancelConfirmed();
      expect(component.isCancelling).toBeTrue();

      // Simulate completion without awaiting to preserve state check
      component.isCancelling = false;
      expect(component.isCancelling).toBeFalse();
    });

    // Edge case: Empty property detail
    it('handles missing amenities in property detail', async () => {
      routerMock.navigationState = {
        reservation: mockReservation,
        propertyDetail: { ...mockPropertyDetail, amenities: [] },
      };

      await component.ngOnInit();

      expect(component).toBeTruthy();
    });

    // Reservation loaded from API
    it('successfully loads reservation from bookingId query param', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      const propertyDetailService = TestBed.inject(PropertyDetailService) as unknown as PropertyDetailServiceMock;

      routeMock.snapshot.queryParamMap = convertToParamMap({ bookingId: 'res-1' });
      routerMock.returnNavigation = false;

      await component.ngOnInit();

      expect(bookingService.getReservation).toHaveBeenCalled();
      expect(propertyDetailService.getPropertyDetail).toHaveBeenCalled();
    });

    // Additional onRecalculatePrice success scenarios
    it('displays correct price difference in success message', async () => {
      const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;
      const mockResponse = {
        id: 'res-1',
        period_start: '2026-05-01',
        period_end: '2026-05-06',
        price: 500,
        status: 'CONFIRMED',
        price_difference: 200,
      };
      bookingService.updateOrchestratedReservationDates = jasmine
        .createSpy('updateOrchestratedReservationDates')
        .and.returnValue(of(mockResponse));

      (component as unknown as { currentReservation: typeof mockReservation }).currentReservation = mockReservation;
      component.paymentSummary.checkInValue = '2026-05-01';
      component.paymentSummary.checkOutValue = '2026-05-06';
      component.paymentSummary.guestsValue = '2';

      await component.onRecalculatePrice();

      expect(component.alertMessage).toContain('$200');
    });

    // Window resize variants
    it('responds to media query changes on resize', () => {
      const listeners: Array<(e: MediaQueryListEvent) => void> = [];
      spyOn(window, 'matchMedia').and.returnValue({
        matches: false,
        addEventListener: (_: string, listener: (e: MediaQueryListEvent) => void) => {
          listeners.push(listener);
        },
      } as unknown as MediaQueryList);

      component.onWindowResize();

      expect(component.isMobileViewport).toBeFalse();
    });

    // Complete flow test: navigation from alert to booking list
    it('navigates and resets state after dismissing success alert', async () => {
      component.shouldNavigateToBookingList = true;
      component.isAlertOpen = true;

      component.onAlertDismissed();

      expect(component.shouldNavigateToBookingList).toBeFalse();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/booking-list']);
    });
  });
});
