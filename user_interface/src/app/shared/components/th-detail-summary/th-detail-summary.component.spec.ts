import { TestBed } from '@angular/core/testing';
import { ThDetailSummaryComponent } from './th-detail-summary.component';

describe('ThDetailSummaryComponent', () => {
  it('renders defaults', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThDetailSummaryComponent);
    const component = fixture.componentInstance;

    expect(component.title).toBe('Hotel name');
    expect(component.score).toBe('9.2');
    expect(component.stars).toBe(5);
    expect(component.starIcons.length).toBe(5);
  });

  it('builds star icons from stars input', () => {
    TestBed.configureTestingModule({
      imports: [ThDetailSummaryComponent],
    });

    const fixture = TestBed.createComponent(ThDetailSummaryComponent);
    const component = fixture.componentInstance;

    component.stars = 3;

    expect(component.starIcons).toEqual(['star', 'star', 'star']);
  });
});