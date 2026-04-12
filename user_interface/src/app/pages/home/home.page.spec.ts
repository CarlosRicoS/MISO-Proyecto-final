import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HotelsService } from '../../core/services/hotels.service';
import { HomePage } from './home.page';
import { ThDatetimeModalComponent } from '../../shared/components/th-datetime-modal/th-datetime-modal.component';
import { ThFilterComponent } from '../../shared/components/th-filter/th-filter.component';
import { ThHotelCardComponent } from '../../shared/components/th-hotel-card/th-hotel-card.component';
import { SharedCommonModule } from '../../shared/common/common.module';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
      imports: [
        CommonModule,
        FormsModule,
        IonicModule.forRoot(),
        SharedCommonModule,
        ThDatetimeModalComponent,
        ThFilterComponent,
        ThHotelCardComponent,
      ],
      providers: [
        { provide: HotelsService, useClass: HotelsServiceMock },
        { provide: Router, useClass: RouterMock },
        {
          provide: ActivatedRoute,
          useValue: {},
        },
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
      photos: [],
    })).toBe('Location unavailable');

    expect(component.getHotelPrice({
      id: '2',
      name: 'Test',
      city: 'Paris',
      country: 'FR',
      pricePerNight: 0,
      currency: '€',
      rating: 0,
      photos: [],
    })).toBe('€0');

    expect(component.getHotelRating({
      id: '3',
      name: 'Test',
      city: 'Paris',
      country: 'FR',
      pricePerNight: 0,
      currency: '€',
      rating: Number.NaN,
      photos: [],
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
    expect(fallback).toBeNull();

    expect(component.compareDates('01/03/2026', '02/03/2026')).toBeLessThan(0);
    expect(component.compareDates('bad', '02/03/2026')).toBe(0);
  });

  describe('Check-in Modal Management', () => {
    it('should show check-in modal and set temp date', () => {
      component.searchStartDate = '05/03/2026';
      component.onCheckInClicked();
      expect(component.showCheckInModal).toBe(true);
      expect(component.tempDate).toBe('2026-03-05');
    });

    it('should hide check-in modal on cancel', () => {
      component.showCheckInModal = true;
      component.tempDate = '2026-03-05';
      component.onCheckInCancelled();
      expect(component.showCheckInModal).toBe(false);
      expect(component.tempDate).toBeNull();
    });

    it('should not advance checkout when checkout date is greater than checkin', () => {
      component.searchEndDate = '10/03/2026';
      component.onCheckInConfirmed(new Date(2026, 2, 5));
      expect(component.searchEndDate).toBe('10/03/2026');
    });
  });

  describe('Check-out Modal Management', () => {
    it('should show check-out modal and set temp date', () => {
      component.searchEndDate = '10/03/2026';
      component.onCheckOutClicked();
      expect(component.showCheckOutModal).toBe(true);
      expect(component.tempDate).toBe('2026-03-10');
    });

    it('should hide check-out modal on cancel', () => {
      component.showCheckOutModal = true;
      component.tempDate = '2026-03-10';
      component.onCheckOutCancelled();
      expect(component.showCheckOutModal).toBe(false);
      expect(component.tempDate).toBeNull();
    });
  });

  describe('Date Conversion and Comparison', () => {
    it('should convert DD/MM/YYYY to ISO format correctly', () => {
      expect(component.convertDDMMYYYYToISO('15/06/2026')).toBe('2026-06-15');
      expect(component.convertDDMMYYYYToISO('01/01/2026')).toBe('2026-01-01');
      expect(component.convertDDMMYYYYToISO('31/12/2026')).toBe('2026-12-31');
    });

    it('should handle invalid date format gracefully', () => {
      const result = component.convertDDMMYYYYToISO('invalid');
      expect(result).toBeNull();
    });

    it('should convert Date to DD/MM/YYYY format correctly', () => {
      const date = new Date(2026, 2, 15); // March 15, 2026
      expect(component.convertDateToDDMMYYYY(date)).toBe('15/03/2026');
    });

    it('should pad day and month with zeros', () => {
      const date = new Date(2026, 0, 5); // January 5, 2026
      expect(component.convertDateToDDMMYYYY(date)).toBe('05/01/2026');
    });

    it('should compare dates correctly', () => {
      expect(component.compareDates('05/03/2026', '10/03/2026')).toBeLessThan(0);
      expect(component.compareDates('10/03/2026', '05/03/2026')).toBeGreaterThan(0);
      expect(component.compareDates('05/03/2026', '05/03/2026')).toBe(0);
    });

    it('should handle invalid date comparison gracefully', () => {
      expect(component.compareDates('invalid', '05/03/2026')).toBe(0);
      expect(component.compareDates('05/03/2026', 'invalid')).toBe(0);
    });
  });

  describe('Guests Input Handling', () => {
    it('should parse valid guest numbers', () => {
      component.onGuestsChanged('5');
      expect(component.searchCapacity).toBe(5);

      component.onGuestsChanged('1');
      expect(component.searchCapacity).toBe(1);
    });

    it('should set capacity to 0 for invalid input', () => {
      component.onGuestsChanged('abc');
      expect(component.searchCapacity).toBe(0);

      component.onGuestsChanged('-5');
      expect(component.searchCapacity).toBe(0);
    });

    it('should set capacity to 0 for non-finite numbers', () => {
      component.onGuestsChanged('NaN');
      expect(component.searchCapacity).toBe(0);
    });

    it('should get correct guest label', () => {
      component.searchCapacity = 0;
      expect(component.guestsLabelValue).toBe('0 Guests');

      component.searchCapacity = 1;
      expect(component.guestsLabelValue).toBe('1 Guest');

      component.searchCapacity = 5;
      expect(component.guestsLabelValue).toBe('5 Guests');
    });
  });

  describe('Hotel Information Helpers', () => {
    it('should get hotel location with both city and country', () => {
      const hotel = {
        id: '1',
        city: 'Paris',
        country: 'France',
        title: '', 
        price: 0,
        rating: 0,
        imageUrl: '',
      } as any;
      expect(component.getHotelLocation(hotel)).toBe('Paris, France');
    });

    it('should get hotel price with currency', () => {
      const hotel = {
        id: '1',
        pricePerNight: 150,
        currency: '$',
        title: '',
        city: '',
        country: '',
        rating: 0,
        imageUrl: '',
      } as any;
      expect(component.getHotelPrice(hotel)).toBe('$150');
    });

    it('should handle missing currency with default $', () => {
      const hotel = {
        id: '1',
        pricePerNight: 100,
        title: '',
        city: '',
        country: '',
        rating: 0,
        imageUrl: '',
      } as any;
      expect(component.getHotelPrice(hotel)).toBe('$100');
    });

    it('should format hotel rating to 1 decimal place', () => {
      const hotel = {
        id: '1',
        rating: 4.567,
        title: '',
        city: '',
        country: '',
        price: 0,
        imageUrl: '',
      } as any;
      expect(component.getHotelRating(hotel)).toBe('4.6');
    });

    it('should return N/A for invalid rating', () => {
      const hotel = {
        id: '1',
        rating: Number.NaN,
        title: '',
        city: '',
        country: '',
        price: 0,
        imageUrl: '',
      } as any;
      expect(component.getHotelRating(hotel)).toBe('N/A');
    });
  });

  describe('Search Functionality', () => {
    it('should navigate to search results with query params on successful search', async () => {
      component.searchCity = 'Paris';
      component.searchStartDate = '01/03/2026';
      component.searchCapacity = 2;

      const hotelsService = TestBed.inject(HotelsService) as unknown as HotelsServiceMock;
      const mockHotels = [{ id: '1', title: 'Hotel' } as any];
      hotelsService.getHotels.and.returnValue(of(mockHotels));

      const router = TestBed.inject(Router) as unknown as RouterMock;

      await component.onSearchHotels();

      expect(router.navigate).toHaveBeenCalledWith(['/search-results'], jasmine.any(Object));
    });

    it('should set isLoading correctly during search', async () => {
      const hotelsService = TestBed.inject(HotelsService) as unknown as HotelsServiceMock;
      hotelsService.getHotels.and.returnValue(of([]));

      expect(component.isLoading).toBe(false);
      const searchPromise = component.onSearchHotels();
      expect(component.isLoading).toBe(true);

      await searchPromise;
      expect(component.isLoading).toBe(false);
    });

    it('should clear error message when starting search', async () => {
      component.errorMessage = 'Previous error';
      const hotelsService = TestBed.inject(HotelsService) as unknown as HotelsServiceMock;
      hotelsService.getHotels.and.returnValue(of([]));

      await component.onSearchHotels();

      expect(component.errorMessage).toBe('');
    });
  });

  describe('Guest Input Formatting', () => {
    it('should return empty string for zero guests in input value', () => {
      component.searchCapacity = 0;
      expect(component.guestsInputValue).toBe('');
    });

    it('should return string representation of guests for positive values', () => {
      component.searchCapacity = 3;
      expect(component.guestsInputValue).toBe('3');
    });
  });

  describe('Search Disabled State', () => {
    it('should always return false for isSearchDisabled', () => {
      expect(component.isSearchDisabled).toBe(false);
    });
  });
});
