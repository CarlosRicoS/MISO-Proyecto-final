/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ThAmenitiesSummaryComponent } from './th-amenities-summary.component';

describe('ThAmenitiesSummaryComponent', () => {
  it('renders default amenities list', () => {
    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThAmenitiesSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThAmenitiesSummaryComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.title).toBe('Popular Amenities');
    expect(component.amenities.length).toBeGreaterThan(0);
    expect(component.mobileAmenities.length).toBeLessThanOrEqual(6);
  });

  it('builds desktop view all text from total amenities', () => {
    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThAmenitiesSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThAmenitiesSummaryComponent);
    const component = fixture.componentInstance;

    component.totalAmenities = 48;

    fixture.detectChanges();

    expect(component.desktopViewAllText).toBe('View all 48 amenities');
  });
});
