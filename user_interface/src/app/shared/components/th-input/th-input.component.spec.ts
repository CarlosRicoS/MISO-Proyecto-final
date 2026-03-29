import { TestBed } from '@angular/core/testing';
import { ThInputComponent } from './th-input.component';

describe('ThInputComponent', () => {
  it('uses disabled state when disabled', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;

    component.state = 'error';
    component.disabled = true;

    expect(component.stateClass).toBe('th-input--disabled');
    expect(component.isDisabled).toBeTrue();
  });
});
