import { TestBed } from '@angular/core/testing';
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
  });
});
