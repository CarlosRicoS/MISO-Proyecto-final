/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { PricingEngineService } from '@travelhub/core/services/pricing-engine.service';
import { PricingPropertyResponse } from '@travelhub/core/models/platform-api.model';
import { PortalHotelesPricingConfigurationPage } from './pricing-configuration.page';
import { translateTestingModule } from '../../testing/translate-testing.module';
import { ConfigService } from '@travelhub/core/services/config.service';

describe('PortalHotelesPricingConfigurationPage', () => {
  let component: PortalHotelesPricingConfigurationPage;
  let fixture: ComponentFixture<PortalHotelesPricingConfigurationPage>;
  let pricingEngineServiceSpy: jasmine.SpyObj<PricingEngineService>;
  let httpMock: HttpTestingController;

  const mockAuthSession = {
    userEmail: 'test@example.com',
  };

  const emptyPricingResponse: PricingPropertyResponse = {
    id: '',
    name: '',
    city: '',
    country: '',
    price: 0,
    maxCapacity: 0,
    description: '',
    urlBucketPhotos: '',
    checkInTime: '',
    checkOutTime: '',
    adminGroupId: '',
  };

  beforeEach(async () => {
    pricingEngineServiceSpy = jasmine.createSpyObj<PricingEngineService>('PricingEngineService', ['getPropertyPricing']);

    await TestBed.configureTestingModule({
      imports: [PortalHotelesPricingConfigurationPage, translateTestingModule(), HttpClientTestingModule],
      providers: [
        { provide: AuthSessionService, useValue: mockAuthSession },
        { provide: PricingEngineService, useValue: pricingEngineServiceSpy },
        { provide: ConfigService, useValue: { apiBaseUrl: 'http://localhost', propertyApiPath: '/poc-properties/api/property' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHotelesPricingConfigurationPage);
    component = fixture.componentInstance;

    httpMock = TestBed.inject(HttpTestingController);

    // Default behaviour for getPropertyPricing — overridden in specific tests as needed.
    pricingEngineServiceSpy.getPropertyPricing.and.returnValue(of(emptyPricingResponse));

  });

  describe('Initial State', () => {
    it('should initialize with empty pricing data', () => {
      // Arrange

      // Act

      // Assert
      expect(component.pricingData.name).toBe('');
      expect(component.pricingData.city).toBe('');
      expect(component.pricingData.country).toBe('');
      expect(component.pricingData.price).toBe(0);
      expect(component.pricingData.maxCapacity).toBe(0);
      expect(component.isLoading).toBeFalse();
    });

    it('should initialize with default input values', () => {
      // Arrange

      // Act

      // Assert
      expect(component.propertyId).toBe('');
      expect(component.guests).toBe(1);
      expect(component.dateInit).toBe('');
      expect(component.dateFinish).toBe('');
      expect(component.currencyFilter).toBe('$');
    });
  });

  describe('Loading Pricing Data', () => {
    it('should load pricing data using default params when inputs are missing', async () => {
      // Arrange
      const mockData: PricingPropertyResponse = {
        ...emptyPricingResponse,
        id: '1',
        name: 'Default Property',
        price: 240,
      };

      component.propertyId = '';
      component.guests = 0;
      component.dateInit = '';
      component.dateFinish = '';

      // Exercise the HTTP logic by stubbing HttpClient.get responses directly.
      const http = TestBed.inject(HttpClient);
      spyOn(http, 'get').and.returnValues(of([]), of([]));

      await component.loadTableData();

      expect(component.isLoading).toBeFalse();
      expect(component.errorMessage).toBe('');
    });

    it('should load pricing data successfully', async () => {
      // Arrange
      const mockData: PricingPropertyResponse = {
        id: '1',
        name: 'Test Property',
        city: 'Bogota',
        country: 'Colombia',
        price: 150,
        maxCapacity: 4,
        description: 'Luxury property',
        urlBucketPhotos: '',
        checkInTime: '14:00',
        checkOutTime: '11:00',
        adminGroupId: '',
      };


      component.propertyId = 'property-1';
      component.guests = 2;
      component.dateInit = '2026-05-10';
      component.dateFinish = '2026-05-12';

      // Prepare HTTP responses: one pricing entry matching a property
      const pricingEntries = [ { propertyId: 'property-1', basePrice: 150 } ];
      const properties = [ { id: 'property-1', name: 'Test Property', city: 'Bogota', country: 'Colombia', maxCapacity: 4 } ];

      const http = TestBed.inject(HttpClient);
      spyOn(http, 'get').and.returnValues(of(pricingEntries), of(properties));

      await component.loadTableData();

      expect(component.roomRateRows.length).toBe(1);
      expect(component.roomRateRows[0].propertyName).toBe('Test Property');
      expect(component.roomRateRows[0].propertyCity).toBe('Bogota');
      expect(component.roomRateRows[0].baseRate).toBe(150);
      expect(component.isLoading).toBeFalse();
      expect(component.errorMessage).toBe('');
    });

    it('should handle loading error', async () => {
      // Arrange
      component.propertyId = 'property-1';
      component.guests = 2;
      component.dateInit = '2026-05-10';
      component.dateFinish = '2026-05-12';

      const http = TestBed.inject(HttpClient);
      spyOn(http, 'get').and.returnValues(throwError(() => new Error('Network error')));

      await component.loadTableData();

      expect(component.isLoading).toBeFalse();
      expect(component.errorMessage).toBe('Unable to load pricing data.');
      // roomRateRows should remain empty on error
      expect(component.roomRateRows.length).toBe(0);
    });

    it('returns range label when pricing data exists', () => {
      // Arrange
      component.pricingData = {
        ...emptyPricingResponse,
        id: '1',
        name: 'Property',
        price: 200,
      };

      // Act
      const label = component.visibleRangeLabel;

      // Assert
      expect(label).toBe('Showing 1-1 of 1 pricing record');
    });

    it('returns fallback range label when no pricing data exists', () => {
      // Arrange
      component.pricingData = emptyPricingResponse;

      // Act
      const label = component.visibleRangeLabel;

      // Assert
      expect(label).toBe('No pricing data available');
    });

    it('should format rate correctly', () => {
      // Arrange

      // Act

      // Assert
      expect(component.formatRate(240, '$')).toBe('$240.00');
      expect(component.formatRate(199.99, '$')).toBe('$199.99');
    });

    it('should format discount correctly', () => {
      // Arrange

      // Act

      // Assert
      expect(component.formatDiscount(-15)).toBe('-15.00% OFF');
      expect(component.formatDiscount(35)).toBe('+35.00% OFF');
      expect(component.formatDiscount(0)).toBe('No discount');
      expect(component.formatDiscount(undefined)).toBe('No discount');
    });

    it('should format date range correctly', () => {
      // Arrange

      // Act

      // Assert
      expect(component.formatDateRange('Dec 15 - Jan 15')).toBe('Dec 15 - Jan 15');
      expect(component.formatDateRange('')).toBe('-');
    });

    it('should get status class for active status', () => {
      // Arrange

      // Act

      // Assert
      expect(component.getStatusClass('Active')).toContain('portal-hoteles-pricing-status--active');
    });

    it('should get status class for inactive status', () => {
      // Arrange

      // Act

      // Assert
      expect(component.getStatusClass('Inactive')).toContain('portal-hoteles-pricing-status--inactive');
    });

    it('returns operator name from authenticated session', () => {
      // Arrange

      // Act
      const operator = component.operatorName;

      // Assert
      expect(operator).toBe('test@example.com');
    });
  });

  describe('a11y', () => {
    it('renders a single sr-only <h1>Pricing Management</h1> before any card (AC-1)', () => {
      // Arrange
      // Arrange
      spyOn(component, 'loadTableData').and.returnValue(Promise.resolve());

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const headings = element.querySelectorAll('h1');

      // Assert
      expect(headings.length).toBe(1);
      const h1 = headings[0] as HTMLHeadingElement;
      expect(h1.textContent?.trim()).toBe('Pricing Management');
      expect(h1.classList.contains('sr-only')).toBeTrue();
    });

    it('renders the room-rate listing as a semantic <table> with thead/tbody and th[scope="col"] (AC-2)', () => {
      // Arrange
      spyOn(component, 'loadTableData').and.returnValue(Promise.resolve());

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const tables = element.querySelectorAll('table.portal-hoteles-pricing-table');
      const roomRateTable = tables[0] as HTMLTableElement;

      // Assert
      expect(tables.length).toBeGreaterThanOrEqual(1);
      expect(roomRateTable.tagName).toBe('TABLE');
      expect(roomRateTable.querySelector('thead')).not.toBeNull();
      expect(roomRateTable.querySelector('tbody')).not.toBeNull();

      const headerCells = roomRateTable.querySelectorAll('thead th');
      expect(headerCells.length).toBeGreaterThan(0);
      headerCells.forEach((th) => {
        expect(th.getAttribute('scope')).toBe('col');
      });
    });

    it('renders the seasonal-rules listing as a semantic <table> with thead/tbody and th[scope="col"] (AC-3)', () => {
      // Arrange

      spyOn(component, 'loadTableData').and.returnValue(Promise.resolve());

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const seasonalRows = element.querySelectorAll('tr.portal-hoteles-pricing-table__row--seasonal');

      // Assert — seasonal rows should exist and be contained in a table with thead/tbody
      expect(seasonalRows.length).toBeGreaterThan(0);
      const seasonalTable = (seasonalRows[0].closest('table') as HTMLTableElement);
      expect(seasonalTable).toBeTruthy();
      expect(seasonalTable.tagName).toBe('TABLE');
      const seasonalHead = seasonalTable.querySelector('thead');
      const seasonalBody = seasonalTable.querySelector('tbody');
      expect(seasonalHead).not.toBeNull();
      expect(seasonalBody).not.toBeNull();

      const headerCells = seasonalTable.querySelectorAll('thead th');
      expect(headerCells.length).toBeGreaterThan(0);
      headerCells.forEach((th) => {
        expect(th.getAttribute('scope')).toBe('col');
      });
    });

    it('labels pagination glyph buttons and marks the active page with aria-current (AC-4)', () => {
      // Arrange

      spyOn(component, 'loadTableData').and.returnValue(Promise.resolve());
      // Ensure we have paginated rows to render pagination controls
      component.roomRateRows = new Array(15).fill(0).map((_, i) => ({
        propertyName: `P${i}`,
        propertyId: `id${i}`,
        propertyCity: 'City',
        guestsCapacityLabel: '1',
        baseRateLabel: '$10.00',
        baseRate: 10,
      } as any));

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const paginationContainer = element.querySelector('.portal-hoteles-pricing-pagination__controls');
      const paginationButtons = paginationContainer ? paginationContainer.querySelectorAll('button, ion-button') : [];

      // Assert — there should be numbered page buttons and one marked with aria-current
      expect(paginationButtons.length).toBeGreaterThan(0);
      const activeButton = Array.from(paginationButtons).find((b) => (b as HTMLElement).getAttribute('aria-current') === 'page');
      expect(activeButton).toBeTruthy();
    });

    it('labels every "⋮" row-actions ion-button with aria-label="Row actions" (AC-5)', () => {
      // Arrange

      spyOn(component, 'loadTableData').and.returnValue(Promise.resolve());

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const rowActionButtons = element.querySelectorAll('.portal-hoteles-pricing-table__actions-button');

      // Assert — both room-rate rows (4) and seasonal-rule rows (2) expose row actions.
      expect(rowActionButtons.length).toBeGreaterThanOrEqual(2);
      rowActionButtons.forEach((button) => {
        expect(button.getAttribute('aria-label')).toBe('Row actions');
      });
    });

    it('shows a polite live-region loading paragraph when isLoading=true (AC-6)', () => {
      // Arrange
      component.isLoading = true;
      component.errorMessage = '';

      spyOn(component, 'loadTableData').and.returnValue(Promise.resolve());

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const loadingMessages = Array.from(
        element.querySelectorAll('p.portal-hoteles-pricing-table__message'),
      ).filter((p) => p.textContent?.includes('Loading pricing data'));

      // Assert
      expect(loadingMessages.length).toBe(1);
      const loading = loadingMessages[0];
      expect(loading.getAttribute('aria-live')).toBe('polite');
      expect(loading.getAttribute('aria-atomic')).toBe('true');
    });

    it('shows the error paragraph with role="alert" when errorMessage is set (AC-6)', () => {
      // Arrange — set state BEFORE the first detectChanges so ngOnInit's defaults can
      // be overridden. Stub loadTableData so it never overwrites our values.
      spyOn<{ loadTableData: () => Promise<void> }>(component as unknown as { loadTableData: () => Promise<void> }, 'loadTableData').and.returnValue(Promise.resolve());
      component.isLoading = false;
      component.errorMessage = 'Unable to load pricing data.';
      component.roomRateRows = [];

      // Act — first detectChanges renders the template; ngOnInit runs but loadPricingData
      // is stubbed so errorMessage and roomRateRows stay as set above.
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const errorMessage = Array.from(
        element.querySelectorAll('p.portal-hoteles-pricing-table__message'),
      ).find((p) => p.textContent?.includes('Unable to load pricing data'));

      // Assert
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.getAttribute('role')).toBe('alert');
    });

    it('renders only one empty-state paragraph for the room-rate table (AC-6)', () => {
      // Arrange — stub loadTableData so ngOnInit does not fetch data, then set empty rows.
      spyOn(component, 'loadTableData').and.returnValue(Promise.resolve());
      component.isLoading = false;
      component.errorMessage = '';
      component.roomRateRows = [];

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const emptyMessages = Array.from(
        element.querySelectorAll('p.portal-hoteles-pricing-table__message'),
      ).filter((p) => p.textContent?.includes('No pricing data available'));

      // Assert — exactly one empty paragraph (the duplicate has been removed).
      expect(component.roomRateRows.length).toBe(0);
      expect(emptyMessages.length).toBe(1);
      const emptyMessage = emptyMessages[0];
      expect(emptyMessage.getAttribute('aria-live')).toBe('polite');
      expect(emptyMessage.getAttribute('aria-atomic')).toBe('true');
    });

    it('associates the search input with a sr-only label via [id]/[for] (AC-7)', () => {
      // Arrange

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const searchInput = element.querySelector('ion-input.portal-hoteles-pricing-content-toolbar__search');
      const searchLabel = element.querySelector('label[for="pricing-search-input"]');

      // Assert
      expect(searchInput).not.toBeNull();
      expect(searchInput?.getAttribute('id')).toBe('pricing-search-input');
      expect(searchLabel).not.toBeNull();
      expect(searchLabel?.classList.contains('sr-only')).toBeTrue();
    });
  });
});
