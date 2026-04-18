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
});
