import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ThPaymentSummaryComponent } from './th-payment-summary.component';

describe('ThPaymentSummaryComponent', () => {
  it('renders defaults', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;

    expect(component.title).toBe('$299');
    expect(component.items.length).toBeGreaterThan(0);
    expect(component.badges.length).toBeGreaterThan(0);
  });

  it('accepts custom data', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;

    component.title = 'Payment breakdown';
    component.items = [{ label: 'Room', amount: '$120' }];
    component.totalAmount = '$120';

    expect(component.title).toBe('Payment breakdown');
    expect(component.items[0].amount).toBe('$120');
    expect(component.totalAmount).toBe('$120');
  });

  it('supports mobile sticky compact settings', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;

    component.mobileSticky = true;
    component.compactSuffix = '/night';
    component.compactNote = 'Taxes and fees included';

    expect(component.mobileSticky).toBeTrue();
    expect(component.compactSuffix).toBe('/night');
    expect(component.compactNote).toContain('Taxes');
  });

  it('opens the check-in calendar when activated', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;

    component.checkInValue = '20/12/2024';
    component.onCheckInActivated();

    expect(component.showCheckInModal).toBeTrue();
    expect(component.tempDate).toBe('2024-12-20');
  });

  it('emits updated date values when a date is confirmed', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;
    const checkInSpy = spyOn(component.checkInValueChange, 'emit');

    component.onCheckInConfirmed(new Date(2024, 11, 20));

    expect(component.checkInValue).toBe('20/12/2024');
    expect(checkInSpy).toHaveBeenCalledWith('20/12/2024');
    expect(component.showCheckInModal).toBeFalse();
  });

  it('auto-sets checkout to check-in + 1 day when checkout is empty', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;
    const checkOutSpy = spyOn(component.checkOutValueChange, 'emit');

    component.checkOutValue = '';
    component.onCheckInConfirmed(new Date(2024, 11, 20));

    expect(component.checkOutValue).toBe('21/12/2024');
    expect(checkOutSpy).toHaveBeenCalledWith('21/12/2024');
  });

  it('sanitizes guests input to digits only', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;
    const guestsSpy = spyOn(component.guestsValueChange, 'emit');

    component.onGuestsInput('2 Guests');

    expect(component.guestsValue).toBe('2');
    expect(guestsSpy).toHaveBeenCalledWith('2');
  });
});
