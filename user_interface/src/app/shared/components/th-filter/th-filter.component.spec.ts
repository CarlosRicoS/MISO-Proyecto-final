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
});
