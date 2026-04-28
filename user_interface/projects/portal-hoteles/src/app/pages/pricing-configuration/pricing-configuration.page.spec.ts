/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { PricingEngineService } from '@travelhub/core/services/pricing-engine.service';
import { PricingPropertyResponse } from '@travelhub/core/models/platform-api.model';
import { PortalHotelesPricingConfigurationPage } from './pricing-configuration.page';

describe('PortalHotelesPricingConfigurationPage', () => {
  let component: PortalHotelesPricingConfigurationPage;
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

    const fixture = TestBed.createComponent(PortalHotelesPricingConfigurationPage);
    component = fixture.componentInstance;
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
});
