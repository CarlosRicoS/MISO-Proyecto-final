import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalHotelesGenericCardComponent } from './generic-card.component';

describe('PortalHotelesGenericCardComponent', () => {
  let component: PortalHotelesGenericCardComponent;
  let fixture: ComponentFixture<PortalHotelesGenericCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalHotelesGenericCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHotelesGenericCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the empty placeholder label when no content is provided', () => {
    // Arrange
    component.emptyLabel = 'Coming soon';

    // Act
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    // Assert
    expect(element.textContent).toContain('Coming soon');
  });

  // ----- Accessibility: heading hierarchy (AC-37) -----

  it('renders title as <h2> when title input is provided', () => {
    component.title = 'Reservations';
    fixture.detectChanges();

    const h2: HTMLElement | null = fixture.nativeElement.querySelector('h2');
    const h3: HTMLElement | null = fixture.nativeElement.querySelector('h3');
    expect(h2).not.toBeNull();
    expect(h2!.textContent!.trim()).toBe('Reservations');
    expect(h3).toBeNull();
  });

  it('does not render a heading when title is empty', () => {
    component.title = '';
    fixture.detectChanges();

    const h2: HTMLElement | null = fixture.nativeElement.querySelector('h2');
    expect(h2).toBeNull();
  });
});
