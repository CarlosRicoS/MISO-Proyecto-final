import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { ThBadgeComponent } from '../../shared/components/th-badge/th-badge.component';
import { ThHotelCardComponent } from '../../shared/components/th-hotel-card/th-hotel-card.component';
import { ThPaymentSummaryComponent } from '../../shared/components/th-payment-summary/th-payment-summary.component';
import { ThAmenitiesSummaryComponent } from '../../shared/components/th-amenities-summary/th-amenities-summary.component';
import { ThDetailSummaryComponent } from '../../shared/components/th-detail-summary/th-detail-summary.component';
import { ThDetailsMosaicComponent } from '../../shared/components/th-details-mosaic/th-details-mosaic.component';
import { ThPropertyDescriptionSummaryComponent } from '../../shared/components/th-property-description-summary/th-property-description-summary.component';
import { ThPropertyReviewSummaryComponent } from '../../shared/components/th-property-review-summary/th-property-review-summary.component';
import { PropertydetailPage } from './propertydetail.page';
import { CommonModule } from '@angular/common';

describe('PropertydetailPage', () => {
  let component: PropertydetailPage;
  let fixture: ComponentFixture<PropertydetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PropertydetailPage],
      imports: [
        CommonModule,
        IonicModule.forRoot(),
        ThBadgeComponent,
        ThHotelCardComponent,
        ThPaymentSummaryComponent,
        ThAmenitiesSummaryComponent,
        ThDetailSummaryComponent,
        ThDetailsMosaicComponent,
        ThPropertyDescriptionSummaryComponent,
        ThPropertyReviewSummaryComponent,
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PropertydetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('defines payment summary data', () => {
    expect(component.summaryItems.length).toBeGreaterThan(0);
    expect(component.summaryBadges.length).toBeGreaterThan(0);
  });

  describe('Component Initialization', () => {
    it('should have property title', () => {
      expect(component.property?.title).toBeDefined();
    });

    it('should have property location', () => {
      expect(component.property?.location).toBeDefined();
    });

    it('should have property price', () => {
      expect(component.property?.price).toBeDefined();
    });

    it('should have property rating', () => {
      expect(component.property?.rating).toBeDefined();
    });

    it('should have property images array', () => {
      expect(Array.isArray(component.property?.images)).toBe(true);
    });
  });

  describe('Property Data', () => {
    it('should have Grand Luxury Resort as title', () => {
      expect(component.property?.title).toBe('Grand Luxury Resort & Spa');
    });

    it('should have multiple images', () => {
      expect(component.property?.images?.length).toBeGreaterThan(0);
    });

    it('should have ratings', () => {
      expect(component.property?.rating).toBeDefined();
    });
  });

  describe('Summary Items and Badges', () => {
    it('should have summary items', () => {
      expect(component.summaryItems).toBeDefined();
      expect(Array.isArray(component.summaryItems)).toBe(true);
    });

    it('should have summary badges', () => {
      expect(component.summaryBadges).toBeDefined();
      expect(Array.isArray(component.summaryBadges)).toBe(true);
    });

    it('should have correct number of summary items', () => {
      expect(component.summaryItems.length).toBeGreaterThan(0);
    });

    it('should have correct number of summary badges', () => {
      expect(component.summaryBadges.length).toBeGreaterThan(0);
    });
  });
});
