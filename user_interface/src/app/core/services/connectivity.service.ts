import { Injectable, NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

export interface ConnectivityState {
  isOnline: boolean;
  isNativePlatform: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly stateSubject = new BehaviorSubject<ConnectivityState>(this.readInitialState());

  readonly state$ = this.stateSubject.asObservable();
  readonly isOnline$ = this.state$.pipe(
    map((state) => state.isOnline),
    distinctUntilChanged(),
  );

  constructor(private readonly zone: NgZone) {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  get isOnline(): boolean {
    return this.stateSubject.value.isOnline;
  }

  get isOffline(): boolean {
    return !this.isOnline;
  }

  get isNativePlatform(): boolean {
    return this.stateSubject.value.isNativePlatform;
  }

  get shouldShowMobileBanner(): boolean {
    return this.isNativePlatform && this.isOffline;
  }

  refresh(): void {
    this.updateOnlineState(this.readBrowserOnlineState());
  }

  private readonly handleOnline = (): void => {
    this.zone.run(() => this.updateOnlineState(true));
  };

  private readonly handleOffline = (): void => {
    this.zone.run(() => this.updateOnlineState(false));
  };

  private readInitialState(): ConnectivityState {
    return {
      isOnline: this.readBrowserOnlineState(),
      isNativePlatform: Capacitor.isNativePlatform(),
    };
  }

  private readBrowserOnlineState(): boolean {
    if (typeof navigator === 'undefined') {
      return true;
    }

    return navigator.onLine;
  }

  private updateOnlineState(isOnline: boolean): void {
    const currentState = this.stateSubject.value;
    if (currentState.isOnline === isOnline) {
      return;
    }

    this.stateSubject.next({
      ...currentState,
      isOnline,
    });
  }
}