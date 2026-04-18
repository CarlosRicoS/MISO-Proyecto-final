import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { BookingListPage } from './booking-list.page';
import { BookingService } from '../../core/services/booking.service';
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
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('navigates to booking detail with reservation payload and normalized status', async () => {
    const reservation = {
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
      propertyName: 'Casa Playa Cartagena',
      location: 'Cartagena',
      photoUrl: 'https://example.com/photo.jpg',
    };

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
});
