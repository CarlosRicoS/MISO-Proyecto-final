import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';

import { PortalHotelesSideNavComponent } from './portal-hoteles-side-nav.component';

describe('PortalHotelesSideNavComponent', () => {
  let component: PortalHotelesSideNavComponent;
  let fixture: ComponentFixture<PortalHotelesSideNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalHotelesSideNavComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalHotelesSideNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the sidebar brand', () => {
    // Arrange

    // Act
    const element = fixture.nativeElement as HTMLElement;

    // Assert
    expect(element.textContent).toContain('TravelHub');
    expect(element.textContent).toContain('Partner Portal');
  });

  it('exposes the main menu items', () => {
    // Arrange

    // Act
    const menuLabels = component.menuItems.map((item) => item.label);

    // Assert
    expect(menuLabels).toEqual(['Dashboard', 'Pricing', 'Reports']);
  });

  it('configures dashboard as non-exact to keep active state on nested dashboard routes', () => {
    // Arrange
    const dashboardItem = component.menuItems.find((item) => item.label === 'Dashboard');
    const pricingItem = component.menuItems.find((item) => item.label === 'Pricing');
    const reportsItem = component.menuItems.find((item) => item.label === 'Reports');

    // Act
    const dashboardExact = dashboardItem?.exact;
    const pricingExact = pricingItem?.exact;
    const reportsExact = reportsItem?.exact;

    // Assert
    expect(dashboardExact).toBeFalse();
    expect(pricingExact).toBeTrue();
    expect(reportsExact).toBeTrue();
  });

  it('emits logoutClicked when sign out is pressed', () => {
    // Arrange
    spyOn(component.logoutClicked, 'emit');
    const logoutButton = fixture.debugElement.query(By.css('.portal-hoteles-side-nav__logout'));

    // Act
    logoutButton.triggerEventHandler('click', null);

    // Assert
    expect(component.logoutClicked.emit).toHaveBeenCalled();
  });
});
