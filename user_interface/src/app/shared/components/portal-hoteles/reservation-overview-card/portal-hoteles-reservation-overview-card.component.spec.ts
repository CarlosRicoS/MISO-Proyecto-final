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

  it('maps confirmed status into confirmed visual class', () => {
    component.statusLabel = 'Confirmed';
    const cssClass = component.statusClass;
    expect(cssClass).toContain('portal-hoteles-reservation-overview-card__status--confirmed');
  });

  it('maps pending status into pending visual class', () => {
    component.statusLabel = 'Pending';
    const cssClass = component.statusClass;
    expect(cssClass).toContain('portal-hoteles-reservation-overview-card__status--pending');
  });

  it('maps cancelled status into rejected visual class', () => {
    component.statusLabel = 'Cancelled';
    const cssClass = component.statusClass;
    expect(cssClass).toContain('portal-hoteles-reservation-overview-card__status--rejected');
  });

  it('maps unknown status into default visual class', () => {
    component.statusLabel = 'Unknown';
    const cssClass = component.statusClass;
    expect(cssClass).toContain('portal-hoteles-reservation-overview-card__status--default');
  });

  it('handles status with leading/trailing whitespace', () => {
    component.statusLabel = '  Confirmed  ';
    const cssClass = component.statusClass;
    expect(cssClass).toContain('portal-hoteles-reservation-overview-card__status--confirmed');
  });
});
