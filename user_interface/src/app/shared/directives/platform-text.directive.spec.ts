import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular';
import { PlatformTextDirective } from './platform-text.directive';

@Component({
  template: '<p appPlatformText [appPlatformTextWeb]="\'Web\'" [appPlatformTextMobile]="\'Mobile\'"></p>',
  standalone: true,
  imports: [PlatformTextDirective],
})
class HostComponent {}

class PlatformStub {
  constructor(private value: boolean) {}
  is(name: string): boolean {
    return this.value && (name === 'android' || name === 'ios' || name === 'hybrid');
  }
}

describe('PlatformTextDirective', () => {
  it('shows mobile text when running on mobile', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: Platform, useValue: new PlatformStub(true) }],
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.querySelector('p').textContent?.trim();
    expect(text).toBe('Mobile');
  });

  it('shows web text when running on web', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: Platform, useValue: new PlatformStub(false) }],
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.querySelector('p').textContent?.trim();
    expect(text).toBe('Web');
  });
});
