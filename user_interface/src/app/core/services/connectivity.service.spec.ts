import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { ConnectivityService } from './connectivity.service';

describe('ConnectivityService', () => {
  describe('on a native platform', () => {
    let service: ConnectivityService;

    beforeEach(() => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
      TestBed.configureTestingModule({});
      service = TestBed.inject(ConnectivityService);
    });

    it('should expose the browser online state', () => {
      expect(service.isOnline).toBeTrue();
      expect(service.isOffline).toBeFalse();
      expect(service.shouldShowMobileBanner).toBeFalse();
    });

    it('should update to offline when the browser fires an offline event', () => {
      window.dispatchEvent(new Event('offline'));

      expect(service.isOnline).toBeFalse();
      expect(service.isOffline).toBeTrue();
      expect(service.shouldShowMobileBanner).toBeTrue();
    });

    it('should clear the offline state when the browser fires an online event', () => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));

      expect(service.isOnline).toBeTrue();
      expect(service.isOffline).toBeFalse();
      expect(service.shouldShowMobileBanner).toBeFalse();
    });
  });

  describe('on a web platform', () => {
    let service: ConnectivityService;

    beforeEach(() => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
      TestBed.configureTestingModule({});
      service = TestBed.inject(ConnectivityService);
    });

    it('should not show the mobile banner even when the browser is offline', () => {
      window.dispatchEvent(new Event('offline'));

      expect(service.isOffline).toBeTrue();
      expect(service.shouldShowMobileBanner).toBeFalse();
    });

    it('refresh should read browser online state and update', () => {
      spyOn(service as any, 'readBrowserOnlineState').and.returnValue(false);
      service.refresh();
      expect(service.isOnline).toBeFalse();
    });

    it('readBrowserOnlineState returns true when navigator is undefined', () => {
      // spy on navigator getter to return undefined
      const navSpy = spyOnProperty(window, 'navigator', 'get').and.returnValue(undefined as any);
      const val = (service as any).readBrowserOnlineState();
      expect(val).toBeTrue();
      navSpy.and.callThrough();
    });

    // cannot reliably unset `window` in Karma browser; skip constructor window-undefined branch here

    it('updateOnlineState should be no-op when state unchanged', () => {
      // spy on subject.next
      const subj = (service as any).stateSubject;
      const spyNext = spyOn(subj, 'next');
      // current state is whatever; call update with same value
      const current = subj.value.isOnline;
      (service as any).updateOnlineState(current);
      expect(spyNext).not.toHaveBeenCalled();
    });

    it('handleOnline/handleOffline call zone.run and update state', () => {
      const zone = TestBed.inject(NgZone);
      spyOn(zone, 'run').and.callFake((fn: any) => fn());

      // call handlers on the existing service instance
      (service as any).handleOffline();
      expect(zone.run).toHaveBeenCalled();
      expect(service.isOnline).toBeFalse();

      (service as any).handleOnline();
      expect(service.isOnline).toBeTrue();
    });
  });
});
