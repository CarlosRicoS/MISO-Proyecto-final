import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, Platform } from '@ionic/angular';

import { PortalHotelesHeaderBarComponent } from './portal-hoteles-header-bar.component';

class PlatformMock {
  is(platform: string): boolean {
    return false; // Simulate web environment for tests
  }
}

describe('PortalHotelesHeaderBarComponent', () => {
  let component: PortalHotelesHeaderBarComponent;
  let fixture: ComponentFixture<PortalHotelesHeaderBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), PortalHotelesHeaderBarComponent],
      providers: [{ provide: Platform, useClass: PlatformMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHotelesHeaderBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the hotel name and user name', () => {
    // Arrange
    component.hotelName = 'Grand Plaza Hotel';
    component.userName = 'John Smith';

    // Act
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    // Assert
    expect(element.textContent).toContain('Grand Plaza Hotel');
    expect(element.textContent).toContain('John Smith');
  });

  it('derives user initials from the user name', () => {
    // Arrange
    component.userName = 'John Smith';

    // Act
    const initials = component.avatarInitials;

    // Assert
    expect(initials).toBe('JS');
  });
});
