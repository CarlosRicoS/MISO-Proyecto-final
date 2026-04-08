import { TestBed } from '@angular/core/testing';
import { ThBadgeComponent } from './th-badge.component';

describe('ThBadgeComponent', () => {
  let component: ThBadgeComponent;
  let fixture: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ThBadgeComponent],
    });

    fixture = TestBed.createComponent(ThBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('builds badge classes from variant', () => {
    component.variant = 'success';
    expect(component.badgeClasses).toEqual(['th-badge', 'th-badge--success']);
  });

  it('applies default neutral variant', () => {
    expect(component.variant).toBe('neutral');
    expect(component.badgeClasses).toEqual(['th-badge', 'th-badge--neutral']);
  });

  it('builds classes for all variant types', () => {
    const variants: Array<'success' | 'warning' | 'error' | 'info' | 'rating' | 'neutral'> = [
      'success',
      'warning',
      'error',
      'info',
      'rating',
      'neutral',
    ];

    variants.forEach((variant) => {
      component.variant = variant;
      expect(component.badgeClasses).toEqual(['th-badge', `th-badge--${variant}`]);
    });
  });

  it('has empty icon by default', () => {
    expect(component.icon).toBe('');
  });

  it('accepts icon input', () => {
    component.icon = 'star';
    expect(component.icon).toBe('star');
  });

  it('renders with icon and variant', () => {
    component.variant = 'success';
    component.icon = 'checkmark-circle';
    fixture.detectChanges();

    expect(component.variant).toBe('success');
    expect(component.icon).toBe('checkmark-circle');
    expect(component.badgeClasses).toContain('th-badge--success');
  });
});
