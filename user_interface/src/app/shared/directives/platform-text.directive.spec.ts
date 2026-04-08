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

@Component({
  template: '<p appPlatformText [appPlatformShow]="showMode"></p>',
  standalone: true,
  imports: [PlatformTextDirective],
})
class ShowHostComponent {
  showMode: 'web' | 'mobile' | '' = '';
}

class PlatformStub {
  constructor(private value: boolean) {}
  is(name: string): boolean {
    return this.value && (name === 'android' || name === 'ios' || name === 'hybrid');
  }
}

describe('PlatformTextDirective', () => {
  it('should create directive', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: Platform, useValue: new PlatformStub(false) }],
    });

    const fixture = TestBed.createComponent(HostComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

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

  it('hides element on web when appPlatformShow is mobile', () => {
    TestBed.configureTestingModule({
      imports: [ShowHostComponent],
      providers: [{ provide: Platform, useValue: new PlatformStub(false) }],
    });

    const fixture = TestBed.createComponent(ShowHostComponent);
    fixture.componentInstance.showMode = 'mobile';
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('p');
    expect(element.style.display).toBe('none');
  });

  it('shows element on mobile when appPlatformShow is mobile', () => {
    TestBed.configureTestingModule({
      imports: [ShowHostComponent],
      providers: [{ provide: Platform, useValue: new PlatformStub(true) }],
    });

    const fixture = TestBed.createComponent(ShowHostComponent);
    fixture.componentInstance.showMode = 'mobile';
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('p');
    expect(element.style.display).not.toBe('none');
  });

  it('shows element on web when appPlatformShow is web', () => {
    TestBed.configureTestingModule({
      imports: [ShowHostComponent],
      providers: [{ provide: Platform, useValue: new PlatformStub(false) }],
    });

    const fixture = TestBed.createComponent(ShowHostComponent);
    fixture.componentInstance.showMode = 'web';
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('p');
    expect(element.style.display).not.toBe('none');
  });

  it('hides element on mobile when appPlatformShow is web', () => {
    TestBed.configureTestingModule({
      imports: [ShowHostComponent],
      providers: [{ provide: Platform, useValue: new PlatformStub(true) }],
    });

    const fixture = TestBed.createComponent(ShowHostComponent);
    fixture.componentInstance.showMode = 'web';
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('p');
    expect(element.style.display).toBe('none');
  });

  it('cleans up resize listener on destroy', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: Platform, useValue: new PlatformStub(false) }],
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    
    // Destroy should not throw
    expect(() => fixture.destroy()).not.toThrow();
  });
});
