import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ThHotelCardComponent } from './th-hotel-card.component';

describe('ThHotelCardComponent', () => {
  it('creates with defaults', () => {
    TestBed.configureTestingModule({
      imports: [ThHotelCardComponent, RouterTestingModule],
    });

    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;

    expect(component.variant).toBe('mobile');
    expect(component.showFavorite).toBeTrue();
    expect(component.imageUrl).toBe('');
  });

  it('normalizes imageUrl when provided as a list', () => {
    TestBed.configureTestingModule({
      imports: [ThHotelCardComponent, RouterTestingModule],
    });

    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;

    component.imageUrl = ['', '  ', 'https://img.example.com/hotel.jpg'];

    expect(component.imageUrl).toBe('https://img.example.com/hotel.jpg');
  });

  it('normalizes whitespace-only string imageUrl to empty', () => {
    TestBed.configureTestingModule({
      imports: [ThHotelCardComponent, RouterTestingModule],
    });

    const fixture = TestBed.createComponent(ThHotelCardComponent);
    const component = fixture.componentInstance;

    component.imageUrl = '   ';

    expect(component.imageUrl).toBe('');
  });
});
