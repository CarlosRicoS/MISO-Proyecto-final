/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ThReviewCardComponent } from './th-review-card.component';

describe('ThReviewCardComponent', () => {
  let component: ThReviewCardComponent;
  let fixture: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot(), ThReviewCardComponent],
    });

    fixture = TestBed.createComponent(ThReviewCardComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('builds stars array from stars input', () => {
    component.stars = 4;
    fixture.detectChanges();
    expect(component.starsArray.length).toBe(4);
  });

  it('exposes default score', () => {
    fixture.detectChanges();
    expect(component.score).toBe('5.0');
  });

  it('has default values for all inputs', () => {
    expect(component.name).toBe('Guest');
    expect(component.locationAndDate).toBe('City • Date');
    expect(component.relativeDate).toBe('2 days ago');
    expect(component.text).toBe('');
    expect(component.avatarUrl).toBe('');
    expect(component.stars).toBe(5);
  });

  it('accepts custom name input', () => {
    component.name = 'John Smith';
    fixture.detectChanges();
    expect(component.name).toBe('John Smith');
  });

  it('accepts custom location and date', () => {
    component.locationAndDate = 'Paris • March 2026';
    fixture.detectChanges();
    expect(component.locationAndDate).toBe('Paris • March 2026');
  });

  it('accepts custom relative date', () => {
    component.relativeDate = '1 week ago';
    fixture.detectChanges();
    expect(component.relativeDate).toBe('1 week ago');
  });

  it('accepts review text', () => {
    component.text = 'Great hotel, highly recommended!';
    fixture.detectChanges();
    expect(component.text).toBe('Great hotel, highly recommended!');
  });

  it('accepts avatar URL', () => {
    component.avatarUrl = 'https://example.com/avatar.jpg';
    fixture.detectChanges();
    expect(component.avatarUrl).toBe('https://example.com/avatar.jpg');
  });

  it('accepts custom score', () => {
    component.score = '4.5';
    fixture.detectChanges();
    expect(component.score).toBe('4.5');
  });

  it('builds correct stars array for various inputs', () => {
    const testCases = [0, 1, 3, 5, 10];
    testCases.forEach((numStars) => {
      component.stars = numStars;
      fixture.detectChanges();
      expect(component.starsArray.length).toBe(numStars);
    });
  });

  it('handles negative stars by returning empty array', () => {
    component.stars = -5;
    fixture.detectChanges();
    expect(component.starsArray.length).toBe(0);
  });
});
