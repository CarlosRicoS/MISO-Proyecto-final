import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ThPopupComponent } from './th-popup.component';

describe('ThPopupComponent', () => {
  let fixture: ComponentFixture<ThPopupComponent>;
  let component: ThPopupComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ThPopupComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });

    fixture = TestBed.createComponent(ThPopupComponent);
    component = fixture.componentInstance;
  });

  it('defaults the primary button variant to primary and uses explicit variant when provided', () => {
    expect(component.resolvedPrimaryButtonVariant).toBe('primary');

    component.primaryButtonVariant = 'secondary';
    expect(component.resolvedPrimaryButtonVariant).toBe('secondary');
  });

  it('resolves icon names for all variants and prefers explicit iconName', () => {
    component.iconName = 'custom-icon';
    expect(component.resolvedIconName).toBe('custom-icon');

    component.iconName = null;
    component.variant = 'info';
    expect(component.resolvedIconName).toBe('information-circle');

    component.variant = 'success';
    expect(component.resolvedIconName).toBe('checkmark-circle');

    component.variant = 'warning';
    expect(component.resolvedIconName).toBe('warning');

    component.variant = 'error';
    expect(component.resolvedIconName).toBe('close-circle');

    component.variant = 'confirm';
    expect(component.resolvedIconName).toBe('help-circle');
  });

  it('does not render secondary action button when secondaryButtonText is empty', () => {
    component.secondaryButtonText = null;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('th-button');
    expect(component.hasSecondaryButton).toBeFalse();
    expect(buttons.length).toBe(1);
  });

  it('renders secondary action button when secondaryButtonText is provided', () => {
    component.secondaryButtonText = 'Cancel';
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('th-button');
    expect(component.hasSecondaryButton).toBeTrue();
    expect(buttons.length).toBe(2);
  });

  it('does not close when backdrop click is disabled, but closes when enabled', () => {
    const closedSpy = spyOn(component.closed, 'emit');

    component.closeOnBackdrop = false;
    component.onBackdropClicked();
    expect(closedSpy).not.toHaveBeenCalled();

    component.closeOnBackdrop = true;
    component.onBackdropClicked();
    expect(closedSpy).toHaveBeenCalledTimes(1);
  });

  it('does not close on escape when closed on escape is disabled, but closes when enabled', () => {
    const closedSpy = spyOn(component.closed, 'emit');
    component.isOpen = true;

    component.closeOnEscape = false;
    component.onEscapePressed();
    expect(closedSpy).not.toHaveBeenCalled();

    component.closeOnEscape = true;
    component.onEscapePressed();
    expect(closedSpy).toHaveBeenCalledTimes(1);
  });

  it('emits primaryAction and closed when primary button is clicked', () => {
    const primarySpy = spyOn(component.primaryAction, 'emit');
    const closedSpy = spyOn(component.closed, 'emit');

    component.onPrimaryClicked();

    expect(primarySpy).toHaveBeenCalled();
    expect(closedSpy).toHaveBeenCalled();
  });

  it('emits secondaryAction and closed when secondary button is clicked', () => {
    const secondarySpy = spyOn(component.secondaryAction, 'emit');
    const closedSpy = spyOn(component.closed, 'emit');

    component.onSecondaryClicked();

    expect(secondarySpy).toHaveBeenCalled();
    expect(closedSpy).toHaveBeenCalled();
  });
});
