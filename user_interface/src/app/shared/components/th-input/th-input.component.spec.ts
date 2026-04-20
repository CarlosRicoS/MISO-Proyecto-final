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

  it('returns error state when state is error', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;

    component.state = 'error';
    component.disabled = false;

    expect(component.stateClass).toBe('th-input--error');
  });

  it('returns focus state when isFocused is true', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;

    component.disabled = false;
    component.state = 'default';
    component.isFocused = true;

    expect(component.stateClass).toBe('th-input--focus');
  });

  it('returns focus state when state is focus', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;

    component.disabled = false;
    component.state = 'focus';

    expect(component.stateClass).toBe('th-input--focus');
  });

  it('returns default state when not disabled, error or focused', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;

    component.disabled = false;
    component.state = 'default';
    component.isFocused = false;

    expect(component.stateClass).toBe('th-input--default');
  });

  it('sets isFocused to true on focus', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;

    component.onFocus();

    expect(component.isFocused).toBeTrue();
  });

  it('sets isFocused to false on blur', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;

    component.isFocused = true;
    component.onBlur();

    expect(component.isFocused).toBeFalse();
  });

  it('emits valueChange with input value', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;
    const emitSpy = spyOn(component.valueChange, 'emit');

    const event = new CustomEvent('ionInput', { detail: { value: 'test-value' } });
    component.onInput(event);

    expect(emitSpy).toHaveBeenCalledWith('test-value');
  });

  it('emits empty string when value is null', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;
    const emitSpy = spyOn(component.valueChange, 'emit');

    const event = new CustomEvent('ionInput', { detail: { value: null } });
    component.onInput(event);

    expect(emitSpy).toHaveBeenCalledWith('');
  });

  it('emits endIconClick when end icon is clicked and not disabled', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;

    component.disabled = false;
    const emitSpy = spyOn(component.endIconClick, 'emit');
    const event = new MouseEvent('click');
    const stopPropagationSpy = spyOn(event, 'stopPropagation');

    component.onEndIconClick(event);

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('does not emit endIconClick when disabled', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;

    component.disabled = true;
    const emitSpy = spyOn(component.endIconClick, 'emit');
    const event = new MouseEvent('click');

    component.onEndIconClick(event);

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('correctly identifies disabled state when state is disabled', () => {
    TestBed.configureTestingModule({
      imports: [ThInputComponent],
    });

    const fixture = TestBed.createComponent(ThInputComponent);
    const component = fixture.componentInstance;

    component.disabled = false;
    component.state = 'disabled';

    expect(component.isDisabled).toBeTrue();
  });
});
