import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ThBadgeComponent } from '../../shared/components/th-badge/th-badge.component';
import { ThHotelCardComponent } from '../../shared/components/th-hotel-card/th-hotel-card.component';
import { ThPaymentSummaryComponent } from '../../shared/components/th-payment-summary/th-payment-summary.component';
import { ThAmenitiesSummaryComponent } from '../../shared/components/th-amenities-summary/th-amenities-summary.component';
import { ThDetailSummaryComponent } from '../../shared/components/th-detail-summary/th-detail-summary.component';
import { ThDetailsMosaicComponent } from '../../shared/components/th-details-mosaic/th-details-mosaic.component';
import { ThPropertyDescriptionSummaryComponent } from '../../shared/components/th-property-description-summary/th-property-description-summary.component';
import { ThPropertyReviewSummaryComponent } from '../../shared/components/th-property-review-summary/th-property-review-summary.component';
import { PropertydetailPage } from './propertydetail.page';
import { CommonModule } from '@angular/common';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { BookingService } from '../../core/services/booking.service';
import { PendingBookingService } from '../../core/services/pending-booking.service';

describe('PropertydetailPage', () => {
  let component: PropertydetailPage;
  let fixture: ComponentFixture<PropertydetailPage>;
  let routerMock: RouterMock;
  const routeMock = { snapshot: { paramMap: convertToParamMap({}) } };

  const mockDetail = {
    id: 'prop-1',
    name: 'Hotel Aurora',
    maxCapacity: 4,
    description: 'Sample description',
    photos: ['https://img.example.com/1.jpg'],
    checkInTime: '15:00:00',
    checkOutTime: '11:00:00',
    adminGroupId: 'hotel-admins',
    amenities: [{ id: 'a1', description: 'Free WiFi' }],
    reviews: [{ id: 'r1', description: 'Nice', rating: 4, name: 'Ana' }],
  };

  const mockHotel = {
    id: 'prop-1',
    name: 'Hotel Aurora',
    city: 'Bogota',
    country: 'CO',
    pricePerNight: 200,
    currency: 'USD',
    rating: 4.4,
    imageUrl: 'https://img.example.com/1.jpg',
  };

  class RouterMock {
    events = of();
    url = '/propertydetail/prop-1';
    navigationState = {
      hotel: mockHotel,
      propertyDetail: mockDetail,
      search: { startDate: '2026-05-10', endDate: '2026-05-12', capacity: 2 },
    };
    returnNavigation = true;
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
    getPropertyDetail = jasmine.createSpy('getPropertyDetail').and.returnValue(of(mockDetail));
  }

  class BookingServiceMock {
    createReservation = jasmine.createSpy('createReservation').and.returnValue(of({ reservation_id: 'r-1' }));
  }

  class AuthSessionServiceMock {
    isLoggedIn = false;
    userId = '';
    userEmail = '';
    accessToken = '';
    idToken = '';
  }

  class PendingBookingServiceMock {
    setPendingBooking = jasmine.createSpy('setPendingBooking');
    consumePendingBookingForProperty = jasmine.createSpy('consumePendingBookingForProperty').and.returnValue(null);
    clearPendingBooking = jasmine.createSpy('clearPendingBooking');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PropertydetailPage],
      imports: [
        CommonModule,
        IonicModule.forRoot(),
        ThBadgeComponent,
        ThHotelCardComponent,
        ThPaymentSummaryComponent,
        ThAmenitiesSummaryComponent,
        ThDetailSummaryComponent,
        ThDetailsMosaicComponent,
        ThPropertyDescriptionSummaryComponent,
        ThPropertyReviewSummaryComponent,
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: routeMock,
        },
        { provide: Router, useClass: RouterMock },
        { provide: PropertyDetailService, useClass: PropertyDetailServiceMock },
        { provide: BookingService, useClass: BookingServiceMock },
        { provide: AuthSessionService, useClass: AuthSessionServiceMock },
        { provide: PendingBookingService, useClass: PendingBookingServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PropertydetailPage);
    component = fixture.componentInstance;
    routerMock = TestBed.inject(Router) as unknown as RouterMock;
    routeMock.snapshot.paramMap = convertToParamMap({});
    routerMock.returnNavigation = true;
    routerMock.navigationState = {
      hotel: mockHotel,
      propertyDetail: mockDetail,
      search: { startDate: '2026-05-10', endDate: '2026-05-12', capacity: 2 },
    };
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('maps property detail into view state', async () => {
    await component.ngOnInit();

    expect(component.property.title).toBe('Hotel Aurora');
    expect(component.property.location).toBe('Bogota, CO');
    expect(component.property.price).toBe('USD200');
    expect(component.property.rating).toBe('4.4');
    expect(component.amenities.length).toBe(1);
    expect(component.guestReviews.length).toBe(1);
  });

  it('builds payment summary using search data', async () => {
    await component.ngOnInit();

    expect(component.summaryItems.length).toBeGreaterThan(0);
    expect(component.paymentSummary.checkInValue).toBe('2026-05-10');
    expect(component.paymentSummary.checkOutValue).toBe('2026-05-12');
    expect(component.paymentSummary.guestsValue).toBe('2');
  });

  it('falls back when navigation state is missing', async () => {
    routerMock.navigationState = {
      propertyDetail: { id: 'prop-2' },
    } as typeof routerMock.navigationState;
    routerMock.returnNavigation = true;

    const localFixture = TestBed.createComponent(PropertydetailPage);
    const localComponent = localFixture.componentInstance;
    localFixture.detectChanges();

    await localComponent.ngOnInit();

    expect(localComponent.property.title).toBe('Property');
    expect(localComponent.property.location).toBe('Location unavailable');
    expect(localComponent.property.price).toBe('$0');
    expect(localComponent.property.rating).toBe('N/A');
    expect(localComponent.property.reviewsText).toBe('No reviews yet');
    expect(localComponent.descriptionParagraphs.length).toBe(0);
    expect(localComponent.amenities.length).toBe(0);
    expect(localComponent.summaryItems[0].label).toBe('Base rate');
  });

  it('uses hotel image when detail has no photos', async () => {
    routerMock.navigationState = {
      hotel: { ...mockHotel, imageUrl: 'https://img.example.com/backup.jpg', name: 'Fallback Hotel' },
      propertyDetail: { ...mockDetail, name: '', photos: [] },
      search: { startDate: '2026-05-10', endDate: '2026-05-11', capacity: 1 },
    };

    const localFixture = TestBed.createComponent(PropertydetailPage);
    const localComponent = localFixture.componentInstance;
    localFixture.detectChanges();

    await localComponent.ngOnInit();

    expect(localComponent.property.title).toBe('Fallback Hotel');
    expect(localComponent.property.images.length).toBe(1);
    expect(localComponent.paymentSummary.guestsValue).toBe('1');
    expect(localComponent.summaryItems[0].label).toContain('nights');
  });

  it('loads detail by route id when navigation is missing', async () => {
    routerMock.returnNavigation = false;
    routeMock.snapshot.paramMap = convertToParamMap({ id: 'prop-9' });
    history.replaceState({}, '');

    const localFixture = TestBed.createComponent(PropertydetailPage);
    const localComponent = localFixture.componentInstance;
    const service = TestBed.inject(PropertyDetailService) as unknown as PropertyDetailServiceMock;

    localFixture.detectChanges();
    await localComponent.ngOnInit();

    expect(service.getPropertyDetail).toHaveBeenCalledWith('prop-9');
    expect(localComponent.errorMessage).toBe('');
  });

  it('sets error message when no property id is available', async () => {
    routerMock.returnNavigation = false;
    routeMock.snapshot.paramMap = convertToParamMap({});
    history.replaceState({}, '');

    const localFixture = TestBed.createComponent(PropertydetailPage);
    const localComponent = localFixture.componentInstance;
    const service = TestBed.inject(PropertyDetailService) as unknown as PropertyDetailServiceMock;

    localFixture.detectChanges();
    await localComponent.ngOnInit();

    expect(service.getPropertyDetail).not.toHaveBeenCalled();
    expect(localComponent.errorMessage).toBe('Unable to load property details.');
  });

  it('handles service errors when fetching detail', async () => {
    routerMock.returnNavigation = false;
    routeMock.snapshot.paramMap = convertToParamMap({ id: 'prop-10' });
    history.replaceState({}, '');

    const service = TestBed.inject(PropertyDetailService) as unknown as PropertyDetailServiceMock;
    service.getPropertyDetail.and.returnValue(throwError(() => new Error('fail')));

    const localFixture = TestBed.createComponent(PropertydetailPage);
    const localComponent = localFixture.componentInstance;

    localFixture.detectChanges();
    await localComponent.ngOnInit();

    expect(localComponent.errorMessage).toBe('Unable to load property details.');
    expect(localComponent.isLoading).toBe(false);
  });

  it('covers score label and amenity icon helpers', () => {
    expect((component as unknown as { getScoreLabel: (score: number) => string }).getScoreLabel(4.8)).toBe('Exceptional');
    expect((component as unknown as { getScoreLabel: (score: number) => string }).getScoreLabel(4.2)).toBe('Excellent');
    expect((component as unknown as { getScoreLabel: (score: number) => string }).getScoreLabel(3.6)).toBe('Very good');
    expect((component as unknown as { getScoreLabel: (score: number) => string }).getScoreLabel(3.1)).toBe('Good');
    expect((component as unknown as { getScoreLabel: (score: number) => string }).getScoreLabel(2.5)).toBe('Fair');

    const getAmenityIcon = (component as unknown as { getAmenityIcon: (text?: string) => string }).getAmenityIcon.bind(component);
    expect(getAmenityIcon('Parking')).toBe('car-outline');
    expect(getAmenityIcon('Pool')).toBe('water-outline');
    expect(getAmenityIcon('Gym')).toBe('barbell-outline');
    expect(getAmenityIcon('Fitness')).toBe('barbell-outline');
    expect(getAmenityIcon('Restaurant')).toBe('restaurant-outline');
    expect(getAmenityIcon('Spa')).toBe('flower-outline');
    expect(getAmenityIcon('Air')).toBe('snow-outline');
    expect(getAmenityIcon('Room')).toBe('cafe-outline');
    expect(getAmenityIcon()).toBe('checkmark-circle-outline');
  });

  it('returns zero nights for invalid dates', () => {
    const getNightsBetween = (component as unknown as { getNightsBetween: (start?: string, end?: string) => number }).getNightsBetween.bind(component);

    expect(getNightsBetween()).toBe(0);
    expect(getNightsBetween('invalid', '2026-05-10')).toBe(0);
    expect(getNightsBetween('2026-05-10', 'invalid')).toBe(0);
    expect(getNightsBetween('2026-05-12', '2026-05-10')).toBe(0);
  });

  it('shows validation errors when booking values are invalid', async () => {
    component.paymentSummary = {
      ...component.paymentSummary,
      checkInValue: '',
      checkOutValue: '',
      guestsValue: '0',
    };

    await component.onBookNow();

    expect(component.bookingErrors.checkIn).toBe('Check-in date is required');
    expect(component.bookingErrors.checkOut).toBe('Check-out date is required');
    expect(component.bookingErrors.guests).toBe('Guests must be at least 1');
  });

  it('redirects to login with returnUrl when booking is valid but user is logged out', async () => {
    const authSession = TestBed.inject(AuthSessionService) as unknown as AuthSessionServiceMock;
    const pendingBooking = TestBed.inject(PendingBookingService) as unknown as PendingBookingServiceMock;

    authSession.isLoggedIn = false;

    component.paymentSummary = {
      ...component.paymentSummary,
      checkInValue: '2026-05-10',
      checkOutValue: '2026-05-12',
      guestsValue: '2',
    };

    await component.onBookNow();

    expect(pendingBooking.setPendingBooking).toHaveBeenCalled();
    expect((routerMock.navigate as jasmine.Spy)).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/propertydetail/prop-1' },
    });
  });

  it('creates reservation when booking is valid and user is logged in', async () => {
    const authSession = TestBed.inject(AuthSessionService) as unknown as AuthSessionServiceMock;
    const bookingService = TestBed.inject(BookingService) as unknown as BookingServiceMock;

    authSession.isLoggedIn = true;
    authSession.userId = 'user-1';
    authSession.userEmail = 'user@example.com';
    authSession.idToken = 'token-123';

    component.paymentSummary = {
      ...component.paymentSummary,
      checkInValue: '2026-05-10',
      checkOutValue: '2026-05-12',
      guestsValue: '2',
    };

    await component.onBookNow();

    expect(bookingService.createReservation).toHaveBeenCalled();
    const [payload, token] = bookingService.createReservation.calls.mostRecent().args;
    expect(payload.property_id).toBe('prop-1');
    expect(payload.user_id).toBe('user-1');
    expect(payload.user_email).toBe('user@example.com');
    expect(payload.guests).toBe(2);
    expect(payload.period_start).toBe('2026-05-10');
    expect(payload.period_end).toBe('2026-05-12');
    expect(token).toBe('token-123');
  });
});
