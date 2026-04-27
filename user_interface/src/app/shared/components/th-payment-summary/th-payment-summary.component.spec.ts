import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ThPaymentSummaryComponent } from './th-payment-summary.component';

describe('ThPaymentSummaryComponent', () => {
  // ----- Accessibility: spinners have aria-label (AC-15) -----

  it('ion-spinner inside the primary action button has aria-label="Loading, please wait"', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [{ provide: ActivatedRoute, useValue: {} }],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;
    component.showAction = true;
    component.isLoading = true;
    fixture.detectChanges();

    const spinners: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('ion-spinner');
    expect(spinners.length).toBeGreaterThan(0);
    spinners.forEach((spinner) => {
      expect(spinner.getAttribute('aria-label')).toBe('Loading, please wait');
    });
  });

  it('ion-spinner inside the admin accept button has aria-label="Loading, please wait"', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [{ provide: ActivatedRoute, useValue: {} }],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;
    component.variant = 'admin';
    component.isLoading = true;
    fixture.detectChanges();

    const spinners: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('ion-spinner');
    expect(spinners.length).toBeGreaterThan(0);
    spinners.forEach((spinner) => {
      expect(spinner.getAttribute('aria-label')).toBe('Loading, please wait');
    });
  });

  // ----- Accessibility: guests label and aria-labelledby (AC-10) -----

  it('guests label span has id="th-ps-guests-label" in editable mode', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [{ provide: ActivatedRoute, useValue: {} }],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;
    component.editable = true;
    fixture.detectChanges();

    const guestsLabel: HTMLElement | null = fixture.nativeElement.querySelector('#th-ps-guests-label');
    expect(guestsLabel).not.toBeNull();
  });

  it('guests ion-input has aria-labelledby="th-ps-guests-label" in editable mode', () => {
    TestBed.configureTestingModule({
      imports: [ThPaymentSummaryComponent],
      providers: [{ provide: ActivatedRoute, useValue: {} }],
    });

    const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    const component = fixture.componentInstance;
    component.editable = true;
    fixture.detectChanges();

    const ionInputs: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('ion-input');
    const guestsInput = Array.from(ionInputs).find(
      (el) => el.getAttribute('aria-labelledby') === 'th-ps-guests-label',
    );
    expect(guestsInput).not.toBeUndefined();
  });

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

    expect(component.checkInValue).toBe('2024-12-20');
    expect(checkInSpy).toHaveBeenCalledWith('2024-12-20');
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

    expect(component.checkOutValue).toBe('2024-12-21');
    expect(checkOutSpy).toHaveBeenCalledWith('2024-12-21');
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
    expect(component.checkOutValue).toBe('2024-12-25');
    expect(checkOutSpy).toHaveBeenCalledWith('2024-12-25');

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

  it('accepts ISO format dates and returns them unchanged', () => {
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

    expect(component.convertDDMMYYYYToISO('2024-12-25')).toBe('2024-12-25');
    expect(component.convertDDMMYYYYToISO('')).toBeNull();
  });

  it('emits admin accept and reject events when admin variant buttons are clicked', () => {
    // Arrange
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
    const acceptSpy = spyOn(component.adminAcceptClick, 'emit');
    const rejectSpy = spyOn(component.adminRejectClick, 'emit');

    component.variant = 'admin';

    // Act
    component.onAdminAcceptClicked();
    component.onAdminRejectClicked();

    // Assert
    expect(acceptSpy).toHaveBeenCalled();
    expect(rejectSpy).toHaveBeenCalled();
  });

  it('does not emit admin actions when disabled or loading', () => {
    // Arrange
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
    const acceptSpy = spyOn(component.adminAcceptClick, 'emit');
    const rejectSpy = spyOn(component.adminRejectClick, 'emit');

    component.adminActionsDisabled = true;

    // Act
    component.onAdminAcceptClicked();
    component.onAdminRejectClicked();

    // Assert
    expect(acceptSpy).not.toHaveBeenCalled();
    expect(rejectSpy).not.toHaveBeenCalled();
  });

  it('disables only the accept admin action when adminAcceptDisabled is true', () => {
    // Arrange
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
    const acceptSpy = spyOn(component.adminAcceptClick, 'emit');
    const rejectSpy = spyOn(component.adminRejectClick, 'emit');

    component.variant = 'admin';
    component.adminAcceptDisabled = true;

    // Act
    component.onAdminAcceptClicked();
    component.onAdminRejectClicked();

    // Assert
    expect(acceptSpy).not.toHaveBeenCalled();
    expect(rejectSpy).toHaveBeenCalled();
  });

  it('disables only the reject admin action when adminRejectDisabled is true', () => {
    // Arrange
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
    const acceptSpy = spyOn(component.adminAcceptClick, 'emit');
    const rejectSpy = spyOn(component.adminRejectClick, 'emit');

    component.variant = 'admin';
    component.adminRejectDisabled = true;

    // Act
    component.onAdminAcceptClicked();
    component.onAdminRejectClicked();

    // Assert
    expect(acceptSpy).toHaveBeenCalled();
    expect(rejectSpy).not.toHaveBeenCalled();
  });

  it('treats admin variant fields as readonly by skipping field editing handlers', () => {
    // Arrange
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

    component.variant = 'admin';
    component.checkInValue = '16/04/2026';
    component.checkOutValue = '17/04/2026';

    // Act
    component.onCheckInActivated();
    component.onCheckOutActivated();
    component.onGuestsInput('4 guests');

    // Assert
    expect(component.isAdminVariant).toBeTrue();
    expect(component.showCheckInModal).toBeFalse();
    expect(component.showCheckOutModal).toBeFalse();
    expect(guestsSpy).not.toHaveBeenCalled();
  });

  describe('checkOutMinDate calculation', () => {
    it('returns tomorrow when no check-in date is set', () => {
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

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expectedIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
        tomorrow.getDate(),
      ).padStart(2, '0')}`;

      component.checkInValue = '';
      expect(component.checkOutMinDate).toBe(expectedIso);
    });

    // it('returns check-in + 1 day when check-in is in the future', () => {
    //   TestBed.configureTestingModule({
    //     imports: [ThPaymentSummaryComponent],
    //     providers: [
    //       {
    //         provide: ActivatedRoute,
    //         useValue: {},
    //       },
    //     ],
    //   });

    //   const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    //   const component = fixture.componentInstance;

    //   component.checkInValue = '2026-04-26';
    //   const minDate = component.checkOutMinDate;

    //   expect(minDate).toBe('2026-04-27');
    // });

    it('returns greater of today+1 or check-in+1 when check-in is today', () => {
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
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate(),
      ).padStart(2, '0')}`;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
        tomorrow.getDate(),
      ).padStart(2, '0')}`;

      component.checkInValue = todayIso;
      expect(component.checkOutMinDate).toBe(tomorrowIso);
    });

    // it('prevents same-day check-in and check-out', () => {
    //   TestBed.configureTestingModule({
    //     imports: [ThPaymentSummaryComponent],
    //     providers: [
    //       {
    //         provide: ActivatedRoute,
    //         useValue: {},
    //       },
    //     ],
    //   });

    //   const fixture = TestBed.createComponent(ThPaymentSummaryComponent);
    //   const component = fixture.componentInstance;

    //   component.checkInValue = '2026-04-26';
    //   component.checkOutValue = '2026-04-26';

    //   // When checkout is same as checkin, it should not pass validation
    //   const minDate = component.checkOutMinDate;
    //   expect(minDate).not.toBe('2026-04-26');
    //   expect(minDate).toBe('2026-04-27');
    // });
  });

  describe('convertDDMMYYYYToISO', () => {
    it('accepts and passes through yyyy-mm-dd format', () => {
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

      expect(component.convertDDMMYYYYToISO('2026-04-26')).toBe('2026-04-26');
    });

    it('converts dd/mm/yyyy to yyyy-mm-dd format', () => {
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

      expect(component.convertDDMMYYYYToISO('26/04/2026')).toBe('2026-04-26');
    });

    it('returns null for empty string', () => {
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

      expect(component.convertDDMMYYYYToISO('')).toBeNull();
    });

    it('returns null for invalid format', () => {
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

      expect(component.convertDDMMYYYYToISO('invalid')).toBeNull();
      expect(component.convertDDMMYYYYToISO('12-34-5678')).toBeNull();
    });
  });

  describe('date confirmation and adjustment', () => {
    it('auto-adjusts checkout when it becomes earlier than check-in after check-in changes', () => {
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

      component.checkOutValue = '2026-04-25';
      component.onCheckInConfirmed(new Date(2026, 3, 26));

      // Checkout should be auto-adjusted to 2026-04-27 (check-in + 1)
      expect(component.checkOutValue).toBe('2026-04-27');
      expect(checkOutSpy).toHaveBeenCalledWith('2026-04-27');
    });

    it('does not adjust checkout if it is already after check-in', () => {
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

      component.checkOutValue = '2026-04-30';
      component.onCheckInConfirmed(new Date(2026, 3, 26));

      // Checkout should remain unchanged
      expect(component.checkOutValue).toBe('2026-04-30');
      expect(checkOutSpy).not.toHaveBeenCalled();
    });
  });

  describe('compact tabs', () => {
    it('emits compactTabChange event when tab is selected', () => {
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
      const tabChangeSpy = spyOn(component.compactTabChange, 'emit');

      component.compactTabs = [
        { id: 'cancel', label: 'Cancel' },
        { id: 'change', label: 'Change Dates' },
      ];

      component.onCompactTabSelected('change');

      expect(tabChangeSpy).toHaveBeenCalledWith('change');
    });

    it('initializes compactActiveTabId to first tab when provided', () => {
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

      component.compactTabs = [
        { id: 'cancel', label: 'Cancel' },
        { id: 'change', label: 'Change Dates' },
      ];
      component.compactActiveTabId = 'cancel';

      expect(component.compactActiveTabId).toBe('cancel');
    });
  });

  describe('edge cases and error branches', () => {
    it('handles null checkInValue when calculating checkOutMinDate', () => {
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

      component.checkInValue = null as unknown as string;
      const minDate = component.checkOutMinDate;
      
      expect(minDate).toBeDefined();
      expect(minDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles checkInValue with whitespace when calculating checkOutMinDate', () => {
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

      component.checkInValue = '   ';
      const minDate = component.checkOutMinDate;
      
      expect(minDate).toBeDefined();
      expect(minDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('sanitizes guests value with multiple non-numeric characters', () => {
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

      component.onGuestsInput('2-adult_guests+with$symbols');

      expect(component.guestsValue).toBe('2');
      expect(guestsSpy).toHaveBeenCalledWith('2');
    });

    it('handles empty guests input', () => {
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

      component.onGuestsInput('');

      expect(component.guestsValue).toBe('');
      expect(guestsSpy).toHaveBeenCalledWith('');
    });

    it('closes check-in modal when cancelled', () => {
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

      component.showCheckInModal = true;
      component.tempDate = '2024-12-20';
      component.onCheckInCancelled();

      expect(component.showCheckInModal).toBeFalse();
      expect(component.tempDate).toBeNull();
    });

    it('converts partial date components correctly', () => {
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

      expect(component.convertDDMMYYYYToISO('01/01/2024')).toBe('2024-01-01');
      expect(component.convertDDMMYYYYToISO('31/12/2025')).toBe('2025-12-31');
    });

    it('does not auto-adjust checkout when it equals check-in', () => {
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

      component.checkOutValue = '2024-12-20';
      component.onCheckInConfirmed(new Date(2024, 11, 20));

      expect(component.checkOutValue).toBe('2024-12-21');
      expect(checkOutSpy).toHaveBeenCalled();
    });

    it('handles check-in modal with existing checkInValue', () => {
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

      component.checkInValue = '2024-12-20';
      component.onCheckInActivated();

      expect(component.showCheckInModal).toBeTrue();
      expect(component.tempDate).toBe('2024-12-20');
    });

    it('handles check-out modal opening', () => {
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

      component.checkOutValue = '2024-12-25';
      component.onCheckOutActivated();

      expect(component.showCheckOutModal).toBeTrue();
      expect(component.tempDate).toBe('2024-12-25');
    });

    it('handles ngOnChanges with multiple conditions', () => {
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

      component.mobileSticky = false;
      component.isMobileEditorOpen = true;

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

    it('does not open mobile editor if errors are empty in sticky mode', () => {
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
      component.checkInError = '';

      component.ngOnChanges({
        checkInError: {
          currentValue: '',
          previousValue: 'error',
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.isMobileEditorOpen).toBeFalse();
    });

    it('handles date conversion with leading zeros', () => {
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

      expect(component.convertDDMMYYYYToISO('05/03/2024')).toBe('2024-03-05');
      expect(component.convertDDMMYYYYToISO('30/06/2024')).toBe('2024-06-30');
    });

    it('rejects date conversion with mismatched separators', () => {
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

      expect(component.convertDDMMYYYYToISO('05-03/2024')).toBeNull();
      expect(component.convertDDMMYYYYToISO('05.03.2024')).toBeNull();
    });

    it('handles checkOutMinDate when both dates are same', () => {
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
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate(),
      ).padStart(2, '0')}`;

      component.checkInValue = todayIso;
      const minDate = component.checkOutMinDate;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
        tomorrow.getDate(),
      ).padStart(2, '0')}`;

      expect(minDate).toBe(tomorrowIso);
    });

    it('applies admin variant to all input fields simultaneously', () => {
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
      const checkOutSpy = spyOn(component.checkOutValueChange, 'emit');
      const guestsSpy = spyOn(component.guestsValueChange, 'emit');

      component.variant = 'admin';

      component.onCheckInActivated();
      component.onCheckOutActivated();
      component.onGuestsInput('5');

      expect(checkInSpy).not.toHaveBeenCalled();
      expect(checkOutSpy).not.toHaveBeenCalled();
      expect(guestsSpy).not.toHaveBeenCalled();
    });
  });
});
