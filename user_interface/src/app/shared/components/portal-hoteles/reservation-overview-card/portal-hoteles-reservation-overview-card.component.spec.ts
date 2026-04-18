/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortalHotelesReservationOverviewCardComponent } from './portal-hoteles-reservation-overview-card.component';

describe('PortalHotelesReservationOverviewCardComponent', () => {
  let component: PortalHotelesReservationOverviewCardComponent;
  let fixture: ComponentFixture<PortalHotelesReservationOverviewCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalHotelesReservationOverviewCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHotelesReservationOverviewCardComponent);
    component = fixture.componentInstance;
  });

  it('renders the reservation header details', () => {
    // Arrange
    component.hotelName = 'The Grand Plaza Hotel';
    component.location = '123 Fifth Avenue, Manhattan, New York, NY 10001';
    component.guestLabel = 'Sarah Johnson';

    // Act
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    // Assert
    expect(element.textContent).toContain('The Grand Plaza Hotel');
    expect(element.textContent).toContain('Sarah Johnson');
  });

  it('maps rejected status into rejected visual class', () => {
    // Arrange
    component.statusLabel = 'Rejected';

    // Act
    const cssClass = component.statusClass;

    // Assert
    expect(cssClass).toContain('portal-hoteles-reservation-overview-card__status--rejected');
  });
});
