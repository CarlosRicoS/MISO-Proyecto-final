import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalHotelesGridCardComponent } from './grid-card.component';

@Component({
  standalone: true,
  imports: [PortalHotelesGridCardComponent],
  template: `
    <portal-hoteles-grid-card title="Reservations" subtitle="Manage all bookings">
      <div slot="header-actions" class="test-header-actions">PDF Excel</div>
      <p class="test-body">Body content</p>
    </portal-hoteles-grid-card>
  `,
})
class GridCardHostComponent {}

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

  it('projects header actions into the card header', async () => {
    // Arrange
    await TestBed.resetTestingModule().configureTestingModule({
      imports: [GridCardHostComponent],
    }).compileComponents();

    const hostFixture = TestBed.createComponent(GridCardHostComponent);

    // Act
    hostFixture.detectChanges();
    const element = hostFixture.nativeElement as HTMLElement;
    const headerActions = element.querySelector('.portal-hoteles-grid-card__header-actions');

    // Assert
    expect(headerActions?.textContent).toContain('PDF Excel');
    expect(element.textContent).toContain('Body content');
  });
});
