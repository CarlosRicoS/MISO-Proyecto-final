import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ThButtonComponent } from './th-button.component';

describe('ThButtonComponent', () => {
  it('builds button classes from inputs', () => {
    TestBed.configureTestingModule({
      imports: [ThButtonComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThButtonComponent);
    const component = fixture.componentInstance;

    component.variant = 'secondary';
    component.size = 'lg';
    component.disabled = true;

    expect(component.buttonClasses).toContain('th-button--secondary');
    expect(component.buttonClasses).toContain('th-button--lg');
    expect(component.buttonClasses).toContain('th-button--disabled');
  });

  it('omits disabled class when enabled', () => {
    TestBed.configureTestingModule({
      imports: [ThButtonComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThButtonComponent);
    const component = fixture.componentInstance;

    component.disabled = false;

    expect(component.buttonClasses).not.toContain('th-button--disabled');
  });
});
