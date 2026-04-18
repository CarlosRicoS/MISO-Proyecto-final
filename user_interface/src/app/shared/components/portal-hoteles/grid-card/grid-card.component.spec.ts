import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalHotelesGridCardComponent } from './grid-card.component';

describe('PortalHotelesGridCardComponent', () => {
  let component: PortalHotelesGridCardComponent;
  let fixture: ComponentFixture<PortalHotelesGridCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalHotelesGridCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHotelesGridCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the provided title and subtitle', () => {
    // Arrange
    component.title = 'Reservations';
    component.subtitle = 'Manage all bookings';

    // Act
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    // Assert
    expect(element.textContent).toContain('Reservations');
    expect(element.textContent).toContain('Manage all bookings');
  });
});
