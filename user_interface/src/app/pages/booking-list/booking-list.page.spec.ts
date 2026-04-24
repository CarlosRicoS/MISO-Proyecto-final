import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BookingListPage } from './booking-list.page';
import { BookingService, Reservation } from '../../core/services/booking.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { ThFilterSummaryComponent } from '../../shared/components/th-filter-summary/th-filter-summary.component';
import { ThHotelCardComponent } from '../../shared/components/th-hotel-card/th-hotel-card.component';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

describe('BookingListPage', () => {
  let component: BookingListPage;
  let fixture: ComponentFixture<BookingListPage>;
  let routerMock: RouterMock;
  let bookingServiceMock: BookingServiceMock;
  let propertyDetailServiceMock: PropertyDetailServiceMock;

  class RouterMock {
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
  }

  class BookingServiceMock {
    listReservations = jasmine.createSpy('listReservations').and.returnValue(of([]));
  }

  class AuthSessionServiceMock {
    idToken = 'id-token';
    userId = 'user-1';
    userEmail = 'traveler@example.com';
  }

  class PropertyDetailServiceMock {
    getPropertyDetail = jasmine.createSpy('getPropertyDetail').and.returnValue(of({}));
  }

  type ListReservation = Reservation & {
    propertyName: string;
    location: string;
    photoUrl: string;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingListPage],
      imports: [
        CommonModule,
        IonicModule.forRoot(),
        ThFilterSummaryComponent,
        ThHotelCardComponent,
      ],
      providers: [
        { provide: Router, useClass: RouterMock },
        { provide: BookingService, useClass: BookingServiceMock },
        { provide: AuthSessionService, useClass: AuthSessionServiceMock },
        { provide: PropertyDetailService, useClass: PropertyDetailServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingListPage);
    component = fixture.componentInstance;
    routerMock = TestBed.inject(Router) as unknown as RouterMock;
    bookingServiceMock = TestBed.inject(BookingService) as unknown as BookingServiceMock;
    propertyDetailServiceMock = TestBed.inject(PropertyDetailService) as unknown as PropertyDetailServiceMock;
    fixture.detectChanges();
  });

  function offsetIsoDate(daysFromToday: number): string {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + daysFromToday);
    return date.toISOString().slice(0, 10);
  }

  function createReservation(overrides: Partial<Reservation> = {}): Reservation {
    return {
      id: 'res-1',
      property_id: 'prop-1',
      user_id: 'user-1',
      guests: 2,
      period_start: offsetIsoDate(1),
      period_end: offsetIsoDate(3),
      price: 300,
      status: 'PENDING',
      admin_group_id: 'group-1',
      payment_reference: null,
      created_at: '2026-04-18T00:00:00Z',
      ...overrides,
    };
  }

  function createListReservation(overrides: Partial<ListReservation> = {}): ListReservation {
    return {
      ...createReservation(overrides),
      propertyName: 'Property name',
      location: 'Location unavailable',
      photoUrl: '',
      ...overrides,
    };
  }

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('sets guest value from current user email in summary params', () => {
    expect(component.filterSummaryParams.guestsValue).toBe('traveler@example.com');
  });

  it('calls reservation loading when view enters', () => {
    const loadReservationsSpy = spyOn<any>(component, 'loadReservations').and.resolveTo();

    component.ionViewWillEnter();

    expect(loadReservationsSpy).toHaveBeenCalled();
  });

  it('returns count label in singular and plural forms', () => {
    component.reservations = [createListReservation()] as never[];
    expect(component.countLabel).toBe('1 reservation found');

    component.reservations = [
      createListReservation(),
      createListReservation({ id: 'res-2' }),
    ] as never[];

    expect(component.countLabel).toBe('2 reservations found');
  });

  it('filters reservations by selected filter', () => {
    const upcoming = createListReservation({ id: 'upcoming', status: 'PENDING', period_end: offsetIsoDate(2) });
    const completedByStatus = createListReservation({
      id: 'completed-status',
      status: 'COMPLETED',
      period_end: offsetIsoDate(2),
    });
    const completedByDate = createListReservation({ id: 'completed-date', status: 'PENDING', period_end: offsetIsoDate(-1) });
    const cancelled = createListReservation({ id: 'cancelled', status: 'CANCELLED', period_end: offsetIsoDate(5) });
    const invalidDateUpcoming = createListReservation({ id: 'invalid', status: 'PENDING', period_end: 'not-a-date' });

    component.reservations = [upcoming, completedByStatus, completedByDate, cancelled, invalidDateUpcoming] as never[];

    component.selectedFilter = 'upcoming';
    expect(component.filteredReservations.map((reservation) => reservation.id)).toEqual(['upcoming', 'invalid']);

    component.selectedFilter = 'completed';
    expect(component.filteredReservations.map((reservation) => reservation.id)).toEqual(['completed-status', 'completed-date']);

    component.selectedFilter = 'cancelled';
    expect(component.filteredReservations.map((reservation) => reservation.id)).toEqual(['cancelled']);

    component.selectedFilter = 'all';
    expect(component.filteredReservations.length).toBe(5);
  });

  it('builds booking filter counters from reservations', () => {
    component.reservations = [
      createListReservation({ id: 'upcoming', status: 'PENDING', period_end: offsetIsoDate(2) }),
      createListReservation({ id: 'completed', status: 'COMPLETED', period_end: offsetIsoDate(1) }),
      createListReservation({ id: 'cancelled', status: 'CANCELED', period_end: offsetIsoDate(4) }),
    ] as never[];

    const filters = component.bookingFilters;

    expect(filters).toEqual([
      { key: 'all', label: 'All', count: 3 },
      { key: 'upcoming', label: 'Upcoming', count: 1 },
      { key: 'completed', label: 'Completed', count: 1 },
      { key: 'cancelled', label: 'Cancelled', count: 1 },
    ]);
  });

  it('returns empty label for all and specific filters', () => {
    component.selectedFilter = 'all';
    expect(component.emptyLabel).toBe('No reservations available.');

    component.selectedFilter = 'completed';
    expect(component.emptyLabel).toBe('No completed reservations available.');
  });

  it('returns check-in and check-out labels with and without reservations', () => {
    component.reservations = [];
    expect(component.checkInLabel).toBe('-');
    expect(component.checkOutLabel).toBe('-');

    component.reservations = [
      createListReservation({ period_start: '2026-04-26', period_end: '2026-04-29' }),
    ] as never[];

    expect(component.checkInLabel).toContain('2026');
    expect(component.checkOutLabel).toContain('2026');
  });

  it('returns reservation location directly', () => {
    const reservation = createListReservation({ location: 'Cartagena' });
    expect(component.getReservationLocation(reservation)).toBe('Cartagena');
  });

  it('maps reservation ratings by status', () => {
    expect(component.getReservationRating(createListReservation({ status: 'CONFIRMED' }) as never)).toBe('4.8');
    expect(component.getReservationRating(createListReservation({ status: 'COMPLETED' }) as never)).toBe('4.9');
    expect(component.getReservationRating(createListReservation({ status: 'PENDING' }) as never)).toBe('4.5');
    expect(component.getReservationRating(createListReservation({ status: 'CANCELED' }) as never)).toBe('4.0');
    expect(component.getReservationRating(createListReservation({ status: 'CANCELLED' }) as never)).toBe('4.0');
    expect(component.getReservationRating(createListReservation({ status: 'IN_REVIEW' }) as never)).toBe('4.6');
  });

  it('formats valid and invalid dates', () => {
    expect(component.formatDate('not-a-date')).toBe('not-a-date');
    expect(component.formatDate('2026-04-20')).toContain('2026');
  });

  it('formats date ranges for all supported branches', () => {
    expect(component.formatStayDateRange('bad-start', '2026-05-03')).toContain('bad-start - ');
    expect(component.formatStayDateRange('2026-05-01T12:00:00Z', '2026-05-03T12:00:00Z')).toMatch(/^May \d+ - \d+$/);
    expect(component.formatStayDateRange('2026-05-31T12:00:00Z', '2026-06-02T12:00:00Z')).toMatch(/^May \d+ - Jun \d+$/);
    expect(component.formatStayDateRange('2026-12-31T12:00:00Z', '2027-01-02T12:00:00Z')).toMatch(/^Dec \d+, 2026 - Jan \d+, 2027$/);
  });

  it('returns nights label for invalid, zero, singular and plural stays', () => {
    expect(component.getNightsLabel('not-a-date', '2026-05-02')).toBe('-');
    expect(component.getNightsLabel('2026-05-10', '2026-05-09')).toBe('0 nights');
    expect(component.getNightsLabel('2026-05-01', '2026-05-02')).toBe('1 night');
    expect(component.getNightsLabel('2026-05-01', '2026-05-04')).toBe('3 nights');
  });

  it('formats finite and non-finite prices', () => {
    expect(component.formatPrice(Number.NaN)).toBe('$0');
    expect(component.formatPrice(1234.56)).toBe('$1,234.56');
  });

  it('builds a status class from normalized lowercase status', () => {
    expect(component.getStatusClass('CONFIRMED')).toBe('booking-list-status booking-list-status--confirmed');
  });

  it('updates active filter and resets pagination', () => {
    const reservations = Array.from({ length: 12 }, (_, index) =>
      createListReservation({ id: `res-${index + 1}`, status: 'PENDING', period_end: offsetIsoDate(3) }),
    );
    component.reservations = reservations as never[];

    component.setFilter('all');

    expect(component.selectedFilter).toBe('all');
    expect(component.visibleReservations.length).toBe(10);
    expect(component.canLoadNext).toBeTrue();
  });

  it('returns whether a filter is active', () => {
    component.selectedFilter = 'cancelled';

    expect(component.isFilterActive('cancelled')).toBeTrue();
    expect(component.isFilterActive('all')).toBeFalse();
  });

  it('navigates to booking detail with reservation payload and normalized status', async () => {
    const reservation = createListReservation({
      propertyName: 'Casa Playa Cartagena',
      location: 'Cartagena',
      photoUrl: 'https://example.com/photo.jpg',
      status: 'CANCELLED',
      period_start: '2026-04-26',
      period_end: '2026-04-29',
    });

    await component.openBookingDetail(reservation);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/booking-detail'], {
      queryParams: {
        bookingId: 'res-1',
      },
      state: {
        bookingId: 'res-1',
        bookingStatus: 'Canceled',
        reservation: {
          id: 'res-1',
          property_id: 'prop-1',
          user_id: 'user-1',
          guests: 2,
          period_start: '2026-04-26',
          period_end: '2026-04-29',
          price: 300,
          status: 'CANCELLED',
          admin_group_id: 'group-1',
          payment_reference: null,
          created_at: '2026-04-18T00:00:00Z',
        },
      },
    });
  });

  it('falls back to normalized or default booking status labels through detail navigation', async () => {
    const unknownStatusReservation = createListReservation({ id: 'res-2', status: 'IN_REVIEW' });
    const emptyStatusReservation = createListReservation({ id: 'res-3', status: '' });

    await component.openBookingDetail(unknownStatusReservation);
    await component.openBookingDetail(emptyStatusReservation);

    expect(routerMock.navigate.calls.argsFor(0)?.[1]).toEqual(
      jasmine.objectContaining({ state: jasmine.objectContaining({ bookingStatus: 'In_review' }) }),
    );
    expect(routerMock.navigate.calls.argsFor(1)?.[1]).toEqual(
      jasmine.objectContaining({ state: jasmine.objectContaining({ bookingStatus: 'Upcoming' }) }),
    );
  });

  it('completes infinite scroll and disables it when there are no more pages', async () => {
    const reservations = Array.from({ length: 12 }, (_, index) =>
      createListReservation({ id: `res-${index + 1}`, status: 'PENDING', period_end: offsetIsoDate(3) }),
    );
    component.reservations = reservations as never[];
    component.setFilter('all');

    const complete = jasmine.createSpy('complete');
    const event = {
      target: {
        complete,
        disabled: false,
      },
    } as any;

    await component.loadMoreReservations(event);

    expect(complete).toHaveBeenCalled();
    expect(component.visibleReservations.length).toBe(12);
    expect(component.canLoadNext).toBeFalse();
    expect(event.target.disabled).toBeTrue();
  });

  it('does not page when paging is not allowed but still completes infinite-scroll event', async () => {
    const complete = jasmine.createSpy('complete');
    component.canLoadNext = false;
    component.visibleReservations = [createListReservation({ id: 'res-1' })] as never[];

    const event = {
      target: {
        complete,
        disabled: false,
      },
    } as any;

    await component.loadMoreReservations(event);

    expect(component.visibleReservations.length).toBe(1);
    expect(complete).toHaveBeenCalled();
    expect(event.target.disabled).toBeTrue();
  });

  it('loads reservations successfully and initializes first page', async () => {
    bookingServiceMock.listReservations.and.returnValue(
      of([
        createReservation({ id: 'res-1', property_id: 'prop-1' }),
        createReservation({ id: 'res-2', property_id: 'prop-2' }),
      ]),
    );
    spyOn<any>(component, 'enrichReservationsWithPropertyDetails').and.resolveTo();

    await (component as any).loadReservations();

    expect(bookingServiceMock.listReservations).toHaveBeenCalledWith('id-token', 'user-1');
    expect(component.errorMessage).toBe('');
    expect(component.isLoading).toBeFalse();
    expect(component.reservations.length).toBe(2);
    expect(component.visibleReservations.length).toBe(2);
    expect(component.reservations[0].propertyName).toBe('Property prop-1');
  });

  it('handles reservation loading errors', async () => {
    bookingServiceMock.listReservations.and.returnValue(throwError(() => new Error('failed')));
    component.visibleReservations = [createListReservation({ id: 'existing' })] as never[];
    component.canLoadNext = true;

    await (component as any).loadReservations();

    expect(component.errorMessage).toBe('Unable to load reservations.');
    expect(component.visibleReservations).toEqual([]);
    expect(component.canLoadNext).toBeFalse();
    expect(component.isLoading).toBeFalse();
  });

  it('enriches reservations with property details and applies fallback when detail fetch fails', async () => {
    component.reservations = [
      createListReservation({ id: 'res-1', property_id: 'prop-1', location: 'Original location' }),
      createListReservation({ id: 'res-2', property_id: 'prop-2', location: 'Original location 2' }),
      createListReservation({ id: 'res-3', property_id: '', location: 'No property id' }),
    ] as never[];
    component.visibleReservations = [...component.reservations];

    propertyDetailServiceMock.getPropertyDetail.and.callFake((propertyId: string) => {
      if (propertyId === 'prop-1') {
        return of({
          id: 'prop-1',
          name: 'Beach House',
          city: 'Cartagena',
          country: 'Colombia',
          maxCapacity: 4,
          description: '',
          photos: ['https://example.com/house.jpg'],
          checkInTime: '',
          checkOutTime: '',
          adminGroupId: '',
          amenities: [],
          reviews: [],
        });
      }

      return throwError(() => new Error('detail error'));
    });

    await (component as any).enrichReservationsWithPropertyDetails();

    expect(propertyDetailServiceMock.getPropertyDetail).toHaveBeenCalledTimes(2);
    expect(component.reservations[0].propertyName).toBe('Beach House');
    expect(component.reservations[0].location).toBe('Cartagena, Colombia');
    expect(component.reservations[0].photoUrl).toBe('https://example.com/house.jpg');
    expect(component.reservations[1].location).toBe('Original location 2');
    expect(component.reservations[2].location).toBe('No property id');
  });

  it('reads property ids from both property_id and alternate propertyId shapes', () => {
    expect((component as any).getReservationPropertyId(createReservation({ property_id: ' prop-1 ' }))).toBe('prop-1');
    expect(
      (component as any).getReservationPropertyId({
        ...createReservation({ property_id: '' }),
        propertyId: ' alt-prop ',
      }),
    ).toBe('alt-prop');
  });

  it('formats property location with full, partial and missing details', () => {
    expect((component as any).formatPropertyLocation(undefined)).toBe('');
    expect((component as any).formatPropertyLocation({ city: 'Bogota', country: '' })).toBe('Bogota');
    expect((component as any).formatPropertyLocation({ city: 'Bogota', country: 'Colombia' })).toBe('Bogota, Colombia');
  });

  describe('Accessibility: heading, tablist, tabpanel (AC-25, AC-27)', () => {
    it('has a visible or sr-only <h1> with text "My Reservations"', () => {
      const h1: HTMLElement | null = fixture.nativeElement.querySelector('h1');
      expect(h1).not.toBeNull();
      expect(h1!.textContent!.trim()).toBe('My Reservations');
    });

    it('filter buttons have role="tab"', () => {
      const buttons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
        '.booking-filters__button',
      );
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((btn) => {
        expect(btn.getAttribute('role')).toBe('tab');
      });
    });

    it('active filter button has tabindex="0", inactive buttons have tabindex="-1"', () => {
      const buttons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
        '.booking-filters__button',
      );
      let activeCount = 0;
      let inactiveCount = 0;
      buttons.forEach((btn) => {
        const tabindex = btn.getAttribute('tabindex');
        if (tabindex === '0') activeCount++;
        if (tabindex === '-1') inactiveCount++;
      });
      expect(activeCount).toBe(1);
      expect(inactiveCount).toBe(buttons.length - 1);
    });

    it('content panel has role="tabpanel"', () => {
      const tabpanel: HTMLElement | null = fixture.nativeElement.querySelector('[role="tabpanel"]');
      expect(tabpanel).not.toBeNull();
    });
  });
});
