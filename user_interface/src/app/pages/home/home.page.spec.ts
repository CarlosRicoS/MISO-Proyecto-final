import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HotelsService } from '../../core/services/hotels.service';
import { HomePage } from './home.page';

class HotelsServiceMock {
  getHotels = jasmine.createSpy('getHotels').and.returnValue(of([]));
}

class RouterMock {
  navigate = jasmine.createSpy('navigate').and.resolveTo(true);
}

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: HotelsService, useClass: HotelsServiceMock },
        { provide: Router, useClass: RouterMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads hotels on init', async () => {
    await component.loadHotels();
    const hotelsService = TestBed.inject(HotelsService) as unknown as HotelsServiceMock;
    expect(hotelsService.getHotels).toHaveBeenCalled();
  });

  it('shows error on initial load failure', async () => {
    const hotelsService = TestBed.inject(HotelsService) as unknown as HotelsServiceMock;
    hotelsService.getHotels.and.returnValue(throwError(() => new Error('fail')));

    await component.loadHotels();

    expect(component.errorMessage).toBe('Unable to load hotels.');
    expect(component.hotels).toEqual([]);
  });

  it('searches with partial filters', async () => {
    component.searchCity = 'Paris';

    await component.onSearchHotels();

    const hotelsService = TestBed.inject(HotelsService) as unknown as HotelsServiceMock;
    expect(hotelsService.getHotels).toHaveBeenCalledWith({ city: 'Paris' });
  });

  it('searches with no filters', async () => {
    component.searchCity = '';
    component.searchStartDate = '';
    component.searchEndDate = '';
    component.searchCapacity = 0;

    await component.onSearchHotels();

    const hotelsService = TestBed.inject(HotelsService) as unknown as HotelsServiceMock;
    expect(hotelsService.getHotels).toHaveBeenCalled();
  });

  it('trims location input', () => {
    component.onLocationChanged('  Rome  ');
    expect(component.searchCity).toBe('Rome');
  });

  it('formats guest labels and input values', () => {
    component.searchCapacity = 1;
    expect(component.guestsLabelValue).toBe('1 Guest');
    expect(component.guestsInputValue).toBe('1');

    component.searchCapacity = 2;
    expect(component.guestsLabelValue).toBe('2 Guests');
    expect(component.guestsInputValue).toBe('2');

    component.searchCapacity = 0;
    expect(component.guestsInputValue).toBe('');
  });

  it('handles check-in confirmation and advances checkout when needed', () => {
    component.searchEndDate = '01/03/2026';
    component.onCheckInConfirmed(new Date(2026, 2, 5));

    expect(component.searchStartDate).toBe('05/03/2026');
    expect(component.searchEndDate).toBe('06/03/2026');
    expect(component.showCheckInModal).toBeFalse();
    expect(component.tempDate).toBeNull();
  });

  it('handles check-out confirmation', () => {
    component.showCheckOutModal = true;
    component.tempDate = '2026-03-01';

    component.onCheckOutConfirmed(new Date(2026, 2, 10));

    expect(component.searchEndDate).toBe('10/03/2026');
    expect(component.showCheckOutModal).toBeFalse();
    expect(component.tempDate).toBeNull();
  });

  it('parses guests input to number', () => {
    component.onGuestsChanged('3');
    expect(component.searchCapacity).toBe(3);

    component.onGuestsChanged('abc');
    expect(component.searchCapacity).toBe(0);
  });

  it('formats hotel display helpers', () => {
    expect(component.getHotelLocation({
      id: '1',
      name: 'Test',
      city: '',
      country: '',
      pricePerNight: 0,
      currency: '$',
      rating: 0,
      imageUrl: '',
    })).toBe('Location unavailable');

    expect(component.getHotelPrice({
      id: '2',
      name: 'Test',
      city: 'Paris',
      country: 'FR',
      pricePerNight: 0,
      currency: '€',
      rating: 0,
      imageUrl: '',
    })).toBe('€0');

    expect(component.getHotelRating({
      id: '3',
      name: 'Test',
      city: 'Paris',
      country: 'FR',
      pricePerNight: 0,
      currency: '€',
      rating: Number.NaN,
      imageUrl: '',
    })).toBe('N/A');
  });

  it('handles search error', async () => {
    const hotelsService = TestBed.inject(HotelsService) as unknown as HotelsServiceMock;
    hotelsService.getHotels.and.returnValue(throwError(() => new Error('fail')));

    await component.onSearchHotels();

    expect(component.errorMessage).toBe('Unable to load hotels.');
  });

  it('converts date strings and compares dates safely', () => {
    const iso = component.convertDDMMYYYYToISO('05/03/2026');
    expect(iso).toBe('2026-03-05');

    const fallback = component.convertDDMMYYYYToISO('bad');
    expect(fallback.length).toBe(10);

    expect(component.compareDates('01/03/2026', '02/03/2026')).toBeLessThan(0);
    expect(component.compareDates('bad', '02/03/2026')).toBe(0);
  });
});
