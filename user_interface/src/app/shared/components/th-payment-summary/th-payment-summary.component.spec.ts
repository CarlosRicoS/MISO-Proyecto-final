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

  it('sets check-in minimum date to today', () => {
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

    const today = new Date();
    const expectedIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;

    expect(component.checkInMinDate).toBe(expectedIso);
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

  it('emits action click when booking button is triggered', () => {
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
    const actionSpy = spyOn(component.actionClick, 'emit');

    component.onActionClicked();

    expect(actionSpy).toHaveBeenCalled();
  });

  it('resets mobile editor when sticky mode is disabled', () => {
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

    component.isMobileEditorOpen = true;
    component.mobileSticky = false;

    component.ngOnChanges({
      mobileSticky: {
        currentValue: false,
        previousValue: true,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.isMobileEditorOpen).toBeFalse();
  });

  it('resets mobile editor when reset trigger changes in sticky mode', () => {
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
    component.isMobileEditorOpen = true;

    component.ngOnChanges({
      editorResetTrigger: {
        currentValue: 2,
        previousValue: 1,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.isMobileEditorOpen).toBeFalse();
  });

  it('opens mobile editor when errors are present in sticky mode', () => {
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
    component.isMobileEditorOpen = false;
    component.checkInError = 'Missing check-in';

    component.ngOnChanges({
      checkInError: {
        currentValue: 'Missing check-in',
        previousValue: '',
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.isMobileEditorOpen).toBeTrue();
  });

  it('normalizes guests value on input changes', () => {
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

    component.guestsValue = '2 adults';

    component.ngOnChanges({
      guestsValue: {
        currentValue: '2 adults',
        previousValue: '1',
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.guestsValue).toBe('2');
  });

  it('closes check-out modal when cancelled and confirms checkout date', () => {
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

    component.onCheckOutConfirmed(new Date(2024, 11, 25));
    expect(component.checkOutValue).toBe('25/12/2024');
    expect(checkOutSpy).toHaveBeenCalledWith('25/12/2024');

    component.showCheckOutModal = true;
    component.tempDate = '2024-12-25';
    component.onCheckOutCancelled();

    expect(component.showCheckOutModal).toBeFalse();
    expect(component.tempDate).toBeNull();
  });

  it('opens mobile editor when action is clicked and errors exist', () => {
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
    const actionSpy = spyOn(component.actionClick, 'emit');

    component.mobileSticky = true;
    component.checkOutError = 'Invalid checkout';
    component.onActionClicked();

    expect(component.isMobileEditorOpen).toBeTrue();
    expect(actionSpy).toHaveBeenCalled();
  });

  it('returns null when converting malformed date strings', () => {
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

    expect(component.convertDDMMYYYYToISO('2024-12-25')).toBeNull();
    expect(component.convertDDMMYYYYToISO('')).toBeNull();
  });
});
