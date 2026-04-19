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

  it('emits enterPress when Enter key is pressed', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const emitSpy = spyOn(component.enterPress, 'emit');
    const preventDefaultSpy = spyOn(event, 'preventDefault');

    component.onEnterKey(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('does not emit enterPress when disabled', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;
    component.disabled = true;
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const emitSpy = spyOn(component.enterPress, 'emit');

    component.onEnterKey(event);

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
