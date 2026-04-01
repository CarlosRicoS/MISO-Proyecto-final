import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ThHotelCardComponent } from './th-hotel-card.component';

describe('ThHotelCardComponent', () => {
  it('creates with defaults', () => {
    TestBed.configureTestingModule({
      imports: [ThHotelCardComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;

    expect(component.variant).toBe('mobile');
    expect(component.showFavorite).toBeTrue();
  });
});
