/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ThReviewCardComponent } from './th-review-card.component';

describe('ThReviewCardComponent', () => {
  it('builds stars array from stars input', () => {
    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThReviewCardComponent],
    });

    const fixture = TestBed.createComponent(ThReviewCardComponent);
    const component = fixture.componentInstance;

    component.stars = 4;

    fixture.detectChanges();

    expect(component.starsArray.length).toBe(4);
  });

  it('exposes default score', () => {
    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThReviewCardComponent],
    });

    const fixture = TestBed.createComponent(ThReviewCardComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.score).toBe('5.0');
  });
});
