import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HotelsService } from '../../core/services/hotels.service';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { ThFilterSummaryComponent } from '../../shared/components/th-filter-summary/th-filter-summary.component';
import { SearchResultsPage } from './search-results.page';

class HotelsServiceMock {
  getHotels = jasmine.createSpy('getHotels').and.returnValue(of([]));
}

class RouterMock {
  private navigationState: unknown = null;
  navigate = jasmine.createSpy('navigate').and.resolveTo(true);

  setNavigationState(state: unknown): void {
    this.navigationState = state;
  }

  getCurrentNavigation(): { extras: { state: unknown } } | null {
    if (!this.navigationState) {
      return null;
    }

    return { extras: { state: this.navigationState } };
  }
}

class PropertyDetailServiceMock {
  getPropertyDetail = jasmine.createSpy('getPropertyDetail').and.returnValue(of({ id: '1' }));
}

describe('SearchResultsPage', () => {
  let component: SearchResultsPage;
  let fixture: ComponentFixture<SearchResultsPage>;
  let hotelsService: HotelsServiceMock;
  let router: RouterMock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SearchResultsPage],
      imports: [IonicModule.forRoot(), ThFilterSummaryComponent],
      providers: [
        { provide: HotelsService, useClass: HotelsServiceMock },
        { provide: PropertyDetailService, useClass: PropertyDetailServiceMock },
        { provide: Router, useClass: RouterMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchResultsPage);
    component = fixture.componentInstance;
    hotelsService = TestBed.inject(HotelsService) as unknown as HotelsServiceMock;
    router = TestBed.inject(Router) as unknown as RouterMock;
  });

  it('uses hotels from navigation state when available', async () => {
    router.setNavigationState({ hotels: [{ id: '1' }] });

    await component.ngOnInit();

    expect(component.hotels.length).toBe(1);
    expect(hotelsService.getHotels).not.toHaveBeenCalled();
  });

  it('loads hotels using query params', async () => {
    const route = TestBed.inject(ActivatedRoute) as ActivatedRoute;
    (route.snapshot as any).queryParamMap = convertToParamMap({
      city: 'Paris',
      startDate: '01/03/2026',
      endDate: '02/03/2026',
      capacity: '2',
    });

    await component.ngOnInit();

    expect(hotelsService.getHotels).toHaveBeenCalledWith({
      startDate: '01/03/2026',
      endDate: '02/03/2026',
      city: 'Paris',
      capacity: 2,
    });
  });

  it('loads hotels without params when no filters are set', async () => {
    component.searchCity = '';
    component.searchStartDate = '';
    component.searchEndDate = '';
    component.searchCapacity = 0;

    await component.loadHotelsFromApi();

    expect(hotelsService.getHotels).toHaveBeenCalledWith();
  });

  it('formats hotel location with fallback when missing', () => {
    expect(component.getHotelLocation({ id: '1' } as any)).toBe('Location unavailable');
    expect(component.getHotelLocation({ id: '2', city: 'Lima' } as any)).toBe('Lima');
    expect(component.getHotelLocation({ id: '3', city: 'Lima', country: 'PE' } as any)).toBe('Lima, PE');
  });

  it('formats hotel price with defaults', () => {
    expect(component.getHotelPrice({ id: '1' } as any)).toBe('$0');
    expect(component.getHotelPrice({ id: '2', currency: 'USD', pricePerNight: 120 } as any)).toBe('USD120');
  });

  it('formats hotel rating with fallback', () => {
    expect(component.getHotelRating({ id: '1', rating: 4.25 } as any)).toBe('4.3');
    expect(component.getHotelRating({ id: '2', rating: NaN } as any)).toBe('N/A');
  });

  it('builds filter summary with singular guest label', async () => {
    const route = TestBed.inject(ActivatedRoute) as ActivatedRoute;
    (route.snapshot as any).queryParamMap = convertToParamMap({
      city: 'Bogota',
      startDate: '2026-03-01',
      endDate: '2026-03-03',
      capacity: '1',
    });

    await component.ngOnInit();

    expect(component.filterSummaryParams.guestsValue).toBe('1 Guest');
  });

  it('sets error message on load failure', async () => {
    hotelsService.getHotels.and.returnValue(throwError(() => new Error('fail')));

    await component.loadHotelsFromApi();

    expect(component.errorMessage).toBe('Unable to load hotels.');
  });

  it('loads property detail and navigates on view details click', async () => {
    const propertyDetailService = TestBed.inject(PropertyDetailService) as unknown as PropertyDetailServiceMock;

    await component.viewDetails({ id: 'prop-1' } as any);

    expect(propertyDetailService.getPropertyDetail).toHaveBeenCalledWith('prop-1');
    expect(router.navigate).toHaveBeenCalledWith(['/propertydetail', 'prop-1'], jasmine.any(Object));
  });
});
