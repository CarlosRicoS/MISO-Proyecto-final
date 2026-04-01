/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ThPropertyReviewSummaryComponent } from './th-property-review-summary.component';

describe('ThPropertyReviewSummaryComponent', () => {
  it('returns only first two reviews for mobile', () => {
    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThPropertyReviewSummaryComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThPropertyReviewSummaryComponent);
    const component = fixture.componentInstance;

    component.reviews = [
      { name: 'A', locationAndDate: 'x', relativeDate: 'x', text: 'x', avatarUrl: 'x', score: '5.0', stars: 5 },
      { name: 'B', locationAndDate: 'x', relativeDate: 'x', text: 'x', avatarUrl: 'x', score: '4.8', stars: 5 },
      { name: 'C', locationAndDate: 'x', relativeDate: 'x', text: 'x', avatarUrl: 'x', score: '4.7', stars: 4 },
    ];

    fixture.detectChanges();

    expect(component.mobileReviews.length).toBe(2);
  });

  it('keeps configurable title', () => {
    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThPropertyReviewSummaryComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThPropertyReviewSummaryComponent);
    const component = fixture.componentInstance;

    component.title = 'Guest Reviews';

    fixture.detectChanges();

    expect(component.title).toBe('Guest Reviews');
  });
});
