import { TestBed } from '@angular/core/testing';
import { ThBadgeComponent } from './th-badge.component';

describe('ThBadgeComponent', () => {
  it('builds badge classes from variant', () => {
    TestBed.configureTestingModule({
      imports: [ThBadgeComponent],
    });

    const fixture = TestBed.createComponent(ThBadgeComponent);
    const component = fixture.componentInstance;

    component.variant = 'success';

    expect(component.badgeClasses).toEqual(['th-badge', 'th-badge--success']);
  });
});
