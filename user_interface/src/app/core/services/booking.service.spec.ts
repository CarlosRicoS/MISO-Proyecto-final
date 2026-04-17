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

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/');
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

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-abc');
    expect(req.request.headers.has('X-User-Id')).toBeFalse();

    req.flush([]);
  });

  it('includes X-User-Id header when user id is provided', () => {
    service.listReservations('token-abc', 'user-123').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-abc');
    expect(req.request.headers.get('X-User-Id')).toBe('user-123');
    req.flush([]);
  });

  it('normalizes booking path to include booking prefix when missing in config', () => {
    const prefixedMissingConfig = TestBed.inject(ConfigService) as unknown as {
      bookingListApiPath: string;
    };
    prefixedMissingConfig.bookingListApiPath = '/api/booking';

    service.listReservations('token-abc', 'user-123').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-User-Id')).toBe('user-123');
    req.flush([]);
  });

  it('gets a single reservation by id', () => {
    service.getReservation('res-1').subscribe((response) => {
      expect(response.id).toBe('res-1');
    });

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/res-1');
    expect(req.request.method).toBe('GET');
    req.flush({
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
    } as Reservation);
  });

  it('posts cancel reservation to booking endpoint with token', () => {
    service.cancelReservation('res-1', 'token-cancel').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/res-1/cancel');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-cancel');
    req.flush({ id: 'res-1' });
  });

  it('posts cancel reservation without Authorization when token is not provided', () => {
    service.cancelReservation('res-1').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/res-1/cancel');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ id: 'res-1' });
  });

  it('patches reservation dates on booking service endpoint', () => {
    const payload = {
      new_period_start: '2026-05-15',
      new_period_end: '2026-05-17',
      new_price: 700000,
    };

    service.updateReservationDates('res-1', payload, 'token-update').subscribe((response) => {
      expect(response.price_difference).toBe(140000);
    });

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/res-1/dates');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-update');
    req.flush({
      id: 'res-1',
      property_id: 'prop-1',
      user_id: 'user-1',
      guests: 2,
      period_start: '2026-05-15',
      period_end: '2026-05-17',
      price: 700000,
      status: 'CONFIRMED',
      admin_group_id: 'admins',
      payment_reference: 'PAY-1',
      created_at: '2026-04-07T12:00:00Z',
      price_difference: 140000,
    });
  });

  it('patches reservation dates without Authorization when token is not provided', () => {
    const payload = {
      new_period_start: '2026-05-15',
      new_period_end: '2026-05-17',
      new_price: 700000,
    };

    service.updateReservationDates('res-1', payload).subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/res-1/dates');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({
      id: 'res-1',
      property_id: 'prop-1',
      user_id: 'user-1',
      guests: 2,
      period_start: '2026-05-15',
      period_end: '2026-05-17',
      price: 700000,
      status: 'CONFIRMED',
      admin_group_id: 'admins',
      payment_reference: 'PAY-1',
      created_at: '2026-04-07T12:00:00Z',
      price_difference: 140000,
    });
  });

  it('posts admin confirm to booking endpoint', () => {
    service.adminConfirmBooking('res-1', 'token-admin').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/res-1/admin-confirm');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-admin');
    req.flush({ id: 'res-1', status: 'CONFIRMED' });
  });

  it('posts admin confirm without Authorization when token is not provided', () => {
    service.adminConfirmBooking('res-1').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/res-1/admin-confirm');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ id: 'res-1', status: 'CONFIRMED' });
  });

  it('posts admin reject to booking endpoint with reason', () => {
    service.adminRejectBooking('res-1', 'Policy violation', 'token-admin').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/res-1/admin-reject');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Policy violation' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-admin');
    req.flush({ id: 'res-1', status: 'CANCELED' });
  });

  it('posts admin reject without Authorization when token is not provided', () => {
    service.adminRejectBooking('res-1', 'Policy violation').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking/api/booking/res-1/admin-reject');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ id: 'res-1', status: 'CANCELED' });
  });

  it('patches reservation dates on booking-orchestrator endpoint', () => {
    const payload = {
      new_period_start: '2026-05-20',
      new_period_end: '2026-05-22',
      new_price: 810000,
    };

    service.updateOrchestratedReservationDates('res-1', payload, 'token-orch').subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking-orchestrator/api/reservations/res-1/dates');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-orch');
    req.flush({
      id: 'res-1',
      property_id: 'prop-1',
      user_id: 'user-1',
      guests: 2,
      period_start: '2026-05-20',
      period_end: '2026-05-22',
      price: 810000,
      status: 'CONFIRMED',
      admin_group_id: 'admins',
      payment_reference: 'PAY-1',
      created_at: '2026-04-07T12:00:00Z',
      price_difference: 250000,
    });
  });

  it('patches reservation dates on booking-orchestrator without Authorization when token is not provided', () => {
    const payload = {
      new_period_start: '2026-05-20',
      new_period_end: '2026-05-22',
      new_price: 810000,
    };

    service.updateOrchestratedReservationDates('res-1', payload).subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking-orchestrator/api/reservations/res-1/dates');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({
      id: 'res-1',
      property_id: 'prop-1',
      user_id: 'user-1',
      guests: 2,
      period_start: '2026-05-20',
      period_end: '2026-05-22',
      price: 810000,
      status: 'CONFIRMED',
      admin_group_id: 'admins',
      payment_reference: 'PAY-1',
      created_at: '2026-04-07T12:00:00Z',
      price_difference: 250000,
    });
  });

  it('posts admin confirm to booking-orchestrator endpoint', () => {
    service.adminConfirmReservation(
      'res-1',
      { traveler_email: 'traveler@example.com' },
      'token-orch',
    ).subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking-orchestrator/api/reservations/res-1/admin-confirm');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ traveler_email: 'traveler@example.com' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-orch');
    req.flush({ id: 'res-1', status: 'CONFIRMED' });
  });

  it('posts admin confirm to booking-orchestrator without Authorization when token is not provided', () => {
    service.adminConfirmReservation(
      'res-1',
      { traveler_email: 'traveler@example.com' },
    ).subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking-orchestrator/api/reservations/res-1/admin-confirm');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ id: 'res-1', status: 'CONFIRMED' });
  });

  it('posts admin reject to booking-orchestrator endpoint', () => {
    service.adminRejectReservation(
      'res-1',
      { traveler_email: 'traveler@example.com', reason: 'No availability' },
      'token-orch',
    ).subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking-orchestrator/api/reservations/res-1/admin-reject');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ traveler_email: 'traveler@example.com', reason: 'No availability' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-orch');
    req.flush({ id: 'res-1', status: 'CANCELED' });
  });

  it('posts admin reject to booking-orchestrator without Authorization when token is not provided', () => {
    service.adminRejectReservation(
      'res-1',
      { traveler_email: 'traveler@example.com', reason: 'No availability' },
    ).subscribe();

    const req = httpMock.expectOne('https://api.example.com/booking-orchestrator/api/reservations/res-1/admin-reject');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ id: 'res-1', status: 'CANCELED' });
  });

  it('uses default booking paths and relative URLs when config paths are missing', () => {
    const config = TestBed.inject(ConfigService) as unknown as {
      apiBaseUrl: string;
      bookingListApiPath?: string;
    };
    config.apiBaseUrl = '';
    config.bookingListApiPath = undefined;

    service.createReservation(payload).subscribe();
    const createReq = httpMock.expectOne('/booking-orchestrator/api/reservations');
    expect(createReq.request.method).toBe('POST');
    createReq.flush({ reservation_id: 'r-1' });

    service.listReservations().subscribe();
    const listReq = httpMock.expectOne('/booking/api/booking/');
    expect(listReq.request.method).toBe('GET');
    listReq.flush([]);

    service.getReservation('res-1', 'token-get').subscribe();
    const getReq = httpMock.expectOne('/booking/api/booking/res-1');
    expect(getReq.request.method).toBe('GET');
    expect(getReq.request.headers.get('Authorization')).toBe('Bearer token-get');
    getReq.flush({
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
    } as Reservation);

    service.cancelReservation('res-1').subscribe();
    const cancelReq = httpMock.expectOne('/booking/api/booking/res-1/cancel');
    expect(cancelReq.request.method).toBe('POST');
    cancelReq.flush({ id: 'res-1' });

    service.updateReservationDates('res-1', {
      new_period_start: '2026-05-15',
      new_period_end: '2026-05-17',
      new_price: 700000,
    }).subscribe();
    const updateReq = httpMock.expectOne('/booking/api/booking/res-1/dates');
    expect(updateReq.request.method).toBe('PATCH');
    updateReq.flush({
      id: 'res-1',
      property_id: 'prop-1',
      user_id: 'user-1',
      guests: 2,
      period_start: '2026-05-15',
      period_end: '2026-05-17',
      price: 700000,
      status: 'CONFIRMED',
      admin_group_id: 'admins',
      payment_reference: 'PAY-1',
      created_at: '2026-04-07T12:00:00Z',
      price_difference: 140000,
    });

    service.adminConfirmBooking('res-1').subscribe();
    const adminConfirmReq = httpMock.expectOne('/booking/api/booking/res-1/admin-confirm');
    expect(adminConfirmReq.request.method).toBe('POST');
    adminConfirmReq.flush({ id: 'res-1', status: 'CONFIRMED' });

    service.adminRejectBooking('res-1', 'Policy violation').subscribe();
    const adminRejectReq = httpMock.expectOne('/booking/api/booking/res-1/admin-reject');
    expect(adminRejectReq.request.method).toBe('POST');
    adminRejectReq.flush({ id: 'res-1', status: 'CANCELED' });
  });

  it('uses default orchestrator paths and relative URLs when config path is missing', () => {
    const config = TestBed.inject(ConfigService) as unknown as {
      apiBaseUrl: string;
      bookingApiPath?: string;
    };
    config.apiBaseUrl = '';
    config.bookingApiPath = undefined;

    service.updateOrchestratedReservationDates('res-1', {
      new_period_start: '2026-05-20',
      new_period_end: '2026-05-22',
      new_price: 810000,
    }).subscribe();
    const orchestratorUpdateReq = httpMock.expectOne('/booking-orchestrator/api/reservations/res-1/dates');
    expect(orchestratorUpdateReq.request.method).toBe('PATCH');
    orchestratorUpdateReq.flush({
      id: 'res-1',
      property_id: 'prop-1',
      user_id: 'user-1',
      guests: 2,
      period_start: '2026-05-20',
      period_end: '2026-05-22',
      price: 810000,
      status: 'CONFIRMED',
      admin_group_id: 'admins',
      payment_reference: 'PAY-1',
      created_at: '2026-04-07T12:00:00Z',
      price_difference: 250000,
    });

    service.adminConfirmReservation('res-1', { traveler_email: 'traveler@example.com' }).subscribe();
    const orchestratorConfirmReq = httpMock.expectOne('/booking-orchestrator/api/reservations/res-1/admin-confirm');
    expect(orchestratorConfirmReq.request.method).toBe('POST');
    orchestratorConfirmReq.flush({ id: 'res-1', status: 'CONFIRMED' });

    service.adminRejectReservation('res-1', {
      traveler_email: 'traveler@example.com',
      reason: 'No availability',
    }).subscribe();
    const orchestratorRejectReq = httpMock.expectOne('/booking-orchestrator/api/reservations/res-1/admin-reject');
    expect(orchestratorRejectReq.request.method).toBe('POST');
    orchestratorRejectReq.flush({ id: 'res-1', status: 'CANCELED' });
  });
});
