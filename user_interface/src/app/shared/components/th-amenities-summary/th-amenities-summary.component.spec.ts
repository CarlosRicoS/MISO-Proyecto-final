/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ThAmenitiesSummaryComponent } from './th-amenities-summary.component';

describe('ThAmenitiesSummaryComponent', () => {
  let component: ThAmenitiesSummaryComponent;
  let fixture: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThAmenitiesSummaryComponent],
    });

    fixture = TestBed.createComponent(ThAmenitiesSummaryComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders default amenities list', () => {
    fixture.detectChanges();

    expect(component.title).toBe('Popular Amenities');
    expect(component.amenities.length).toBeGreaterThan(0);
    expect(component.mobileAmenities.length).toBeLessThanOrEqual(6);
  });

  it('has default values', () => {
    expect(component.title).toBe('Popular Amenities');
    expect(component.totalAmenities).toBe(32);
    expect(component.viewAllLabel).toBe('View all amenities');
    expect(component.amenities.length).toBe(6);
  });

  it('builds desktop view all text from total amenities', () => {
    component.totalAmenities = 48;
    fixture.detectChanges();

    expect(component.desktopViewAllText).toBe('View all 48 amenities');
  });

  it('accepts custom title', () => {
    component.title = 'Premium Amenities';
    fixture.detectChanges();

    expect(component.title).toBe('Premium Amenities');
  });

  it('accepts custom amenities list', () => {
    const customAmenities = [
      { label: 'Sauna', icon: 'spa-outline' },
      { label: 'Library', icon: 'book-outline' },
    ];
    component.amenities = customAmenities;
    fixture.detectChanges();

    expect(component.amenities).toEqual(customAmenities);
  });

  it('mobile amenities respects maximum of 6', () => {
    const manyAmenities = Array.from({ length: 20 }, (_, i) => ({
      label: `Amenity ${i}`,
      icon: 'icon',
    }));
    component.amenities = manyAmenities;
    fixture.detectChanges();

    expect(component.mobileAmenities.length).toBe(6);
  });

  it('mobile amenities shows all when less than 6', () => {
    const fewAmenities = [
      { label: 'A1', icon: 'icon1' },
      { label: 'A2', icon: 'icon2' },
    ];
    component.amenities = fewAmenities;
    fixture.detectChanges();

    expect(component.mobileAmenities).toEqual(fewAmenities);
  });

  it('accepts custom totalAmenities', () => {
    component.totalAmenities = 100;
    fixture.detectChanges();

    expect(component.desktopViewAllText).toBe('View all 100 amenities');
  });

  it('accepts custom viewAllLabel', () => {
    component.viewAllLabel = 'See more facilities';
    fixture.detectChanges();

    expect(component.viewAllLabel).toBe('See more facilities');
  });

  it('handles zero amenities', () => {
    component.amenities = [];
    fixture.detectChanges();

    expect(component.mobileAmenities.length).toBe(0);
  });
});
