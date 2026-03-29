import { TestBed } from '@angular/core/testing';
import { ThDatetimeModalComponent } from './th-datetime-modal.component';

describe('ThDatetimeModalComponent', () => {
  it('emits confirmed date on confirm', () => {
    TestBed.configureTestingModule({
      imports: [ThDatetimeModalComponent],
    });

    const fixture = TestBed.createComponent(ThDatetimeModalComponent);
    const component = fixture.componentInstance;
    const spy = spyOn(component.confirmed, 'emit');

    component.selectedDate = '2026-03-01';
    component.onConfirm();

    expect(spy).toHaveBeenCalled();
  });

  it('does not emit confirm when date is missing', () => {
    TestBed.configureTestingModule({
      imports: [ThDatetimeModalComponent],
    });

    const fixture = TestBed.createComponent(ThDatetimeModalComponent);
    const component = fixture.componentInstance;
    const spy = spyOn(component.confirmed, 'emit');

    component.selectedDate = null;
    component.onConfirm();

    expect(spy).not.toHaveBeenCalled();
  });

  it('emits on date change', () => {
    TestBed.configureTestingModule({
      imports: [ThDatetimeModalComponent],
    });

    const fixture = TestBed.createComponent(ThDatetimeModalComponent);
    const component = fixture.componentInstance;
    const confirmedSpy = spyOn(component.confirmed, 'emit');
    const selectedSpy = spyOn(component.dateSelected, 'emit');

    component.onDateChange('2026-03-02');

    expect(confirmedSpy).toHaveBeenCalled();
    expect(selectedSpy).toHaveBeenCalled();
  });

  it('handles date change when passed an array', () => {
    TestBed.configureTestingModule({
      imports: [ThDatetimeModalComponent],
    });

    const fixture = TestBed.createComponent(ThDatetimeModalComponent);
    const component = fixture.componentInstance;
    const selectedSpy = spyOn(component.dateSelected, 'emit');

    component.onDateChange(['2026-03-05', '2026-03-06']);

    expect(selectedSpy).toHaveBeenCalled();
  });

  it('ignores empty or invalid date change', () => {
    TestBed.configureTestingModule({
      imports: [ThDatetimeModalComponent],
    });

    const fixture = TestBed.createComponent(ThDatetimeModalComponent);
    const component = fixture.componentInstance;
    const confirmedSpy = spyOn(component.confirmed, 'emit');

    component.onDateChange(null);
    component.onDateChange('2026-03');

    expect(confirmedSpy).not.toHaveBeenCalled();
  });

  it('emits cancel on backdrop click', () => {
    TestBed.configureTestingModule({
      imports: [ThDatetimeModalComponent],
    });

    const fixture = TestBed.createComponent(ThDatetimeModalComponent);
    const component = fixture.componentInstance;
    const spy = spyOn(component.cancelled, 'emit');

    component.onBackdropClick();

    expect(spy).toHaveBeenCalled();
  });
});
