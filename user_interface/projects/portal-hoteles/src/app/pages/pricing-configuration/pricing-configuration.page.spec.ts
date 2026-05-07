/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { PricingEngineService } from '@travelhub/core/services/pricing-engine.service';
import { PricingPropertyResponse } from '@travelhub/core/models/platform-api.model';
import { PortalHotelesPricingConfigurationPage } from './pricing-configuration.page';

describe('PortalHotelesPricingConfigurationPage', () => {
  let component: PortalHotelesPricingConfigurationPage;
  let fixture: ComponentFixture<PortalHotelesPricingConfigurationPage>;
  let pricingEngineServiceSpy: jasmine.SpyObj<PricingEngineService>;

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
      imports: [PortalHotelesPricingConfigurationPage],
      providers: [
        { provide: AuthSessionService, useValue: mockAuthSession },
        { provide: PricingEngineService, useValue: pricingEngineServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHotelesPricingConfigurationPage);
    component = fixture.componentInstance;

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
      pricingEngineServiceSpy.getPropertyPricing.and.returnValue(of(mockData));

      // Act
      await component.loadPricingData();

      // Assert
      expect(pricingEngineServiceSpy.getPropertyPricing).toHaveBeenCalled();
      const requestArgs = pricingEngineServiceSpy.getPropertyPricing.calls.mostRecent().args[0];
      expect(requestArgs.propertyId).toBe('7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33');
      expect(requestArgs.guests).toBe(1);
      expect(requestArgs.dateInit).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(requestArgs.dateFinish).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
      pricingEngineServiceSpy.getPropertyPricing.and.returnValue(of(mockData));

      // Act
      await component.loadPricingData();

      // Assert
      expect(pricingEngineServiceSpy.getPropertyPricing).toHaveBeenCalledWith({
        propertyId: 'property-1',
        guests: 2,
        dateInit: '2026-05-10',
        dateFinish: '2026-05-12',
      });
      expect(component.pricingData.name).toBe('Test Property');
      expect(component.pricingData.city).toBe('Bogota');
      expect(component.pricingData.country).toBe('Colombia');
      expect(component.pricingData.price).toBe(150);
      expect(component.pricingData.maxCapacity).toBe(4);
      expect(component.isLoading).toBeFalse();
      expect(component.errorMessage).toBe('');
    });

    it('should handle loading error', async () => {
      // Arrange
      component.propertyId = 'property-1';
      component.guests = 2;
      component.dateInit = '2026-05-10';
      component.dateFinish = '2026-05-12';
      pricingEngineServiceSpy.getPropertyPricing.and.returnValue(
        throwError(() => new Error('Network error')),
      );

      // Act
      await component.loadPricingData();

      // Assert
      expect(component.isLoading).toBeFalse();
      expect(component.errorMessage).toBe('Unable to load pricing data.');
      expect(component.pricingData).toEqual(emptyPricingResponse);
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

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const tables = element.querySelectorAll('table.portal-hoteles-pricing-table');

      // Assert — the second pricing table is the seasonal-rules table.
      expect(tables.length).toBeGreaterThanOrEqual(2);
      const seasonalTable = tables[1] as HTMLTableElement;
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

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const paginationButtons = element.querySelectorAll(
        '.portal-hoteles-pricing-table__pagination ion-button',
      );
      const activePage = element.querySelector(
        '.portal-hoteles-pricing-table__page--active',
      );

      // Assert
      expect(paginationButtons.length).toBe(2);
      const previousButton = paginationButtons[0] as HTMLElement & { disabled?: boolean };
      const nextButton = paginationButtons[1] as HTMLElement & { disabled?: boolean };
      expect(previousButton.getAttribute('aria-label')).toBe('Previous page');
      expect(nextButton.getAttribute('aria-label')).toBe('Next page');
      // Ionic reflects [disabled]="true" via its `disabled` property; the host-element
      // attribute is mirrored asynchronously inside the web component's shadow DOM.
      expect(previousButton.disabled === true || previousButton.hasAttribute('disabled')).toBeTrue();
      expect(activePage).not.toBeNull();
      expect(activePage?.getAttribute('aria-current')).toBe('page');
    });

    it('labels every "⋮" row-actions ion-button with aria-label="Row actions" (AC-5)', () => {
      // Arrange

      // Act
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const rowActionButtons = element.querySelectorAll(
        '.portal-hoteles-pricing-table__actions-button',
      );

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
      // be overridden. The test stubs loadPricingData entirely so it never overwrites
      // our values.
      spyOn<{ loadPricingData: () => Promise<void> }>(
        component as unknown as { loadPricingData: () => Promise<void> },
        'loadPricingData',
      ).and.returnValue(Promise.resolve());
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
      // Arrange — override loadPricingData so it does not rebuild roomRateRows from
      // the default base rate (which would always produce 4 rows).
      spyOn<{ loadPricingData: () => Promise<void> }>(
        component as unknown as { loadPricingData: () => Promise<void> },
        'loadPricingData',
      ).and.returnValue(Promise.resolve());
      // Override refreshRoomRateRows (called from ngOnInit) so roomRateRows stays empty.
      spyOn<{ refreshRoomRateRows: () => void }>(
        component as unknown as { refreshRoomRateRows: () => void },
        'refreshRoomRateRows' as never,
      ).and.callFake(() => {
        component.roomRateRows = [];
      });
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
