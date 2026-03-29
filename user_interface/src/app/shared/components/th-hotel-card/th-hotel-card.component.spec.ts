import { TestBed } from '@angular/core/testing';
import { ThHotelCardComponent } from './th-hotel-card.component';

describe('ThHotelCardComponent', () => {
  it('creates with defaults', () => {
    TestBed.configureTestingModule({
      imports: [ThHotelCardComponent],
    });

    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;

    expect(component.variant).toBe('mobile');
    expect(component.showFavorite).toBeTrue();
  });
});
