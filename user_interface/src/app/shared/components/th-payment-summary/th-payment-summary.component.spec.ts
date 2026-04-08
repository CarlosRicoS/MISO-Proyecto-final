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
});
