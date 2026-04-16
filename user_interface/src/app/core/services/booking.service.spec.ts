import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BookingService, Reservation, ReservationRequest } from './booking.service';
import { ConfigService } from './config.service';

describe('BookingService', () => {
  let service: BookingService;
  let httpMock: HttpTestingController;

  const payload: ReservationRequest = {
    property_id: 'prop-1',
    user_id: 'user-1',
    user_email: 'user@example.com',
    guests: 2,
    period_start: '2026-04-20',
    period_end: '2026-04-21',
    price: 200,
    admin_group_id: 'admins',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        BookingService,
        {
          provide: ConfigService,
          useValue: {
            apiBaseUrl: 'https://api.example.com',
            bookingApiPath: '/booking-orchestrator/api/reservations',
            bookingListApiPath: '/booking/api/booking',
          },
        },
      ],
    });

    service = TestBed.inject(BookingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts reservation payload to configured endpoint', () => {
    service.createReservation(payload).subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking-orchestrator/api/reservations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.headers.has('Authorization')).toBeFalse();

    req.flush({ reservation_id: 'r-1' });
  });

  it('includes Authorization header when access token is provided', () => {
    service.createReservation(payload, 'token-123').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking-orchestrator/api/reservations');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');

    req.flush({ reservation_id: 'r-1' });
  });

  it('gets reservations list from configured booking endpoint', () => {
    service.listReservations().subscribe((response) => {
      expect(response.length).toBe(1);
      expect(response[0].id).toBe('res-1');
    });

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBeFalse();

    const body: Reservation[] = [
      {
        id: 'res-1',
        property_id: 'prop-1',
        user_id: 'user-1',
        guests: 2,
        period_start: '2026-05-10',
        period_end: '2026-05-12',
        price: 560000,
        status: 'CONFIRMED',
        admin_group_id: 'admins',
        payment_reference: 'PAY-1',
        created_at: '2026-04-07T12:00:00Z',
      },
    ];

    req.flush(body);
  });

  it('includes Authorization header when listing reservations with token', () => {
    service.listReservations('token-abc').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-abc');

    req.flush([]);
  });
});
