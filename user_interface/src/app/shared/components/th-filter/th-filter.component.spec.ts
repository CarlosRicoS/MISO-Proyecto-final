import { TestBed } from '@angular/core/testing';
import { ThFilterComponent } from './th-filter.component';

describe('ThFilterComponent', () => {
  it('sanitizes guests input to digits only', () => {
    TestBed.configureTestingModule({
      imports: [ThFilterComponent],
    });

    const fixture = TestBed.createComponent(ThFilterComponent);
    const component = fixture.componentInstance;
    const spy = spyOn(component.guestsValueChange, 'emit');

    component.onGuestsInput('2 guests');

    expect(spy).toHaveBeenCalledWith('2');
  });

  it('handles null guests input', () => {
    TestBed.configureTestingModule({
      imports: [ThFilterComponent],
    });

    const fixture = TestBed.createComponent(ThFilterComponent);
    const component = fixture.componentInstance;
    const spy = spyOn(component.guestsValueChange, 'emit');

    component.onGuestsInput(null);

    expect(spy).toHaveBeenCalledWith('');
  });

  it('handles undefined guests input', () => {
    TestBed.configureTestingModule({
      imports: [ThFilterComponent],
    });

    const fixture = TestBed.createComponent(ThFilterComponent);
    const component = fixture.componentInstance;
    const spy = spyOn(component.guestsValueChange, 'emit');

    component.onGuestsInput(undefined);

    expect(spy).toHaveBeenCalledWith('');
  });
});
